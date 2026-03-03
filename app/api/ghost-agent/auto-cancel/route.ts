import { and, eq, sql, lte, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { ghostAgentRules, subscriptions, usageLogs } from "@/db/schema";
import { normalizeMonitorServiceName } from "@/lib/monitor-services";

/**
 * POST /api/ghost-agent/auto-cancel
 *
 * This endpoint is meant to be called by a cron job (e.g. daily).
 * It finds all subscriptions where:
 *   1. The ghost agent is enabled
 *   2. Usage in the last 30 days is below the min_usage_minutes threshold
 *   3. The next billing date is tomorrow (i.e. cancellation happens 1 day before payment)
 *
 * For those subscriptions it sets status = 'CANCELLED'.
 */
export async function POST(req: Request) {
  // Simple auth via a secret header (for cron jobs)
  const authHeader = req.headers.get("x-cron-secret");
  if (authHeader !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Get all enabled ghost agent rules where the subscription billing is tomorrow
  const enabledRules = await db
    .select({
      ruleId: ghostAgentRules.id,
      userId: ghostAgentRules.userId,
      subscriptionId: ghostAgentRules.subscriptionId,
      minUsageMinutes: ghostAgentRules.minUsageMinutes,
      serviceName: subscriptions.serviceName,
      nextBillingDate: subscriptions.nextBillingDate,
    })
    .from(ghostAgentRules)
    .innerJoin(subscriptions, eq(subscriptions.id, ghostAgentRules.subscriptionId))
    .where(
      and(
        eq(ghostAgentRules.enabled, true),
        eq(subscriptions.status, "ACTIVE"),
        lte(subscriptions.nextBillingDate, tomorrowStr),
      ),
    );

  if (enabledRules.length === 0) {
    return NextResponse.json({ cancelled: 0, details: [] });
  }

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().slice(0, 10);

  const cancelled: string[] = [];

  for (const rule of enabledRules) {
    const normalizedName = normalizeMonitorServiceName(rule.serviceName);
    let usageMinutes = 0;

    if (normalizedName) {
      const [usageRow] = await db
        .select({
          totalMinutes: sql<number>`coalesce(sum(${usageLogs.focusedMinutes})::int, 0)`,
        })
        .from(usageLogs)
        .where(
          and(
            eq(usageLogs.userId, rule.userId),
            eq(usageLogs.serviceName, normalizedName),
            sql`${usageLogs.date} >= ${startDate}::date`,
          ),
        );
      usageMinutes = usageRow?.totalMinutes ?? 0;
    }

    // If usage is below threshold, cancel the subscription
    if (usageMinutes < rule.minUsageMinutes) {
      await db
        .update(subscriptions)
        .set({ status: "CANCELLED" })
        .where(eq(subscriptions.id, rule.subscriptionId));

      // Disable the rule after cancellation
      await db
        .update(ghostAgentRules)
        .set({ enabled: false, updatedAt: new Date() })
        .where(eq(ghostAgentRules.id, rule.ruleId));

      cancelled.push(rule.subscriptionId);
    }
  }

  return NextResponse.json({
    cancelled: cancelled.length,
    details: cancelled,
  });
}
