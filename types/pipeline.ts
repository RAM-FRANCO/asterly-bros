import type { LeadStatus } from "./lead";

export interface PipelineEntry {
  leadId: string;
  leadName: string;
  area: string;
  score: number;
  status: LeadStatus;
  updatedAt: string;
}

export interface PipelineStats {
  total: number;
  avgScore: number;
  conversionRate: number;
  needsReview: number;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  leadId?: string;
  read: boolean;
  createdAt: string;
}

export type NotificationType =
  | "hold_for_review"
  | "email_sent"
  | "email_failed"
  | "lead_replied"
  | "follow_up_due"
  | "system";
