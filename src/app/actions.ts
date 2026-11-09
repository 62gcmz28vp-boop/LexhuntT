"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { q, q1, json } from "@/lib/db";
import { rescoreAll, rescoreJob, setJobStatus, upsertJob } from "@/lib/jobs";
import { getProfile, saveProfile } from "@/lib/profile";
import { runDiscovery } from "@/lib/discovery";
import { sendEmail, setSetting, emailConfigured } from "@/lib/notify";
import { classifyKind, detectLicense, detectPracticeAreas, parseExperience } from "@/lib/taxonomy";
import { classifyEmployer } from "@/lib/discovery/normalize";
import { extractText, ALLOWED_CV_TYPES } from "@/lib/cv";
import type { JobStatus, Profile } from "@/lib/types";
import { STAGES } from "@/lib/stages";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const dateOrNull = (v: string) => (v ? new Date(v).toISOString() : null);

// ── Opportunities ──
export async function toggleSaved(id: string) {
  await q("UPDATE jobs SET saved = NOT saved, is_new = false WHERE id = $1", [id]);
  revalidatePath("/", "layout");
}

export async function dismissJob(id: string) {
  await q("UPDATE jobs SET dismissed = true, is_new = false WHERE id = $1", [id]);
  revalidatePath("/", "layout");
}

export async function markSeen(ids: string[]) {
  if (ids.length) await q("UPDATE jobs SET is_new = false WHERE id = ANY($1::text[])", [ids]);
}

export async function verifyJobStatus(id: string, status: JobStatus, note: string) {
  await setJobStatus(id, status, note ? `Manually ${status}: ${note}` : `Manually marked ${status}`);
  if (note) await q("UPDATE jobs SET verification_note = $2 WHERE id = $1", [id, note]);
  revalidatePath(`/opportunities/${id}`);
  revalidatePath("/opportunities");
}

export async function addManualJob(form: FormData) {
  const title = str(form, "title");
  const employer = str(form, "employer");
  const url = str(form, "url");
  if (!title || !employer || !/^https?:\/\//.test(url)) throw new Error("Title, employer and a valid source URL are required");
  const description = str(form, "description");
  const text = `${title}\n${description}`;
  const exp = parseExperience(text);
  const { category, slug } = classifyEmployer(employer);
  const { id } = await upsertJob({
    title,
    employer,
    employerSlug: slug,
    category,
    kind: classifyKind(title),
    location: str(form, "location") || "Riyadh",
    workMode: (str(form, "workMode") as "onsite") || "unknown",
    experienceMin: exp.min,
    experienceMax: exp.max,
    deadline: dateOrNull(str(form, "deadline")),
    status: str(form, "official") === "on" ? "open" : "unverified",
    licenseReq: detectLicense(text),
    description,
    applyUrl: url,
    practiceAreas: detectPracticeAreas(text),
    verificationNote: str(form, "official") === "on" ? "Added manually from the employer's official page." : "Added manually; source not yet confirmed as official.",
    source: { source: str(form, "official") === "on" ? "official:manual" : "manual", url, publisher: "Manual entry" },
    origin: "manual",
  });
  revalidatePath("/opportunities");
  redirect(`/opportunities/${id}`);
}

export async function runDiscoveryNow() {
  const r = await runDiscovery("manual");
  revalidatePath("/", "layout");
  return { newJobs: r.newJobs, updated: r.updatedJobs, closed: r.closedJobs, sources: r.sources.map((s) => `${s.source}: ${s.status}`) };
}

// ── Firms ──
export async function toggleWatch(slug: string) {
  await q("INSERT INTO firm_state (slug, watch) VALUES ($1, true) ON CONFLICT (slug) DO UPDATE SET watch = NOT firm_state.watch", [slug]);
  revalidatePath("/radar");
  revalidatePath(`/radar/${slug}`);
  revalidatePath("/hidden");
}

export async function saveFirmNotes(slug: string, form: FormData) {
  await q("INSERT INTO firm_state (slug, notes) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET notes = EXCLUDED.notes", [slug, str(form, "notes")]);
  revalidatePath(`/radar/${slug}`);
}

export async function checkFirmPageNow(slug: string) {
  const { FIRMS } = await import("@/data/firms");
  const f = FIRMS.find((x) => x.slug === slug);
  if (!f?.careersUrl) return { status: "error", detail: "No careers URL on file" };
  const { checkCareerPage } = await import("@/lib/discovery/sources/careerPages");
  const r = await checkCareerPage(slug, f.careersUrl);
  revalidatePath(`/radar/${slug}`);
  return { status: r.status, detail: r.detail, signals: r.signals };
}

// ── Pipeline ──
export async function createApplication(input: { jobId?: string; firmSlug?: string; title: string; employer: string; speculative?: boolean; deadline?: string | null }) {
  const existing = input.jobId ? await q1<{ id: number }>("SELECT id FROM applications WHERE job_id = $1", [input.jobId]) : null;
  if (existing) redirect(`/pipeline?app=${existing.id}`);
  const [row] = await q<{ id: number }>(
    "INSERT INTO applications (job_id, firm_slug, title, employer, stage, is_speculative, deadline) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
    [input.jobId ?? null, input.firmSlug ?? null, input.title, input.employer, "saved", !!input.speculative, input.deadline ?? null],
  );
  await q("INSERT INTO application_events (application_id, kind, title) VALUES ($1,'stage','Added to pipeline (Saved)')", [row.id]);
  if (input.jobId) await q("UPDATE jobs SET saved = true WHERE id = $1", [input.jobId]);
  revalidatePath("/pipeline");
  redirect(`/pipeline?app=${row.id}`);
}

export async function createApplicationFromForm(form: FormData) {
  await createApplication({ title: str(form, "title"), employer: str(form, "employer"), speculative: str(form, "speculative") === "on", deadline: dateOrNull(str(form, "deadline")) });
}

export async function setStage(appId: number, stage: string) {
  if (!STAGES.some((s) => s.key === stage)) throw new Error("Unknown stage");
  const app = await q1<{ stage: string; applied_at: Date | null }>("SELECT stage, applied_at FROM applications WHERE id = $1", [appId]);
  if (!app || app.stage === stage) return;
  const label = STAGES.find((s) => s.key === stage)!.label;
  // Suggested follow-up: 7 days after applying / 5 days after an interview
  const follow = stage === "applied" ? "now() + interval '7 days'" : ["interview", "final_interview", "assessment"].includes(stage) ? "now() + interval '5 days'" : "follow_up_at";
  await q(
    `UPDATE applications SET stage = $2, updated_at = now(), applied_at = CASE WHEN $2 = 'applied' AND applied_at IS NULL THEN now() ELSE applied_at END, follow_up_at = ${follow} WHERE id = $1`,
    [appId, stage],
  );
  await q("INSERT INTO application_events (application_id, kind, title) VALUES ($1,'stage',$2)", [appId, `Moved to ${label}`]);
  revalidatePath("/pipeline");
}

export async function updateApplication(appId: number, form: FormData) {
  await q("UPDATE applications SET notes = $2, deadline = $3, follow_up_at = $4, updated_at = now() WHERE id = $1", [appId, str(form, "notes"), dateOrNull(str(form, "deadline")), dateOrNull(str(form, "follow_up_at"))]);
  revalidatePath("/pipeline");
}

export async function addEvent(appId: number, form: FormData) {
  const title = str(form, "title");
  if (!title) return;
  await q("INSERT INTO application_events (application_id, kind, title, detail, at) VALUES ($1,$2,$3,$4,COALESCE($5::timestamptz, now()))", [appId, str(form, "kind") || "note", title, str(form, "detail"), dateOrNull(str(form, "at"))]);
  revalidatePath("/pipeline");
}

export async function deleteApplication(appId: number) {
  await q("DELETE FROM documents WHERE application_id = $1", [appId]);
  await q("DELETE FROM applications WHERE id = $1", [appId]);
  revalidatePath("/pipeline");
  redirect("/pipeline");
}

const MAX_BYTES = 6 * 1024 * 1024;

export async function uploadDocument(appId: number | null, kind: string, form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file");
  if (file.size > MAX_BYTES) throw new Error("Max 6 MB");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";
  let text: string | null = null;
  if (mime in ALLOWED_CV_TYPES) text = await extractText(buf, mime).catch(() => null);
  const [row] = await q<{ id: number }>(
    "INSERT INTO documents (kind, filename, mime, size, content_b64, extracted_text, application_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
    [kind, file.name.slice(0, 200), mime, file.size, buf.toString("base64"), text, appId],
  );
  if (appId) await q("INSERT INTO application_events (application_id, kind, title) VALUES ($1,'document',$2)", [appId, `Attached ${kind.replace("_", " ")}: ${file.name}`]);
  revalidatePath("/pipeline");
  return row.id;
}

export async function uploadAppDocument(appId: number, form: FormData) {
  await uploadDocument(appId, str(form, "kind") || "other", form);
}

export async function deleteDocument(id: number) {
  await q("DELETE FROM documents WHERE id = $1", [id]);
  revalidatePath("/pipeline");
  revalidatePath("/studio");
}

// ── Profile & CV ──
export async function uploadCv(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File) || !(file.type in ALLOWED_CV_TYPES)) throw new Error("Upload a PDF, DOCX or TXT CV");
  const id = await uploadDocument(null, "cv", form);
  const p = await getProfile();
  await saveProfile({ ...p, cvDocumentId: id, cvUpdatedAt: new Date().toISOString() });
  revalidatePath("/studio");
  redirect("/studio?tab=profile&cv=uploaded");
}

export async function saveProfileForm(form: FormData) {
  const p = await getProfile();
  const lines = (k: string) => str(form, k).split("\n").map((s) => s.trim()).filter(Boolean);
  const nat = str(form, "saudiNational");
  const next: Profile = {
    ...p,
    fullName: str(form, "fullName") || null,
    headline: str(form, "headline") || p.headline,
    saudiNational: nat === "yes" ? true : nat === "no" ? false : null,
    licenseStatus: (str(form, "licenseStatus") as Profile["licenseStatus"]) || "unknown",
    graduate: str(form, "graduate") !== "student",
    education: [{ institution: str(form, "institution") || null, degree: str(form, "degree") || null, year: str(form, "gradYear") || null, grade: str(form, "grade") || null, provenance: "edited" }],
    skills: lines("skills"),
    languages: lines("languages").map((l) => {
      const [language, level] = l.split(/[-–:]/).map((s) => s.trim());
      return { language, level: level || null };
    }),
    certifications: lines("certifications"),
    practiceStrengths: form.getAll("practiceStrengths").map(String),
    experience: p.experience.map((e, i) => (i === 0 ? { ...e, bullets: lines("agBullets"), start: str(form, "agStart") || null, end: str(form, "agEnd") || null, location: str(form, "agLocation") || null, provenance: "edited" } : e)),
    notes: str(form, "notes"),
  };
  await saveProfile(next);
  await rescoreAll();
  revalidatePath("/", "layout");
  redirect("/studio?tab=profile&saved=1");
}

export async function applyCvExtraction(payload: string) {
  const ex = JSON.parse(payload) as import("@/lib/ai").CvExtraction;
  const p = await getProfile();
  const next: Profile = {
    ...p,
    fullName: ex.fullName ?? p.fullName,
    education: ex.education.length ? ex.education.map((e) => ({ institution: e.institution, degree: e.degree, year: e.year, grade: e.grade, provenance: "cv_extracted" as const })) : p.education,
    experience: ex.experience.length ? ex.experience.map((e) => ({ organisation: e.organisation, role: e.role, location: e.location, start: e.start, end: e.end, bullets: e.bullets, provenance: "cv_extracted" as const })) : p.experience,
    skills: Array.from(new Set([...p.skills, ...ex.skills])),
    languages: ex.languages.length ? ex.languages : p.languages,
    certifications: ex.certifications.length ? ex.certifications : p.certifications,
  };
  await saveProfile(next);
  await rescoreAll();
  revalidatePath("/", "layout");
}

// ── Alerts ──
export async function updateAlertRule(id: string, form: FormData) {
  const params: Record<string, unknown> = {};
  if (form.get("threshold")) params.threshold = Number(form.get("threshold"));
  if (form.get("days")) params.days = Number(form.get("days"));
  await q("UPDATE alert_rules SET enabled = $2, frequency = $3, channel_email = $4, params = params || $5::jsonb WHERE id = $1", [
    id, str(form, "enabled") === "on", str(form, "frequency") || "daily", str(form, "email") === "on", json(params),
  ]);
  revalidatePath("/alerts");
}

export async function sendTestEmail() {
  if (!emailConfigured()) return { ok: false, detail: "Email is not configured." };
  const r = await sendEmail("LEXHUNT test alert", "<p>This is a test alert from LEXHUNT. If you received it, email delivery works.</p>");
  if (r.ok) await setSetting("email_tested_at", new Date().toISOString());
  revalidatePath("/alerts");
  return r;
}

export async function markAllRead() {
  await q("UPDATE notifications SET read_at = now() WHERE read_at IS NULL");
  revalidatePath("/", "layout");
}

export async function rescoreNow() {
  const n = await rescoreAll();
  revalidatePath("/", "layout");
  return n;
}

export async function rescoreOne(id: string) {
  await rescoreJob(id);
  revalidatePath(`/opportunities/${id}`);
}
