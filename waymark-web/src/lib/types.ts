export type DeadlineType = "none" | "soft" | "hard";
export type Effort = "quick" | "medium" | "deep";

export interface Goal { id: string; name: string; notes: string; created_at: string; }

export interface Project {
  id: string;
  goal_id: string | null;
  name: string;
  importance: number; // 1..5
  deadline_type: DeadlineType;
  deadline: string | null; // yyyy-mm-dd
  notes: string;
  is_done: boolean;
  created_at: string;
}

export interface TaskItem {
  id: string;
  project_id: string;
  title: string;
  done: boolean;
  urgent: boolean;
  effort: Effort;
  created_at: string;
  completed_at: string | null;
}

/** One line of the strategist's recommendation. */
export interface FocusItem {
  title: string;          // what to do (a task title, usually)
  why: string;            // one-line rationale
  kind: "needle" | "quick" | "admin"; // needle-mover vs quick must-do vs admin
  project?: string;       // quest/project name for context
  taskId?: string;        // links back to a task if applicable
}

export interface FocusSnapshot {
  id: string;
  gist: string;
  items: FocusItem[];
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

/** Structured updates the strategist can apply to the user's world. */
export interface ContextUpdate {
  /** A concise running "about me": situation, life goals, constraints, what they're after. */
  context?: string;
  goals?: { name: string; notes?: string }[];
  projects?: {
    name: string;
    goal?: string;
    importance?: number;
    deadlineType?: DeadlineType;
    deadline?: string;
    notes?: string;
    tasks?: { title: string; urgent?: boolean; effort?: Effort }[];
  }[];
}
