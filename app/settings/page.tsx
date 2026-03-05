import type React from "react";
import { eq } from "drizzle-orm";
import { AppSidebar } from "@/app/dashboard-01/app-sidebar";
import { SiteHeader } from "@/app/dashboard-01/site-header";
import { db } from "@/db";
import { account, session as sessionTable, user } from "@/db/schema";
import { requireSession } from "@/lib/require-session";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ProfileSettingsCard } from "@/app/settings/profile-settings-card";

export default async function SettingsPage() {
  const session = await requireSession();

  const [dbUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  const linkedAccounts = await db
    .select()
    .from(account)
    .where(eq(account.userId, session.user.id));

  const activeSessions = await db
    .select()
    .from(sessionTable)
    .where(eq(sessionTable.userId, session.user.id));

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
          image: session.user.image ?? null,
        }}
        variant="inset"
      />
      <SidebarInset>
        <SiteHeader title="Settings" />
        <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
          <ProfileSettingsCard
            name={dbUser?.name || session.user.name || "User"}
            email={dbUser?.email || session.user.email}
            image={dbUser?.image || session.user.image || null}
          />

          <section className="rounded-xl border p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">Linked Accounts</h2>
            {linkedAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No linked accounts.</p>
            ) : (
              <ul className="space-y-2">
                {linkedAccounts.map((linkedAccount) => (
                  <li className="rounded-lg border p-3" key={linkedAccount.id}>
                    <p className="font-medium">{linkedAccount.providerId}</p>
                    <p className="text-sm break-all text-muted-foreground">
                      Account ID: {linkedAccount.accountId}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">Active Sessions</h2>
            <p className="text-sm text-muted-foreground">
              Total sessions: {activeSessions.length}
            </p>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}


