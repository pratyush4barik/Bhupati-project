import { and, eq, sql, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { ghostAgentRules, subscriptions } from "@/db/schema";

/**
 * POST /api/ghost-agent/auto-cancel-trials
 *
 * Called by a daily cron job. Finds free-trial subscriptions where:
 *   1. free_trial_auto_cancel is enabled in ghost_agent_rules
 *   2. The free trial ends tomorrow (cancel 1 day before to avoid charges)
 *
 * Cancels them automatically.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("x-cron-secret");
  if (authHeader !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  // Find subscriptions with free trial ending tomorrow and auto-cancel enabled
  const trialsToCancelRows = await db
    .select({
      ruleId: ghostAgentRules.id,
      subscriptionId: ghostAgentRules.subscriptionId,
      serviceName: subscriptions.serviceName,
    })
    .from(ghostAgentRules)
    .innerJoin(subscriptions, eq(subscriptions.id, ghostAgentRules.subscriptionId))
    .where(
      and(
        eq(ghostAgentRules.freeTrialAutoCancel, true),
        eq(subscriptions.status, "ACTIVE"),
        eq(subscriptions.freeTrialTaken, true),
        sql`${subscriptions.freeTrialEndsAt}::date <= ${tomorrowStr}::date`,
      ),
    );

  const cancelled: string[] = [];

  for (const row of trialsToCancelRows) {
    await db
      .update(subscriptions)
      .set({ status: "CANCELLED" })
      .where(eq(subscriptions.id, row.subscriptionId));

    await db
      .update(ghostAgentRules)
      .set({ freeTrialAutoCancel: false, updatedAt: new Date() })
      .where(eq(ghostAgentRules.id, row.ruleId));

    cancelled.push(row.subscriptionId);
  }

  return NextResponse.json({
    cancelled: cancelled.length,
    details: cancelled,
  });
}
