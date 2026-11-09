"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, KanbanSquare } from "lucide-react";
import { toggleSaved, createApplication, verifyJobStatus } from "@/app/actions";
import { Button, Select, Input } from "./ui";

export function JobActions({ jobId, saved, title, employer, deadline, appId }: { jobId: string; saved: boolean; title: string; employer: string; deadline: string | null; appId: number | null }) {
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="outline" disabled={pending} onClick={() => start(() => toggleSaved(jobId))}>
        {saved ? <BookmarkCheck className="h-4 w-4 text-gold" /> : <Bookmark className="h-4 w-4" />} {saved ? "Saved" : "Save"}
      </Button>
      {appId ? (
        <Button asChild variant="outline">
          <Link href={`/pipeline?app=${appId}`}>
            <KanbanSquare className="h-4 w-4" /> In pipeline
          </Link>
        </Button>
      ) : (
        <Button variant="outline" disabled={pending} onClick={() => start(() => createApplication({ jobId, title, employer, deadline }))}>
          <KanbanSquare className="h-4 w-4" /> Track in pipeline
        </Button>
      )}
    </>
  );
}

export function VerifyForm({ jobId }: { jobId: string }) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<"open" | "closed" | "unverified">("open");
  const [note, setNote] = useState("");
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(() => verifyJobStatus(jobId, status, note));
      }}
    >
      <div className="text-xs font-medium text-ink-2">I checked the official source myself</div>
      <div className="flex gap-2">
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="New status" className="w-36">
          <option value="open">Confirmed open</option>
          <option value="closed">Closed</option>
          <option value="unverified">Unverified</option>
        </Select>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (e.g. seen on firm portal today)" />
      </div>
      <Button size="sm" type="submit" disabled={pending}>
        Record verification
      </Button>
    </form>
  );
}
