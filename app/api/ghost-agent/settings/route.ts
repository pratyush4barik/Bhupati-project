import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ghostAgentRules } from "@/db/schema";
import { requireSession } from "@/lib/require-session";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = await req.json();
  const { subscriptionId, minUsageMinutes } = body as {
    subscriptionId: string;
    minUsageMinutes: number;
  };

  if (!subscriptionId || typeof minUsageMinutes !== "number" || minUsageMinutes < 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(ghostAgentRules)
    .where(
      and(
        eq(ghostAgentRules.userId, session.user.id),
        eq(ghostAgentRules.subscriptionId, subscriptionId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(ghostAgentRules)
      .set({ minUsageMinutes, updatedAt: new Date() })
      .where(eq(ghostAgentRules.id, existing.id));
  } else {
    await db.insert(ghostAgentRules).values({
      userId: session.user.id,
      subscriptionId,
      minUsageMinutes,
    });
  }

  return NextResponse.json({ success: true });
}
