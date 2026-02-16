"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireSession } from "@/lib/require-session";

function redirectToNotifications(params: Record<string, string | undefined>): never {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  redirect(`/notifications?${query.toString()}`);
}

export async function deleteNotificationAction(formData: FormData) {
  const session = await requireSession();
  const notificationIdRaw = formData.get("notificationId");
  const notificationId =
    typeof notificationIdRaw === "string" ? notificationIdRaw.trim() : "";

  if (!notificationId) {
    redirectToNotifications({ error: "Invalid notification" });
  }

  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, session.user.id),
      ),
    );

  redirectToNotifications({ success: "Notification deleted" });
}

export async function clearAllNotificationsAction() {
  const session = await requireSession();

  await db.delete(notifications).where(eq(notifications.userId, session.user.id));

  redirectToNotifications({ success: "All notifications cleared" });
}
