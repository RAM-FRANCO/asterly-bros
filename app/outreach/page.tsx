"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { EmailPreview } from "@/components/features/outreach/email-preview";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { EmailDraft } from "@/types/outreach";

const STATUS_ORDER: EmailDraft["status"][] = [
  "pending_review",
  "approved",
  "sent",
  "draft",
  "failed",
  "bounced",
];

function groupDraftsByStatus(drafts: EmailDraft[]) {
  const groups: Record<string, EmailDraft[]> = {};
  for (const status of STATUS_ORDER) {
    groups[status] = [];
  }
  for (const draft of drafts) {
    if (groups[draft.status]) {
      groups[draft.status].push(draft);
    } else {
      groups[draft.status] = [draft];
    }
  }
  return groups;
}

export default function OutreachPage() {
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/outreach");
      if (!res.ok) throw new Error("Failed to fetch drafts");
      const data = await res.json();
      setDrafts(data.drafts ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load drafts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const handleSend = useCallback(
    async (emailId: string, subjectIndex: number, editedBody?: string) => {
      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId,
          selectedSubjectIndex: subjectIndex,
          ...(editedBody !== undefined && { fullBody: editedBody }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to send email");
        throw new Error(data.error);
      }
      toast.success(
        data.pocMode
          ? `Email redirected to ${data.redirectedTo} (PoC mode)`
          : `Email sent to ${data.intendedRecipient}`
      );
      await fetchDrafts();
    },
    [fetchDrafts]
  );

  const handleSaveBody = useCallback(
    async (emailId: string, body: string) => {
      const res = await fetch(`/api/outreach/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullBody: body }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to save changes");
      }
    },
    []
  );

  const groups = groupDraftsByStatus(drafts);
  const hasDrafts = drafts.length > 0;

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
      ) : !hasDrafts ? (
        <section className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-muted-foreground">No email drafts yet</p>
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
          {STATUS_ORDER.filter(
            (s) => groups[s]?.length > 0 && ["pending_review", "approved", "sent"].includes(s)
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
