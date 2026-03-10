export type LeadSource = "google_places" | "manual" | "csv_import";

export interface Lead {
  placeId: string;
  name: string;
  address: string;
  area: string;
  phone?: string;
  website?: string;
  googleMapsUrl?: string;
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  types: string[];
  enrichment?: EnrichmentData;
  score?: number;
  scoreBreakdown?: ScoreBreakdown;
  status: LeadStatus;
  confidenceLevel: ConfidenceLevel;
  source: LeadSource;
  notes?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnrichmentData {
  venueType: string;
  venueSubType?: string;
  hasCocktailMenu: boolean;
  hasBarProgram: boolean;
  servesSpritzOrNegroni: boolean;
  existingBrands: string[];
  competitorAperitifs: string[];
  vibe: string;
  contactEmail?: string;
  contactName?: string;
  socialMedia?: SocialMedia;
  keyMenuItems: string[];
  summary: string;
  source: "website" | "google_places" | "partial";
  scrapedAt: string;
}

export interface SocialMedia {
  instagram?: string;
  facebook?: string;
  twitter?: string;
}

export interface ScoreBreakdown {
  cocktailMenu: number;
  competitorAperitifs: number;
  priceLevel: number;
  independent: number;
  barProgram: number;
  spritzNegroni: number;
  rating: number;
  contactAvailable: number;
  total: number;
}

export type LeadStatus =
  | "new"
  | "enriched"
  | "scored"
  | "email_drafted"
  | "email_approved"
  | "emailed"
  | "follow_up_1"
  | "follow_up_2"
  | "replied"
  | "meeting"
  | "won"
  | "lost"
  | "archived";

export type ConfidenceLevel = "high" | "medium" | "low";

