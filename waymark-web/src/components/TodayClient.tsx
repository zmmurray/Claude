"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SummitCelebration from "./SummitCelebration";
import { copy } from "@/lib/copy";
import type { FocusItem } from "@/lib/types";
import { createSupabaseBrowser } from "@/lib/supabase/client";

const ENCOURAGEMENTS = [
  "You got this.", "One step at a time.", "Let's make it count.", "Steady wins it.",
  "Small steps, real progress.", "Here we go.", "You're on your way.", "Make it a good one.",
];

// Time-of-day glyph: rising half-sun (morning), full sun (afternoon), setting half-sun (evening).
const PhaseIcon = ({ phase }: { phase: "morning" | "afternoon" | "evening" }) => {
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "#6e977f", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (phase === "afternoon") {
    return (
      <svg {...common} aria-hidden>
        <circle cx="12" cy="12" r="4.5" />
        <line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" />
        <line x1="4.2" y1="4.2" x2="5.6" y2="5.6" /><line x1="18.4" y1="18.4" x2="19.8" y2="19.8" />
        <line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
        <line x1="4.2" y1="19.8" x2="5.6" y2="18.4" /><line x1="18.4" y1="5.6" x2="19.8" y2="4.2" />
      </svg>
    );
  }
  // morning = arrow up (rising); evening = arrow down (setting)
  const arrow = phase === "morning" ? "8 6 12 2 16 6" : "8 5 12 9 16 5";
  const stem = phase === "morning" ? { y1: 2, y2: 9 } : { y1: 9, y2: 2 };
  return (
    <svg {...common} aria-hidden>
      <path d="M17 18a5 5 0 0 0-10 0" />
      <line x1="12" y1={stem.y1} x2="12" y2={stem.y2} />
      <line x1="3.5" y1="18" x2="5.5" y2="18" /><line x1="18.5" y1="18" x2="20.5" y2="18" />
      <line x1="5" y1="10.5" x2="6.4" y2="11.9" /><line x1="17.6" y1="11.9" x2="19" y2="10.5" />
      <line x1="22" y1="22" x2="2" y2="22" />
      <polyline points={arrow} />
    </svg>
  );
};

const Grip = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
  </svg>
);

type Mini = { id: string; name: string };
type MiniTask = { id: string; title: string; project_id: string; urgent?: boolean; created_at?: string };
type Undo = { type: "done" | "skip"; item: FocusItem; index: number; taskId: string | null } | null;

export default function TodayClient({
  initialSnapshotId, initialGist, initialItems, hasContext, projects, tasks,
}: {
  initialSnapshotId: string | null;
  initialGist: string;
  initialItems: FocusItem[];
  hasContext: boolean;
  projects: Mini[];
  tasks: MiniTask[];
}) {
  const router = useRouter();
  const [snapshotId, setSnapshotId] = useState<string | null>(initialSnapshotId);
  const [gist, setGist] = useState(initialGist);
  const [items, setItems] = useState<FocusItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState<null | "done" | "skip">(null);
  const [openTasks, setOpenTasks] = useState<MiniTask[]>(tasks);
  const [undo, setUndo] = useState<Undo>(null);

  // Greeting + date (set after mount to avoid an SSR/client time mismatch).
  const [greeting, setGreeting] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [phase, setPhase] = useState<"" | "morning" | "afternoon" | "evening">("");
  const [resting, setResting] = useState(false);
  const [pop, setPop] = useState(false); // brief celebration when a task is checked
  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    const p = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
    const timeGreet = p === "morning" ? "Good morning" : p === "afternoon" ? "Good afternoon" : "Good evening";
    // Sometimes swap the time greeting for a little encouragement.
    if (Math.random() < 0.4) {
      setGreeting(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
      setPhase(""); // no sun icon on encouragements
    } else {
      setGreeting(timeGreet);
      setPhase(p);
    }
    setDateLabel(now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  // Drag to reorder focus items (works on touch via a touch-action:none handle).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((cur) => {
      const oldIndex = cur.findIndex((it) => it.title === active.id);
      const newIndex = cur.findIndex((it) => it.title === over.id);
      if (oldIndex < 0 || newIndex < 0) return cur;
      const next = arrayMove(cur, oldIndex, newIndex);
      persist(next);
      return next;
    });
    setUndo(null);
  }

  // Persist the visible list back onto the saved snapshot so dismissed items
  // (Done / Not now) don't come back when the page reloads.
  async function persist(nextItems: FocusItem[]) {
    if (!snapshotId) return;
    const sb = createSupabaseBrowser();
    await sb.from("focus_snapshots").update({ items: nextItems }).eq("id", snapshotId);
  }

  async function strategize(steer?: string) {
    setLoading(true); setFinished(null); setUndo(null);
    setResting(steer === copy.steer.wiped);
    try {
      const res = await fetch("/api/strategize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steer }),
      });
      const data = await res.json();
      setGist(data.gist ?? "");
      setItems(Array.isArray(data.items) ? data.items : []);
      setSnapshotId(data.snapshotId ?? null);
    } finally { setLoading(false); }
  }

  // On open, reconcile with the latest snapshot in the DB (the server page can be
  // cached). If there's none and there's context (e.g. chat just changed things
  // and cleared the old focus), generate fresh focus so new/urgent tasks surface.
  useEffect(() => {
    const sb = createSupabaseBrowser();
    sb.from("focus_snapshots").select("id,gist,items,created_at")
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const snapItems: FocusItem[] = Array.isArray((data as any).items) ? (data as any).items : [];
          setSnapshotId((data as any).id ?? null);
          setGist((data as any).gist ?? "");
          setItems(snapItems);
          // Rebuild only if an urgent task is NEWER than this focus — so a just-added
          // urgent task surfaces, without rebuilding on every visit.
          const snapTime = (data as any).created_at ?? "";
          if (tasks.some((t) => t.urgent && t.created_at && t.created_at > snapTime)) strategize();
        } else if (hasContext) {
          strategize();
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Jump to this item's project over on the All projects page.
  function openProject(item: FocusItem) {
    const proj = projects.find((p) => p.name.toLowerCase() === (item.project ?? "").toLowerCase());
    router.push(proj ? `/plate#proj-${proj.id}` : "/plate");
  }

  // Open the chat to talk this item through.
  function tellMore(item: FocusItem) {
    router.push(item.project ? `/chat?about=${encodeURIComponent(item.project)}` : "/chat");
  }

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
    persist(remaining);
    setUndo({ type: "done", item, index, taskId });
    if (remaining.length === 0) setFinished("done");
    else { setPop(true); setTimeout(() => setPop(false), 1100); }
  }

  function skip(item: FocusItem, index: number) {
    // "Not now" demotes the item to the bottom of Next up instead of dismissing it.
    setItems((cur) => {
      const next = cur.filter((_, i) => i !== index);
      next.push(item);
      persist(next);
      return next;
    });
  }

  async function doUndo() {
    if (!undo) return;
    if (undo.type === "done" && undo.taskId) {
      const sb = createSupabaseBrowser();
      await sb.from("tasks").update({ done: false, completed_at: null }).eq("id", undo.taskId);
      const id = undo.taskId;
      setOpenTasks((ts) => (ts.some((t) => t.id === id) ? ts : [...ts, { id, title: undo.item.title, project_id: "" }]));
    }
    const restored = [...items];
    restored.splice(Math.min(undo.index, restored.length), 0, undo.item);
    setItems(restored);
    persist(restored);
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
        <div className={`card-strong p-8 ${finished === "done" ? "text-center" : ""}`}>
          {finished === "done" ? <SummitCelebration /> : <div className="text-3xl mb-3">👍</div>}
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
      {pop && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="task-pop relative">
            <div className="h-20 w-20 rounded-full flex items-center justify-center shadow-lift"
                 style={{ background: "linear-gradient(180deg,#DAF1DE,#8EB69B)" }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#0B2B26" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className="summit-spark absolute -top-1 -left-1 h-2 w-2 rounded-full bg-moss" style={{ animationDelay: "0.05s" }} />
            <span className="summit-spark absolute -top-2 right-2 h-1.5 w-1.5 rounded-full bg-sage-deep" style={{ animationDelay: "0.18s" }} />
            <span className="summit-spark absolute bottom-0 -right-2 h-2 w-2 rounded-full bg-moss" style={{ animationDelay: "0.12s" }} />
            <span className="summit-spark absolute -bottom-1 left-1 h-1.5 w-1.5 rounded-full bg-sage-deep" style={{ animationDelay: "0.24s" }} />
          </div>
        </div>
      )}

      {/* Header — date eyebrow + warm greeting title with a time-of-day icon */}
      <div>
        <div className="eyebrow">{dateLabel || "Today"}</div>
        <h1 className="text-[28px] font-bold tracking-tight text-pine mt-1 leading-none flex items-center gap-2.5">
          {greeting || "Today"}
          {phase && <PhaseIcon phase={phase} />}
        </h1>
      </div>

      {undoBar}
      {!resting && gist && <p className="on-bg-soft leading-relaxed text-[15px]">{gist}</p>}

      {resting && (
        <div className="card-strong p-8 text-center">
          <div className="text-3xl mb-2">🌿</div>
          <h2 className="font-display text-2xl mb-1 text-pine">{copy.today.resting}</h2>
          <p className="text-ink-soft mb-5">{gist || "Rest first — it'll keep."}</p>
          <button onClick={() => strategize()} disabled={loading} className="btn-primary">
            {loading ? "One sec…" : copy.today.jumpBackIn}
          </button>
        </div>
      )}

      {!resting && (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((it) => it.title)} strategy={verticalListSortingStrategy}>
          {hero ? (
            <div>
              <div className="eyebrow mb-2">{copy.today.heroEyebrow}</div>
              <HeroFocus item={hero}
                onDone={() => done(hero, 0)} onSkip={() => skip(hero, 0)}
                onTell={() => tellMore(hero)} onOpen={() => openProject(hero)} />
            </div>
          ) : (
            <div className="card-strong p-7 text-center">
              <h2 className="font-display text-2xl mb-1 text-pine">
                {resting ? copy.today.resting : "Nothing pressing right now."}
              </h2>
              <p className="text-ink-soft">{gist || "You're good — enjoy the quiet."}</p>
              <button onClick={() => strategize()} disabled={loading} className="btn-primary mt-5">
                {loading ? "One sec…" : copy.today.jumpBackIn}
              </button>
            </div>
          )}

          {rest.length > 0 && (
            <div className="space-y-2.5">
              <div className="eyebrow">{copy.today.more}</div>
              {rest.map((it, i) => (
                <RowFocus key={it.title} item={it}
                  onDone={() => done(it, i + 1)} onSkip={() => skip(it, i + 1)} onOpen={() => openProject(it)} />
              ))}
            </div>
          )}
        </SortableContext>
      </DndContext>
      )}

      <div className="card p-4">
        <div className="eyebrow mb-2.5">{copy.steer.prompt}</div>
        <div className="flex flex-wrap gap-2">
          <button className="chip" onClick={() => strategize(copy.steer.shortTime)} disabled={loading}>{copy.steer.shortTime}</button>
          <button className="chip" onClick={() => strategize(copy.steer.wiped)} disabled={loading}>{copy.steer.wiped}</button>
          <button className="chip" onClick={() => strategize()} disabled={loading}>{copy.today.refresh}</button>
          <Link href="/chat" className="chip">{copy.today.talk}</Link>
        </div>
        {loading && <div className="text-sm text-ink-faint mt-3">Thinking it through…</div>}
      </div>
    </div>
  );
}

function HeroFocus({ item, onDone, onSkip, onTell, onOpen }: {
  item: FocusItem; onDone: () => void; onSkip: () => void; onTell: () => void; onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.title });
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.85 : 1, zIndex: isDragging ? 30 : undefined, position: "relative" }}>
      <div onClick={onOpen} role="button"
        className="rounded-[30px] p-7 shadow-lift relative overflow-hidden cursor-pointer"
        style={{ background: "linear-gradient(165deg,#1c463c 0%,#0B2B26 60%,#051F20 100%)", border: "1px solid rgba(142,182,155,0.22)" }}>
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(420px 240px at 88% -10%, rgba(142,182,155,0.30), transparent 60%)" }} />
        <button {...attributes} {...listeners} onClick={(e) => e.stopPropagation()} aria-label="Drag to reorder"
          className="absolute top-4 right-3 z-10 text-sage/70 hover:text-sage cursor-grab active:cursor-grabbing p-1"
          style={{ touchAction: "none" }}>
          <Grip />
        </button>
        <div className="relative flex items-start gap-3 pr-7">
          <div className="h-10 w-10 rounded-full flex items-center justify-center text-pine-darkest shrink-0"
            style={{ background: "linear-gradient(180deg,#bfe0c8,#8EB69B)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l5-9 3 4.5L15.5 9 20 20z" /></svg>
          </div>
          <div className="flex-1">
            {item.project && <div className="text-xs uppercase tracking-[0.14em] font-semibold text-sage">{item.project}</div>}
            <h2 className="font-display text-[28px] leading-tight text-white mt-0.5">{item.title}</h2>
            <p className="text-mint/80 mt-1 leading-relaxed">{item.why}</p>
          </div>
        </div>
        <div className="relative mt-5 flex items-center text-sage">
          <svg width="100%" height="14" viewBox="0 0 200 14" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" strokeLinecap="round">
            <path d="M2 11 C 40 11, 50 4, 90 5 S 150 10, 186 4" />
          </svg>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="-ml-1"><path d="M6 3v18M6 4h11l-2.5 3.5L17 11H6z" /></svg>
        </div>
        <div className="relative flex items-center gap-2.5 mt-5">
          <button onClick={(e) => { e.stopPropagation(); onDone(); }}
            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold text-pine-darkest transition hover:brightness-105"
            style={{ background: "linear-gradient(180deg,#DAF1DE,#8EB69B)", boxShadow: "0 14px 30px -14px rgba(142,182,155,0.5)" }}>
            {copy.today.done}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onTell(); }}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-medium text-mint/90 transition hover:bg-white/10"
            style={{ border: "1px solid rgba(142,182,155,0.4)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5h14a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3V7a2 2 0 012-2z" /></svg>
            {copy.today.discuss}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onSkip(); }}
            className="ml-auto text-mint/50 hover:text-mint/80 text-sm px-2 transition">
            {copy.today.notNow}
          </button>
        </div>
      </div>
    </div>
  );
}

function RowFocus({ item, onDone, onSkip, onOpen }: {
  item: FocusItem; onDone: () => void; onSkip: () => void; onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.title });
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.85 : 1, zIndex: isDragging ? 30 : undefined }}
      onClick={onOpen} role="button"
      className="card p-4 flex items-center gap-2.5 cursor-pointer">
      <button {...attributes} {...listeners} onClick={(e) => e.stopPropagation()} aria-label="Drag to reorder"
        className="text-ink-faint hover:text-ink-soft cursor-grab active:cursor-grabbing shrink-0 -ml-1"
        style={{ touchAction: "none" }}>
        <Grip />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onDone(); }}
        className="h-9 w-9 rounded-full bg-moss/12 text-moss flex items-center justify-center hover:bg-moss/20 transition shrink-0"
        title={copy.today.done}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /></svg>
      </button>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-pine truncate">{item.title}</div>
        <div className="text-sm text-ink-faint truncate">{item.project ?? item.why}</div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onSkip(); }} className="text-ink-faint hover:text-ink-soft text-xs px-2">{copy.today.notNow}</button>
    </div>
  );
}
