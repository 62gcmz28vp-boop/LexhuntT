"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, EyeOff, GitCompare } from "lucide-react";
import { toggleSaved, dismissJob } from "@/app/actions";
import { cn } from "@/lib/utils";

export interface JobRowView {
  id: string;
  title: string;
  employer: string;
  employerSlug: string | null;
  category: string;
  kindLabel: string;
  location: string;
  workMode: string;
  experience: string;
  salary: string | null;
  posted: string;
  deadline: string;
  deadlineSoon: boolean;
  status: string;
  license: string;
  licenseTone: "ok" | "warn" | "bad" | "neutral";
  score: number | null;
  applyUrl: string | null;
  sourceLabel: string;
  sourceCount: number;
  isNew: boolean;
  saved: boolean;
  lastSeen: string;
}

const statusCls: Record<string, string> = { open: "bg-ok-soft text-ok", closed: "bg-surface-2 text-muted", unverified: "bg-warn-soft text-warn" };
const toneCls = { ok: "text-ok", warn: "text-warn", bad: "text-bad", neutral: "text-muted" };

function Score({ s }: { s: number | null }) {
  const color = s == null ? "text-muted" : s >= 75 ? "text-ok" : s >= 55 ? "text-gold" : s >= 35 ? "text-warn" : "text-muted";
  return <span className={cn("font-serif text-lg tabular-nums", color)}>{s ?? "—"}</span>;
}

export function JobTable({ rows, compact = false }: { rows: JobRowView[]; compact?: boolean }) {
  const [sel, setSel] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 4 ? s : [...s, id]));

  return (
    <div className="relative">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-start text-[11px] uppercase tracking-wider text-muted">
              {!compact && <th className="w-8 px-3 py-2" aria-label="Compare" />}
              <th className="px-3 py-2 text-start font-medium">Match</th>
              <th className="px-3 py-2 text-start font-medium">Position</th>
              <th className="px-3 py-2 text-start font-medium">Location</th>
              <th className="px-3 py-2 text-start font-medium">Experience</th>
              {!compact && <th className="px-3 py-2 text-start font-medium">Salary</th>}
              <th className="px-3 py-2 text-start font-medium">Posted</th>
              <th className="px-3 py-2 text-start font-medium">Deadline</th>
              <th className="px-3 py-2 text-start font-medium">Status</th>
              {!compact && <th className="px-3 py-2 text-start font-medium">Source</th>}
              <th className="px-3 py-2 text-end font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={cn("border-b border-line/70 align-top transition-colors hover:bg-surface-2/60", r.status === "closed" && "opacity-60")}>
                {!compact && (
                  <td className="px-3 py-3">
                    <input type="checkbox" aria-label={`Compare ${r.title}`} checked={sel.includes(r.id)} onChange={() => toggle(r.id)} className="accent-[var(--gold)]" />
                  </td>
                )}
                <td className="px-3 py-3">
                  <Score s={r.score} />
                </td>
                <td className="max-w-[340px] px-3 py-3">
                  <Link href={`/opportunities/${r.id}`} className="font-medium text-ink hover:text-gold">
                    {r.title}
                  </Link>
                  {r.isNew && <span className="ms-2 rounded bg-gold px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">New</span>}
                  <div className="mt-0.5 text-xs text-ink-2">
                    {r.employerSlug ? (
                      <Link href={`/radar/${r.employerSlug}`} className="hover:underline">
                        {r.employer}
                      </Link>
                    ) : (
                      r.employer
                    )}{" "}
                    · <span className="text-muted">{r.kindLabel}</span>
                  </div>
                  <div className={cn("mt-0.5 text-[11px]", toneCls[r.licenseTone])}>{r.license}</div>
                </td>
                <td className="px-3 py-3 text-ink-2">
                  {r.location}
                  {r.workMode !== "unknown" && <div className="text-[11px] capitalize text-muted">{r.workMode}</div>}
                </td>
                <td className="px-3 py-3 text-ink-2">{r.experience}</td>
                {!compact && <td className="px-3 py-3 text-ink-2">{r.salary ?? <span className="text-muted">Not disclosed</span>}</td>}
                <td className="px-3 py-3 text-ink-2">{r.posted}</td>
                <td className={cn("px-3 py-3", r.deadlineSoon ? "font-medium text-bad" : "text-ink-2")}>{r.deadline}</td>
                <td className="px-3 py-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", statusCls[r.status])}>{r.status}</span>
                  <div className="mt-1 text-[10px] text-muted">checked {r.lastSeen}</div>
                </td>
                {!compact && (
                  <td className="px-3 py-3 text-xs text-ink-2">
                    {r.sourceLabel}
                    {r.sourceCount > 1 && <div className="text-[10px] text-muted">+{r.sourceCount - 1} more (deduplicated)</div>}
                  </td>
                )}
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-1">
                    <button type="button" disabled={pending} onClick={() => start(() => toggleSaved(r.id))} aria-label={r.saved ? "Unsave" : "Save"} className="rounded-md p-1.5 text-ink-2 hover:bg-surface-2">
                      {r.saved ? <BookmarkCheck className="h-4 w-4 text-gold" /> : <Bookmark className="h-4 w-4" />}
                    </button>
                    {r.applyUrl && (
                      <a href={r.applyUrl} target="_blank" rel="noopener noreferrer" aria-label="Open application link" className="rounded-md p-1.5 text-ink-2 hover:bg-surface-2">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {!compact && (
                      <button type="button" disabled={pending} onClick={() => start(() => dismissJob(r.id))} aria-label="Hide" className="rounded-md p-1.5 text-muted hover:bg-surface-2">
                        <EyeOff className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className={cn("rounded-xl border border-line bg-surface p-4", r.status === "closed" && "opacity-60")}>
            <div className="flex items-start gap-3">
              <Score s={r.score} />
              <div className="min-w-0 flex-1">
                <Link href={`/opportunities/${r.id}`} className="font-medium text-ink">
                  {r.title}
                </Link>
                <div className="text-xs text-ink-2">{r.employer}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className={cn("rounded-full px-2 py-0.5 capitalize", statusCls[r.status])}>{r.status}</span>
                  <span className="text-muted">{r.location}</span>
                  <span className="text-muted">{r.experience}</span>
                  <span className={toneCls[r.licenseTone]}>{r.license}</span>
                  {r.deadline !== "—" && <span className={r.deadlineSoon ? "text-bad" : "text-muted"}>Deadline {r.deadline}</span>}
                </div>
              </div>
              <button type="button" onClick={() => start(() => toggleSaved(r.id))} aria-label="Save" className="p-1 text-ink-2">
                {r.saved ? <BookmarkCheck className="h-4 w-4 text-gold" /> : <Bookmark className="h-4 w-4" />}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {sel.length > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto mt-4 flex w-fit items-center gap-3 rounded-full border border-line bg-navy px-4 py-2 text-sm text-[#f6f2e8] shadow-lg">
          <GitCompare className="h-4 w-4 text-[#d6b468]" />
          {sel.length} selected (max 4)
          <Link href={`/opportunities/compare?ids=${sel.join(",")}`} className="rounded-full bg-[#d6b468] px-3 py-1 text-xs font-semibold text-[#0f1b2d]">
            Compare
          </Link>
          <button type="button" className="text-xs text-[#c9cfdb]" onClick={() => setSel([])}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
