"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { LeadCard } from "@/components/features/leads/lead-card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PIPELINE_STAGES } from "@/constants/venue-types";
import type { Lead, LeadStatus } from "@/types/lead";

const ALL_VALUE = "__all__";

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

function formatVenueType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function LeadList({ area, refreshKey }: LeadListProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState(ALL_VALUE);
  const [venueTypeFilter, setVenueTypeFilter] = useState(ALL_VALUE);
  const [areaFilter, setAreaFilter] = useState(ALL_VALUE);
  const [searchQuery, setSearchQuery] = useState("");

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

  const uniqueVenueTypes = useMemo(() => {
    const types = new Set<string>();
    for (const lead of leads) {
      if (lead.enrichment?.venueType) types.add(lead.enrichment.venueType);
    }
    return Array.from(types).sort();
  }, [leads]);

  const uniqueAreas = useMemo(() => {
    const areas = new Set<string>();
    for (const lead of leads) {
      if (lead.area) areas.add(lead.area);
    }
    return Array.from(areas).sort();
  }, [leads]);

  const activeStatuses = useMemo(() => {
    const statuses = new Set<LeadStatus>();
    for (const lead of leads) {
      statuses.add(lead.status);
    }
    return PIPELINE_STAGES.filter((s) => statuses.has(s.key as LeadStatus));
  }, [leads]);

  const filteredLeads = useMemo(() => {
    let result = leads;

    if (statusFilter !== ALL_VALUE) {
      result = result.filter((l) => l.status === statusFilter);
    }
    if (venueTypeFilter !== ALL_VALUE) {
      result = result.filter(
        (l) => l.enrichment?.venueType === venueTypeFilter
      );
    }
    if (areaFilter !== ALL_VALUE) {
      result = result.filter((l) => l.area === areaFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q)
      );
    }

    return result;
  }, [leads, statusFilter, venueTypeFilter, areaFilter, searchQuery]);

  const hasActiveFilters =
    statusFilter !== ALL_VALUE ||
    venueTypeFilter !== ALL_VALUE ||
    areaFilter !== ALL_VALUE ||
    searchQuery.trim() !== "";

  function clearFilters() {
    setStatusFilter(ALL_VALUE);
    setVenueTypeFilter(ALL_VALUE);
    setAreaFilter(ALL_VALUE);
    setSearchQuery("");
  }

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
    <section aria-label={`Lead list: ${leads.length} leads`} className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="search-leads" className="text-sm font-medium leading-none">
            Search
          </label>
          <Input
            id="search-leads"
            placeholder="Name or address…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[200px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="status-filter" className="text-sm font-medium leading-none">
            Status
          </label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="status-filter" className="w-[150px]" aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All statuses</SelectItem>
              {activeStatuses.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {uniqueVenueTypes.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="venue-type-filter" className="text-sm font-medium leading-none">
              Venue type
            </label>
            <Select value={venueTypeFilter} onValueChange={setVenueTypeFilter}>
              <SelectTrigger id="venue-type-filter" className="w-[170px]" aria-label="Filter by venue type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All types</SelectItem>
                {uniqueVenueTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {formatVenueType(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {uniqueAreas.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="area-filter" className="text-sm font-medium leading-none">
              Area
            </label>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger id="area-filter" className="w-[150px]" aria-label="Filter by area">
                <SelectValue placeholder="All areas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All areas</SelectItem>
                {uniqueAreas.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="font-normal">
          {filteredLeads.length} of {leads.length} leads
        </Badge>
      </div>

      {filteredLeads.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground">No leads match your filters.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <LeadCard key={lead.placeId} lead={lead} />
          ))}
        </div>
      )}
    </section>
  );
}
