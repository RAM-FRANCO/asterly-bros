"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buildLogs, type LogEntry } from "@/lib/local-store";
import { cn } from "@/lib/utils";

const ACTION_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  discovered: {
    label: "Discovered",
    color: "bg-slate-100 text-slate-700",
    icon: "🔍",
  },
  enriched: {
    label: "Enriched",
    color: "bg-blue-100 text-blue-700",
    icon: "📊",
  },
  email_generated: {
    label: "Email Generated",
    color: "bg-purple-100 text-purple-700",
    icon: "✉️",
  },
  email_sent: {
    label: "Sent",
    color: "bg-green-100 text-green-700",
    icon: "✅",
  },
  email_failed: {
    label: "Failed",
    color: "bg-red-100 text-red-700",
    icon: "❌",
  },
  held_for_review: {
    label: "Held for Review",
    color: "bg-amber-100 text-amber-700",
    icon: "⏸️",
  },
  skipped: {
    label: "Skipped",
    color: "bg-gray-100 text-gray-500",
    icon: "⏭️",
  },
};

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "discovered", label: "Discovered" },
  { value: "enriched", label: "Enriched" },
  { value: "email_generated", label: "Generated" },
  { value: "email_sent", label: "Sent" },
  { value: "email_failed", label: "Failed" },
  { value: "held_for_review", label: "Held" },
];

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLogs(buildLogs());
    setIsLoading(false);
  }, []);

  const filtered =
    filter === "all" ? logs : logs.filter((l) => l.action === filter);

  const actionCounts = logs.reduce<Record<string, number>>((acc, log) => {
    acc[log.action] = (acc[log.action] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">
          Timeline of all lead discovery, enrichment, and email activity
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => {
          const count =
            opt.value === "all"
              ? logs.length
              : (actionCounts[opt.value] ?? 0);
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                filter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {opt.label}
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                  filter === opt.value
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-background text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <section className="rounded-lg border border-dashed py-12 text-center">
          <p className="text-muted-foreground">No activity yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start discovering leads to see activity here
          </p>
          <Link href="/leads">
            <button className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Discover Leads
            </button>
          </Link>
        </section>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <ul className="space-y-1">
            {filtered.map((log) => {
              const config = ACTION_CONFIG[log.action] ?? {
                label: log.action,
                color: "bg-muted text-muted-foreground",
                icon: "📌",
              };

              return (
                <li key={log.id} className="relative flex gap-4 pl-10 py-3">
                  <span className="absolute left-3 top-4 flex size-5 items-center justify-center rounded-full bg-card border border-border text-xs">
                    {config.icon}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "shrink-0 text-xs font-medium border-transparent",
                          config.color
                        )}
                      >
                        {config.label}
                      </Badge>
                      <Link
                        href={`/leads/${log.leadId}`}
                        className="text-sm font-medium hover:underline truncate"
                      >
                        {log.leadName}
                      </Link>
                      {log.score !== undefined && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          Score: {log.score}
                        </span>
                      )}
                      {log.tier && (
                        <span className="text-xs text-muted-foreground capitalize">
                          ({log.tier})
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground truncate">
                      {log.detail}
                    </p>
                  </div>

                  <time className="shrink-0 text-xs text-muted-foreground pt-0.5 tabular-nums">
                    {formatTimestamp(log.timestamp)}
                  </time>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </article>
  );
}
