"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { copy } from "@/lib/copy";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { norm } from "@/lib/data";
import SummitCelebration from "./SummitCelebration";
import type { Project, TaskItem } from "@/lib/types";

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

  const ranked = [...projects].sort(byPriority);

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
        {ranked.length > 1 && <span className="text-[11px] text-ink-faint">Darker = higher priority</span>}
      </div>

      {/* Priority order, top to bottom. Each box is collapsed to its essentials —
          tap to open it up. */}
      {ranked.map((p) => (
        <ProjectCard key={p.id} project={p} highlighted={highlight === p.id}
          accent={priorityShade(p.importance)} defaultOpen={highlight === p.id}
          tasks={tasks.filter((t) => t.project_id === p.id)}
          onAddTask={(title) => addTask(p.id, title)}
          onCompleteTask={completeTask}
          onReopenTask={reopenTask}
          onFinish={() => finishProject(p.id, p.name)} />
      ))}

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

  const open = tasks.filter((task) => !task.done);
  const done = tasks.filter((task) => task.done);
  const total = tasks.length;
  const pct = total ? Math.round((done.length / total) * 100) : 0;

  // Higher-priority shades are dark → light text; lighter shades → dark text.
  const dark = project.importance >= 3;
  const ink = dark ? "text-white" : "text-pine-darkest";
  const inkSoft = dark ? "text-white/75" : "text-pine/70";

  return (
    <div id={`proj-${project.id}`}
      className={`overflow-hidden rounded-[24px] scroll-mt-24 shadow-soft transition ${highlighted ? "ring-2 ring-sage shadow-lift" : ""}`}
      style={{ background: accent }}>
      {/* The whole rectangle carries the priority shade. Tap to expand. */}
      <button onClick={() => setExpanded((e) => !e)}
        className="w-full text-left flex items-center gap-3 p-5">
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
                  style={{ width: `${pct}%`, background: dark ? "#DAF1DE" : "#0B2B26" }} />
              </div>
            </>
          )}
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`shrink-0 transition-transform ${inkSoft} ${expanded ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded body drops to a readable light panel so to-dos and inputs stay legible. */}
      {!expanded ? null : (
      <div className="bg-white/85 px-5 py-5">
      <div className="space-y-2">
        {open.map((task) => (
          <div key={task.id} className="flex items-center gap-3">
            <button onClick={() => onCompleteTask(task.id)} className="text-ink-faint hover:text-moss" title="Mark done">○</button>
            <span>{task.title}</span>
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
      )}
    </div>
  );
}
