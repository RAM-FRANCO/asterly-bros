import { NextResponse } from "next/server";
import { enrichVenue } from "@/lib/enrichment";
import { scoreLead } from "@/lib/scoring";
import { getLead, upsertLead } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const { placeId } = await request.json();

    if (!placeId) {
      return NextResponse.json(
        { error: "placeId is required" },
        { status: 400 }
      );
    }

    const lead = getLead(placeId);
    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    const enrichment = await enrichVenue(
      lead.website,
      lead.name,
      lead.types,
      lead.rating,
      lead.reviewCount
    );

    lead.enrichment = enrichment;
    lead.status = "enriched";

    const { score, breakdown, confidenceLevel } = scoreLead(lead);
    lead.score = score;
    lead.scoreBreakdown = breakdown;
    lead.confidenceLevel = confidenceLevel;
    lead.status = "scored";

    upsertLead(lead);

    return NextResponse.json({
      lead,
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
