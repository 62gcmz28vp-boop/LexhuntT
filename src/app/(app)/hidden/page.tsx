import Link from "next/link";
import { FIRMS } from "@/data/firms";
import { q } from "@/lib/db";
import { Card, PageHeader, Badge } from "@/components/ui";
import { WatchButton } from "@/components/WatchButton";
import type { Firm } from "@/lib/types";
import { fmtDate } from "@/lib/utils";

const SIGNAL_LABEL: Record<Firm["signals"][number]["kind"], string> = {
  expansion: "Riyadh expansion / new office",
  new_practice: "New practice area",
  historical_trainees: "Has recruited trainees before",
  graduate_page: "Active graduate page",
  direct_applications: "Accepts direct applications",
  lateral_hiring: "Team growth / lateral moves",
};

function strategyFor(f: Firm): string[] {
  const kinds = new Set(f.signals.map((s) => s.kind));
  const out: string[] = [];
  if (kinds.has("expansion"))
    out.push("New offices build their junior bench in the first 12–24 months. Write to the Riyadh office managing partner or HR shortly after launch, referencing the opening and offering support on the practices they announced.");
  if (kinds.has("historical_trainees")) out.push("The firm has trained juniors in Riyadh before. Ask when the next trainee intake is expected and whether graduates (not only co-op students) are considered.");
  if (kinds.has("graduate_page")) out.push("Its graduate page is the official channel — add it to your watchlist so LEXHUNT flags page changes, and prepare your documents in advance.");
  if (kinds.has("lateral_hiring")) out.push("Partner/team moves often create junior support needs. A short, specific note to the arriving or remaining team can be well timed.");
  if (kinds.has("direct_applications")) out.push("Recruits through public posts/direct applications — a concise CV and cover note sent to the stated channel is appropriate.");
  out.push("Lead with your Addleshaw Goddard co-op: DD reports, SPA support, FIDIC reviews, dispute chronologies and PPP/energy regulatory matrices.");
  return out;
}

export default async function Hidden() {
  const watch = new Set((await q<{ slug: string }>("SELECT slug FROM firm_state WHERE watch = true")).map((r) => r.slug));
  const withJobs = new Map((await q<{ employer_slug: string; n: number }>("SELECT employer_slug, count(*)::int AS n FROM jobs WHERE status <> 'closed' AND employer_slug IS NOT NULL GROUP BY employer_slug")).map((r) => [r.employer_slug, r.n]));
  const firms = FIRMS.filter((f) => f.signals.length > 0).sort((a, b) => b.signals.length - a.signals.length);
  const quiet = FIRMS.filter((f) => f.signals.length === 0 && f.hiringStatus === "unknown");

  return (
    <>
      <PageHeader
        eyebrow="Hidden Opportunities"
        title="Firms worth approaching — even without an advert"
        subtitle="Signals come only from public sources (firm announcements, legal press, careers pages). Everything here is a SPECULATIVE opportunity unless marked as having a listed vacancy. Open a firm to draft a personalised expression-of-interest email."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {firms.map((f) => (
          <Card key={f.slug} className="fade-in p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/radar/${f.slug}`} className="font-serif text-xl hover:text-gold">
                  {f.name}
                </Link>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {withJobs.get(f.slug) ? <Badge tone="ok">Has {withJobs.get(f.slug)} listed opportunity(ies)</Badge> : <Badge tone="warn">Speculative — no listed vacancy</Badge>}
                  {Array.from(new Set(f.signals.map((s) => s.kind))).map((k) => (
                    <Badge key={k} tone="gold">
                      {SIGNAL_LABEL[k]}
                    </Badge>
                  ))}
                </div>
              </div>
              <WatchButton slug={f.slug} watching={watch.has(f.slug)} />
            </div>
            <ul className="mt-3 space-y-1 text-xs text-ink-2">
              {f.signals.map((s, i) => (
                <li key={i}>
                  • {s.text}
                  {s.date ? <span className="text-muted"> ({s.date})</span> : null}
                  {s.sources?.map((si) => (
                    <a key={si} href={f.sources[si]?.url} target="_blank" rel="noopener noreferrer" className="ms-1 text-gold hover:underline">
                      [{si + 1}]
                    </a>
                  ))}
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-lg bg-surface-2 p-3 text-xs">
              <div className="eyebrow mb-1">Approach strategy</div>
              <ul className="list-disc space-y-1 ps-4 text-ink-2">{strategyFor(f).map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-muted">
                Careers email: {f.applicationRoute?.text.includes("@") ? f.applicationRoute.text : "not publicly listed in sources reviewed"}
                {f.careersUrl && (
                  <>
                    {" · "}
                    <a href={f.careersUrl} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                      careers page ↗
                    </a>
                  </>
                )}
              </span>
              <Link href={`/radar/${f.slug}#approach`} className="font-medium text-gold hover:underline">
                Draft approach email →
              </Link>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-8 p-5">
        <div className="eyebrow mb-1">Quiet firms</div>
        <h2 className="font-serif text-lg">No public signals found ({quiet.length})</h2>
        <p className="mt-1 text-sm text-ink-2">Absence of signals is not absence of opportunity — smaller Saudi firms often hire through referrals. Consider a short speculative email after researching each firm.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {quiet.map((f) => (
            <Link key={f.slug} href={`/radar/${f.slug}`} className="rounded-full border border-line px-3 py-1 text-xs hover:border-gold">
              {f.name}
            </Link>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted">Research date: {fmtDate(FIRMS[0].lastResearched)}</p>
      </Card>
    </>
  );
}
