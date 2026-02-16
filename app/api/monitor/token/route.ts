import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { monitorTokens } from "@/db/schema";
import { createMonitorJwt, hashToken } from "@/lib/monitor-jwt";
import { requireSession } from "@/lib/require-session";

const MONITOR_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export async function GET() {
  const session = await requireSession();

  const [activeToken] = await db
    .select({
      id: monitorTokens.id,
      createdAt: monitorTokens.createdAt,
      expiresAt: monitorTokens.expiresAt,
    })
    .from(monitorTokens)
    .where(
      and(
        eq(monitorTokens.userId, session.user.id),
        eq(monitorTokens.isRevoked, false),
      ),
    )
    .limit(1);

  return NextResponse.json({
    connected: Boolean(activeToken),
    createdAt: activeToken?.createdAt?.toISOString() ?? null,
    expiresAt: activeToken?.expiresAt?.toISOString() ?? null,
  });
}

export async function POST() {
  const session = await requireSession();
  const tokenId = crypto.randomUUID();

  let token: string;
  try {
    token = createMonitorJwt(session.user.id, tokenId, MONITOR_TOKEN_TTL_SECONDS);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create monitor token";
    if (message.includes("MONITOR_JWT_SECRET")) {
      return NextResponse.json(
        { error: "Monitor token service is not configured. Set MONITOR_JWT_SECRET on the server." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Unable to create monitor token." }, { status: 500 });
  }

  await db
    .update(monitorTokens)
    .set({
      isRevoked: true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(monitorTokens.userId, session.user.id),
        eq(monitorTokens.isRevoked, false),
      ),
    );

  const expiresAt = new Date(Date.now() + MONITOR_TOKEN_TTL_SECONDS * 1000);
  await db.insert(monitorTokens).values({
    userId: session.user.id,
    tokenId,
    tokenHash: hashToken(token),
    isRevoked: false,
    expiresAt,
  });

  return NextResponse.json({
    token,
    expiresAt: expiresAt.toISOString(),
  });
}

export async function DELETE() {
  const session = await requireSession();
  await db
    .update(monitorTokens)
    .set({
      isRevoked: true,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(monitorTokens.userId, session.user.id),
        eq(monitorTokens.isRevoked, false),
      ),
    );

  return NextResponse.json({ success: true });
}
