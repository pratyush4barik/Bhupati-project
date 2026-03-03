import { and, eq, sql, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { ghostAgentRules, subscriptions, usageLogs } from "@/db/schema";
import { normalizeMonitorServiceName } from "@/lib/monitor-services";
import { requireSession } from "@/lib/require-session";

export async function GET() {
  const session = await requireSession();

  // Get all active subscriptions
  const userSubs = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, session.user.id),
        eq(subscriptions.status, "ACTIVE"),
      ),
    );

  // Get all ghost agent rules for the user
  const rules = await db
    .select()
    .from(ghostAgentRules)
    .where(eq(ghostAgentRules.userId, session.user.id));

  const rulesMap = new Map(rules.map((r) => [r.subscriptionId, r]));

  // Get usage data for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().slice(0, 10);

  const activeServices = Array.from(
    new Set(
      userSubs
        .map((s) => normalizeMonitorServiceName(s.serviceName))
        .filter((n): n is NonNullable<typeof n> => Boolean(n)),
    ),
  );

  const usageRows =
    activeServices.length === 0
      ? []
      : await db
          .select({
            serviceName: usageLogs.serviceName,
            totalMinutes: sql<number>`sum(${usageLogs.focusedMinutes})::int`,
          })
          .from(usageLogs)
          .where(
            and(
              eq(usageLogs.userId, session.user.id),
              sql`${usageLogs.date} >= ${startDate}::date`,
              inArray(usageLogs.serviceName, activeServices),
            ),
          )
          .groupBy(usageLogs.serviceName);

  const usageMap = new Map(usageRows.map((r) => [r.serviceName, r.totalMinutes]));

  // Combine everything
  const data = userSubs.map((sub) => {
    const normalizedName = normalizeMonitorServiceName(sub.serviceName);
    const rule = rulesMap.get(sub.id);
    const usageMinutes = normalizedName ? (usageMap.get(normalizedName) ?? 0) : 0;

    return {
      id: sub.id,
      serviceName: sub.serviceName,
      planName: sub.planName,
      planDurationMonths: sub.planDurationMonths,
      monthlyCost: sub.monthlyCost,
      nextBillingDate: sub.nextBillingDate,
      freeTrialTaken: sub.freeTrialTaken,
      freeTrialEndsAt: sub.freeTrialEndsAt?.toISOString() ?? null,
      status: sub.status,
      usageMinutes,
      agentEnabled: rule?.enabled ?? false,
      minUsageMinutes: rule?.minUsageMinutes ?? 60,
      freeTrialAutoCancel: rule?.freeTrialAutoCancel ?? false,
      ruleId: rule?.id ?? null,
    };
  });

  return NextResponse.json({ subscriptions: data });
}
