"use client";

import { IconPlus, IconTrash, IconUsers } from "@tabler/icons-react";
import { useFormStatus } from "react-dom";
import { createGroupAction } from "@/app/groups/actions";
import { getServiceMeta } from "@/app/groups/service-meta";
import type { ActiveSubscription, GroupMemberInput } from "@/app/groups/types";

type AddMembersStepProps = {
  ownerName: string;
  selectedPlan: ActiveSubscription;
  groupName: string;
  onGroupNameChange: (value: string) => void;
  ownerPercentage: number;
  onOwnerPercentageChange: (value: number) => void;
  members: GroupMemberInput[];
  onMemberEmailChange: (id: string, value: string) => void;
  onMemberPercentageChange: (id: string, value: number) => void;
  onRemoveMember: (id: string) => void;
  onAddMember: () => void;
};

export function AddMembersStep({
  ownerName,
  selectedPlan,
  groupName,
  onGroupNameChange,
  ownerPercentage,
  onOwnerPercentageChange,
  members,
  onMemberEmailChange,
  onMemberPercentageChange,
  onRemoveMember,
  onAddMember,
}: AddMembersStepProps) {
  const serviceMeta = getServiceMeta(selectedPlan.serviceKey);
  const Icon = serviceMeta?.icon ?? IconUsers;
  const totalPlanPrice = Number.parseFloat(selectedPlan.monthlyCost || "0");
  const ownerPct = Math.max(0, Math.min(100, ownerPercentage));

  const totalPercentage = ownerPct + members.reduce((acc, member) => acc + member.percentage, 0);
  const isTotalValid = totalPercentage === 100;
  const validMembers = members.filter((member) => member.email.trim().length > 0);
  const hasAtLeastOneMember = validMembers.length > 0;
  const ownerPrice = (ownerPct / 100) * totalPlanPrice;
  const membersPayload = JSON.stringify(
    validMembers.map((member) => ({
      email: member.email.trim().toLowerCase(),
      percentage: Math.max(0, member.percentage),
    })),
  );

  const formatInr = (value: number) => {
    if (!Number.isFinite(value)) return "₹0.00";
    return `₹${value.toFixed(2)}`;
  };

  return (
    <section className="rounded-xl border p-6 transition-colors hover:bg-muted/10">
      <h2 className="text-lg font-semibold">Step 2: Add Members</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add member emails and set percentage split. Total must be 100%.
      </p>

      <div className="mt-6 flex flex-col items-center gap-4 rounded-lg border p-6 text-center transition-colors hover:bg-muted/10">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted/30 transition-colors hover:bg-muted/50">
          <Icon className="h-6 w-6" style={{ color: serviceMeta?.color }} />
        </span>
        <p className="text-lg font-semibold">{selectedPlan.serviceName}</p>

        <div className="w-full max-w-xl">
          <label className="mb-1 block text-left text-xs text-muted-foreground">
            Group name
          </label>
          <input
            className="w-full rounded-md border px-3 py-2 text-sm transition-colors hover:border-primary/60"
            onChange={(e) => onGroupNameChange(e.target.value)}
            placeholder="Enter group name"
            type="text"
            value={groupName}
          />
        </div>

        <div className="w-full max-w-xl rounded-md border bg-muted/20 p-3 transition-colors hover:bg-muted/30">
          <div className="grid items-center gap-3 md:grid-cols-[auto_1fr_auto]">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
              <IconUsers className="h-4 w-4 text-muted-foreground" />
            </span>

            <div>
              <p className="text-left text-xs text-muted-foreground">Owner</p>
              <input
                className="w-full rounded-md border bg-muted px-3 py-2 text-sm"
                disabled
                type="text"
                value={ownerName}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                className="w-20 rounded-md border px-3 py-2 text-sm transition-colors hover:border-primary/60"
                max={100}
                min={0}
                onChange={(e) =>
                  onOwnerPercentageChange(Number.parseInt(e.target.value || "0", 10))
                }
                type="number"
                value={ownerPct}
              />
              <span className="text-sm text-muted-foreground">%</span>
              <div className="rounded-md border bg-background px-2 py-1 text-xs font-medium">
                {formatInr(ownerPrice)}
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-xl space-y-3">
          {members.map((member, index) => (
            <div
              className="rounded-md border bg-muted/20 p-3 transition-colors hover:bg-muted/30"
              key={member.id}
            >
              <div
                className={`grid items-center gap-3 ${
                  index === 0
                    ? "md:grid-cols-[auto_1fr_auto]"
                    : "md:grid-cols-[auto_auto_1fr_auto]"
                }`}
              >
                {index === 0 ? (
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                    <IconUsers className="h-4 w-4 text-muted-foreground" />
                  </span>
                ) : (
                  <>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-red-800 bg-red-950 text-red-400 transition-colors hover:bg-red-900"
                      onClick={() => onRemoveMember(member.id)}
                      title="Delete member"
                      type="button"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-background">
                      <IconUsers className="h-4 w-4 text-muted-foreground" />
                    </span>
                  </>
                )}

                <div>
                  <p className="text-left text-xs text-muted-foreground">Add member email</p>
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm transition-colors hover:border-primary/60"
                    onChange={(e) => onMemberEmailChange(member.id, e.target.value)}
                    placeholder="PayXen login email"
                    type="email"
                    value={member.email}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    className="w-20 rounded-md border px-3 py-2 text-sm transition-colors hover:border-primary/60"
                    max={100}
                    min={0}
                    onChange={(e) =>
                      onMemberPercentageChange(
                        member.id,
                        Number.parseInt(e.target.value || "0", 10),
                      )
                    }
                    type="number"
                    value={member.percentage}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <div className="rounded-md border bg-background px-2 py-1 text-xs font-medium">
                    {formatInr((Math.max(0, member.percentage) / 100) * totalPlanPrice)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/30"
          onClick={onAddMember}
          type="button"
        >
          <IconPlus className="h-4 w-4" />
          Add member
        </button>

        <div className="w-full max-w-xl rounded-md border p-3 text-sm transition-colors hover:bg-muted/10">
          <p className={isTotalValid ? "text-green-700" : "text-red-700"}>
            Total percentage: {totalPercentage}% {isTotalValid ? "(valid)" : "(must be 100%)"}
          </p>
        </div>

        <form action={createGroupAction} className="w-full max-w-xl">
          <input name="subscriptionId" type="hidden" value={selectedPlan.id} />
          <input name="groupName" type="hidden" value={groupName} />
          <input name="ownerPercentage" type="hidden" value={ownerPct} />
          <input name="members" type="hidden" value={membersPayload} />
          <CreateGroupButton
            disabled={!isTotalValid || groupName.trim().length === 0 || !hasAtLeastOneMember}
          />
        </form>
      </div>
    </section>
  );
}

function CreateGroupButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="w-full rounded-md bg-black px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "Creating..." : "Create group"}
    </button>
  );
}
