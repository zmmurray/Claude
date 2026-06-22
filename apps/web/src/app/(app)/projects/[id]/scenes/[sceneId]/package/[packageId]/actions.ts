"use server";

import { revalidatePath } from "next/cache";

import { ResultDecision } from "@scenearc/shared";

import { requireUser } from "@/server/auth";
import { decideOnResult } from "@/server/extension/service";
import { resolveFreepikKey } from "@/server/generation/credentials";
import { getSourceImageUrl, runFreepikPoll, runFreepikSubmit } from "@/server/generation/run";
import { getGenerationProvider } from "@/server/generation";
import { createGenerationTask, getPromptPackage, getTaskForPackage } from "@/server/repository";

function revalidate(projectId: string, sceneId: string, packageId: string) {
  revalidatePath(`/projects/${projectId}/scenes/${sceneId}/package/${packageId}`);
}

export async function startTaskAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  const sceneId = String(formData.get("sceneId") ?? "");
  const packageId = String(formData.get("packageId") ?? "");
  const stage = String(formData.get("stage") ?? "scene_still");
  if (!projectId || !packageId) return;

  await createGenerationTask({
    projectId,
    userId: user.id,
    sceneId: sceneId || null,
    promptPackageId: packageId,
    stage,
    targetPlatform: "generic_image_generator",
  });
  revalidate(projectId, sceneId, packageId);
}

export async function decideResultAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const resultId = String(formData.get("resultId") ?? "");
  const decisionRaw = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const sceneId = String(formData.get("sceneId") ?? "");
  const packageId = String(formData.get("packageId") ?? "");

  const decision = ResultDecision.safeParse(decisionRaw);
  if (!resultId || !decision.success) return;

  await decideOnResult(user.id, resultId, decision.data, notes);
  revalidate(projectId, sceneId, packageId);
}

export interface GenerateState {
  error?: string;
  status?: "processing" | "completed" | "failed";
}

export async function generateWithFreepikAction(
  _prev: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  const sceneId = String(formData.get("sceneId") ?? "");
  const packageId = String(formData.get("packageId") ?? "");
  const modelId = String(formData.get("modelId") ?? "");
  const confirmedPaid = formData.get("confirmPaid") === "on";
  if (!projectId || !packageId || !modelId) return { error: "Missing required fields." };
  if (!confirmedPaid) {
    return { error: "Please confirm you understand this uses your Freepik credits." };
  }

  const apiKey = await resolveFreepikKey(user.id);
  if (!apiKey) {
    return { error: "No Freepik API key found. Add one in Settings → Generation." };
  }

  const pkg = await getPromptPackage(packageId);
  if (!pkg) return { error: "Prompt package not found." };
  const prompt = pkg.payload.prompt;
  const aspectRatio = pkg.payload.suggestedSettings.find(
    (s) => s.label.toLowerCase().includes("aspect"),
  )?.value;

  const model = getGenerationProvider()
    .listModels()
    .find((m) => m.id === modelId);
  if (!model) return { error: "Unknown model." };

  // Ensure a task exists for this package.
  const existing = await getTaskForPackage(packageId);
  const taskRowId =
    existing?.id ??
    (await createGenerationTask({
      projectId,
      userId: user.id,
      sceneId: sceneId || null,
      promptPackageId: packageId,
      stage: pkg.stage,
      targetPlatform: "generic_image_generator",
    }));

  let imageUrl: string | undefined;
  if (model.needsSourceImage) {
    imageUrl = await getSourceImageUrl(user.id, sceneId || null);
    if (!imageUrl) {
      return { error: "Generate and import an image for this scene first, then create the video." };
    }
  }

  const result = await runFreepikSubmit({
    userId: user.id,
    taskRowId,
    apiKey,
    modelId,
    prompt,
    imageUrl,
    aspectRatio,
  });

  revalidate(projectId, sceneId, packageId);
  return { status: result.status, error: result.error };
}

export async function checkFreepikStatusAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  const sceneId = String(formData.get("sceneId") ?? "");
  const packageId = String(formData.get("packageId") ?? "");
  const taskRowId = String(formData.get("taskRowId") ?? "");
  if (!taskRowId) return;
  const apiKey = await resolveFreepikKey(user.id);
  if (!apiKey) return;
  await runFreepikPoll({ userId: user.id, taskRowId, apiKey });
  revalidate(projectId, sceneId, packageId);
}
