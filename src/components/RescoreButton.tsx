"use client";
import { useTransition } from "react";
import { rescoreNow } from "@/app/actions";
import { Button } from "./ui";

export function RescoreButton() {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" disabled={pending} onClick={() => start(async () => void (await rescoreNow()))}>
      {pending ? "Re-scoring…" : "Re-score all"}
    </Button>
  );
}
