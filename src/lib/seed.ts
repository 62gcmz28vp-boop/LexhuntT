import type { Db } from "./db";
import { DEFAULT_PROFILE } from "./profileDefault";
import { SEED_JOBS } from "@/data/seedJobs";
import { DEFAULT_ALERT_RULES } from "./alertsConfig";
import { RESEARCH_DATE } from "@/data/researchLog";

const SEED_VERSION = 1;

/** Seeds the profile, the researched opportunities and default alert rules once per SEED_VERSION. */
export async function seedIfNeeded(db: Db) {
  const rows = await db.query<{ value: number }>("SELECT value FROM settings WHERE key = 'seed_version'");
  if (rows[0] && Number(rows[0].value) >= SEED_VERSION) return;

  await db.query("INSERT INTO profile (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING", [JSON.stringify(DEFAULT_PROFILE)]);
  for (const r of DEFAULT_ALERT_RULES) {
    await db.query(
      "INSERT INTO alert_rules (id, label, enabled, frequency, channel_email, params) VALUES ($1,$2,$3,$4,false,$5::jsonb) ON CONFLICT (id) DO NOTHING",
      [r.id, r.label, r.enabled, r.frequency, JSON.stringify(r.params)],
    );
  }
  await db.query("INSERT INTO settings (key, value) VALUES ('seed_version', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [JSON.stringify(SEED_VERSION)]);

  // Jobs are inserted through the normal upsert path (dedupe + scoring), lazily to avoid an import cycle.
  const { upsertJob } = await import("./jobs");
  // getDb() is still resolving; temporarily expose this db to q() via the global promise.
  const g = globalThis as typeof globalThis & { __lexhuntDb?: Promise<Db> };
  const prev = g.__lexhuntDb;
  g.__lexhuntDb = Promise.resolve(db);
  try {
    for (const job of SEED_JOBS) await upsertJob(job, DEFAULT_PROFILE);
    await db.query(
      "INSERT INTO discovery_runs (trigger, started_at, finished_at, ok, sources, new_jobs, note) VALUES ('research', $1, $1, true, $2::jsonb, $3, $4)",
      [
        `${RESEARCH_DATE}T09:00:00Z`,
        JSON.stringify([{ source: "Initial research pass (web search index)", status: "ok", fetched: SEED_JOBS.length, kept: SEED_JOBS.length, message: "Seeded from build-time research" }]),
        SEED_JOBS.length,
        "Build-time research seed",
      ],
    );
  } finally {
    g.__lexhuntDb = prev;
  }
}
