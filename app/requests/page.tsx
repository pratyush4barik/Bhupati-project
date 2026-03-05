import type React from "react";
import { and, desc, eq } from "drizzle-orm";
import { GroupCard } from "@/app/groups/_components/group-card";
import { getMemberRequestCards } from "@/app/groups/group-queries";
import { AppSidebar } from "@/app/dashboard-01/app-sidebar";
import { SiteHeader } from "@/app/dashboard-01/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { db } from "@/db";
import { user, wallet, walletMoneyRequests } from "@/db/schema";
import { requireSession } from "@/lib/require-session";
import { payWalletMoneyRequestAction } from "@/app/wallet/actions";
import { PinGatedForm } from "@/app/wallet/pin-gated-form";

type RequestsPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function RequestsPage({ searchParams }: RequestsPageProps) {
  const session = await requireSession();
  const query = (await searchParams) ?? {};
  const [requestCards, userWallet, walletRequestRows] = await Promise.all([
    getMemberRequestCards(session.user.id),
    db
      .select({ balance: wallet.balance, pinHash: wallet.pinHash })
      .from(wallet)
      .where(eq(wallet.userId, session.user.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        id: walletMoneyRequests.id,
        amount: walletMoneyRequests.amount,
        createdAt: walletMoneyRequests.createdAt,
        requesterName: user.name,
        requesterEmail: user.email,
        requesterPxId: wallet.pxId,
      })
      .from(walletMoneyRequests)
      .innerJoin(user, eq(user.id, walletMoneyRequests.requesterId))
      .innerJoin(wallet, eq(wallet.userId, walletMoneyRequests.requesterId))
      .where(
        and(
          eq(walletMoneyRequests.receiverId, session.user.id),
          eq(walletMoneyRequests.status, "PENDING"),
        ),
      )
      .orderBy(desc(walletMoneyRequests.createdAt)),
  ]);

  const formatInr = (value: string | number) => {
    const num = typeof value === "number" ? value : Number.parseFloat(value);
    if (!Number.isFinite(num)) return "₹0.00";
    return `₹${num.toFixed(2)}`;
  };

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 60)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        user={{
          name: session.user.name ?? "User",
          email: session.user.email,
          image: session.user.image ?? null,
        }}
        variant="inset"
      />
      <SidebarInset>
        <SiteHeader title="Requests" />
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
          {query.success ? (
            <p className="rounded-lg border border-green-800 bg-green-950 px-4 py-3 text-sm text-green-400">
              {query.success}
            </p>
          ) : null}
          {query.error ? (
            <p className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
              {query.error}
            </p>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Wallet Requests</h2>
            {walletRequestRows.length === 0 ? (
              <section className="rounded-xl border p-4 sm:p-6">
                <p className="text-sm text-muted-foreground">No pending wallet requests.</p>
              </section>
            ) : (
              walletRequestRows.map((item) => (
                <article className="rounded-xl border p-3 sm:p-4" key={item.id}>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                    <div>
                      <p className="text-sm font-semibold">{item.requesterName}</p>
                      <p className="text-xs text-muted-foreground">{item.requesterEmail}</p>
                      <p className="text-xs text-muted-foreground">{item.requesterPxId}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        Requested: {formatDate(item.createdAt)}
                      </p>
                      <p className="text-sm font-semibold">Amount: {formatInr(item.amount)}</p>
                    </div>
                    <div className="sm:text-right">
                      <PinGatedForm action={payWalletMoneyRequestAction} hasPin={!!userWallet?.pinHash}>
                        <input name="requestId" type="hidden" value={item.id} />
                        <button
                          className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-black shadow-md transition-opacity hover:opacity-90"
                          type="submit"
                        >
                          Pay now
                        </button>
                      </PinGatedForm>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Wallet balance: {formatInr(userWallet?.balance ?? "0")}
                      </p>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Group Requests</h2>
            {requestCards.length === 0 ? (
              <section className="rounded-xl border p-4 sm:p-6">
                <p className="text-sm text-muted-foreground">No pending group requests.</p>
              </section>
            ) : (
              requestCards.map((card) => (
                <GroupCard
                  card={card}
                  hasPin={!!userWallet?.pinHash}
                  key={card.groupSubscriptionId}
                  requestMode
                  showCredentials={false}
                  walletBalance={userWallet?.balance ?? "0"}
                />
              ))
            )}
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}


