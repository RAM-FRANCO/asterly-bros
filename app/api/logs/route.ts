import { NextResponse } from "next/server";
import { getAllLeads, getAllEmailDrafts, getAllNotifications } from "@/lib/store";

export interface LogEntry {
  id: string;
  timestamp: string;
  leadName: string;
  leadId: string;
  action: "discovered" | "enriched" | "email_generated" | "email_sent" | "email_failed" | "held_for_review" | "skipped";
  detail: string;
  tier?: string;
  score?: number;
}

export async function GET() {
  const leads = getAllLeads();
  const drafts = getAllEmailDrafts();
  const notifications = getAllNotifications();
  const logs: LogEntry[] = [];

  for (const lead of leads) {
    logs.push({
      id: `log-discovered-${lead.placeId}`,
      timestamp: lead.createdAt,
      leadName: lead.name,
      leadId: lead.placeId,
      action: "discovered",
      detail: `Added from ${lead.source.replace(/_/g, " ")} — ${lead.area}`,
      score: lead.score,
    });

    if (lead.enrichment) {
      logs.push({
        id: `log-enriched-${lead.placeId}`,
        timestamp: lead.enrichment.scrapedAt,
        leadName: lead.name,
        leadId: lead.placeId,
        action: "enriched",
        detail: `${lead.enrichment.venueType.replace(/_/g, " ")} — ${lead.enrichment.vibe}`,
        score: lead.score,
      });
    }
  }

  for (const draft of drafts) {
    logs.push({
      id: `log-email-gen-${draft.id}`,
      timestamp: draft.createdAt,
      leadName: draft.leadName,
      leadId: draft.leadId,
      action: "email_generated",
      detail: `Subject: "${draft.subjectLines[draft.selectedSubjectIndex]}"`,
      tier: draft.outreachTier,
      score: draft.confidenceScore,
    });

    if (draft.status === "sent" && draft.sentAt) {
      logs.push({
        id: `log-email-sent-${draft.id}`,
        timestamp: draft.sentAt,
        leadName: draft.leadName,
        leadId: draft.leadId,
        action: "email_sent",
        detail: draft.redirectedTo
          ? `Redirected to ${draft.redirectedTo} (PoC)`
          : `Sent to ${draft.intendedRecipient}`,
        tier: draft.outreachTier,
        score: draft.confidenceScore,
      });
    }

    if (draft.status === "failed") {
      logs.push({
        id: `log-email-failed-${draft.id}`,
        timestamp: draft.createdAt,
        leadName: draft.leadName,
        leadId: draft.leadId,
        action: "email_failed",
        detail: "Email delivery failed",
        tier: draft.outreachTier,
        score: draft.confidenceScore,
      });
    }
  }

  for (const notif of notifications) {
    if (notif.type === "hold_for_review") {
      logs.push({
        id: `log-review-${notif.id}`,
        timestamp: notif.createdAt,
        leadName: notif.title.replace("Review needed: ", ""),
        leadId: notif.leadId ?? "",
        action: "held_for_review",
        detail: notif.message,
      });
    }
  }

  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({ logs });
}
