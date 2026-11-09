"use client";
import { useState, useTransition } from "react";
import type { CvExtraction } from "@/lib/ai";
import { applyCvExtraction } from "@/app/actions";
import { Button, Badge } from "./ui";

export function CvExtractor({ hasText, aiConfigured, textPreview }: { hasText: boolean; aiConfigured: boolean; textPreview: string }) {
  const [data, setData] = useState<CvExtraction | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="card">
      <div className="border-b border-line px-5 py-4">
        <div className="eyebrow mb-1">Extract & verify</div>
        <h2 className="font-serif text-lg">Update profile from CV</h2>
      </div>
      <div className="space-y-3 p-5 text-sm">
        {!hasText && <p className="text-warn">No text could be extracted from this file (scanned PDF?). Upload a text-based PDF or DOCX.</p>}
        {hasText && !aiConfigured && (
          <>
            <p className="text-xs text-warn">AI extraction needs ANTHROPIC_API_KEY. Meanwhile, compare the extracted text below with your profile and edit the form manually.</p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-[11px]">{textPreview}</pre>
          </>
        )}
        {hasText && aiConfigured && (
          <Button
            size="sm"
            variant="gold"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setErr(null);
              try {
                const r = await fetch("/api/ai/cv-extract", { method: "POST" });
                const b = await r.json();
                if (!r.ok) throw new Error(b.error);
                setData(b.output);
              } catch (e) {
                setErr((e as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? "Reading CV…" : "Extract with AI"}
          </Button>
        )}
        {err && <p className="text-bad">{err}</p>}
        {data && (
          <div className="space-y-3 text-xs">
            <p className="text-muted">Review before applying. Each item quotes its evidence from the CV. Nothing changes until you click Apply.</p>
            <div>
              <strong>Name:</strong> {data.fullName ?? "—"}
            </div>
            {data.education.map((e, i) => (
              <div key={i} className="rounded border border-line p-2">
                <strong>{e.degree ?? "Degree ?"}</strong> — {e.institution ?? "?"} {e.year ?? ""} {e.grade ?? ""}
                <div className="mt-1 italic text-muted">“{e.evidence}”</div>
              </div>
            ))}
            {data.experience.map((e, i) => (
              <div key={i} className="rounded border border-line p-2">
                <strong>
                  {e.role} · {e.organisation}
                </strong>{" "}
                {e.start ?? ""}–{e.end ?? ""}
                <ul className="mt-1 list-disc ps-4">{e.bullets.map((b, j) => <li key={j}>{b}</li>)}</ul>
              </div>
            ))}
            {data.discrepancies.length > 0 && (
              <div className="rounded bg-warn-soft p-2 text-warn">
                <strong>Discrepancies with current profile:</strong>
                <ul className="list-disc ps-4">{data.discrepancies.map((d, i) => <li key={i}>{d}</li>)}</ul>
              </div>
            )}
            {applied ? (
              <Badge tone="ok">Applied — profile updated and matches re-scored</Badge>
            ) : (
              <Button size="sm" disabled={pending} onClick={() => start(async () => { await applyCvExtraction(JSON.stringify(data)); setApplied(true); })}>
                Apply to profile
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
