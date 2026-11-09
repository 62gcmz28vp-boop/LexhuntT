import "server-only";
import { q, q1, json } from "./db";
import { env } from "./env";
import type { JobRow } from "./types";
import { FIRMS } from "@/data/firms";

export async function notify(n: { ruleId?: string; kind: string; title: string; body?: string; link?: string; dedupe?: string }) {
  const rows = await q<{ id: number }>(
    "INSERT INTO notifications (rule_id, kind, title, body, link, dedupe) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (dedupe) DO NOTHING RETURNING id",
    [n.ruleId ?? null, n.kind, n.title, n.body ?? null, n.link ?? null, n.dedupe ?? null],
  );
  return rows[0]?.id ?? null;
}

export function emailConfigured() {
  return !!(env.resendKey && env.alertTo && env.alertFrom);
}

export async function sendEmail(subject: string, html: string): Promise<{ ok: boolean; detail: string }> {
  if (!emailConfigured()) return { ok: false, detail: "Email not configured (RESEND_API_KEY, ALERT_EMAIL_TO, ALERT_EMAIL_FROM)" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.alertFrom, to: [env.alertTo], subject, html }),
  });
  const text = await res.text();
  return { ok: res.ok, detail: res.ok ? "sent" : `Resend HTTP ${res.status}: ${text.slice(0, 200)}` };
}

interface Rule {
  id: string;
  label: string;
  enabled: boolean;
  frequency: "instant" | "daily" | "weekly";
  channel_email: boolean;
  params: Record<string, unknown>;
  last_sent_at: Date | null;
}

/** Evaluate alert rules after a discovery run (or the daily reminder job). Creates in-app notifications; emails per frequency. */
export async function evaluateAlerts(ctx: { newJobIds: string[]; changedFirms: string[] }) {
  const rules = await q<Rule>("SELECT * FROM alert_rules WHERE enabled = true");
  const watch = new Set((await q<{ slug: string }>("SELECT slug FROM firm_state WHERE watch = true")).map((r) => r.slug));
  const newJobs = ctx.newJobIds.length ? await q<JobRow>(`SELECT * FROM jobs WHERE id = ANY($1::text[]) AND status <> 'closed'`, [ctx.newJobIds]) : [];
  const created: { rule: Rule; title: string; body: string; link: string }[] = [];

  for (const rule of rules) {
    const push = async (title: string, body: string, link: string, dedupe: string) => {
      const id = await notify({ ruleId: rule.id, kind: rule.id, title, body, link, dedupe });
      if (id) created.push({ rule, title, body, link });
    };
    if (rule.id === "new_trainee")
      for (const j of newJobs.filter((j) => ["trainee", "graduate_programme"].includes(j.job_kind)))
        await push(`New trainee vacancy: ${j.title}`, `${j.employer} · ${j.location ?? "Riyadh"} · status ${j.status}`, `/opportunities/${j.id}`, `new_trainee:${j.id}`);
    if (rule.id === "intl_graduate")
      for (const j of newJobs.filter((j) => j.category === "law_firm_international" && ["trainee", "graduate_programme", "junior", "paralegal"].includes(j.job_kind)))
        await push(`International firm graduate role: ${j.employer}`, j.title, `/opportunities/${j.id}`, `intl_graduate:${j.id}`);
    if (rule.id === "high_match") {
      const t = Number(rule.params.threshold ?? 75);
      for (const j of newJobs.filter((j) => (j.match_score ?? 0) >= t)) await push(`High match (${j.match_score}): ${j.title}`, j.employer, `/opportunities/${j.id}`, `high_match:${j.id}`);
    }
    if (rule.id === "watchlist_opens") {
      for (const slug of ctx.changedFirms.filter((s) => watch.has(s))) {
        const f = FIRMS.find((x) => x.slug === slug);
        await push(`Careers page changed: ${f?.name ?? slug}`, "A firm on your watchlist updated its careers page. Review for new intakes.", `/radar/${slug}`, `watch:${slug}:${new Date().toISOString().slice(0, 10)}`);
      }
      for (const j of newJobs.filter((j) => j.employer_slug && watch.has(j.employer_slug)))
        await push(`Watchlist firm is recruiting: ${j.employer}`, j.title, `/opportunities/${j.id}`, `watch_job:${j.id}`);
    }
    if (rule.id === "deadline") {
      const days = Number(rule.params.days ?? 7);
      const soon = await q<{ id: string; title: string; employer: string; deadline: Date; kind: string }>(
        `SELECT id, title, employer, deadline, 'job' AS kind FROM jobs WHERE saved = true AND status <> 'closed' AND deadline BETWEEN now() AND now() + ($1 || ' days')::interval
         UNION ALL
         SELECT id::text, title, employer, deadline, 'app' AS kind FROM applications WHERE stage NOT IN ('offer','rejected','withdrawn') AND deadline BETWEEN now() AND now() + ($1 || ' days')::interval`,
        [String(days)],
      );
      for (const s of soon)
        await push(`Deadline ${new Date(s.deadline).toLocaleDateString("en-GB")}: ${s.title}`, s.employer, s.kind === "job" ? `/opportunities/${s.id}` : `/pipeline`, `deadline:${s.kind}:${s.id}:${new Date(s.deadline).toISOString().slice(0, 10)}`);
      const follow = await q<{ id: number; title: string; employer: string; follow_up_at: Date }>(
        "SELECT id, title, employer, follow_up_at FROM applications WHERE follow_up_at BETWEEN now() - interval '1 day' AND now() + interval '1 day' AND stage NOT IN ('offer','rejected','withdrawn')",
      );
      for (const f of follow) await push(`Follow up today: ${f.employer}`, f.title, `/pipeline`, `follow:${f.id}:${new Date(f.follow_up_at).toISOString().slice(0, 10)}`);
    }
  }

  // Email delivery per rule frequency
  if (emailConfigured()) {
    for (const rule of rules.filter((r) => r.channel_email)) {
      const due =
        rule.frequency === "instant" ||
        !rule.last_sent_at ||
        Date.now() - new Date(rule.last_sent_at).getTime() > (rule.frequency === "daily" ? 20 : 6.5 * 24) * 3600_000;
      if (!due) continue;
      const pending = await q<{ id: number; title: string; body: string | null; link: string | null }>(
        "SELECT id, title, body, link FROM notifications WHERE rule_id = $1 AND emailed_at IS NULL ORDER BY created_at DESC LIMIT 25",
        [rule.id],
      );
      if (!pending.length) continue;
      const html = `<div style="font-family:Georgia,serif;color:#0f1b2d"><h2 style="color:#0f1b2d">LEXHUNT — ${escapeHtml(rule.label)}</h2><ul>${pending
        .map((p) => `<li><a href="${env.appUrl}${p.link ?? "/"}">${escapeHtml(p.title)}</a><br/><small>${escapeHtml(p.body ?? "")}</small></li>`)
        .join("")}</ul><p style="color:#8a6d2b">You receive this because the alert is enabled in LEXHUNT → Alerts.</p></div>`;
      const r = await sendEmail(`LEXHUNT: ${pending.length} update${pending.length > 1 ? "s" : ""} — ${rule.label}`, html);
      if (r.ok) {
        await q("UPDATE notifications SET emailed_at = now() WHERE id = ANY($1::int[])", [pending.map((p) => p.id)]);
        await q("UPDATE alert_rules SET last_sent_at = now() WHERE id = $1", [rule.id]);
      }
    }
  }
  return created.length;
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const r = await q1<{ value: T }>("SELECT value FROM settings WHERE key = $1", [key]);
  return r?.value ?? null;
}

export async function setSetting(key: string, value: unknown) {
  await q("INSERT INTO settings (key, value, updated_at) VALUES ($1, $2::jsonb, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()", [key, json(value)]);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}
