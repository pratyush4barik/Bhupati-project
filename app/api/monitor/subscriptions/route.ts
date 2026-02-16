import { and, eq, gte, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions, usageLogs } from "@/db/schema";
import { authenticateMonitorBearerToken } from "@/lib/monitor-auth";
import { normalizeMonitorServiceName } from "@/lib/monitor-services";

function toDateKey(value: Date | string) {
  if (typeof value === "string") return value;
  return value.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const auth = await authenticateMonitorBearerToken(request.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeSubscriptions = await db
    .select({
      id: subscriptions.id,
      serviceName: subscriptions.serviceName,
      nextBillingDate: subscriptions.nextBillingDate,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, auth.userId),
        eq(subscriptions.status, "ACTIVE"),
      ),
    );

  const activeServices = Array.from(
    new Set(
      activeSubscriptions
        .map((sub) => normalizeMonitorServiceName(sub.serviceName))
        .filter((name): name is NonNullable<typeof name> => Boolean(name)),
    ),
  );

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const fromDateKey = fromDate.toISOString().slice(0, 10);
  const todayKey = new Date().toISOString().slice(0, 10);

  const usageRows =
    activeServices.length === 0
      ? []
      : await db
          .select({
            serviceName: usageLogs.serviceName,
            date: usageLogs.date,
            focusedMinutes: usageLogs.focusedMinutes,
          })
          .from(usageLogs)
          .where(
            and(
              eq(usageLogs.userId, auth.userId),
              inArray(usageLogs.serviceName, activeServices),
              gte(usageLogs.date, fromDateKey),
            ),
          );

  const aggregates = new Map<
    string,
    {
      focusedMinutesToday: number;
      lastUsedAt: string | null;
    }
  >();

  usageRows.forEach((row) => {
    const dateKey = toDateKey(row.date);
    const previous = aggregates.get(row.serviceName) ?? {
      focusedMinutesToday: 0,
      lastUsedAt: null,
    };

    if (dateKey === todayKey) {
      previous.focusedMinutesToday += row.focusedMinutes;
    }

    if (!previous.lastUsedAt || dateKey > previous.lastUsedAt) {
      previous.lastUsedAt = dateKey;
    }

    aggregates.set(row.serviceName, previous);
  });

  return NextResponse.json({
    subscriptions: activeSubscriptions
      .map((sub) => {
        const normalized = normalizeMonitorServiceName(sub.serviceName);
        if (!normalized) return null;

        const aggregate = aggregates.get(normalized) ?? {
          focusedMinutesToday: 0,
          lastUsedAt: null,
        };

        return {
          id: sub.id,
          serviceName: normalized,
          nextBillingDate: String(sub.nextBillingDate),
          lastUsedAt: aggregate.lastUsedAt,
          focusedMinutesToday: aggregate.focusedMinutesToday,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null),
  });
}
