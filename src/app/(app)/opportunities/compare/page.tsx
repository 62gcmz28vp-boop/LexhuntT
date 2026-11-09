import Link from "next/link";
import { q } from "@/lib/db";
import type { JobRow } from "@/lib/types";
import { Card, PageHeader } from "@/components/ui";
import { StatusBadge, ScoreRing } from "@/components/badges";
import { CATEGORY_LABEL, KIND_LABEL, LICENSE_LABEL, expLabel, fmtDate } from "@/lib/utils";

export default async function Compare({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const ids = ((await searchParams).ids ?? "").split(",").filter(Boolean).slice(0, 4);
  const jobs = ids.length ? await q<JobRow>("SELECT * FROM jobs WHERE id = ANY($1::text[])", [ids]) : [];
  const rows: [string, (j: JobRow) => React.ReactNode][] = [
    ["Match", (j) => <ScoreRing score={j.match_score} />],
    ["Status", (j) => <StatusBadge status={j.status} />],
    ["Employer", (j) => j.employer],
    ["Type", (j) => `${CATEGORY_LABEL[j.category]} · ${KIND_LABEL[j.job_kind]}`],
    ["Location", (j) => `${j.location ?? "—"} (${j.work_mode})`],
    ["Experience", (j) => expLabel(j.experience_min, j.experience_max)],
    ["Licence", (j) => LICENSE_LABEL[j.license_req]],
    ["Nationality", (j) => j.nationality_req ?? "Not stated"],
    ["Salary", (j) => j.salary ?? "Not disclosed"],
    ["Deadline", (j) => fmtDate(j.deadline)],
    ["Strengths", (j) => <ul className="list-disc ps-4">{j.match_detail?.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>],
    ["Gaps", (j) => <ul className="list-disc ps-4">{[...(j.match_detail?.gaps ?? []), ...(j.match_detail?.flags ?? [])].map((s, i) => <li key={i}>{s}</li>)}</ul>],
    ["Strategy", (j) => j.match_detail?.strategy],
  ];
  return (
    <>
      <PageHeader eyebrow="Live Opportunities" title="Compare opportunities" />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="w-32" />
              {jobs.map((j) => (
                <th key={j.id} className="px-4 py-3 text-start align-top">
                  <Link href={`/opportunities/${j.id}`} className="font-serif text-base hover:text-gold">
                    {j.title}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => (
              <tr key={label} className="border-b border-line/70 align-top">
                <td className="px-4 py-3 text-xs text-muted">{label}</td>
                {jobs.map((j) => (
                  <td key={j.id} className="px-4 py-3 text-xs text-ink-2">
                    {fn(j)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
