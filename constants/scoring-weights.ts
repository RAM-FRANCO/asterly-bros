export interface ScoringWeight {
  key: string;
  label: string;
  points: number;
  description: string;
}

export const SCORING_WEIGHTS: ScoringWeight[] = [
  {
    key: "spritzNegroni",
    label: "Serves Spritz/Negroni",
    points: 30,
    description: "Menu includes Spritz, Negroni, or Aperol-based cocktails",
  },
  {
    key: "competitorAperitifs",
    label: "Stocks competitor aperitifs",
    points: 20,
    description:
      "Already stocks Campari, Aperol, or non-alc competitors (Lyre's, Seedlip, etc.)",
  },
  {
    key: "cocktailMenu",
    label: "Has cocktail menu",
    points: 15,
    description: "Venue has a dedicated cocktail or drinks menu",
  },
  {
    key: "priceLevel",
    label: "Premium price level",
    points: 15,
    description: "Google Places price level 3+ (premium positioning)",
  },
  {
    key: "barProgram",
    label: "Dedicated bar program",
    points: 10,
    description: "Has a dedicated bar team or cocktail program",
  },
  {
    key: "independent",
    label: "Independent venue",
    points: 10,
    description: "Not part of a chain — independent decision-making",
  },
  {
    key: "rating",
    label: "High Google rating",
    points: 5,
    description: "Google rating 4.0+ with 50+ reviews",
  },
  {
    key: "contactAvailable",
    label: "Contact info available",
    points: 5,
    description: "Email or direct contact found during enrichment",
  },
];

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 85,
  MEDIUM: 60,
} as const;

export type OutreachTier = "high" | "medium" | "low" | "skip";

export const OUTREACH_TIERS = {
  HIGH: { min: 85, label: "High priority", tier: "high" as OutreachTier },
  MEDIUM: { min: 60, label: "Worth a shot", tier: "medium" as OutreachTier },
  LOW: { min: 30, label: "Low priority", tier: "low" as OutreachTier },
  SKIP: { min: 0, label: "Not recommended", tier: "skip" as OutreachTier },
} as const;

export function getOutreachTier(score: number): OutreachTier {
  if (score >= OUTREACH_TIERS.HIGH.min) return "high";
  if (score >= OUTREACH_TIERS.MEDIUM.min) return "medium";
  if (score >= OUTREACH_TIERS.LOW.min) return "low";
  return "skip";
}

export function getOutreachTierLabel(tier: OutreachTier): string {
  switch (tier) {
    case "high": return OUTREACH_TIERS.HIGH.label;
    case "medium": return OUTREACH_TIERS.MEDIUM.label;
    case "low": return OUTREACH_TIERS.LOW.label;
    case "skip": return OUTREACH_TIERS.SKIP.label;
  }
}
