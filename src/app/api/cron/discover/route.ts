import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { runDiscovery } from "@/lib/discovery";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Scheduled discovery. Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically. */
export async function GET(req: NextRequest) {
  if (!env.cronSecret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const r = await runDiscovery("cron");
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
