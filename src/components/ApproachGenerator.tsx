"use client";
import { useState } from "react";
import { Mail, Copy } from "lucide-react";
import type { ApproachOutput } from "@/lib/ai";
import { Button, Badge } from "./ui";

export function ApproachGenerator({ slug, initial, initialEngine, aiConfigured }: { slug: string; initial: ApproachOutput | null; initialEngine: string | null; aiConfigured: boolean }) {
  const [data, setData] = useState(initial);
  const [engine, setEngine] = useState(initialEngine);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div id="approach" className="card scroll-mt-20">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
        <div>
          <div className="eyebrow mb-1">Speculative approach</div>
          <h2 className="font-serif text-lg">Personalised expression-of-interest email</h2>
        </div>
        <div className="flex items-center gap-2">
          {engine && <Badge tone={engine === "template" ? "warn" : "gold"}>{engine === "template" ? "Template" : "AI"}</Badge>}
          <Button
            size="sm"
            variant="gold"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              setErr(null);
              try {
                const r = await fetch("/api/ai/approach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) });
                const b = await r.json();
                if (!r.ok) throw new Error(b.error);
                setData(b.output);
                setEngine(b.engine);
              } catch (e) {
                setErr((e as Error).message);
              } finally {
                setLoading(false);
              }
            }}
          >
            <Mail className="h-4 w-4" /> {loading ? "Drafting…" : data ? "Redraft" : "Draft email"}
          </Button>
        </div>
      </div>
      <div className="space-y-3 p-5 text-sm">
        <p className="text-xs text-muted">This is a speculative approach, not a response to an advertised vacancy. LEXHUNT never sends it — copy, review and send it yourself.{!aiConfigured && " (AI not configured: a template built from your profile is used.)"}</p>
        {err && <p className="text-bad">{err}</p>}
        {data && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-muted">Subject:</span> {data.subject}
              </div>
              <button type="button" onClick={() => navigator.clipboard.writeText(`Subject: ${data.subject}\n\n${data.body}`)} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs">
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <div className="prose-letter rounded-lg border border-line bg-surface-2/40 p-4">{data.body}</div>
            <p className="text-xs">
              <span className="font-medium">Angle:</span> {data.angle}
            </p>
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Follow-up message (10 working days later)</summary>
              <p className="prose-letter mt-2">{data.followUp}</p>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
