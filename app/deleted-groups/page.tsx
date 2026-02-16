import type React from "react";
import { GroupCard } from "@/app/groups/_components/group-card";
import {
  getDeletedGroupCards,
  processPendingGroupDeletionRequests,
  processPendingMemberRemovalRequests,
} from "@/app/groups/group-queries";
import { AppSidebar } from "@/app/dashboard-01/app-sidebar";
import { SiteHeader } from "@/app/dashboard-01/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireSession } from "@/lib/require-session";

export default async function DeletedGroupsPage() {
  const session = await requireSession();
  await Promise.all([
    processPendingGroupDeletionRequests(session.user.id),
    processPendingMemberRemovalRequests(session.user.id),
  ]);
  const deletedCards = await getDeletedGroupCards(session.user.id);

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
        <SiteHeader title="Deleted Groups" />
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-8">
          {deletedCards.length === 0 ? (
            <section className="rounded-xl border p-6">
              <p className="text-sm text-muted-foreground">No deleted groups.</p>
            </section>
          ) : (
            deletedCards.map((card) => (
              <GroupCard
                card={card}
                deletedView
                key={card.groupSubscriptionId}
                showCredentials={card.viewerRole === "OWNER"}
              />
            ))
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
