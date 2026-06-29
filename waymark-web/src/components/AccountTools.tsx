"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { norm } from "@/lib/data";

// One-tap maintenance: clear leftover "urgent" flags, and clean up duplicates.
export default function AccountTools() {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  async function clearUrgent() {
    setBusy("urgent"); setMsg("");
    const sb = createSupabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    if (user) await sb.from("tasks").update({ urgent: false }).eq("user_id", user.id).eq("urgent", true);
    setBusy(""); setMsg("Urgent flags cleared.");
  }

  async function dedupe() {
    setBusy("dedupe"); setMsg("");
    const sb = createSupabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setBusy(""); return; }

    // Merge duplicate active projects (same normalized name): keep earliest,
    // move tasks to the keeper, delete the duplicates.
    const { data: projects } = await sb.from("projects").select("id,name")
      .eq("user_id", user.id).eq("is_done", false).order("created_at");
    const keepByName = new Map<string, string>();
    let mergedProjects = 0;
    for (const p of projects ?? []) {
      const k = norm(p.name);
      const keep = keepByName.get(k);
      if (keep) {
        await sb.from("tasks").update({ project_id: keep }).eq("project_id", p.id);
        await sb.from("projects").delete().eq("id", p.id);
        mergedProjects++;
      } else keepByName.set(k, p.id);
    }

    // Remove duplicate tasks within a project (same normalized title): keep earliest.
    const { data: tasks } = await sb.from("tasks").select("id,project_id,title")
      .eq("user_id", user.id).order("created_at");
    const seen = new Set<string>();
    let removedTasks = 0;
    for (const t of tasks ?? []) {
      const k = `${t.project_id}::${norm(t.title)}`;
      if (seen.has(k)) { await sb.from("tasks").delete().eq("id", t.id); removedTasks++; }
      else seen.add(k);
    }

    setBusy("");
    setMsg(`Cleaned up — merged ${mergedProjects} duplicate project${mergedProjects === 1 ? "" : "s"} and removed ${removedTasks} duplicate to-do${removedTasks === 1 ? "" : "s"}.`);
  }

  return (
    <div className="mt-5 pt-5 border-t border-black/5 space-y-2">
      <div className="flex flex-wrap gap-2">
        <button onClick={clearUrgent} disabled={!!busy} className="btn-quiet text-sm">
          {busy === "urgent" ? "Clearing…" : "Clear urgent flags"}
        </button>
        <button onClick={dedupe} disabled={!!busy} className="btn-quiet text-sm">
          {busy === "dedupe" ? "Cleaning…" : "Remove duplicates"}
        </button>
      </div>
      {msg && <p className="text-moss text-sm">{msg}</p>}
    </div>
  );
}
