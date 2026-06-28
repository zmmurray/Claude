import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ChatClient from "@/components/ChatClient";
import type { ChatMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: msgs } = await supabase
    .from("chat_messages").select("id,role,content,created_at")
    .eq("user_id", user.id).order("created_at").limit(50);

  return (
    <AppShell>
      <ChatClient initial={(msgs ?? []) as ChatMessage[]} />
    </AppShell>
  );
}
