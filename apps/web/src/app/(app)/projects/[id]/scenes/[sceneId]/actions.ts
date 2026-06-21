"use server";

import { redirect } from "next/navigation";

import { PromptCompilerInputSchema, type ProductionStage } from "@scenearc/shared";

import { requireUser } from "@/server/auth";
import { compilePromptPackage } from "@/server/prompt-compiler";
import { getProject, getSceneDetail, savePromptPackage } from "@/server/repository";

export interface CreatePromptState {
  error?: string;
}

export async function createPromptPackageAction(
  _prev: CreatePromptState,
  formData: FormData,
): Promise<CreatePromptState> {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  const sceneId = String(formData.get("sceneId") ?? "");
  if (!projectId || !sceneId) return { error: "Missing project or scene." };

  const [project, scene] = await Promise.all([getProject(projectId), getSceneDetail(sceneId)]);
  if (!project || !scene) return { error: "Scene not found." };

  const stage = (String(formData.get("stage") ?? "scene_still") as ProductionStage) ?? "scene_still";
  const userInstructions = String(formData.get("userInstructions") ?? "");
  const beatOrderRaw = String(formData.get("beatOrder") ?? "");
  const beatOrder = beatOrderRaw ? Number(beatOrderRaw) : null;
  const beat =
    beatOrder != null ? scene.beats.find((b) => b.order === beatOrder) ?? undefined : undefined;

  // Attach each character's wardrobe notes.
  const characters = scene.characters.map((c) => ({
    key: c.key,
    name: c.name,
    description: c.description,
    wardrobe: scene.wardrobe
      .filter((w) => !w.characterKey || w.characterKey === c.key)
      .map((w) => w.description),
  }));

  const input = PromptCompilerInputSchema.parse({
    creativeDirection: project.creative_direction,
    scene: {
      number: scene.number,
      slugline: scene.slugline,
      summary: scene.summary,
      timeOfDay: scene.timeOfDay,
      locationName: scene.location?.name,
      locationDescription: scene.location?.description,
      props: scene.props,
      continuityNotes: scene.continuityNotes,
    },
    characters,
    beat,
    productionStage: stage,
    targetPlatform: "generic_image_generator",
    userInstructions,
  });

  let packageId: string;
  try {
    const pkg = compilePromptPackage(input);
    packageId = await savePromptPackage({
      projectId,
      userId: user.id,
      sceneId,
      stage,
      targetPlatform: "generic_image_generator",
      payload: pkg,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create the prompt package." };
  }

  redirect(`/projects/${projectId}/scenes/${sceneId}/package/${packageId}`);
}
