"use client";
import { useTransition } from "react";
import { setStage } from "@/app/actions";
import { STAGES } from "@/lib/stages";
import { Select } from "./ui";

export function StageSelect({ appId, stage }: { appId: number; stage: string }) {
  const [pending, start] = useTransition();
  return (
    <Select aria-label="Stage" value={stage} disabled={pending} onChange={(e) => start(() => setStage(appId, e.target.value))} className="w-48">
      {STAGES.map((s) => (
        <option key={s.key} value={s.key}>
          {s.label}
        </option>
      ))}
    </Select>
  );
}
