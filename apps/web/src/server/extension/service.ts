import "server-only";

import type {
  ExtensionActiveTask,
  ExtensionReference,
  ImportResultRequest,
  PromptPackage,
  ResultDecision,
} from "@scenearc/shared";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

const BUCKET = "project-assets";

/** Build the active-task payload the extension shows. Service-role; scoped to userId. */
export async function getActiveTaskForUser(userId: string): Promise<ExtensionActiveTask | null> {
  const supabase = createSupabaseServiceClient();
  const { data: task } = await supabase
    .from("generation_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!task) return null;

  const [{ data: project }, { data: pkg }, scene] = await Promise.all([
    supabase.from("projects").select("title").eq("id", task.project_id).maybeSingle(),
    task.prompt_package_id
      ? supabase.from("prompt_packages").select("payload").eq("id", task.prompt_package_id).maybeSingle()
      : Promise.resolve({ data: null }),
    task.scene_id
      ? supabase.from("scenes").select("number, slugline").eq("id", task.scene_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const payload = (pkg?.payload ?? null) as PromptPackage | null;
  const references: ExtensionReference[] = (payload?.requiredReferences ?? []).map((r) => ({
    label: r.label,
    kind: r.kind,
    required: r.required,
  }));

  const sceneRow = scene.data as { number?: string; slugline?: string } | null;

  return {
    taskId: task.id,
    projectId: task.project_id,
    projectTitle: project?.title ?? "Project",
    sceneId: task.scene_id ?? null,
    sceneNumber: sceneRow?.number ?? null,
    sceneSlugline: sceneRow?.slugline ?? null,
    stage: task.stage,
    targetPlatform: task.target_platform,
    status: task.status,
    prompt: payload?.prompt ?? "",
    shotSummary: payload?.shotSummary ?? "",
    references,
  };
}

interface ParsedDataUrl {
  buffer: Buffer;
  contentType: string;
  ext: string;
}

function parseDataUrl(dataUrl: string): ParsedDataUrl | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const contentType = match[1]!;
  const buffer = Buffer.from(match[2]!, "base64");
  const ext = contentType.split("/")[1]?.split("+")[0] ?? "bin";
  return { buffer, contentType, ext };
}

export async function importResult(userId: string, req: ImportResultRequest): Promise<string> {
  const supabase = createSupabaseServiceClient();

  const { data: task } = await supabase
    .from("generation_tasks")
    .select("id, user_id, project_id, scene_id, prompt_package_id")
    .eq("id", req.taskId)
    .maybeSingle();

  if (!task || task.user_id !== userId) {
    throw new Error("Task not found.");
  }

  let storagePath: string | null = null;
  const sourceUrl = req.sourceUrl ?? null;

  if (req.dataUrl) {
    const parsed = parseDataUrl(req.dataUrl);
    if (!parsed) throw new Error("Invalid image data.");
    const path = `${userId}/${task.project_id}/results/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${parsed.ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, parsed.buffer, { contentType: parsed.contentType, upsert: false });
    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);
    storagePath = path;
  }

  if (!storagePath && !sourceUrl) {
    throw new Error("No result data provided.");
  }

  // Record an asset for the file (when stored).
  let assetId: string | null = null;
  if (storagePath) {
    const { data: asset } = await supabase
      .from("assets")
      .insert({
        project_id: task.project_id,
        user_id: userId,
        scene_id: task.scene_id,
        kind: "result",
        storage_path: storagePath,
        metadata: { source: req.source, kind: req.kind },
      })
      .select("id")
      .single();
    assetId = asset?.id ?? null;
  }
  void assetId;

  const { data: result, error } = await supabase
    .from("generation_results")
    .insert({
      task_id: task.id,
      project_id: task.project_id,
      user_id: userId,
      scene_id: task.scene_id,
      prompt_package_id: task.prompt_package_id,
      kind: req.kind,
      source: req.source,
      storage_path: storagePath,
      source_url: sourceUrl,
      status: "imported",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase.from("generation_tasks").update({ status: "imported" }).eq("id", task.id);

  return result.id;
}

export async function decideOnResult(
  userId: string,
  resultId: string,
  decision: ResultDecision,
  notes?: string,
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { data: result } = await supabase
    .from("generation_results")
    .select("id, user_id, task_id, project_id, scene_id")
    .eq("id", resultId)
    .maybeSingle();
  if (!result || result.user_id !== userId) throw new Error("Result not found.");

  await supabase
    .from("generation_results")
    .update({ status: decision, notes: notes ?? "" })
    .eq("id", resultId);

  if (decision === "revision_requested") {
    await supabase.from("revision_requests").insert({
      project_id: result.project_id,
      user_id: userId,
      subject_type: "generation_result",
      subject_id: resultId,
      notes: notes ?? "",
    });
  } else if (decision === "approved") {
    await supabase.from("approvals").insert({
      project_id: result.project_id,
      user_id: userId,
      subject_type: "generation_result",
      subject_id: resultId,
      status: "approved",
    });
  }

  await supabase.from("generation_tasks").update({ status: decision }).eq("id", result.task_id);
}

export interface StoredResult {
  id: string;
  kind: string;
  source: string;
  status: string;
  url: string | null;
  createdAt: string;
}

/** List results for a task with short-lived signed URLs for display. */
export async function listResultsForTask(userId: string, taskId: string): Promise<StoredResult[]> {
  const supabase = createSupabaseServiceClient();
  const { data: rows } = await supabase
    .from("generation_results")
    .select("*")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const results: StoredResult[] = [];
  for (const r of rows ?? []) {
    let url: string | null = r.source_url ?? null;
    if (r.storage_path) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(r.storage_path, 3600);
      url = signed?.signedUrl ?? url;
    }
    results.push({
      id: r.id,
      kind: r.kind,
      source: r.source,
      status: r.status,
      url,
      createdAt: r.created_at,
    });
  }
  return results;
}
