"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/lib/copy";

type Tab = { href: string; label: string; icon: (active: boolean) => React.ReactNode };

const peaks = (a: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={a ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 19l5.5-9 3.5 5.2L15.5 8 21 19z" />
  </svg>
);
const folder = (a: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={a ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3.5" y="6.5" width="17" height="13" rx="2.5" /><path d="M3.5 10.5h17" />
  </svg>
);
const chat = (a: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={a ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 5h14a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3V7a2 2 0 012-2z" />
  </svg>
);
const person = (a: boolean) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={a ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
  </svg>
);

const tabs: Tab[] = [
  { href: "/today", label: "Right now", icon: peaks },
  { href: "/plate", label: "Projects", icon: folder },
  { href: "/chat", label: "Tell me more", icon: chat },
  { href: "/account", label: "Account", icon: person },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-2xl px-5 pt-8 pb-32">
        <div className="text-center mb-7">
          <Link href="/today" className="eyebrow !tracking-[0.3em] text-sage-deep">{copy.brand}</Link>
        </div>
        {children}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-20">
        <div className="mx-auto max-w-2xl px-6 pb-6 pt-2">
          <div className="flex items-center justify-around rounded-full px-2 py-2.5 bg-white/55 border border-white/60 shadow-soft"
               style={{ WebkitBackdropFilter: "blur(20px)", backdropFilter: "blur(20px)" }}>
            {tabs.map((t) => {
              const active = path === t.href;
              return (
                <Link key={t.href} href={t.href}
                  className={`flex flex-col items-center gap-1 px-2 py-1 transition ${active ? "text-moss-deep" : "text-sage-deep/70"}`}>
                  {t.icon(active)}
                  <span className="text-[9px] uppercase tracking-[0.08em] font-semibold text-center leading-tight whitespace-nowrap">{t.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
