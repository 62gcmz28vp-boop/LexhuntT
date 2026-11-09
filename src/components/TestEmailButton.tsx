"use client";
import { useState, useTransition } from "react";
import { sendTestEmail } from "@/app/actions";
import { Button } from "./ui";

export function TestEmailButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => setMsg((await sendTestEmail()).detail))}>
        {pending ? "Sending…" : "Send test email"}
      </Button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </div>
  );
}
