import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireSession } from "@/lib/require-session";

export async function GET() {
  const session = await requireSession();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, session.user.id),
        eq(notifications.isRead, false),
      ),
    );

  return NextResponse.json({ count: row?.count ?? 0 });
}
