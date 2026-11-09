import "server-only";
import { env } from "../../env";
import { politeFetch } from "../http";
import type { RawListing, SourceResult } from "../types";
import { SEARCH_QUERIES_AR, SEARCH_QUERIES_EN } from "../../taxonomy";

/** Query plan shared by aggregator providers. Ordered by priority; truncated to DISCOVERY_MAX_QUERIES. */
export function queryPlan(): string[] {
  const priority = ["trainee lawyer", "trainee associate", "legal trainee", "junior legal counsel", "paralegal", "legal researcher", "compliance analyst", "contracts specialist"];
  const rest = SEARCH_QUERIES_EN.filter((q) => !priority.includes(q));
  return [...priority, SEARCH_QUERIES_AR[0], SEARCH_QUERIES_AR[2], ...rest, ...SEARCH_QUERIES_AR.slice(3)];
}

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_publisher?: string;
  job_city?: string | null;
  job_state?: string | null;
  job_country?: string | null;
  job_location?: string | null;
  job_is_remote?: boolean;
  job_description?: string;
  job_apply_link?: string;
  job_google_link?: string;
  job_posted_at_datetime_utc?: string | null;
  job_offer_expiration_datetime_utc?: string | null;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary_currency?: string | null;
  job_salary_period?: string | null;
  apply_options?: { publisher: string; apply_link: string; is_direct?: boolean }[];
}

/**
 * JSearch (RapidAPI) — licensed aggregation of Google for Jobs, which indexes LinkedIn, Indeed, Bayt,
 * GulfTalent, Glassdoor, Naukrigulf and employer career sites. This is the legitimate route to those boards.
 */
export async function fetchJSearch(): Promise<{ result: SourceResult; raw: RawListing[] }> {
  const name = "JSearch (Google for Jobs: LinkedIn, Indeed, Bayt, GulfTalent, employer sites)";
  if (!env.rapidApiKey) return { result: { source: name, status: "not_configured", fetched: 0, kept: 0, message: "Set RAPIDAPI_KEY" }, raw: [] };
  const raw: RawListing[] = [];
  const errors: string[] = [];
  const queries = queryPlan().slice(0, Math.max(1, Math.floor(env.maxQueries / (env.serpApiKey ? 2 : 1))));
  for (const qtext of queries) {
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(`${qtext} in Riyadh, Saudi Arabia`)}&page=1&num_pages=1&country=sa&date_posted=month`;
    try {
      const res = await politeFetch(url, { json: true, headers: { "X-RapidAPI-Key": env.rapidApiKey, "X-RapidAPI-Host": "jsearch.p.rapidapi.com" } });
      if (!res.ok) {
        errors.push(`${qtext}: HTTP ${res.status}`);
        if (res.status === 401 || res.status === 403 || res.status === 429) break;
        continue;
      }
      const body = (await res.json()) as { data?: JSearchJob[] };
      for (const j of body.data ?? []) {
        const direct = j.apply_options?.find((o) => o.is_direct);
        const salary = j.job_min_salary ? `${j.job_min_salary}${j.job_max_salary ? `–${j.job_max_salary}` : ""} ${j.job_salary_currency ?? ""} ${j.job_salary_period ?? ""}`.trim() : null;
        raw.push({
          title: j.job_title,
          employer: j.employer_name,
          location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", ") || j.job_location || "",
          description: j.job_description ?? "",
          applyUrl: direct?.apply_link ?? j.job_apply_link ?? j.job_google_link ?? "",
          sourceUrl: j.job_apply_link ?? j.job_google_link ?? "",
          source: `jsearch:${(j.job_publisher ?? "unknown").toLowerCase().replace(/\s+/g, "-")}`,
          publisher: j.job_publisher,
          externalId: j.job_id,
          postedAt: j.job_posted_at_datetime_utc ?? null,
          deadline: j.job_offer_expiration_datetime_utc ?? null,
          salary,
          remote: !!j.job_is_remote,
          official: false,
        });
      }
    } catch (e) {
      errors.push(`${qtext}: ${(e as Error).message}`);
    }
  }
  return {
    result: { source: name, status: errors.length && !raw.length ? "error" : "ok", fetched: raw.length, kept: 0, message: `${queries.length} queries${errors.length ? `; errors: ${errors.slice(0, 3).join(" | ")}` : ""}` },
    raw,
  };
}

interface SerpJob {
  title: string;
  company_name: string;
  location?: string;
  via?: string;
  description?: string;
  job_id?: string;
  share_link?: string;
  detected_extensions?: { posted_at?: string; salary?: string; work_from_home?: boolean };
  apply_options?: { title: string; link: string }[];
}

export async function fetchSerpApi(): Promise<{ result: SourceResult; raw: RawListing[] }> {
  const name = "SerpApi Google Jobs";
  if (!env.serpApiKey) return { result: { source: name, status: "not_configured", fetched: 0, kept: 0, message: "Set SERPAPI_KEY" }, raw: [] };
  const raw: RawListing[] = [];
  const errors: string[] = [];
  const queries = queryPlan().slice(0, Math.max(1, Math.floor(env.maxQueries / (env.rapidApiKey ? 2 : 1))));
  for (const qtext of queries) {
    const url = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(qtext)}&location=${encodeURIComponent("Riyadh, Saudi Arabia")}&hl=en&gl=sa&api_key=${env.serpApiKey}`;
    try {
      const res = await politeFetch(url, { json: true });
      if (!res.ok) {
        errors.push(`${qtext}: HTTP ${res.status}`);
        if (res.status === 401 || res.status === 429) break;
        continue;
      }
      const body = (await res.json()) as { jobs_results?: SerpJob[] };
      for (const j of body.jobs_results ?? []) {
        const apply = j.apply_options?.[0];
        raw.push({
          title: j.title,
          employer: j.company_name,
          location: j.location ?? "",
          description: j.description ?? "",
          applyUrl: apply?.link ?? j.share_link ?? "",
          sourceUrl: j.share_link ?? apply?.link ?? "",
          source: `serpapi:${(j.via ?? "google").replace(/^via\s+/i, "").toLowerCase().replace(/\s+/g, "-")}`,
          publisher: j.via?.replace(/^via\s+/i, ""),
          externalId: j.job_id,
          postedAt: null,
          salary: j.detected_extensions?.salary ?? null,
          remote: !!j.detected_extensions?.work_from_home,
          official: false,
        });
      }
    } catch (e) {
      errors.push(`${qtext}: ${(e as Error).message}`);
    }
  }
  return {
    result: { source: name, status: errors.length && !raw.length ? "error" : "ok", fetched: raw.length, kept: 0, message: `${queries.length} queries${errors.length ? `; errors: ${errors.slice(0, 3).join(" | ")}` : ""}` },
    raw,
  };
}
