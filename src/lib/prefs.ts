import "server-only";
import { cookies } from "next/headers";
import type { Lang } from "./i18n";

export async function getPrefs(): Promise<{ lang: Lang; theme: "light" | "dark" }> {
  const c = await cookies();
  return { lang: c.get("lang")?.value === "ar" ? "ar" : "en", theme: c.get("theme")?.value === "dark" ? "dark" : "light" };
}
