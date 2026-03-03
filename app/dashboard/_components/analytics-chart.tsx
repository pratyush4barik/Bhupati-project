"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { IconDots } from "@tabler/icons-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SpendingDataPoint = {
  date: string; // ISO date
  amount: number;
};

const chartConfig = {
  amount: {
    label: "Spending",
    color: "hsl(262 83% 58%)", // violet-500
  },
} satisfies ChartConfig;

export function AnalyticsChart({ data }: { data: SpendingDataPoint[] }) {
  const [range, setRange] = useState<"6m" | "3m" | "1m">("6m");

  const filtered = useMemo(() => {
    if (data.length === 0) return [];
    const now = new Date();
    const months = range === "6m" ? 6 : range === "3m" ? 3 : 1;
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - months);
    return data.filter((d) => new Date(d.date) >= cutoff);
  }, [data, range]);

  // Group by month for display
  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of filtered) {
      const d = new Date(item.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + item.amount);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total }));
  }, [filtered]);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <CardTitle>Analytic</CardTitle>
          <Select value={range} onValueChange={(v) => setRange(v as "6m" | "3m" | "1m")}>
            <SelectTrigger className="h-7 w-auto min-w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="1m">Last month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button type="button" className="text-muted-foreground hover:text-foreground">
          <IconDots className="h-5 w-5" />
        </button>
      </CardHeader>
      <CardContent>
        {grouped.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No spending data yet. Transactions will appear here.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full sm:h-[300px]">
            <AreaChart data={grouped}>
              <defs>
                <linearGradient id="fillSpending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(262 83% 58%)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="hsl(262 83% 58%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/30" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v: string) => {
                  const [y, m] = v.split("-");
                  const d = new Date(Number(y), Number(m) - 1);
                  return d.toLocaleDateString("en-US", { month: "short" });
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v: number) => {
                  if (v >= 1_000_000) return `₹${(v / 1_000_000).toFixed(1)}M`;
                  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}K`;
                  return `₹${v}`;
                }}
                width={50}
                className="hidden sm:block"
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(v: string) => {
                      const [y, m] = v.split("-");
                      const d = new Date(Number(y), Number(m) - 1);
                      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
                    }}
                    formatter={(value) => `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                  />
                }
              />
              <Area
                dataKey="total"
                type="monotone"
                fill="url(#fillSpending)"
                stroke="hsl(262 83% 58%)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
