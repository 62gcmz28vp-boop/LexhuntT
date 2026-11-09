import "server-only";
import { politeFetch, htmlToText } from "../http";
import type { RawListing, SourceResult } from "../types";
import { ATS_BOARDS, type AtsBoard } from "@/data/atsBoards";

/** Official public job-board JSON endpoints (designed for public job widgets). */
export function boardUrl(b: AtsBoard) {
  switch (b.provider) {
    case "greenhouse":
      return `https://boards-api.greenhouse.io/v1/boards/${b.token}/jobs?content=true`;
    case "lever":
      return `https://api.lever.co/v0/postings/${b.token}?mode=json`;
    case "workable":
      return `https://apply.workable.com/api/v1/widget/accounts/${b.token}?details=true`;
    case "smartrecruiters":
      return `https://api.smartrecruiters.com/v1/companies/${b.token}/postings?limit=100`;
    case "ashby":
      return `https://api.ashbyhq.com/posting-api/job-board/${b.token}?includeCompensation=true`;
  }
}

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function parseBoard(b: AtsBoard, body: Any): RawListing[] {
  const mk = (r: Omit<RawListing, "employer" | "source" | "official" | "categoryHint">): RawListing => ({ ...r, employer: b.employer, source: `${b.provider}:${b.token}`, official: true, categoryHint: b.category, publisher: b.employer });
  switch (b.provider) {
    case "greenhouse":
      return (body.jobs ?? []).map((j: Any) =>
        mk({ title: j.title, location: j.location?.name ?? "", description: htmlToText(decodeEntities(j.content ?? "")), applyUrl: j.absolute_url, sourceUrl: j.absolute_url, externalId: String(j.id), postedAt: j.updated_at ?? null }),
      );
    case "lever":
      return (Array.isArray(body) ? body : []).map((j: Any) =>
        mk({
          title: j.text,
          location: j.categories?.location ?? (j.categories?.allLocations ?? []).join(", "),
          description: `${j.descriptionPlain ?? ""} ${(j.lists ?? []).map((l: Any) => `${l.text}: ${htmlToText(l.content ?? "")}`).join(" ")}`,
          applyUrl: j.applyUrl ?? j.hostedUrl,
          sourceUrl: j.hostedUrl,
          externalId: j.id,
          postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
          remote: j.workplaceType === "remote",
        }),
      );
    case "workable":
      return (body.jobs ?? []).map((j: Any) =>
        mk({ title: j.title, location: [j.city, j.country].filter(Boolean).join(", "), description: htmlToText(j.description ?? ""), applyUrl: j.application_url ?? j.url, sourceUrl: j.url ?? j.shortlink, externalId: j.shortcode, postedAt: j.published_on ?? null, remote: !!j.telecommuting }),
      );
    case "smartrecruiters":
      return (body.content ?? []).map((j: Any) =>
        mk({
          title: j.name,
          location: [j.location?.city, j.location?.country].filter(Boolean).join(", "),
          description: `${j.function?.label ?? ""} ${j.experienceLevel?.label ?? ""}`,
          applyUrl: `https://jobs.smartrecruiters.com/${b.token}/${j.id}`,
          sourceUrl: `https://jobs.smartrecruiters.com/${b.token}/${j.id}`,
          externalId: j.id,
          postedAt: j.releasedDate ?? null,
          remote: !!j.location?.remote,
        }),
      );
    case "ashby":
      return (body.jobs ?? []).map((j: Any) =>
        mk({ title: j.title, location: j.location ?? "", description: j.descriptionPlain ?? htmlToText(j.descriptionHtml ?? ""), applyUrl: j.applyUrl ?? j.jobUrl, sourceUrl: j.jobUrl, externalId: j.id, postedAt: j.publishedAt ?? null, remote: !!j.isRemote }),
      );
  }
}

function decodeEntities(s: string) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

export async function fetchAtsBoards(boards = ATS_BOARDS): Promise<{ result: SourceResult; raw: RawListing[]; seen: Map<string, string[]> }[]> {
  const out: { result: SourceResult; raw: RawListing[]; seen: Map<string, string[]> }[] = [];
  for (const b of boards) {
    const url = boardUrl(b);
    const name = `${b.provider} board · ${b.employer}`;
    try {
      const res = await politeFetch(url, { json: true });
      if (res.status === 404) {
        out.push({ result: { source: name, status: "error", fetched: 0, kept: 0, message: "Board not found (404) — token may be wrong; run npm run probe:ats", url }, raw: [], seen: new Map() });
        continue;
      }
      if (!res.ok) {
        out.push({ result: { source: name, status: "error", fetched: 0, kept: 0, message: `HTTP ${res.status}`, url }, raw: [], seen: new Map() });
        continue;
      }
      const raw = parseBoard(b, await res.json());
      out.push({ result: { source: name, status: "ok", fetched: raw.length, kept: 0, message: `${raw.length} postings on board`, url }, raw, seen: new Map([[`${b.provider}:${b.token}`, raw.map((r) => r.sourceUrl)]]) });
    } catch (e) {
      out.push({ result: { source: name, status: "error", fetched: 0, kept: 0, message: (e as Error).message, url }, raw: [], seen: new Map() });
    }
  }
  return out;
}
