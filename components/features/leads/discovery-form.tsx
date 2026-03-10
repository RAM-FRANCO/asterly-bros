"use client";

import { useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LONDON_AREAS } from "@/constants/venue-types";
import { getLead, findLeadByName, upsertLead } from "@/lib/local-store";
import { toast } from "sonner";
import type { Lead } from "@/types/lead";

const AREA_PRESETS = [
  { label: "Popular London Areas", items: LONDON_AREAS },
] as const;

interface DiscoveryFormProps {
  onDiscoveryComplete?: () => void;
}

export function DiscoveryForm({ onDiscoveryComplete }: DiscoveryFormProps) {
  const [area, setArea] = useState<string>("");
  const [customArea, setCustomArea] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);
  const [limit, setLimit] = useState<string>("3");
  const [isLoading, setIsLoading] = useState(false);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const [progressText, setProgressText] = useState<string | null>(null);

  const activeArea = useCustom ? customArea.trim() : area;

  async function enrichLead(lead: Lead): Promise<Lead> {
    const res = await fetch("/api/leads/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead }),
    });

    if (!res.ok) return lead;

    const data = await res.json();
    return data.lead ?? lead;
  }

  async function handleDiscover() {
    if (!activeArea) {
      toast.error("Please select or enter an area");
      return;
    }

    setIsLoading(true);
    setResultCount(null);
    setProgressText("Searching venues…");

    try {
      const res = await fetch("/api/leads/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area: activeArea,
          limit: Number(limit),
          isLondon: !useCustom,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Discovery failed");
        return;
      }

      const venues = (data.venues ?? []) as Lead[];
      const newLeads: Lead[] = [];

      for (const venue of venues) {
        const existingById = getLead(venue.placeId);
        const existingByName = findLeadByName(venue.name);
        if (!existingById && !existingByName) {
          upsertLead(venue);
          newLeads.push(venue);
        }
      }

      setResultCount(newLeads.length);
      onDiscoveryComplete?.();

      if (newLeads.length === 0) {
        toast.success(
          `Found ${venues.length} venues in ${activeArea}. No new leads.`
        );
        return;
      }

      toast.success(
        `Found ${venues.length} venues in ${activeArea}. ${newLeads.length} new leads added. Enriching…`
      );

      let enriched = 0;
      for (const lead of newLeads) {
        setProgressText(
          `Enriching ${enriched + 1} of ${newLeads.length}: ${lead.name}…`
        );
        try {
          const enrichedLead = await enrichLead(lead);
          upsertLead(enrichedLead);
          enriched++;
          onDiscoveryComplete?.();
        } catch {
          toast.error(`Failed to enrich ${lead.name}`);
        }
      }

      toast.success(
        `Done — ${enriched} of ${newLeads.length} leads enriched & scored`
      );
    } catch {
      toast.error("Discovery failed");
    } finally {
      setIsLoading(false);
      setProgressText(null);
    }
  }

  return (
    <section aria-labelledby="discovery-form-title" className="space-y-4">
      <h2 id="discovery-form-title" className="sr-only">
        Discover leads by area
      </h2>

      <div className="flex items-center gap-2 mb-1">
        <button
          type="button"
          onClick={() => setUseCustom(false)}
          className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
            !useCustom
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          London areas
        </button>
        <button
          type="button"
          onClick={() => setUseCustom(true)}
          className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
            useCustom
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Custom location
        </button>
      </div>

      <div className="grid grid-cols-[auto_auto_auto] items-end gap-3 sm:flex sm:flex-wrap">
        {useCustom ? (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="custom-area-input"
              className="text-sm font-medium leading-none"
            >
              Location
            </label>
            <Input
              id="custom-area-input"
              placeholder="e.g. Manchester, Brighton, Edinburgh"
              value={customArea}
              onChange={(e) => setCustomArea(e.target.value)}
              disabled={isLoading}
              className="w-[260px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleDiscover();
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="area-select"
              className="text-sm font-medium leading-none"
            >
              London area
            </label>
            <Select
              value={area}
              onValueChange={(value) => setArea(value ?? "")}
              disabled={isLoading}
            >
              <SelectTrigger
                id="area-select"
                className="w-[200px]"
                aria-label="Select London area"
              >
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                {AREA_PRESETS.map((group) =>
                  group.items.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="limit-select"
            className="text-sm font-medium leading-none"
          >
            Results
          </label>
          <Select
            value={limit}
            onValueChange={(value) => setLimit(value ?? "3")}
            disabled={isLoading}
          >
            <SelectTrigger
              id="limit-select"
              className="w-[80px]"
              aria-label="Number of results"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm leading-none invisible" aria-hidden="true">
            &nbsp;
          </span>
          <Button
            onClick={handleDiscover}
            disabled={isLoading || !activeArea}
            aria-busy={isLoading}
          >
            {isLoading ? "Discovering…" : "Discover Leads"}
          </Button>
        </div>

        {(progressText ?? (resultCount !== null)) && (
          <p className="col-span-full self-center text-sm text-muted-foreground sm:self-end">
            {progressText ??
              `${resultCount} new lead${resultCount !== 1 ? "s" : ""} added`}
          </p>
        )}
      </div>
    </section>
  );
}
