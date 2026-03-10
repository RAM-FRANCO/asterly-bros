import { NextResponse } from "next/server";
import { getAllLeads, getLeadsByArea } from "@/lib/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const area = searchParams.get("area");

  const leads = area ? getLeadsByArea(area) : getAllLeads();

  const sorted = leads.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return NextResponse.json({ leads: sorted, total: sorted.length });
}
