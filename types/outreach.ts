export interface EmailDraft {
  id: string;
  leadId: string;
  leadName: string;
  intendedRecipient: string;
  subjectLines: string[];
  selectedSubjectIndex: number;
  hook: string;
  bridge: string;
  offer: string;
  close: string;
  fullBody: string;
  status: EmailStatus;
  confidenceScore: number;
  holdReasons: string[];
  createdAt: string;
  sentAt?: string;
  redirectedTo?: string;
}

export type EmailStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "sent"
  | "failed"
  | "bounced";

export interface BrandVoiceConfig {
  brandName: string;
  tone: string;
  personality: string;
  keySellingPoints: string[];
  avoidWords: string[];
  offerTemplate: string;
  closeTemplate: string;
  signatureName: string;
  signatureTitle: string;
}

