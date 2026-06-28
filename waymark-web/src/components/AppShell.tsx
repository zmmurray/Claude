"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { copy } from "@/lib/copy";

const tabs = [
  { href: "/today", label: copy.nav.today },
  { href: "/plate", label: copy.nav.plate },
  { href: "/chat", label: copy.nav.chat },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-black/25 border-b border-white/10">
        <div className="mx-auto max-w-3xl px-5 h-14 flex items-center gap-4">
          <Link href="/today" className="font-semibold text-lg mr-2 text-white tracking-tight">{copy.brand}</Link>
          <nav className="flex items-center gap-1 text-sm">
            {tabs.map((t) => {
              const active = path === t.href;
              return (
                <Link key={t.href} href={t.href}
                  className={`px-3 py-1.5 rounded-full transition ${active ? "bg-white text-ink shadow" : "text-white/75 hover:bg-white/15"}`}>
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex-1" />
          <Link href="/account" className="text-white/60 hover:text-white text-sm">{copy.nav.account}</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">{children}</main>
    </div>
  );
}
