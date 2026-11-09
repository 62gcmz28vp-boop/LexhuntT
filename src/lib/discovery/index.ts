import "server-only";
import { q, json } from "../db";
import { upsertJob, setJobStatus, expireByDeadline } from "../jobs";
import { getProfile } from "../profile";
import { evaluateAlerts } from "../notify";
import type { SourceResult, RawListing } from "./types";
import { relevance, toJobInput } from "./normalize";
import { fetchJSearch, fetchSerpApi } from "./sources/aggregators";
import { fetchAtsBoards } from "./sources/ats";
import { fetchCareerPages } from "./sources/careerPages";

export interface RunSummary {
  runId: number;
  sources: SourceResult[];
  newJobs: number;
  updatedJobs: number;
  closedJobs: number;
  notifications: number;
}

/**
 * Orchestrates one discovery pass:
 *  aggregators (unverified) → official ATS boards (authoritative) → official career pages (authoritative + signals)
 *  → relevance filter → normalise → dedupe/upsert → close vanished official listings → expire deadlines → alerts.
 */
export async function runDiscovery(trigger: "cron" | "manual" | "cli", opts: { only?: ("aggregators" | "ats" | "career_pages")[] } = {}): Promise<RunSummary> {
  const [{ id: runId }] = await q<{ id: number }>("INSERT INTO discovery_runs (trigger) VALUES ($1) RETURNING id", [trigger]);
  const profile = await getProfile();
  const sources: SourceResult[] = [];
  const newJobIds: string[] = [];
  let updated = 0;
  let closed = 0;
  const want = (k: "aggregators" | "ats" | "career_pages") => !opts.only || opts.only.includes(k);

  const ingest = async (result: SourceResult, raw: RawListing[]) => {
    let kept = 0;
    for (const r of raw) {
      if (!r.title || !r.employer) continue;
      if (!relevance(r).keep) continue;
      kept++;
      const { id, result: res } = await upsertJob(toJobInput(r), profile);
      if (res === "created") newJobIds.push(id);
      if (res === "updated") updated++;
    }
    result.kept = kept;
    sources.push(result);
  };

  try {
    if (want("aggregators")) {
      const [js, sp] = await Promise.all([fetchJSearch(), fetchSerpApi()]);
      await ingest(js.result, js.raw);
      await ingest(sp.result, sp.raw);
    }

    if (want("ats")) {
      for (const board of await fetchAtsBoards()) {
        await ingest(board.result, board.raw);
        if (board.result.status !== "ok") continue;
        for (const [src, seen] of board.seen) {
          const stale = await q<{ id: string }>(
            `SELECT DISTINCT j.id FROM jobs j JOIN job_sources s ON s.job_id = j.id
             WHERE s.source = $1 AND j.status <> 'closed' AND NOT (s.source_url = ANY($2::text[]))`,
            [`official:${src}`, seen],
          );
          for (const s of stale) {
            await setJobStatus(s.id, "closed", "No longer listed on the employer's official job board");
            closed++;
          }
        }
      }
    }

    const changedFirms: string[] = [];
    if (want("career_pages")) {
      const cp = await fetchCareerPages();
      await ingest(cp.result, cp.checks.flatMap((c) => c.listings));
      for (const c of cp.checks) {
        if (c.status === "changed") changedFirms.push(c.slug);
        if (!["ok", "changed", "unchanged"].includes(c.status) || c.signals.some((s) => s.includes("JavaScript"))) continue;
        const seen = c.listings.map((l) => l.sourceUrl);
        const stale = await q<{ id: string }>(
          `SELECT DISTINCT j.id FROM jobs j JOIN job_sources s ON s.job_id = j.id
           WHERE s.source = $1 AND j.status = 'open' AND NOT (s.source_url = ANY($2::text[]))`,
          [`official:career_page:${c.slug}`, seen],
        );
        for (const s of stale) {
          await setJobStatus(s.id, "closed", "No longer listed on the firm's official careers page");
          closed++;
        }
      }
    }

    closed += await expireByDeadline();
    const notifications = await evaluateAlerts({ newJobIds, changedFirms });
    const ok = sources.some((s) => s.status === "ok");
    await q("UPDATE discovery_runs SET finished_at = now(), ok = $2, sources = $3::jsonb, new_jobs = $4, updated_jobs = $5, closed_jobs = $6 WHERE id = $1", [
      runId, ok, json(sources), newJobIds.length, updated, closed,
    ]);
    return { runId, sources, newJobs: newJobIds.length, updatedJobs: updated, closedJobs: closed, notifications };
  } catch (e) {
    await q("UPDATE discovery_runs SET finished_at = now(), ok = false, sources = $2::jsonb, note = $3 WHERE id = $1", [runId, json(sources), (e as Error).message.slice(0, 500)]);
    throw e;
  }
}
