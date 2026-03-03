import type React from "react";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { AppSidebar } from "@/app/dashboard-01/app-sidebar";
import { SiteHeader } from "@/app/dashboard-01/site-header";
import { UsageAnalytics } from "@/app/usage/usage-analytics";
import { db } from "@/db";
import { subscriptions, usageLogs } from "@/db/schema";
import { normalizeMonitorServiceName } from "@/lib/monitor-services";
import { requireSession } from "@/lib/require-session";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

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
        <SiteHeader title="Usage" />
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-8">
          <UsageAnalytics
            dailyData={dailyData}
            serviceData={serviceData}
            monthMinutes={monthMinutes}
            activeServiceCount={activeServices.length}
            inactiveSubscriptions={inactiveSubscriptions}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
