"use client";

import { useState, useCallback } from "react";
import { IconClock, IconActivity, IconPlayerPlay, IconRobot } from "@tabler/icons-react";

/* ────────────── Types ────────────── */

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
};

/* ────────────── Helpers ────────────── */

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function formatInr(value: string | number) {
  const num = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(num)) return "₹0.00";
  return `₹${num.toFixed(2)}`;
}

function planLabel(months: number | null) {
  if (!months) return "—";
  if (months === 1) return "Monthly";
  if (months === 12) return "Yearly";
  return `${months} months`;
}

/* ────────────── Component ────────────── */

export function UsageOverview({ subscriptions }: { subscriptions: GhostSubscription[] }) {
  const totalUsage = subscriptions.reduce((s, sub) => s + sub.usageMinutes, 0);
  const totalCost = subscriptions.reduce((s, sub) => s + Number.parseFloat(sub.monthlyCost || "0"), 0);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Service Usage Overview</h2>
        <p className="text-sm text-muted-foreground">
          Usage data from the last 30 days across all your active subscriptions.
        </p>
      </div>

      {/* Summary cards */}
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

      {/* Per-service usage bars */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold">Usage by Service (30 days)</h3>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active subscriptions.</p>
        ) : (
          <div className="space-y-3">
            {subscriptions
              .sort((a, b) => b.usageMinutes - a.usageMinutes)
              .map((sub) => {
                const maxMinutes = Math.max(...subscriptions.map((s) => s.usageMinutes), 1);
                const pct = Math.round((sub.usageMinutes / maxMinutes) * 100);
                return (
                  <div key={sub.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sub.serviceName}</span>
                        <span className="text-xs text-muted-foreground">
                          {sub.planName ?? ""} · {planLabel(sub.planDurationMonths)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{formatMinutes(sub.usageMinutes)}</span>
                        <span>{formatInr(sub.monthlyCost)}/mo</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </section>
  );
}
