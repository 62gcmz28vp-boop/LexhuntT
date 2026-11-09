import { NextResponse } from "next/server";
import { q1 } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await q1<{ filename: string; mime: string; content_b64: string }>("SELECT filename, mime, content_b64 FROM documents WHERE id = $1", [Number(id)]);
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(Buffer.from(doc.content_b64, "base64"), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.filename)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
