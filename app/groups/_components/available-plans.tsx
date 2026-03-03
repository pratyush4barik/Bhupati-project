"use client";

import { IconListDetails } from "@tabler/icons-react";
import { getServiceMeta } from "@/app/groups/service-meta";
import type { ActiveSubscription } from "@/app/groups/types";

type AvailablePlansProps = {
  plans: ActiveSubscription[];
  onSelectPlan: (plan: ActiveSubscription) => void;
  selectedPlanId?: string;
};

const formatInr = (value: string | number) => {
  const num = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(num)) return "INR 0.00";
  return `INR ${num.toFixed(2)}`;
};

export function AvailablePlans({
  plans,
  onSelectPlan,
  selectedPlanId,
}: AvailablePlansProps) {
  return (
    <section className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Step 1: Available Plans</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Showing only your active subscriptions.
        </p>

      {plans.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No active subscriptions found.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {plans.map((plan) => {
            const serviceMeta = getServiceMeta(plan.serviceKey);
            const Icon = serviceMeta?.icon ?? IconListDetails;
            const isSelected = selectedPlanId === plan.id;

            return (
              <button
                className={`w-full rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:bg-muted/20 ${
                  isSelected ? "border-primary bg-primary/5" : ""
                }`}
                key={plan.id}
                onClick={() => onSelectPlan(plan)}
                type="button"
              >
                <div className="grid gap-4 md:grid-cols-3 md:items-center">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted/30">
                      <Icon className="h-5 w-5" style={{ color: serviceMeta?.color }} />
                    </span>
                    <div>
                      <p className="font-medium">{plan.serviceName}</p>
                      <p className="text-xs text-muted-foreground">App/Website</p>
                    </div>
                  </div>

                  <div className="rounded-md border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">User ID</p>
                    <p className="text-sm font-medium">
                      {plan.externalAccountEmail ?? "Not available"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">Password</p>
                    <p className="text-sm font-medium tracking-wider">********</p>
                  </div>

                  <div className="rounded-md border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Plan details</p>
                    <p className="text-sm font-medium">{plan.planName ?? "Standard"}</p>
                    <p className="text-xs text-muted-foreground">
                      Duration: {plan.planDurationMonths ?? 1} month
                      {(plan.planDurationMonths ?? 1) > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Members: {plan.planMembers ?? 1}
                    </p>
                    <p className="mt-1 text-sm font-medium">{formatInr(plan.monthlyCost)} / month</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
