import { NextResponse } from "next/server";
import { enrichVenue } from "@/lib/enrichment";
import { scoreLead } from "@/lib/scoring";
import type { Lead } from "@/types/lead";

export async function POST(request: Request) {
  try {
    const { lead } = (await request.json()) as { lead: Lead };

    if (!lead?.placeId) {
      return NextResponse.json(
        { error: "Lead data is required" },
        { status: 400 }
      );
    }

    const enrichment = await enrichVenue(
      lead.website,
      lead.name,
      lead.types,
      lead.rating,
      lead.reviewCount
    );

    const enrichedLead: Lead = {
      ...lead,
      enrichment,
      status: "enriched",
    };

    const { score, breakdown, confidenceLevel } = scoreLead(enrichedLead);
    enrichedLead.score = score;
    enrichedLead.scoreBreakdown = breakdown;
    enrichedLead.confidenceLevel = confidenceLevel;
    enrichedLead.status = "scored";

    return NextResponse.json({
      lead: enrichedLead,
      enrichment,
      score,
      scoreBreakdown: breakdown,
      confidenceLevel,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Enrichment failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
