import Link from "next/link";
import { q, q1 } from "@/lib/db";
import { STAGES } from "@/lib/stages";
import { Card, CardHeader, PageHeader, Input, Label, Textarea, Button, Badge, Select, Stat } from "@/components/ui";
import { StageSelect } from "@/components/StageSelect";
import { PipelineChart } from "@/components/PipelineChart";
import { createApplicationFromForm, updateApplication, addEvent, uploadAppDocument, deleteApplication } from "@/app/actions";
import { fmtDate, daysUntil, cn } from "@/lib/utils";

interface App {
  id: number;
  job_id: string | null;
  firm_slug: string | null;
  title: string;
  employer: string;
  stage: string;
  is_speculative: boolean;
  applied_at: Date | null;
  deadline: Date | null;
  follow_up_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

const toInput = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default async function Pipeline({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const sp = await searchParams;
  const apps = await q<App>("SELECT * FROM applications ORDER BY updated_at DESC");
  const sel = sp.app ? apps.find((a) => a.id === Number(sp.app)) : undefined;
  const events = sel ? await q<{ id: number; kind: string; title: string; detail: string | null; at: Date }>("SELECT * FROM application_events WHERE application_id = $1 ORDER BY at DESC", [sel.id]) : [];
  const docs = sel ? await q<{ id: number; kind: string; filename: string; size: number; created_at: Date }>("SELECT id, kind, filename, size, created_at FROM documents WHERE application_id = $1 ORDER BY created_at DESC", [sel.id]) : [];
  const evStats = await q1<{ interviews: number }>("SELECT count(*)::int AS interviews FROM application_events WHERE kind = 'interview'");
  const weekly = await q<{ week: string; n: number }>(
    "SELECT to_char(date_trunc('week', applied_at), 'DD Mon') AS week, count(*)::int AS n FROM applications WHERE applied_at IS NOT NULL GROUP BY date_trunc('week', applied_at) ORDER BY date_trunc('week', applied_at) LIMIT 26",
  );

  const by = (k: string) => apps.filter((a) => a.stage === k);
  const appliedPlus = apps.filter((a) => a.applied_at).length;
  const responded = apps.filter((a) => a.applied_at && ["assessment", "interview", "final_interview", "offer", "rejected"].includes(a.stage)).length;
  const interviewing = apps.filter((a) => ["interview", "final_interview"].includes(a.stage)).length;

  return (
    <>
      <PageHeader eyebrow="Career Pipeline" title="Applications, deadlines and follow-ups" subtitle="Private tracker. Suggested follow-up dates are set automatically (7 days after applying, 5 days after assessments/interviews) and trigger reminders in Alerts." />

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Tracked" value={apps.length} />
        <Stat label="Applied" value={appliedPlus} />
        <Stat label="Responses" value={responded} hint={appliedPlus ? `${Math.round((responded / appliedPlus) * 100)}% of applications` : "—"} tone="gold" />
        <Stat label="Interviewing now" value={interviewing} tone="ok" />
        <Stat label="Interviews logged" value={evStats?.interviews ?? 0} />
      </section>

      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3">
          {STAGES.map((st) => (
            <div key={st.key} className="w-60 shrink-0 rounded-xl border border-line bg-surface-2/50">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-2">{st.label}</span>
                <span className="text-xs tabular-nums text-muted">{by(st.key).length}</span>
              </div>
              <ul className="space-y-2 px-2 pb-2">
                {by(st.key).map((a) => {
                  const dl = daysUntil(a.deadline);
                  return (
                    <li key={a.id}>
                      <Link href={`/pipeline?app=${a.id}`} className={cn("block rounded-lg border bg-surface p-3 text-sm shadow-sm hover:border-gold", sel?.id === a.id ? "border-gold" : "border-line")}>
                        <div className="font-medium leading-snug">{a.employer}</div>
                        <div className="text-xs text-ink-2">{a.title}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {a.is_speculative && <Badge tone="warn">Speculative</Badge>}
                          {dl !== null && dl >= 0 && <Badge tone={dl <= 7 ? "bad" : "neutral"}>Due {dl}d</Badge>}
                          {a.follow_up_at && <Badge tone="info">Follow up {fmtDate(a.follow_up_at)}</Badge>}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {sel ? (
          <Card>
            <CardHeader
              eyebrow={sel.is_speculative ? "Speculative approach" : "Application"}
              title={`${sel.employer} — ${sel.title}`}
              action={<StageSelect appId={sel.id} stage={sel.stage} />}
            />
            <div className="grid gap-6 p-5 lg:grid-cols-2">
              <form action={updateApplication.bind(null, sel.id)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input id="deadline" type="date" name="deadline" defaultValue={toInput(sel.deadline)} />
                  </div>
                  <div>
                    <Label htmlFor="follow_up_at">Follow-up date</Label>
                    <Input id="follow_up_at" type="date" name="follow_up_at" defaultValue={toInput(sel.follow_up_at)} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" rows={6} defaultValue={sel.notes ?? ""} />
                </div>
                <Button size="sm" type="submit">
                  Save
                </Button>
                <div className="text-xs text-muted">
                  Applied: {fmtDate(sel.applied_at)} · Created {fmtDate(sel.created_at)}
                  {sel.job_id && (
                    <>
                      {" · "}
                      <Link href={`/opportunities/${sel.job_id}`} className="text-gold hover:underline">
                        vacancy & Apply Smarter
                      </Link>
                    </>
                  )}
                  {sel.firm_slug && (
                    <>
                      {" · "}
                      <Link href={`/radar/${sel.firm_slug}`} className="text-gold hover:underline">
                        firm profile
                      </Link>
                    </>
                  )}
                </div>
              </form>
              <div className="space-y-5">
                <div>
                  <div className="eyebrow mb-2">Documents (CV, cover letter, notes)</div>
                  <ul className="mb-2 space-y-1 text-sm">
                    {docs.map((d) => (
                      <li key={d.id} className="flex items-center justify-between rounded border border-line px-2 py-1">
                        <a href={`/api/documents/${d.id}`} className="truncate hover:text-gold">
                          {d.filename}
                        </a>
                        <Badge>{d.kind.replace("_", " ")}</Badge>
                      </li>
                    ))}
                    {docs.length === 0 && <li className="text-xs text-muted">No documents attached.</li>}
                  </ul>
                  <form action={uploadAppDocument.bind(null, sel.id)} className="flex flex-wrap items-center gap-2">
                    <Select name="kind" className="w-36" aria-label="Document type">
                      <option value="cv">Submitted CV</option>
                      <option value="cover_letter">Cover letter</option>
                      <option value="other">Other</option>
                    </Select>
                    <input type="file" name="file" required className="text-xs" />
                    <Button size="sm" variant="outline" type="submit">
                      Attach
                    </Button>
                  </form>
                </div>
                <div>
                  <div className="eyebrow mb-2">Log interview / event</div>
                  <form action={addEvent.bind(null, sel.id)} className="grid gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Select name="kind" aria-label="Event type">
                        <option value="interview">Interview</option>
                        <option value="assessment">Assessment</option>
                        <option value="contact">Contact / call</option>
                        <option value="note">Note</option>
                      </Select>
                      <Input type="datetime-local" name="at" aria-label="When" />
                    </div>
                    <Input name="title" placeholder="e.g. Partner interview with corporate team" required />
                    <Textarea name="detail" rows={2} placeholder="Questions asked, impressions, next steps" />
                    <Button size="sm" variant="outline" type="submit">
                      Add to timeline
                    </Button>
                  </form>
                </div>
              </div>
            </div>
            <div className="border-t border-line px-5 py-4">
              <div className="eyebrow mb-2">Timeline</div>
              <ol className="space-y-2 text-sm">
                {events.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <span className="w-28 shrink-0 text-xs text-muted">{fmtDate(e.at, true)}</span>
                    <span>
                      <Badge tone={e.kind === "interview" ? "gold" : "neutral"}>{e.kind}</Badge> {e.title}
                      {e.detail && <div className="text-xs text-ink-2">{e.detail}</div>}
                    </span>
                  </li>
                ))}
              </ol>
              <form action={deleteApplication.bind(null, sel.id)} className="mt-4">
                <Button size="sm" variant="danger" type="submit">
                  Delete application
                </Button>
              </form>
            </div>
          </Card>
        ) : (
          <Card className="p-6 text-sm text-muted">Select an application above, or track one from any vacancy or firm profile.</Card>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="Analytics" title="Applications per week" />
            <div className="p-4">{weekly.length ? <PipelineChart data={weekly} /> : <p className="text-sm text-muted">Appears once you mark applications as Applied.</p>}</div>
          </Card>
          <Card>
            <CardHeader eyebrow="Add manually" title="Track an application" />
            <form action={createApplicationFromForm} className="space-y-3 p-5">
              <Input name="employer" placeholder="Employer" required />
              <Input name="title" placeholder="Role / approach" required />
              <Input name="deadline" type="date" aria-label="Deadline" />
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" name="speculative" className="accent-[var(--gold)]" /> Speculative approach (no advertised vacancy)
              </label>
              <Button size="sm" type="submit">
                Add
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
