import "server-only";
import { createHash } from "node:crypto";
import { politeFetch, htmlToText, extractLinks, BlockedByRobots } from "../http";
import type { RawListing, SourceResult } from "../types";
import { FIRMS } from "@/data/firms";
import { q, q1, json } from "../../db";
import { JUNIOR_HINTS, isLegalRole } from "../../taxonomy";

const SIGNAL_TERMS: { term: RegExp; label: string }[] = [
  { term: /trainee associate|trainee lawyer|legal trainee|محامي متدرب|متدرب/i, label: "mentions trainee roles" },
  { term: /graduate|training contract|early careers|حديثي التخرج/i, label: "mentions graduate / early-careers recruitment" },
  { term: /co-?op|cooperative|التدريب التعاوني/i, label: "mentions co-op programme" },
  { term: /applications? (are )?(now )?open|apply now|accepting applications|التقديم متاح/i, label: "says applications are open" },
  { term: /applications? (have |has )?(now )?closed|deadline has (now )?passed|no longer accepting/i, label: "says applications are closed" },
  { term: /speculative|unsolicited|send (us )?your cv|careers@|recruitment@|hr@/i, label: "accepts direct / speculative applications" },
];

export interface PageCheck {
  slug: string;
  status: "ok" | "changed" | "unchanged" | "blocked" | "error";
  detail: string;
  signals: string[];
  listings: RawListing[];
}

export async function checkCareerPage(slug: string, url: string): Promise<PageCheck> {
  const firm = FIRMS.find((f) => f.slug === slug)!;
  try {
    const res = await politeFetch(url, { checkRobots: true });
    if (!res.ok) return { slug, status: "error", detail: `HTTP ${res.status}`, signals: [], listings: [] };
    const html = await res.text();
    const text = htmlToText(html);
    const hash = createHash("sha256").update(text).digest("hex");
    const prev = await q1<{ page_hash: string | null }>("SELECT page_hash FROM firm_state WHERE slug = $1", [slug]);
    const signals = SIGNAL_TERMS.filter((s) => s.term.test(text)).map((s) => s.label);
    const jsHeavy = text.length < 400;
    if (jsHeavy) signals.push("page is mostly JavaScript — listings may not be machine-readable; check manually");

    const host = new URL(res.url || url).host.replace(/^www\./, "");
    const listings: RawListing[] = extractLinks(html, res.url || url)
      .filter((l) => {
        const t = l.text.toLowerCase();
        const sameSite = new URL(l.href).host.replace(/^www\./, "").endsWith(host.split(".").slice(-2).join("."));
        return sameSite && t.length > 6 && t.length < 120 && isLegalRole(l.text) && JUNIOR_HINTS.some((k) => t.includes(k)) && /riyadh|saudi|ksa|الرياض/i.test(`${l.text} ${l.href} ${url}`);
      })
      .slice(0, 15)
      .map((l) => ({
        title: l.text,
        employer: firm.name,
        location: "Riyadh",
        description: `Listed on ${firm.name}'s official careers page (${url}).`,
        applyUrl: l.href,
        sourceUrl: l.href,
        source: `career_page:${slug}`,
        publisher: firm.name,
        official: true,
      }));

    const changed = !!prev?.page_hash && prev.page_hash !== hash;
    await q(
      `INSERT INTO firm_state (slug, page_hash, last_checked, last_check_status, last_check_detail, signals, last_changed)
       VALUES ($1,$2,now(),$3,$4,$5::jsonb, CASE WHEN $6 THEN now() ELSE NULL END)
       ON CONFLICT (slug) DO UPDATE SET page_hash = EXCLUDED.page_hash, last_checked = now(), last_check_status = EXCLUDED.last_check_status,
         last_check_detail = EXCLUDED.last_check_detail, signals = EXCLUDED.signals,
         last_changed = CASE WHEN $6 THEN now() ELSE firm_state.last_changed END`,
      [slug, hash, changed ? "changed" : "ok", `${listings.length} candidate listings; ${signals.length} signals`, json(signals), changed],
    );
    return { slug, status: changed ? "changed" : prev?.page_hash ? "unchanged" : "ok", detail: `${listings.length} candidate listings`, signals, listings };
  } catch (e) {
    const blocked = e instanceof BlockedByRobots;
    await q(
      `INSERT INTO firm_state (slug, last_checked, last_check_status, last_check_detail) VALUES ($1, now(), $2, $3)
       ON CONFLICT (slug) DO UPDATE SET last_checked = now(), last_check_status = EXCLUDED.last_check_status, last_check_detail = EXCLUDED.last_check_detail`,
      [slug, blocked ? "blocked" : "error", (e as Error).message.slice(0, 300)],
    );
    return { slug, status: blocked ? "blocked" : "error", detail: (e as Error).message, signals: [], listings: [] };
  }
}

export async function fetchCareerPages(): Promise<{ result: SourceResult; checks: PageCheck[] }> {
  const watched = new Set((await q<{ slug: string }>("SELECT slug FROM firm_state WHERE watch = true")).map((r) => r.slug));
  const targets = FIRMS.filter((f) => f.careersUrl).sort((a, b) => Number(watched.has(b.slug)) - Number(watched.has(a.slug)));
  const checks: PageCheck[] = [];
  for (const f of targets) checks.push(await checkCareerPage(f.slug, f.careersUrl!));
  const ok = checks.filter((c) => ["ok", "changed", "unchanged"].includes(c.status)).length;
  const blocked = checks.filter((c) => c.status === "blocked").length;
  return {
    result: {
      source: "Official law-firm career pages (monitor)",
      status: ok ? "ok" : "error",
      fetched: checks.reduce((a, c) => a + c.listings.length, 0),
      kept: 0,
      message: `${ok}/${targets.length} pages read; ${checks.filter((c) => c.status === "changed").length} changed; ${blocked} blocked by robots.txt; ${checks.filter((c) => c.status === "error").length} errors`,
    },
    checks,
  };
}
