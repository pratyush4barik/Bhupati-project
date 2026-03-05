import type React from "react";
import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { AppSidebar } from "@/app/dashboard-01/app-sidebar";
import { SiteHeader } from "@/app/dashboard-01/site-header";
import { db } from "@/db";
import { internalTransfers, transactions, wallet } from "@/db/schema";
import { requireSession } from "@/lib/require-session";
import {
  addMoneyAction,
  requestMoneyByPxIdAction,
  transferByPxIdAction,
  withdrawMoneyAction,
} from "@/app/wallet/actions";
import { PendingStatusRefresher } from "@/app/wallet/pending-status-refresher";
import { PinGatedForm } from "@/app/wallet/pin-gated-form";
import { PxIdCopyButton } from "@/app/wallet/pxid-copy-button";
import { WalletPinSection } from "@/app/wallet/wallet-pin-section";
import { WalletSubmitButton } from "@/app/wallet/wallet-submit-button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const formatInr = (value: string | number) => {
  const num = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(num)) return "₹0.00";
  return `₹${num.toFixed(2)}`;
};

const formatDateTime = (value: Date) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);

type WalletPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
    setPin?: string;
    returnTo?: string;
  }>;
};

export default async function WalletPage({ searchParams }: WalletPageProps) {
  const session = await requireSession();
  const query = (await searchParams) ?? {};

  let [userWallet] = await db
    .select()
    .from(wallet)
    .where(eq(wallet.userId, session.user.id))
    .limit(1);

  if (!userWallet) {
    const [createdWallet] = await db
      .insert(wallet)
      .values({
        userId: session.user.id,
        balance: "0.00",
      })
      .returning();
    userWallet = createdWallet;
  }

  await db
    .update(transactions)
    .set({ status: "SUCCESSFUL" })
    .where(
      and(
        eq(transactions.userId, session.user.id),
        eq(transactions.referenceType, "BANK_WITHDRAWAL"),
        eq(transactions.status, "PENDING"),
        lte(transactions.createdAt, sql`now() - interval '5 seconds'`),
      ),
    );

  const txns = await db
    .select()
    .from(transactions)
    .where(eq(transactions.walletId, userWallet.id))
    .orderBy(desc(transactions.createdAt))
    .limit(20);

  const sentTransfers = await db
    .select()
    .from(internalTransfers)
    .where(eq(internalTransfers.senderId, session.user.id))
    .orderBy(desc(internalTransfers.createdAt))
    .limit(10);

  const receivedTransfers = await db
    .select()
    .from(internalTransfers)
    .where(eq(internalTransfers.receiverId, session.user.id))
    .orderBy(desc(internalTransfers.createdAt))
    .limit(10);

  const transferCounterpartyIds = Array.from(
    new Set(
      [...sentTransfers.map((item) => item.receiverId), ...receivedTransfers.map((item) => item.senderId)].filter(
        (userId) => userId !== session.user.id,
      ),
    ),
  );

  const counterpartyWallets =
    transferCounterpartyIds.length > 0
      ? await db
          .select({
            userId: wallet.userId,
            pxId: wallet.pxId,
          })
          .from(wallet)
          .where(inArray(wallet.userId, transferCounterpartyIds))
      : [];

  const counterpartyPxIdByUserId = new Map(
    counterpartyWallets.map((item) => [item.userId, item.pxId]),
  );

  const combinedActivity = [
    ...txns.map((txn) => ({
      id: txn.id,
      source: "TRANSACTION" as const,
      title: txn.type.replaceAll("_", " "),
      amount: txn.amount,
      status: txn.status,
      referenceType: txn.referenceType,
      details: txn.description || "No description",
      createdAt: txn.createdAt,
    })),
    ...sentTransfers.map((transfer) => ({
      id: transfer.id,
      source: "INTERNAL_TRANSFER" as const,
      title: "INTERNAL TRANSFER SENT",
      amount: transfer.amount,
      status: transfer.status,
      referenceType: "INTERNAL_TRANSFER",
      details: `To ${counterpartyPxIdByUserId.get(transfer.receiverId) ?? "Unknown px-id"}`,
      createdAt: transfer.createdAt,
    })),
    ...receivedTransfers.map((transfer) => ({
      id: transfer.id,
      source: "INTERNAL_TRANSFER" as const,
      title: "INTERNAL TRANSFER RECEIVED",
      amount: transfer.amount,
      status: transfer.status,
      referenceType: "INTERNAL_TRANSFER",
      details: `From ${counterpartyPxIdByUserId.get(transfer.senderId) ?? "Unknown px-id"}`,
      createdAt: transfer.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 30);

  const hasPendingWithdrawal = txns.some(
    (txn) => txn.referenceType === "BANK_WITHDRAWAL" && txn.status === "PENDING",
  );

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
        }}
        variant="inset"
      />
      <SidebarInset>
        <SiteHeader title="Wallet" />
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:gap-6 sm:px-6 sm:py-8">
          <PendingStatusRefresher shouldRefresh={hasPendingWithdrawal} />

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

          <section className="rounded-xl border p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="mt-2 text-2xl font-semibold sm:text-3xl">{formatInr(userWallet.balance)}</p>
              </div>
              <div className="md:text-right">
                <p className="text-sm text-muted-foreground">Your PayXen ID</p>
                <div className="mt-1 flex items-center gap-2 md:justify-end">
                  <p className="text-base font-medium">{userWallet.pxId}</p>
                  <PxIdCopyButton pxId={userWallet.pxId} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Share this `px-id` to receive internal wallet transfers.
                </p>
              </div>
            </div>
            <div className="mt-4 border-t pt-4">
              <WalletPinSection
                hasPin={!!userWallet.pinHash}
                returnTo={query.returnTo}
                userEmail={session.user.email}
              />
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-xl border p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold">Add Money</h2>
              <p className="mb-4 min-h-10 text-sm text-muted-foreground">
                Adds money from escrow settlement into your
                <br />
                wallet balance.
              </p>
              <PinGatedForm action={addMoneyAction} hasPin={!!userWallet.pinHash} showPayingAnimation={false} className="flex gap-3">
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  min="0.01"
                  name="amount"
                  placeholder="Amount (₹)"
                  required
                  step="0.01"
                  type="number"
                />
                <WalletSubmitButton
                  className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
                  idleLabel="Add"
                  pendingLabel="Adding..."
                />
              </PinGatedForm>
            </article>

            <article className="rounded-xl border p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold">Withdraw Money</h2>
              <p className="mb-4 min-h-10 text-sm text-muted-foreground">
                Sends wallet money to your bank and records the transfer history.
              </p>
              <PinGatedForm action={withdrawMoneyAction} hasPin={!!userWallet.pinHash} showPayingAnimation={false} className="flex gap-3">
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  min="0.01"
                  name="amount"
                  placeholder="Amount (₹)"
                  required
                  step="0.01"
                  type="number"
                />
                <WalletSubmitButton
                  className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
                  idleLabel="Withdraw"
                  pendingLabel="Withdrawing..."
                />
              </PinGatedForm>
            </article>

            <article className="rounded-xl border p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold">Transfer to PayXen User</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Use receiver `px-id` to transfer instantly.
              </p>
              <PinGatedForm action={transferByPxIdAction} hasPin={!!userWallet.pinHash} className="space-y-3">
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  name="target"
                  placeholder="px-id (e.g. px-abc123...)"
                  required
                  type="text"
                />
                <div className="flex gap-3">
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    min="0.01"
                    name="amount"
                    placeholder="Amount (₹)"
                    required
                    step="0.01"
                    type="number"
                  />
                  <WalletSubmitButton
                  className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
                    idleLabel="Transfer"
                    pendingLabel="Transferring..."
                  />
                </div>
              </PinGatedForm>
            </article>

            <article className="rounded-xl border p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold">Requests</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Request money from another user using their `px-id`.
              </p>
              <form action={requestMoneyByPxIdAction} className="space-y-3">
                <input
                  className="w-full rounded-md border px-3 py-2 text-sm transition-colors hover:border-primary"
                  name="target"
                  placeholder="Receiver px-id (e.g. px-abc123...)"
                  required
                  type="text"
                />
                <div className="flex gap-3">
                  <input
                    className="w-full rounded-md border px-3 py-2 text-sm transition-colors hover:border-primary"
                    min="0.01"
                    name="amount"
                    placeholder="Amount (₹)"
                    required
                    step="0.01"
                    type="number"
                  />
                  <WalletSubmitButton
                    className="rounded-md border border-primary bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                    idleLabel="Request"
                    pendingLabel="Requesting..."
                  />
                </div>
              </form>
            </article>
          </section>

          <section>
              <article className="rounded-xl border p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold">Transaction History</h2>
              {combinedActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No wallet activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {combinedActivity.map((item) => (
                    <li className="rounded-lg border p-3" key={`${item.source}-${item.id}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate font-medium">{item.title}</p>
                        <span
                          className={
                            item.status === "PENDING"
                              ? "rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700"
                              : "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                          }
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatInr(item.amount)} | {item.referenceType}
                      </p>
                      <p className="text-sm text-muted-foreground">{item.details}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
