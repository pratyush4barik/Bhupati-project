"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type DailyPoint = {
  date: string;
  minutes: number;
};

type ServicePoint = {
  serviceName: string;
  minutes: number;
};

type UsageAnalyticsProps = {
  dailyData: DailyPoint[];
  serviceData: ServicePoint[];
  monthMinutes: number;
  activeServiceCount: number;
  inactiveSubscriptions: Array<{
    id: string;
    serviceName: string;
    status: string;
  }>;
  groupUsageData: Array<{
    groupSubscriptionId: string;
    groupName: string;
    serviceName: string;
    totalMinutes: number;
    members: Array<{
      userId: string;
      name: string;
      email: string;
      minutes: number;
    }>;
  }>;
};

const chartConfig = {
  minutes: {
    label: "Focused Minutes",
    color: "var(--chart-1)",
  },
};

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours}h ${minutes}m`;
}

export function UsageAnalytics({
  dailyData,
  serviceData,
  monthMinutes,
  activeServiceCount,
  inactiveSubscriptions,
  groupUsageData,
}: UsageAnalyticsProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <article className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">Monthly Focused Time</p>
          <p className="mt-2 text-2xl font-semibold">{formatMinutes(monthMinutes)}</p>
        </article>
        <article className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">Active Subscriptions Tracked</p>
          <p className="mt-2 text-2xl font-semibold">{activeServiceCount}</p>
        </article>
        <article className="rounded-xl border p-5">
          <p className="text-sm text-muted-foreground">Services Used (30 days)</p>
          <p className="mt-2 text-2xl font-semibold">{serviceData.length}</p>
        </article>
      </section>

      <section className="rounded-xl border p-4 sm:p-6">
        <p className="mt-1 text-sm text-muted-foreground">
          Includes only currently active subscriptions.
        </p>
        <div className="mt-5">
          <ChartContainer config={chartConfig} className="h-[220px] w-full sm:h-[300px]">
            <BarChart accessibilityLayer data={dailyData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="minutes" radius={6} fill="var(--color-minutes)" />
            </BarChart>
          </ChartContainer>
        </div>
      </section>

      <section className="rounded-xl border p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Focused Time by Service</h2>
        {serviceData.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No focused usage synced yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {serviceData.map((item) => (
              <li key={item.serviceName} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-sm font-medium">{item.serviceName}</span>
                <span className="text-sm text-muted-foreground">{formatMinutes(item.minutes)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Group Usage by Membership</h2>
        {groupUsageData.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No shared group memberships found in your active subscriptions.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {groupUsageData.map((group) => (
              <article key={group.groupSubscriptionId} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{group.serviceName}</span>
                    <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                      Group - {group.groupName}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Total: {formatMinutes(group.totalMinutes)}
                  </span>
                </div>
                {group.members.length > 0 ? (
                  <ul className="mt-3 space-y-1">
                    {group.members.map((member) => (
                      <li
                        key={member.userId}
                        className="flex items-center justify-between rounded-md border border-border/70 px-2 py-1.5"
                      >
                        <span className="text-xs text-muted-foreground">
                          {member.name || member.email}
                        </span>
                        <span className="text-xs font-medium">
                          {formatMinutes(member.minutes)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border p-4 sm:p-6">
        <h2 className="text-lg font-semibold">Inactive Subscriptions</h2>
        {inactiveSubscriptions.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No inactive subscriptions.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {inactiveSubscriptions.map((sub) => (
              <li key={sub.id} className="flex items-center justify-between rounded-lg border border-amber-800 bg-amber-950 px-3 py-2">
                <span className="text-sm font-medium">{sub.serviceName}</span>
                <span className="rounded-full bg-amber-800 px-2 py-0.5 text-xs font-medium text-amber-200">
                  {sub.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

