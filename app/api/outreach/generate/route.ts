import { NextResponse } from "next/server";
import { getLead, upsertLead, upsertEmailDraft, addNotification, getEmailDraftByLead, getSettings } from "@/lib/store";
import { generateEmailDraft, sendNotificationEmail } from "@/lib/email";
import { getOutreachTier, getOutreachTierLabel } from "@/constants/scoring-weights";
import type { OutreachTier } from "@/constants/scoring-weights";
import type { EmailDraft } from "@/types/outreach";
import type { Lead } from "@/types/lead";
import type { Notification } from "@/types/pipeline";

export async function POST(request: Request) {
  try {
    const { leadId } = await request.json();

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 }
      );
    }

    const lead = getLead(leadId);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!lead.enrichment) {
      return NextResponse.json(
        { error: "Lead must be enriched before generating email" },
        { status: 400 }
      );
    }

    const existingDraft = getEmailDraftByLead(leadId);
    if (existingDraft && existingDraft.status !== "failed") {
      return NextResponse.json(
        {
          error: `Email already exists for ${lead.name} (status: ${existingDraft.status})`,
          existingDraft,
        },
        { status: 409 }
      );
    }

    const score = lead.score ?? 0;
    const tier = getOutreachTier(score);

    if (tier === "skip") {
      return NextResponse.json(
        {
          error: `Score too low (${score}) — not recommended for outreach`,
          tier,
          tierLabel: getOutreachTierLabel(tier),
        },
        { status: 422 }
      );
    }

    const { subjectLines, hook, bridge, fullBody } =
      await generateEmailDraft(lead, tier);

    const holdReasons = getHoldReasons(lead, tier);
    const needsReview = tier !== "high" || holdReasons.length > 0;

    const intendedRecipient =
      lead.enrichment.contactEmail ?? `info@${lead.name.toLowerCase().replace(/\s+/g, "")}.com`;

    const { pocMode } = getSettings();
    const pocFooter = pocMode
      ? `\n\n---\n[PoC Mode] Originally intended for: ${intendedRecipient}`
      : "";

    const draft: EmailDraft = {
      id: `email-${leadId}-${Date.now()}`,
      leadId,
      leadName: lead.name,
      intendedRecipient,
      subjectLines,
      selectedSubjectIndex: 0,
      hook,
      bridge,
      offer: "",
      close: "",
      fullBody: fullBody + pocFooter,
      status: needsReview ? "pending_review" : "approved",
      confidenceScore: score,
      holdReasons,
      outreachTier: tier,
      createdAt: new Date().toISOString(),
    };

    upsertEmailDraft(draft);

    lead.status = needsReview ? "email_drafted" : "email_approved";
    upsertLead(lead);

    if (needsReview) {
      const notification: Notification = {
        id: `notif-${Date.now()}`,
        type: "hold_for_review",
        title: `Review needed: ${lead.name}`,
        message: `Email draft held: ${holdReasons.join(", ")}`,
        leadId,
        read: false,
        createdAt: new Date().toISOString(),
      };
      addNotification(notification);

      sendNotificationEmail(lead.name, holdReasons, leadId).catch(() => {
        // notification email is best-effort
      });
    }

    return NextResponse.json({
      draft,
      autoApproved: !needsReview,
      holdReasons,
      tier,
      tierLabel: getOutreachTierLabel(tier),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Email generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getHoldReasons(lead: Lead, tier: OutreachTier): string[] {
  if (tier === "high") return [];

  const reasons: string[] = [];
  const enrichment = lead.enrichment;

  if (tier === "low") {
    reasons.push(`Low score (${lead.score ?? 0}) — may not be a strong fit`);
  }

  if (!enrichment?.contactEmail) {
    reasons.push("No contact email found — using generated address");
  }

  if (enrichment?.source !== "website") {
    reasons.push(`Enrichment from ${enrichment?.source ?? "unknown"} (not website) — data may be incomplete`);
  }

  const unusualTypes = ["hotel_bar", "event_space", "pub", "cafe", "other"];
  if (enrichment && unusualTypes.includes(enrichment.venueType)) {
    reasons.push(`Unusual venue type: ${enrichment.venueType}`);
  }

  return reasons;
}
