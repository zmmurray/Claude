import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import { copy } from "@/lib/copy";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AppShell>
      <div className="card-strong p-7 max-w-md">
        <h1 className="font-display text-2xl mb-2 text-pine">{copy.account.title}</h1>
        <p className="text-ink-soft mb-6">Signed in as {user.email}</p>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn-quiet">{copy.account.signOut}</button>
        </form>
        <p className="mt-6 text-xs text-ink-faint">Waymark · build jun-29-c</p>
      </div>
    </AppShell>
  );
}
