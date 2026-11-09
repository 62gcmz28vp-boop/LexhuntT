"use client";
import { useState, useTransition } from "react";
import { checkFirmPageNow } from "@/app/actions";
import { Button } from "./ui";

export function CheckPageButton({ slug }: { slug: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => {
        try {
          const r = await checkFirmPageNow(slug);
          setMsg(`${r.status}: ${r.detail}`);
        } catch (e) {
          setMsg((e as Error).message);
        }
      })}>
        {pending ? "Checking…" : "Check page now"}
      </Button>
      {msg && <p className="mt-1 text-xs text-muted">{msg}</p>}
    </div>
  );
}
