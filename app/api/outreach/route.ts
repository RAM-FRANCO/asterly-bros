import { NextResponse } from "next/server";
import { getAllEmailDrafts } from "@/lib/store";

export async function GET() {
  const drafts = getAllEmailDrafts().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ drafts, total: drafts.length });
}
