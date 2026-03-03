import type React from "react";
import { and, desc, eq, inArray } from "drizzle-orm";
import { GroupsBuilder } from "@/app/groups/_components/groups-builder";
import { AppSidebar } from "@/app/dashboard-01/app-sidebar";
import { SiteHeader } from "@/app/dashboard-01/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { db } from "@/db";
import { groupSubscriptions, subscriptions } from "@/db/schema";
import { requireSession } from "@/lib/require-session";

type GroupsPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function GroupsPage({ searchParams }: GroupsPageProps) {
  const session = await requireSession();
  const query = (await searchParams) ?? {};

  const activePlans = await db
    .select({
      id: subscriptions.id,
      serviceName: subscriptions.serviceName,
      serviceKey: subscriptions.serviceKey,
      planName: subscriptions.planName,
      planDurationMonths: subscriptions.planDurationMonths,
      planMembers: subscriptions.planMembers,
      monthlyCost: subscriptions.monthlyCost,
      externalAccountEmail: subscriptions.externalAccountEmail,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, session.user.id),
        eq(subscriptions.status, "ACTIVE"),
      ),
    )
    .orderBy(desc(subscriptions.createdAt));

  const usedRows =
    activePlans.length === 0
      ? []
      : await db
          .select({ subscriptionId: groupSubscriptions.subscriptionId })
          .from(groupSubscriptions)
          .where(
            and(
              inArray(
                groupSubscriptions.subscriptionId,
                activePlans.map((plan) => plan.id),
              ),
              eq(groupSubscriptions.status, "ACTIVE"),
            ),
          );

  const usedIdSet = new Set(usedRows.map((row) => row.subscriptionId).filter(Boolean));
  const availablePlans = activePlans.filter((plan) => !usedIdSet.has(plan.id));

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
        <SiteHeader title="Create Groups" />
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
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
          <GroupsBuilder
            ownerName={session.user.name ?? "User"}
            plans={availablePlans}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
