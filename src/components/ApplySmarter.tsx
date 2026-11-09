"use client";

import { useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import type { ApplySmarterOutput } from "@/lib/ai";
import { Button, Badge } from "./ui";
import { cn } from "@/lib/utils";

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink-2 hover:bg-surface-2"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setOk(true);
        setTimeout(() => setOk(false), 1500);
      }}
    >
      {ok ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {ok ? "Copied" : "Copy"}
    </button>
  );
}

const TABS = ["Analysis", "CV", "Cover letter", "Email", "Interview", "Firm", "Checklist"] as const;

export function ApplySmarter({ jobId, initial, initialEngine, aiConfigured }: { jobId: string; initial: ApplySmarterOutput | null; initialEngine: string | null; aiConfigured: boolean }) {
  const [data, setData] = useState(initial);
  const [engine, setEngine] = useState(initialEngine);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Analysis");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/ai/apply-smarter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setData(body.output);
      setEngine(body.engine);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-navy px-5 py-4 text-[#f6f2e8]">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#d6b468]">Application Studio</div>
          <div className="font-serif text-xl">Apply Smarter</div>
        </div>
        <div className="flex items-center gap-2">
          {engine && <Badge tone={engine === "template" ? "warn" : "gold"}>{engine === "template" ? "Template (AI not configured)" : `AI · ${engine}`}</Badge>}
          <Button variant="gold" onClick={run} disabled={loading}>
            <Sparkles className={cn("h-4 w-4", loading && "animate-pulse")} />
            {loading ? "Preparing your pack… (up to a minute)" : data ? "Regenerate" : "Prepare application pack"}
          </Button>
        </div>
      </div>
      {!aiConfigured && !data && <p className="px-5 pt-4 text-xs text-warn">ANTHROPIC_API_KEY is not set — a deterministic template built only from your profile will be produced instead of an AI-tailored pack.</p>}
      {err && <p className="px-5 pt-4 text-sm text-bad">{err}</p>}
      {!data ? (
        <div className="px-5 py-8 text-sm text-ink-2">
          Analyses this job description against your verified CV and produces: CV improvements, a tailored cover letter, a recruitment email, experience to emphasise, the firm&apos;s practice areas and criteria, likely interview questions with model answers grounded in your real experience, and a submission checklist.
          <div className="mt-2 text-xs text-muted">Nothing is ever sent to an employer. You review, edit and send everything yourself.</div>
        </div>
      ) : (
        <div>
          <div className="flex gap-1 overflow-x-auto border-b border-line px-3">
            {TABS.map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={cn("whitespace-nowrap border-b-2 px-3 py-2.5 text-sm", tab === t ? "border-gold text-ink" : "border-transparent text-muted hover:text-ink")}>
                {t}
              </button>
            ))}
          </div>
          <div className="space-y-4 p-5 text-sm">
            {tab === "Analysis" && (
              <>
                <p className="leading-relaxed">{data.roleAnalysis}</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-start text-muted">
                      <th className="py-1 text-start">Requirement</th>
                      <th className="py-1 text-start">Your evidence</th>
                      <th className="py-1 text-start">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.requirements.map((r, i) => (
                      <tr key={i} className="border-t border-line align-top">
                        <td className="py-2 pe-3 font-medium">{r.requirement}</td>
                        <td className="py-2 pe-3 text-ink-2">{r.evidence}</td>
                        <td className="py-2">
                          <Badge tone={r.status === "met" ? "ok" : r.status === "partial" ? "gold" : r.status === "gap" ? "bad" : "neutral"}>{r.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div>
                  <div className="eyebrow mb-1">Emphasise</div>
                  <ul className="list-disc space-y-1 ps-5">{data.emphasise.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
                {data.integrityNotes.length > 0 && (
                  <div className="rounded-lg bg-warn-soft p-3 text-xs text-warn">
                    <strong>Before you send:</strong>
                    <ul className="mt-1 list-disc ps-4">{data.integrityNotes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                  </div>
                )}
              </>
            )}
            {tab === "CV" && <ul className="list-disc space-y-2 ps-5">{data.cvImprovements.map((c, i) => <li key={i}>{c}</li>)}</ul>}
            {tab === "Cover letter" && (
              <>
                <div className="flex justify-end">
                  <CopyBtn text={data.coverLetter} />
                </div>
                <div className="prose-letter rounded-lg border border-line bg-surface-2/40 p-5">{data.coverLetter}</div>
              </>
            )}
            {tab === "Email" && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-muted">Subject:</span> {data.recruitmentEmail.subject}
                  </div>
                  <CopyBtn text={`Subject: ${data.recruitmentEmail.subject}\n\n${data.recruitmentEmail.body}`} />
                </div>
                <div className="prose-letter rounded-lg border border-line bg-surface-2/40 p-5">{data.recruitmentEmail.body}</div>
              </>
            )}
            {tab === "Interview" &&
              data.interviewQuestions.map((qa, i) => (
                <details key={i} className="rounded-lg border border-line p-3" open={i === 0}>
                  <summary className="cursor-pointer font-medium">{qa.question}</summary>
                  <p className="mt-2 text-xs text-muted">Why they ask: {qa.whyTheyAsk}</p>
                  <p className="mt-2 leading-relaxed">{qa.modelAnswer}</p>
                </details>
              ))}
            {tab === "Firm" && <p className="leading-relaxed whitespace-pre-wrap">{data.firmBrief}</p>}
            {tab === "Checklist" && (
              <ul className="space-y-2">
                {data.checklist.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1 accent-[var(--gold)]" aria-label={c} /> <span>{c}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
