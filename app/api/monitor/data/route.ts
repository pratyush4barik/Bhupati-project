import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { monitorTokens, usageLogs } from "@/db/schema";
import { requireSession } from "@/lib/require-session";

export async function DELETE() {
  const session = await requireSession();

  await Promise.all([
    db.delete(usageLogs).where(eq(usageLogs.userId, session.user.id)),
    db
      .update(monitorTokens)
      .set({
        isRevoked: true,
        updatedAt: new Date(),
      })
      .where(eq(monitorTokens.userId, session.user.id)),
  ]);

  return NextResponse.json({
    success: true,
    message: "Monitor usage data deleted and monitor tokens revoked.",
  });
}

