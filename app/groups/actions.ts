"use server";

import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  groupMembers,
  groupMemberSettlements,
  groupSubscriptionSplits,
  groupSubscriptions,
  groups,
  internalTransfers,
  notifications,
  subscriptionServiceAccounts,
  subscriptions,
  transactions,
  user,
  wallet,
} from "@/db/schema";
import { requireSession } from "@/lib/require-session";

type InputMember = {
  email: string;
  percentage: number;
};

function toNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function round2(value: number) {
  return Number(value.toFixed(2));
}

function redirectToGroups(params: Record<string, string | undefined>): never {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  redirect(`/groups?${query.toString()}`);
}

function redirectToRequests(params: Record<string, string | undefined>): never {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  redirect(`/requests?${query.toString()}`);
}

export async function createGroupAction(formData: FormData) {
  const session = await requireSession();
  const subscriptionId = toText(formData.get("subscriptionId"));
  const groupName = toText(formData.get("groupName"));
  const ownerPercentage = toNumber(formData.get("ownerPercentage"));
  const membersRaw = toText(formData.get("members"));

  if (!subscriptionId || !groupName || ownerPercentage === null || !membersRaw) {
    redirectToGroups({ error: "Missing group details" });
  }

  let parsedMembers: InputMember[] = [];
  try {
    const raw = JSON.parse(membersRaw) as InputMember[];
    parsedMembers = Array.isArray(raw) ? raw : [];
  } catch {
    redirectToGroups({ error: "Invalid members payload" });
  }

  const members = parsedMembers
    .map((member) => ({
      email: normalizeEmail(member.email ?? ""),
      percentage: Number.isFinite(member.percentage) ? member.percentage : 0,
    }))
    .filter((member) => member.email.length > 0);

  if (members.length === 0) {
    redirectToGroups({ error: "Add at least one member" });
  }

  if (members.some((member) => member.percentage <= 0 || member.percentage > 100)) {
    redirectToGroups({ error: "Each member percentage must be between 1 and 100" });
  }

  const ownerPct = Math.max(0, Math.min(100, ownerPercentage));
  const totalPct = members.reduce((sum, member) => sum + member.percentage, ownerPct);
  if (Math.abs(totalPct - 100) > 0.001) {
    redirectToGroups({ error: "Total percentage must be exactly 100" });
  }

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.id, subscriptionId),
        eq(subscriptions.userId, session.user.id),
        eq(subscriptions.status, "ACTIVE"),
      ),
    )
    .limit(1);

  if (!subscription) {
    redirectToGroups({ error: "Selected subscription not found or inactive" });
  }

  const [serviceAccount] =
    subscription.externalAccountEmail && subscription.serviceKey
      ? await db
          .select({
            email: subscriptionServiceAccounts.email,
            passwordPlain: subscriptionServiceAccounts.passwordPlain,
          })
          .from(subscriptionServiceAccounts)
          .where(
            and(
              eq(subscriptionServiceAccounts.userId, session.user.id),
              eq(subscriptionServiceAccounts.serviceKey, subscription.serviceKey),
              eq(subscriptionServiceAccounts.email, subscription.externalAccountEmail),
            ),
          )
          .limit(1)
      : [null];

  const uniqueEmails = Array.from(new Set(members.map((member) => member.email)));
  if (uniqueEmails.length !== members.length) {
    redirectToGroups({ error: "Duplicate member emails are not allowed" });
  }

  if (uniqueEmails.includes(normalizeEmail(session.user.email))) {
    redirectToGroups({ error: "Owner email cannot be added as member" });
  }

  const memberUsers = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(inArray(user.email, uniqueEmails));

  if (memberUsers.length !== uniqueEmails.length) {
    redirectToGroups({ error: "Some member emails do not belong to PayXen users" });
  }

  const memberEmailToId = new Map(
    memberUsers.map((memberUser) => [normalizeEmail(memberUser.email), memberUser.id]),
  );

  const [createdGroup] = await db
    .insert(groups)
    .values({
      name: groupName,
      createdBy: session.user.id,
    })
    .returning({ id: groups.id });

  await db.insert(groupMembers).values({
    groupId: createdGroup.id,
    userId: session.user.id,
    role: "OWNER",
  });

  await db.insert(groupMembers).values(
    members.map((member) => ({
      groupId: createdGroup.id,
      userId: memberEmailToId.get(member.email)!,
      role: "MEMBER" as const,
    })),
  );

  const totalCost = Number.parseFloat(subscription.monthlyCost ?? "0");
  const [groupSub] = await db
    .insert(groupSubscriptions)
    .values({
      groupId: createdGroup.id,
      subscriptionId: subscription.id,
      serviceName: subscription.serviceName,
      serviceKey: subscription.serviceKey,
      planName: subscription.planName,
      externalAccountEmail:
        subscription.externalAccountEmail ?? serviceAccount?.email ?? null,
      externalAccountPassword:
        subscription.externalAccountPassword ?? serviceAccount?.passwordPlain ?? null,
      totalCost: subscription.monthlyCost,
      splitType: "CUSTOM",
      nextBillingDate: subscription.nextBillingDate,
      status: "ACTIVE",
    })
    .returning({ id: groupSubscriptions.id });

  const ownerShareAmount = round2((ownerPct / 100) * totalCost);
  await db.insert(groupSubscriptionSplits).values({
    groupSubscriptionId: groupSub.id,
    userId: session.user.id,
    sharePercentage: Math.round(ownerPct),
    shareAmount: ownerShareAmount.toFixed(2),
    paymentStatus: "PAID",
    paidAt: new Date(),
  });

  await db.insert(groupSubscriptionSplits).values(
    members.map((member) => ({
      groupSubscriptionId: groupSub.id,
      userId: memberEmailToId.get(member.email)!,
      sharePercentage: Math.round(member.percentage),
      shareAmount: round2((member.percentage / 100) * totalCost).toFixed(2),
      paymentStatus: "PENDING" as const,
      paidAt: null,
    })),
  );

  redirectToGroups({ success: "Group created successfully" });
}

export async function acceptGroupRequestAction(formData: FormData) {
  const session = await requireSession();
  const groupSubscriptionId = toText(formData.get("groupSubscriptionId"));
  if (!groupSubscriptionId) {
    redirectToRequests({ error: "Invalid request" });
  }

  const [groupInfo] = await db
    .select({
      groupId: groupSubscriptions.groupId,
      serviceName: groupSubscriptions.serviceName,
      ownerId: groups.createdBy,
    })
    .from(groupSubscriptions)
    .innerJoin(groups, eq(groups.id, groupSubscriptions.groupId))
    .where(eq(groupSubscriptions.id, groupSubscriptionId))
    .limit(1);

  const [updatedSplit] = await db
    .update(groupSubscriptionSplits)
    .set({ paymentStatus: "ACCEPTED" })
    .where(
      and(
        eq(groupSubscriptionSplits.groupSubscriptionId, groupSubscriptionId),
        eq(groupSubscriptionSplits.userId, session.user.id),
        eq(groupSubscriptionSplits.paymentStatus, "PENDING"),
      ),
    )
    .returning({ userId: groupSubscriptionSplits.userId });

  if (!updatedSplit) {
    redirectToRequests({ error: "Request already processed" });
  }

  if (groupInfo && groupInfo.ownerId !== session.user.id) {
    await db.insert(notifications).values({
      userId: groupInfo.ownerId,
      type: "GROUP_REQUEST_ACCEPTED",
      title: "Group request accepted",
      message: `${session.user.name ?? session.user.email} accepted your ${groupInfo.serviceName} group request.`,
    });
  }

  redirectToRequests({ success: "Request accepted. You can pay now." });
}

export async function rejectGroupRequestAction(formData: FormData) {
  const session = await requireSession();
  const groupSubscriptionId = toText(formData.get("groupSubscriptionId"));
  if (!groupSubscriptionId) {
    redirectToRequests({ error: "Invalid request" });
  }

  const [groupInfo] = await db
    .select({
      groupId: groupSubscriptions.groupId,
      serviceName: groupSubscriptions.serviceName,
      ownerId: groups.createdBy,
    })
    .from(groupSubscriptions)
    .innerJoin(groups, eq(groups.id, groupSubscriptions.groupId))
    .where(eq(groupSubscriptions.id, groupSubscriptionId))
    .limit(1);

  if (!groupInfo) {
    redirectToRequests({ error: "Group not found" });
  }

  const [memberSplit] = await db
    .select({
      sharePercentage: groupSubscriptionSplits.sharePercentage,
      shareAmount: groupSubscriptionSplits.shareAmount,
      paymentStatus: groupSubscriptionSplits.paymentStatus,
    })
    .from(groupSubscriptionSplits)
    .where(
      and(
        eq(groupSubscriptionSplits.groupSubscriptionId, groupSubscriptionId),
        eq(groupSubscriptionSplits.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!memberSplit || !["PENDING", "ACCEPTED"].includes(memberSplit.paymentStatus)) {
    redirectToRequests({ error: "Request already processed" });
  }

  const [ownerSplit] = await db
    .select({
      sharePercentage: groupSubscriptionSplits.sharePercentage,
      shareAmount: groupSubscriptionSplits.shareAmount,
    })
    .from(groupSubscriptionSplits)
    .where(
      and(
        eq(groupSubscriptionSplits.groupSubscriptionId, groupSubscriptionId),
        eq(groupSubscriptionSplits.userId, groupInfo.ownerId),
      ),
    )
    .limit(1);

  if (!ownerSplit) {
    redirectToRequests({ error: "Owner share not found" });
  }

  const ownerAmount = Number.parseFloat(ownerSplit.shareAmount);
  const memberAmount = Number.parseFloat(memberSplit.shareAmount);
  if (!Number.isFinite(ownerAmount) || !Number.isFinite(memberAmount)) {
    redirectToRequests({ error: "Invalid split amount" });
  }

  await db
    .update(groupSubscriptionSplits)
    .set({
      sharePercentage: ownerSplit.sharePercentage + memberSplit.sharePercentage,
      shareAmount: (ownerAmount + memberAmount).toFixed(2),
    })
    .where(
      and(
        eq(groupSubscriptionSplits.groupSubscriptionId, groupSubscriptionId),
        eq(groupSubscriptionSplits.userId, groupInfo.ownerId),
      ),
    );

  await db
    .delete(groupSubscriptionSplits)
    .where(
      and(
        eq(groupSubscriptionSplits.groupSubscriptionId, groupSubscriptionId),
        eq(groupSubscriptionSplits.userId, session.user.id),
      ),
    );

  await db
    .delete(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupInfo.groupId),
        eq(groupMembers.userId, session.user.id),
        eq(groupMembers.role, "MEMBER"),
      ),
    );

  await db
    .update(groupMemberSettlements)
    .set({ status: "COMPLETED", completedAt: new Date() })
    .where(
      and(
        eq(groupMemberSettlements.groupSubscriptionId, groupSubscriptionId),
        eq(groupMemberSettlements.triggerMemberId, session.user.id),
        eq(groupMemberSettlements.status, "PENDING"),
      ),
    );

  if (groupInfo.ownerId !== session.user.id) {
    await db.insert(notifications).values({
      userId: groupInfo.ownerId,
      type: "GROUP_REQUEST_REJECTED",
      title: "Group request rejected",
      message: `${session.user.name ?? session.user.email} rejected your ${groupInfo.serviceName} group request.`,
    });
  }

  redirectToRequests({ success: "Request rejected" });
}

export async function payGroupRequestAction(formData: FormData) {
  const session = await requireSession();
  const groupSubscriptionId = toText(formData.get("groupSubscriptionId"));
  if (!groupSubscriptionId) {
    redirectToRequests({ error: "Invalid request" });
  }

  const [split] = await db
    .select()
    .from(groupSubscriptionSplits)
    .where(
      and(
        eq(groupSubscriptionSplits.groupSubscriptionId, groupSubscriptionId),
        eq(groupSubscriptionSplits.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!split || split.paymentStatus !== "ACCEPTED") {
    redirectToRequests({ error: "Accept request before payment" });
  }

  const [groupSub] = await db
    .select({
      groupId: groupSubscriptions.groupId,
      serviceName: groupSubscriptions.serviceName,
    })
    .from(groupSubscriptions)
    .where(eq(groupSubscriptions.id, groupSubscriptionId))
    .limit(1);

  if (!groupSub) {
    redirectToRequests({ error: "Group subscription not found" });
  }

  const [ownerMember] = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupSub.groupId),
        eq(groupMembers.role, "OWNER"),
      ),
    )
    .limit(1);

  if (!ownerMember || ownerMember.userId === session.user.id) {
    redirectToRequests({ error: "Invalid owner mapping" });
  }

  const [senderWallet] = await db
    .select()
    .from(wallet)
    .where(eq(wallet.userId, session.user.id))
    .limit(1);
  const [receiverWallet] = await db
    .select()
    .from(wallet)
    .where(eq(wallet.userId, ownerMember.userId))
    .limit(1);

  if (!senderWallet || !receiverWallet) {
    redirectToRequests({ error: "Wallet not found for transfer" });
  }

  const amount = Number.parseFloat(split.shareAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    redirectToRequests({ error: "Invalid share amount" });
  }

  const [debited] = await db
    .update(wallet)
    .set({ balance: sql`${wallet.balance} - ${amount}` })
    .where(and(eq(wallet.id, senderWallet.id), gte(wallet.balance, amount.toFixed(2))))
    .returning({ id: wallet.id });

  if (!debited) {
    await db
      .update(groupSubscriptionSplits)
      .set({ paymentStatus: "PENDING" })
      .where(
        and(
          eq(groupSubscriptionSplits.groupSubscriptionId, groupSubscriptionId),
          eq(groupSubscriptionSplits.userId, session.user.id),
        ),
      );
    redirectToRequests({ error: "Insufficient wallet balance. Please accept again." });
  }

  await db
    .update(wallet)
    .set({ balance: sql`${wallet.balance} + ${amount}` })
    .where(eq(wallet.id, receiverWallet.id));

  const [transfer] = await db
    .insert(internalTransfers)
    .values({
      senderId: session.user.id,
      receiverId: ownerMember.userId,
      amount: amount.toFixed(2),
      status: "COMPLETED",
    })
    .returning({ id: internalTransfers.id });

  await db.insert(transactions).values({
    userId: session.user.id,
    walletId: senderWallet.id,
    amount: amount.toFixed(2),
    type: "TRANSFER_OUT",
    referenceType: "GROUP_MEMBER_PAYMENT",
    referenceId: transfer.id,
    description: `Paid owner for ${groupSub.serviceName} group.`,
    status: "SUCCESSFUL",
  });

  await db.insert(transactions).values({
    userId: ownerMember.userId,
    walletId: receiverWallet.id,
    amount: amount.toFixed(2),
    type: "TRANSFER_IN",
    referenceType: "GROUP_MEMBER_PAYMENT",
    referenceId: transfer.id,
    description: `Received member payment for ${groupSub.serviceName} group.`,
    status: "SUCCESSFUL",
  });

  await db
    .update(groupSubscriptionSplits)
    .set({ paymentStatus: "PAID", paidAt: new Date() })
    .where(
      and(
        eq(groupSubscriptionSplits.groupSubscriptionId, groupSubscriptionId),
        eq(groupSubscriptionSplits.userId, session.user.id),
      ),
    );

  const pendingSettlements = await db
    .select()
    .from(groupMemberSettlements)
    .where(
      and(
        eq(groupMemberSettlements.groupSubscriptionId, groupSubscriptionId),
        eq(groupMemberSettlements.triggerMemberId, session.user.id),
        eq(groupMemberSettlements.status, "PENDING"),
      ),
    );

  for (const settlement of pendingSettlements) {
    const settlementAmount = Number.parseFloat(settlement.amount);
    if (!Number.isFinite(settlementAmount) || settlementAmount <= 0) continue;

    const [ownerWallet] = await db
      .select()
      .from(wallet)
      .where(eq(wallet.userId, settlement.fromUserId))
      .limit(1);
    const [memberWallet] = await db
      .select()
      .from(wallet)
      .where(eq(wallet.userId, settlement.toUserId))
      .limit(1);

    if (!ownerWallet || !memberWallet) continue;

    const [ownerDebited] = await db
      .update(wallet)
      .set({ balance: sql`${wallet.balance} - ${settlementAmount}` })
      .where(
        and(
          eq(wallet.id, ownerWallet.id),
          gte(wallet.balance, settlementAmount.toFixed(2)),
        ),
      )
      .returning({ id: wallet.id });

    if (!ownerDebited) continue;

    await db
      .update(wallet)
      .set({ balance: sql`${wallet.balance} + ${settlementAmount}` })
      .where(eq(wallet.id, memberWallet.id));

    const [transfer] = await db
      .insert(internalTransfers)
      .values({
        senderId: settlement.fromUserId,
        receiverId: settlement.toUserId,
        amount: settlementAmount.toFixed(2),
        status: "COMPLETED",
      })
      .returning({ id: internalTransfers.id });

    await db
      .update(groupMemberSettlements)
      .set({
        internalTransferId: transfer.id,
        status: "COMPLETED",
        completedAt: new Date(),
      })
      .where(eq(groupMemberSettlements.id, settlement.id));

    await db.insert(transactions).values({
      userId: settlement.fromUserId,
      walletId: ownerWallet.id,
      amount: settlementAmount.toFixed(2),
      type: "TRANSFER_OUT",
      referenceType: "GROUP_EDIT_ADJUSTMENT",
      referenceId: transfer.id,
      description: `Adjustment transfer after new member payment.`,
      status: "SUCCESSFUL",
    });

    await db.insert(transactions).values({
      userId: settlement.toUserId,
      walletId: memberWallet.id,
      amount: settlementAmount.toFixed(2),
      type: "TRANSFER_IN",
      referenceType: "GROUP_EDIT_ADJUSTMENT",
      referenceId: transfer.id,
      description: `Adjustment received after group split update.`,
      status: "SUCCESSFUL",
    });
  }

  redirect("/existing-groups?success=Payment successful");
}

function redirectToExistingGroups(params: Record<string, string | undefined>): never {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  redirect(`/existing-groups?${query.toString()}`);
}

export async function updateGroupPasswordAction(formData: FormData) {
  const session = await requireSession();
  const groupSubscriptionId = toText(formData.get("groupSubscriptionId"));
  const newPassword = toText(formData.get("newPassword"));

  if (!groupSubscriptionId || !newPassword) {
    redirectToExistingGroups({ error: "Invalid password update payload" });
  }

  const [ownerGroup] = await db
    .select({
      groupSubscriptionId: groupSubscriptions.id,
      subscriptionId: groupSubscriptions.subscriptionId,
    })
    .from(groupSubscriptions)
    .innerJoin(groups, eq(groups.id, groupSubscriptions.groupId))
    .where(
      and(
        eq(groupSubscriptions.id, groupSubscriptionId),
        eq(groups.createdBy, session.user.id),
      ),
    )
    .limit(1);

  if (!ownerGroup) {
    redirectToExistingGroups({ error: "Only owner can edit credentials" });
  }

  await db
    .update(groupSubscriptions)
    .set({ externalAccountPassword: newPassword })
    .where(eq(groupSubscriptions.id, ownerGroup.groupSubscriptionId));

  if (ownerGroup.subscriptionId) {
    await db
      .update(subscriptions)
      .set({ externalAccountPassword: newPassword })
      .where(eq(subscriptions.id, ownerGroup.subscriptionId));
  }

  redirectToExistingGroups({ success: "Password updated" });
}

export async function editGroupMembersAction(formData: FormData) {
  const session = await requireSession();
  const groupSubscriptionId = toText(formData.get("groupSubscriptionId"));
  const existingMembersRaw = toText(formData.get("existingMembers"));
  const newMembersRaw = toText(formData.get("newMembers"));
  const newPasswordRaw = formData.get("newPassword");
  const newPassword =
    typeof newPasswordRaw === "string" ? newPasswordRaw.trim() : "";

  if (!groupSubscriptionId || !existingMembersRaw || !newMembersRaw) {
    redirectToExistingGroups({ error: "Invalid edit payload" });
  }

  let existingMembersPayload: Array<{ userId: string; percentage: number }> = [];
  let newMembersPayload: Array<{ email: string; percentage: number }> = [];
  try {
    const parsedExisting = JSON.parse(existingMembersRaw) as Array<{
      userId: string;
      percentage: number;
    }>;
    const parsedNew = JSON.parse(newMembersRaw) as Array<{
      email: string;
      percentage: number;
    }>;
    existingMembersPayload = Array.isArray(parsedExisting) ? parsedExisting : [];
    newMembersPayload = Array.isArray(parsedNew) ? parsedNew : [];
  } catch {
    redirectToExistingGroups({ error: "Malformed edit payload" });
  }

  const [groupRow] = await db
    .select({
      groupId: groupSubscriptions.groupId,
      subscriptionId: groupSubscriptions.subscriptionId,
      totalCost: groupSubscriptions.totalCost,
      planMembers: subscriptions.planMembers,
    })
    .from(groupSubscriptions)
    .innerJoin(groups, eq(groups.id, groupSubscriptions.groupId))
    .leftJoin(subscriptions, eq(subscriptions.id, groupSubscriptions.subscriptionId))
    .where(
      and(
        eq(groupSubscriptions.id, groupSubscriptionId),
        eq(groups.createdBy, session.user.id),
      ),
    )
    .limit(1);

  if (!groupRow) {
    redirectToExistingGroups({ error: "Only owner can edit this group" });
  }

  const currentSplits = await db
    .select({
      userId: groupSubscriptionSplits.userId,
      sharePercentage: groupSubscriptionSplits.sharePercentage,
      shareAmount: groupSubscriptionSplits.shareAmount,
      role: groupMembers.role,
    })
    .from(groupSubscriptionSplits)
    .innerJoin(groupMembers, eq(groupMembers.userId, groupSubscriptionSplits.userId))
    .where(
      and(
        eq(groupSubscriptionSplits.groupSubscriptionId, groupSubscriptionId),
        eq(groupMembers.groupId, groupRow.groupId),
      ),
    );

  const existingMap = new Map(existingMembersPayload.map((x) => [x.userId, x.percentage]));
  if (existingMap.size !== currentSplits.length) {
    redirectToExistingGroups({ error: "All existing members must be included" });
  }

  for (const split of currentSplits) {
    const nextPct = existingMap.get(split.userId);
    if (nextPct === undefined || nextPct < 0 || nextPct > 100) {
      redirectToExistingGroups({ error: "Invalid percentage values" });
    }
    if (nextPct > split.sharePercentage) {
      redirectToExistingGroups({
        error: "Existing member percentage can only stay same or decrease",
      });
    }
  }

  const normalizedNewMembers = newMembersPayload
    .map((member) => ({
      email: normalizeEmail(member.email ?? ""),
      percentage: Number.isFinite(member.percentage) ? member.percentage : 0,
    }))
    .filter((member) => member.email.length > 0);

  if (normalizedNewMembers.length === 0) {
    redirectToExistingGroups({ error: "Add at least one new member to confirm changes" });
  }

  if (normalizedNewMembers.length > 1) {
    redirectToExistingGroups({ error: "Please add one new member at a time" });
  }

  if (normalizedNewMembers.some((member) => member.percentage <= 0 || member.percentage > 100)) {
    redirectToExistingGroups({ error: "New member percentage must be between 1 and 100" });
  }

  const newMemberEmails = Array.from(new Set(normalizedNewMembers.map((x) => x.email)));
  if (newMemberEmails.length !== normalizedNewMembers.length) {
    redirectToExistingGroups({ error: "Duplicate new member emails are not allowed" });
  }

  const currentUserIds = currentSplits.map((x) => x.userId);
  const currentUsers = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(inArray(user.id, currentUserIds));
  const existingEmailSet = new Set(currentUsers.map((x) => normalizeEmail(x.email)));
  if (newMemberEmails.some((email) => existingEmailSet.has(email))) {
    redirectToExistingGroups({ error: "New member already exists in this group" });
  }
  if (newMemberEmails.includes(normalizeEmail(session.user.email))) {
    redirectToExistingGroups({ error: "Owner email cannot be added as new member" });
  }

  const newMemberUsers = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(inArray(user.email, newMemberEmails));
  if (newMemberUsers.length !== newMemberEmails.length) {
    redirectToExistingGroups({ error: "New member email must belong to PayXen user" });
  }

  const existingTotal = currentSplits.reduce(
    (sum, split) => sum + (existingMap.get(split.userId) ?? 0),
    0,
  );
  const newTotal = normalizedNewMembers.reduce((sum, member) => sum + member.percentage, 0);
  if (Math.abs(existingTotal + newTotal - 100) > 0.001) {
    redirectToExistingGroups({ error: "Total percentage must be exactly 100" });
  }

  const ownerSplit = currentSplits.find((x) => x.role === "OWNER");
  if (!ownerSplit) {
    redirectToExistingGroups({ error: "Owner split not found" });
  }

  const totalCost = Number.parseFloat(groupRow.totalCost);
  const round2 = (value: number) => Number(value.toFixed(2));

  for (const split of currentSplits) {
    const pct = existingMap.get(split.userId)!;
    const amount = round2((pct / 100) * totalCost);
    await db
      .update(groupSubscriptionSplits)
      .set({
        sharePercentage: Math.round(pct),
        shareAmount: amount.toFixed(2),
      })
      .where(
        and(
          eq(groupSubscriptionSplits.groupSubscriptionId, groupSubscriptionId),
          eq(groupSubscriptionSplits.userId, split.userId),
        ),
      );
  }

  const emailToUserId = new Map(
    newMemberUsers.map((memberUser) => [normalizeEmail(memberUser.email), memberUser.id]),
  );
  const triggerMemberId = emailToUserId.get(normalizedNewMembers[0].email)!;

  await db.insert(groupMembers).values(
    normalizedNewMembers.map((member) => ({
      groupId: groupRow.groupId,
      userId: emailToUserId.get(member.email)!,
      role: "MEMBER" as const,
    })),
  );

  await db.insert(groupSubscriptionSplits).values(
    normalizedNewMembers.map((member) => ({
      groupSubscriptionId,
      userId: emailToUserId.get(member.email)!,
      sharePercentage: Math.round(member.percentage),
      shareAmount: round2((member.percentage / 100) * totalCost).toFixed(2),
      paymentStatus: "PENDING" as const,
      paidAt: null,
    })),
  );

  for (const split of currentSplits) {
    if (split.role !== "MEMBER") continue;
    const oldAmount = Number.parseFloat(split.shareAmount);
    const nextPct = existingMap.get(split.userId)!;
    const newAmount = round2((nextPct / 100) * totalCost);
    const diff = round2(oldAmount - newAmount);
    if (diff <= 0) continue;

    await db.insert(groupMemberSettlements).values({
      groupSubscriptionId,
      triggerMemberId,
      fromUserId: ownerSplit.userId,
      toUserId: split.userId,
      amount: diff.toFixed(2),
      status: "PENDING",
    });
  }

  if (newPassword.length > 0) {
    await db
      .update(groupSubscriptions)
      .set({ externalAccountPassword: newPassword })
      .where(eq(groupSubscriptions.id, groupSubscriptionId));
    if (groupRow.subscriptionId) {
      await db
        .update(subscriptions)
        .set({ externalAccountPassword: newPassword })
        .where(eq(subscriptions.id, groupRow.subscriptionId));
    }
  }

  redirectToExistingGroups({ success: "Group updated. New member request sent." });
}

export async function requestGroupDeleteAction(formData: FormData) {
  const session = await requireSession();
  const groupSubscriptionId = toText(formData.get("groupSubscriptionId"));

  if (!groupSubscriptionId) {
    redirectToExistingGroups({ error: "Invalid group delete request" });
  }

  const [row] = await db
    .select({
      id: groupSubscriptions.id,
      nextBillingDate: groupSubscriptions.nextBillingDate,
    })
    .from(groupSubscriptions)
    .innerJoin(groups, eq(groups.id, groupSubscriptions.groupId))
    .where(
      and(
        eq(groupSubscriptions.id, groupSubscriptionId),
        eq(groups.createdBy, session.user.id),
      ),
    )
    .limit(1);

  if (!row) {
    redirectToExistingGroups({ error: "Only owner can request delete" });
  }

  await db
    .update(groupSubscriptions)
    .set({
      deleteRequestStatus: "PENDING",
      deleteRequestedAt: new Date(),
    })
    .where(eq(groupSubscriptions.id, row.id));

  const cutoff = new Date(`${row.nextBillingDate}T00:00:00`);
  cutoff.setDate(cutoff.getDate() - 1);
  if (new Date() < cutoff) {
    redirectToExistingGroups({
      success: `Delete request is pending. It will execute on or after ${cutoff
        .toISOString()
        .slice(0, 10)}.`,
    });
  }

  await db
    .update(groupSubscriptions)
    .set({
      deletedAt: new Date(),
      deleteRequestStatus: "NONE",
      status: "CANCELLED",
    })
    .where(eq(groupSubscriptions.id, row.id));

  redirectToExistingGroups({ success: "Group deleted and moved to Deleted Groups." });
}

export async function cancelGroupDeleteAction(formData: FormData) {
  const session = await requireSession();
  const groupSubscriptionId = toText(formData.get("groupSubscriptionId"));

  if (!groupSubscriptionId) {
    redirectToExistingGroups({ error: "Invalid cancel request" });
  }

  const [row] = await db
    .select({ id: groupSubscriptions.id })
    .from(groupSubscriptions)
    .innerJoin(groups, eq(groups.id, groupSubscriptions.groupId))
    .where(
      and(
        eq(groupSubscriptions.id, groupSubscriptionId),
        eq(groups.createdBy, session.user.id),
      ),
    )
    .limit(1);

  if (!row) {
    redirectToExistingGroups({ error: "Only owner can cancel delete request" });
  }

  await db
    .update(groupSubscriptions)
    .set({
      deleteRequestStatus: "NONE",
      deleteRequestedAt: null,
    })
    .where(eq(groupSubscriptions.id, row.id));

  redirectToExistingGroups({ success: "Delete request cancelled." });
}

export async function requestMemberRemovalAction(formData: FormData) {
  const session = await requireSession();
  const groupSubscriptionId = toText(formData.get("groupSubscriptionId"));
  const memberUserId = toText(formData.get("memberUserId"));

  if (!groupSubscriptionId || !memberUserId) {
    redirectToExistingGroups({ error: "Invalid member removal request" });
  }

  const [row] = await db
    .select({
      groupId: groupSubscriptions.groupId,
      nextBillingDate: groupSubscriptions.nextBillingDate,
    })
    .from(groupSubscriptions)
    .innerJoin(groups, eq(groups.id, groupSubscriptions.groupId))
    .innerJoin(
      groupMembers,
      and(
        eq(groupMembers.groupId, groups.id),
        eq(groupMembers.userId, memberUserId),
        eq(groupMembers.role, "MEMBER"),
      ),
    )
    .innerJoin(
      groupSubscriptionSplits,
      and(
        eq(groupSubscriptionSplits.groupSubscriptionId, groupSubscriptions.id),
        eq(groupSubscriptionSplits.userId, memberUserId),
      ),
    )
    .where(
      and(
        eq(groupSubscriptions.id, groupSubscriptionId),
        eq(groups.createdBy, session.user.id),
      ),
    )
    .limit(1);

  if (!row) {
    redirectToExistingGroups({ error: "Only owner can remove an existing member" });
  }

  await db
    .update(groupSubscriptionSplits)
    .set({
      removalRequestStatus: "PENDING",
      removalRequestedAt: new Date(),
      removedAt: null,
    })
    .where(
      and(
        eq(groupSubscriptionSplits.groupSubscriptionId, groupSubscriptionId),
        eq(groupSubscriptionSplits.userId, memberUserId),
      ),
    );

  const cutoff = new Date(`${row.nextBillingDate}T00:00:00`);
  cutoff.setDate(cutoff.getDate() - 1);
  redirectToExistingGroups({
    success: `Member removal scheduled for ${cutoff.toISOString().slice(0, 10)}.`,
  });
}

export async function cancelMemberRemovalAction(formData: FormData) {
  const session = await requireSession();
  const groupSubscriptionId = toText(formData.get("groupSubscriptionId"));
  const memberUserId = toText(formData.get("memberUserId"));

  if (!groupSubscriptionId || !memberUserId) {
    redirectToExistingGroups({ error: "Invalid cancel removal request" });
  }

  const [row] = await db
    .select({ id: groupSubscriptions.id })
    .from(groupSubscriptions)
    .innerJoin(groups, eq(groups.id, groupSubscriptions.groupId))
    .innerJoin(
      groupMembers,
      and(
        eq(groupMembers.groupId, groups.id),
        eq(groupMembers.userId, memberUserId),
        eq(groupMembers.role, "MEMBER"),
      ),
    )
    .where(
      and(
        eq(groupSubscriptions.id, groupSubscriptionId),
        eq(groups.createdBy, session.user.id),
      ),
    )
    .limit(1);

  if (!row) {
    redirectToExistingGroups({ error: "Only owner can cancel member removal" });
  }

  await db
    .update(groupSubscriptionSplits)
    .set({
      removalRequestStatus: "NONE",
      removalRequestedAt: null,
      removedAt: null,
    })
    .where(
      and(
        eq(groupSubscriptionSplits.groupSubscriptionId, groupSubscriptionId),
        eq(groupSubscriptionSplits.userId, memberUserId),
      ),
    );

  redirectToExistingGroups({ success: "Member removal cancelled." });
}
