import { and, eq, sql, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  ghostAgentRules,
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

  const userSubIds = userSubs.map((sub) => sub.id);
  const groupSubRows =
    userSubIds.length === 0
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
              inArray(groupSubscriptions.subscriptionId, userSubIds),
              sql`${groupSubscriptions.subscriptionId} is not null`,
              sql`${groupSubscriptions.deletedAt} is null`,
            ),
          );

  const groupBySubscriptionId = new Map(
    groupSubRows.map((row) => [row.subscriptionId as string, row]),
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

  const memberUserIds = Array.from(new Set(groupMemberRows.map((row) => row.userId)));
  const usageServiceNames = Array.from(
    new Set(
      groupSubRows
        .map((row) => {
          const sub = userSubs.find((s) => s.id === row.subscriptionId);
          return sub ? normalizeMonitorServiceName(sub.serviceName) : null;
        })
        .filter(
          (name): name is NonNullable<ReturnType<typeof normalizeMonitorServiceName>> =>
            Boolean(name),
        ),
    ),
  );

  const groupMemberUsageRows =
    memberUserIds.length === 0 || usageServiceNames.length === 0
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
              inArray(usageLogs.userId, memberUserIds),
              sql`${usageLogs.date} >= ${startDate}::date`,
              inArray(usageLogs.serviceName, usageServiceNames),
            ),
          )
          .groupBy(usageLogs.userId, usageLogs.serviceName);

  const groupUsageByMemberAndService = new Map(
    groupMemberUsageRows.map((row) => [
      `${row.userId}::${row.serviceName}`,
      row.totalMinutes,
    ]),
  );

  const membersByGroupSubId = new Map<
    string,
    Array<{
      userId: string;
      name: string | null;
      email: string;
    }>
  >();
  for (const member of groupMemberRows) {
    const list = membersByGroupSubId.get(member.groupSubscriptionId) ?? [];
    list.push({
      userId: member.userId,
      name: member.name,
      email: member.email,
    });
    membersByGroupSubId.set(member.groupSubscriptionId, list);
  }

  // Combine everything
  const data = userSubs.map((sub) => {
    const normalizedName = normalizeMonitorServiceName(sub.serviceName);
    const rule = rulesMap.get(sub.id);
    const groupRow = groupBySubscriptionId.get(sub.id);
    const groupMembersForSub = groupRow
      ? membersByGroupSubId.get(groupRow.groupSubscriptionId) ?? []
      : [];
    const groupMemberUsage = !normalizedName
      ? []
      : groupMembersForSub.map((member) => ({
          userId: member.userId,
          name: member.name ?? "User",
          email: member.email,
          minutes: groupUsageByMemberAndService.get(
            `${member.userId}::${normalizedName}`,
          ) ?? 0,
        }));
    const groupUsageMinutes = groupMemberUsage.reduce(
      (sum, member) => sum + member.minutes,
      0,
    );
    const ownUsageMinutes = normalizedName ? (usageMap.get(normalizedName) ?? 0) : 0;
    const usageMinutes = groupRow ? groupUsageMinutes : ownUsageMinutes;

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
      isGroupShared: Boolean(groupRow),
      groupName: groupRow?.groupName ?? null,
      groupUsageMinutes,
      groupMemberUsage,
    };
  });

  return NextResponse.json({ subscriptions: data });
}
