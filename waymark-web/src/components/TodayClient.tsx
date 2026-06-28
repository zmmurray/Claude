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
      <div className="min-h-[68vh] flex items-center justify-center">
        <div className="card-strong p-9 max-w-lg w-full text-center">
          <div className="mx-auto mb-5 h-16 w-16 rounded-full flex items-center justify-center text-3xl text-moss"
               style={{ background: "radial-gradient(circle at 35% 30%, rgba(233,185,141,0.25), rgba(142,182,155,0.28))" }}>
            ◆
          </div>
          <h1 className="font-display text-[34px] mb-3 leading-tight tracking-tight text-pine">{copy.today.emptyTitle}</h1>
          <p className="text-ink-soft mb-7 leading-relaxed">{copy.today.emptyBody}</p>
          <Link href="/chat" className="btn-primary">{copy.today.emptyCta}</Link>
        </div>
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
          <h1 className="font-display text-[28px] mb-1 text-pine leading-tight">
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
    <div className="space-y-6">
      {/* Editorial header */}
      <div className="text-center">
        <h1 className="font-display text-4xl tracking-[0.14em] text-pine">RIGHT NOW</h1>
        <div className="eyebrow mt-1">Focus your path</div>
      </div>

      {undoBar}
      {gist && <p className="text-center on-bg-soft leading-relaxed text-[15px] max-w-md mx-auto">{gist}</p>}

      {hero ? (
        <div>
          <div className="eyebrow mb-2">{copy.today.heroEyebrow}</div>
          {/* The one focal card — deep cinematic pine. */}
          <div className="rounded-[30px] p-7 shadow-lift relative overflow-hidden"
               style={{ background: "linear-gradient(165deg,#1c463c 0%,#0B2B26 60%,#051F20 100%)", border: "1px solid rgba(142,182,155,0.22)" }}>
            {/* faint mist + peak glow in the corner */}
            <div className="pointer-events-none absolute inset-0"
                 style={{ background: "radial-gradient(420px 240px at 88% -10%, rgba(142,182,155,0.30), transparent 60%)" }} />
            <div className="relative flex items-start gap-3">
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-pine-darkest shrink-0"
                   style={{ background: "linear-gradient(180deg,#bfe0c8,#8EB69B)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l5-9 3 4.5L15.5 9 20 20z" /></svg>
              </div>
              <div className="flex-1">
                {hero.project && <div className="text-xs uppercase tracking-[0.14em] font-semibold text-sage">{hero.project}</div>}
                <h2 className="font-display text-[28px] leading-tight text-white mt-0.5">{hero.title}</h2>
                <p className="text-mint/80 mt-1 leading-relaxed">{hero.why}</p>
              </div>
            </div>
            {/* trail + flag motif */}
            <div className="relative mt-5 flex items-center text-sage">
              <svg width="100%" height="14" viewBox="0 0 200 14" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round">
                <path d="M2 11 C 40 11, 50 4, 90 5 S 150 10, 186 4" />
              </svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="-ml-1"><path d="M6 3v18M6 4h11l-2.5 3.5L17 11H6z" /></svg>
            </div>
            <div className="relative flex gap-3 mt-5">
              <button onClick={() => done(hero, 0)}
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold text-pine-darkest transition hover:brightness-105"
                style={{ background: "linear-gradient(180deg,#DAF1DE,#8EB69B)", boxShadow: "0 14px 30px -14px rgba(142,182,155,0.5)" }}>
                {copy.today.done}
              </button>
              <button onClick={() => skip(hero, 0)}
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-medium text-mint/90 transition hover:bg-white/10"
                style={{ border: "1px solid rgba(142,182,155,0.4)" }}>
                {copy.today.notNow}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card-strong p-7 text-center">
          <h2 className="font-display text-2xl mb-1 text-pine">Nothing pressing right now.</h2>
          <p className="text-ink-soft">{gist || "You're good — enjoy the quiet."}</p>
        </div>
      )}

      {rest.length > 0 && (
        <div className="space-y-2.5">
          <div className="eyebrow">{copy.today.more}</div>
          {rest.map((it, i) => (
            <div key={i} className="card p-4 flex items-center gap-3">
              <button onClick={() => done(it, i + 1)}
                className="h-9 w-9 rounded-full bg-moss/12 text-moss flex items-center justify-center hover:bg-moss/20 transition shrink-0"
                title={copy.today.done}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /></svg>
              </button>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-pine truncate">{it.title}</div>
                <div className="text-sm text-ink-faint truncate">{it.project ?? it.why}</div>
              </div>
              <button onClick={() => skip(it, i + 1)} className="text-ink-faint hover:text-ink-soft text-xs px-2">{copy.today.notNow}</button>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4">
        <div className="eyebrow mb-2.5">{copy.steer.prompt}</div>
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
