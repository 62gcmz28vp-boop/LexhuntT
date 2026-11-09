import type { JobInput, JobCategory } from "../types";
import type { RawListing } from "./types";
import { FIRMS } from "@/data/firms";
import { employerKey } from "../dedupe";
import {
  classifyKind,
  detectLicense,
  detectPracticeAreas,
  detectWorkMode,
  isLegalRole,
  isRiyadhCompatible,
  isTooSenior,
  parseExperience,
} from "../taxonomy";

const GENERIC = new Set(["abdulaziz", "mohammed", "associates", "international", "global", "arabia", "saudi"]);
const firmIndex = FIRMS.map((f) => {
  const key = employerKey(f.name);
  // most distinctive token, e.g. "freshfields", "addleshaw", "pinsent"
  const distinct = key.split("-").filter((t) => t.length >= 6 && !GENERIC.has(t)).sort((a, b) => b.length - a.length)[0] ?? "";
  return { slug: f.slug, key, distinct, f };
});

export function matchFirm(employer: string) {
  const k = employerKey(employer);
  const toks = new Set(k.split("-"));
  // exact key, all firm tokens present (e.g. "AT Law Firm" needs token "at" AND nothing else missing), or the distinctive token
  return firmIndex.find((x) => x.key === k || (x.key.split("-").length > 1 && x.key.split("-").every((t) => toks.has(t))) || (x.distinct !== "" && toks.has(x.distinct)))?.f;
}

export function classifyEmployer(employer: string, hint?: JobCategory): { category: JobCategory; slug?: string } {
  const firm = matchFirm(employer);
  if (firm) return { category: firm.classification === "international" || firm.classification === "international_affiliate" ? "law_firm_international" : "law_firm_saudi", slug: firm.slug };
  const e = employer.toLowerCase();
  if (/(law firm|lawyers|advocates|legal consultants|محاماة|محامون|للمحاماة)/.test(e)) return { category: "law_firm_saudi" };
  if (/(ministry|authority|commission|council|centre for|center for|government|وزارة|هيئة|مجلس|ديوان)/.test(e)) return { category: "government" };
  if (/(bank|capital|finance|investment|insurance|exchange|tadawul|بنك|مصرف|استثمار|تأمين)/.test(e)) return { category: "financial" };
  if (/(deloitte|pwc|kpmg|ernst|\bey\b|mckinsey|bcg|accenture|consult|استشار)/.test(e)) return { category: "consulting" };
  return { category: hint ?? "in_house" };
}

export interface FilterVerdict {
  keep: boolean;
  reason?: string;
}

export function relevance(raw: RawListing): FilterVerdict {
  if (!isLegalRole(raw.title, raw.description)) return { keep: false, reason: "not a legal / law-related role" };
  if (isTooSenior(raw.title, raw.description)) return { keep: false, reason: "too senior (>3 years or senior title)" };
  if (!isRiyadhCompatible(raw.location, raw.title, raw.remote)) return { keep: false, reason: "not Riyadh / Riyadh-compatible" };
  return { keep: true };
}

export function toJobInput(raw: RawListing): JobInput {
  const text = `${raw.title}\n${raw.description}`;
  const exp = parseExperience(text);
  const { category, slug } = classifyEmployer(raw.employer, raw.categoryHint);
  const nationality = /saudi national|saudi nationality|سعودي الجنسية|للسعوديين/i.test(text) ? "Saudi national" : null;
  return {
    title: raw.title.trim(),
    employer: raw.employer.trim(),
    employerSlug: slug,
    category,
    kind: classifyKind(raw.title),
    location: raw.location || "Riyadh",
    workMode: raw.remote ? "remote" : detectWorkMode(text),
    experienceMin: exp.min,
    experienceMax: exp.max,
    salary: raw.salary ?? null,
    postedAt: raw.postedAt ?? null,
    deadline: raw.deadline ?? null,
    status: raw.official ? "open" : "unverified",
    licenseReq: detectLicense(text),
    nationalityReq: nationality,
    description: raw.description.slice(0, 20000),
    applyUrl: raw.applyUrl,
    practiceAreas: detectPracticeAreas(text),
    verificationNote: raw.official
      ? `Listed on the employer's official feed (${raw.source}) at last check.`
      : `Found via ${raw.publisher ?? raw.source}. Confirm on the employer's own site before applying.`,
    source: { source: raw.official ? `official:${raw.source}` : `aggregator:${raw.source}`, url: raw.sourceUrl, externalId: raw.externalId, publisher: raw.publisher },
    origin: "discovery",
  };
}
