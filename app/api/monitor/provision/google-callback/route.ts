import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { monitorTokens, user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { createMonitorJwt, hashToken } from "@/lib/monitor-jwt";

const MONITOR_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * GET /api/monitor/provision/google-callback
 *
 * Called by the Electron app's OAuth popup after Google redirects back.
 * Reads the Better Auth session cookie, provisions a monitor JWT,
 * and serves a small HTML page that passes the token back to the Electron app
 * via a custom protocol or postMessage.
 */
export async function GET(request: Request) {
  /* ── 1. Read session from cookie ── */
  const cookieHeader = request.headers.get("cookie") ?? "";
  const sessionUrl = new URL("/api/auth/get-session", request.url);
  const sessionResponse = await auth.handler(
    new Request(sessionUrl.toString(), {
      method: "GET",
      headers: { cookie: cookieHeader },
    }),
  );

  if (!sessionResponse.ok) {
    return new NextResponse(renderHtml("error", "Not authenticated. Please try again."), {
      status: 401,
      headers: { "content-type": "text/html" },
    });
  }

  const sessionData = (await sessionResponse.json()) as {
    user?: { id: string };
  };
  const userId = sessionData.user?.id;
  if (!userId) {
    return new NextResponse(renderHtml("error", "Session expired."), {
      status: 401,
      headers: { "content-type": "text/html" },
    });
  }

  /* ── 2. Provision monitor token ── */
  const tokenId = crypto.randomUUID();
  let token: string;
  try {
    token = createMonitorJwt(userId, tokenId, MONITOR_TOKEN_TTL_SECONDS);
  } catch {
    return new NextResponse(renderHtml("error", "Token service unavailable."), {
      status: 503,
      headers: { "content-type": "text/html" },
    });
  }

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

  /* ── 3. Fetch profile ── */
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

  /* ── 4. Return HTML page that posts result to the Electron window ── */
  const payload = JSON.stringify({
    token,
    expiresAt: expiresAt.toISOString(),
    user: profile ?? null,
  });

  return new NextResponse(renderHtml("success", payload), {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

function renderHtml(status: "success" | "error", data: string) {
  if (status === "error") {
    return `<!DOCTYPE html>
<html><head><title>PayXen – Login Failed</title>
<style>body{font-family:Inter,sans-serif;background:#09090b;color:#fafafa;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.card{text-align:center;max-width:360px}.err{color:#ef4444;margin-top:8px}</style></head>
<body><div class="card"><h2>Login Failed</h2><p class="err">${data}</p><p style="color:#a1a1aa">You can close this window.</p></div></body></html>`;
  }

  return `<!DOCTYPE html>
<html><head><title>PayXen – Login Successful</title>
<style>body{font-family:Inter,sans-serif;background:#09090b;color:#fafafa;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.card{text-align:center;max-width:360px}.ok{color:#4ade80}</style></head>
<body>
<div class="card"><h2 class="ok">Login Successful</h2><p style="color:#a1a1aa">Connecting to PayXen Monitor…</p></div>
<script>document.title="PAYXEN_AUTH_RESULT:"+${JSON.stringify(data)};</script>
</body></html>`;
}
