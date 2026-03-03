"use client";

import { useState, useCallback } from "react";
import { IconRobot, IconShieldCheck, IconAlertTriangle } from "@tabler/icons-react";
import type { GhostSubscription } from "./usage-overview";

/* ────────────── iOS-style toggle ────────────── */

function IosToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-[28px] w-[50px] shrink-0 cursor-pointer items-center rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? "bg-emerald-500" : "bg-zinc-600"}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block size-6 rounded-full bg-white shadow-lg
          ring-0 transition-transform duration-200 ease-in-out
          ${checked ? "translate-x-[22px]" : "translate-x-0"}
        `}
      />
    </button>
  );
}

/* ────────────── Helpers ────────────── */

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function planLabel(months: number | null) {
  if (!months) return "—";
  if (months === 1) return "Monthly";
  if (months === 12) return "Yearly";
  return `${months} months`;
}

/* ────────────── Agent Activity Editor ────────────── */

export function AgentActivityEditor({
  subscriptions: subs,
  onUpdate,
}: {
  subscriptions: GhostSubscription[];
  onUpdate: (subId: string, patch: Partial<GhostSubscription>) => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);

  const toggleAgent = useCallback(
    async (subId: string, enabled: boolean) => {
      setSaving(subId);
      try {
        const res = await fetch("/api/ghost-agent/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId: subId, enabled }),
        });
        if (res.ok) {
          onUpdate(subId, { agentEnabled: enabled });
        }
      } finally {
        setSaving(null);
      }
    },
    [onUpdate],
  );

  const updateThreshold = useCallback(
    async (subId: string, minUsageMinutes: number) => {
      setSaving(subId);
      try {
        const res = await fetch("/api/ghost-agent/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId: subId, minUsageMinutes }),
        });
        if (res.ok) {
          onUpdate(subId, { minUsageMinutes });
        }
      } finally {
        setSaving(null);
      }
    },
    [],
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <IconRobot className="size-5 text-violet-500" />
          Agent Activity Manager
        </h2>
        <p className="text-sm text-muted-foreground">
          Enable the Ghost Agent on a service — when your usage falls below the minimum
          threshold, the agent will automatically cancel or deactivate the plan to prevent
          unnecessary payments.
        </p>
      </div>

      {subs.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No active subscriptions to manage.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map((sub) => {
            const belowThreshold = sub.agentEnabled && sub.usageMinutes < sub.minUsageMinutes;
            return (
              <div
                key={sub.id}
                className={`rounded-xl border p-4 transition-colors ${
                  belowThreshold ? "border-amber-700 bg-amber-950/30" : "bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{sub.serviceName}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {sub.planName ?? "—"} · {planLabel(sub.planDurationMonths)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Usage: <strong className="text-foreground">{formatMinutes(sub.usageMinutes)}</strong></span>
                      <span>Threshold: <strong className="text-foreground">{formatMinutes(sub.minUsageMinutes)}</strong></span>
                      <span>Next billing: <strong className="text-foreground">{sub.nextBillingDate}</strong></span>
                    </div>

                    {belowThreshold && (() => {
                      const billing = new Date(sub.nextBillingDate);
                      const cancelDate = new Date(billing);
                      cancelDate.setDate(cancelDate.getDate() - 1);
                      const now = new Date();
                      const daysLeft = Math.max(0, Math.ceil((cancelDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                      const cancelStr = cancelDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                      return (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
                            <IconAlertTriangle className="size-3.5" />
                            Usage is below threshold — subscription will be auto-cancelled on {cancelStr} (1 day before billing).
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {daysLeft === 0
                              ? "Cancellation is scheduled for today."
                              : `Cancellation in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`}
                          </p>
                        </div>
                      );
                    })()}

                    {sub.agentEnabled && !belowThreshold && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                        <IconShieldCheck className="size-3.5" />
                        Agent is monitoring this service.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <IosToggle
                      checked={sub.agentEnabled}
                      onChange={(v) => toggleAgent(sub.id, v)}
                      disabled={saving === sub.id}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {sub.agentEnabled ? "Agent ON" : "Agent OFF"}
                    </span>
                  </div>
                </div>

                {/* Threshold slider */}
                {sub.agentEnabled && (
                  <div className="mt-4 space-y-2 border-t border-border pt-3">
                    <label className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Minimum usage threshold (monthly)</span>
                      <span className="font-medium text-foreground">{formatMinutes(sub.minUsageMinutes)}</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={600}
                      step={15}
                      value={sub.minUsageMinutes}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        onUpdate(sub.id, { minUsageMinutes: val });
                      }}
                      onMouseUp={() => updateThreshold(sub.id, sub.minUsageMinutes)}
                      onTouchEnd={() => updateThreshold(sub.id, sub.minUsageMinutes)}
                      className="w-full accent-violet-500"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>0m</span>
                      <span>2h 30m</span>
                      <span>5h</span>
                      <span>10h</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
