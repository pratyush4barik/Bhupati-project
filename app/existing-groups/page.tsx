import type React from "react";
import { GroupCard } from "@/app/groups/_components/group-card";
import {
  getMemberExistingGroupCards,
  getOwnerExistingGroupCards,
  processPendingGroupDeletionRequests,
  processPendingMemberRemovalRequests,
  processRejectedGroupRequestMembers,
} from "@/app/groups/group-queries";
import { AppSidebar } from "@/app/dashboard-01/app-sidebar";
import { SiteHeader } from "@/app/dashboard-01/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireSession } from "@/lib/require-session";

type ExistingGroupsPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function ExistingGroupsPage({ searchParams }: ExistingGroupsPageProps) {
  const session = await requireSession();
  const query = (await searchParams) ?? {};
  await Promise.all([
    processPendingGroupDeletionRequests(session.user.id),
    processPendingMemberRemovalRequests(session.user.id),
    processRejectedGroupRequestMembers(session.user.id),
  ]);
  const [ownerCards, memberCards] = await Promise.all([
    getOwnerExistingGroupCards(session.user.id),
    getMemberExistingGroupCards(session.user.id),
  ]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
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
        <SiteHeader title="Existing Groups" />
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-8">
          {query.success ? (
            <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {query.success}
            </p>
          ) : null}
          {query.error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {query.error}
            </p>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Owner groups</h2>
            {ownerCards.length === 0 ? (
              <div className="rounded-xl border p-6">
                <p className="text-sm text-muted-foreground">
                  No groups created by you yet.
                </p>
              </div>
            ) : (
              ownerCards.map((card) => (
                <GroupCard card={card} key={card.groupSubscriptionId} showCredentials />
              ))
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Joined groups</h2>
            {memberCards.length === 0 ? (
              <div className="rounded-xl border p-6">
                <p className="text-sm text-muted-foreground">No paid member groups yet.</p>
              </div>
            ) : (
              memberCards.map((card) => (
                <GroupCard card={card} key={card.groupSubscriptionId} showCredentials />
              ))
            )}
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
