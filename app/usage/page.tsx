import type React from "react";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { AppSidebar } from "@/app/dashboard-01/app-sidebar";
import { SiteHeader } from "@/app/dashboard-01/site-header";
import { UsageAnalytics } from "@/app/usage/usage-analytics";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { db } from "@/db";
import {
  groupMembers,
  groupSubscriptionSplits,
  groupSubscriptions,
  groups,
  subscriptions,
  usageLogs,
  user,
} from "@/db/schema";
import { normalizeMonitorServiceName } from "@/lib/monitor-services";
import { requireSession } from "@/lib/require-session";

function toDateKey(value: Date | string) {
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

function buildDateRange(days: number) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));

  const keys: string[] = [];
  for (let i = 0; i < days; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    keys.push(current.toISOString().slice(0, 10));
  }

  return {
    startDate: keys[0],
    keys,
  };
}

export default async function UsagePage() {
  const session = await requireSession();
  const { startDate, keys } = buildDateRange(30);

  const [activeSubscriptions, inactiveSubscriptions] = await Promise.all([
    db
      .select({
        id: subscriptions.id,
        serviceName: subscriptions.serviceName,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, session.user.id),
          eq(subscriptions.status, "ACTIVE"),
        ),
      ),
    db
      .select({
        id: subscriptions.id,
        serviceName: subscriptions.serviceName,
        status: subscriptions.status,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, session.user.id),
          ne(subscriptions.status, "ACTIVE"),
        ),
      ),
  ]);

  const activeServices = Array.from(
    new Set(
      activeSubscriptions
        .map((sub) => normalizeMonitorServiceName(sub.serviceName))
        .filter((name): name is NonNullable<typeof name> => Boolean(name)),
    ),
  );

  const usageRows =
    activeServices.length === 0
      ? []
      : await db
          .select({
            date: usageLogs.date,
            serviceName: usageLogs.serviceName,
            focusedMinutes: usageLogs.focusedMinutes,
          })
          .from(usageLogs)
          .where(
            and(
              eq(usageLogs.userId, session.user.id),
              sql`${usageLogs.date} >= ${startDate}::date`,
              inArray(usageLogs.serviceName, activeServices),
            ),
          );

  const dailyMap = new Map<string, number>();
  const serviceMap = new Map<string, number>();

  keys.forEach((key) => dailyMap.set(key, 0));

  let monthMinutes = 0;
  usageRows.forEach((row) => {
    const dateKey = toDateKey(row.date);
    const currentDaily = dailyMap.get(dateKey) ?? 0;
    dailyMap.set(dateKey, currentDaily + row.focusedMinutes);

    const currentService = serviceMap.get(row.serviceName) ?? 0;
    serviceMap.set(row.serviceName, currentService + row.focusedMinutes);

    monthMinutes += row.focusedMinutes;
  });

  const dailyData = Array.from(dailyMap.entries()).map(([date, minutes]) => ({
    date,
    minutes,
  }));

  const serviceData = Array.from(serviceMap.entries())
    .map(([serviceName, minutes]) => ({
      serviceName,
      minutes,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  const activeSubscriptionIds = activeSubscriptions.map((sub) => sub.id);
  const groupSubRows =
    activeSubscriptionIds.length === 0
      ? []
      : await db
          .select({
            groupSubscriptionId: groupSubscriptions.id,
            subscriptionId: groupSubscriptions.subscriptionId,
            groupId: groupSubscriptions.groupId,
            groupName: groups.name,
          })
          .from(groupSubscriptions)
          .innerJoin(groups, eq(groups.id, groupSubscriptions.groupId))
          .where(
            and(
              inArray(groupSubscriptions.subscriptionId, activeSubscriptionIds),
              sql`${groupSubscriptions.subscriptionId} is not null`,
              sql`${groupSubscriptions.deletedAt} is null`,
            ),
          );

  const groupSubIds = groupSubRows.map((row) => row.groupSubscriptionId);
  const groupMemberRows =
    groupSubIds.length === 0
      ? []
      : await db
          .select({
            groupSubscriptionId: groupSubscriptionSplits.groupSubscriptionId,
            userId: groupSubscriptionSplits.userId,
            name: user.name,
            email: user.email,
          })
          .from(groupSubscriptionSplits)
          .innerJoin(
            groupSubscriptions,
            eq(groupSubscriptions.id, groupSubscriptionSplits.groupSubscriptionId),
          )
          .innerJoin(
            groupMembers,
            and(
              eq(groupMembers.groupId, groupSubscriptions.groupId),
              eq(groupMembers.userId, groupSubscriptionSplits.userId),
            ),
          )
          .innerJoin(user, eq(user.id, groupSubscriptionSplits.userId))
          .where(
            and(
              inArray(groupSubscriptionSplits.groupSubscriptionId, groupSubIds),
              eq(groupSubscriptionSplits.paymentStatus, "PAID"),
            ),
          );

  const groupMemberIds = Array.from(new Set(groupMemberRows.map((row) => row.userId)));
  const groupServiceNames = Array.from(
    new Set(
      groupSubRows
        .map((row) => {
          const sub = activeSubscriptions.find((item) => item.id === row.subscriptionId);
          return sub ? normalizeMonitorServiceName(sub.serviceName) : null;
        })
        .filter(
          (name): name is NonNullable<ReturnType<typeof normalizeMonitorServiceName>> =>
            Boolean(name),
        ),
    ),
  );

  const groupUsageRows =
    groupMemberIds.length === 0 || groupServiceNames.length === 0
      ? []
      : await db
          .select({
            userId: usageLogs.userId,
            serviceName: usageLogs.serviceName,
            totalMinutes: sql<number>`sum(${usageLogs.focusedMinutes})::int`,
          })
          .from(usageLogs)
          .where(
            and(
              inArray(usageLogs.userId, groupMemberIds),
              sql`${usageLogs.date} >= ${startDate}::date`,
              inArray(usageLogs.serviceName, groupServiceNames),
            ),
          )
          .groupBy(usageLogs.userId, usageLogs.serviceName);

  const usageByMemberAndService = new Map(
    groupUsageRows.map((row) => [`${row.userId}::${row.serviceName}`, row.totalMinutes]),
  );

  const membersByGroupSubId = new Map<
    string,
    Array<{ userId: string; name: string | null; email: string }>
  >();
  for (const row of groupMemberRows) {
    const list = membersByGroupSubId.get(row.groupSubscriptionId) ?? [];
    list.push({ userId: row.userId, name: row.name, email: row.email });
    membersByGroupSubId.set(row.groupSubscriptionId, list);
  }

  const groupUsageData = groupSubRows
    .map((groupRow) => {
      const sub = activeSubscriptions.find((item) => item.id === groupRow.subscriptionId);
      if (!sub) return null;
      const normalizedName = normalizeMonitorServiceName(sub.serviceName);
      if (!normalizedName) return null;

      const members = (membersByGroupSubId.get(groupRow.groupSubscriptionId) ?? [])
        .map((member) => ({
          userId: member.userId,
          name: member.name ?? "User",
          email: member.email,
          minutes:
            usageByMemberAndService.get(`${member.userId}::${normalizedName}`) ?? 0,
        }))
        .sort((a, b) => b.minutes - a.minutes);

      return {
        groupSubscriptionId: groupRow.groupSubscriptionId,
        groupName: groupRow.groupName,
        serviceName: sub.serviceName,
        totalMinutes: members.reduce((sum, member) => sum + member.minutes, 0),
        members,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

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
        <SiteHeader title="Usage" />
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
          <UsageAnalytics
            dailyData={dailyData}
            serviceData={serviceData}
            monthMinutes={monthMinutes}
            activeServiceCount={activeServices.length}
            inactiveSubscriptions={inactiveSubscriptions}
            groupUsageData={groupUsageData}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
