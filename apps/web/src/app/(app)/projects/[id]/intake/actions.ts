"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/server/auth";
import { getLLMConfig } from "@/server/env";
import { getLLMProvider } from "@/server/llm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  persistAnalysis,
  saveScript,
  updateProjectDirection,
  type CreativeDirection,
} from "@/server/repository";

export interface IntakeState {
  error?: string;
  needsPaidConfirmation?: boolean;
}

function readDirection(formData: FormData): CreativeDirection {
  return {
    styleAndTone: String(formData.get("styleAndTone") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    period: String(formData.get("period") ?? ""),
    aspectRatio: String(formData.get("aspectRatio") ?? ""),
    cinematographyNotes: String(formData.get("cinematographyNotes") ?? ""),
    additionalInstructions: String(formData.get("additionalInstructions") ?? ""),
  };
}

async function resolveScriptText(formData: FormData): Promise<string> {
  const pasted = String(formData.get("scriptText") ?? "").trim();
  if (pasted) return pasted;

  const file = formData.get("scriptFile");
  if (file instanceof File && file.size > 0) {
    // Only attempt to read plain-text scripts (.txt/.fountain/.md).
    if (/text|fountain|markdown|octet-stream/.test(file.type) || /\.(txt|fountain|md)$/i.test(file.name)) {
      const text = (await file.text()).trim();
      if (text) return text;
    }
  }
  return "";
}

async function uploadReferences(
  projectId: string,
  userId: string,
  formData: FormData,
): Promise<void> {
  const files = formData.getAll("references").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return;

  const supabase = await createSupabaseServerClient();
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${userId}/${projectId}/references/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("project-assets")
      .upload(path, file, { upsert: false });
    if (uploadError) continue; // best-effort; don't block analysis on upload issues
    await supabase.from("assets").insert({
      project_id: projectId,
      user_id: userId,
      kind: "reference",
      storage_path: path,
      metadata: { originalName: file.name, contentType: file.type },
    });
  }
}

export async function analyzeScriptAction(
  _prev: IntakeState,
  formData: FormData,
): Promise<IntakeState> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { error: "Missing project." };

  const title = String(formData.get("title") ?? "").trim() || "Untitled project";
  const direction = readDirection(formData);
  const scriptText = await resolveScriptText(formData);

  if (!scriptText) {
    return { error: "Please paste a script or upload a text script file." };
  }

  const provider = getLLMProvider();
  const config = getLLMConfig();
  const confirmedPaid = formData.get("confirmPaid") === "on";

  // Clear cost warning before any paid model call during development.
  if (provider.paid && config.confirmPaidCalls && !confirmedPaid) {
    return {
      needsPaidConfirmation: true,
      error:
        "Analyzing will make a paid request to your language-model provider. Tick the box below to confirm, then analyze again.",
    };
  }

  // Persist intake first so nothing is lost even if analysis fails.
  await updateProjectDirection(projectId, title, direction);
  await saveScript(projectId, user.id, scriptText);
  await uploadReferences(projectId, user.id, formData);

  try {
    const { analysis } = await provider.analyzeScript({
      scriptText,
      creativeDirection: direction,
    });
    await persistAnalysis(projectId, user.id, analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return { error: `Script analysis failed: ${message}` };
  }

  redirect(`/projects/${projectId}/breakdown`);
}
