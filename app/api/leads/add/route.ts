import { NextResponse } from "next/server";
import { upsertLead, getLead, findLeadByName } from "@/lib/store";
import type { Lead } from "@/types/lead";

export async function POST(request: Request) {
  try {
    const { name, address, area, phone, website, contactEmail, notes, status } =
      await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Venue name is required" },
        { status: 400 }
      );
    }

    if (name.length > 300) {
      return NextResponse.json(
        { error: "Venue name is too long" },
        { status: 400 }
      );
    }

    const placeId = `manual-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

    const existingByName = findLeadByName(name);
    if (existingByName) {
      return NextResponse.json(
        {
          error: `A lead named "${existingByName.name}" already exists`,
          existingLead: existingByName,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    const lead: Lead = {
      placeId,
      name: name.trim(),
      address: address?.trim() ?? "",
      area: area?.trim() ?? "Manual",
      phone: phone?.trim() || undefined,
      website: website?.trim() || undefined,
      contactEmail: contactEmail?.trim() || undefined,
      notes: notes?.trim() || undefined,
      types: [],
      status: status ?? "new",
      confidenceLevel: "low",
      source: "manual",
      createdAt: now,
      updatedAt: now,
    };

    upsertLead(lead);

    return NextResponse.json({ lead, created: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add lead";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
