"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { runDiscoveryNow } from "@/app/actions";
import { Button } from "./ui";

export function RunDiscoveryButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="gold"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            try {
              const r = await runDiscoveryNow();
              setMsg(`${r.newJobs} new · ${r.updated} updated · ${r.closed} closed`);
            } catch (e) {
              setMsg(`Run failed: ${(e as Error).message}`);
            }
          })
        }
      >
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Searching sources…" : "Run discovery now"}
      </Button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </div>
  );
}
