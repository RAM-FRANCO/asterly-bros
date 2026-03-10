import fs from "node:fs";
import path from "node:path";
import type { Lead } from "@/types/lead";
import type { EmailDraft } from "@/types/outreach";
import type { Notification } from "@/types/pipeline";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

export interface AppSettings {
  pocMode: boolean;
  pocRedirectEmail: string;
}

interface InMemoryStore {
  leads: Map<string, Lead>;
  emailDrafts: Map<string, EmailDraft>;
  notifications: Notification[];
  settings: AppSettings;
}

interface StoreData {
  leads: Record<string, Lead>;
  emailDrafts: Record<string, EmailDraft>;
  notifications: Notification[];
  settings: AppSettings;
}

function defaultSettings(): AppSettings {
  return {
    pocMode: process.env.POC_MODE === "true",
    pocRedirectEmail: process.env.POC_REDIRECT_EMAIL ?? "",
  };
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
  return { leads: {}, emailDrafts: {}, notifications: [], settings: defaultSettings() };
}

const globalRef = globalThis as unknown as { __asterleyStore?: InMemoryStore };

function getStore(): InMemoryStore {
  if (!globalRef.__asterleyStore) {
    const stored = loadFromDisk();
    globalRef.__asterleyStore = {
      leads: new Map(Object.entries(stored.leads)),
      emailDrafts: new Map(Object.entries(stored.emailDrafts)),
      notifications: [...stored.notifications],
      settings: stored.settings ?? defaultSettings(),
    };
  }
  return globalRef.__asterleyStore;
}

function saveToDisk(): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const store = getStore();
    const data: StoreData = {
      leads: Object.fromEntries(store.leads),
      emailDrafts: Object.fromEntries(store.emailDrafts),
      notifications: store.notifications,
      settings: store.settings,
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save store to disk:", err);
  }
}

// --- Leads ---

export function getAllLeads(): Lead[] {
  return Array.from(getStore().leads.values());
}

export function getLead(placeId: string): Lead | undefined {
  return getStore().leads.get(placeId);
}

export function upsertLead(lead: Lead): void {
  getStore().leads.set(lead.placeId, { ...lead, updatedAt: new Date().toISOString() });
  saveToDisk();
}

export function getLeadsByStatus(status: Lead["status"]): Lead[] {
  return Array.from(getStore().leads.values()).filter((l) => l.status === status);
}

export function getLeadsByArea(area: string): Lead[] {
  return Array.from(getStore().leads.values()).filter(
    (l) => l.area.toLowerCase() === area.toLowerCase()
  );
}

export function findLeadByName(name: string): Lead | undefined {
  const normalized = name.toLowerCase().trim();
  return Array.from(getStore().leads.values()).find(
    (l) => l.name.toLowerCase().trim() === normalized
  );
}

// --- Email Drafts ---

export function getAllEmailDrafts(): EmailDraft[] {
  return Array.from(getStore().emailDrafts.values());
}

export function getEmailDraft(id: string): EmailDraft | undefined {
  return getStore().emailDrafts.get(id);
}

export function getEmailDraftByLead(leadId: string): EmailDraft | undefined {
  return Array.from(getStore().emailDrafts.values()).find((d) => d.leadId === leadId);
}

export function upsertEmailDraft(draft: EmailDraft): void {
  getStore().emailDrafts.set(draft.id, draft);
  saveToDisk();
}

// --- Notifications ---

export function getAllNotifications(): Notification[] {
  return [...getStore().notifications].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getUnreadNotifications(): Notification[] {
  return getStore().notifications.filter((n) => !n.read);
}

export function addNotification(notification: Notification): void {
  getStore().notifications.push(notification);
  saveToDisk();
}

export function markNotificationRead(id: string): void {
  const n = getStore().notifications.find((n) => n.id === id);
  if (n) {
    n.read = true;
    saveToDisk();
  }
}

export function markNotificationsReadByLeadAndType(
  leadId: string,
  type: Notification["type"]
): void {
  for (const n of getStore().notifications) {
    if (n.leadId === leadId && n.type === type && !n.read) {
      n.read = true;
    }
  }
  saveToDisk();
}

export function getPendingReviewCount(): number {
  return getStore().notifications.filter(
    (n) => n.type === "hold_for_review" && !n.read
  ).length;
}

export function markAllNotificationsRead(): void {
  for (const n of getStore().notifications) {
    n.read = true;
  }
  saveToDisk();
}

// --- Settings ---

export function getSettings(): AppSettings {
  return { ...getStore().settings };
}

export function updateSettings(updates: Partial<AppSettings>): AppSettings {
  Object.assign(getStore().settings, updates);
  saveToDisk();
  return { ...getStore().settings };
}

// --- Clear All ---

export function clearAllData(): void {
  const store = getStore();
  store.leads.clear();
  store.emailDrafts.clear();
  store.notifications.length = 0;
  saveToDisk();
}

// --- Stats ---

export function getStats() {
  const allLeads = Array.from(getStore().leads.values());
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
