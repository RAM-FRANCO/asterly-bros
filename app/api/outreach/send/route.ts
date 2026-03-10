import { NextResponse } from "next/server";
import { getEmailDraft, upsertEmailDraft, getLead, upsertLead, addNotification } from "@/lib/store";
import { sendOutreachEmail } from "@/lib/email";
import type { Notification } from "@/types/pipeline";

export async function POST(request: Request) {
  try {
    const { emailId, selectedSubjectIndex } = await request.json();

    if (!emailId) {
      return NextResponse.json(
        { error: "emailId is required" },
        { status: 400 }
      );
    }

    const draft = getEmailDraft(emailId);
    if (!draft) {
      return NextResponse.json(
        { error: "Email draft not found" },
        { status: 404 }
      );
    }

    if (draft.status === "sent") {
      return NextResponse.json(
        { error: `Email to ${draft.leadName} has already been sent` },
        { status: 409 }
      );
    }

    if (selectedSubjectIndex !== undefined) {
      draft.selectedSubjectIndex = selectedSubjectIndex;
    }

    const result = await sendOutreachEmail(draft);

    if (result.success) {
      draft.status = "sent";
      draft.sentAt = new Date().toISOString();
      draft.redirectedTo = result.redirectedTo;
      upsertEmailDraft(draft);

      const lead = getLead(draft.leadId);
      if (lead) {
        lead.status = "emailed";
        upsertLead(lead);
      }

      const notification: Notification = {
        id: `notif-${Date.now()}`,
        type: "email_sent",
        title: `Email sent to ${draft.leadName}`,
        message: result.redirectedTo
          ? `Redirected to ${result.redirectedTo} (PoC mode)`
          : `Sent to ${draft.intendedRecipient}`,
        leadId: draft.leadId,
        read: false,
        createdAt: new Date().toISOString(),
      };
      addNotification(notification);

      return NextResponse.json({
        success: true,
        redirectedTo: result.redirectedTo,
        intendedRecipient: draft.intendedRecipient,
        pocMode: !!result.redirectedTo,
      });
    }

    draft.status = "failed";
    upsertEmailDraft(draft);

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
