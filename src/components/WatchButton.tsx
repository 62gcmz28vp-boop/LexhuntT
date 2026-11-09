"use client";
import { useTransition } from "react";
import { Star } from "lucide-react";
import { toggleWatch } from "@/app/actions";
import { cn } from "@/lib/utils";

export function WatchButton({ slug, watching, label = false }: { slug: string; watching: boolean; label?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => toggleWatch(slug))}
      aria-pressed={watching}
      aria-label={watching ? "Remove from watchlist" : "Add to watchlist"}
      className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs", watching ? "border-gold bg-gold-soft text-gold-strong" : "border-line text-ink-2 hover:bg-surface-2")}
    >
      <Star className={cn("h-3.5 w-3.5", watching && "fill-current")} />
      {label && (watching ? "Watching" : "Watch")}
    </button>
  );
}
