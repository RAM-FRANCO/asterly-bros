import { NextResponse } from "next/server";
import { getLead, upsertLead, upsertEmailDraft, addNotification, getEmailDraftByLead } from "@/lib/store";
import { generateEmailDraft, sendNotificationEmail } from "@/lib/email";
import { CONFIDENCE_THRESHOLDS } from "@/constants/scoring-weights";
import type { EmailDraft } from "@/types/outreach";
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

    const { subjectLines, hook, bridge, fullBody } =
      await generateEmailDraft(lead);

    const holdReasons = getHoldReasons(lead);
    const isAutoApproved = holdReasons.length === 0;

    const draft: EmailDraft = {
      id: `email-${leadId}-${Date.now()}`,
      leadId,
      leadName: lead.name,
      intendedRecipient:
        lead.enrichment.contactEmail ?? `info@${lead.name.toLowerCase().replace(/\s+/g, "")}.com`,
      subjectLines,
      selectedSubjectIndex: 0,
      hook,
      bridge,
      offer: "", // included in fullBody via template
      close: "",
      fullBody,
      status: isAutoApproved ? "approved" : "pending_review",
      confidenceScore: lead.score ?? 0,
      holdReasons,
      createdAt: new Date().toISOString(),
    };

    upsertEmailDraft(draft);

    lead.status = isAutoApproved ? "email_approved" : "email_drafted";
    upsertLead(lead);

    if (!isAutoApproved) {
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
      autoApproved: isAutoApproved,
      holdReasons,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Email generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getHoldReasons(lead: import("@/types/lead").Lead): string[] {
  const reasons: string[] = [];
  const score = lead.score ?? 0;
  const enrichment = lead.enrichment;

  if (score < CONFIDENCE_THRESHOLDS.HIGH) {
    reasons.push(`Lead score ${score} is below auto-approve threshold (${CONFIDENCE_THRESHOLDS.HIGH})`);
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
