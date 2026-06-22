import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

import { getGenerationProvider } from "./index";
import type { GenerationAsset } from "./types";

const BUCKET = "project-assets";

interface TaskRow {
  id: string;
  user_id: string;
  project_id: string;
  scene_id: string | null;
  prompt_package_id: string | null;
  provider_model: string | null;
  provider_task_id: string | null;
}

async function loadTask(userId: string, taskRowId: string): Promise<TaskRow> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("generation_tasks")
    .select("id, user_id, project_id, scene_id, prompt_package_id, provider_model, provider_task_id")
    .eq("id", taskRowId)
    .maybeSingle();
  if (!data || data.user_id !== userId) throw new Error("Task not found.");
  return data as TaskRow;
}

function extFromContentType(ct: string): string {
  if (ct.includes("mp4")) return "mp4";
  if (ct.includes("webm")) return "webm";
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("svg")) return "svg";
  return "bin";
}

/** Persist one generated asset: download it into our storage, then record it. */
async function storeAsset(task: TaskRow, asset: GenerationAsset): Promise<void> {
  const supabase = createSupabaseServiceClient();
  let storagePath: string | null = null;
  let sourceUrl: string | null = null;

  try {
    let buffer: Buffer;
    let contentType: string;
    if (asset.url.startsWith("data:")) {
      const m = asset.url.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) throw new Error("bad data url");
      contentType = m[1]!;
      buffer = Buffer.from(m[2]!, "base64");
    } else {
      const res = await fetch(asset.url);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      contentType = res.headers.get("content-type") ?? (asset.kind === "video" ? "video/mp4" : "image/png");
      buffer = Buffer.from(await res.arrayBuffer());
      sourceUrl = asset.url;
    }
    const path = `${task.user_id}/${task.project_id}/results/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${extFromContentType(contentType)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType });
    if (error) throw new Error(error.message);
    storagePath = path;
  } catch {
    // If we couldn't download/store it, keep the source URL as a fallback.
    sourceUrl = asset.url.startsWith("data:") ? null : asset.url;
  }

  if (!storagePath && !sourceUrl) return;

  await supabase.from("generation_results").insert({
    task_id: task.id,
    project_id: task.project_id,
    user_id: task.user_id,
    scene_id: task.scene_id,
    prompt_package_id: task.prompt_package_id,
    kind: asset.kind,
    source: "freepik",
    storage_path: storagePath,
    source_url: sourceUrl,
    status: "imported",
  });
}

async function setTask(taskRowId: string, patch: Record<string, unknown>): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase.from("generation_tasks").update(patch).eq("id", taskRowId);
}

export interface RunResult {
  status: "processing" | "completed" | "failed";
  error?: string;
}

/** Submit a generation to Freepik. Stores results immediately if returned. */
export async function runFreepikSubmit(args: {
  userId: string;
  taskRowId: string;
  apiKey: string;
  modelId: string;
  prompt: string;
  imageUrl?: string;
  aspectRatio?: string;
}): Promise<RunResult> {
  const task = await loadTask(args.userId, args.taskRowId);
  const provider = getGenerationProvider();

  await setTask(args.taskRowId, {
    provider: provider.id,
    provider_model: args.modelId,
    provider_status: "SUBMITTED",
    status: "generating",
    error_message: null,
  });

  try {
    const result = await provider.submit({
      apiKey: args.apiKey,
      modelId: args.modelId,
      prompt: args.prompt,
      imageUrl: args.imageUrl,
      aspectRatio: args.aspectRatio,
    });

    if (result.assets && result.assets.length > 0) {
      for (const asset of result.assets) await storeAsset(task, asset);
      await setTask(args.taskRowId, { status: "imported", provider_status: "COMPLETED" });
      return { status: "completed" };
    }

    if (result.taskId) {
      await setTask(args.taskRowId, {
        provider_task_id: result.taskId,
        provider_status: "PROCESSING",
      });
      return { status: "processing" };
    }

    await setTask(args.taskRowId, { status: "failed", provider_status: "FAILED" });
    return { status: "failed", error: "No result returned." };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed.";
    await setTask(args.taskRowId, { status: "failed", provider_status: "FAILED", error_message: message });
    return { status: "failed", error: message };
  }
}

/** Poll an in-progress Freepik job; import results when complete. */
export async function runFreepikPoll(args: {
  userId: string;
  taskRowId: string;
  apiKey: string;
}): Promise<RunResult> {
  const task = await loadTask(args.userId, args.taskRowId);
  if (!task.provider_model || !task.provider_task_id) {
    return { status: "failed", error: "This task has no pending Freepik job." };
  }
  const provider = getGenerationProvider();

  try {
    const result = await provider.poll({
      apiKey: args.apiKey,
      modelId: task.provider_model,
      taskId: task.provider_task_id,
    });

    if (result.status === "completed") {
      for (const asset of result.assets) await storeAsset(task, asset);
      await setTask(args.taskRowId, { status: "imported", provider_status: "COMPLETED" });
      return { status: "completed" };
    }
    if (result.status === "failed") {
      await setTask(args.taskRowId, {
        status: "failed",
        provider_status: "FAILED",
        error_message: result.error ?? "Generation failed.",
      });
      return { status: "failed", error: result.error };
    }
    return { status: "processing" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Polling failed.";
    return { status: "failed", error: message };
  }
}

/** Find a recent image result for a scene to use as a video source (signed URL). */
export async function getSourceImageUrl(userId: string, sceneId: string | null): Promise<string | undefined> {
  if (!sceneId) return undefined;
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("generation_results")
    .select("storage_path, source_url, kind, status, created_at")
    .eq("user_id", userId)
    .eq("scene_id", sceneId)
    .eq("kind", "image")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return undefined;
  if (data.storage_path) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.storage_path, 3600);
    return signed?.signedUrl ?? data.source_url ?? undefined;
  }
  return data.source_url ?? undefined;
}
