"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, GraduationCap, Headphones, LayoutDashboard, Menu, Network, Sparkles, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/teach", label: "Teach", icon: GraduationCap },
  { href: "/campus", label: "Campus", icon: Network },
  { href: "/skills", label: "Skills", icon: Sparkles },
  { href: "/voice", label: "Voice", icon: Headphones },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-[#e8ece6] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-7 lg:px-10">
          <Link href="/" className="flex items-center gap-3" aria-label="Mindtrace home">
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-forest text-white">
              <span className="font-serif text-xl font-bold">m</span>
            </span>
            <span>
              <span className="block text-[15px] font-bold tracking-tight text-ink">mindtrace</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.15em] text-slate-400">learning, in context</span>
            </span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
            {links.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? "bg-mint text-forest" : "text-slate-500 hover:bg-slate-50 hover:text-ink"}`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden items-center gap-2 rounded-full bg-[#f3f7f3] px-3 py-2 text-xs font-semibold text-[#47765f] sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#63a47c]" />
            Shared learner engine
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-ink md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {menuOpen && (
          <nav aria-label="Mobile navigation" className="border-t border-slate-100 px-4 py-3 md:hidden">
            <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-2">
              {links.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold ${pathname === href ? "bg-mint text-forest" : "text-slate-600 hover:bg-slate-50"}`}>
                  <Icon size={17} /> {label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-7 sm:py-10 lg:px-10">{children}</main>
      <footer className="mx-auto flex max-w-[1440px] flex-col gap-2 border-t border-[#e8ece6] px-4 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10">
        <span>Mindtrace · A shared engine for more human learning.</span>
        <span>Demo environment · Learner data is illustrative</span>
      </footer>
    </div>
  );
}
