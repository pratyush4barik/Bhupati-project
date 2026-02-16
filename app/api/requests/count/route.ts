import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  groupMembers,
  groupSubscriptionSplits,
  groupSubscriptions,
  walletMoneyRequests,
} from "@/db/schema";
import { requireSession } from "@/lib/require-session";

export async function GET() {
  const session = await requireSession();
  const userId = session.user.id;

  const [groupCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(groupSubscriptionSplits)
    .innerJoin(
      groupSubscriptions,
      eq(groupSubscriptions.id, groupSubscriptionSplits.groupSubscriptionId),
    )
    .innerJoin(
      groupMembers,
      and(
        eq(groupMembers.groupId, groupSubscriptions.groupId),
        eq(groupMembers.userId, userId),
        eq(groupMembers.role, "MEMBER"),
      ),
    )
    .where(
      and(
        eq(groupSubscriptionSplits.userId, userId),
        inArray(groupSubscriptionSplits.paymentStatus, ["PENDING", "ACCEPTED"]),
        isNull(groupSubscriptions.deletedAt),
      ),
    );

  const [walletCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(walletMoneyRequests)
    .where(
      and(
        eq(walletMoneyRequests.receiverId, userId),
        eq(walletMoneyRequests.status, "PENDING"),
      ),
    );

  const count = (groupCountRow?.count ?? 0) + (walletCountRow?.count ?? 0);
  return NextResponse.json({ count });
}
