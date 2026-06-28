import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import TodayClient from "@/components/TodayClient";
import type { FocusItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: snap }, { data: projects }, { data: tasks }] = await Promise.all([
    supabase.from("focus_snapshots").select("gist,items").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("projects").select("id,name").eq("user_id", user.id).eq("is_done", false),
    supabase.from("tasks").select("id,title,project_id").eq("user_id", user.id).eq("done", false),
  ]);

  return (
    <AppShell>
      <TodayClient
        initialGist={snap?.gist ?? ""}
        initialItems={(snap?.items ?? []) as FocusItem[]}
        hasContext={(projects?.length ?? 0) > 0}
        projects={(projects ?? []) as { id: string; name: string }[]}
        tasks={(tasks ?? []) as { id: string; title: string; project_id: string }[]}
      />
    </AppShell>
  );
}
