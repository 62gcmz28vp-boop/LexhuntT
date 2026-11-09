import "server-only";
import { createHash } from "node:crypto";
import { q, q1, json } from "./db";
import type { JobInput, JobRow, JobStatus, Profile } from "./types";
import { dedupeKey, isSameVacancy } from "./dedupe";
import { detectPracticeAreas } from "./taxonomy";
import { scoreJob } from "./matching";
import { getProfile } from "./profile";

export type UpsertResult = "created" | "updated" | "unchanged";

const idFor = (key: string) => createHash("sha1").update(key).digest("hex").slice(0, 12);

/** Insert or merge a vacancy. Sources are appended; status changes are recorded in history. */
export async function upsertJob(input: JobInput, profile?: Profile): Promise<{ id: string; result: UpsertResult }> {
  const key = dedupeKey(input.employer, input.title, input.location);
  let existing = await q1<JobRow>("SELECT * FROM jobs WHERE dedupe_key = $1", [key]);
  if (!existing) {
    // fuzzy match against same-employer jobs
    const candidates = await q<JobRow>("SELECT * FROM jobs WHERE lower(employer) = lower($1) OR employer_slug = $2", [input.employer, input.employerSlug ?? "__none__"]);
    existing = candidates.find((c) => isSameVacancy(c, input)) ?? null;
  }
  const areas = input.practiceAreas?.length ? input.practiceAreas : detectPracticeAreas(`${input.title} ${input.description ?? ""}`);
  const now = new Date().toISOString();

  if (existing) {
    const id = existing.id;
    const newStatus = mergeStatus(existing.status, input.status);
    await q(
      `UPDATE jobs SET last_seen = now(),
        description = COALESCE(NULLIF($2,''), description),
        apply_url = CASE WHEN $3 LIKE 'official%' AND $4 <> '' THEN $4 ELSE COALESCE(apply_url, NULLIF($4,'')) END,
        deadline = COALESCE($5::timestamptz, deadline),
        posted_at = COALESCE(posted_at, $6::timestamptz),
        salary = COALESCE(salary, $7),
        status = $8,
        last_verified = CASE WHEN $8 = 'open' AND $3 LIKE 'official%' THEN now() ELSE last_verified END
       WHERE id = $1`,
      [id, input.description ?? "", input.source.source, input.applyUrl ?? "", input.deadline ?? null, input.postedAt ?? null, input.salary ?? null, newStatus],
    );
    if (newStatus !== existing.status) await recordStatus(id, existing.status, newStatus, `Seen on ${input.source.source}`);
    await addSource(id, input);
    return { id, result: newStatus !== existing.status ? "updated" : "unchanged" };
  }

  const id = idFor(key);
  await q(
    `INSERT INTO jobs (id, dedupe_key, title, employer, employer_slug, category, job_kind, location, work_mode, experience_min, experience_max,
       salary, posted_at, deadline, status, license_req, nationality_req, eligibility_note, description, apply_url, practice_areas,
       last_verified, verification_note, origin, is_new)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb,$22,$23,$24,$25)
     ON CONFLICT (dedupe_key) DO NOTHING`,
    [
      id, key, input.title, input.employer, input.employerSlug ?? null, input.category, input.kind, input.location ?? null, input.workMode ?? "unknown",
      input.experienceMin ?? null, input.experienceMax ?? null, input.salary ?? null, input.postedAt ?? null, input.deadline ?? null, input.status,
      input.licenseReq, input.nationalityReq ?? null, input.eligibilityNote ?? null, input.description ?? null, input.applyUrl ?? null, json(areas),
      input.status === "open" && input.source.source.startsWith("official") ? now : null, input.verificationNote ?? null, input.origin ?? "discovery",
      input.origin !== "research",
    ],
  );
  await recordStatus(id, null, input.status, `Discovered via ${input.source.source}`);
  await addSource(id, input);
  await rescoreJob(id, profile);
  return { id, result: "created" };
}

function mergeStatus(prev: JobStatus, next: JobStatus): JobStatus {
  // An official "open" beats anything; aggregator sightings never re-open a job closed by an official source.
  if (next === "open") return "open";
  if (prev === "closed" && next === "unverified") return "closed";
  if (next === "closed") return "closed";
  return prev;
}

async function addSource(id: string, input: JobInput) {
  await q(
    `INSERT INTO job_sources (job_id, source, source_url, external_id, publisher) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (job_id, source_url) DO UPDATE SET last_seen = now()`,
    [id, input.source.source, input.source.url, input.source.externalId ?? null, input.source.publisher ?? null],
  );
}

export async function recordStatus(id: string, from: string | null, to: string, reason: string) {
  await q("INSERT INTO job_status_history (job_id, from_status, to_status, reason) VALUES ($1,$2,$3,$4)", [id, from, to, reason]);
}

export async function setJobStatus(id: string, status: JobStatus, reason: string) {
  const job = await q1<JobRow>("SELECT status FROM jobs WHERE id = $1", [id]);
  if (!job || job.status === status) return;
  await q("UPDATE jobs SET status = $2, last_verified = CASE WHEN $2 = 'open' THEN now() ELSE last_verified END WHERE id = $1", [id, status]);
  await recordStatus(id, job.status, status, reason);
}

export async function rescoreJob(id: string, profile?: Profile) {
  const job = await q1<JobRow>("SELECT * FROM jobs WHERE id = $1", [id]);
  if (!job) return;
  const p = profile ?? (await getProfile());
  const m = scoreJob(job, p);
  await q("UPDATE jobs SET match_score = $2, match_detail = $3::jsonb WHERE id = $1", [id, m.total, json(m)]);
}

export async function rescoreAll() {
  const p = await getProfile();
  const jobs = await q<JobRow>("SELECT * FROM jobs");
  for (const j of jobs) {
    const m = scoreJob(j, p);
    await q("UPDATE jobs SET match_score = $2, match_detail = $3::jsonb WHERE id = $1", [j.id, m.total, json(m)]);
  }
  return jobs.length;
}

/** Close jobs whose verified deadline has passed. */
export async function expireByDeadline() {
  const rows = await q<{ id: string; status: string }>("SELECT id, status FROM jobs WHERE deadline IS NOT NULL AND deadline < now() AND status <> 'closed'");
  for (const r of rows) await setJobStatus(r.id, "closed", "Deadline passed");
  return rows.length;
}

export interface JobFilters {
  status?: string;
  category?: string;
  kind?: string;
  license?: string;
  q?: string;
  saved?: boolean;
  minScore?: number;
  includeDismissed?: boolean;
  sort?: "match" | "recent" | "deadline";
}

export async function listJobs(f: JobFilters = {}): Promise<JobRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    params.push(v);
    where.push(sql.replace("?", `$${params.length}`));
  };
  if (!f.includeDismissed) where.push("dismissed = false");
  if (f.status && f.status !== "all") add("status = ?", f.status);
  if (f.category && f.category !== "all") {
    if (f.category === "law_firm") where.push("category LIKE 'law_firm%'");
    else add("category = ?", f.category);
  }
  if (f.kind && f.kind !== "all") add("job_kind = ?", f.kind);
  if (f.license && f.license !== "all") add("license_req = ?", f.license);
  if (f.saved) where.push("saved = true");
  if (f.minScore) add("COALESCE(match_score,0) >= ?", f.minScore);
  if (f.q) add("(title ILIKE ? OR employer ILIKE $" + (params.length + 1) + " OR description ILIKE $" + (params.length + 1) + ")", `%${f.q}%`);
  const order =
    f.sort === "recent" ? "first_seen DESC" : f.sort === "deadline" ? "deadline ASC NULLS LAST" : "CASE status WHEN 'open' THEN 0 WHEN 'unverified' THEN 1 ELSE 2 END, match_score DESC NULLS LAST";
  return q<JobRow>(`SELECT * FROM jobs ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${order} LIMIT 500`, params);
}

export async function getJob(id: string) {
  const job = await q1<JobRow>("SELECT * FROM jobs WHERE id = $1", [id]);
  if (!job) return null;
  const sources = await q<{ source: string; source_url: string; publisher: string | null; first_seen: Date; last_seen: Date }>(
    "SELECT source, source_url, publisher, first_seen, last_seen FROM job_sources WHERE job_id = $1 ORDER BY first_seen",
    [id],
  );
  const history = await q<{ from_status: string | null; to_status: string; reason: string | null; changed_at: Date }>(
    "SELECT from_status, to_status, reason, changed_at FROM job_status_history WHERE job_id = $1 ORDER BY changed_at",
    [id],
  );
  return { job, sources, history };
}
