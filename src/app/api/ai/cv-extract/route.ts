import { NextResponse } from "next/server";
import { getProfile } from "@/lib/profile";
import { aiEnabled, aiExtractCv } from "@/lib/ai";
import { q1 } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST() {
  if (!aiEnabled()) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 400 });
  const profile = await getProfile();
  if (!profile.cvDocumentId) return NextResponse.json({ error: "Upload a CV first" }, { status: 400 });
  const doc = await q1<{ extracted_text: string | null }>("SELECT extracted_text FROM documents WHERE id = $1", [profile.cvDocumentId]);
  if (!doc?.extracted_text) return NextResponse.json({ error: "No text extracted from CV" }, { status: 400 });
  try {
    const output = await aiExtractCv(doc.extracted_text, profile);
    return NextResponse.json({ output });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
