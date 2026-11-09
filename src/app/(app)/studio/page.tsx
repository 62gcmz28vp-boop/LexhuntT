import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { q, q1 } from "@/lib/db";
import { aiEnabled } from "@/lib/ai";
import { Card, CardHeader, PageHeader, Input, Label, Textarea, Select, Button, Badge } from "@/components/ui";
import { saveProfileForm, uploadCv } from "@/app/actions";
import { PRACTICE_AREAS } from "@/lib/taxonomy";
import { PREP_PACKS } from "@/data/prepPacks";
import { CvExtractor } from "@/components/CvExtractor";
import { fmtDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "profile", label: "Verified profile & CV" },
  { key: "prep", label: "Practice preparation" },
  { key: "packs", label: "Saved application packs" },
];

export default async function Studio({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const tab = sp.tab ?? "profile";
  const p = await getProfile();
  const cv = p.cvDocumentId ? await q1<{ id: number; filename: string; created_at: Date; extracted_text: string | null; size: number }>("SELECT id, filename, created_at, extracted_text, size FROM documents WHERE id = $1", [p.cvDocumentId]) : null;
  const packs = await q<{ subject_id: string; engine: string; created_at: Date; title: string | null; employer: string | null }>(
    `SELECT DISTINCT ON (a.subject_id) a.subject_id, a.engine, a.created_at, j.title, j.employer FROM ai_outputs a LEFT JOIN jobs j ON j.id = a.subject_id
     WHERE a.subject_type = 'job' ORDER BY a.subject_id, a.created_at DESC`,
  );
  const ag = p.experience[0];
  const edu = p.education[0];

  return (
    <>
      <PageHeader
        eyebrow="Application Studio"
        title="CV, letters and interview preparation"
        subtitle="Everything generated here draws only on facts in your verified profile. Nothing is submitted or sent to employers without you doing it yourself."
      />
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <Link key={t.key} href={`/studio?tab=${t.key}`} className={cn("whitespace-nowrap border-b-2 px-4 py-2.5 text-sm", tab === t.key ? "border-gold text-ink" : "border-transparent text-muted hover:text-ink")}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "profile" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <Card>
            <CardHeader eyebrow="Your profile" title="Verified professional profile" action={sp.saved ? <Badge tone="ok">Saved · matches re-scored</Badge> : null} />
            <form action={saveProfileForm} className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" name="fullName" defaultValue={p.fullName ?? ""} placeholder="As on your CV" />
              </div>
              <div>
                <Label htmlFor="headline">Headline</Label>
                <Input id="headline" name="headline" defaultValue={p.headline} />
              </div>
              <div>
                <Label htmlFor="institution">University</Label>
                <Input id="institution" name="institution" defaultValue={edu?.institution ?? ""} placeholder="Not yet provided" />
              </div>
              <div>
                <Label htmlFor="degree">Degree</Label>
                <Input id="degree" name="degree" defaultValue={edu?.degree ?? ""} />
              </div>
              <div>
                <Label htmlFor="gradYear">Graduation year</Label>
                <Input id="gradYear" name="gradYear" defaultValue={edu?.year ?? ""} />
              </div>
              <div>
                <Label htmlFor="grade">Grade / GPA (only if you want it used)</Label>
                <Input id="grade" name="grade" defaultValue={edu?.grade ?? ""} />
              </div>
              <div>
                <Label htmlFor="saudiNational">Saudi national? (many trainee roles require it)</Label>
                <Select id="saudiNational" name="saudiNational" defaultValue={p.saudiNational === null ? "unknown" : p.saudiNational ? "yes" : "no"}>
                  <option value="unknown">Prefer not to say / unknown</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="licenseStatus">Saudi licence status</Label>
                <Select id="licenseStatus" name="licenseStatus" defaultValue={p.licenseStatus}>
                  <option value="unknown">Not recorded</option>
                  <option value="none">Not registered</option>
                  <option value="trainee_registered">Registered MoJ legal trainee</option>
                  <option value="licensed">Licensed lawyer</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="graduate">Status</Label>
                <Select id="graduate" name="graduate" defaultValue={p.graduate ? "graduate" : "student"}>
                  <option value="graduate">Graduate</option>
                  <option value="student">Current student</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="agLocation">Addleshaw Goddard office</Label>
                <Input id="agLocation" name="agLocation" defaultValue={ag?.location ?? ""} placeholder="e.g. Riyadh" />
              </div>
              <div>
                <Label htmlFor="agStart">Co-op start</Label>
                <Input id="agStart" name="agStart" defaultValue={ag?.start ?? ""} placeholder="e.g. Jan 2026" />
              </div>
              <div>
                <Label htmlFor="agEnd">Co-op end</Label>
                <Input id="agEnd" name="agEnd" defaultValue={ag?.end ?? ""} placeholder="e.g. Jul 2026" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="agBullets">
                  {ag?.organisation} — {ag?.role} (one bullet per line){" "}
                  <Badge tone={ag?.provenance === "cv_extracted" ? "ok" : "neutral"}>{ag?.provenance?.replace("_", " ")}</Badge>
                </Label>
                <Textarea id="agBullets" name="agBullets" rows={9} defaultValue={ag?.bullets.join("\n")} />
              </div>
              <div>
                <Label htmlFor="skills">Skills (one per line)</Label>
                <Textarea id="skills" name="skills" rows={8} defaultValue={p.skills.join("\n")} />
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="languages">Languages (Language – level, one per line)</Label>
                  <Textarea id="languages" name="languages" rows={3} defaultValue={p.languages.map((l) => `${l.language}${l.level ? ` – ${l.level}` : ""}`).join("\n")} />
                </div>
                <div>
                  <Label htmlFor="certifications">Certifications / courses</Label>
                  <Textarea id="certifications" name="certifications" rows={3} defaultValue={p.certifications.join("\n")} />
                </div>
              </div>
              <fieldset className="md:col-span-2">
                <legend className="mb-2 text-xs font-medium text-ink-2">Practice strengths used for matching</legend>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(PRACTICE_AREAS).map(([k, v]) => (
                    <label key={k} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" name="practiceStrengths" value={k} defaultChecked={p.practiceStrengths.includes(k)} className="accent-[var(--gold)]" /> {v.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Private notes</Label>
                <Textarea id="notes" name="notes" rows={2} defaultValue={p.notes} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit">Save profile & re-score matches</Button>
              </div>
            </form>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader eyebrow="CV" title="Upload your CV" />
              <div className="space-y-3 p-5 text-sm">
                {cv ? (
                  <div className="rounded-lg bg-surface-2 p-3">
                    <div className="font-medium">{cv.filename}</div>
                    <div className="text-xs text-muted">
                      Uploaded {fmtDate(cv.created_at, true)} · {(cv.size / 1024).toFixed(0)} KB ·{" "}
                      <a href={`/api/documents/${cv.id}`} className="text-gold hover:underline">
                        download
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted">No CV uploaded yet. Your profile currently contains only what you told LEXHUNT in your brief.</p>
                )}
                <form action={uploadCv} className="space-y-2">
                  <input type="file" name="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" required className="block w-full text-xs file:me-3 file:rounded-md file:border-0 file:bg-navy file:px-3 file:py-1.5 file:text-[#f6f2e8]" />
                  <Button type="submit" size="sm">
                    Upload CV
                  </Button>
                </form>
                <p className="text-[11px] text-muted">PDF, DOCX or TXT up to 6 MB. Stored in your private database.</p>
              </div>
            </Card>
            {cv && <CvExtractor hasText={!!cv.extracted_text} aiConfigured={aiEnabled()} textPreview={(cv.extracted_text ?? "").slice(0, 1500)} />}
          </div>
        </div>
      )}

      {tab === "prep" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {PREP_PACKS.map((pk) => (
            <Card key={pk.key} className="p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-serif text-xl">{pk.label}</h2>
                <span className="text-sm text-muted" dir="rtl">
                  {pk.labelAr}
                </span>
              </div>
              <div className="mt-3 grid gap-3 text-xs md:grid-cols-2">
                <div>
                  <div className="eyebrow mb-1">What they test</div>
                  <ul className="list-disc space-y-0.5 ps-4 text-ink-2">{pk.whatTheyTest.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
                <div>
                  <div className="eyebrow mb-1">Your evidence</div>
                  <ul className="list-disc space-y-0.5 ps-4 text-ink-2">{pk.yourEvidence.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              </div>
              <div className="mt-3 text-xs">
                <div className="eyebrow mb-1">Saudi law to revise (read the primary text)</div>
                <ul className="list-disc space-y-0.5 ps-4 text-ink-2">{pk.saudiLawToRevise.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
              <div className="mt-3 text-xs">
                <div className="eyebrow mb-1">Practice questions</div>
                <ol className="list-decimal space-y-1 ps-4">{pk.questions.map((x) => <li key={x}>{x}</li>)}</ol>
              </div>
            </Card>
          ))}
          <p className="text-xs text-muted lg:col-span-2">
            Laws listed are study prompts — always verify the current text on the official laws portals (laws.moj.gov.sa, laws.boe.gov.sa) before relying on them. For role-specific questions with model answers, open any vacancy and use Apply Smarter.
          </p>
        </div>
      )}

      {tab === "packs" && (
        <Card>
          <CardHeader eyebrow="History" title="Apply Smarter packs you have generated" />
          <ul className="divide-y divide-line text-sm">
            {packs.length === 0 && <li className="px-5 py-4 text-muted">None yet. Open a vacancy and click “Prepare application pack”.</li>}
            {packs.map((pk) => (
              <li key={pk.subject_id} className="flex items-center justify-between px-5 py-3">
                <Link href={`/opportunities/${pk.subject_id}`} className="hover:text-gold">
                  {pk.title ?? pk.subject_id} <span className="text-muted">· {pk.employer}</span>
                </Link>
                <span className="text-xs text-muted">
                  {pk.engine === "template" ? "Template" : "AI"} · {fmtDate(pk.created_at, true)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
