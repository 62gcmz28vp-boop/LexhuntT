import "server-only";
import { q, q1, json } from "./db";
import type { Profile } from "./types";
import { DEFAULT_PROFILE } from "./profileDefault";

export async function getProfile(): Promise<Profile> {
  const row = await q1<{ data: Profile }>("SELECT data FROM profile WHERE id = 1");
  return { ...DEFAULT_PROFILE, ...(row?.data ?? {}) };
}

export async function saveProfile(p: Profile) {
  await q(
    "INSERT INTO profile (id, data, updated_at) VALUES (1, $1::jsonb, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
    [json(p)],
  );
}
