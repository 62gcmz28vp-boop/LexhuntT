import Link from "next/link";
import { q } from "@/lib/db";
import type { JobRow } from "@/lib/types";
import { FIRMS } from "@/data/firms";
import { MARKET_FINDINGS } from "@/data/market";
import { PRACTICE_AREAS } from "@/lib/taxonomy";
import { Card, CardHeader, PageHeader, Badge } from "@/components/ui";
import { BarList } from "@/components/BarList";
import { LICENSE_LABEL, fmtDate } from "@/lib/utils";

const SKILLS: [string, RegExp][] = [
  ["Arabic", /arabic|عربي/i],
  ["English", /english|إنجليزي|انجليزي/i],
  ["Legal research", /research|بحث/i],
  ["Drafting", /draft|صياغة/i],
  ["Contract review", /contract|عقود/i],
  ["Due diligence", /due diligence|عناية واجبة/i],
  ["Litigation / disputes", /litigation|dispute|تقاضي|نزاع/i],
  ["Compliance / regulatory", /compliance|regulat|امتثال/i],
  ["Corporate / M&A", /corporate|m&a|merger|acquisition|شركات/i],
  ["Construction / projects", /construction|fidic|project|مشاريع/i],
];

export default async function Intelligence() {
  const jobs = await q<JobRow>("SELECT * FROM jobs WHERE dismissed = false");
  const live = jobs.filter((j) => j.status !== "closed");
  const n = live.length;

  const practice = Object.entries(PRACTICE_AREAS)
    .map(([k, v]) => ({ label: v.label, value: live.filter((j) => j.practice_areas.includes(k)).length }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const licence = Object.entries(LICENSE_LABEL)
    .map(([k, v]) => ({ label: v, value: live.filter((j) => j.license_req === k).length }))
    .filter((d) => d.value > 0);
  const skills = SKILLS.map(([label, re]) => ({ label, value: live.filter((j) => re.test(`${j.title} ${j.description ?? ""}`)).length }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const nationality = live.filter((j) => j.nationality_req).length;
  const studentOnly = live.filter((j) => j.job_kind === "co_op").length;

  const recruiting = FIRMS.filter((f) => ["confirmed_vacancy", "programme_listed"].includes(f.hiringStatus) || live.some((j) => j.employer_slug === f.slug));
  const intl = FIRMS.filter((f) => f.classification === "international" || f.classification === "international_affiliate");
  const saudi = FIRMS.filter((f) => f.classification === "saudi" || f.classification === "boutique");
  const withGradInfo = (arr: typeof FIRMS) => arr.filter((f) => f.graduateRecruitment.length > 0).length;
  const withCoop = (arr: typeof FIRMS) => arr.filter((f) => f.graduateRecruitment.some((g) => /co-?op|internship|cooperative/i.test(g.text))).length;
  const withCareers = (arr: typeof FIRMS) => arr.filter((f) => f.careersUrl).length;

  return (
    <>
      <PageHeader
        eyebrow="Legal Recruitment Market Intelligence"
        title="What the Riyadh graduate legal market looks like"
        subtitle={`Charts are computed from the ${n} non-closed opportunities and ${FIRMS.length} firm profiles LEXHUNT currently holds — a sample, not the whole market. Narrative findings cite their sources.`}
      />
      {n < 30 && <div className="mb-6 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">Small sample ({n} opportunities). Treat distributions as indicative only; they become meaningful after several weeks of scheduled discovery.</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader eyebrow={`n = ${n}`} title="Practice areas in recorded openings" />
          <div className="p-5">
            <BarList data={practice} />
          </div>
        </Card>
        <Card>
          <CardHeader eyebrow={`n = ${n}`} title="Frequently requested skills" />
          <div className="p-5">
            <BarList data={skills} />
          </div>
        </Card>
        <Card>
          <CardHeader eyebrow={`n = ${n}`} title="Licence requirements" />
          <div className="space-y-3 p-5">
            <BarList data={licence} />
            <p className="text-xs text-ink-2">
              {nationality} of {n} state a Saudi-nationality requirement · {studentOnly} are student-only co-op schemes.
            </p>
          </div>
        </Card>
        <Card>
          <CardHeader eyebrow="From Firm Radar" title="Who is actively recruiting" />
          <ul className="divide-y divide-line text-sm">
            {recruiting.map((f) => (
              <li key={f.slug} className="flex items-center justify-between px-5 py-2">
                <Link href={`/radar/${f.slug}`} className="hover:text-gold">
                  {f.name}
                </Link>
                <Badge tone={f.hiringStatus === "confirmed_vacancy" ? "ok" : "gold"}>{f.hiringStatus.replace(/_/g, " ")}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader eyebrow="Comparison" title="International vs Saudi firms — graduate recruitment (from Firm Radar)" />
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-start text-xs text-muted">
                <th className="py-2 text-start font-medium">Measure</th>
                <th className="py-2 text-start font-medium">International & affiliates ({intl.length})</th>
                <th className="py-2 text-start font-medium">Saudi & boutiques ({saudi.length})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr>
                <td className="py-2 text-ink-2">Publish graduate-recruitment information</td>
                <td>{withGradInfo(intl)}</td>
                <td>{withGradInfo(saudi)}</td>
              </tr>
              <tr>
                <td className="py-2 text-ink-2">Run a published co-op / internship scheme</td>
                <td>{withCoop(intl)}</td>
                <td>{withCoop(saudi)}</td>
              </tr>
              <tr>
                <td className="py-2 text-ink-2">Have a careers page on file (monitored)</td>
                <td>{withCareers(intl)}</td>
                <td>{withCareers(saudi)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">Reading: international firms formalise graduate recruitment (co-op → trainee pipelines, published eligibility). Saudi firms more often recruit via direct posts, referrals and Arabic job channels — so absence of a page is not absence of hiring.</p>
        </div>
      </Card>

      <h2 className="mb-3 mt-10 font-serif text-2xl">Attributable findings</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {MARKET_FINDINGS.map((m) => (
          <Card key={m.title} className="p-5">
            <div className="flex items-center gap-2">
              <Badge tone="gold">{m.topic.replace("_", " ")}</Badge>
              <span className="text-xs text-muted">{m.date}</span>
            </div>
            <h3 className="mt-2 font-serif text-lg leading-snug">{m.title}</h3>
            <p className="mt-2 text-sm text-ink-2">{m.detail}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {m.sources.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                  {s.label} ↗
                </a>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">Research date for narrative findings: {fmtDate(FIRMS[0].lastResearched)}.</p>
    </>
  );
}
