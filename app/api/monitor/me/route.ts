import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { authenticateMonitorBearerToken } from "@/lib/monitor-auth";

export async function GET(request: Request) {
  const auth = await authenticateMonitorBearerToken(request.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [foundUser] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(user)
    .where(eq(user.id, auth.userId))
    .limit(1);

  if (!foundUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user: foundUser });
}
