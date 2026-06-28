"use client";

import { useEffect, useState } from "react";
import { copy } from "@/lib/copy";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import type { Project, TaskItem } from "@/lib/types";

export default function PlateClient({ userId }: { userId: string }) {
  const sb = createSupabaseBrowser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newProject, setNewProject] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: p }, { data: t }] = await Promise.all([
      sb.from("projects").select("*").eq("is_done", false).order("created_at"),
      sb.from("tasks").select("*").eq("done", false).order("created_at"),
    ]);
    setProjects((p ?? []) as Project[]);
    setTasks((t ?? []) as TaskItem[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

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
    await sb.from("tasks").update({ done: true, completed_at: new Date().toISOString() }).eq("id", id);
    setTasks((ts) => ts.filter((t) => t.id !== id));
  }
  async function finishProject(id: string) {
    await sb.from("projects").update({ is_done: true }).eq("id", id);
    load();
  }

  if (loading) return <div className="on-bg-soft">Loading…</div>;

  return (
    <div className="space-y-5">
      <div className="text-center mb-1">
        <h1 className="font-display text-2xl tracking-[0.18em] text-pine uppercase">{copy.plate.title}</h1>
        <div className="eyebrow mt-1">What matters most</div>
      </div>

      <div className="card p-4 flex gap-2">
        <input className="input" placeholder={copy.plate.addProject}
          value={newProject} onChange={(e) => setNewProject(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addProject()} />
        <button className="btn-primary" onClick={addProject}>Add</button>
      </div>

      {projects.length === 0 && <p className="on-bg-soft">{copy.plate.empty}</p>}

      {projects.map((p) => (
        <ProjectCard key={p.id} project={p}
          tasks={tasks.filter((t) => t.project_id === p.id)}
          onAddTask={(title) => addTask(p.id, title)}
          onCompleteTask={completeTask}
          onFinish={() => finishProject(p.id)} />
      ))}
    </div>
  );
}

function ProjectCard({
  project, tasks, onAddTask, onCompleteTask, onFinish,
}: {
  project: Project;
  tasks: TaskItem[];
  onAddTask: (t: string) => void;
  onCompleteTask: (id: string) => void;
  onFinish: () => void;
}) {
  const [t, setT] = useState("");
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold flex-1">{project.name}</h2>
        <span className="text-sm text-ink-faint">importance {project.importance}/5</span>
      </div>

      <div className="mt-3 space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center gap-3">
            <button onClick={() => onCompleteTask(task.id)} className="text-ink-faint hover:text-moss">○</button>
            <span>{task.title}</span>
            {task.urgent && <span className="text-xs text-clay">urgent</span>}
          </div>
        ))}
        {tasks.length === 0 && <div className="text-sm text-ink-faint">No to-dos yet.</div>}
      </div>

      <div className="mt-4 flex gap-2 items-center">
        <input className="input py-2" placeholder={copy.plate.addTask}
          value={t} onChange={(e) => setT(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { onAddTask(t); setT(""); } }} />
        <button className="btn-quiet" onClick={() => onFinish()}>{copy.plate.finish}</button>
      </div>
    </div>
  );
}
