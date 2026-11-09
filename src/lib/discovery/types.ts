import type { JobInput } from "../types";

export interface SourceResult {
  source: string;
  status: "ok" | "skipped" | "error" | "not_configured" | "blocked";
  fetched: number;
  kept: number;
  message: string;
  url?: string;
}

export interface SourceOutput {
  result: SourceResult;
  jobs: JobInput[];
  /** For authoritative feeds (official ATS boards / career pages): ids seen, so missing ones can be closed. */
  authoritative?: { employer: string; sourcePrefix: string; seenUrls: string[] };
}

/** Raw listing from any provider before relevance filtering. */
export interface RawListing {
  title: string;
  employer: string;
  location: string;
  description: string;
  applyUrl: string;
  sourceUrl: string;
  source: string; // e.g. "jsearch:linkedin", "greenhouse:tabby"
  publisher?: string;
  externalId?: string;
  postedAt?: string | null;
  deadline?: string | null;
  salary?: string | null;
  remote?: boolean;
  official: boolean; // directly from the employer (ATS / careers page)
  categoryHint?: JobInput["category"];
}
