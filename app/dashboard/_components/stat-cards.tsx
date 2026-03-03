"use client";

import {
  IconTrendingUp,
  IconTrendingDown,
  IconWallet,
  IconReceipt,
  IconChartBar,
  IconPercentage,
} from "@tabler/icons-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: string;
  change: string;
  trending: "up" | "down";
  icon: React.ElementType;
  accent: string;
};

function StatCard({ label, value, change, trending, icon: Icon, accent }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardDescription className="text-sm font-medium">{label}</CardDescription>
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-2xl font-bold tabular-nums tracking-tight lg:text-3xl">
          {value}
        </CardTitle>
        <div className="mt-1 flex items-center gap-1.5 text-xs">
          {trending === "up" ? (
            <span className="flex items-center gap-0.5 rounded-full bg-emerald-950/60 px-2 py-0.5 text-emerald-400">
              <IconTrendingUp className="h-3 w-3" />
              {change}
            </span>
          ) : (
            <span className="flex items-center gap-0.5 rounded-full bg-red-950/60 px-2 py-0.5 text-red-400">
              <IconTrendingDown className="h-3 w-3" />
              {change}
            </span>
          )}
          <span className="text-muted-foreground">Compared to last month</span>
        </div>
      </CardContent>
    </Card>
  );
}

type StatCardsProps = {
  walletBalance: string;
  totalSpending: string;
  totalSubscriptions: number;
  totalGroups: number;
  spendingChange: number;
};

export function StatCards({
  walletBalance,
  totalSpending,
  totalSubscriptions,
  totalGroups,
  spendingChange,
}: StatCardsProps) {
  const formatInr = (v: string | number) => {
    const n = typeof v === "number" ? v : Number.parseFloat(v);
    if (!Number.isFinite(n)) return "₹0.00";
    return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Wallet Balance"
        value={formatInr(walletBalance)}
        change={`${spendingChange >= 0 ? "+" : ""}${spendingChange.toFixed(1)}%`}
        trending={spendingChange >= 0 ? "up" : "down"}
        icon={IconWallet}
        accent="bg-violet-500/20 text-violet-400"
      />
      <StatCard
        label="Total Spending"
        value={formatInr(totalSpending)}
        change={`${spendingChange >= 0 ? "+" : ""}${spendingChange.toFixed(1)}%`}
        trending={spendingChange >= 0 ? "up" : "down"}
        icon={IconReceipt}
        accent="bg-sky-500/20 text-sky-400"
      />
      <StatCard
        label="Active Subscriptions"
        value={String(totalSubscriptions)}
        change="+0.0%"
        trending="up"
        icon={IconChartBar}
        accent="bg-emerald-500/20 text-emerald-400"
      />
      <StatCard
        label="Your Groups"
        value={String(totalGroups)}
        change="+0.0%"
        trending="up"
        icon={IconPercentage}
        accent="bg-amber-500/20 text-amber-400"
      />
    </div>
  );
}
