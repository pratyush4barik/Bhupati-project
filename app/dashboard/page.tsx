import type React from "react"
import Link from "next/link"
import { desc, eq, sql } from "drizzle-orm"
import { AppSidebar } from "@/app/dashboard-01/app-sidebar"
import { SiteHeader } from "@/app/dashboard-01/site-header"
import { db } from "@/db"
import {
  groupMembers,
  groupSubscriptions,
  groups,
  subscriptions,
  transactions,
  wallet,
} from "@/db/schema"
import { requireSession } from "@/lib/require-session"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

const formatInr = (value: string | number) => {
  const num = typeof value === "number" ? value : Number.parseFloat(value)
  if (!Number.isFinite(num)) return "₹0.00"
  return `₹${num.toFixed(2)}`
}

export default async function DashboardPage() {
  const session = await requireSession()

  const [userWallet] = await db
    .select()
    .from(wallet)
    .where(eq(wallet.userId, session.user.id))
    .limit(1)

  const recentTransactions = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, session.user.id))
    .orderBy(desc(transactions.createdAt))
    .limit(8)

  const activeSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, session.user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(6)

  const [groupsSummary] = await db
    .select({
      groupsCount: sql<number>`count(*)`,
    })
    .from(groupMembers)
    .where(eq(groupMembers.userId, session.user.id))

  const [groupSubsSummary] = await db
    .select({
      subscriptionsCount: sql<number>`count(${groupSubscriptions.id})`,
    })
    .from(groupSubscriptions)
    .innerJoin(groups, eq(groups.id, groupSubscriptions.groupId))
    .innerJoin(groupMembers, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, session.user.id))

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
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <section className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Wallet Balance</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {formatInr(userWallet?.balance ?? "0.00")}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Your Groups</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {groupsSummary?.groupsCount ?? 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Group Subscriptions</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {groupSubsSummary?.subscriptionsCount ?? 0}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="@container/card">
                  <CardHeader>
                    <CardDescription>Personal Subscriptions</CardDescription>
                    <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                      {activeSubscriptions.length}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </section>

              <section className="grid gap-4 px-4 lg:px-6 @4xl/main:grid-cols-2">
                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <div>
                      <CardTitle>Recent Transactions</CardTitle>
                      <CardDescription>Latest wallet and transfer activity</CardDescription>
                    </div>
                    <Link className="text-sm underline" href="/wallet">
                      Wallet
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recentTransactions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No transactions yet.
                      </p>
                    ) : (
                      recentTransactions.map((txn) => (
                        <div
                          className="flex items-center justify-between rounded-lg border p-3"
                          key={txn.id}
                        >
                          <div>
                            <p className="font-medium">{txn.type}</p>
                            <p className="text-muted-foreground text-sm">
                              {txn.description || txn.referenceType}
                            </p>
                          </div>
                          <Badge variant="outline">{formatInr(txn.amount)}</Badge>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <div>
                      <CardTitle>Subscriptions</CardTitle>
                      <CardDescription>Personal subscription overview</CardDescription>
                    </div>
                    <Link className="text-sm underline" href="/subscriptions">
                      View all
                    </Link>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {activeSubscriptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No personal subscriptions yet.
                      </p>
                    ) : (
                      activeSubscriptions.map((sub) => (
                        <div
                          className="flex items-center justify-between rounded-lg border p-3"
                          key={sub.id}
                        >
                          <div>
                            <p className="font-medium">{sub.serviceName}</p>
                            <p className="text-muted-foreground text-sm">
                              Next bill: {sub.nextBillingDate}
                            </p>
                          </div>
                          <Badge variant="outline">{formatInr(sub.monthlyCost)}</Badge>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </section>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
