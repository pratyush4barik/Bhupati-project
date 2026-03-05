import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/db";
import { verification } from "@/db/schema";
import { requireSession } from "@/lib/require-session";

const RESET_CODE_EXPIRY_MINUTES = 10;

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function hashResetCode(userId: string, code: string) {
  const salt = process.env.BETTER_AUTH_SECRET ?? "payxen-wallet-pin-reset";
  const input = `${userId}:${code}:${salt}`;
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST() {
  const session = await requireSession();

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Email service is not configured. Please contact support." },
      { status: 503 },
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const code = generateCode();
  const codeHash = await hashResetCode(session.user.id, code);
  const identifier = `wallet-pin-reset:${session.user.id}`;
  const expiresAt = new Date(Date.now() + RESET_CODE_EXPIRY_MINUTES * 60 * 1000);

  const existing = await db
    .select({ id: verification.id })
    .from(verification)
    .where(eq(verification.identifier, identifier))
    .limit(1);

  if (existing[0]) {
    await db.delete(verification).where(eq(verification.id, existing[0].id));
  }

  await db.insert(verification).values({
    id: crypto.randomUUID(),
    identifier,
    value: `${codeHash}:0`,
    expiresAt,
  });

  await resend.emails.send({
    from,
    to: session.user.email,
    subject: "PayXen Wallet PIN reset security code",
    text: `Your PayXen wallet PIN reset security code is ${code}. It expires in ${RESET_CODE_EXPIRY_MINUTES} minutes.`,
    html: `<p>Your PayXen wallet PIN reset security code is <strong>${code}</strong>.</p><p>This code expires in ${RESET_CODE_EXPIRY_MINUTES} minutes.</p>`,
  });

  return NextResponse.json({ success: true });
}
