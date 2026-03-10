import { NextResponse } from "next/server";
import { getAllLeads, getLead, upsertLead, getStats } from "@/lib/store";
import type { LeadStatus } from "@/types/lead";

export async function GET() {
  const leads = getAllLeads();
  const stats = getStats();

  const pipeline = leads
    .filter((l) => l.status !== "new")
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map((l) => ({
      leadId: l.placeId,
      leadName: l.name,
      area: l.area,
      score: l.score ?? 0,
      status: l.status,
      confidenceLevel: l.confidenceLevel,
      updatedAt: l.updatedAt,
    }));

  return NextResponse.json({ pipeline, stats });
}

export async function PATCH(request: Request) {
  try {
    const { leadId, status, notes } = await request.json();

    if (!leadId || !status) {
      return NextResponse.json(
        { error: "leadId and status are required" },
        { status: 400 }
      );
    }

    const lead = getLead(leadId);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    lead.status = status as LeadStatus;
    upsertLead(lead);

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
