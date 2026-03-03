"use client";

import { useState, useCallback } from "react";
import { IconGift, IconCalendarEvent, IconShieldCheck } from "@tabler/icons-react";
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

function daysUntil(dateStr: string) {
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ────────────── Free Trial Manager ────────────── */

export function FreeTrialManager({
  subscriptions: allSubs,
  onUpdate,
}: {
  subscriptions: GhostSubscription[];
  onUpdate: (subId: string, patch: Partial<GhostSubscription>) => void;
}) {
  // Filter to only free trial subscriptions
  const subs = allSubs.filter(
    (sub) => sub.freeTrialTaken && sub.freeTrialEndsAt,
  );

  const [saving, setSaving] = useState<string | null>(null);

  const toggleTrialCancel = useCallback(
    async (subId: string, freeTrialAutoCancel: boolean) => {
      setSaving(subId);
      try {
        const res = await fetch("/api/ghost-agent/trial-toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId: subId, freeTrialAutoCancel }),
        });
        if (res.ok) {
          onUpdate(subId, { freeTrialAutoCancel });
        }
      } finally {
        setSaving(null);
      }
    },
    [onUpdate],
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <IconGift className="size-5 text-emerald-500" />
          Free Trial Auto-Cancellation
        </h2>
        <p className="text-sm text-muted-foreground">
          When enabled, the Ghost Agent will automatically cancel the subscription
          one day before the free trial ends — so you&apos;re never charged.
          Turn it off if you want the payment to go through normally.
        </p>
      </div>

      {subs.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <IconGift className="mx-auto mb-2 size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No active free trials found across your subscriptions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map((sub) => {
            const days = daysUntil(sub.freeTrialEndsAt!);
            const isUrgent = days <= 3;

            return (
              <div
                key={sub.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isUrgent && !sub.freeTrialAutoCancel
                    ? "border-red-700 bg-red-950/20"
                    : "bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{sub.serviceName}</span>
                      {sub.planName && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {sub.planName}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <IconCalendarEvent className="size-3.5" />
                        Trial ends: <strong className="text-foreground">{formatDate(sub.freeTrialEndsAt!)}</strong>
                      </span>
                      <span
                        className={`font-semibold ${
                          isUrgent ? "text-red-400" : "text-amber-400"
                        }`}
                      >
                        {days === 0 ? "Ending today!" : `${days} day${days === 1 ? "" : "s"} left`}
                      </span>
                    </div>

                    {sub.freeTrialAutoCancel && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                        <IconShieldCheck className="size-3.5" />
                        Auto-cancel enabled — will cancel 1 day before trial ends.
                      </div>
                    )}

                    {!sub.freeTrialAutoCancel && isUrgent && (
                      <div className="mt-1 text-xs font-medium text-red-400">
                        ⚠ Trial ending soon — payment will be deducted if not cancelled!
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <IosToggle
                      checked={sub.freeTrialAutoCancel}
                      onChange={(v) => toggleTrialCancel(sub.id, v)}
                      disabled={saving === sub.id}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {sub.freeTrialAutoCancel ? "Auto-cancel ON" : "Auto-cancel OFF"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
