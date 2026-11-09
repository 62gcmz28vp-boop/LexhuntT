import "server-only";
import { env } from "../env";

/**
 * Polite HTTP client for public career pages and official job APIs:
 *  - identifies itself honestly in the User-Agent
 *  - honours robots.txt (Disallow rules for our agent or *) for HTML pages
 *  - time-outs, small per-host delay, no retries against 4xx, never bypasses auth/CAPTCHA
 */
export const USER_AGENT = `LexhuntBot/1.0 (personal job-search assistant; low-volume; +${env.appUrl})`;

const robotsCache = new Map<string, { rules: string[]; fetchedAt: number }>();
const lastHit = new Map<string, number>();

export class BlockedByRobots extends Error {}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function robotsRules(origin: string): Promise<string[]> {
  const cached = robotsCache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < 6 * 3600_000) return cached.rules;
  let rules: string[] = [];
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000) });
    if (res.ok) rules = parseRobots(await res.text());
  } catch {
    rules = []; // unreachable robots.txt → treat as no rules (RFC 9309 §2.3.1.3 for 4xx; network errors we still try once)
  }
  robotsCache.set(origin, { rules, fetchedAt: Date.now() });
  return rules;
}

/** Returns Disallow path prefixes applying to us (group for "lexhuntbot" if present, else "*"). */
export function parseRobots(txt: string): string[] {
  const groups: { agents: string[]; disallow: string[]; allow: string[] }[] = [];
  let cur: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const [k, ...rest] = line.split(":");
    const key = k.trim().toLowerCase();
    const val = rest.join(":").trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], disallow: [], allow: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (!cur) continue;
      if (key === "disallow" && val) cur.disallow.push(val);
      if (key === "allow" && val) cur.allow.push(val);
    }
  }
  const mine = groups.find((g) => g.agents.some((a) => a.includes("lexhunt"))) ?? groups.find((g) => g.agents.includes("*"));
  return mine?.disallow ?? [];
}

export function isAllowed(path: string, disallow: string[]) {
  return !disallow.some((rule) => {
    const r = rule.replace(/\*/g, "");
    return r === "/" ? true : path.startsWith(r);
  });
}

export async function politeFetch(url: string, opts: { json?: boolean; checkRobots?: boolean; headers?: Record<string, string>; timeoutMs?: number } = {}) {
  const u = new URL(url);
  if (opts.checkRobots) {
    const rules = await robotsRules(u.origin);
    if (!isAllowed(u.pathname, rules)) throw new BlockedByRobots(`robots.txt disallows ${u.pathname}`);
  }
  const since = Date.now() - (lastHit.get(u.host) ?? 0);
  if (since < 1500) await sleep(1500 - since);
  lastHit.set(u.host, Date.now());
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: opts.json ? "application/json" : "text/html,application/xhtml+xml", ...(opts.headers ?? {}) },
    signal: AbortSignal.timeout(opts.timeoutMs ?? 15000),
    redirect: "follow",
    cache: "no-store",
  });
  return res;
}

export function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function extractLinks(html: string, base: string): { text: string; href: string }[] {
  const out: { text: string; href: string }[] = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = htmlToText(m[2]).slice(0, 160);
    if (!text) continue;
    try {
      out.push({ text, href: new URL(m[1], base).toString() });
    } catch {
      /* ignore malformed */
    }
  }
  return out;
}
