import Link from "next/link";
import { listJobs } from "@/lib/jobs";
import { getProfile } from "@/lib/profile";
import { Card, PageHeader, Badge, EmptyState, Button } from "@/components/ui";
import { ScoreRing, StatusBadge } from "@/components/badges";
import { PRACTICE_AREAS } from "@/lib/taxonomy";
import { RescoreButton } from "@/components/RescoreButton";

export default async function Matches() {
  const profile = await getProfile();
  const all = (await listJobs({ sort: "match" })).filter((j) => j.status !== "closed");
  const eligible = all.filter((j) => (j.match_detail?.criteria[0]?.score ?? 1) > 0).sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));
  const ineligible = all.filter((j) => (j.match_detail?.criteria[0]?.score ?? 1) === 0);
  const unknowns = [
    profile.saudiNational === null && "Saudi nationality",
    profile.licenseStatus === "unknown" && "MoJ trainee / licence status",
    !profile.education[0]?.institution && "university & graduation year",
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        eyebrow="My Matches"
        title="Opportunities ranked against your experience"
        subtitle="Scores combine eight transparent criteria (eligibility 20, practice area 20, experience 15, Addleshaw Goddard similarity 15, skills 10, language 8, location 7, graduate accessibility 5). They measure qualification alignment — not your chance of an offer."
        actions={<RescoreButton />}
      />
      {unknowns.length > 0 && (
        <div className="mb-6 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          Your profile is missing: <strong>{unknowns.join(", ")}</strong>. Eligibility scoring is conservative until you add these.{" "}
          <Link href="/studio?tab=profile" className="underline">
            Complete profile
          </Link>
        </div>
      )}
      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        <span className="text-muted">Your strengths used for matching:</span>
        {profile.practiceStrengths.map((p) => (
          <Badge key={p} tone="gold">
            {PRACTICE_AREAS[p]?.label ?? p}
          </Badge>
        ))}
      </div>

      {eligible.length === 0 ? (
        <EmptyState title="No eligible matches yet">Run discovery or add vacancies manually.</EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {eligible.map((j) => (
            <Card key={j.id} className="fade-in p-5">
              <div className="flex items-start gap-4">
                <ScoreRing score={j.match_score} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={j.status} />
                  </div>
                  <Link href={`/opportunities/${j.id}`} className="mt-1 block font-serif text-lg leading-snug hover:text-gold">
                    {j.title}
                  </Link>
                  <div className="text-xs text-ink-2">
                    {j.employer} · {j.location}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <div className="eyebrow mb-1">Why you fit</div>
                  <ul className="list-disc space-y-0.5 ps-4 text-ink-2">{(j.match_detail?.strengths ?? []).slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
                <div>
                  <div className="eyebrow mb-1">Watch out</div>
                  <ul className="list-disc space-y-0.5 ps-4 text-ink-2">{[...(j.match_detail?.gaps ?? []), ...(j.match_detail?.flags ?? [])].slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              </div>
              <p className="mt-3 border-t border-line pt-3 text-xs text-ink-2">
                <span className="font-medium text-ink">Next step:</span> {j.match_detail?.strategy}
              </p>
              <div className="mt-3 flex gap-2">
                <Button asChild size="sm">
                  <Link href={`/opportunities/${j.id}`}>Apply Smarter</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {ineligible.length > 0 && (
        <Card className="mt-8 p-5">
          <div className="eyebrow mb-1">Signals, not targets</div>
          <h2 className="font-serif text-lg">Listings you are not eligible for ({ineligible.length})</h2>
          <p className="mt-1 text-sm text-ink-2">Typically student-only co-op schemes. They show which firms invest in Saudi junior talent — approach them about graduate intakes instead.</p>
          <ul className="mt-3 divide-y divide-line text-sm">
            {ineligible.map((j) => (
              <li key={j.id} className="flex items-center justify-between py-2">
                <Link href={`/opportunities/${j.id}`} className="hover:text-gold">
                  {j.employer} — {j.title}
                </Link>
                <span className="text-xs text-muted">{j.match_detail?.criteria[0]?.reason}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
