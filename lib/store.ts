import fs from "node:fs";
import path from "node:path";
import type { Lead } from "@/types/lead";
import type { EmailDraft } from "@/types/outreach";
import type { Notification } from "@/types/pipeline";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

interface StoreData {
  leads: Record<string, Lead>;
  emailDrafts: Record<string, EmailDraft>;
  notifications: Notification[];
}

function emptyStore(): StoreData {
  return { leads: {}, emailDrafts: {}, notifications: [] };
}

function loadFromDisk(): StoreData {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      return JSON.parse(raw) as StoreData;
    }
  } catch {
    console.warn("Failed to load store from disk, starting fresh");
  }
  return emptyStore();
}

function saveToDisk(): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data: StoreData = {
      leads: Object.fromEntries(leads),
      emailDrafts: Object.fromEntries(emailDrafts),
      notifications,
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save store to disk:", err);
  }
}

const stored = loadFromDisk();
const leads: Map<string, Lead> = new Map(Object.entries(stored.leads));
const emailDrafts: Map<string, EmailDraft> = new Map(
  Object.entries(stored.emailDrafts)
);
const notifications: Notification[] = [...stored.notifications];

// --- Leads ---

export function getAllLeads(): Lead[] {
  return Array.from(leads.values());
}

export function getLead(placeId: string): Lead | undefined {
  return leads.get(placeId);
}

export function upsertLead(lead: Lead): void {
  leads.set(lead.placeId, { ...lead, updatedAt: new Date().toISOString() });
  saveToDisk();
}

export function getLeadsByStatus(status: Lead["status"]): Lead[] {
  return Array.from(leads.values()).filter((l) => l.status === status);
}

export function getLeadsByArea(area: string): Lead[] {
  return Array.from(leads.values()).filter(
    (l) => l.area.toLowerCase() === area.toLowerCase()
  );
}

export function findLeadByName(name: string): Lead | undefined {
  const normalized = name.toLowerCase().trim();
  return Array.from(leads.values()).find(
    (l) => l.name.toLowerCase().trim() === normalized
  );
}

// --- Email Drafts ---

export function getAllEmailDrafts(): EmailDraft[] {
  return Array.from(emailDrafts.values());
}

export function getEmailDraft(id: string): EmailDraft | undefined {
  return emailDrafts.get(id);
}

export function getEmailDraftByLead(leadId: string): EmailDraft | undefined {
  return Array.from(emailDrafts.values()).find((d) => d.leadId === leadId);
}

export function upsertEmailDraft(draft: EmailDraft): void {
  emailDrafts.set(draft.id, draft);
  saveToDisk();
}

// --- Notifications ---

export function getAllNotifications(): Notification[] {
  return [...notifications].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getUnreadNotifications(): Notification[] {
  return notifications.filter((n) => !n.read);
}

export function addNotification(notification: Notification): void {
  notifications.push(notification);
  saveToDisk();
}

export function markNotificationRead(id: string): void {
  const n = notifications.find((n) => n.id === id);
  if (n) {
    n.read = true;
    saveToDisk();
  }
}

export function markAllNotificationsRead(): void {
  for (const n of notifications) {
    n.read = true;
  }
  saveToDisk();
}

// --- Clear All ---

export function clearAllData(): void {
  leads.clear();
  emailDrafts.clear();
  notifications.length = 0;
  saveToDisk();
}

// --- Stats ---

export function getStats() {
  const allLeads = Array.from(leads.values());
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
