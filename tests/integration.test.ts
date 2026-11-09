import { test, before } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { SCHEMA_SQL } from "@/lib/schema";
import type { Db } from "@/lib/db";
import { seedIfNeeded } from "@/lib/seed";
import { upsertJob, setJobStatus, expireByDeadline, listJobs } from "@/lib/jobs";
import { toJobInput } from "@/lib/discovery/normalize";
import { evaluateAlerts } from "@/lib/notify";
import { q } from "@/lib/db";

before(async () => {
  const pg = new PGlite(); // in-memory
  await pg.waitReady;
  const db: Db = {
    kind: "pglite",
    query: async (sql, params = []) => (await pg.query(sql, params)).rows as never[],
    exec: async (sql) => void (await pg.exec(sql)),
  };
  await db.exec(SCHEMA_SQL);
  await seedIfNeeded(db);
  (globalThis as { __lexhuntDb?: Promise<Db> }).__lexhuntDb = Promise.resolve(db);
});

const raw = (o: Partial<Parameters<typeof toJobInput>[0]> = {}) => ({
  title: "Trainee Lawyer",
  employer: "Example Legal Consultants",
  location: "Riyadh, Saudi Arabia",
  description: "Fresh graduate. Arabic and English. Legal research and drafting. Corporate due diligence.",
  applyUrl: "https://example.sa/careers/1",
  sourceUrl: "https://example.sa/careers/1",
  source: "jsearch:linkedin",
  publisher: "LinkedIn",
  official: false,
  ...o,
});

test("seed loads researched jobs without any 'open' claims", async () => {
  const jobs = await listJobs({ includeDismissed: true });
  assert.ok(jobs.length >= 10);
  assert.equal(jobs.filter((j) => j.status === "open").length, 0);
  assert.ok(jobs.every((j) => j.match_score !== null));
});

test("aggregator sighting creates an unverified job; official sighting of the same vacancy merges and opens it", async () => {
  const a = await upsertJob(toJobInput(raw()));
  assert.equal(a.result, "created");
  const b = await upsertJob(toJobInput(raw({ title: "Trainee Lawyer (Riyadh)", source: "career_page:example", sourceUrl: "https://example.sa/jobs/trainee", official: true })));
  assert.equal(b.id, a.id, "deduplicated into one vacancy");
  const [row] = await q<{ status: string; n: number }>("SELECT status, (SELECT count(*)::int FROM job_sources WHERE job_id = $1) AS n FROM jobs WHERE id = $1", [a.id]);
  assert.equal(row.status, "open");
  assert.equal(row.n, 2);
  // an aggregator sighting must not re-open a job an official source closed
  await setJobStatus(a.id, "closed", "test close");
  await upsertJob(toJobInput(raw()));
  const [after] = await q<{ status: string }>("SELECT status FROM jobs WHERE id = $1", [a.id]);
  assert.equal(after.status, "closed");
  const hist = await q("SELECT * FROM job_status_history WHERE job_id = $1", [a.id]);
  assert.ok(hist.length >= 3);
});

test("past deadlines close jobs automatically", async () => {
  const { id } = await upsertJob({ ...toJobInput(raw({ title: "Legal Researcher", employer: "Deadline Co" })), deadline: "2020-01-01" });
  await expireByDeadline();
  const [r] = await q<{ status: string }>("SELECT status FROM jobs WHERE id = $1", [id]);
  assert.equal(r.status, "closed");
});

test("alerts create in-app notifications for new trainee roles, deduplicated", async () => {
  const { id } = await upsertJob(toJobInput(raw({ title: "Trainee Associate", employer: "Alert Test Law Firm", official: true, source: "career_page:x", sourceUrl: "https://alert.sa/1" })));
  const n1 = await evaluateAlerts({ newJobIds: [id], changedFirms: [] });
  const n2 = await evaluateAlerts({ newJobIds: [id], changedFirms: [] });
  assert.ok(n1 >= 1);
  assert.equal(n2, 0);
});
