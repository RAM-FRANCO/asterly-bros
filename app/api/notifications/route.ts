import { NextResponse } from "next/server";
import {
  getAllNotifications,
  getUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/store";

export async function GET() {
  const notifications = getAllNotifications();
  const unreadCount = getUnreadNotifications().length;

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  try {
    const { notificationId, markAll } = await request.json();

    if (markAll) {
      markAllNotificationsRead();
      return NextResponse.json({ success: true });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: "notificationId is required" },
        { status: 400 }
      );
    }

    markNotificationRead(notificationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
