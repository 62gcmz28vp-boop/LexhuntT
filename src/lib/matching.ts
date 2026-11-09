/**
 * Transparent qualification-alignment score (0–100). It measures how well a vacancy's stated requirements
 * align with the VERIFIED profile. It is NOT a probability of being hired.
 */
import type { CriterionScore, MatchResult, Profile } from "./types";
import { PRACTICE_AREAS, norm } from "./taxonomy";

export interface MatchableJob {
  title: string;
  employer: string;
  category: string;
  job_kind: string;
  location: string | null;
  work_mode: string;
  experience_min: number | null;
  experience_max: number | null;
  license_req: string;
  nationality_req: string | null;
  eligibility_note: string | null;
  description: string | null;
  practice_areas: string[];
}

/** Experience signals that come specifically from the Addleshaw Goddard placement. */
const AG_SIGNALS: { key: string; label: string; terms: string[] }[] = [
  { key: "dd", label: "legal due diligence", terms: ["due diligence", "عناية واجبة", "dd report"] },
  { key: "ma", label: "M&A / SPA support", terms: ["m&a", "merger", "acquisition", "share purchase", "spa", "transaction", "استحواذ", "اندماج"] },
  { key: "shareholders", label: "shareholders' resolutions & corporate documentation", terms: ["shareholder", "resolution", "corporate documentation", "company secretar", "board", "مساهمين", "قرارات"] },
  { key: "fidic", label: "FIDIC / construction contracts", terms: ["fidic", "construction", "epc", "إنشاءات"] },
  { key: "disputes", label: "dispute notes & chronologies", terms: ["dispute", "chronolog", "claim", "litigation", "arbitration", "نزاع", "تحكيم"] },
  { key: "research", label: "Saudi legal & regulatory research", terms: ["legal research", "research", "saudi law", "regulation", "بحث قانوني", "أنظمة"] },
  { key: "matrices", label: "regulatory & stakeholder matrices (infrastructure / energy / PPP)", terms: ["regulatory", "stakeholder", "infrastructure", "energy", "ppp", "public-private", "طاقة", "بنية تحتية"] },
  { key: "governance", label: "governance, incorporation & restructuring", terms: ["governance", "incorporation", "restructur", "company formation", "حوكمة", "تأسيس"] },
  { key: "bilingual", label: "bilingual Arabic-English drafting", terms: ["arabic", "bilingual", "translation", "عربي", "ترجمة"] },
];

const SKILL_TERMS = ["drafting", "research", "contract review", "review", "analysis", "memo", "opinion", "translation", "documentation", "matrix", "صياغة", "مراجعة", "بحث"];

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function scoreJob(job: MatchableJob, profile: Profile): MatchResult {
  const text = norm(`${job.title} ${job.description ?? ""} ${job.eligibility_note ?? ""}`);
  const criteria: CriterionScore[] = [];
  const strengths: string[] = [];
  const gaps: string[] = [];
  const flags: string[] = [];

  // 1. Eligibility (20)
  {
    let s = 20;
    const reasons: string[] = [];
    const studentOnly = job.job_kind === "co_op" || /current(ly)? (studying|students?)|final[- ]year|penultimate|طلاب/.test(text);
    if (studentOnly && profile.graduate) {
      s = 0;
      reasons.push("open to current students only — you have graduated");
      flags.push("Student-only scheme: not open to graduates. Use it as a firm-interest signal, not an application target.");
    }
    if (job.license_req === "licensed_required") {
      if (profile.licenseStatus === "licensed") reasons.push("licence requirement met");
      else {
        s = Math.min(s, profile.licenseStatus === "unknown" ? 6 : 2);
        reasons.push("requires a Saudi practising licence");
        gaps.push("Role requires a Saudi practising licence (محامي مرخص).");
      }
    } else if (job.license_req === "trainee_registration") {
      if (profile.licenseStatus === "trainee_registered" || profile.licenseStatus === "licensed") reasons.push("MoJ trainee registration in place");
      else {
        s -= 3;
        reasons.push("needs MoJ legal-trainee registration (normally arranged on hire)");
        if (profile.licenseStatus === "unknown") flags.push("Set your MoJ trainee-registration status in Studio → Profile.");
      }
    }
    if (job.nationality_req && /saudi/i.test(job.nationality_req)) {
      if (profile.saudiNational === false) {
        s = 0;
        reasons.push("requires Saudi nationality");
        gaps.push("Saudi nationality required.");
      } else if (profile.saudiNational === null) {
        s -= 4;
        reasons.push("requires Saudi nationality (not yet recorded in your profile)");
        flags.push("This role requires Saudi nationality — confirm in your profile.");
      } else reasons.push("nationality requirement met");
    }
    criteria.push({ key: "eligibility", label: "Academic & professional eligibility", weight: 20, score: clamp(s, 0, 20), reason: reasons.join("; ") || "no restrictive eligibility requirements stated" });
  }

  // 2. Experience (15)
  {
    const min = job.experience_min;
    let s: number;
    let reason: string;
    if (min === null || min === undefined) {
      s = /trainee|graduate|junior|متدرب|حديث/.test(text) ? 13 : 9;
      reason = "experience requirement not stated";
    } else if (min <= 1) {
      s = 15;
      reason = `requires ${min}${job.experience_max != null ? `–${job.experience_max}` : "+"} years — co-op experience fits`;
    } else if (min <= 2) {
      s = 10;
      reason = `requires ${min}+ years — stretch; frame co-op work as substantive`;
      gaps.push(`Asks for ${min}+ years; you have co-op-level experience.`);
    } else if (min <= 3) {
      s = 5;
      reason = `requires ${min}+ years — significant stretch`;
      gaps.push(`Asks for ${min}+ years of experience.`);
    } else {
      s = 0;
      reason = `requires ${min}+ years`;
      gaps.push(`Asks for ${min}+ years of experience.`);
    }
    criteria.push({ key: "experience", label: "Experience requirements", weight: 15, score: s, reason });
  }

  // 3. Practice-area relevance (20)
  {
    const areas = job.practice_areas ?? [];
    const overlap = areas.filter((a) => profile.practiceStrengths.includes(a));
    let s = areas.length === 0 ? 10 : Math.round((overlap.length / Math.max(1, Math.min(areas.length, 3))) * 20);
    s = clamp(s, 0, 20);
    const names = overlap.map((a) => PRACTICE_AREAS[a]?.label ?? a);
    if (names.length) strengths.push(`Practice-area overlap: ${names.join(", ")}.`);
    criteria.push({ key: "practice", label: "Practice-area relevance", weight: 20, score: s, reason: names.length ? `overlaps with ${names.join(", ")}` : areas.length ? "outside your core practice areas" : "practice area not specified" });
  }

  // 4. Similarity to Addleshaw Goddard experience (15)
  const agHits = AG_SIGNALS.filter((sig) => sig.terms.some((t) => text.includes(t)));
  {
    const s = clamp(Math.round((agHits.length / 4) * 15), 0, 15);
    if (agHits.length) strengths.push(`Your Addleshaw Goddard work on ${agHits.map((h) => h.label).join("; ")} maps to this role.`);
    criteria.push({ key: "ag", label: "Similarity to Addleshaw Goddard experience", weight: 15, score: s, reason: agHits.length ? `matches: ${agHits.map((h) => h.label).join(", ")}` : "few direct overlaps in the description" });
  }

  // 5. Legal skills (10)
  {
    const hits = SKILL_TERMS.filter((t) => text.includes(t));
    const s = clamp(4 + hits.length * 2, 0, 10);
    criteria.push({ key: "skills", label: "Required legal skills", weight: 10, score: s, reason: hits.length ? `asks for ${hits.slice(0, 5).join(", ")}` : "skills not detailed" });
  }

  // 6. Languages (8)
  {
    const needsAr = /arabic|عربي|bilingual/.test(text);
    const needsEn = /english|إنجليزي|انجليزي|bilingual/.test(text);
    const hasAr = profile.languages.some((l) => /arabic|عربي/i.test(l.language));
    const hasEn = profile.languages.some((l) => /english|إنجليزي/i.test(l.language));
    let s = 8;
    if (needsAr && !hasAr) s -= 4;
    if (needsEn && !hasEn) s -= 4;
    if ((needsAr || needsEn) && s === 8) strengths.push("Bilingual Arabic-English drafting matches the language requirement.");
    criteria.push({ key: "language", label: "Arabic-English language fit", weight: 8, score: s, reason: needsAr || needsEn ? `requires ${[needsAr && "Arabic", needsEn && "English"].filter(Boolean).join(" & ")}` : "no explicit language requirement" });
  }

  // 7. Location (7)
  {
    const loc = norm(`${job.location ?? ""}`);
    let s = 3;
    let reason = "location unclear";
    if (/riyadh|الرياض/.test(loc)) {
      s = 7;
      reason = "Riyadh";
    } else if (job.work_mode === "remote") {
      s = 6;
      reason = "remote (check it allows working from Riyadh)";
    } else if (/saudi|ksa|السعودية/.test(loc)) {
      s = 4;
      reason = "Saudi Arabia (city not stated)";
    } else if (loc) {
      s = 1;
      reason = `${job.location} — relocation required`;
      gaps.push(`Based in ${job.location}, not Riyadh.`);
    }
    criteria.push({ key: "location", label: "Riyadh location compatibility", weight: 7, score: s, reason });
  }

  // 8. Graduate accessibility (5)
  {
    const grad = ["trainee", "graduate_programme", "junior", "paralegal", "research"].includes(job.job_kind) || /trainee|graduate|junior|entry|متدرب|حديث/.test(text);
    criteria.push({ key: "access", label: "Graduate accessibility", weight: 5, score: grad ? 5 : 2, reason: grad ? "explicitly entry-level / graduate" : "not explicitly entry-level" });
  }

  let total = criteria.reduce((a, c) => a + c.score, 0);
  // Hard eligibility failures cap the score so they never rank high.
  const elig = criteria[0].score;
  if (elig === 0) total = Math.min(total, 35);

  const positioning = buildPositioning(job, agHits.map((h) => h.key));
  const strategy = buildStrategy(job, elig, profile);

  return { total: clamp(Math.round(total), 0, 100), criteria, strengths, gaps, positioning, strategy, flags, computedAt: new Date().toISOString() };
}

function buildPositioning(job: MatchableJob, hits: string[]): string[] {
  const out: string[] = [];
  const area = job.practice_areas ?? [];
  if (area.includes("corporate_ma") || hits.includes("ma") || hits.includes("dd"))
    out.push("Lead with transaction support: describe your role preparing due diligence report sections and supporting SPAs and shareholders' resolutions — name the document types, not confidential client details.");
  if (area.includes("projects_construction") || hits.includes("fidic") || hits.includes("matrices"))
    out.push("Emphasise FIDIC contract review and the regulatory/stakeholder matrices you built for infrastructure, energy and PPP projects — this is rare for a graduate.");
  if (area.includes("disputes") || hits.includes("disputes"))
    out.push("Show disputes readiness: background chronologies, dispute notes and contractual analysis demonstrate you can organise facts against contract terms.");
  if (area.includes("regulatory_compliance") || hits.includes("governance"))
    out.push("Frame your Saudi legal research and governance/incorporation support as regulatory analysis experience.");
  if (job.category === "in_house") out.push("For in-house teams, translate law-firm work into business outcomes: faster contract turnaround, risk identification, clean corporate records.");
  out.push("State your bilingual drafting explicitly (Arabic ↔ English) and offer a short writing sample if requested.");
  return out;
}

function buildStrategy(job: MatchableJob, elig: number, profile: Profile): string {
  if (elig === 0) return "Do not apply to this listing. Add the firm to your watchlist and approach its graduate recruitment team about trainee intakes instead (see Hidden Market).";
  if (job.license_req === "licensed_required" && profile.licenseStatus !== "licensed")
    return "Likely out of reach until licensed. If the firm is a priority, send a short note asking whether it has a trainee track feeding this team.";
  if (job.category.startsWith("law_firm")) return "Apply through the official portal or listed email, tailoring the cover letter to the firm's practice strengths; follow up with the recruiting contact after 7–10 days.";
  return "Apply directly on the employer's site (not the aggregator), then connect with a member of the legal team on LinkedIn with a brief, specific note.";
}
