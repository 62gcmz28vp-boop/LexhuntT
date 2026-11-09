import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getJob } from "@/lib/jobs";
import { getProfile } from "@/lib/profile";
import { aiApplySmarter, aiEnabled } from "@/lib/ai";
import { templateApplySmarter } from "@/lib/templates";
import { firmBySlug } from "@/data/firms";
import { q, json } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { jobId } = (await req.json()) as { jobId?: string };
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });
  const found = await getJob(jobId);
  if (!found) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  const profile = await getProfile();
  const firm = found.job.employer_slug ? firmBySlug(found.job.employer_slug) : null;

  let output;
  let engine = "template";
  if (aiEnabled()) {
    try {
      output = await aiApplySmarter(found.job, profile, firm);
      engine = env.anthropicModel;
    } catch (e) {
      const msg =
        e instanceof Anthropic.AuthenticationError
          ? "Anthropic API key rejected — check ANTHROPIC_API_KEY."
          : e instanceof Anthropic.RateLimitError
            ? "Rate limited by the Anthropic API — try again in a minute."
            : e instanceof Anthropic.APIError
              ? `Anthropic API error ${e.status}: ${e.message}`
              : (e as Error).message;
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  } else {
    output = templateApplySmarter(found.job, profile, firm);
  }
  await q("INSERT INTO ai_outputs (subject_type, subject_id, kind, content, engine) VALUES ('job', $1, 'apply_smarter', $2::jsonb, $3)", [jobId, json(output), engine]);
  return NextResponse.json({ output, engine });
}
