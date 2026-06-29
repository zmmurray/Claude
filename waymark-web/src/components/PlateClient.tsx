"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { copy } from "@/lib/copy";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import type { Project, TaskItem } from "@/lib/types";

export default function PlateClient({ userId }: { userId: string }) {
  const sb = createSupabaseBrowser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [summary, setSummary] = useState("");
  const [newProject, setNewProject] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: p }, { data: t }, { data: snap }] = await Promise.all([
      sb.from("projects").select("*").eq("is_done", false).order("created_at"),
      sb.from("tasks").select("*").order("created_at"),
      sb.from("focus_snapshots").select("gist").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setSummary((snap?.gist as string) ?? "");
    // Collapse any accidental duplicate projects (same name) and to-dos
    // (same title within a project) so they show once.
    const seenP = new Set<string>();
    const projs = ((p ?? []) as Project[]).filter((pr) => {
      const k = pr.name.trim().toLowerCase();
      if (seenP.has(k)) return false;
      seenP.add(k); return true;
    });
    const seenT = new Set<string>();
    const tsks = ((t ?? []) as TaskItem[]).filter((tk) => {
      const k = `${tk.project_id}::${tk.title.trim().toLowerCase()}`;
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

  async function addProject() {
    const name = newProject.trim();
    if (!name) return;
    setNewProject("");
    await sb.from("projects").insert({ user_id: userId, name, importance: 3 });
    load();
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
    if (!window.confirm(`Close out “${name}”? It'll move off your list.`)) return;
    await sb.from("projects").update({ is_done: true }).eq("id", id);
    load();
  }

  if (loading) return <div className="on-bg-soft">Loading…</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold uppercase tracking-[0.1em] text-pine">{copy.plate.title}</h1>

      {summary && (
        <div className="card p-4">
          <div className="eyebrow mb-1.5">Priorities right now</div>
          <p className="text-ink-soft text-sm leading-relaxed">{summary}</p>
        </div>
      )}

      <div className="card p-4 flex gap-2">
        <input className="input" placeholder={copy.plate.addProject}
          value={newProject} onChange={(e) => setNewProject(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addProject()} />
        <button className="btn-primary" onClick={addProject}>Add</button>
      </div>

      {projects.length === 0 && <p className="on-bg-soft">{copy.plate.empty}</p>}

      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} highlighted={highlight === p.id}
          tasks={tasks.filter((t) => t.project_id === p.id)}
          onAddTask={(title) => addTask(p.id, title)}
          onCompleteTask={completeTask}
          onReopenTask={reopenTask}
          onFinish={() => finishProject(p.id, p.name)} />
      ))}
    </div>
  );
}

function ProjectCard({
  project, tasks, onAddTask, onCompleteTask, onReopenTask, onFinish, highlighted,
}: {
  project: Project;
  tasks: TaskItem[];
  onAddTask: (t: string) => void;
  onCompleteTask: (id: string) => void;
  onReopenTask: (id: string) => void;
  onFinish: () => void;
  highlighted?: boolean;
}) {
  const [t, setT] = useState("");
  const [showDone, setShowDone] = useState(false);

  const open = tasks.filter((task) => !task.done);
  const done = tasks.filter((task) => task.done);
  const total = tasks.length;
  const pct = total ? Math.round((done.length / total) * 100) : 0;

  return (
    <div id={`proj-${project.id}`}
      className={`card p-5 scroll-mt-24 transition ${highlighted ? "ring-2 ring-sage shadow-lift" : ""}`}>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold flex-1">{project.name}</h2>
        <span className="text-sm text-ink-faint">importance {project.importance}/5</span>
      </div>

      {project.notes?.trim() && (
        <p className="text-sm text-ink-soft mt-1.5 whitespace-pre-line leading-relaxed">{project.notes.trim()}</p>
      )}

      {/* Progress toward done */}
      {total > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-ink-faint mb-1.5">
            <span>{done.length} of {total} done</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-moss/15 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg,#8EB69B,#235347)" }} />
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2">
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
  );
}
