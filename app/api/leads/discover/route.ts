import { NextResponse } from "next/server";
import { searchVenues } from "@/lib/google-places";
import { upsertLead, getLead, findLeadByName } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const { area, venueType, limit, isLondon } = await request.json();

    if (!area || typeof area !== "string") {
      return NextResponse.json(
        { error: "Area is required" },
        { status: 400 }
      );
    }

    if (area.length > 200) {
      return NextResponse.json(
        { error: "Area name is too long" },
        { status: 400 }
      );
    }

    const venues = await searchVenues(area, venueType ?? "bar", limit ?? 3, isLondon ?? true);

    let newCount = 0;
    for (const venue of venues) {
      const existingById = getLead(venue.placeId);
      const existingByName = findLeadByName(venue.name);
      if (!existingById && !existingByName) {
        upsertLead(venue);
        newCount++;
      }
    }

    return NextResponse.json({
      totalFound: venues.length,
      newLeads: newCount,
      area,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discovery failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
