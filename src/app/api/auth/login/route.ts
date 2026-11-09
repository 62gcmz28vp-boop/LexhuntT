import { NextResponse, type NextRequest } from "next/server";
import { createSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { checkPassword } from "@/lib/password";

export const runtime = "nodejs";

// Simple in-memory throttle (per instance) against brute force.
const attempts = new Map<string, { n: number; at: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const a = attempts.get(ip);
  const now = Date.now();
  if (a && now - a.at < 60_000 && a.n >= 8) return NextResponse.redirect(new URL("/login?error=rate", req.url), 303);

  const form = await req.formData();
  const pw = String(form.get("password") ?? "");
  const nextRaw = String(form.get("next") ?? "/");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";
  const { ok } = checkPassword(pw);
  if (!ok) {
    attempts.set(ip, { n: a && now - a.at < 60_000 ? a.n + 1 : 1, at: a && now - a.at < 60_000 ? a.at : now });
    return NextResponse.redirect(new URL(`/login?error=invalid&next=${encodeURIComponent(next)}`, req.url), 303);
  }
  attempts.delete(ip);
  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(SESSION_COOKIE, await createSession(), sessionCookieOptions);
  return res;
}
