import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import PlateClient from "@/components/PlateClient";

export const dynamic = "force-dynamic";

export default async function PlatePage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <AppShell>
      <PlateClient userId={user.id} />
    </AppShell>
  );
}
