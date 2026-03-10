import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/store";

export async function GET() {
  return NextResponse.json(getSettings());
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.pocMode === false) {
      return NextResponse.json(
        { error: "PoC mode cannot be disabled — this is a prototype. All emails must be redirected." },
        { status: 403 }
      );
    }

    if (typeof body.pocRedirectEmail === "string") {
      const email = body.pocRedirectEmail.trim();
      if (email && !isValidEmail(email)) {
        return NextResponse.json(
          { error: "Invalid redirect email address" },
          { status: 400 }
        );
      }
      updates.pocRedirectEmail = email;
    }

    if (body.pocMode === true) {
      const current = getSettings();
      const redirectEmail =
        (updates.pocRedirectEmail as string | undefined) ?? current.pocRedirectEmail;
      if (!redirectEmail || !isValidEmail(redirectEmail)) {
        return NextResponse.json(
          { error: "Cannot enable PoC mode without a valid redirect email" },
          { status: 400 }
        );
      }
      updates.pocMode = true;
    }

    const settings = updateSettings(updates);
    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
