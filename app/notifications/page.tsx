import type React from "react";
import { desc, eq } from "drizzle-orm";
import { IconTrash } from "@tabler/icons-react";
import { AppSidebar } from "@/app/dashboard-01/app-sidebar";
import { SiteHeader } from "@/app/dashboard-01/site-header";
import {
  clearAllNotificationsAction,
  deleteNotificationAction,
} from "@/app/notifications/actions";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireSession } from "@/lib/require-session";

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

type NotificationsPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const session = await requireSession();
  const query = (await searchParams) ?? {};

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, session.user.id));

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt));

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 60)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        user={{
          name: session.user.name ?? "User",
          email: session.user.email,
        }}
        variant="inset"
      />
      <SidebarInset>
        <SiteHeader
          title="Notifications"
          actions={
            <form action={clearAllNotificationsAction}>
              <button
                className="rounded-md border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                type="submit"
              >
                Clear all
              </button>
            </form>
          }
        />
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
          {query.success ? (
            <p className="rounded-lg border border-green-800 bg-green-950 px-4 py-3 text-sm text-green-400">
              {query.success}
            </p>
          ) : null}
          {query.error ? (
            <p className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
              {query.error}
            </p>
          ) : null}

          <section className="rounded-xl border p-3 sm:p-4">
            {rows.length === 0 ? (
              <p className="px-2 pb-2 text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              <div className="space-y-3">
                {rows.map((item, index) => (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3" key={item.id}>
                    <span className="hidden sm:inline-flex h-6 min-w-6 items-center justify-center rounded-full border text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <article className="w-full rounded-xl border px-3 py-2 sm:px-4 sm:py-2.5">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.title}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">{item.message}</p>
                        </div>
                        <p className="shrink-0 text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                      </div>
                    </article>
                    <form action={deleteNotificationAction}>
                      <input name="notificationId" type="hidden" value={item.id} />
                      <button
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-800 text-red-400 transition-colors hover:bg-red-950"
                        title="Delete notification"
                        type="submit"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
