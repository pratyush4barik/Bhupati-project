import { and, desc, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  groupMemberSettlements,
  groupMembers,
  groupSubscriptionSplits,
  groupSubscriptions,
  groups,
  subscriptionServiceAccounts,
  subscriptions,
  user,
} from "@/db/schema";
import type { GroupCardView, GroupPaymentStatus } from "@/app/groups/types";

type BaseGroupRow = {
  groupId: string;
  groupSubscriptionId: string;
  groupName: string;
  createdAt: Date;
  serviceName: string;
  serviceKey: string | null;
  planName: string | null;
  totalCost: string;
  nextBillingDate: string;
  deleteRequestStatus: "NONE" | "PENDING";
  subscriptionStatus: "ACTIVE" | "PENDING" | "CANCELLED" | "INACTIVE";
  externalAccountEmail: string | null;
  externalAccountPassword: string | null;
  subscriptionEmail: string | null;
  subscriptionPassword: string | null;
  serviceAccountEmail: string | null;
  serviceAccountPassword: string | null;
  viewerRole: "OWNER" | "MEMBER";
  viewerStatus: GroupPaymentStatus;
  viewerShareAmount?: string;
  viewerRemovedAt?: Date | null;
};

function hasMissingRemovalColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: string; message?: string };
  if (maybe.code !== "42703") return false;
  const message = (maybe.message ?? "").toLowerCase();
  return (
    message.includes("removal_request_status") ||
    message.includes("removed_at")
  );
}

async function hydrateGroupCards(baseRows: BaseGroupRow[]): Promise<GroupCardView[]> {
  if (baseRows.length === 0) return [];

  const groupIds = Array.from(new Set(baseRows.map((row) => row.groupId)));
  const groupSubscriptionIds = Array.from(
    new Set(baseRows.map((row) => row.groupSubscriptionId)),
  );

  const memberRows = await db
    .select({
      groupId: groupMembers.groupId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      role: groupMembers.role,
    })
    .from(groupMembers)
    .innerJoin(user, eq(user.id, groupMembers.userId))
    .where(inArray(groupMembers.groupId, groupIds));

  let splitRows: Array<{
    groupSubscriptionId: string;
    userId: string;
    sharePercentage: number;
    shareAmount: string;
    paymentStatus: GroupPaymentStatus;
    removalRequestStatus: "NONE" | "PENDING" | "REMOVED";
    removedAt: Date | null;
  }> = [];

  try {
    splitRows = await db
      .select({
        groupSubscriptionId: groupSubscriptionSplits.groupSubscriptionId,
        userId: groupSubscriptionSplits.userId,
        sharePercentage: groupSubscriptionSplits.sharePercentage,
        shareAmount: groupSubscriptionSplits.shareAmount,
        paymentStatus: groupSubscriptionSplits.paymentStatus,
        removalRequestStatus: groupSubscriptionSplits.removalRequestStatus,
        removedAt: groupSubscriptionSplits.removedAt,
      })
      .from(groupSubscriptionSplits)
      .where(inArray(groupSubscriptionSplits.groupSubscriptionId, groupSubscriptionIds));
  } catch (error) {
    if (!hasMissingRemovalColumnError(error)) throw error;
    const fallbackSplitRows = await db
      .select({
        groupSubscriptionId: groupSubscriptionSplits.groupSubscriptionId,
        userId: groupSubscriptionSplits.userId,
        sharePercentage: groupSubscriptionSplits.sharePercentage,
        shareAmount: groupSubscriptionSplits.shareAmount,
        paymentStatus: groupSubscriptionSplits.paymentStatus,
      })
      .from(groupSubscriptionSplits)
      .where(inArray(groupSubscriptionSplits.groupSubscriptionId, groupSubscriptionIds));

    splitRows = fallbackSplitRows.map((row) => ({
      ...row,
      removalRequestStatus: "NONE" as const,
      removedAt: null,
    }));
  }

  const memberMap = new Map<string, (typeof memberRows)[number][]>();
  for (const row of memberRows) {
    const list = memberMap.get(row.groupId) ?? [];
    list.push(row);
    memberMap.set(row.groupId, list);
  }

  const splitMap = new Map<string, (typeof splitRows)[number][]>();
  for (const row of splitRows) {
    const list = splitMap.get(row.groupSubscriptionId) ?? [];
    list.push(row);
    splitMap.set(row.groupSubscriptionId, list);
  }

  return baseRows.map((row) => {
    const groupMemberRows = memberMap.get(row.groupId) ?? [];
    const groupSplitRows = splitMap.get(row.groupSubscriptionId) ?? [];

    const owner = groupMemberRows.find((member) => member.role === "OWNER");
    const splitByUserId = new Map(groupSplitRows.map((split) => [split.userId, split]));

    const members = groupMemberRows.map((member) => {
      const split = splitByUserId.get(member.userId);
      return {
        userId: member.userId,
        name: member.userName ?? "User",
        email: member.userEmail,
        percentage: split?.sharePercentage ?? 0,
        amount: split?.shareAmount ?? "0",
        status:
          member.role === "OWNER" ? ("PAID" as const) : split?.paymentStatus ?? "PENDING",
        removalRequestStatus:
          member.role === "OWNER"
            ? ("NONE" as const)
            : split?.removalRequestStatus ?? "NONE",
        removedAt: split?.removedAt ?? null,
        role: member.role,
      };
    }).sort((a, b) => {
      if (a.role === "OWNER" && b.role !== "OWNER") return -1;
      if (a.role !== "OWNER" && b.role === "OWNER") return 1;
      return a.name.localeCompare(b.name);
    });

    return {
      groupId: row.groupId,
      groupSubscriptionId: row.groupSubscriptionId,
      groupName: row.groupName,
      createdAt: row.createdAt,
      serviceName: row.serviceName,
      serviceKey: row.serviceKey,
      planName: row.planName,
      totalCost: row.totalCost,
      nextBillingDate: row.nextBillingDate,
      deleteRequestStatus: row.deleteRequestStatus,
      subscriptionStatus: row.subscriptionStatus,
      externalAccountPassword:
        row.externalAccountPassword ??
        row.subscriptionPassword ??
        row.serviceAccountPassword,
      externalAccountEmail:
        row.externalAccountEmail ?? row.subscriptionEmail ?? row.serviceAccountEmail,
      ownerName: owner?.userName ?? "Owner",
      members,
      viewerRole: row.viewerRole,
      viewerStatus: row.viewerStatus,
      viewerShareAmount: row.viewerShareAmount,
    };
  });
}

export async function getOwnerExistingGroupCards(userId: string) {
  const rows = await db
    .select({
      groupId: groups.id,
      groupSubscriptionId: groupSubscriptions.id,
      groupName: groups.name,
      createdAt: groups.createdAt,
      serviceName: groupSubscriptions.serviceName,
      serviceKey: groupSubscriptions.serviceKey,
      planName: groupSubscriptions.planName,
      totalCost: groupSubscriptions.totalCost,
      nextBillingDate: groupSubscriptions.nextBillingDate,
      deleteRequestStatus: groupSubscriptions.deleteRequestStatus,
      subscriptionStatus: subscriptions.status,
      externalAccountEmail: groupSubscriptions.externalAccountEmail,
      externalAccountPassword: groupSubscriptions.externalAccountPassword,
      subscriptionEmail: subscriptions.externalAccountEmail,
      subscriptionPassword: subscriptions.externalAccountPassword,
      serviceAccountEmail: subscriptionServiceAccounts.email,
      serviceAccountPassword: subscriptionServiceAccounts.passwordPlain,
    })
    .from(groups)
    .innerJoin(groupSubscriptions, eq(groupSubscriptions.groupId, groups.id))
    .leftJoin(subscriptions, eq(subscriptions.id, groupSubscriptions.subscriptionId))
    .leftJoin(
      subscriptionServiceAccounts,
      and(
        eq(subscriptionServiceAccounts.userId, groups.createdBy),
        eq(
          subscriptionServiceAccounts.serviceKey,
          groupSubscriptions.serviceKey,
        ),
        eq(subscriptionServiceAccounts.email, groupSubscriptions.externalAccountEmail),
      ),
    )
    .where(and(eq(groups.createdBy, userId), isNull(groupSubscriptions.deletedAt)))
    .orderBy(desc(groups.createdAt));

  return hydrateGroupCards(
    rows.map((row) => ({
      groupId: row.groupId,
      groupSubscriptionId: row.groupSubscriptionId,
      groupName: row.groupName,
      createdAt: row.createdAt,
      serviceName: row.serviceName,
      serviceKey: row.serviceKey,
      planName: row.planName,
      totalCost: row.totalCost,
      nextBillingDate: row.nextBillingDate,
      deleteRequestStatus: row.deleteRequestStatus,
      subscriptionStatus: row.subscriptionStatus ?? "ACTIVE",
      externalAccountEmail: row.externalAccountEmail,
      externalAccountPassword: row.externalAccountPassword,
      subscriptionEmail: row.subscriptionEmail,
      subscriptionPassword: row.subscriptionPassword,
      serviceAccountEmail: row.serviceAccountEmail,
      serviceAccountPassword: row.serviceAccountPassword,
      viewerRole: "OWNER" as const,
      viewerStatus: "PAID" as const,
    })),
  );
}

export async function getMemberExistingGroupCards(userId: string) {
  const rows = await db
    .select({
      groupId: groups.id,
      groupSubscriptionId: groupSubscriptions.id,
      groupName: groups.name,
      createdAt: groups.createdAt,
      serviceName: groupSubscriptions.serviceName,
      serviceKey: groupSubscriptions.serviceKey,
      planName: groupSubscriptions.planName,
      totalCost: groupSubscriptions.totalCost,
      nextBillingDate: groupSubscriptions.nextBillingDate,
      deleteRequestStatus: groupSubscriptions.deleteRequestStatus,
      subscriptionStatus: subscriptions.status,
      externalAccountEmail: groupSubscriptions.externalAccountEmail,
      externalAccountPassword: groupSubscriptions.externalAccountPassword,
      subscriptionEmail: subscriptions.externalAccountEmail,
      subscriptionPassword: subscriptions.externalAccountPassword,
      serviceAccountEmail: subscriptionServiceAccounts.email,
      serviceAccountPassword: subscriptionServiceAccounts.passwordPlain,
      viewerStatus: groupSubscriptionSplits.paymentStatus,
      viewerShareAmount: groupSubscriptionSplits.shareAmount,
    })
    .from(groupSubscriptionSplits)
    .innerJoin(groupSubscriptions, eq(groupSubscriptions.id, groupSubscriptionSplits.groupSubscriptionId))
    .innerJoin(groups, eq(groups.id, groupSubscriptions.groupId))
    .leftJoin(subscriptions, eq(subscriptions.id, groupSubscriptions.subscriptionId))
    .leftJoin(
      subscriptionServiceAccounts,
      and(
        eq(subscriptionServiceAccounts.userId, groups.createdBy),
        eq(
          subscriptionServiceAccounts.serviceKey,
          groupSubscriptions.serviceKey,
        ),
        eq(subscriptionServiceAccounts.email, groupSubscriptions.externalAccountEmail),
      ),
    )
    .innerJoin(
      groupMembers,
      and(
        eq(groupMembers.groupId, groups.id),
        eq(groupMembers.userId, userId),
        eq(groupMembers.role, "MEMBER"),
      ),
    )
    .where(
      and(
        eq(groupSubscriptionSplits.userId, userId),
        eq(groupSubscriptionSplits.paymentStatus, "PAID"),
        isNull(groupSubscriptions.deletedAt),
      ),
    )
    .orderBy(desc(groups.createdAt));

  return hydrateGroupCards(
    rows.map((row) => ({
      groupId: row.groupId,
      groupSubscriptionId: row.groupSubscriptionId,
      groupName: row.groupName,
      createdAt: row.createdAt,
      serviceName: row.serviceName,
      serviceKey: row.serviceKey,
      planName: row.planName,
      totalCost: row.totalCost,
      nextBillingDate: row.nextBillingDate,
      deleteRequestStatus: row.deleteRequestStatus,
      subscriptionStatus: row.subscriptionStatus ?? "ACTIVE",
      externalAccountEmail: row.externalAccountEmail,
      externalAccountPassword: row.externalAccountPassword,
      subscriptionEmail: row.subscriptionEmail,
      subscriptionPassword: row.subscriptionPassword,
      serviceAccountEmail: row.serviceAccountEmail,
      serviceAccountPassword: row.serviceAccountPassword,
      viewerRole: "MEMBER" as const,
      viewerStatus: row.viewerStatus,
      viewerShareAmount: row.viewerShareAmount,
    })),
  );
}

export async function getMemberRequestCards(userId: string) {
  const rows = await db
    .select({
      groupId: groups.id,
      groupSubscriptionId: groupSubscriptions.id,
      groupName: groups.name,
      createdAt: groups.createdAt,
      serviceName: groupSubscriptions.serviceName,
      serviceKey: groupSubscriptions.serviceKey,
      planName: groupSubscriptions.planName,
      totalCost: groupSubscriptions.totalCost,
      nextBillingDate: groupSubscriptions.nextBillingDate,
      deleteRequestStatus: groupSubscriptions.deleteRequestStatus,
      subscriptionStatus: subscriptions.status,
      externalAccountEmail: groupSubscriptions.externalAccountEmail,
      externalAccountPassword: groupSubscriptions.externalAccountPassword,
      subscriptionEmail: subscriptions.externalAccountEmail,
      subscriptionPassword: subscriptions.externalAccountPassword,
      serviceAccountEmail: subscriptionServiceAccounts.email,
      serviceAccountPassword: subscriptionServiceAccounts.passwordPlain,
      viewerStatus: groupSubscriptionSplits.paymentStatus,
      viewerShareAmount: groupSubscriptionSplits.shareAmount,
    })
    .from(groupSubscriptionSplits)
    .innerJoin(groupSubscriptions, eq(groupSubscriptions.id, groupSubscriptionSplits.groupSubscriptionId))
    .innerJoin(groups, eq(groups.id, groupSubscriptions.groupId))
    .leftJoin(subscriptions, eq(subscriptions.id, groupSubscriptions.subscriptionId))
    .leftJoin(
      subscriptionServiceAccounts,
      and(
        eq(subscriptionServiceAccounts.userId, groups.createdBy),
        eq(
          subscriptionServiceAccounts.serviceKey,
          groupSubscriptions.serviceKey,
        ),
        eq(subscriptionServiceAccounts.email, groupSubscriptions.externalAccountEmail),
      ),
    )
    .innerJoin(
      groupMembers,
      and(
        eq(groupMembers.groupId, groups.id),
        eq(groupMembers.userId, userId),
        eq(groupMembers.role, "MEMBER"),
      ),
    )
    .where(
      and(
        eq(groupSubscriptionSplits.userId, userId),
        inArray(groupSubscriptionSplits.paymentStatus, ["PENDING", "ACCEPTED"]),
        isNull(groupSubscriptions.deletedAt),
      ),
    )
    .orderBy(desc(groups.createdAt));

  return hydrateGroupCards(
    rows.map((row) => ({
      groupId: row.groupId,
      groupSubscriptionId: row.groupSubscriptionId,
      groupName: row.groupName,
      createdAt: row.createdAt,
      serviceName: row.serviceName,
      serviceKey: row.serviceKey,
      planName: row.planName,
      totalCost: row.totalCost,
      nextBillingDate: row.nextBillingDate,
      deleteRequestStatus: row.deleteRequestStatus,
      subscriptionStatus: row.subscriptionStatus ?? "ACTIVE",
      externalAccountEmail: row.externalAccountEmail,
      externalAccountPassword: row.externalAccountPassword,
      subscriptionEmail: row.subscriptionEmail,
      subscriptionPassword: row.subscriptionPassword,
      serviceAccountEmail: row.serviceAccountEmail,
      serviceAccountPassword: row.serviceAccountPassword,
      viewerRole: "MEMBER" as const,
      viewerStatus: row.viewerStatus,
      viewerShareAmount: row.viewerShareAmount,
    })),
  );
}

export async function processPendingGroupDeletionRequests(userId: string) {
  const pendingRows = await db
    .select({
      id: groupSubscriptions.id,
      groupId: groupSubscriptions.groupId,
      nextBillingDate: groupSubscriptions.nextBillingDate,
    })
    .from(groupSubscriptions)
    .innerJoin(groups, eq(groups.id, groupSubscriptions.groupId))
    .where(
      and(
        eq(groups.createdBy, userId),
        eq(groupSubscriptions.deleteRequestStatus, "PENDING"),
        isNull(groupSubscriptions.deletedAt),
      ),
    );

  if (pendingRows.length === 0) return;

  for (const row of pendingRows) {
    const cutoff = new Date(`${row.nextBillingDate}T00:00:00`);
    cutoff.setDate(cutoff.getDate() - 1);
    if (new Date() < cutoff) continue;

    await db
      .update(groupSubscriptions)
      .set({
        deletedAt: new Date(),
        deleteRequestStatus: "NONE",
        status: "CANCELLED",
      })
      .where(eq(groupSubscriptions.id, row.id));

    await db
      .update(groupMemberSettlements)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(
        and(
          eq(groupMemberSettlements.groupSubscriptionId, row.id),
          eq(groupMemberSettlements.status, "PENDING"),
        ),
      );
  }
}

export async function processRejectedGroupRequestMembers(userId: string) {
  const rejectedRows = await db
    .select({
      groupId: groupSubscriptions.groupId,
      groupSubscriptionId: groupSubscriptionSplits.groupSubscriptionId,
      memberUserId: groupSubscriptionSplits.userId,
      sharePercentage: groupSubscriptionSplits.sharePercentage,
      shareAmount: groupSubscriptionSplits.shareAmount,
    })
    .from(groupSubscriptionSplits)
    .innerJoin(
      groupSubscriptions,
      eq(groupSubscriptions.id, groupSubscriptionSplits.groupSubscriptionId),
    )
    .innerJoin(groups, eq(groups.id, groupSubscriptions.groupId))
    .innerJoin(
      groupMembers,
      and(
        eq(groupMembers.groupId, groups.id),
        eq(groupMembers.userId, groupSubscriptionSplits.userId),
        eq(groupMembers.role, "MEMBER"),
      ),
    )
    .where(
      and(
        eq(groups.createdBy, userId),
        eq(groupSubscriptionSplits.paymentStatus, "REJECTED"),
        isNull(groupSubscriptions.deletedAt),
      ),
    );

  if (rejectedRows.length === 0) return;

  for (const row of rejectedRows) {
    const [ownerMember] = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, row.groupId),
          eq(groupMembers.role, "OWNER"),
        ),
      )
      .limit(1);

    if (!ownerMember) continue;

    const [ownerSplit] = await db
      .select({
        sharePercentage: groupSubscriptionSplits.sharePercentage,
        shareAmount: groupSubscriptionSplits.shareAmount,
      })
      .from(groupSubscriptionSplits)
      .where(
        and(
          eq(groupSubscriptionSplits.groupSubscriptionId, row.groupSubscriptionId),
          eq(groupSubscriptionSplits.userId, ownerMember.userId),
        ),
      )
      .limit(1);

    if (!ownerSplit) continue;

    const ownerAmount = Number.parseFloat(ownerSplit.shareAmount);
    const memberAmount = Number.parseFloat(row.shareAmount);
    if (!Number.isFinite(ownerAmount) || !Number.isFinite(memberAmount)) continue;

    await db
      .update(groupSubscriptionSplits)
      .set({
        sharePercentage: ownerSplit.sharePercentage + row.sharePercentage,
        shareAmount: (ownerAmount + memberAmount).toFixed(2),
      })
      .where(
        and(
          eq(groupSubscriptionSplits.groupSubscriptionId, row.groupSubscriptionId),
          eq(groupSubscriptionSplits.userId, ownerMember.userId),
        ),
      );

    await db
      .delete(groupSubscriptionSplits)
      .where(
        and(
          eq(groupSubscriptionSplits.groupSubscriptionId, row.groupSubscriptionId),
          eq(groupSubscriptionSplits.userId, row.memberUserId),
        ),
      );

    await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, row.groupId),
          eq(groupMembers.userId, row.memberUserId),
          eq(groupMembers.role, "MEMBER"),
        ),
      );

    await db
      .update(groupMemberSettlements)
      .set({ status: "COMPLETED", completedAt: new Date() })
      .where(
        and(
          eq(groupMemberSettlements.groupSubscriptionId, row.groupSubscriptionId),
          eq(groupMemberSettlements.triggerMemberId, row.memberUserId),
          eq(groupMemberSettlements.status, "PENDING"),
        ),
      );
  }
}

export async function processPendingMemberRemovalRequests(userId: string) {
  let pendingRows: Array<{
    groupId: string;
    groupSubscriptionId: string;
    userId: string;
    sharePercentage: number;
    shareAmount: string;
    nextBillingDate: string;
  }> = [];

  try {
    pendingRows = await db
      .select({
        groupId: groupSubscriptions.groupId,
        groupSubscriptionId: groupSubscriptionSplits.groupSubscriptionId,
        userId: groupSubscriptionSplits.userId,
        sharePercentage: groupSubscriptionSplits.sharePercentage,
        shareAmount: groupSubscriptionSplits.shareAmount,
        nextBillingDate: groupSubscriptions.nextBillingDate,
      })
      .from(groupSubscriptionSplits)
      .innerJoin(
        groupSubscriptions,
        eq(groupSubscriptions.id, groupSubscriptionSplits.groupSubscriptionId),
      )
      .innerJoin(groups, eq(groups.id, groupSubscriptions.groupId))
      .where(
        and(
          eq(groupSubscriptionSplits.removalRequestStatus, "PENDING"),
          eq(groupSubscriptionSplits.paymentStatus, "PAID"),
          or(
            eq(groups.createdBy, userId),
            eq(groupSubscriptionSplits.userId, userId),
          ),
        ),
      );
  } catch (error) {
    if (!hasMissingRemovalColumnError(error)) throw error;
    return;
  }

  if (pendingRows.length === 0) return;

  for (const row of pendingRows) {
    const cutoff = new Date(`${row.nextBillingDate}T00:00:00`);
    cutoff.setDate(cutoff.getDate() - 1);
    if (new Date() < cutoff) continue;

    const memberPct = row.sharePercentage;
    const memberAmount = Number.parseFloat(row.shareAmount);
    if (!Number.isFinite(memberAmount) || memberAmount < 0) continue;

    const [ownerMember] = await db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, row.groupId),
          eq(groupMembers.role, "OWNER"),
        ),
      )
      .limit(1);

    if (!ownerMember) continue;

    const [ownerSplit] = await db
      .select({
        sharePercentage: groupSubscriptionSplits.sharePercentage,
        shareAmount: groupSubscriptionSplits.shareAmount,
      })
      .from(groupSubscriptionSplits)
      .where(
        and(
          eq(groupSubscriptionSplits.groupSubscriptionId, row.groupSubscriptionId),
          eq(groupSubscriptionSplits.userId, ownerMember.userId),
        ),
      )
      .limit(1);

    if (!ownerSplit) continue;

    const ownerAmount = Number.parseFloat(ownerSplit.shareAmount);
    if (!Number.isFinite(ownerAmount)) continue;

    await db
      .update(groupSubscriptionSplits)
      .set({
        sharePercentage: ownerSplit.sharePercentage + memberPct,
        shareAmount: (ownerAmount + memberAmount).toFixed(2),
      })
      .where(
        and(
          eq(groupSubscriptionSplits.groupSubscriptionId, row.groupSubscriptionId),
          eq(groupSubscriptionSplits.userId, ownerMember.userId),
        ),
      );

    await db
      .update(groupSubscriptionSplits)
      .set({
        sharePercentage: 0,
        shareAmount: "0.00",
        paymentStatus: "REMOVED",
        removalRequestStatus: "REMOVED",
        removedAt: new Date(),
      })
      .where(
        and(
          eq(groupSubscriptionSplits.groupSubscriptionId, row.groupSubscriptionId),
          eq(groupSubscriptionSplits.userId, row.userId),
        ),
      );

    await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, row.groupId),
          eq(groupMembers.userId, row.userId),
          eq(groupMembers.role, "MEMBER"),
        ),
      );
  }
}

export async function getDeletedGroupCards(userId: string) {
  const ownerDeletedRows = await db
    .select({
      groupId: groups.id,
      groupSubscriptionId: groupSubscriptions.id,
      groupName: groups.name,
      createdAt: groups.createdAt,
      serviceName: groupSubscriptions.serviceName,
      serviceKey: groupSubscriptions.serviceKey,
      planName: groupSubscriptions.planName,
      totalCost: groupSubscriptions.totalCost,
      nextBillingDate: groupSubscriptions.nextBillingDate,
      deleteRequestStatus: groupSubscriptions.deleteRequestStatus,
      subscriptionStatus: subscriptions.status,
      externalAccountEmail: groupSubscriptions.externalAccountEmail,
      externalAccountPassword: groupSubscriptions.externalAccountPassword,
      subscriptionEmail: subscriptions.externalAccountEmail,
      subscriptionPassword: subscriptions.externalAccountPassword,
      serviceAccountEmail: subscriptionServiceAccounts.email,
      serviceAccountPassword: subscriptionServiceAccounts.passwordPlain,
    })
    .from(groups)
    .innerJoin(groupSubscriptions, eq(groupSubscriptions.groupId, groups.id))
    .leftJoin(subscriptions, eq(subscriptions.id, groupSubscriptions.subscriptionId))
    .leftJoin(
      subscriptionServiceAccounts,
      and(
        eq(subscriptionServiceAccounts.userId, groups.createdBy),
        eq(
          subscriptionServiceAccounts.serviceKey,
          groupSubscriptions.serviceKey,
        ),
        eq(subscriptionServiceAccounts.email, groupSubscriptions.externalAccountEmail),
      ),
    )
    .where(and(eq(groups.createdBy, userId), isNotNull(groupSubscriptions.deletedAt)))
    .orderBy(desc(groupSubscriptions.deletedAt));

  let removedMemberRows: Array<{
    groupId: string;
    groupSubscriptionId: string;
    groupName: string;
    createdAt: Date;
    serviceName: string;
    serviceKey: string | null;
    planName: string | null;
    totalCost: string;
    nextBillingDate: string;
    deleteRequestStatus: "NONE" | "PENDING";
    subscriptionStatus: "ACTIVE" | "PENDING" | "CANCELLED" | "INACTIVE" | null;
    externalAccountEmail: string | null;
    externalAccountPassword: string | null;
    subscriptionEmail: string | null;
    subscriptionPassword: string | null;
    serviceAccountEmail: string | null;
    serviceAccountPassword: string | null;
    viewerStatus: GroupPaymentStatus;
    viewerShareAmount: string;
    viewerRemovedAt: Date | null;
  }> = [];

  try {
    removedMemberRows = await db
      .select({
        groupId: groups.id,
        groupSubscriptionId: groupSubscriptions.id,
        groupName: groups.name,
        createdAt: groups.createdAt,
        serviceName: groupSubscriptions.serviceName,
        serviceKey: groupSubscriptions.serviceKey,
        planName: groupSubscriptions.planName,
        totalCost: groupSubscriptions.totalCost,
        nextBillingDate: groupSubscriptions.nextBillingDate,
        deleteRequestStatus: groupSubscriptions.deleteRequestStatus,
        subscriptionStatus: subscriptions.status,
        externalAccountEmail: groupSubscriptions.externalAccountEmail,
        externalAccountPassword: groupSubscriptions.externalAccountPassword,
        subscriptionEmail: subscriptions.externalAccountEmail,
        subscriptionPassword: subscriptions.externalAccountPassword,
        serviceAccountEmail: subscriptionServiceAccounts.email,
        serviceAccountPassword: subscriptionServiceAccounts.passwordPlain,
        viewerStatus: groupSubscriptionSplits.paymentStatus,
        viewerShareAmount: groupSubscriptionSplits.shareAmount,
        viewerRemovedAt: groupSubscriptionSplits.removedAt,
      })
      .from(groupSubscriptionSplits)
      .innerJoin(groupSubscriptions, eq(groupSubscriptions.id, groupSubscriptionSplits.groupSubscriptionId))
      .innerJoin(groups, eq(groups.id, groupSubscriptions.groupId))
      .leftJoin(subscriptions, eq(subscriptions.id, groupSubscriptions.subscriptionId))
      .leftJoin(
        subscriptionServiceAccounts,
        and(
          eq(subscriptionServiceAccounts.userId, groups.createdBy),
          eq(
            subscriptionServiceAccounts.serviceKey,
            groupSubscriptions.serviceKey,
          ),
          eq(subscriptionServiceAccounts.email, groupSubscriptions.externalAccountEmail),
        ),
      )
      .where(
        and(
          eq(groupSubscriptionSplits.userId, userId),
          eq(groupSubscriptionSplits.paymentStatus, "REMOVED"),
          isNotNull(groupSubscriptionSplits.removedAt),
        ),
      )
      .orderBy(desc(groupSubscriptionSplits.removedAt));
  } catch (error) {
    if (!hasMissingRemovalColumnError(error)) throw error;
    removedMemberRows = [];
  }

  const rows = [
    ...ownerDeletedRows.map((row) => ({
      ...row,
      viewerRole: "OWNER" as const,
      viewerStatus: "PAID" as const,
      viewerRemovedAt: null,
    })),
    ...removedMemberRows.map((row) => ({
      ...row,
      viewerRole: "MEMBER" as const,
      viewerStatus: row.viewerStatus as GroupPaymentStatus,
      viewerRemovedAt: row.viewerRemovedAt,
    })),
  ];

  return hydrateGroupCards(
    rows.map((row) => ({
      groupId: row.groupId,
      groupSubscriptionId: row.groupSubscriptionId,
      groupName: row.groupName,
      createdAt: row.createdAt,
      serviceName: row.serviceName,
      serviceKey: row.serviceKey,
      planName: row.planName,
      totalCost: row.totalCost,
      nextBillingDate: row.nextBillingDate,
      deleteRequestStatus: row.deleteRequestStatus,
      subscriptionStatus: row.subscriptionStatus ?? "ACTIVE",
      externalAccountEmail: row.externalAccountEmail,
      externalAccountPassword: row.externalAccountPassword,
      subscriptionEmail: row.subscriptionEmail,
      subscriptionPassword: row.subscriptionPassword,
      serviceAccountEmail: row.serviceAccountEmail,
      serviceAccountPassword: row.serviceAccountPassword,
      viewerRole: row.viewerRole,
      viewerStatus: row.viewerStatus,
      viewerRemovedAt: row.viewerRemovedAt,
    })),
  );
}
