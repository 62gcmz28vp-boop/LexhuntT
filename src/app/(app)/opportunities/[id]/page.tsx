import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, ArrowLeft, Building2 } from "lucide-react";
import { getJob } from "@/lib/jobs";
import { q, q1 } from "@/lib/db";
import { firmBySlug } from "@/data/firms";
import { aiEnabled, type ApplySmarterOutput } from "@/lib/ai";
import { ApplySmarter } from "@/components/ApplySmarter";
import { StatusBadge, ScoreRing } from "@/components/badges";
import { Card, CardHeader, Badge, Button } from "@/components/ui";
import { JobActions, VerifyForm } from "@/components/JobActions";
import { CATEGORY_LABEL, KIND_LABEL, LICENSE_LABEL, expLabel, fmtDate } from "@/lib/utils";
import { PRACTICE_AREAS } from "@/lib/taxonomy";
import { markSeen } from "@/app/actions";

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await getJob(id);
  if (!found) notFound();
  const { job, sources, history } = found;
  if (job.is_new) await markSeen([id]);
  const firm = job.employer_slug ? firmBySlug(job.employer_slug) : null;
  const m = job.match_detail;
  const saved = await q1<{ content: ApplySmarterOutput; engine: string }>("SELECT content, engine FROM ai_outputs WHERE subject_type = 'job' AND subject_id = $1 AND kind = 'apply_smarter' ORDER BY created_at DESC LIMIT 1", [id]);
  const app = await q1<{ id: number; stage: string }>("SELECT id, stage FROM applications WHERE job_id = $1", [id]);
  const others = await q<{ id: string; title: string; status: string }>("SELECT id, title, status FROM jobs WHERE employer = $1 AND id <> $2 LIMIT 5", [job.employer, id]);

  const facts: [string, React.ReactNode][] = [
    ["Position", job.title],
    ["Employer", firm ? <Link href={`/radar/${firm.slug}`} className="text-gold hover:underline">{job.employer}</Link> : job.employer],
    ["Employer type", CATEGORY_LABEL[job.category]],
    ["Role type", KIND_LABEL[job.job_kind]],
    ["Location", `${job.location ?? "—"}${job.work_mode !== "unknown" ? ` · ${job.work_mode}` : ""}`],
    ["Experience", expLabel(job.experience_min, job.experience_max)],
    ["Licence", LICENSE_LABEL[job.license_req]],
    ["Nationality", job.nationality_req ?? "Not stated"],
    ["Salary", job.salary ?? "Not publicly disclosed"],
    ["Posted", fmtDate(job.posted_at)],
    ["Deadline", job.deadline ? fmtDate(job.deadline) : "Not published"],
    ["First discovered", fmtDate(job.first_seen, true)],
    ["Last checked", fmtDate(job.last_seen, true)],
    ["Last verified (official)", job.last_verified ? fmtDate(job.last_verified, true) : "Never"],
  ];

  return (
    <>
      <Link href="/opportunities" className="mb-4 inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
        <ArrowLeft className="h-3 w-3 rtl:rotate-180" /> Live Opportunities
      </Link>
      <div className="fade-in mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <ScoreRing score={job.match_score} size={64} />
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={job.status} />
              <Badge tone="neutral">{KIND_LABEL[job.job_kind]}</Badge>
              <Badge tone={job.license_req === "licensed_required" ? "bad" : job.license_req === "trainee_registration" ? "warn" : "neutral"}>{LICENSE_LABEL[job.license_req]}</Badge>
            </div>
            <h1 className="font-serif text-3xl leading-tight">{job.title}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-ink-2">
              <Building2 className="h-4 w-4 text-gold" /> {job.employer} · {job.location}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {job.apply_url && (
            <Button asChild variant="primary">
              <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
                Official application link <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          <JobActions jobId={id} saved={job.saved} title={job.title} employer={job.employer} deadline={job.deadline ? new Date(job.deadline).toISOString() : null} appId={app?.id ?? null} />
        </div>
      </div>

      {job.verification_note && (
        <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${job.status === "open" ? "border-ok/30 bg-ok-soft text-ok" : job.status === "closed" ? "border-line bg-surface-2 text-ink-2" : "border-warn/30 bg-warn-soft text-warn"}`}>
          <strong className="capitalize">{job.status}:</strong> {job.verification_note}
          {job.eligibility_note && <div className="mt-1 text-ink-2">Eligibility: {job.eligibility_note}</div>}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          {m && (
            <Card>
              <CardHeader eyebrow="Personalised match" title={`${m.total}/100 qualification alignment`} />
              <div className="grid gap-6 p-5 lg:grid-cols-2">
                <div className="space-y-3">
                  {m.criteria.map((c) => (
                    <div key={c.key}>
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-ink">{c.label}</span>
                        <span className="tabular-nums text-muted">
                          {c.score}/{c.weight}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                        <div className="h-1.5 rounded-full bg-gold" style={{ width: `${(c.score / c.weight) * 100}%` }} />
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted">{c.reason}</div>
                    </div>
                  ))}
                  <p className="pt-2 text-[11px] text-muted">The score measures alignment between the advertised requirements and your verified profile. It is not a hiring probability.</p>
                </div>
                <div className="space-y-4 text-sm">
                  <section>
                    <div className="eyebrow mb-1">Why you are a good candidate</div>
                    {m.strengths.length ? <ul className="list-disc space-y-1 ps-5">{m.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p className="text-muted">Few direct overlaps detected — the description may be thin.</p>}
                  </section>
                  <section>
                    <div className="eyebrow mb-1">Potential weaknesses</div>
                    {m.gaps.length || m.flags.length ? (
                      <ul className="list-disc space-y-1 ps-5">
                        {[...m.gaps, ...m.flags].map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted">No stated requirement you clearly miss.</p>
                    )}
                  </section>
                  <section>
                    <div className="eyebrow mb-1">How to position yourself</div>
                    <ul className="list-disc space-y-1 ps-5">{m.positioning.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </section>
                  <section>
                    <div className="eyebrow mb-1">Application strategy</div>
                    <p>{m.strategy}</p>
                  </section>
                </div>
              </div>
            </Card>
          )}

          <ApplySmarter jobId={id} initial={saved?.content ?? null} initialEngine={saved?.engine ?? null} aiConfigured={aiEnabled()} />

          <Card>
            <CardHeader eyebrow="As advertised" title="Description" />
            <div className="whitespace-pre-wrap p-5 text-sm leading-relaxed text-ink-2">{job.description ?? "No description captured. Open the official link."}</div>
            {job.practice_areas.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
                {job.practice_areas.map((a) => (
                  <Badge key={a} tone="gold">
                    {PRACTICE_AREAS[a]?.label ?? a}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="Listing" title="Key facts" />
            <dl className="divide-y divide-line text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[130px_1fr] gap-2 px-5 py-2">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card>
            <CardHeader eyebrow="Provenance" title={`Sources (${sources.length})`} />
            <ul className="divide-y divide-line text-sm">
              {sources.map((s) => (
                <li key={s.source_url} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Badge tone={s.source.startsWith("official") ? "ok" : "neutral"}>{s.source.startsWith("official") ? "Official" : "Secondary"}</Badge>
                    <span className="truncate">{s.publisher ?? s.source}</span>
                  </div>
                  <a href={s.source_url} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-xs text-gold hover:underline">
                    {s.source_url}
                  </a>
                  <div className="text-[11px] text-muted">
                    first seen {fmtDate(s.first_seen)} · last seen {fmtDate(s.last_seen)}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader eyebrow="Audit trail" title="Status history" />
            <ol className="space-y-2 px-5 py-4 text-xs">
              {history.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-24 shrink-0 text-muted">{fmtDate(h.changed_at)}</span>
                  <span>
                    {h.from_status ? `${h.from_status} → ` : ""}
                    <strong>{h.to_status}</strong> — {h.reason}
                  </span>
                </li>
              ))}
            </ol>
            <div className="border-t border-line px-5 py-4">
              <VerifyForm jobId={id} />
            </div>
          </Card>
          {others.length > 0 && (
            <Card>
              <CardHeader eyebrow="Same employer" title="Other listings" />
              <ul className="divide-y divide-line text-sm">
                {others.map((o) => (
                  <li key={o.id} className="flex items-center justify-between px-5 py-2">
                    <Link href={`/opportunities/${o.id}`} className="hover:text-gold">
                      {o.title}
                    </Link>
                    <StatusBadge status={o.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
