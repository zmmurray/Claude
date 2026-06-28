import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? "/today" : "/login");
}
