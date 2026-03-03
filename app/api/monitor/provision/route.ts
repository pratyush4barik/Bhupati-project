import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { monitorTokens, user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createMonitorJwt, hashToken } from "@/lib/monitor-jwt";

const MONITOR_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * POST /api/monitor/provision
 *
 * Accepts email + password (JSON body) and:
 *  1. Authenticates via Better Auth
 *  2. Creates a monitor JWT for the authenticated user
 *  3. Returns { token, user } so the desktop app can connect in one step
 *
 * This avoids the need for the desktop user to manually copy a JWT token.
 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  /* ── 1. Sign in via Better Auth internal API ── */
  const signInUrl = new URL("/api/auth/sign-in/email", request.url);
  const signInResponse = await auth.handler(
    new Request(signInUrl.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  );

  if (!signInResponse.ok) {
    const data = await signInResponse.json().catch(() => null);
    const message =
      (data as { message?: string } | null)?.message ?? "Invalid email or password.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  /* Extract session cookie from the sign-in response */
  const setCookie = signInResponse.headers.get("set-cookie") ?? "";
  const sessionTokenMatch = setCookie.match(
    /better-auth\.session_token=([^;]+)/,
  );

  /* ── 2. Resolve user from session ── */
  let userId: string | null = null;

  if (sessionTokenMatch?.[1]) {
    /* Use the session endpoint with the cookie to get user info */
    const sessionUrl = new URL("/api/auth/get-session", request.url);
    const sessionResponse = await auth.handler(
      new Request(sessionUrl.toString(), {
        method: "GET",
        headers: {
          cookie: `better-auth.session_token=${sessionTokenMatch[1]}`,
        },
      }),
    );

    if (sessionResponse.ok) {
      const sessionData = (await sessionResponse.json()) as {
        user?: { id: string };
      };
      userId = sessionData.user?.id ?? null;
    }
  }

  /* Fallback: look up user by email */
  if (!userId) {
    const [found] = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1);
    userId = found?.id ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  /* ── 3. Provision monitor token ── */
  const tokenId = crypto.randomUUID();
  let token: string;
  try {
    token = createMonitorJwt(userId, tokenId, MONITOR_TOKEN_TTL_SECONDS);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create token";
    if (message.includes("MONITOR_JWT_SECRET")) {
      return NextResponse.json(
        { error: "Monitor token service is not configured." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Unable to create monitor token." }, { status: 500 });
  }

  /* Revoke existing tokens for this user */
  await db
    .update(monitorTokens)
    .set({ isRevoked: true, updatedAt: new Date() })
    .where(
      and(
        eq(monitorTokens.userId, userId),
        eq(monitorTokens.isRevoked, false),
      ),
    );

  const expiresAt = new Date(Date.now() + MONITOR_TOKEN_TTL_SECONDS * 1000);
  await db.insert(monitorTokens).values({
    userId,
    tokenId,
    tokenHash: hashToken(token),
    isRevoked: false,
    expiresAt,
  });

  /* ── 4. Fetch user profile ── */
  const [profile] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      image: userTable.image,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  return NextResponse.json({
    token,
    expiresAt: expiresAt.toISOString(),
    user: profile ?? null,
  });
}
