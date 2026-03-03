import type React from "react";
import { desc, eq, sql } from "drizzle-orm";
import { AppSidebar } from "@/app/dashboard-01/app-sidebar";
import { SiteHeader } from "@/app/dashboard-01/site-header";
import { db } from "@/db";
import {
  groupMembers,
  subscriptions,
  transactions,
  wallet,
} from "@/db/schema";
import { requireSession } from "@/lib/require-session";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { StatCards } from "./_components/stat-cards";
import { AnalyticsChart } from "./_components/analytics-chart";
import { SpendingByService } from "./_components/spending-by-service";
import { TransactionHistory } from "./_components/transaction-history";

const serviceColors = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
];

export default async function DashboardPage() {
  const session = await requireSession();

  // Wallet
  const [userWallet] = await db
    .select()
    .from(wallet)
    .where(eq(wallet.userId, session.user.id))
    .limit(1);

  // Recent transactions (for table)
  const recentTransactions = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, session.user.id))
    .orderBy(desc(transactions.createdAt))
    .limit(12);

  // All transactions for analytics chart (spending over time)
  const spendingRows = await db
    .select({
      date: sql<string>`to_char(${transactions.createdAt}, 'YYYY-MM-DD')`,
      amount: sql<number>`sum(${transactions.amount}::numeric)`,
    })
    .from(transactions)
    .where(eq(transactions.userId, session.user.id))
    .groupBy(sql`to_char(${transactions.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${transactions.createdAt}, 'YYYY-MM-DD')`);

  // Total spending
  const [totalSpendingRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${transactions.amount}::numeric), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.userId, session.user.id));

  // Active subscriptions
  const activeSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.user.id))
    .orderBy(desc(subscriptions.createdAt));

  // Groups count
  const [groupsSummary] = await db
    .select({
      groupsCount: sql<number>`count(*)`,
    })
    .from(groupMembers)
    .where(eq(groupMembers.userId, session.user.id));

  // Spending by service
  const spendingByServiceRows = activeSubscriptions.reduce<
    Record<string, number>
  >((acc, sub) => {
    const key = sub.serviceName;
    acc[key] = (acc[key] ?? 0) + Number.parseFloat(sub.monthlyCost);
    return acc;
  }, {});

  const serviceSpendingData = Object.entries(spendingByServiceRows)
    .sort(([, a], [, b]) => b - a)
    .map(([service, amount], idx) => ({
      service,
      amount,
      color: serviceColors[idx % serviceColors.length],
    }));

  // Chart data
  const chartData = spendingRows.map((r) => ({
    date: r.date,
    amount: Number(r.amount) || 0,
  }));

  // Transaction rows for table
  const txnRows = recentTransactions.map((txn) => ({
    id: txn.id,
    type: txn.type,
    description: txn.description,
    amount: txn.amount,
    status: txn.status,
    createdAt: txn.createdAt.toISOString(),
  }));

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        user={{
          name: session.user.name ?? "User",
          email: session.user.email,
        }}
        variant="inset"
      />
      <SidebarInset>
        <SiteHeader title="Dashboard" />
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          {/* Stat Cards */}
          <StatCards
            walletBalance={userWallet?.balance ?? "0.00"}
            totalSpending={String(totalSpendingRow?.total ?? 0)}
            totalSubscriptions={activeSubscriptions.filter((s) => s.status === "ACTIVE").length}
            totalGroups={groupsSummary?.groupsCount ?? 0}
            spendingChange={0}
          />

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
            <AnalyticsChart data={chartData} />
            <SpendingByService data={serviceSpendingData} />
          </div>

          {/* Transaction History */}
          <TransactionHistory rows={txnRows} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
