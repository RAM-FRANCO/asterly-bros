import { NextResponse } from "next/server";
import { searchVenues } from "@/lib/google-places";

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

    return NextResponse.json({ venues, area });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discovery failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
