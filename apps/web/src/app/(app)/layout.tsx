import Link from "next/link";

import { Button } from "@/components/ui";
import { signOutAction } from "@/app/login/actions";
import { requireUser } from "@/server/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-charcoal-700 bg-charcoal-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-sm font-semibold tracking-[0.2em] text-cream-50">
              SCENE<span className="text-amber-accent">ARC</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm text-muted">
              <Link href="/dashboard" className="hover:text-cream-100">
                Projects
              </Link>
              <Link href="/settings" className="hover:text-cream-100">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-muted sm:inline">{user.email}</span>
            <form action={signOutAction}>
              <Button variant="ghost" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </div>
  );
}
