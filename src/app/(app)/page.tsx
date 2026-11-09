import Link from "next/link";
import { ArrowRight, AlertTriangle, CalendarClock, Telescope } from "lucide-react";
import { q, q1 } from "@/lib/db";
import { listJobs } from "@/lib/jobs";
import { toRowViews } from "@/lib/views";
import { getPrefs } from "@/lib/prefs";
import { integrationStatus } from "@/lib/env";
import { FIRMS } from "@/data/firms";
import { JobTable } from "@/components/JobTable";
import { RunDiscoveryButton } from "@/components/RunDiscoveryButton";
import { Card, CardHeader, PageHeader, Stat, Badge } from "@/components/ui";
import { fmtDate, daysUntil } from "@/lib/utils";
import { STAGES } from "@/lib/stages";

export default async function CommandCenter() {
  const { lang } = await getPrefs();
  const stats = await q1<Record<string, number>>(`
    SELECT
      count(*) FILTER (WHERE status = 'open' AND NOT dismissed)::int AS open_verified,
      count(*) FILTER (WHERE status = 'unverified' AND NOT dismissed)::int AS unverified,
      count(*) FILTER (WHERE is_new AND status <> 'closed' AND NOT dismissed)::int AS fresh,
      count(*) FILTER (WHERE job_kind IN ('trainee','graduate_programme') AND status <> 'closed' AND NOT dismissed)::int AS trainee,
      count(*) FILTER (WHERE category = 'law_firm_international' AND status <> 'closed' AND NOT dismissed)::int AS intl,
      count(*) FILTER (WHERE category = 'law_firm_saudi' AND status <> 'closed' AND NOT dismissed)::int AS saudi,
      count(*) FILTER (WHERE category = 'in_house' AND status <> 'closed' AND NOT dismissed)::int AS inhouse,
      count(*) FILTER (WHERE job_kind = 'graduate_programme' AND status = 'open')::int AS programmes_open,
      count(*) FILTER (WHERE deadline BETWEEN now() AND now() + interval '30 days' AND status <> 'closed')::int AS deadlines
    FROM jobs`);
  const lastRun = await q1<{ finished_at: Date; trigger: string; ok: boolean }>("SELECT finished_at, trigger, ok FROM discovery_runs WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1");
  const top = (await listJobs({ sort: "match" })).filter((j) => j.status !== "closed" && (j.match_detail?.criteria?.[0]?.score ?? 1) > 0).slice(0, 6);
  const topRows = await toRowViews(top);
  const deadlines = await q<{ id: string; title: string; employer: string; deadline: Date; src: string }>(
    `SELECT id, title, employer, deadline, 'job' AS src FROM jobs WHERE deadline > now() AND status <> 'closed' AND NOT dismissed
     UNION ALL SELECT id::text, title, employer, deadline, 'app' FROM applications WHERE deadline > now() AND stage NOT IN ('offer','rejected','withdrawn')
     ORDER BY deadline LIMIT 6`,
  );
  const pipeline = await q<{ stage: string; n: number }>("SELECT stage, count(*)::int AS n FROM applications GROUP BY stage");
  const follow = await q<{ id: number; employer: string; title: string; follow_up_at: Date }>(
    "SELECT id, employer, title, follow_up_at FROM applications WHERE follow_up_at IS NOT NULL AND stage NOT IN ('offer','rejected','withdrawn') ORDER BY follow_up_at LIMIT 4",
  );
  const notes = await q<{ id: number; title: string; body: string | null; link: string | null; created_at: Date }>("SELECT id, title, body, link, created_at FROM notifications ORDER BY created_at DESC LIMIT 5");
  const integrations = integrationStatus().filter((i) => !i.configured);
  const hidden = FIRMS.filter((f) => f.signals.some((s) => s.kind === "expansion" || s.kind === "historical_trainees")).slice(0, 5);
  const pipeMap = new Map(pipeline.map((p) => [p.stage, p.n]));
  const totalApps = pipeline.reduce((a, p) => a + p.n, 0);

  const s = stats ?? {};
  return (
    <>
      <PageHeader
        eyebrow={lang === "ar" ? "مركز القيادة" : "LEXHUNT Command Center"}
        title={lang === "ar" ? "نظرتك اليومية على سوق التوظيف القانوني" : "Your daily recruitment overview"}
        subtitle={
          <>
            Last discovery run: <strong>{lastRun ? fmtDate(lastRun.finished_at, true) : "never"}</strong>
            {lastRun ? ` (${lastRun.trigger})` : ""} · Riyadh time. Counts reflect only what LEXHUNT has verified or recorded — see the Coverage report for limits.
          </>
        }
        actions={<RunDiscoveryButton />}
      />

      {integrations.length > 0 && (
        <div className="fade-in mb-6 flex items-start gap-3 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <strong>Not yet configured:</strong> {integrations.map((i) => i.label).join(" · ")}.{" "}
            <Link href="/settings" className="underline">
              See Settings
            </Link>{" "}
            — these features run in a limited mode until credentials are added.
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Verified active vacancies" value={s.open_verified ?? 0} hint="Confirmed on an official source" tone="ok" />
        <Stat label="Unverified leads" value={s.unverified ?? 0} hint="Need confirmation" tone="warn" />
        <Stat label="Newly discovered" value={s.fresh ?? 0} hint="Since you last reviewed" tone="gold" />
        <Stat label="Trainee / graduate" value={s.trainee ?? 0} hint="Not closed" />
        <Stat label="Upcoming deadlines" value={s.deadlines ?? 0} hint="Next 30 days" />
        <Stat label="International firms" value={s.intl ?? 0} hint="Opportunities not closed" />
        <Stat label="Saudi firms" value={s.saudi ?? 0} hint="Opportunities not closed" />
        <Stat label="In-house legal" value={s.inhouse ?? 0} hint="Opportunities not closed" />
        <Stat label="Programmes accepting" value={s.programmes_open ?? 0} hint="Verified open" />
        <Stat label="Firms tracked" value={FIRMS.length} hint="In Firm Radar" />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="fade-in">
          <CardHeader
            eyebrow="My Matches"
            title="Highest-matching opportunities"
            action={
              <Link href="/matches" className="inline-flex items-center gap-1 text-xs text-gold hover:underline">
                All matches <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </Link>
            }
          />
          <div className="p-2">
            {topRows.length ? <JobTable rows={topRows} compact /> : <p className="p-6 text-sm text-muted">No eligible opportunities yet. Run discovery or add one manually.</p>}
          </div>
          <p className="border-t border-line px-5 py-3 text-[11px] text-muted">Match = qualification alignment with your verified profile (0–100). It is not a probability of receiving an offer.</p>
        </Card>

        <div className="space-y-6">
          <Card className="fade-in">
            <CardHeader eyebrow="Deadlines" title="Coming up" action={<CalendarClock className="h-4 w-4 text-gold" />} />
            <ul className="divide-y divide-line">
              {deadlines.length === 0 && <li className="px-5 py-4 text-sm text-muted">No verified future deadlines recorded.</li>}
              {deadlines.map((d) => {
                const n = daysUntil(d.deadline) ?? 0;
                return (
                  <li key={`${d.src}${d.id}`} className="flex items-center gap-3 px-5 py-3">
                    <div className={`w-12 text-center font-serif text-xl tabular-nums ${n <= 7 ? "text-bad" : "text-ink"}`}>
                      {n}
                      <div className="text-[9px] uppercase tracking-wider text-muted">days</div>
                    </div>
                    <Link href={d.src === "job" ? `/opportunities/${d.id}` : "/pipeline"} className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{d.title}</div>
                      <div className="text-xs text-muted">
                        {d.employer} · {fmtDate(d.deadline)}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="fade-in">
            <CardHeader eyebrow="Career Pipeline" title={`${totalApps} applications tracked`} action={<Link href="/pipeline" className="text-xs text-gold hover:underline">Open</Link>} />
            <div className="space-y-2 px-5 py-4">
              {STAGES.filter((st) => !["discovered"].includes(st.key)).map((st) => {
                const n = pipeMap.get(st.key) ?? 0;
                return (
                  <div key={st.key} className="flex items-center gap-3 text-xs">
                    <span className="w-32 shrink-0 text-ink-2">{lang === "ar" ? st.ar : st.label}</span>
                    <div className="h-2 flex-1 rounded-full bg-surface-2">
                      <div className="h-2 rounded-full bg-gold" style={{ width: totalApps ? `${(n / totalApps) * 100}%` : 0 }} />
                    </div>
                    <span className="w-6 text-end tabular-nums">{n}</span>
                  </div>
                );
              })}
              {follow.length > 0 && (
                <div className="mt-3 border-t border-line pt-3">
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-muted">Suggested follow-ups</div>
                  {follow.map((f) => (
                    <div key={f.id} className="flex justify-between text-xs">
                      <span className="truncate">{f.employer}</span>
                      <span className="text-muted">{fmtDate(f.follow_up_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="fade-in">
          <CardHeader eyebrow="Hidden Market" title="Firms worth approaching" action={<Telescope className="h-4 w-4 text-gold" />} />
          <ul className="divide-y divide-line">
            {hidden.map((f) => (
              <li key={f.slug} className="px-5 py-3">
                <Link href={`/radar/${f.slug}`} className="text-sm font-medium hover:text-gold">
                  {f.name}
                </Link>
                <div className="mt-0.5 text-xs text-muted">{f.signals[0]?.text}</div>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-5 py-3">
            <Link href="/hidden" className="text-xs text-gold hover:underline">
              See all signals and approach strategies →
            </Link>
          </div>
        </Card>
        <Card className="fade-in">
          <CardHeader eyebrow="Notification center" title="Latest updates" action={<Link href="/alerts" className="text-xs text-gold hover:underline">All</Link>} />
          <ul className="divide-y divide-line">
            {notes.length === 0 && <li className="px-5 py-4 text-sm text-muted">No notifications yet. They appear after discovery runs.</li>}
            {notes.map((n) => (
              <li key={n.id} className="px-5 py-3">
                <Link href={n.link ?? "/alerts"} className="text-sm font-medium hover:text-gold">
                  {n.title}
                </Link>
                <div className="text-xs text-muted">
                  {n.body} · {fmtDate(n.created_at, true)}
                </div>
              </li>
            ))}
          </ul>
          <div className="px-5 pb-4">
            <Badge tone="neutral">Email delivery: see Alerts</Badge>
          </div>
        </Card>
      </div>
    </>
  );
}
