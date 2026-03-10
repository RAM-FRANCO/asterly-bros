"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PIPELINE_STAGES } from "@/constants/venue-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { LeadStatus } from "@/types/lead";
import type { PipelineEntry, PipelineStats } from "@/types/pipeline";

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineEntry[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPipeline = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/pipeline");
      if (!res.ok) throw new Error("Failed to fetch pipeline");
      const data = await res.json();
      setPipeline(
        (data.pipeline ?? []).sort(
          (a: PipelineEntry, b: PipelineEntry) => b.score - a.score
        )
      );
      setStats(data.stats ?? null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load pipeline"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  const handleStatusChange = useCallback(
    async (leadId: string, status: LeadStatus) => {
      try {
        const res = await fetch("/api/pipeline", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId, status }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to update");
        }
        toast.success("Status updated");
        await fetchPipeline();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    },
    [fetchPipeline]
  );

  const getStageColor = (status: LeadStatus) => {
    const stage = PIPELINE_STAGES.find((s) => s.key === status);
    return stage?.color ?? "bg-gray-100 text-gray-700";
  };

  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
        <p className="text-muted-foreground mt-1">
          Track lead status and progress through the sales funnel
        </p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading pipeline…</p>
        </div>
      ) : (
        <>
          {stats && (
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Leads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Average Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.avgScore}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Conversion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Needs Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.needsReview}</p>
                </CardContent>
              </Card>
            </section>
          )}

          {pipeline.length === 0 ? (
            <section className="rounded-lg border border-dashed py-12 text-center">
              <p className="text-muted-foreground">No pipeline entries yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Enrich and score leads to see them in the pipeline
              </p>
            </section>
          ) : (
            <section className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venue Name</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pipeline.map((entry) => (
                    <TableRow key={entry.leadId}>
                      <TableCell className="font-medium">
                        {entry.leadName}
                      </TableCell>
                      <TableCell>{entry.area}</TableCell>
                      <TableCell>{entry.score}</TableCell>
                      <TableCell>
                        <Select
                          value={entry.status}
                          onValueChange={(value) =>
                            handleStatusChange(entry.leadId, value as LeadStatus)
                          }
                          items={PIPELINE_STAGES.map((s) => ({
                            value: s.key,
                            label: s.label,
                          }))}
                        >
                          <SelectTrigger
                            className={cn(
                              "w-fit border-0 bg-transparent shadow-none hover:bg-muted/50",
                              getStageColor(entry.status)
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PIPELINE_STAGES.map((stage) => (
                              <SelectItem
                                key={stage.key}
                                value={stage.key}
                                className={stage.color}
                              >
                                {stage.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
          )}
        </>
      )}
    </article>
  );
}
