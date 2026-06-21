"use server";

import { revalidatePath } from "next/cache";

import { ScriptAnalysisSchema } from "@scenearc/shared";

import { requireUser } from "@/server/auth";
import { approveBreakdown, persistAnalysis } from "@/server/repository";

export interface SaveBreakdownState {
  error?: string;
  savedAt?: number;
}

export async function saveBreakdownAction(
  _prev: SaveBreakdownState,
  formData: FormData,
): Promise<SaveBreakdownState> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { error: "Missing project." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(String(formData.get("analysis") ?? "{}"));
  } catch {
    return { error: "Could not read the edited breakdown." };
  }

  const result = ScriptAnalysisSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    return { error: first ? `Invalid breakdown: ${first.message}` : "Invalid breakdown." };
  }

  try {
    await persistAnalysis(projectId, user.id, result.data);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save the breakdown." };
  }

  revalidatePath(`/projects/${projectId}/breakdown`);
  return { savedAt: Date.now() };
}

export interface ApproveState {
  error?: string;
  approved?: boolean;
}

export async function approveBreakdownAction(
  _prev: ApproveState,
  formData: FormData,
): Promise<ApproveState> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { error: "Missing project." };

  try {
    await approveBreakdown(projectId, user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not approve the breakdown." };
  }

  revalidatePath(`/projects/${projectId}/breakdown`);
  return { approved: true };
}
