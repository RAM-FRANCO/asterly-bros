"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/features/leads/score-badge";
import { SendEmailModal } from "@/components/features/outreach/send-email-modal";
import { PIPELINE_STAGES } from "@/constants/venue-types";
import { SCORING_WEIGHTS } from "@/constants/scoring-weights";
import {
  getLead,
  upsertLead,
  getEmailDraftByLead,
  upsertEmailDraft,
  addNotification,
  markNotificationsReadByLeadAndType,
  getSettings,
} from "@/lib/local-store";
import type { Lead } from "@/types/lead";
import type { EmailDraft } from "@/types/outreach";
import type { Notification } from "@/types/pipeline";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatVenueType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function ConfidenceDot({ level }: { level: Lead["confidenceLevel"] }) {
  const colorClasses = {
    high: "bg-green-500",
    medium: "bg-amber-500",
    low: "bg-red-500",
  };
  return (
    <span
      className={cn("inline-block size-2.5 rounded-full", colorClasses[level])}
      aria-label={`Confidence: ${level}`}
    />
  );
}

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  useEffect(() => {
    params.then((p) => setPlaceId(p.placeId));
  }, [params]);

  const loadData = useCallback((id: string) => {
    const storedLead = getLead(id);
    if (storedLead) setLead(storedLead);
    const draft = getEmailDraftByLead(id);
    setEmailDraft(draft ?? null);
  }, []);

  useEffect(() => {
    if (!placeId) return;
    setIsLoading(true);
    loadData(placeId);
    setIsLoading(false);
  }, [placeId, loadData]);

  async function handleEnrich() {
    if (!placeId || !lead) return;
    setEnrichLoading(true);
    try {
      const res = await fetch("/api/leads/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead }),
      });
      const data = await res.json();
      if (res.ok && data.lead) {
        upsertLead(data.lead);
        setLead(data.lead);
      }
    } finally {
      setEnrichLoading(false);
    }
  }

  async function handleGenerateEmail() {
    if (!placeId || !lead) return;
    setEmailLoading(true);
    try {
      const existingDraft = getEmailDraftByLead(placeId);
      const settings = getSettings();

      const res = await fetch("/api/outreach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead,
          existingDraftStatus: existingDraft?.status ?? null,
          pocMode: settings.pocMode,
          pocRedirectEmail: settings.pocRedirectEmail,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        upsertEmailDraft(data.draft);
        setEmailDraft(data.draft);

        const updatedLead = { ...lead, status: data.leadStatus };
        upsertLead(updatedLead);
        setLead(updatedLead);

        if (data.notification) {
          addNotification(data.notification as Notification);
        }

        toast.success("Email draft generated");

        if (data.notificationEmailError) {
          toast.warning(
            `Review notification email failed: ${data.notificationEmailError}`
          );
        }
      } else {
        toast.error(data.error ?? "Failed to generate email");
      }
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleSendEmail(
    emailId: string,
    subjectIndex: number,
    editedBody?: string
  ) {
    const draft = emailDraft;
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
    setEmailDraft(updatedDraft);

    markNotificationsReadByLeadAndType(draft.leadId, "hold_for_review");

    if (lead) {
      const updatedLead = { ...lead, status: "emailed" as const };
      upsertLead(updatedLead);
      setLead(updatedLead);
    }

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
  }

  function handleSaveBody(emailId: string, body: string) {
    if (!emailDraft) return;
    const updated = { ...emailDraft, fullBody: body };
    upsertEmailDraft(updated);
    setEmailDraft(updated);
  }

  if (isLoading || !placeId) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-4 w-64 rounded bg-muted" />
        <div className="h-32 rounded-xl bg-muted" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lead not found.</p>
        <Link href="/leads" className="text-primary hover:underline mt-2 inline-block">
          Back to leads
        </Link>
      </div>
    );
  }

  const statusStage = PIPELINE_STAGES.find((s) => s.key === lead.status);
  const breakdown = lead.scoreBreakdown;
  const weightsByKey = Object.fromEntries(
    SCORING_WEIGHTS.map((w) => [w.key, w])
  );

  const POST_EMAIL_STATUSES = new Set([
    "email_drafted",
    "email_approved",
    "emailed",
    "follow_up_1",
    "follow_up_2",
    "replied",
    "meeting",
    "won",
    "lost",
  ]);
  const hasBeenEmailed = POST_EMAIL_STATUSES.has(lead.status);
  const isEnriched = !!lead.enrichment;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/leads"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to leads
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{lead.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {lead.area}
            {lead.address ? ` · ${lead.address}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lead.score !== undefined && <ScoreBadge score={lead.score} />}
          <span className="flex items-center gap-1.5">
            <ConfidenceDot level={lead.confidenceLevel} />
            <span className="text-sm text-muted-foreground capitalize">
              {lead.confidenceLevel}
            </span>
          </span>
          {statusStage && (
            <Badge
              variant="outline"
              className={cn("border-transparent", statusStage.color)}
            >
              {statusStage.label}
            </Badge>
          )}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {!isEnriched && (
          <Button
            onClick={handleEnrich}
            disabled={enrichLoading}
            aria-busy={enrichLoading}
          >
            {enrichLoading ? "Enriching…" : "Enrich"}
          </Button>
        )}
        {!hasBeenEmailed && !emailDraft && (
          <Button
            variant="outline"
            onClick={handleGenerateEmail}
            disabled={emailLoading || !lead.enrichment}
            aria-busy={emailLoading}
          >
            {emailLoading ? "Generating…" : "Generate Email"}
          </Button>
        )}
        {emailDraft && emailDraft.status !== "sent" && (
          <Button onClick={() => setEmailModalOpen(true)}>
            Review & Send Email
          </Button>
        )}
        {emailDraft && emailDraft.status === "sent" && (
          <Button variant="outline" onClick={() => setEmailModalOpen(true)}>
            View Sent Email
          </Button>
        )}
      </div>

      {emailDraft && (
        <SendEmailModal
          draft={emailDraft}
          open={emailModalOpen}
          onOpenChange={setEmailModalOpen}
          onSend={handleSendEmail}
          onSaveBody={handleSaveBody}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {lead.rating !== undefined && (
              <p>
                <span className="font-medium">Rating:</span> {lead.rating}
                {lead.reviewCount !== undefined && ` (${lead.reviewCount} reviews)`}
              </p>
            )}
            {lead.priceLevel !== undefined && (
              <p>
                <span className="font-medium">Price level:</span>{" "}
                {"£".repeat(lead.priceLevel)}
              </p>
            )}
            {lead.phone && (
              <p>
                <span className="font-medium">Phone:</span> {lead.phone}
              </p>
            )}
            {lead.website && (
              <p>
                <span className="font-medium">Website:</span>{" "}
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {lead.website}
                </a>
              </p>
            )}
            {lead.googleMapsUrl && (
              <p>
                <span className="font-medium">Google Maps:</span>{" "}
                <a
                  href={lead.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View on Google Maps ↗
                </a>
              </p>
            )}
            {lead.types?.length > 0 && (
              <p>
                <span className="font-medium">Types:</span> {lead.types.join(", ")}
              </p>
            )}
          </CardContent>
        </Card>

        {breakdown && (
          <Card>
            <CardHeader>
              <CardTitle>Score breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2" aria-label="Score breakdown">
                {(Object.entries(breakdown) as [keyof typeof breakdown, number][]).map(
                  ([key, value]) => {
                    if (key === "total") return null;
                    const weight = weightsByKey[key];
                    const label = weight?.label ?? key;
                    const maxPoints = weight?.points ?? 0;
                    const pct = maxPoints > 0 ? (value / maxPoints) * 100 : 0;
                    return (
                      <li key={key} className="flex items-center gap-2">
                        <span className="flex-1 text-sm">{label}</span>
                        <div className="flex items-center gap-2 w-24">
                          <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm tabular-nums w-6">
                            +{value}
                          </span>
                        </div>
                      </li>
                    );
                  }
                )}
              </ul>
              <p className="mt-3 text-sm font-medium">
                Total: {breakdown.total}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {lead.enrichment && (
        <Card>
          <CardHeader>
            <CardTitle>Enrichment</CardTitle>
            <p className="text-sm text-muted-foreground">
              Source:{" "}
              <Badge variant="secondary">{lead.enrichment.source}</Badge>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Venue type
                </p>
                <p>
                  {formatVenueType(lead.enrichment.venueType)}
                  {lead.enrichment.venueSubType &&
                    ` — ${lead.enrichment.venueSubType}`}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vibe</p>
                <p className="text-sm">{lead.enrichment.vibe}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Existing brands
              </p>
              <div className="flex flex-wrap gap-1">
                {lead.enrichment.existingBrands.map((b) => (
                  <Badge key={b} variant="outline">
                    {b}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Competitor aperitifs
              </p>
              <div className="flex flex-wrap gap-1">
                {lead.enrichment.competitorAperitifs.map((b) => (
                  <Badge key={b} variant="outline">
                    {b}
                  </Badge>
                ))}
              </div>
            </div>

            {lead.enrichment.keyMenuItems?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Key menu items
                </p>
                <ul className="list-disc list-inside text-sm space-y-0.5">
                  {lead.enrichment.keyMenuItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              {lead.enrichment.contactEmail && (
                <p className="text-sm">
                  <span className="font-medium text-muted-foreground">
                    Contact email:
                  </span>{" "}
                  {lead.enrichment.contactEmail}
                </p>
              )}
              {lead.enrichment.contactName && (
                <p className="text-sm">
                  <span className="font-medium text-muted-foreground">
                    Contact name:
                  </span>{" "}
                  {lead.enrichment.contactName}
                </p>
              )}
            </div>

            {lead.enrichment.summary && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Summary
                </p>
                <p className="text-sm">{lead.enrichment.summary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
