"use client";

import { useState, useEffect, useCallback } from "react";
import { LeadCard } from "@/components/features/leads/lead-card";
import type { Lead } from "@/types/lead";

interface LeadListProps {
  area?: string;
  refreshKey?: number;
}

function LeadCardSkeleton() {
  return (
    <div
      className="rounded-xl border bg-card p-4 space-y-3 animate-pulse"
      aria-hidden
    >
      <div className="h-5 w-3/4 rounded bg-muted" />
      <div className="h-4 w-1/2 rounded bg-muted" />
      <div className="flex gap-2">
        <div className="h-5 w-12 rounded-full bg-muted" />
        <div className="h-5 w-20 rounded-full bg-muted" />
      </div>
      <div className="h-4 w-24 rounded bg-muted" />
    </div>
  );
}

export function LeadList({ area, refreshKey }: LeadListProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = area
        ? `/api/leads?area=${encodeURIComponent(area)}`
        : "/api/leads";
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to fetch leads");
        return;
      }

      setLeads(data.leads ?? []);
    } catch {
      setError("Failed to fetch leads");
    } finally {
      setIsLoading(false);
    }
  }, [area]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads, refreshKey]);

  if (isLoading) {
    return (
      <section
        aria-busy="true"
        aria-label="Loading leads"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <LeadCardSkeleton key={i} />
        ))}
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="Lead list">
        <p className="text-destructive" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (leads.length === 0) {
    return (
      <section aria-label="Lead list">
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground">No leads yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the form above to discover leads in a London area.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label={`Lead list: ${leads.length} leads`}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {leads.map((lead) => (
        <LeadCard key={lead.placeId} lead={lead} />
      ))}
    </section>
  );
}
