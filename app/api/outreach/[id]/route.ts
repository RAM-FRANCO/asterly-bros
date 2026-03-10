import { NextResponse } from "next/server";
import { getEmailDraft, upsertEmailDraft } from "@/lib/store";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const draft = getEmailDraft(id);
    if (!draft) {
      return NextResponse.json(
        { error: "Email draft not found" },
        { status: 404 }
      );
    }

    if (draft.status !== "pending_review") {
      return NextResponse.json(
        { error: "Only pending review drafts can be edited" },
        { status: 403 }
      );
    }

    if (typeof body.fullBody === "string") {
      draft.fullBody = body.fullBody;
    }

    upsertEmailDraft(draft);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
