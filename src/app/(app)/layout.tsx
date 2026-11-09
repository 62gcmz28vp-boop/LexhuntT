import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { getPrefs } from "@/lib/prefs";
import { t } from "@/lib/i18n";
import { q1 } from "@/lib/db";
import type { NavItem } from "@/components/shell/nav";
import { LangToggle, MobileNav, NavLinks, ThemeToggle } from "@/components/shell/ClientControls";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { lang, theme } = await getPrefs();
  const counts = await q1<{ unread: number; fresh: number }>(
    "SELECT (SELECT count(*)::int FROM notifications WHERE read_at IS NULL) AS unread, (SELECT count(*)::int FROM jobs WHERE is_new = true AND dismissed = false AND status <> 'closed') AS fresh",
  );
  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: t(lang, "sec_discover"),
      items: [
        { href: "/", label: t(lang, "nav_command"), icon: "command" },
        { href: "/opportunities", label: t(lang, "nav_live"), icon: "live", badge: counts?.fresh || undefined },
        { href: "/matches", label: t(lang, "nav_matches"), icon: "matches" },
        { href: "/radar", label: t(lang, "nav_radar"), icon: "radar" },
        { href: "/hidden", label: t(lang, "nav_hidden"), icon: "hidden" },
      ],
    },
    {
      title: t(lang, "sec_prepare"),
      items: [
        { href: "/studio", label: t(lang, "nav_studio"), icon: "studio" },
        { href: "/pipeline", label: t(lang, "nav_pipeline"), icon: "pipeline" },
        { href: "/intelligence", label: t(lang, "nav_intel"), icon: "intel" },
      ],
    },
    {
      title: t(lang, "sec_system"),
      items: [
        { href: "/alerts", label: t(lang, "nav_alerts"), icon: "alerts", badge: counts?.unread || undefined },
        { href: "/coverage", label: t(lang, "nav_coverage"), icon: "coverage" },
        { href: "/settings", label: t(lang, "nav_settings"), icon: "settings" },
      ],
    },
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto bg-[#0f1b2d] px-4 py-6 lg:flex">
        <Link href="/" className="mb-8 block px-3">
          <div className="font-serif text-2xl tracking-[0.22em] text-[#f6f2e8]">LEXHUNT</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#d6b468]">{lang === "ar" ? "ذكاء المسار القانوني · الرياض" : "Legal Career Intelligence · Riyadh"}</div>
        </Link>
        <nav className="flex-1 space-y-6">
          {sections.map((s) => (
            <div key={s.title}>
              <div className="mb-1.5 px-3 text-[10px] uppercase tracking-[0.18em] text-[#8b94a7]">{s.title}</div>
              <NavLinks items={s.items} />
            </div>
          ))}
        </nav>
        <div className="mt-6 border-t border-white/10 px-3 pt-4 text-[11px] leading-relaxed text-[#8b94a7]">
          {lang === "ar" ? "منصة شخصية خاصة. لا يتم التقديم أو التواصل مع جهات العمل دون موافقتك." : "Private, single-owner platform. Nothing is submitted or sent to employers without your approval."}
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-bg/85 px-4 backdrop-blur md:px-8">
          <MobileNav sections={sections} />
          <Link href="/" className="font-serif text-lg tracking-[0.2em] lg:hidden">
            LEXHUNT
          </Link>
          <div className="flex-1" />
          <LangToggle lang={lang} />
          <ThemeToggle theme={theme} />
          <Link href="/alerts" aria-label="Notifications" className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2">
            <Bell className="h-4 w-4" />
            {counts?.unread ? <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-gold" /> : null}
          </Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" aria-label={t(lang, "logout")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
