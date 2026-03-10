"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/features/leads/score-badge";
import { PIPELINE_STAGES } from "@/constants/venue-types";
import type { Lead } from "@/types/lead";
import { cn } from "@/lib/utils";

interface LeadCardProps {
  lead: Lead;
}

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
      className={cn("inline-block size-2 rounded-full", colorClasses[level])}
      aria-label={`Confidence: ${level}`}
      title={`Confidence: ${level}`}
    />
  );
}

export function LeadCard({ lead }: LeadCardProps) {
  const statusStage = PIPELINE_STAGES.find((s) => s.key === lead.status);
  const venueTypeLabel = lead.enrichment?.venueType
    ? formatVenueType(lead.enrichment.venueType)
    : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <article className="flex flex-col gap-3" aria-label={`Lead: ${lead.name}`}>
          <header className="space-y-1">
            <h3 className="text-base font-bold leading-tight">
              <Link
                href={`/leads/${lead.placeId}`}
                className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              >
                {lead.name}
              </Link>
            </h3>
            <p className="text-sm text-muted-foreground">
              {lead.area}
              {lead.address ? ` · ${lead.address}` : ""}
            </p>
          </header>

          <div className="flex flex-wrap items-center gap-2">
            {lead.score !== undefined && (
              <ScoreBadge score={lead.score} />
            )}
            {venueTypeLabel && (
              <Badge variant="secondary" className="font-normal">
                {venueTypeLabel}
              </Badge>
            )}
            <span className="flex items-center gap-1.5" aria-hidden>
              <ConfidenceDot level={lead.confidenceLevel} />
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

          <footer className="mt-auto pt-2">
            <Link
              href={`/leads/${lead.placeId}`}
              className="text-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            >
              View Details →
            </Link>
          </footer>
        </article>
      </CardContent>
    </Card>
  );
}
