import { NextResponse, type NextRequest } from "next/server";
import { firmBySlug } from "@/data/firms";
import { getProfile } from "@/lib/profile";
import { aiApproach, aiEnabled } from "@/lib/ai";
import { templateApproach } from "@/lib/templates";
import { q, json } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const { slug } = (await req.json()) as { slug?: string };
  const firm = slug ? firmBySlug(slug) : undefined;
  if (!firm) return NextResponse.json({ error: "Firm not found" }, { status: 404 });
  const profile = await getProfile();
  let output;
  let engine = "template";
  if (aiEnabled()) {
    try {
      output = await aiApproach(firm, profile);
      engine = env.anthropicModel;
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 502 });
    }
  } else output = templateApproach(firm, profile);
  await q("INSERT INTO ai_outputs (subject_type, subject_id, kind, content, engine) VALUES ('firm', $1, 'approach', $2::jsonb, $3)", [firm.slug, json(output), engine]);
  return NextResponse.json({ output, engine });
}
