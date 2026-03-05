"use client";

import { IconClock, IconActivity, IconPlayerPlay, IconRobot } from "@tabler/icons-react";

export type GhostSubscription = {
  id: string;
  serviceName: string;
  planName: string | null;
  planDurationMonths: number | null;
  monthlyCost: string;
  nextBillingDate: string;
  freeTrialTaken: boolean;
  freeTrialEndsAt: string | null;
  status: string;
  usageMinutes: number;
  agentEnabled: boolean;
  minUsageMinutes: number;
  freeTrialAutoCancel: boolean;
  ruleId: string | null;
  isGroupShared: boolean;
  groupName: string | null;
  groupUsageMinutes: number;
  groupMemberUsage: Array<{
    userId: string;
    name: string;
    email: string;
    minutes: number;
  }>;
};

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function formatInr(value: string | number) {
  const num = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(num)) return "INR 0.00";
  return `INR ${num.toFixed(2)}`;
}

function planLabel(months: number | null) {
  if (!months) return "-";
  if (months === 1) return "Monthly";
  if (months === 12) return "Yearly";
  return `${months} months`;
}

export function UsageOverview({ subscriptions }: { subscriptions: GhostSubscription[] }) {
  const totalUsage = subscriptions.reduce((s, sub) => s + sub.usageMinutes, 0);
  const totalCost = subscriptions.reduce(
    (s, sub) => s + Number.parseFloat(sub.monthlyCost || "0"),
    0,
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Service Usage Overview</h2>
        <p className="text-sm text-muted-foreground">
          Usage data from the last 30 days across all your active subscriptions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10">
              <IconActivity className="size-4 text-violet-500" />
            </div>
            <p className="text-xs text-muted-foreground">Active Services</p>
          </div>
          <p className="mt-2 text-2xl font-bold">{subscriptions.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10">
              <IconClock className="size-4 text-sky-500" />
            </div>
            <p className="text-xs text-muted-foreground">Total Usage</p>
          </div>
          <p className="mt-2 text-2xl font-bold">{formatMinutes(totalUsage)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <IconPlayerPlay className="size-4 text-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground">Monthly Cost</p>
          </div>
          <p className="mt-2 text-2xl font-bold">{formatInr(totalCost)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10">
              <IconRobot className="size-4 text-amber-500" />
            </div>
            <p className="text-xs text-muted-foreground">Agents Active</p>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {subscriptions.filter((s) => s.agentEnabled || s.freeTrialAutoCancel).length}
            <span className="text-sm font-normal text-muted-foreground">
              {" "}/ {subscriptions.length} services
            </span>
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold">Usage by Service (30 days)</h3>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active subscriptions.</p>
        ) : (
          <div className="space-y-3">
            {subscriptions
              .slice()
              .sort((a, b) => b.usageMinutes - a.usageMinutes)
              .map((sub) => {
                const maxMinutes = Math.max(...subscriptions.map((s) => s.usageMinutes), 1);
                const pct = Math.round((sub.usageMinutes / maxMinutes) * 100);
                return (
                  <div key={sub.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sub.serviceName}</span>
                        <span className="text-xs text-muted-foreground">
                          {sub.planName ?? ""} - {planLabel(sub.planDurationMonths)}
                        </span>
                        {sub.isGroupShared ? (
                          <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                            Group{sub.groupName ? ` - ${sub.groupName}` : ""}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>
                          {formatMinutes(sub.usageMinutes)}
                          {sub.isGroupShared ? " total" : ""}
                        </span>
                        <span>{formatInr(sub.monthlyCost)}/mo</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {sub.isGroupShared && sub.groupMemberUsage.length > 0 ? (
                      <div className="grid gap-1 rounded-lg border border-border/60 bg-muted/20 p-2">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Member-wise usage
                        </p>
                        {sub.groupMemberUsage
                          .slice()
                          .sort((a, b) => b.minutes - a.minutes)
                          .map((member) => (
                            <div
                              key={member.userId}
                              className="flex items-center justify-between text-[11px]"
                            >
                              <span className="truncate text-muted-foreground">
                                {member.name || member.email}
                              </span>
                              <span className="font-medium text-foreground">
                                {formatMinutes(member.minutes)}
                              </span>
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </section>
  );
}
