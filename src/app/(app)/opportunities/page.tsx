import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { listJobs } from "@/lib/jobs";
import { toRowViews } from "@/lib/views";
import { q1 } from "@/lib/db";
import { JobTable } from "@/components/JobTable";
import { RunDiscoveryButton } from "@/components/RunDiscoveryButton";
import { Card, PageHeader, Input, Select, Button, EmptyState } from "@/components/ui";
import { CATEGORY_LABEL, KIND_LABEL, LICENSE_LABEL, fmtDate } from "@/lib/utils";
import { SEARCH_QUERIES_AR, SEARCH_QUERIES_EN } from "@/lib/taxonomy";
import { searchLinks } from "@/lib/searchLinks";

type SP = Promise<Record<string, string | undefined>>;

export default async function Opportunities({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const jobs = await listJobs({
    status: sp.status ?? "all",
    category: sp.category,
    kind: sp.kind,
    license: sp.license,
    q: sp.q,
    saved: sp.saved === "1",
    sort: (sp.sort as "match") ?? "match",
  });
  const rows = await toRowViews(jobs);
  const last = await q1<{ finished_at: Date }>("SELECT finished_at FROM discovery_runs WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1");
  const ext = sp.ext ?? "trainee lawyer";

  return (
    <>
      <PageHeader
        eyebrow="Live Opportunities"
        title="Verified legal vacancies — Riyadh"
        subtitle={<>Every listing shows its status (Open = confirmed on an official employer source; Unverified = seen elsewhere; Closed = expired or removed), its sources (deduplicated), and when it was last checked. Last discovery run: {fmtDate(last?.finished_at, true)}.</>}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/opportunities/new">
                <Plus className="h-4 w-4" /> Add a vacancy
              </Link>
            </Button>
            <RunDiscoveryButton />
          </>
        }
      />

      <Card className="mb-4 p-4">
        <form className="grid gap-3 md:grid-cols-[1.5fr_repeat(5,1fr)_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-2.5 h-4 w-4 text-muted" />
            <Input name="q" defaultValue={sp.q} placeholder="Search title, employer, description…" className="ps-9" />
          </div>
          <Select name="status" defaultValue={sp.status ?? "all"} aria-label="Status">
            <option value="all">All statuses</option>
            <option value="open">Open (verified)</option>
            <option value="unverified">Unverified</option>
            <option value="closed">Closed</option>
          </Select>
          <Select name="category" defaultValue={sp.category ?? "all"} aria-label="Employer type">
            <option value="all">All employers</option>
            <option value="law_firm">All law firms</option>
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select name="kind" defaultValue={sp.kind ?? "all"} aria-label="Role type">
            <option value="all">All role types</option>
            {Object.entries(KIND_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select name="license" defaultValue={sp.license ?? "all"} aria-label="Licence">
            <option value="all">Any licence requirement</option>
            {Object.entries(LICENSE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select name="sort" defaultValue={sp.sort ?? "match"} aria-label="Sort">
            <option value="match">Sort: best match</option>
            <option value="recent">Sort: newest</option>
            <option value="deadline">Sort: deadline</option>
          </Select>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-ink-2">
              <input type="checkbox" name="saved" value="1" defaultChecked={sp.saved === "1"} className="accent-[var(--gold)]" /> Saved
            </label>
            <Button type="submit" size="md">
              Filter
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-2">
        {rows.length ? <JobTable rows={rows} /> : <EmptyState title="No vacancies match these filters">Try widening the filters, run discovery, or add a vacancy you found manually.</EmptyState>}
      </Card>
      <p className="mt-2 text-xs text-muted">{rows.length} listings · Tick up to four rows to compare side by side.</p>

      <Card className="mt-8 p-5">
        <div className="eyebrow mb-1">Search beyond LEXHUNT</div>
        <h2 className="font-serif text-xl">Direct search links for platforms that cannot be queried automatically</h2>
        <p className="mt-1 text-sm text-ink-2">
          LinkedIn, Indeed, Bayt, GulfTalent, Naukrigulf and Jadarat do not permit scraping. LEXHUNT reaches them legitimately through the JSearch / SerpApi Google-for-Jobs integrations when configured; otherwise use these pre-built searches. Paste anything relevant back via <Link className="text-gold underline" href="/opportunities/new">Add a vacancy</Link>.
        </p>
        <form className="mt-4 flex flex-wrap gap-2">
          <Select name="ext" defaultValue={ext} className="max-w-xs">
            {[...SEARCH_QUERIES_EN, ...SEARCH_QUERIES_AR].map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
          <Button variant="outline" type="submit">
            Build links
          </Button>
        </form>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {searchLinks(ext).map((l) => (
            <a key={l.platform} href={l.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-line px-3 py-2 text-sm hover:border-gold">
              <div className="font-medium">{l.platform} ↗</div>
              {l.note && <div className="text-xs text-muted">{l.note}</div>}
            </a>
          ))}
        </div>
      </Card>
    </>
  );
}
