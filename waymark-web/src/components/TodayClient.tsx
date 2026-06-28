"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { copy } from "@/lib/copy";
import type { FocusItem } from "@/lib/types";
import { createSupabaseBrowser } from "@/lib/supabase/client";

type Mini = { id: string; name: string };
type MiniTask = { id: string; title: string; project_id: string };

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
  const [enough, setEnough] = useState(false);
  const [openTasks, setOpenTasks] = useState<MiniTask[]>(tasks);

  async function strategize(steer?: string) {
    setLoading(true); setEnough(false);
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

  // First visit with context but no plan yet → make one.
  useEffect(() => {
    if (hasContext && initialItems.length === 0 && !initialGist) strategize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function complete(item: FocusItem, index: number) {
    // Best-effort: mark a matching open task done so it really progresses.
    const proj = projects.find((p) => p.name.toLowerCase() === (item.project ?? "").toLowerCase());
    const match = openTasks.find(
      (t) => (!proj || t.project_id === proj.id) && t.title.toLowerCase() === item.title.toLowerCase()
    ) ?? openTasks.find((t) => item.title.toLowerCase().includes(t.title.toLowerCase()));
    if (match) {
      const sb = createSupabaseBrowser();
      await sb.from("tasks").update({ done: true, completed_at: new Date().toISOString() }).eq("id", match.id);
      setOpenTasks((ts) => ts.filter((t) => t.id !== match.id));
    }
    const remaining = items.filter((_, i) => i !== index);
    setItems(remaining);
    if (remaining.length === 0) setEnough(true);
  }

  // --- Empty / onboarding ---
  if (!hasContext) {
    return (
      <div className="card-strong p-8">
        <h1 className="text-2xl font-semibold mb-2">{copy.today.emptyTitle}</h1>
        <p className="text-ink-soft mb-6 leading-relaxed">{copy.today.emptyBody}</p>
        <Link href="/chat" className="btn-primary">{copy.today.emptyCta}</Link>
      </div>
    );
  }

  // --- Enough state ---
  if (enough) {
    return (
      <div className="space-y-4">
        <div className="card-strong p-8">
          <div className="text-3xl mb-3">✓</div>
          <h1 className="text-2xl font-semibold mb-1">{copy.today.enoughTitle}</h1>
          <p className="text-ink-soft">{copy.today.enoughBody}</p>
        </div>
        <button onClick={() => strategize()} className="btn-quiet">{copy.today.refresh}</button>
      </div>
    );
  }

  const hero = items[0];
  const rest = items.slice(1);

  return (
    <div className="space-y-5">
      {gist && <p className="text-ink-soft leading-relaxed">{gist}</p>}

      {hero ? (
        <div className="card-strong p-7">
          <div className="text-xs uppercase tracking-wider text-moss font-semibold mb-3">{copy.today.heroEyebrow}</div>
          {hero.project && <div className="text-sm text-ink-faint mb-1">{hero.project}</div>}
          <h1 className="text-2xl font-semibold leading-snug">{hero.title}</h1>
          <p className="text-ink-soft mt-3">{hero.why}</p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => complete(hero, 0)} className="btn-primary">{copy.today.done}</button>
            <button onClick={() => complete(hero, 0)} className="btn-quiet">{copy.today.notNow}</button>
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
              <button onClick={() => complete(it, i + 1)} className="mt-0.5 text-ink-faint hover:text-moss">○</button>
              <div>
                <div className="font-medium">{it.title}</div>
                <div className="text-sm text-ink-soft">{it.why}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Steer + re-plan */}
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
