import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { verification, wallet } from "@/db/schema";
import { requireSession } from "@/lib/require-session";

const MAX_ATTEMPTS = 5;

async function hashResetCode(userId: string, code: string) {
  const salt = process.env.BETTER_AUTH_SECRET ?? "payxen-wallet-pin-reset";
  const input = `${userId}:${code}:${salt}`;
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(request: Request) {
  const session = await requireSession();

  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const code = body?.code?.trim() ?? "";

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter a valid 6-digit security code." }, { status: 400 });
  }

  const identifier = `wallet-pin-reset:${session.user.id}`;
  const [record] = await db
    .select()
    .from(verification)
    .where(eq(verification.identifier, identifier))
    .limit(1);

  if (!record) {
    return NextResponse.json({ error: "Security code not found. Request a new one." }, { status: 400 });
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await db.delete(verification).where(eq(verification.id, record.id));
    return NextResponse.json({ error: "Security code expired. Request a new one." }, { status: 400 });
  }

  const [storedHash, attemptsText = "0"] = record.value.split(":");
  const attempts = Number.parseInt(attemptsText, 10) || 0;

  if (attempts >= MAX_ATTEMPTS) {
    await db.delete(verification).where(eq(verification.id, record.id));
    return NextResponse.json(
      { error: "Too many attempts. Request a new security code." },
      { status: 403 },
    );
  }

  const incomingHash = await hashResetCode(session.user.id, code);
  if (incomingHash !== storedHash) {
    await db
      .update(verification)
      .set({ value: `${storedHash}:${attempts + 1}` })
      .where(eq(verification.id, record.id));

    return NextResponse.json({ error: "Invalid security code." }, { status: 400 });
  }

  await db.delete(verification).where(eq(verification.id, record.id));
  await db.update(wallet).set({ pinHash: null }).where(eq(wallet.userId, session.user.id));

  return NextResponse.json({ success: true });
}
