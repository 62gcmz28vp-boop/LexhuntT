import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { evaluateAlerts } from "@/lib/notify";
import { expireByDeadline } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Daily deadline / follow-up reminders and digest emails (no external fetching). */
export async function GET(req: NextRequest) {
  if (!env.cronSecret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const closed = await expireByDeadline();
  const created = await evaluateAlerts({ newJobIds: [], changedFirms: [] });
  return NextResponse.json({ closed, notifications: created });
}
