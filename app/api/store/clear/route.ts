import { NextResponse } from "next/server";
import { clearAllData } from "@/lib/store";

export async function DELETE() {
  try {
    clearAllData();
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to clear data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
