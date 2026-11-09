import "server-only";
import { q } from "./db";
import type { JobRow } from "./types";
import type { JobRowView } from "@/components/JobTable";
import { daysUntil, expLabel, fmtDate, KIND_LABEL, LICENSE_LABEL } from "./utils";

export async function toRowViews(jobs: JobRow[]): Promise<JobRowView[]> {
  if (!jobs.length) return [];
  const srcs = await q<{ job_id: string; source: string; publisher: string | null; n: number }>(
    `SELECT DISTINCT ON (job_id) job_id, source, publisher, count(*) OVER (PARTITION BY job_id)::int AS n
     FROM job_sources WHERE job_id = ANY($1::text[]) ORDER BY job_id, (source LIKE 'official%') DESC, first_seen`,
    [jobs.map((j) => j.id)],
  );
  const byJob = new Map(srcs.map((s) => [s.job_id, s]));
  return jobs.map((j) => {
    const s = byJob.get(j.id);
    const days = daysUntil(j.deadline);
    const official = s?.source.startsWith("official");
    return {
      id: j.id,
      title: j.title,
      employer: j.employer,
      employerSlug: j.employer_slug,
      category: j.category,
      kindLabel: KIND_LABEL[j.job_kind] ?? j.job_kind,
      location: j.location ?? "—",
      workMode: j.work_mode,
      experience: expLabel(j.experience_min, j.experience_max),
      salary: j.salary,
      posted: fmtDate(j.posted_at),
      deadline: fmtDate(j.deadline),
      deadlineSoon: days !== null && days >= 0 && days <= 7,
      status: j.status,
      license: LICENSE_LABEL[j.license_req],
      licenseTone: j.license_req === "licensed_required" ? "bad" : j.license_req === "trainee_registration" ? "warn" : j.license_req === "not_required" ? "ok" : "neutral",
      score: j.match_score,
      applyUrl: j.apply_url,
      sourceLabel: `${official ? "Official · " : ""}${s?.publisher ?? s?.source ?? "—"}`,
      sourceCount: s?.n ?? 1,
      isNew: j.is_new,
      saved: j.saved,
      lastSeen: fmtDate(j.last_seen),
    };
  });
}
