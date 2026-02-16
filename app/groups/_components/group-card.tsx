"use client";

import { useMemo, useState } from "react";
import { IconArrowRight, IconCrown, IconPlus, IconTrash, IconUser, IconX } from "@tabler/icons-react";
import {
  acceptGroupRequestAction,
  cancelMemberRemovalAction,
  cancelGroupDeleteAction,
  editGroupMembersAction,
  payGroupRequestAction,
  requestMemberRemovalAction,
  rejectGroupRequestAction,
  requestGroupDeleteAction,
  updateGroupPasswordAction,
} from "@/app/groups/actions";
import { GroupCredentials } from "@/app/groups/_components/group-credentials";
import { getServiceMeta } from "@/app/groups/service-meta";
import type { GroupCardView, GroupPaymentStatus } from "@/app/groups/types";

type GroupCardProps = {
  card: GroupCardView;
  showCredentials: boolean;
  requestMode?: boolean;
  deletedView?: boolean;
  walletBalance?: string;
};

type DraftMember = {
  id: string;
  email: string;
  percentage: number;
};

const formatInr = (value: string | number) => {
  const num = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(num)) return "₹0.00";
  return `₹${num.toFixed(2)}`;
};

function statusClass(status: GroupPaymentStatus) {
  if (status === "PAID") return "text-green-700 bg-green-100";
  if (status === "REJECTED") return "text-red-700 bg-red-100";
  if (status === "ACCEPTED") return "text-blue-700 bg-blue-100";
  if (status === "REMOVED") return "text-red-700 bg-red-100";
  return "text-yellow-700 bg-yellow-100";
}

function subscriptionStatusClass(
  status: "ACTIVE" | "PENDING" | "CANCELLED" | "INACTIVE",
) {
  if (status === "ACTIVE") return "bg-green-100 text-green-700";
  if (status === "PENDING") return "bg-yellow-100 text-yellow-700";
  if (status === "CANCELLED") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

export function GroupCard({
  card,
  showCredentials,
  requestMode = false,
  deletedView = false,
  walletBalance = "0",
}: GroupCardProps) {
  const serviceMeta = getServiceMeta(card.serviceKey);
  const ServiceIcon = serviceMeta?.icon ?? IconUser;
  const totalCost = Number.parseFloat(card.totalCost || "0");
  const deletionDate = useMemo(() => {
    const date = new Date(`${card.nextBillingDate}T00:00:00`);
    date.setDate(date.getDate() - 1);
    return date.toISOString().slice(0, 10);
  }, [card.nextBillingDate]);

  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState(card.externalAccountPassword ?? "");
  const [existingPercentages, setExistingPercentages] = useState<Record<string, number>>(
    Object.fromEntries(card.members.map((member) => [member.userId, member.percentage])),
  );
  const [newMembers, setNewMembers] = useState<DraftMember[]>([]);

  const originalPctMap = useMemo(
    () => Object.fromEntries(card.members.map((member) => [member.userId, member.percentage])),
    [card.members],
  );

  const validNewMembers = newMembers.filter((member) => member.email.trim().length > 0);
  const showConfirmOption = validNewMembers.length > 0;
  const passwordChanged = passwordDraft !== (card.externalAccountPassword ?? "");

  const existingPayload = JSON.stringify(
    card.members.map((member) => ({
      userId: member.userId,
      percentage: existingPercentages[member.userId] ?? member.percentage,
    })),
  );
  const newMembersPayload = JSON.stringify(
    validNewMembers.map((member) => ({
      email: member.email.trim().toLowerCase(),
      percentage: member.percentage,
    })),
  );

  const totalPct = useMemo(() => {
    const existing = card.members.reduce(
      (sum, member) => sum + (existingPercentages[member.userId] ?? member.percentage),
      0,
    );
    const added = validNewMembers.reduce((sum, member) => sum + member.percentage, 0);
    return existing + added;
  }, [card.members, existingPercentages, validNewMembers]);

  const settlementPreview = useMemo(() => {
    return card.members
      .filter((member) => member.role === "MEMBER")
      .map((member) => {
        const oldPct = originalPctMap[member.userId] ?? member.percentage;
        const newPct = existingPercentages[member.userId] ?? member.percentage;
        const oldAmt = (oldPct / 100) * totalCost;
        const newAmt = (newPct / 100) * totalCost;
        const diff = Number((oldAmt - newAmt).toFixed(2));
        return {
          email: member.email,
          amount: diff > 0 ? diff : 0,
        };
      })
      .filter((item) => item.amount > 0);
  }, [card.members, existingPercentages, originalPctMap, totalCost]);

  const addNewMemberRow = () => {
    setNewMembers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), email: "", percentage: 0 },
    ]);
  };

  const setExistingPct = (userId: string, nextValue: number) => {
    const original = originalPctMap[userId] ?? 0;
    const clamped = Math.max(0, Math.min(original, Number.isFinite(nextValue) ? nextValue : 0));
    setExistingPercentages((prev) => ({ ...prev, [userId]: clamped }));
  };

  const setNewMember = (id: string, patch: Partial<DraftMember>) => {
    setNewMembers((prev) =>
      prev.map((member) => (member.id === id ? { ...member, ...patch } : member)),
    );
  };

  return (
    <article className="rounded-xl border p-4">
      <div className="mb-2 flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${subscriptionStatusClass(card.subscriptionStatus)}`}
        >
          {card.subscriptionStatus}
        </span>
        {card.viewerRole === "OWNER" && !requestMode && !deletedView ? (
          <div className="flex gap-2">
          <button
            className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
            onClick={() => setIsEditing(true)}
            type="button"
          >
            Edit
          </button>
          <form action={requestGroupDeleteAction}>
            <input name="groupSubscriptionId" type="hidden" value={card.groupSubscriptionId} />
            <button className="rounded-md border p-1.5 hover:bg-muted" title="Delete group" type="submit">
              <IconTrash className="h-4 w-4 text-red-700" />
            </button>
          </form>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-md border bg-muted/20 p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md border bg-background">
              <ServiceIcon className="h-5 w-5" style={{ color: serviceMeta?.color }} />
            </span>
            <div>
              <p className="font-medium">{card.serviceName}</p>
              <p className="text-xs text-muted-foreground">{card.groupName}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Plan: {card.planName ?? "Standard"}
          </p>
          <p className="text-xs text-muted-foreground">Total: {formatInr(card.totalCost)}</p>
          <p className="text-xs text-muted-foreground">Next billing: {card.nextBillingDate}</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-xs font-medium">
              Group status:{" "}
              {card.deleteRequestStatus === "PENDING" ? (
                <span className="text-orange-700">DELETE PENDING</span>
              ) : (
                <span className="text-green-700">ACTIVE</span>
              )}
            </p>
            {card.viewerRole === "OWNER" &&
            !deletedView &&
            card.deleteRequestStatus === "PENDING" ? (
              <form action={cancelGroupDeleteAction}>
                <input name="groupSubscriptionId" type="hidden" value={card.groupSubscriptionId} />
                <button className="rounded-md border px-2 py-1 text-xs hover:bg-muted" type="submit">
                  Cancel
                </button>
              </form>
            ) : null}
          </div>
          {card.deleteRequestStatus === "PENDING" ? (
            <p
              className={`text-[10px] leading-none text-muted-foreground/70 ${
                card.viewerRole === "OWNER" ? "-mt-1" : "mt-0.5"
              }`}
            >
              Deletion date: {deletionDate}
            </p>
          ) : null}
        </div>

        {showCredentials ? (
          <GroupCredentials
            email={card.externalAccountEmail}
            password={card.externalAccountPassword}
          />
        ) : (
          <div className="flex min-h-[140px] items-center justify-center rounded-md border bg-muted/20 p-3 text-center">
            <p className="text-sm text-muted-foreground">
              Credentials will be visible after payment.
            </p>
          </div>
        )}

        <div className="rounded-md border bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">Owner: {card.ownerName}</p>
          {deletedView && card.viewerRole === "MEMBER" && card.viewerStatus === "REMOVED" ? (
            <p className="mt-1 text-xs font-medium text-red-700">Your status: REMOVED</p>
          ) : null}
          <div className="mt-3 space-y-2">
            {card.members.map((member) => (
              <div
                className="flex items-center justify-between rounded-md border bg-background px-2 py-1.5"
                key={member.userId}
              >
                <div className="flex items-center gap-2">
                  <IconUser className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p
                      className={
                        member.removalRequestStatus === "PENDING"
                          ? "text-sm font-medium text-red-700"
                          : "text-sm"
                      }
                    >
                      {member.name}
                    </p>
                    {member.removalRequestStatus === "PENDING" ? (
                      <p className="text-[11px] text-red-600">Removal scheduled: {deletionDate}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {card.viewerRole === "OWNER" ? (
                    <p className="text-xs text-muted-foreground">
                      {member.percentage}% | {formatInr(member.amount)}
                    </p>
                  ) : null}
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass(member.status)}`}>
                    {member.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {requestMode ? (
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
          {card.viewerStatus === "PENDING" ? (
            <>
              <form action={rejectGroupRequestAction}>
                <input name="groupSubscriptionId" type="hidden" value={card.groupSubscriptionId} />
                <button
                  className="flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  type="submit"
                >
                  <IconX className="h-4 w-4" />
                  Reject
                </button>
              </form>
              <form action={acceptGroupRequestAction}>
                <input name="groupSubscriptionId" type="hidden" value={card.groupSubscriptionId} />
                <button
                  className="flex items-center gap-1 rounded-md border border-blue-300 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50"
                  type="submit"
                >
                  <IconArrowRight className="h-4 w-4" />
                  Accept
                </button>
              </form>
            </>
          ) : null}

          {card.viewerStatus === "ACCEPTED" ? (
            <form action={payGroupRequestAction}>
              <input name="groupSubscriptionId" type="hidden" value={card.groupSubscriptionId} />
              <button
                className="rounded-md bg-black px-3 py-1.5 text-sm text-white hover:opacity-90"
                type="submit"
              >
                Pay now
              </button>
            </form>
          ) : null}
          </div>
          {card.viewerStatus === "ACCEPTED" ? (
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
              <div className="grid grid-cols-[auto_auto] items-center gap-x-4 gap-y-1">
                <p className="text-muted-foreground">Price</p>
                <p className="text-right font-semibold">
                  ₹{Number.parseFloat(card.viewerShareAmount ?? "0").toFixed(2)}
                </p>
                <p className="text-muted-foreground">Wallet balance</p>
                <p className="text-right">
                  ₹{Number.parseFloat(walletBalance).toFixed(2)}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {isEditing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-lg border bg-background p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Edit Group</h3>
              <button
                className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                onClick={() => setIsEditing(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-md border bg-background p-2">
                <p className="mb-1 text-xs text-muted-foreground">Password</p>
                <div className="flex gap-2">
                  <input
                    className="w-full rounded-md border px-2 py-1 text-sm"
                    onChange={(e) => setPasswordDraft(e.target.value)}
                    type="text"
                    value={passwordDraft}
                  />
                  {passwordChanged ? (
                    <form action={updateGroupPasswordAction}>
                      <input
                        name="groupSubscriptionId"
                        type="hidden"
                        value={card.groupSubscriptionId}
                      />
                      <input name="newPassword" type="hidden" value={passwordDraft} />
                      <button
                        className="rounded-md bg-black px-3 py-1 text-xs text-white"
                        type="submit"
                      >
                        Save
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>

              <div className="rounded-md border bg-background p-2">
                <p className="mb-2 text-xs text-muted-foreground">
                  Members (email, percentage, price)
                </p>
                <div className="space-y-2">
                  {card.members.map((member) => {
                    const original = originalPctMap[member.userId] ?? member.percentage;
                    const draftPct = existingPercentages[member.userId] ?? member.percentage;
                    return (
                      <div
                        className="grid gap-2 rounded-md border p-2 md:grid-cols-[auto_1fr_auto_auto]"
                        key={member.userId}
                      >
                        {member.role === "OWNER" ? (
                          <div className="flex w-8 items-center justify-center rounded-md border border-amber-300 bg-amber-50 text-amber-700">
                            <IconCrown className="h-3.5 w-3.5" />
                          </div>
                        ) : member.removalRequestStatus === "PENDING" ? (
                          <form action={cancelMemberRemovalAction}>
                            <input
                              name="groupSubscriptionId"
                              type="hidden"
                              value={card.groupSubscriptionId}
                            />
                            <input name="memberUserId" type="hidden" value={member.userId} />
                            <button
                              className="h-full rounded-md border border-red-300 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50"
                              type="submit"
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <form action={requestMemberRemovalAction}>
                            <input
                              name="groupSubscriptionId"
                              type="hidden"
                              value={card.groupSubscriptionId}
                            />
                            <input name="memberUserId" type="hidden" value={member.userId} />
                            <button
                              className="h-full rounded-md border border-red-300 p-1.5 text-red-700 hover:bg-red-50"
                              title="Delete member"
                              type="submit"
                            >
                              <IconTrash className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        )}
                        <input
                          className={`rounded-md border px-2 py-1 text-xs ${
                            member.removalRequestStatus === "PENDING"
                              ? "border-red-300 text-red-700"
                              : ""
                          }`}
                          disabled
                          size={22}
                          type="email"
                          value={member.email}
                        />
                        <input
                          className="w-16 rounded-md border px-2 py-1 text-xs"
                          disabled={member.removalRequestStatus === "PENDING"}
                          max={original}
                          min={0}
                          onChange={(e) =>
                            setExistingPct(
                              member.userId,
                              Number.parseInt(e.target.value || "0", 10),
                            )
                          }
                          type="number"
                          value={draftPct}
                        />
                        <p className="rounded-md border px-2 py-1 text-xs">
                          {formatInr((draftPct / 100) * totalCost)}
                        </p>
                      </div>
                    );
                  })}

                  {newMembers.map((member) => (
                    <div
                      className="grid gap-2 rounded-md border border-dashed p-2 md:grid-cols-[1fr_auto_auto]"
                      key={member.id}
                    >
                      <input
                        className="rounded-md border px-2 py-1 text-xs"
                        onChange={(e) => setNewMember(member.id, { email: e.target.value })}
                        placeholder="newmember@email.com"
                        size={22}
                        type="email"
                        value={member.email}
                      />
                      <input
                        className="w-16 rounded-md border px-2 py-1 text-xs"
                        max={100}
                        min={0}
                        onChange={(e) =>
                          setNewMember(member.id, {
                            percentage: Number.parseInt(e.target.value || "0", 10),
                          })
                        }
                        type="number"
                        value={member.percentage}
                      />
                      <p className="rounded-md border px-2 py-1 text-xs">
                        {formatInr((member.percentage / 100) * totalCost)}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  className="mt-2 flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                  onClick={addNewMemberRow}
                  type="button"
                >
                  <IconPlus className="h-3.5 w-3.5" />
                  Add member
                </button>
              </div>

              <p className={totalPct === 100 ? "text-xs text-green-700" : "text-xs text-red-700"}>
                Total percentage: {totalPct}% {totalPct === 100 ? "(valid)" : "(must be 100)"}
              </p>

              {showConfirmOption ? (
                <button
                  className="rounded-md bg-black px-3 py-1.5 text-xs text-white disabled:opacity-50"
                  disabled={totalPct !== 100}
                  onClick={() => setShowConfirmModal(true)}
                  type="button"
                >
                  Confirm
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showConfirmModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border bg-background p-4">
            <h3 className="text-base font-semibold">Are you sure?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              New member request will be sent. Owner-to-member adjustment transfers stay pending
              and complete only after this new member pays.
            </p>

            <div className="mt-3 rounded-md border p-2 text-xs">
              <p className="font-medium">New member</p>
              {validNewMembers.map((member) => (
                <p key={member.id}>
                  {member.email} | {member.percentage}% | {formatInr((member.percentage / 100) * totalCost)}
                </p>
              ))}
            </div>

            <div className="mt-3 rounded-md border p-2 text-xs">
              <p className="font-medium">Will be debited from owner and credited to members</p>
              {settlementPreview.length === 0 ? (
                <p>No transfer needed.</p>
              ) : (
                settlementPreview.map((item) => (
                  <p key={item.email}>
                    {item.email} : {formatInr(item.amount)}
                  </p>
                ))
              )}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                className="rounded-md border px-3 py-1.5 text-xs"
                onClick={() => setShowConfirmModal(false)}
                type="button"
              >
                Cancel
              </button>
              <form action={editGroupMembersAction}>
                <input name="groupSubscriptionId" type="hidden" value={card.groupSubscriptionId} />
                <input name="existingMembers" type="hidden" value={existingPayload} />
                <input name="newMembers" type="hidden" value={newMembersPayload} />
                <input name="newPassword" type="hidden" value={passwordDraft} />
                <button className="rounded-md bg-black px-3 py-1.5 text-xs text-white" type="submit">
                  Confirm again
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
