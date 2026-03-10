import type { Lead, ScoreBreakdown, ConfidenceLevel } from "@/types/lead";
import { CONFIDENCE_THRESHOLDS } from "@/constants/scoring-weights";
import { STANDARD_VENUE_TYPES } from "@/constants/venue-types";
import type { VenueCategory } from "@/constants/venue-types";

export function scoreLead(lead: Lead): {
  score: number;
  breakdown: ScoreBreakdown;
  confidenceLevel: ConfidenceLevel;
} {
  const enrichment = lead.enrichment;
  if (!enrichment) {
    return {
      score: 0,
      breakdown: emptyBreakdown(),
      confidenceLevel: "low",
    };
  }

  const cocktailMenu = enrichment.hasCocktailMenu ? 15 : 0;
  const competitorAperitifs = enrichment.competitorAperitifs.length > 0 ? 20 : 0;
  const priceLevel = (lead.priceLevel ?? 0) >= 3 ? 15 : 0;
  const barProgram = enrichment.hasBarProgram ? 10 : 0;
  const spritzNegroni = enrichment.servesSpritzOrNegroni ? 30 : 0;
  const rating =
    (lead.rating ?? 0) >= 4.0 && (lead.reviewCount ?? 0) >= 50 ? 5 : 0;
  const contactAvailable = enrichment.contactEmail ? 5 : 0;

  const isIndependent = !isChainVenue(lead.name);
  const independent = isIndependent ? 10 : 0;

  const total =
    cocktailMenu +
    competitorAperitifs +
    priceLevel +
    independent +
    barProgram +
    spritzNegroni +
    rating +
    contactAvailable;

  const breakdown: ScoreBreakdown = {
    cocktailMenu,
    competitorAperitifs,
    priceLevel,
    independent,
    barProgram,
    spritzNegroni,
    rating,
    contactAvailable,
    total,
  };

  const confidenceLevel = determineConfidence(total, enrichment.source, lead);

  return { score: total, breakdown, confidenceLevel };
}

function determineConfidence(
  score: number,
  source: string,
  lead: Lead
): ConfidenceLevel {
  const enrichment = lead.enrichment;
  if (!enrichment) return "low";

  const isComplete =
    enrichment.venueType !== "" &&
    enrichment.contactEmail !== undefined &&
    source === "website";

  const isStandardType = STANDARD_VENUE_TYPES.includes(
    enrichment.venueType as VenueCategory
  );

  if (score >= CONFIDENCE_THRESHOLDS.HIGH && isComplete && isStandardType) {
    return "high";
  }

  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return "medium";
  }

  return "low";
}

const CHAIN_KEYWORDS = [
  "wetherspoon",
  "nando",
  "wagamama",
  "pizza express",
  "prezzo",
  "zizzi",
  "slug and lettuce",
  "all bar one",
  "pitcher & piano",
  "revolution",
  "be at one",
  "brewdog",
];

function isChainVenue(name: string): boolean {
  const lower = name.toLowerCase();
  return CHAIN_KEYWORDS.some((chain) => lower.includes(chain));
}

function emptyBreakdown(): ScoreBreakdown {
  return {
    cocktailMenu: 0,
    competitorAperitifs: 0,
    priceLevel: 0,
    independent: 0,
    barProgram: 0,
    spritzNegroni: 0,
    rating: 0,
    contactAvailable: 0,
    total: 0,
  };
}
