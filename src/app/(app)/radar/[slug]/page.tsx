import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Globe } from "lucide-react";
import { firmBySlug } from "@/data/firms";
import { q, q1 } from "@/lib/db";
import { Card, CardHeader, Badge, Button, Textarea } from "@/components/ui";
import { VerificationBadge, StatusBadge } from "@/components/badges";
import { WatchButton } from "@/components/WatchButton";
import { ApproachGenerator } from "@/components/ApproachGenerator";
import { CheckPageButton } from "@/components/CheckPageButton";
import { CLASS_LABEL, HIRING_LABEL } from "@/lib/firmLabels";
import { saveFirmNotes, createApplication } from "@/app/actions";
import { aiEnabled, type ApproachOutput } from "@/lib/ai";
import { fmtDate } from "@/lib/utils";

export default async function FirmProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = firmBySlug(slug);
  if (!f) notFound();
  const st = await q1<{ watch: boolean; notes: string | null; last_checked: Date | null; last_check_status: string | null; last_check_detail: string | null; signals: string[]; last_changed: Date | null }>(
    "SELECT * FROM firm_state WHERE slug = $1",
    [slug],
  );
  const jobs = await q<{ id: string; title: string; status: string; match_score: number | null }>("SELECT id, title, status, match_score FROM jobs WHERE employer_slug = $1 ORDER BY status, match_score DESC", [slug]);
  const approach = await q1<{ content: ApproachOutput; engine: string }>("SELECT content, engine FROM ai_outputs WHERE subject_type = 'firm' AND subject_id = $1 ORDER BY created_at DESC LIMIT 1", [slug]);
  const h = HIRING_LABEL[f.hiringStatus];
  const srcRef = (ids?: number[]) =>
    ids?.length ? (
      <span className="ms-1 text-[10px] text-gold">
        {ids.map((i) => (
          <a key={i} href={f.sources[i]?.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            [{i + 1}]
          </a>
        ))}
      </span>
    ) : null;
  const saveNotes = saveFirmNotes.bind(null, slug);
  const trackSpeculative = async () => {
    "use server";
    await createApplication({ firmSlug: slug, title: "Speculative application — trainee associate", employer: f.name, speculative: true });
  };

  return (
    <>
      <Link href="/radar" className="mb-4 inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
        <ArrowLeft className="h-3 w-3 rtl:rotate-180" /> Firm Radar
      </Link>
      <div className="fade-in mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="eyebrow mb-2">Firm intelligence profile</div>
          <h1 className="font-serif text-3xl md:text-4xl">{f.name}</h1>
          {f.nameAr && (
            <div className="mt-1 text-lg text-ink-2" dir="rtl">
              {f.nameAr}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="navy">{CLASS_LABEL[f.classification]}</Badge>
            <Badge tone={h.tone}>{h.label}</Badge>
            {f.presenceSince && <Badge>Riyadh since {f.presenceSince}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <WatchButton slug={slug} watching={!!st?.watch} label />
          {f.website && (
            <Button asChild variant="outline" size="sm">
              <a href={f.website} target="_blank" rel="noopener noreferrer">
                <Globe className="h-4 w-4" /> Website
              </a>
            </Button>
          )}
          {f.careersUrl && (
            <Button asChild size="sm">
              <a href={f.careersUrl} target="_blank" rel="noopener noreferrer">
                Careers portal <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="Firm information" title="Riyadh presence & practice" />
            <div className="space-y-4 p-5 text-sm">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                  Riyadh office <VerificationBadge status={f.riyadhOffice.status} />
                </div>
                <p>
                  {f.riyadhOffice.text}
                  {srcRef(f.riyadhOffice.sources)}
                </p>
              </div>
              {f.structure && (
                <div>
                  <div className="mb-1 text-xs text-muted">Structure</div>
                  <p>{f.structure}</p>
                </div>
              )}
              <div>
                <div className="mb-1 text-xs text-muted">Practice areas <span className="text-[10px]">(indicative — compiled from firm and press descriptions; confirm on the firm&apos;s website)</span></div>
                <div className="flex flex-wrap gap-1.5">{f.practiceAreas.length ? f.practiceAreas.map((p) => <Badge key={p} tone="gold">{p}</Badge>) : <span className="text-muted">Not publicly disclosed in sources reviewed</span>}</div>
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                  Size / ranking {f.size ? <VerificationBadge status={f.size.status} /> : <VerificationBadge status="not_disclosed" />}
                </div>
                <p>{f.size ? <>{f.size.text}{srcRef(f.size.sources)}</> : "No reliable figure found."}</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="Graduate recruitment" title="Programmes, eligibility & hiring status" />
            <div className="space-y-3 p-5 text-sm">
              <p className="rounded-lg bg-surface-2 p-3 text-ink-2">{f.hiringNote || "No hiring note."}</p>
              {f.graduateRecruitment.length === 0 && <p className="text-muted">No graduate-recruitment information publicly disclosed in the sources reviewed.</p>}
              {f.graduateRecruitment.map((g, i) => (
                <div key={i} className="flex items-start gap-3">
                  <VerificationBadge status={g.status} />
                  <p>
                    {g.text}
                    {srcRef(g.sources)}
                  </p>
                </div>
              ))}
              <div className="flex items-center gap-3 border-t border-line pt-3">
                <span className="text-xs text-muted">Accepts speculative applications:</span>
                {f.acceptsSpeculative === "unknown" ? <VerificationBadge status="not_disclosed" /> : <VerificationBadge status={f.acceptsSpeculative} />}
              </div>
              {f.applicationRoute && (
                <div className="flex items-start gap-3">
                  <span className="text-xs text-muted">Application route:</span>
                  <p>
                    {f.applicationRoute.text}
                    {srcRef(f.applicationRoute.sources)}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader eyebrow="Recruitment process" title="How this firm hires" />
            <ol className="divide-y divide-line">
              {f.recruitmentProcess.map((r, i) => (
                <li key={i} className="flex items-start gap-4 px-5 py-3 text-sm">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy font-serif text-xs text-[#f6f2e8]">{i + 1}</span>
                  <div className="flex-1">
                    <div className="font-medium">{r.stage}</div>
                    <div className={r.status === "not_disclosed" ? "text-muted" : "text-ink-2"}>
                      {r.detail}
                      {srcRef(r.sources)}
                    </div>
                  </div>
                  <VerificationBadge status={r.status} />
                </li>
              ))}
            </ol>
            <p className="border-t border-line px-5 py-3 text-[11px] text-muted">Stages are never inferred. Anything not stated publicly is labelled &quot;Not publicly disclosed&quot;.</p>
          </Card>

          {f.tips && f.tips.length > 0 && (
            <Card>
              <CardHeader eyebrow="Positioning" title="Tips specific to this firm" />
              <ul className="list-disc space-y-2 p-5 ps-10 text-sm">{f.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </Card>
          )}

          <ApproachGenerator slug={slug} initial={approach?.content ?? null} initialEngine={approach?.engine ?? null} aiConfigured={aiEnabled()} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="Live monitor" title="Careers page check" />
            <div className="space-y-2 p-5 text-sm">
              {f.careersUrl ? (
                <>
                  <p className="break-all text-xs text-muted">{f.careersUrl}</p>
                  <p>
                    Last checked: <strong>{st?.last_checked ? fmtDate(st.last_checked, true) : "never"}</strong> {st?.last_check_status && <Badge>{st.last_check_status}</Badge>}
                  </p>
                  {st?.last_check_detail && <p className="text-xs text-muted">{st.last_check_detail}</p>}
                  {st?.last_changed && <p className="text-xs text-gold">Page content changed {fmtDate(st.last_changed, true)}</p>}
                  {st?.signals?.length ? <ul className="list-disc ps-4 text-xs text-ink-2">{st.signals.map((s, i) => <li key={i}>{s}</li>)}</ul> : null}
                  <CheckPageButton slug={slug} />
                </>
              ) : (
                <p className="text-muted">No careers page on file — monitoring not possible.</p>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader eyebrow="Vacancies" title={`Listings at this firm (${jobs.length})`} />
            <ul className="divide-y divide-line text-sm">
              {jobs.length === 0 && <li className="px-5 py-3 text-muted">None recorded. This is not a vacancy — see Hidden Market for a speculative approach.</li>}
              {jobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-2 px-5 py-2">
                  <Link href={`/opportunities/${j.id}`} className="hover:text-gold">
                    {j.title}
                  </Link>
                  <StatusBadge status={j.status} />
                </li>
              ))}
            </ul>
            <form action={trackSpeculative} className="border-t border-line px-5 py-3">
              <Button size="sm" variant="outline" type="submit">
                Track a speculative approach
              </Button>
            </form>
          </Card>
          <Card>
            <CardHeader eyebrow="Private" title="My notes" />
            <form action={saveNotes} className="space-y-2 p-5">
              <Textarea name="notes" rows={5} defaultValue={st?.notes ?? ""} placeholder="Contacts met, events, referrals…" />
              <Button size="sm" type="submit">
                Save notes
              </Button>
            </form>
          </Card>
          <Card>
            <CardHeader eyebrow="Sources" title="Research references" />
            <ol className="space-y-2 p-5 text-xs">
              {f.sources.map((s, i) => (
                <li key={i}>
                  <span className="text-gold">[{i + 1}]</span>{" "}
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {s.label}
                  </a>{" "}
                  <span className="text-muted">
                    · {s.kind} · accessed {fmtDate(s.accessed)}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
