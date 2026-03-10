import type { Lead } from "@/types/lead";
import type { EmailDraft } from "@/types/outreach";
import type { Notification } from "@/types/pipeline";

const STORAGE_KEYS = {
  LEADS: "ab_leads",
  EMAIL_DRAFTS: "ab_email_drafts",
  NOTIFICATIONS: "ab_notifications",
  SETTINGS: "ab_settings",
} as const;

export interface AppSettings {
  pocMode: boolean;
  pocRedirectEmail: string;
}

function defaultSettings(): AppSettings {
  return { pocMode: true, pocRedirectEmail: "" };
}

function isClient(): boolean {
  return typeof window !== "undefined";
}

function readStorage<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, data: T): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to write to localStorage (${key}):`, err);
  }
}

// --- Leads ---

function readLeads(): Record<string, Lead> {
  return readStorage<Record<string, Lead>>(STORAGE_KEYS.LEADS, {});
}

function writeLeads(leads: Record<string, Lead>): void {
  writeStorage(STORAGE_KEYS.LEADS, leads);
}

export function getAllLeads(): Lead[] {
  return Object.values(readLeads());
}

export function getLead(placeId: string): Lead | undefined {
  return readLeads()[placeId];
}

export function upsertLead(lead: Lead): void {
  const leads = readLeads();
  leads[lead.placeId] = { ...lead, updatedAt: new Date().toISOString() };
  writeLeads(leads);
}

export function getLeadsByStatus(status: Lead["status"]): Lead[] {
  return getAllLeads().filter((l) => l.status === status);
}

export function getLeadsByArea(area: string): Lead[] {
  return getAllLeads().filter(
    (l) => l.area.toLowerCase() === area.toLowerCase()
  );
}

export function findLeadByName(name: string): Lead | undefined {
  const normalized = name.toLowerCase().trim();
  return getAllLeads().find(
    (l) => l.name.toLowerCase().trim() === normalized
  );
}

// --- Email Drafts ---

function readDrafts(): Record<string, EmailDraft> {
  return readStorage<Record<string, EmailDraft>>(STORAGE_KEYS.EMAIL_DRAFTS, {});
}

function writeDrafts(drafts: Record<string, EmailDraft>): void {
  writeStorage(STORAGE_KEYS.EMAIL_DRAFTS, drafts);
}

export function getAllEmailDrafts(): EmailDraft[] {
  return Object.values(readDrafts());
}

export function getEmailDraft(id: string): EmailDraft | undefined {
  return readDrafts()[id];
}

export function getEmailDraftByLead(leadId: string): EmailDraft | undefined {
  return getAllEmailDrafts().find((d) => d.leadId === leadId);
}

export function upsertEmailDraft(draft: EmailDraft): void {
  const drafts = readDrafts();
  drafts[draft.id] = draft;
  writeDrafts(drafts);
}

// --- Notifications ---

function readNotifications(): Notification[] {
  return readStorage<Notification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
}

function writeNotifications(notifications: Notification[]): void {
  writeStorage(STORAGE_KEYS.NOTIFICATIONS, notifications);
}

export function getAllNotifications(): Notification[] {
  return [...readNotifications()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getUnreadNotifications(): Notification[] {
  return readNotifications().filter((n) => !n.read);
}

export function addNotification(notification: Notification): void {
  const notifications = readNotifications();
  notifications.push(notification);
  writeNotifications(notifications);
}

export function markNotificationRead(id: string): void {
  const notifications = readNotifications();
  const n = notifications.find((notif) => notif.id === id);
  if (n) {
    n.read = true;
    writeNotifications(notifications);
  }
}

export function markNotificationsReadByLeadAndType(
  leadId: string,
  type: Notification["type"]
): void {
  const notifications = readNotifications();
  let changed = false;
  for (const n of notifications) {
    if (n.leadId === leadId && n.type === type && !n.read) {
      n.read = true;
      changed = true;
    }
  }
  if (changed) writeNotifications(notifications);
}

export function getPendingReviewCount(): number {
  return getAllEmailDrafts().filter((d) => d.status === "pending_review").length;
}

export function markAllNotificationsRead(): void {
  const notifications = readNotifications();
  for (const n of notifications) {
    n.read = true;
  }
  writeNotifications(notifications);
}

// --- Settings ---

export function getSettings(): AppSettings {
  return readStorage<AppSettings>(STORAGE_KEYS.SETTINGS, defaultSettings());
}

export function updateSettings(updates: Partial<AppSettings>): AppSettings {
  const settings = { ...getSettings(), ...updates };
  writeStorage(STORAGE_KEYS.SETTINGS, settings);
  return settings;
}

// --- Clear All ---

export function clearAllData(): void {
  if (!isClient()) return;
  localStorage.removeItem(STORAGE_KEYS.LEADS);
  localStorage.removeItem(STORAGE_KEYS.EMAIL_DRAFTS);
  localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
}

// --- Stats ---

export function getStats() {
  const allLeads = getAllLeads();
  const statusCounts: Record<string, number> = {};

  for (const lead of allLeads) {
    statusCounts[lead.status] = (statusCounts[lead.status] ?? 0) + 1;
  }

  const scoredLeads = allLeads.filter((l) => l.score !== undefined);
  const avgScore =
    scoredLeads.length > 0
      ? scoredLeads.reduce((sum, l) => sum + (l.score ?? 0), 0) /
        scoredLeads.length
      : 0;

  const won = statusCounts["won"] ?? 0;
  const contacted =
    (statusCounts["emailed"] ?? 0) +
    (statusCounts["follow_up_1"] ?? 0) +
    (statusCounts["follow_up_2"] ?? 0) +
    (statusCounts["replied"] ?? 0) +
    (statusCounts["meeting"] ?? 0) +
    won +
    (statusCounts["lost"] ?? 0);

  return {
    total: allLeads.length,
    byStatus: statusCounts,
    avgScore: Math.round(avgScore),
    conversionRate: contacted > 0 ? Math.round((won / contacted) * 100) : 0,
    needsReview: allLeads.filter(
      (l) => l.confidenceLevel !== "high" && l.status === "scored"
    ).length,
  };
}

// --- Logs ---

export interface LogEntry {
  id: string;
  timestamp: string;
  leadName: string;
  leadId: string;
  action:
    | "discovered"
    | "enriched"
    | "email_generated"
    | "email_sent"
    | "email_failed"
    | "held_for_review"
    | "skipped";
  detail: string;
  tier?: string;
  score?: number;
}

export function buildLogs(): LogEntry[] {
  const leads = getAllLeads();
  const drafts = getAllEmailDrafts();
  const notifications = getAllNotifications();
  const logs: LogEntry[] = [];

  for (const lead of leads) {
    logs.push({
      id: `log-discovered-${lead.placeId}`,
      timestamp: lead.createdAt,
      leadName: lead.name,
      leadId: lead.placeId,
      action: "discovered",
      detail: `Added from ${lead.source.replace(/_/g, " ")} — ${lead.area}`,
      score: lead.score,
    });

    if (lead.enrichment) {
      logs.push({
        id: `log-enriched-${lead.placeId}`,
        timestamp: lead.enrichment.scrapedAt,
        leadName: lead.name,
        leadId: lead.placeId,
        action: "enriched",
        detail: `${lead.enrichment.venueType.replace(/_/g, " ")} — ${lead.enrichment.vibe}`,
        score: lead.score,
      });
    }
  }

  for (const draft of drafts) {
    logs.push({
      id: `log-email-gen-${draft.id}`,
      timestamp: draft.createdAt,
      leadName: draft.leadName,
      leadId: draft.leadId,
      action: "email_generated",
      detail: `Subject: "${draft.subjectLines[draft.selectedSubjectIndex]}"`,
      tier: draft.outreachTier,
      score: draft.confidenceScore,
    });

    if (draft.status === "sent" && draft.sentAt) {
      logs.push({
        id: `log-email-sent-${draft.id}`,
        timestamp: draft.sentAt,
        leadName: draft.leadName,
        leadId: draft.leadId,
        action: "email_sent",
        detail: draft.redirectedTo
          ? `Redirected to ${draft.redirectedTo} (PoC)`
          : `Sent to ${draft.intendedRecipient}`,
        tier: draft.outreachTier,
        score: draft.confidenceScore,
      });
    }

    if (draft.status === "failed") {
      logs.push({
        id: `log-email-failed-${draft.id}`,
        timestamp: draft.createdAt,
        leadName: draft.leadName,
        leadId: draft.leadId,
        action: "email_failed",
        detail: "Email delivery failed",
        tier: draft.outreachTier,
        score: draft.confidenceScore,
      });
    }
  }

  for (const notif of notifications) {
    if (notif.type === "hold_for_review") {
      logs.push({
        id: `log-review-${notif.id}`,
        timestamp: notif.createdAt,
        leadName: notif.title.replace("Review needed: ", ""),
        leadId: notif.leadId ?? "",
        action: "held_for_review",
        detail: notif.message,
      });
    }
  }

  logs.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return logs;
}
