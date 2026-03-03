"use client";

import { IconDots } from "@tabler/icons-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

export type ServiceSpending = {
  service: string;
  amount: number;
  color: string;
};

const defaultColors = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
];

export function SpendingByService({ data }: { data: ServiceSpending[] }) {
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Spending by Service</CardTitle>
        <button type="button" className="text-muted-foreground hover:text-foreground">
          <IconDots className="h-5 w-5" />
        </button>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No subscriptions yet.
          </p>
        ) : (
          <div className="space-y-5">
            {data.slice(0, 6).map((item, idx) => {
              const pct = Math.round((item.amount / maxAmount) * 100);
              const color = item.color || defaultColors[idx % defaultColors.length];
              return (
                <div key={item.service} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
                      <span className="font-medium">{item.service}</span>
                    </div>
                    <span className="tabular-nums text-muted-foreground">
                      ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${color} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
