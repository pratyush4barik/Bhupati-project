import { and, eq, lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { usageLogs } from "@/db/schema";
import { authenticateMonitorBearerToken } from "@/lib/monitor-auth";
import { normalizeMonitorServiceName } from "@/lib/monitor-services";

type UsageRecordInput = {
  serviceName: string;
  focusedMinutes: number;
  date: string;
  eventId: string;
};

const MAX_BATCH_SIZE = 300;

function validateRecord(input: UsageRecordInput) {
  const serviceName = normalizeMonitorServiceName(input.serviceName);
  if (!serviceName) return { error: "Invalid service name" as const };

  if (!Number.isInteger(input.focusedMinutes) || input.focusedMinutes <= 0 || input.focusedMinutes > 120) {
    return { error: "Invalid focused minutes" as const };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { error: "Invalid date format" as const };
  }

  const parsedDate = new Date(`${input.date}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime())) {
    return { error: "Invalid date value" as const };
  }

  if (typeof input.eventId !== "string" || input.eventId.length < 8 || input.eventId.length > 128) {
    return { error: "Invalid event id" as const };
  }

  return {
    serviceName,
    focusedMinutes: input.focusedMinutes,
    date: input.date,
    sourceEventId: input.eventId,
  };
}

export async function POST(request: Request) {
  const auth = await authenticateMonitorBearerToken(request.headers.get("authorization"));
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: { records?: UsageRecordInput[] };
  try {
    payload = (await request.json()) as { records?: UsageRecordInput[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const records = payload.records;
  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: "records must be a non-empty array" }, { status: 400 });
  }

  if (records.length > MAX_BATCH_SIZE) {
    return NextResponse.json({ error: `Batch too large. Max ${MAX_BATCH_SIZE} records` }, { status: 400 });
  }

  const prepared: Array<{
    userId: string;
    serviceName: string;
    focusedMinutes: number;
    date: string;
    sourceEventId: string;
  }> = [];

  for (const record of records) {
    const validated = validateRecord(record);
    if ("error" in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    prepared.push({
      userId: auth.userId,
      ...validated,
    });
  }

  const insertedRows = await db
    .insert(usageLogs)
    .values(prepared)
    .onConflictDoNothing({
      target: [usageLogs.userId, usageLogs.sourceEventId],
    })
    .returning({
      id: usageLogs.id,
    });

  await db
    .delete(usageLogs)
    .where(
      and(
        eq(usageLogs.userId, auth.userId),
        lt(usageLogs.date, sql`current_date - interval '180 days'`),
      ),
    );

  return NextResponse.json({
    accepted: insertedRows.length,
    skipped: prepared.length - insertedRows.length,
  });
}

