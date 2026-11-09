import Link from "next/link";
import { FIRMS } from "@/data/firms";
import { q } from "@/lib/db";
import { Card, PageHeader, Badge, Input, Select, Button } from "@/components/ui";
import { VerificationBadge } from "@/components/badges";
import { WatchButton } from "@/components/WatchButton";
import { fmtDate } from "@/lib/utils";
import { CLASS_LABEL, HIRING_LABEL } from "@/lib/firmLabels";

export default async function Radar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const state = await q<{ slug: string; watch: boolean; last_checked: Date | null; last_check_status: string | null }>("SELECT slug, watch, last_checked, last_check_status FROM firm_state");
  const st = new Map(state.map((s) => [s.slug, s]));
  const jobCounts = new Map(
    (await q<{ employer_slug: string; n: number }>("SELECT employer_slug, count(*)::int AS n FROM jobs WHERE employer_slug IS NOT NULL AND status <> 'closed' GROUP BY employer_slug")).map((r) => [r.employer_slug, r.n]),
  );
  let firms = FIRMS;
  if (sp.q) {
    const qq = sp.q.toLowerCase();
    firms = firms.filter((f) => `${f.name} ${f.nameAr ?? ""} ${f.practiceAreas.join(" ")}`.toLowerCase().includes(qq));
  }
  if (sp.cls && sp.cls !== "all") firms = firms.filter((f) => f.classification === sp.cls);
  if (sp.hiring && sp.hiring !== "all") firms = firms.filter((f) => f.hiringStatus === sp.hiring);
  if (sp.watch === "1") firms = firms.filter((f) => st.get(f.slug)?.watch);
  firms = [...firms].sort((a, b) => Number(!!st.get(b.slug)?.watch) - Number(!!st.get(a.slug)?.watch) || a.name.localeCompare(b.name));

  const counts = {
    intl: FIRMS.filter((f) => f.classification === "international").length,
    aff: FIRMS.filter((f) => f.classification === "international_affiliate").length,
    saudi: FIRMS.filter((f) => f.classification === "saudi").length,
    boutique: FIRMS.filter((f) => f.classification === "boutique").length,
  };

  return (
    <>
      <PageHeader
        eyebrow="The Riyadh Law Firm Radar"
        title={`${FIRMS.length} firms with a Riyadh presence`}
        subtitle={`${counts.intl} international · ${counts.aff} international affiliates / JVs · ${counts.saudi} Saudi · ${counts.boutique} boutiques. Every claim carries a verification label and a source link. Firms appear whether or not they are hiring today.`}
      />
      <Card className="mb-4 p-4">
        <form className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto_auto]">
          <Input name="q" defaultValue={sp.q} placeholder="Search firm, Arabic name or practice area…" />
          <Select name="cls" defaultValue={sp.cls ?? "all"} aria-label="Classification">
            <option value="all">All types</option>
            {Object.entries(CLASS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select name="hiring" defaultValue={sp.hiring ?? "all"} aria-label="Hiring status">
            <option value="all">Any hiring status</option>
            {Object.entries(HIRING_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-1.5 text-xs text-ink-2">
            <input type="checkbox" name="watch" value="1" defaultChecked={sp.watch === "1"} className="accent-[var(--gold)]" /> Watchlist
          </label>
          <Button type="submit">Filter</Button>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {firms.map((f) => {
          const s = st.get(f.slug);
          const h = HIRING_LABEL[f.hiringStatus];
          return (
            <Card key={f.slug} className="fade-in flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/radar/${f.slug}`} className="font-serif text-lg leading-snug hover:text-gold">
                    {f.name}
                  </Link>
                  {f.nameAr && (
                    <div className="text-sm text-muted" dir="rtl">
                      {f.nameAr}
                    </div>
                  )}
                </div>
                <WatchButton slug={f.slug} watching={!!s?.watch} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge tone="navy">{CLASS_LABEL[f.classification]}</Badge>
                <Badge tone={h.tone}>{h.label}</Badge>
                {jobCounts.get(f.slug) ? <Badge tone="ok">{jobCounts.get(f.slug)} listing(s)</Badge> : null}
              </div>
              <p className="mt-3 line-clamp-3 text-xs text-ink-2">{f.riyadhOffice.text}</p>
              <div className="mt-1">
                <VerificationBadge status={f.riyadhOffice.status} />
              </div>
              {f.practiceAreas.length > 0 && <p className="mt-3 text-xs text-muted">{f.practiceAreas.slice(0, 4).join(" · ")}</p>}
              <div className="mt-auto flex items-center justify-between pt-4 text-[11px] text-muted">
                <span>{s?.last_checked ? `Page checked ${fmtDate(s.last_checked)} (${s.last_check_status})` : `Researched ${fmtDate(f.lastResearched)}`}</span>
                <Link href={`/radar/${f.slug}`} className="text-gold hover:underline">
                  Profile →
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
