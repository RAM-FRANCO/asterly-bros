import { NextResponse } from "next/server";
import { sendOutreachEmail } from "@/lib/email";
import type { EmailDraft } from "@/types/outreach";

export async function POST(request: Request) {
  try {
    const { draft, selectedSubjectIndex, fullBody, pocMode, pocRedirectEmail } =
      (await request.json()) as {
        draft: EmailDraft;
        selectedSubjectIndex?: number;
        fullBody?: string;
        pocMode: boolean;
        pocRedirectEmail: string;
      };

    if (!draft) {
      return NextResponse.json(
        { error: "Draft data is required" },
        { status: 400 }
      );
    }

    if (draft.status === "sent") {
      return NextResponse.json(
        { error: `Email to ${draft.leadName} has already been sent` },
        { status: 409 }
      );
    }

    const draftToSend = { ...draft };

    if (selectedSubjectIndex !== undefined) {
      draftToSend.selectedSubjectIndex = selectedSubjectIndex;
    }

    if (typeof fullBody === "string" && fullBody.trim().length > 0) {
      draftToSend.fullBody = fullBody;
    }

    const result = await sendOutreachEmail(draftToSend, {
      pocMode,
      redirectEmail: pocRedirectEmail,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        redirectedTo: result.redirectedTo,
        intendedRecipient: draftToSend.intendedRecipient,
        pocMode: !!result.redirectedTo,
        sentAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
