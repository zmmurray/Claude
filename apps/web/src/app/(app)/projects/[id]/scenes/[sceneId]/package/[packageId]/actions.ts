"use server";

import { revalidatePath } from "next/cache";

import { ResultDecision } from "@scenearc/shared";

import { requireUser } from "@/server/auth";
import { decideOnResult } from "@/server/extension/service";
import { createGenerationTask } from "@/server/repository";

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
