import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { monitorTokens } from "@/db/schema";
import { hashToken, verifyMonitorJwt } from "@/lib/monitor-jwt";

export async function authenticateMonitorBearerToken(authorizationHeader: string | null) {
  if (!authorizationHeader?.startsWith("Bearer ")) return null;
  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const payload = verifyMonitorJwt(token);
  if (!payload) return null;

  const [tokenRow] = await db
    .select()
    .from(monitorTokens)
    .where(
      and(
        eq(monitorTokens.userId, payload.sub),
        eq(monitorTokens.tokenId, payload.jti),
        eq(monitorTokens.isRevoked, false),
      ),
    )
    .limit(1);

  if (!tokenRow) return null;
  if (tokenRow.expiresAt.getTime() <= Date.now()) return null;
  if (tokenRow.tokenHash !== hashToken(token)) return null;

  return {
    userId: payload.sub,
    tokenId: payload.jti,
  };
}

