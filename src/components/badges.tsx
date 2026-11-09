import { Badge } from "./ui";
import type { Verification } from "@/lib/types";
import { CheckCircle2, CircleDashed, History, XCircle, Newspaper, EyeOff } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  if (status === "open")
    return (
      <Badge tone="ok">
        <CheckCircle2 className="h-3 w-3" aria-hidden /> Open
      </Badge>
    );
  if (status === "closed")
    return (
      <Badge tone="neutral">
        <XCircle className="h-3 w-3" aria-hidden /> Closed
      </Badge>
    );
  return (
    <Badge tone="warn">
      <CircleDashed className="h-3 w-3" aria-hidden /> Unverified
    </Badge>
  );
}

export function VerificationBadge({ status }: { status: Verification | "unknown" }) {
  switch (status) {
    case "verified":
      return (
        <Badge tone="ok" title="Stated on the firm's own official page">
          <CheckCircle2 className="h-3 w-3" aria-hidden /> Verified
        </Badge>
      );
    case "historical":
      return (
        <Badge tone="info" title="True at a past date (closed intake, dated page)">
          <History className="h-3 w-3" aria-hidden /> Historical
        </Badge>
      );
    case "reported":
      return (
        <Badge tone="gold" title="Reported by press, directories or aggregators — not the firm itself">
          <Newspaper className="h-3 w-3" aria-hidden /> Reported
        </Badge>
      );
    default:
      return (
        <Badge tone="neutral" title="No public source found">
          <EyeOff className="h-3 w-3" aria-hidden /> Not publicly disclosed
        </Badge>
      );
  }
}

export function ScoreRing({ score, size = 44 }: { score: number | null; size?: number }) {
  const s = score ?? 0;
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const color = s >= 75 ? "var(--ok)" : s >= 55 ? "var(--gold)" : s >= 35 ? "var(--warn)" : "var(--muted)";
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`Match score ${score ?? "not computed"} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--line)" strokeWidth="3" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="3" fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - s / 100)} strokeLinecap="round" />
      </svg>
      <span className="absolute font-serif text-sm tabular-nums text-ink">{score ?? "—"}</span>
    </div>
  );
}
