"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { EmailPreview } from "@/components/features/outreach/email-preview";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  getAllEmailDrafts,
  upsertEmailDraft,
  getLead,
  upsertLead,
  addNotification,
  getSettings,
  markNotificationsReadByLeadAndType,
} from "@/lib/local-store";
import { toast } from "sonner";
import type { EmailDraft } from "@/types/outreach";
import type { Notification } from "@/types/pipeline";

const QUEUE_STATUSES: EmailDraft["status"][] = [
  "pending_review",
  "approved",
];

function groupDraftsByStatus(drafts: EmailDraft[]) {
  const groups: Record<string, EmailDraft[]> = {};
  for (const status of QUEUE_STATUSES) {
    groups[status] = [];
  }
  for (const draft of drafts) {
    if (groups[draft.status]) {
      groups[draft.status].push(draft);
    }
  }
  return groups;
}

export default function OutreachPage() {
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDrafts = useCallback(() => {
    setIsLoading(true);
    const data = getAllEmailDrafts().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setDrafts(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const handleSend = useCallback(
    async (emailId: string, subjectIndex: number, editedBody?: string) => {
      const draft = drafts.find((d) => d.id === emailId);
      if (!draft) return;

      const settings = getSettings();

      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft,
          selectedSubjectIndex: subjectIndex,
          ...(editedBody !== undefined && { fullBody: editedBody }),
          pocMode: settings.pocMode,
          pocRedirectEmail: settings.pocRedirectEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send email");
        throw new Error(data.error);
      }

      const updatedDraft: EmailDraft = {
        ...draft,
        status: "sent",
        sentAt: data.sentAt,
        redirectedTo: data.redirectedTo,
        selectedSubjectIndex: subjectIndex,
        ...(editedBody !== undefined && { fullBody: editedBody }),
      };
      upsertEmailDraft(updatedDraft);

      const lead = getLead(draft.leadId);
      if (lead) {
        upsertLead({ ...lead, status: "emailed" });
      }

      markNotificationsReadByLeadAndType(draft.leadId, "hold_for_review");

      const notification: Notification = {
        id: `notif-${Date.now()}`,
        type: "email_sent",
        title: `Email sent to ${draft.leadName}`,
        message: data.redirectedTo
          ? `Redirected to ${data.redirectedTo} (PoC mode)`
          : `Sent to ${draft.intendedRecipient}`,
        leadId: draft.leadId,
        read: false,
        createdAt: new Date().toISOString(),
      };
      addNotification(notification);

      toast.success(
        data.pocMode
          ? `Email redirected to ${data.redirectedTo} (PoC mode)`
          : `Email sent to ${data.intendedRecipient}`
      );
      fetchDrafts();
    },
    [fetchDrafts, drafts]
  );

  const handleSaveBody = useCallback(
    (emailId: string, body: string) => {
      const draft = drafts.find((d) => d.id === emailId);
      if (!draft) return;
      upsertEmailDraft({ ...draft, fullBody: body });
    },
    [drafts]
  );

  const queueDrafts = drafts.filter((d) =>
    QUEUE_STATUSES.includes(d.status)
  );
  const groups = groupDraftsByStatus(queueDrafts);
  const hasQueueItems = queueDrafts.length > 0;

  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Outreach Queue</h1>
        <p className="text-muted-foreground mt-1">
          Review and send email drafts to leads
        </p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading drafts…</p>
        </div>
      ) : !hasQueueItems ? (
        <section className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-muted-foreground">No drafts awaiting approval</p>
          <p className="text-sm text-muted-foreground mt-1">
            Generate drafts from the leads page to see them here
          </p>
          <Link href="/leads">
            <Button variant="outline" className="mt-4">
              Discover Leads
            </Button>
          </Link>
        </section>
      ) : (
        <section className="space-y-8">
          {QUEUE_STATUSES.filter(
            (s) => groups[s]?.length > 0
          ).map((status) => (
            <div key={status}>
              <h2 className="text-lg font-medium capitalize mb-4">
                {status.replace(/_/g, " ")} ({groups[status].length})
              </h2>
              <Accordion className="space-y-3">
                {groups[status].map((draft) => (
                  <EmailPreview
                    key={draft.id}
                    draft={draft}
                    onSend={handleSend}
                    onSaveBody={handleSaveBody}
                  />
                ))}
              </Accordion>
            </div>
          ))}
        </section>
      )}
    </article>
  );
}
