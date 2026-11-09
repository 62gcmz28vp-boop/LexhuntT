import { test } from "node:test";
import assert from "node:assert/strict";
import { isLegalRole, isTooSenior, parseExperience, detectLicense, classifyKind, detectPracticeAreas } from "@/lib/taxonomy";
import { dedupeKey, isSameVacancy } from "@/lib/dedupe";
import { scoreJob, type MatchableJob } from "@/lib/matching";
import { DEFAULT_PROFILE } from "@/lib/profileDefault";
import { parseRobots, isAllowed } from "@/lib/discovery/http";
import { relevance, toJobInput, classifyEmployer } from "@/lib/discovery/normalize";
import { parseBoard } from "@/lib/discovery/sources/ats";
import { templateApplySmarter } from "@/lib/templates";
import { FIRMS } from "@/data/firms";
import { SEED_JOBS } from "@/data/seedJobs";
import type { JobRow } from "@/lib/types";

const baseJob = (o: Partial<MatchableJob> = {}): MatchableJob => ({
  title: "Trainee Associate",
  employer: "Example LLP",
  category: "law_firm_international",
  job_kind: "trainee",
  location: "Riyadh",
  work_mode: "onsite",
  experience_min: 0,
  experience_max: 1,
  license_req: "trainee_registration",
  nationality_req: null,
  eligibility_note: null,
  description: "Support M&A due diligence, share purchase agreements, FIDIC construction disputes; Arabic and English drafting; legal research.",
  practice_areas: ["corporate_ma", "projects_construction"],
  ...o,
});

test("legal role detection covers titles without the word 'legal'", () => {
  assert.ok(isLegalRole("Contracts Specialist"));
  assert.ok(isLegalRole("محامي متدرب"));
  assert.ok(isLegalRole("Governance Specialist"));
  assert.ok(isLegalRole("Graduate Programme", "Requirements: LLB / bachelor's degree in law; legal drafting"));
  assert.ok(!isLegalRole("Software Engineer", "Build React apps"));
});

test("seniority filter keeps juniors and drops seniors", () => {
  assert.ok(isTooSenior("Senior Legal Counsel"));
  assert.ok(isTooSenior("Legal Counsel", "Minimum of 7 years PQE"));
  assert.ok(!isTooSenior("Junior Legal Counsel", "2-3 years"));
  assert.ok(!isTooSenior("Trainee Lawyer"));
});

test("experience parsing in English and Arabic", () => {
  assert.deepEqual(parseExperience("0-2 years experience"), { min: 0, max: 2 });
  assert.deepEqual(parseExperience("at least 3 years"), { min: 3, max: null });
  assert.deepEqual(parseExperience("حديث تخرج"), { min: 0, max: 0 });
});

test("licence detection distinguishes licensed vs trainee", () => {
  assert.equal(detectLicense("Must be a licensed lawyer with a valid law licence"), "licensed_required");
  assert.equal(detectLicense("registered as a Legal Trainee with the Ministry of Justice"), "trainee_registration");
  assert.equal(detectLicense("Contracts analyst"), "unknown");
});

test("role kind and practice areas", () => {
  assert.equal(classifyKind("Cooperative Training Scheme Summer 2026"), "co_op");
  assert.equal(classifyKind("Saudi Law Trainee Program"), "graduate_programme");
  assert.ok(detectPracticeAreas("FIDIC claims on a PPP project").includes("projects_construction"));
});

test("dedupe merges the same vacancy across sources", () => {
  assert.equal(dedupeKey("Freshfields LLP", "Legal Trainee - GMAC", "Riyadh, Saudi Arabia"), dedupeKey("Freshfields", "Legal Trainee GMAC", "Riyadh"));
  assert.ok(isSameVacancy({ employer: "White & Case LLP", title: "Saudi Law Trainee Program" }, { employer: "White & Case", title: "Saudi Law Trainee Program (Riyadh)" }));
  assert.ok(!isSameVacancy({ employer: "White & Case", title: "Saudi Law Trainee Program" }, { employer: "White & Case", title: "Senior Associate Project Finance" }));
});

test("match score is high for an aligned trainee role and bounded 0–100", () => {
  const m = scoreJob(baseJob(), DEFAULT_PROFILE);
  assert.ok(m.total >= 70 && m.total <= 100, `got ${m.total}`);
  assert.equal(m.criteria.reduce((a, c) => a + c.weight, 0), 100);
  assert.ok(m.strengths.some((s) => s.includes("Addleshaw Goddard")));
});

test("student-only co-op is capped as ineligible for a graduate", () => {
  const m = scoreJob(baseJob({ job_kind: "co_op", title: "Co-op Programme", description: "For students currently studying an LLB" }), DEFAULT_PROFILE);
  assert.equal(m.criteria[0].score, 0);
  assert.ok(m.total <= 35);
});

test("licensed-lawyer requirement is surfaced as a gap", () => {
  const m = scoreJob(baseJob({ license_req: "licensed_required" }), DEFAULT_PROFILE);
  assert.ok(m.gaps.some((g) => /licence/i.test(g)));
});

test("robots.txt parsing honours disallow rules", () => {
  const rules = parseRobots("User-agent: *\nDisallow: /private\n\nUser-agent: Googlebot\nDisallow: /");
  assert.deepEqual(rules, ["/private"]);
  assert.ok(!isAllowed("/private/jobs", rules));
  assert.ok(isAllowed("/careers", rules));
});

test("relevance filter and normalisation", () => {
  const raw = { title: "Junior Legal Counsel", employer: "Saudi National Bank", location: "Riyadh, Saudi Arabia", description: "1-2 years. Arabic and English. Saudi nationals only.", applyUrl: "https://x", sourceUrl: "https://x", source: "jsearch:linkedin", official: false };
  assert.ok(relevance(raw).keep);
  const j = toJobInput(raw);
  assert.equal(j.status, "unverified");
  assert.equal(j.category, "financial");
  assert.equal(j.nationalityReq, "Saudi national");
  assert.ok(!relevance({ ...raw, location: "Dubai, UAE" }).keep);
  assert.equal(classifyEmployer("Freshfields Bruckhaus Deringer").slug, "freshfields");
});

test("greenhouse board parsing marks listings official", () => {
  const out = parseBoard({ provider: "greenhouse", token: "x", employer: "X Co", category: "in_house" }, { jobs: [{ id: 1, title: "Legal Counsel", location: { name: "Riyadh" }, content: "&lt;p&gt;Draft contracts&lt;/p&gt;", absolute_url: "https://boards.greenhouse.io/x/jobs/1" }] });
  assert.equal(out.length, 1);
  assert.equal(out[0].official, true);
  assert.equal(out[0].description, "Draft contracts");
});

test("template application pack never invents a university or grade", () => {
  const job = { ...baseJob(), id: "t", dedupe_key: "k", employer_slug: null, salary: null, posted_at: null, deadline: null, status: "open", first_seen: new Date(), last_seen: new Date(), last_verified: null, verification_note: null, origin: "manual", is_new: false, saved: false, dismissed: false, match_score: null, match_detail: null, apply_url: null } as unknown as JobRow;
  const out = templateApplySmarter(job, DEFAULT_PROFILE, null);
  assert.ok(out.coverLetter.includes("[Your full name]"));
  assert.ok(!/University of|GPA \d/.test(out.coverLetter));
});

test("research data integrity: every claim's source index exists and URLs are https", () => {
  for (const f of FIRMS) {
    assert.ok(f.sources.length > 0, `${f.slug} has no sources`);
    for (const s of f.sources) assert.match(s.url, /^https:\/\//, `${f.slug} ${s.url}`);
    const claims = [f.riyadhOffice, f.size, f.applicationRoute, ...f.graduateRecruitment, ...f.recruitmentProcess].filter(Boolean);
    for (const c of claims) for (const i of (c as { sources?: number[] }).sources ?? []) assert.ok(i < f.sources.length, `${f.slug} bad source index ${i}`);
    for (const s of f.signals) for (const i of s.sources ?? []) assert.ok(i < f.sources.length, `${f.slug} bad signal source ${i}`);
  }
  const slugs = new Set(FIRMS.map((f) => f.slug));
  assert.equal(slugs.size, FIRMS.length, "duplicate firm slugs");
  for (const j of SEED_JOBS) {
    assert.notEqual(j.status, "open", "seed jobs must not claim verified-open status");
    if (j.employerSlug) assert.ok(slugs.has(j.employerSlug), j.employerSlug);
  }
});
