"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { copy } from "@/lib/copy";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { norm } from "@/lib/data";
import SummitCelebration from "./SummitCelebration";
import type { Project, TaskItem } from "@/lib/types";

const ORDER_KEY = "waymark_proj_order";

// Apply a saved manual order: projects in the saved sequence first (in that
// order), then anything new the user hasn't placed yet, by default priority.
function applyOrder(projects: Project[], orderIds: string[]): Project[] {
  if (!orderIds.length) return [...projects].sort(byPriority);
  const pos = new Map(orderIds.map((id, i) => [id, i]));
  return [...projects].sort((a, b) => {
    const ai = pos.has(a.id) ? pos.get(a.id)! : Infinity;
    const bi = pos.has(b.id) ? pos.get(b.id)! : Infinity;
    if (ai !== bi) return ai - bi;
    return byPriority(a, b);
  });
}

const Grip = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
  </svg>
);

// Priority → shade. Darker green = higher priority; same importance = same shade.
function priorityShade(importance: number): string {
  switch (Math.min(5, Math.max(1, Math.round(importance)))) {
    case 5: return "#0B2B26";
    case 4: return "#235347";
    case 3: return "#6e977f";
    case 2: return "#8EB69B";
    default: return "#c3dcc9";
  }
}

// Rank: importance (desc), then sooner deadline first.
function byPriority(a: Project, b: Project) {
  if (b.importance !== a.importance) return b.importance - a.importance;
  const ad = a.deadline_type !== "none" && a.deadline ? a.deadline : "9999-12-31";
  const bd = b.deadline_type !== "none" && b.deadline ? b.deadline : "9999-12-31";
  return ad.localeCompare(bd);
}

export default function PlateClient({ userId }: { userId: string }) {
  const sb = createSupabaseBrowser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [newProject, setNewProject] = useState("");
  const [loading, setLoading] = useState(true);
  const [orderIds, setOrderIds] = useState<string[]>([]);

  // Restore the saved manual order once on mount.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
      if (Array.isArray(saved)) setOrderIds(saved.map(String));
    } catch {}
  }, []);

  // Drag-to-reorder the project list; persist the new order locally.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const current = applyOrder(projects, orderIds).map((p) => p.id);
    const oldIndex = current.indexOf(String(active.id));
    const newIndex = current.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(current, oldIndex, newIndex);
    setOrderIds(next);
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(next)); } catch {}
  }

  async function load() {
    const [{ data: p }, { data: t }] = await Promise.all([
      sb.from("projects").select("*").eq("is_done", false).order("created_at"),
      sb.from("tasks").select("*").order("created_at"),
    ]);
    // Collapse any accidental duplicate projects (same name) and to-dos
    // (same title within a project) so they show once.
    const seenP = new Set<string>();
    const projs = ((p ?? []) as Project[]).filter((pr) => {
      const k = norm(pr.name);
      if (seenP.has(k)) return false;
      seenP.add(k); return true;
    });
    const seenT = new Set<string>();
    const tsks = ((t ?? []) as TaskItem[]).filter((tk) => {
      const k = `${tk.project_id}::${norm(tk.title)}`;
      if (seenT.has(k)) return false;
      seenT.add(k); return true;
    });
    setProjects(projs);
    setTasks(tsks);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // If we arrived from a "Right now" card (/plate#proj-<id>), scroll to it and
  // give it a brief highlight so it's obvious which project we landed on.
  const [highlight, setHighlight] = useState<string | null>(null);
  useEffect(() => {
    if (loading) return;
    const id = window.location.hash.replace("#proj-", "");
    if (!id) return;
    const el = document.getElementById(`proj-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlight(id);
      const t = setTimeout(() => setHighlight(null), 2000);
      return () => clearTimeout(t);
    }
  }, [loading]);

  // Hand new projects to the strategist (via chat) instead of inserting them
  // directly — so it can place them in your priorities rather than guessing.
  function addProject() {
    const name = newProject.trim();
    if (!name) return;
    window.location.assign(`/chat?add=${encodeURIComponent(name)}`);
  }
  async function addTask(projectId: string, title: string) {
    if (!title.trim()) return;
    await sb.from("tasks").insert({ user_id: userId, project_id: projectId, title: title.trim() });
    load();
  }
  async function completeTask(id: string) {
    const completed_at = new Date().toISOString();
    await sb.from("tasks").update({ done: true, completed_at }).eq("id", id);
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: true, completed_at } : t)));
  }
  async function reopenTask(id: string) {
    await sb.from("tasks").update({ done: false, completed_at: null }).eq("id", id);
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, done: false, completed_at: null } : t)));
  }
  async function finishProject(id: string, name: string) {
    if (!window.confirm(`Mark “${name}” done? It'll move off your list.`)) return;
    await sb.from("projects").update({ is_done: true }).eq("id", id);
    setCelebrate(name);
    setTimeout(() => setCelebrate(null), 3200);
    load();
  }

  if (loading) return <div className="on-bg-soft">Loading…</div>;

  const ranked = applyOrder(projects, orderIds);

  return (
    <div className="space-y-5">
      {celebrate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          onClick={() => setCelebrate(null)}
          style={{ background: "rgba(11,43,38,0.30)", WebkitBackdropFilter: "blur(6px)", backdropFilter: "blur(6px)" }}>
          <div className="card-strong w-full max-w-xs p-7 text-center rounded-[30px]">
            <SummitCelebration width={180} />
            <div className="eyebrow mb-1.5">Project complete</div>
            <h2 className="text-xl font-bold text-pine leading-snug">{celebrate}</h2>
            <p className="text-ink-soft text-sm mt-1.5">Wrapped — one less thing to carry.</p>
            <p className="text-ink-faint text-xs mt-4">Tap anywhere to close</p>
          </div>
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold uppercase tracking-[0.1em] text-pine">{copy.plate.title}</h1>
        {ranked.length > 1 && <span className="text-[11px] text-ink-faint">Drag to reorder</span>}
      </div>

      {/* Separate boxes stacked with a hair of gap; drag the grip to reorder. */}
      {ranked.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ranked.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {ranked.map((p, i) => (
                <div key={p.id} className="rise-in" style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}>
                  <ProjectCard project={p} highlighted={highlight === p.id}
                    accent={priorityShade(p.importance)} defaultOpen={highlight === p.id}
                    tasks={tasks.filter((t) => t.project_id === p.id)}
                    onAddTask={(title) => addTask(p.id, title)}
                    onCompleteTask={completeTask}
                    onReopenTask={reopenTask}
                    onFinish={() => finishProject(p.id, p.name)} />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {projects.length === 0 && <p className="on-bg-soft">{copy.plate.empty}</p>}

      <div className="card p-4">
        <div className="flex gap-2">
          <input className="input" placeholder={copy.plate.addProject}
            value={newProject} onChange={(e) => setNewProject(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProject()} />
          <button className="btn-primary whitespace-nowrap" onClick={addProject}>Add</button>
        </div>
        <p className="text-xs text-ink-faint mt-2">{copy.plate.addProjectHint}</p>
      </div>
    </div>
  );
}

function ProjectCard({
  project, tasks, onAddTask, onCompleteTask, onReopenTask, onFinish, highlighted, accent, defaultOpen,
}: {
  project: Project;
  tasks: TaskItem[];
  onAddTask: (t: string) => void;
  onCompleteTask: (id: string) => void;
  onReopenTask: (id: string) => void;
  onFinish: () => void;
  highlighted?: boolean;
  accent: string;
  defaultOpen?: boolean;
}) {
  const [t, setT] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [expanded, setExpanded] = useState(!!defaultOpen);
  // Arriving from a "Right now" card highlights this project after load — open it
  // up automatically so the tap lands you inside the project, not just near it.
  useEffect(() => { if (defaultOpen) setExpanded(true); }, [defaultOpen]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });

  const open = tasks.filter((task) => !task.done);
  const done = tasks.filter((task) => task.done);
  const total = tasks.length;
  const pct = total ? Math.round((done.length / total) * 100) : 0;

  // Higher-priority shades are dark → light text; lighter shades → dark text.
  const dark = project.importance >= 3;
  const ink = dark ? "text-white" : "text-pine-darkest";
  const inkSoft = dark ? "text-white/75" : "text-pine/70";

  return (
    <div ref={setNodeRef} id={`proj-${project.id}`}
      className={`overflow-hidden rounded-[24px] shadow-soft scroll-mt-24 ${highlighted ? "ring-2 ring-sage shadow-lift" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.9 : 1, zIndex: isDragging ? 30 : undefined, position: "relative" }}>
      {/* Rich priority shade with a glassy sheen on top + a light inner edge. */}
      <button onClick={() => setExpanded((e) => !e)}
        className="w-full text-left flex items-center gap-3 p-5"
        style={{
          background: `linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 24%, rgba(255,255,255,0) 52%), ${accent}`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.30)",
        }}>
        <div className="flex-1 min-w-0">
          <h2 className={`text-lg font-semibold truncate ${ink}`}>{project.name}</h2>
          {total > 0 && (
            <>
              <div className={`text-xs mt-1 mb-1.5 ${inkSoft}`}>{done.length} of {total} done · {pct}%</div>
              {/* Progress bar — translucent track over the shade so it stays visible
                  on both dark and light boxes; fill is a contrasting tone. */}
              <div className="h-2 rounded-full overflow-hidden"
                style={{ background: dark ? "rgba(255,255,255,0.22)" : "rgba(11,43,38,0.16)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: dark
                      ? "linear-gradient(90deg,#8EB69B,#DAF1DE)"
                      : "linear-gradient(90deg,#235347,#0B2B26)",
                  }} />
              </div>
            </>
          )}
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 transition-transform ${inkSoft} ${expanded ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
        {/* Drag handle on the right for easy thumb reach. */}
        <span {...attributes} {...listeners} onClick={(e) => e.stopPropagation()} aria-label="Drag to reorder"
          className={`shrink-0 -mr-1 cursor-grab active:cursor-grabbing ${dark ? "text-white/50 hover:text-white/80" : "text-pine/40 hover:text-pine/70"}`}
          style={{ touchAction: "none" }}>
          <Grip />
        </span>
      </button>

      {/* Expanded body — the same frosted-glass white in every box (it sits over
          the page, not the colored header, so it never picks up the box tint).
          The grid-rows trick animates the open/close smoothly. */}
      <div className={`expandable ${expanded ? "is-open" : ""}`}>
      <div className="expandable-inner">
      <div className="px-5 py-5"
        style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.4)", WebkitBackdropFilter: "blur(20px) saturate(1.4)" }}>
      <div className="space-y-2">
        {open.map((task) => (
          <div key={task.id} className="flex items-center gap-3">
            <button onClick={() => onCompleteTask(task.id)} title="Mark done"
              className="h-6 w-6 shrink-0 rounded-full border-2 border-moss/60 hover:border-moss hover:bg-moss/15 transition" />
            <span className="text-ink">{task.title}</span>
            {task.urgent && <span className="text-xs text-clay">urgent</span>}
          </div>
        ))}
        {open.length === 0 && total > 0 && <div className="text-sm text-moss">All to-dos done 🎉</div>}
        {total === 0 && <div className="text-sm text-ink-faint">No to-dos yet.</div>}
      </div>

      {/* Completed tasks (tucked away) */}
      {done.length > 0 && (
        <div className="mt-3">
          <button onClick={() => setShowDone((s) => !s)} className="text-xs font-medium text-moss">
            {showDone ? "Hide completed" : `Show ${done.length} completed`}
          </button>
          {showDone && (
            <div className="mt-2 space-y-2">
              {done.map((task) => (
                <div key={task.id} className="flex items-center gap-3 text-ink-faint">
                  <button onClick={() => onReopenTask(task.id)} className="text-moss" title="Reopen">●</button>
                  <span className="line-through">{task.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2">
        <input className="input py-2" placeholder={copy.plate.addTask}
          value={t} onChange={(e) => setT(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { onAddTask(t); setT(""); } }} />
        <div className="flex gap-2">
          <Link className="btn-quiet flex-1 whitespace-nowrap" href={`/chat?about=${encodeURIComponent(project.name)}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5h14a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3V7a2 2 0 012-2z" /></svg>
            {copy.plate.addInfo}
          </Link>
          <button className="btn-quiet whitespace-nowrap" onClick={onFinish}>{copy.plate.finish}</button>
        </div>
      </div>
      </div>
      </div>
      </div>
    </div>
  );
}
