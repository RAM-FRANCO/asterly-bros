"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PIPELINE_STAGES } from "@/constants/venue-types";
import { getAllLeads, getStats } from "@/lib/local-store";
import { cn } from "@/lib/utils";
import type { PipelineStats } from "@/types/pipeline";
import type { LeadStatus } from "@/types/lead";

interface RecentLead {
  leadId: string;
  leadName: string;
  area: string;
  score: number;
  status: LeadStatus;
  updatedAt: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(() => {
    setIsLoading(true);
    try {
      const computedStats = getStats();
      setStats(computedStats);

      const leads = getAllLeads()
        .filter((l) => l.status !== "new")
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 5)
        .map((l) => ({
          leadId: l.placeId,
          leadName: l.name,
          area: l.area,
          score: l.score ?? 0,
          status: l.status,
          updatedAt: l.updatedAt,
        }));
      setRecentLeads(leads);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStageColor = (status: LeadStatus) => {
    const stage = PIPELINE_STAGES.find((s) => s.key === status);
    return stage?.color ?? "bg-gray-100 text-gray-700";
  };

  const getStageLabel = (status: LeadStatus) => {
    const stage = PIPELINE_STAGES.find((s) => s.key === status);
    return stage?.label ?? status;
  };

  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          AI-powered lead generation for Asterley Bros
        </p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading…</p>
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
                    Needs Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href="/outreach" className="block">
                    <p className="text-2xl font-bold text-primary hover:underline">
                      {stats.needsReview}
                    </p>
                  </Link>
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
            </section>
          )}

          <section>
            <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/leads">
                <Button variant="outline">Discover New Leads</Button>
              </Link>
              <Link href="/outreach">
                <Button variant="outline">Review Outreach Queue</Button>
              </Link>
              <Link href="/pipeline">
                <Button variant="outline">View Pipeline</Button>
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-4">Recent Activity</h2>
            {recentLeads.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No recent leads. Discover leads to get started.
              </p>
            ) : (
              <div className="rounded-lg border divide-y">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.leadId}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
                  >
                    <span className="font-medium shrink-0">{lead.leadName}</span>
                    <span className="text-muted-foreground text-sm">
                      {lead.area}
                    </span>
                    <Badge
                      className={cn(
                        "shrink-0",
                        getStageColor(lead.status)
                      )}
                    >
                      {getStageLabel(lead.status)}
                    </Badge>
                    <span className="text-sm text-muted-foreground ml-auto">
                      Score: {lead.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </article>
  );
}
