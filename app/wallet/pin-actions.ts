"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { wallet } from "@/db/schema";
import { requireSession } from "@/lib/require-session";

// Simple hash for PIN (uses Web Crypto API available in Node 18+)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "payxen-pin-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export async function setPinAction(formData: FormData) {
  const session = await requireSession();
  const pin = (formData.get("pin") as string)?.trim() ?? "";
  const confirmPin = (formData.get("confirmPin") as string)?.trim() ?? "";
  const returnTo = (formData.get("returnTo") as string)?.trim() || "";

  if (!isValidPin(pin)) {
    redirect("/wallet?error=PIN must be exactly 4 digits");
  }

  if (pin !== confirmPin) {
    redirect("/wallet?error=PINs do not match");
  }

  const [userWallet] = await db
    .select()
    .from(wallet)
    .where(eq(wallet.userId, session.user.id))
    .limit(1);

  if (!userWallet) {
    redirect("/wallet?error=Wallet not found");
  }

  if (userWallet.pinHash) {
    redirect("/wallet?error=PIN is already set. Use reset instead.");
  }

  const hashed = await hashPin(pin);

  await db
    .update(wallet)
    .set({ pinHash: hashed })
    .where(eq(wallet.id, userWallet.id));

  if (returnTo) {
    redirect(returnTo);
  }
  redirect("/wallet?success=PIN set successfully");
}

export async function resetPinAction() {
  redirect("/wallet?error=Use security code verification to reset your PIN.");
}

export async function verifyPinAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession();
  const pin = (formData.get("pin") as string)?.trim() ?? "";

  if (!isValidPin(pin)) {
    return { success: false, error: "PIN must be exactly 4 digits" };
  }

  const [userWallet] = await db
    .select({ pinHash: wallet.pinHash })
    .from(wallet)
    .where(eq(wallet.userId, session.user.id))
    .limit(1);

  if (!userWallet) {
    return { success: false, error: "Wallet not found" };
  }

  if (!userWallet.pinHash) {
    return { success: false, error: "PIN not set. Please set your PIN first." };
  }

  const hashed = await hashPin(pin);

  if (hashed !== userWallet.pinHash) {
    return { success: false, error: "Incorrect PIN" };
  }

  return { success: true };
}
