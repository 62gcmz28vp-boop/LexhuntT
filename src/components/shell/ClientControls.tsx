"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Moon, Sun, Languages, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "./nav";
import { NavIcon } from "./nav-icons";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeToggle({ theme }: { theme: "light" | "dark" }) {
  const [t, setT] = useState(theme);
  return (
    <button
      type="button"
      aria-label={t === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2"
      onClick={() => {
        const next = t === "dark" ? "light" : "dark";
        setT(next);
        setCookie("theme", next);
        document.documentElement.dataset.theme = next;
      }}
    >
      {t === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function LangToggle({ lang }: { lang: "en" | "ar" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label="Toggle language / تبديل اللغة"
      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-ink-2 hover:bg-surface-2"
      onClick={() => {
        setCookie("lang", lang === "ar" ? "en" : "ar");
        start(() => router.refresh());
      }}
    >
      <Languages className="h-4 w-4" />
      {lang === "ar" ? "English" : "العربية"}
    </button>
  );
}

export function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((i) => {
        const active = i.href === "/" ? path === "/" : path.startsWith(i.href);
        return (
          <li key={i.href}>
            <Link
              href={i.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-white/10 text-[#f6f2e8]" : "text-[#c9cfdb] hover:bg-white/5 hover:text-[#f6f2e8]",
              )}
            >
              <NavIcon name={i.icon} className={cn("h-4 w-4", active ? "text-[#d6b468]" : "text-[#8b94a7]")} />
              <span className="flex-1">{i.label}</span>
              {i.badge ? <span className="rounded-full bg-[#d6b468] px-1.5 text-[10px] font-semibold text-[#0f1b2d]">{i.badge}</span> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function MobileNav({ sections }: { sections: { title: string; items: NavItem[] }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label="Open menu" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 lg:hidden" onClick={() => setOpen(true)}>
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <nav className="absolute inset-y-0 start-0 w-72 overflow-y-auto bg-[#0f1b2d] p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-serif text-xl tracking-[0.2em] text-[#f6f2e8]">LEXHUNT</span>
              <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="text-[#c9cfdb]">
                <X className="h-5 w-5" />
              </button>
            </div>
            {sections.map((s) => (
              <div key={s.title} className="mb-4">
                <div className="mb-1 px-3 text-[10px] uppercase tracking-[0.18em] text-[#8b94a7]">{s.title}</div>
                <NavLinks items={s.items} onNavigate={() => setOpen(false)} />
              </div>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
