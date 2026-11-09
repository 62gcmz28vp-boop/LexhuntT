import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";
import type { Firm, JobRow, Profile } from "./types";

/**
 * Claude integration. Every prompt enforces the integrity rule: use ONLY facts from the verified profile;
 * never invent achievements, grades, dates, credentials or admission status; mark unknowns as [placeholders].
 * When ANTHROPIC_API_KEY is absent, callers fall back to deterministic templates (clearly labelled).
 */
export const aiEnabled = () => !!env.anthropicKey;

const INTEGRITY = `You are LEXHUNT's application assistant for a law graduate in Riyadh seeking an entry-level legal role.
Absolute rules:
- Use ONLY facts present in the CANDIDATE PROFILE. Never invent achievements, grades, university names, dates, deal values, client names, credentials, licence or admission status.
- Where a fact is unknown, write a bracketed placeholder such as [University name] or [graduation year] for the candidate to fill in.
- Do not disclose or invent confidential client details; describe work by type (e.g. "a due diligence report for an acquisition").
- Never estimate the probability of receiving an offer.
- Base statements about the employer ONLY on the FIRM RESEARCH provided; if something is not provided, say it is not publicly disclosed.
- Write in polished British English unless asked for Arabic. Keep a confident, precise, modest tone suitable for international law firms.`;

function client() {
  return new Anthropic({ apiKey: env.anthropicKey });
}

async function structured<T>(system: string, user: string, schema: Record<string, unknown>, maxTokens = 32000): Promise<T> {
  const stream = client().beta.messages.stream({
    model: env.anthropicModel,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content: user }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") throw new Error("The model declined this request. Try rephrasing the job description.");
  if (msg.stop_reason === "max_tokens") throw new Error("Response was truncated (max_tokens). Try again.");
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  return JSON.parse(text) as T;
}

export function describeProfile(p: Profile) {
  return JSON.stringify(
    {
      fullName: p.fullName ?? "[Full name]",
      location: p.location,
      saudiNational: p.saudiNational ?? "unknown",
      licenseStatus: p.licenseStatus,
      education: p.education,
      experience: p.experience,
      skills: p.skills,
      languages: p.languages,
      certifications: p.certifications,
    },
    null,
    2,
  );
}

export function describeFirm(f?: Firm | null) {
  if (!f) return "No firm research available for this employer.";
  return JSON.stringify(
    {
      name: f.name,
      classification: f.classification,
      riyadhOffice: f.riyadhOffice,
      practiceAreas: f.practiceAreas,
      graduateRecruitment: f.graduateRecruitment,
      recruitmentProcess: f.recruitmentProcess,
      hiringNote: f.hiringNote,
      signals: f.signals,
    },
    null,
    2,
  );
}

// ───────────────────────────── Apply Smarter ─────────────────────────────

export interface ApplySmarterOutput {
  roleAnalysis: string;
  requirements: { requirement: string; evidence: string; status: "met" | "partial" | "gap" | "unknown" }[];
  cvImprovements: string[];
  emphasise: string[];
  coverLetter: string;
  recruitmentEmail: { subject: string; body: string };
  firmBrief: string;
  interviewQuestions: { question: string; whyTheyAsk: string; modelAnswer: string }[];
  checklist: string[];
  integrityNotes: string[];
}

const str = { type: "string" };
const arr = (items: Record<string, unknown>) => ({ type: "array", items });
const obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });

export const APPLY_SCHEMA = obj({
  roleAnalysis: str,
  requirements: arr(obj({ requirement: str, evidence: str, status: { type: "string", enum: ["met", "partial", "gap", "unknown"] } })),
  cvImprovements: arr(str),
  emphasise: arr(str),
  coverLetter: str,
  recruitmentEmail: obj({ subject: str, body: str }),
  firmBrief: str,
  interviewQuestions: arr(obj({ question: str, whyTheyAsk: str, modelAnswer: str })),
  checklist: arr(str),
  integrityNotes: arr(str),
});

export async function aiApplySmarter(job: JobRow, profile: Profile, firm: Firm | null | undefined): Promise<ApplySmarterOutput> {
  const user = `Prepare a complete, tailored application pack.

JOB (as advertised; status: ${job.status}):
Title: ${job.title}
Employer: ${job.employer}
Location: ${job.location ?? "unknown"} · Mode: ${job.work_mode}
Experience: ${job.experience_min ?? "?"}–${job.experience_max ?? "?"} years
Licence requirement: ${job.license_req}
Nationality requirement: ${job.nationality_req ?? "none stated"}
Eligibility note: ${job.eligibility_note ?? "none"}
Description:
${job.description ?? "(no description captured — say so where relevant)"}

FIRM RESEARCH:
${describeFirm(firm)}

CANDIDATE PROFILE (the only permitted source of facts about the candidate):
${describeProfile(profile)}

Produce:
1. roleAnalysis — what the role really involves and what the employer is screening for.
2. requirements — each stated requirement mapped to profile evidence (quote the profile bullet) with status.
3. cvImprovements — legitimate re-ordering / re-wording suggestions using existing facts only (no new facts).
4. emphasise — the specific experience points to lead with.
5. coverLetter — max ~350 words, addressed to "[Recruitment team / named contact]", with placeholders for unknowns.
6. recruitmentEmail — short email to accompany the application.
7. firmBrief — the firm's practice areas and recruitment criteria strictly from FIRM RESEARCH.
8. interviewQuestions — 8–10 likely questions for THIS role (technical + motivational + Saudi-law), each with a model answer grounded only in the profile.
9. checklist — submission checklist (documents, eligibility confirmations, portal steps, follow-up date).
10. integrityNotes — anything the candidate must verify or fill in before sending.`;
  return structured<ApplySmarterOutput>(INTEGRITY, user, APPLY_SCHEMA);
}

// ───────────────────────────── CV extraction ─────────────────────────────

export interface CvExtraction {
  fullName: string | null;
  education: { institution: string | null; degree: string | null; year: string | null; grade: string | null; evidence: string }[];
  experience: { organisation: string; role: string; location: string | null; start: string | null; end: string | null; bullets: string[]; evidence: string }[];
  skills: string[];
  languages: { language: string; level: string | null }[];
  certifications: string[];
  licenseStatusMentioned: string | null;
  nationalityMentioned: string | null;
  discrepancies: string[];
}

const nstr = { type: ["string", "null"] };
export const CV_SCHEMA = obj({
  fullName: nstr,
  education: arr(obj({ institution: nstr, degree: nstr, year: nstr, grade: nstr, evidence: str })),
  experience: arr(obj({ organisation: str, role: str, location: nstr, start: nstr, end: nstr, bullets: arr(str), evidence: str })),
  skills: arr(str),
  languages: arr(obj({ language: str, level: nstr })),
  certifications: arr(str),
  licenseStatusMentioned: nstr,
  nationalityMentioned: nstr,
  discrepancies: arr(str),
});

export async function aiExtractCv(cvText: string, current: Profile): Promise<CvExtraction> {
  const user = `Extract the candidate's profile from this CV text. Copy facts verbatim or near-verbatim; for every education/experience item include a short "evidence" quote from the CV. Use null where the CV does not state something. Do not infer grades, dates or licence status.
Also list "discrepancies": differences between the CV and the CURRENT PROFILE below (e.g. a bullet in the profile not supported by the CV).

CURRENT PROFILE:
${describeProfile(current)}

CV TEXT:
${cvText.slice(0, 60000)}`;
  return structured<CvExtraction>(INTEGRITY, user, CV_SCHEMA, 16000);
}

// ───────────────────────────── Speculative approach ─────────────────────────────

export interface ApproachOutput {
  subject: string;
  body: string;
  angle: string;
  followUp: string;
}
export const APPROACH_SCHEMA = obj({ subject: str, body: str, angle: str, followUp: str });

export async function aiApproach(firm: Firm, profile: Profile): Promise<ApproachOutput> {
  const user = `Write a concise speculative email (≤220 words) expressing interest in trainee associate opportunities at this firm's Riyadh office.
It must be clearly speculative (do not imply a vacancy exists). Reference one or two specific public signals from FIRM RESEARCH and connect them to the candidate's real experience.
Also give "angle" (one-sentence positioning) and "followUp" (a short polite follow-up message for 10 working days later).

FIRM RESEARCH:
${describeFirm(firm)}

CANDIDATE PROFILE:
${describeProfile(profile)}`;
  return structured<ApproachOutput>(INTEGRITY, user, APPROACH_SCHEMA, 8000);
}
