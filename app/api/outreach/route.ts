import { NextRequest, NextResponse } from "next/server";
import { getAllEmailDrafts, getEmailDraftByLead } from "@/lib/store";

export async function GET(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get("leadId");

  if (leadId) {
    const draft = getEmailDraftByLead(leadId);
    return NextResponse.json({ draft: draft ?? null });
  }

  const drafts = getAllEmailDrafts().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ drafts, total: drafts.length });
}
