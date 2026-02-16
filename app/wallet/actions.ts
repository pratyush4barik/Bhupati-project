"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  escrowAccount,
  internalTransfers,
  transactions,
  wallet,
  walletMoneyRequests,
} from "@/db/schema";
import { requireSession } from "@/lib/require-session";

function parseAmount(input: FormDataEntryValue | null) {
  if (typeof input !== "string") return null;
  const value = Number.parseFloat(input);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Number(value.toFixed(2));
}

async function getOrCreateWallet(userId: string) {
  const [existingWallet] = await db
    .select()
    .from(wallet)
    .where(eq(wallet.userId, userId))
    .limit(1);

  if (existingWallet) return existingWallet;

  const [createdWallet] = await db
    .insert(wallet)
    .values({
      userId,
      balance: "0.00",
    })
    .returning();

  return createdWallet;
}

function parsePxId(input: FormDataEntryValue | null) {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw) return null;

  const directMatch = raw.match(/^px-[a-zA-Z0-9-]+$/i);
  if (directMatch) return raw.toLowerCase();

  return null;
}

async function getOrCreateEscrow() {
  const [existingEscrow] = await db.select().from(escrowAccount).limit(1);

  if (existingEscrow) return existingEscrow;

  const [createdEscrow] = await db
    .insert(escrowAccount)
    .values({ totalBalance: "0.00" })
    .returning();

  return createdEscrow;
}

export async function addMoneyAction(formData: FormData) {
  const session = await requireSession();
  const amount = parseAmount(formData.get("amount"));

  if (!amount) {
    redirect("/wallet?error=Invalid amount");
  }

  const userWallet = await getOrCreateWallet(session.user.id);
  const escrow = await getOrCreateEscrow();

  // Simulate bank -> escrow settlement, then escrow -> user wallet credit.
  await db
    .update(escrowAccount)
    .set({ totalBalance: sql`${escrowAccount.totalBalance} + ${amount}` })
    .where(eq(escrowAccount.id, escrow.id));

  await db
    .update(wallet)
    .set({ balance: sql`${wallet.balance} + ${amount}` })
    .where(eq(wallet.id, userWallet.id));

  await db.insert(transactions).values({
    userId: session.user.id,
    walletId: userWallet.id,
    amount: amount.toFixed(2),
    type: "TRANSFER_IN",
    referenceType: "ESCROW_TOPUP",
    referenceId: escrow.id,
    description: `Added ${amount.toFixed(2)} to wallet from escrow funding.`,
  });

  redirect("/wallet?success=Money added");
}

export async function withdrawMoneyAction(formData: FormData) {
  const session = await requireSession();
  const amount = parseAmount(formData.get("amount"));

  if (!amount) {
    redirect("/wallet?error=Invalid amount");
  }

  const [userWallet] = await db
    .select()
    .from(wallet)
    .where(eq(wallet.userId, session.user.id))
    .limit(1);

  if (!userWallet) {
    redirect("/wallet?error=Wallet not found");
  }

  const escrow = await getOrCreateEscrow();

  const walletBalance = Number.parseFloat(userWallet.balance);
  const escrowBalance = Number.parseFloat(escrow.totalBalance);

  if (walletBalance < amount) {
    redirect("/wallet?error=Insufficient wallet balance");
  }

  if (escrowBalance < amount) {
    redirect("/wallet?error=Escrow balance too low");
  }

  await db
    .update(wallet)
    .set({ balance: sql`${wallet.balance} - ${amount}` })
    .where(eq(wallet.id, userWallet.id));

  await db
    .update(escrowAccount)
    .set({ totalBalance: sql`${escrowAccount.totalBalance} - ${amount}` })
    .where(eq(escrowAccount.id, escrow.id));

  await db.insert(transactions).values({
    userId: session.user.id,
    walletId: userWallet.id,
    amount: amount.toFixed(2),
    type: "TRANSFER_OUT",
    referenceType: "BANK_WITHDRAWAL",
    referenceId: userWallet.id,
    description: `Transferred ${amount.toFixed(2)} from wallet to user's bank account.`,
    status: "PENDING",
  });

  redirect("/wallet?success=Withdrawal initiated");
}

export async function transferByPxIdAction(formData: FormData) {
  const session = await requireSession();
  const amount = parseAmount(formData.get("amount"));
  const targetPxId = parsePxId(formData.get("target"));

  if (!amount) {
    redirect("/wallet?error=Invalid amount");
  }

  if (!targetPxId) {
    redirect("/wallet?error=Invalid PX ID");
  }

  const senderWallet = await getOrCreateWallet(session.user.id);

  if (senderWallet.pxId === targetPxId) {
    redirect("/wallet?error=Cannot transfer to your own wallet");
  }

  const [receiverWallet] = await db
    .select()
    .from(wallet)
    .where(eq(wallet.pxId, targetPxId))
    .limit(1);

  if (!receiverWallet) {
    redirect("/wallet?error=Receiver not found");
  }

  const senderBalance = Number.parseFloat(senderWallet.balance);
  if (senderBalance < amount) {
    redirect("/wallet?error=Insufficient wallet balance");
  }

  await db
    .update(wallet)
    .set({ balance: sql`${wallet.balance} - ${amount}` })
    .where(eq(wallet.id, senderWallet.id));

  await db
    .update(wallet)
    .set({ balance: sql`${wallet.balance} + ${amount}` })
    .where(eq(wallet.id, receiverWallet.id));

  const [transfer] = await db
    .insert(internalTransfers)
    .values({
      senderId: session.user.id,
      receiverId: receiverWallet.userId,
      amount: amount.toFixed(2),
      status: "COMPLETED",
    })
    .returning();

  await db.insert(transactions).values({
    userId: session.user.id,
    walletId: senderWallet.id,
    amount: amount.toFixed(2),
    type: "TRANSFER_OUT",
    referenceType: "INTERNAL_TRANSFER",
    referenceId: transfer.id,
    description: `Transferred ${amount.toFixed(2)} to ${targetPxId}.`,
    status: "SUCCESSFUL",
  });

  await db.insert(transactions).values({
    userId: receiverWallet.userId,
    walletId: receiverWallet.id,
    amount: amount.toFixed(2),
    type: "TRANSFER_IN",
    referenceType: "INTERNAL_TRANSFER",
    referenceId: transfer.id,
    description: `Received ${amount.toFixed(2)} from ${senderWallet.pxId}.`,
    status: "SUCCESSFUL",
  });

  redirect("/wallet?success=Transfer successful");
}

export async function requestMoneyByPxIdAction(formData: FormData) {
  const session = await requireSession();
  const amount = parseAmount(formData.get("amount"));
  const targetPxId = parsePxId(formData.get("target"));

  if (!amount) {
    redirect("/wallet?error=Invalid amount");
  }

  if (!targetPxId) {
    redirect("/wallet?error=Invalid PX ID");
  }

  const requesterWallet = await getOrCreateWallet(session.user.id);

  if (requesterWallet.pxId === targetPxId) {
    redirect("/wallet?error=Cannot request money from your own wallet");
  }

  const [receiverWallet] = await db
    .select()
    .from(wallet)
    .where(eq(wallet.pxId, targetPxId))
    .limit(1);

  if (!receiverWallet) {
    redirect("/wallet?error=Receiver px-id not found");
  }

  await db.insert(walletMoneyRequests).values({
    requesterId: session.user.id,
    receiverId: receiverWallet.userId,
    amount: amount.toFixed(2),
    status: "PENDING",
  });

  redirect("/wallet?success=Money request sent");
}

export async function payWalletMoneyRequestAction(formData: FormData) {
  const session = await requireSession();
  const requestIdValue = formData.get("requestId");
  const requestId = typeof requestIdValue === "string" ? requestIdValue.trim() : "";

  if (!requestId) {
    redirect("/requests?error=Invalid payment request");
  }

  const [requestRow] = await db
    .select()
    .from(walletMoneyRequests)
    .where(
      and(
        eq(walletMoneyRequests.id, requestId),
        eq(walletMoneyRequests.receiverId, session.user.id),
        eq(walletMoneyRequests.status, "PENDING"),
      ),
    )
    .limit(1);

  if (!requestRow) {
    redirect("/requests?error=Request not found or already processed");
  }

  const [payerWallet] = await db
    .select()
    .from(wallet)
    .where(eq(wallet.userId, session.user.id))
    .limit(1);

  const requesterWallet = await getOrCreateWallet(requestRow.requesterId);

  if (!payerWallet || !requesterWallet) {
    redirect("/requests?error=Wallet not found");
  }

  const amount = Number.parseFloat(requestRow.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    redirect("/requests?error=Invalid request amount");
  }

  const [debited] = await db
    .update(wallet)
    .set({ balance: sql`${wallet.balance} - ${amount}` })
    .where(and(eq(wallet.id, payerWallet.id), gte(wallet.balance, amount.toFixed(2))))
    .returning({ id: wallet.id });

  if (!debited) {
    redirect("/requests?error=Insufficient wallet balance");
  }

  await db
    .update(wallet)
    .set({ balance: sql`${wallet.balance} + ${amount}` })
    .where(eq(wallet.id, requesterWallet.id));

  const [transfer] = await db
    .insert(internalTransfers)
    .values({
      senderId: session.user.id,
      receiverId: requestRow.requesterId,
      amount: amount.toFixed(2),
      status: "COMPLETED",
    })
    .returning({ id: internalTransfers.id });

  await db
    .update(walletMoneyRequests)
    .set({
      status: "PAID",
      paidAt: new Date(),
      internalTransferId: transfer.id,
    })
    .where(eq(walletMoneyRequests.id, requestRow.id));

  await db.insert(transactions).values({
    userId: session.user.id,
    walletId: payerWallet.id,
    amount: amount.toFixed(2),
    type: "TRANSFER_OUT",
    referenceType: "WALLET_REQUEST_PAYMENT",
    referenceId: transfer.id,
    description: `Paid wallet request to ${requesterWallet.pxId}.`,
    status: "SUCCESSFUL",
  });

  await db.insert(transactions).values({
    userId: requestRow.requesterId,
    walletId: requesterWallet.id,
    amount: amount.toFixed(2),
    type: "TRANSFER_IN",
    referenceType: "WALLET_REQUEST_PAYMENT",
    referenceId: transfer.id,
    description: `Received wallet request payment from ${payerWallet.pxId}.`,
    status: "SUCCESSFUL",
  });

  redirect("/requests?success=Request paid successfully");
}
