"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { copy } from "@/lib/copy";
import type { FocusItem } from "@/lib/types";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Mini = { id: string; name: string };
type MiniTask = { id: string; title: string; project_id: string };
type Undo = { type: "done" | "skip"; item: FocusItem; index: number; taskId: string | null } | null;

export default function TodayClient({
  initialGist, initialItems, hasContext, projects, tasks,
}: {
  initialGist: string;
  initialItems: FocusItem[];
  hasContext: boolean;
  projects: Mini[];
  tasks: MiniTask[];
}) {
  const [gist, setGist] = useState(initialGist);
  const [items, setItems] = useState<FocusItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState<null | "done" | "skip">(null);
  const [openTasks, setOpenTasks] = useState<MiniTask[]>(tasks);
  const [undo, setUndo] = useState<Undo>(null);

  async function strategize(steer?: string) {
    setLoading(true); setFinished(null); setUndo(null);
    try {
      const res = await fetch("/api/strategize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steer }),
      });
      const data = await res.json();
      setGist(data.gist ?? "");
      setItems(Array.isArray(data.items) ? data.items : []);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (hasContext && initialItems.length === 0 && !initialGist) strategize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function matchTask(item: FocusItem): MiniTask | undefined {
    const proj = projects.find((p) => p.name.toLowerCase() === (item.project ?? "").toLowerCase());
    return (
      openTasks.find((t) => (!proj || t.project_id === proj.id) && t.title.toLowerCase() === item.title.toLowerCase()) ??
      openTasks.find((t) => item.title.toLowerCase().includes(t.title.toLowerCase()))
    );
  }

  async function done(item: FocusItem, index: number) {
    let taskId: string | null = null;
    const match = matchTask(item);
    if (match) {
      taskId = match.id;
      const sb = createSupabaseBrowser();
      await sb.from("tasks").update({ done: true, completed_at: new Date().toISOString() }).eq("id", match.id);
      setOpenTasks((ts) => ts.filter((t) => t.id !== match.id));
    }
    const remaining = items.filter((_, i) => i !== index);
    setItems(remaining);
    setUndo({ type: "done", item, index, taskId });
    if (remaining.length === 0) setFinished("done");
  }

  function skip(item: FocusItem, index: number) {
    const remaining = items.filter((_, i) => i !== index);
    setItems(remaining);
    setUndo({ type: "skip", item, index, taskId: null });
    if (remaining.length === 0) setFinished("skip");
  }

  async function doUndo() {
    if (!undo) return;
    if (undo.type === "done" && undo.taskId) {
      const sb = createSupabaseBrowser();
      await sb.from("tasks").update({ done: false, completed_at: null }).eq("id", undo.taskId);
      const id = undo.taskId;
      setOpenTasks((ts) => (ts.some((t) => t.id === id) ? ts : [...ts, { id, title: undo.item.title, project_id: "" }]));
    }
    setItems((cur) => {
      const next = [...cur];
      next.splice(Math.min(undo.index, next.length), 0, undo.item);
      return next;
    });
    setFinished(null);
    setUndo(null);
  }

  // --- Onboarding ---
  if (!hasContext) {
    return (
      <div className="card-strong p-8">
        <h1 className="text-2xl font-semibold mb-2">{copy.today.emptyTitle}</h1>
        <p className="text-ink-soft mb-6 leading-relaxed">{copy.today.emptyBody}</p>
        <Link href="/chat" className="btn-primary">{copy.today.emptyCta}</Link>
      </div>
    );
  }

  const undoBar = undo && (
    <div className="card p-3 flex items-center justify-between text-sm">
      <span className="text-ink-soft">{undo.type === "done" ? copy.today.markedDone : copy.today.skipped}</span>
      <button onClick={doUndo} className="text-moss font-medium">{copy.today.undo}</button>
    </div>
  );

  // --- Finished (nothing left) ---
  if (finished) {
    return (
      <div className="space-y-4">
        {undoBar}
        <div className="card-strong p-8">
          <div className="text-3xl mb-3">{finished === "done" ? "✓" : "👍"}</div>
          <h1 className="text-2xl font-semibold mb-1">
            {finished === "done" ? copy.today.enoughTitle : copy.today.allDone}
          </h1>
          <p className="text-ink-soft">{finished === "done" ? copy.today.enoughBody : "Nothing else I'd push right now."}</p>
        </div>
        <button onClick={() => strategize()} className="btn-quiet">{copy.today.refresh}</button>
      </div>
    );
  }

  const hero = items[0];
  const rest = items.slice(1);

  return (
    <div className="space-y-5">
      {undoBar}
      {gist && <p className="text-ink-soft leading-relaxed">{gist}</p>}

      {hero ? (
        <div className="card-strong p-7">
          <div className="text-xs uppercase tracking-wider text-moss font-semibold mb-3">{copy.today.heroEyebrow}</div>
          {hero.project && <div className="text-sm text-ink-faint mb-1">{hero.project}</div>}
          <h1 className="text-2xl font-semibold leading-snug">{hero.title}</h1>
          <p className="text-ink-soft mt-3">{hero.why}</p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => done(hero, 0)} className="btn-primary">{copy.today.done}</button>
            <button onClick={() => skip(hero, 0)} className="btn-quiet">{copy.today.notNow}</button>
          </div>
        </div>
      ) : (
        <div className="card-strong p-7">
          <h1 className="text-xl font-semibold mb-1">Nothing pressing right now.</h1>
          <p className="text-ink-soft">{gist || "You're good — enjoy the quiet."}</p>
        </div>
      )}

      {rest.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-ink-faint">{copy.today.more}</div>
          {rest.map((it, i) => (
            <div key={i} className="card p-4 flex items-start gap-3">
              <button onClick={() => done(it, i + 1)} className="mt-0.5 text-ink-faint hover:text-moss" title={copy.today.done}>○</button>
              <div className="flex-1">
                <div className="font-medium">{it.title}</div>
                <div className="text-sm text-ink-soft">{it.why}</div>
              </div>
              <button onClick={() => skip(it, i + 1)} className="text-ink-faint hover:text-ink-soft text-sm">{copy.today.notNow}</button>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4">
        <div className="text-sm text-ink-faint mb-2">{copy.steer.prompt}</div>
        <div className="flex flex-wrap gap-2">
          <button className="chip" onClick={() => strategize(copy.steer.shortTime)} disabled={loading}>{copy.steer.shortTime}</button>
          <button className="chip" onClick={() => strategize(copy.steer.wiped)} disabled={loading}>{copy.steer.wiped}</button>
          <button className="chip" onClick={() => strategize(copy.steer.fire)} disabled={loading}>{copy.steer.fire}</button>
          <button className="chip" onClick={() => strategize()} disabled={loading}>{copy.today.refresh}</button>
          <Link href="/chat" className="chip">{copy.today.talk}</Link>
        </div>
        {loading && <div className="text-sm text-ink-faint mt-3">Thinking it through…</div>}
      </div>
    </div>
  );
}
