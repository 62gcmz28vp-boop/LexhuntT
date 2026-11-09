/** Log of the initial (build-time) research pass, surfaced in the Research Coverage Report. */
export const RESEARCH_DATE = "2026-11-09";

export const RESEARCH_SOURCES: { source: string; method: string; outcome: "ok" | "partial" | "blocked"; note: string }[] = [
  { source: "Web search index (EN)", method: "~30 targeted queries", outcome: "ok", note: "Firm sites, careers pages, legal press, directories." },
  { source: "Web search index (AR)", method: "Arabic queries (محامي متدرب الرياض …)", outcome: "ok", note: "Surfaced Arabic job boards and X job channel." },
  { source: "Firm careers pages (direct fetch)", method: "HTTP fetch", outcome: "blocked", note: "Build sandbox network blocked direct fetches; claims rely on the search index. The deployed app re-checks pages." },
  { source: "Legal 500 directory", method: "HTTP fetch", outcome: "blocked", note: "Host not reachable from build sandbox; only search-index excerpts used." },
  { source: "Chambers rankings", method: "Search index", outcome: "partial", note: "Corporate/Commercial Saudi Arabia excerpt only." },
  { source: "LinkedIn Jobs", method: "Search index", outcome: "blocked", note: "LinkedIn job pages not returned by the index and its terms prohibit scraping. Use JSearch (Google for Jobs) or the external search links." },
  { source: "Indeed (sa.indeed.com)", method: "Search index", outcome: "blocked", note: "No results surfaced; scraping prohibited. Covered via JSearch when configured." },
  { source: "Bayt", method: "Search index", outcome: "partial", note: "Category pages and a few listings surfaced." },
  { source: "GulfTalent", method: "Search index", outcome: "partial", note: "Junior lawyer / junior legal counsel category pages surfaced." },
  { source: "Glassdoor", method: "Search index", outcome: "partial", note: "Riyadh legal/lawyer listing pages surfaced (aggregated)." },
  { source: "Naukrigulf", method: "Search index", outcome: "blocked", note: "No results surfaced. Use the external search link." },
  { source: "Jadarat (jadarat.sa)", method: "Search index", outcome: "blocked", note: "Government portal requires login/interactive search; no public API. Use the external link." },
  { source: "Ministry of Justice", method: "Search index", outcome: "ok", note: "Trainee programme and Code of Law Practice pages." },
];

export const COVERAGE_LIMITATIONS = [
  "No vacancy has been confirmed live on an employer's own page by this build — statuses start as 'unverified' or 'closed' until the deployed discovery engine re-checks them.",
  "LinkedIn, Indeed and Jadarat do not permit automated scraping; they are reached only through licensed aggregators (JSearch / SerpApi Google Jobs) or manual search links.",
  "Many law-firm careers sites are JavaScript applications (Workday, SuccessFactors, Oleeo). The career-page monitor detects text changes but may not extract individual listings from them.",
  "Small Saudi firms often recruit through WhatsApp, X (Twitter) and referrals — these channels are not machine-searchable.",
  "Firm sizes and rankings are self-reported or directory claims, not independently audited.",
  "Arabic-only firm websites may be under-represented.",
];
