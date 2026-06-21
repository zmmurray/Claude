import "server-only";

import {
  PromptPackageSchema,
  type PromptCompilerInput,
  type PromptPackage,
  type RequiredReference,
} from "@scenearc/shared";

/**
 * PROPRIETARY PROMPT-COMPILER LOGIC — SERVER ONLY.
 *
 * Turns project creative direction + a scene (with beats, characters, location,
 * wardrobe, props, continuity) into a ready-to-use prompt package. This is a
 * deterministic, replaceable module; later phases may swap in richer logic or
 * per-platform variants. The master phrasing here is never shipped to the
 * client.
 */

const STAGE_INTENT: Record<string, string> = {
  character_design: "a clean character reference portrait",
  location_design: "an establishing location reference image",
  scene_still: "a cinematic scene still",
  frameburst: "a sequence of consistent frames for motion",
  video_lowres: "a low-resolution motion draft",
  video_final: "a final-resolution shot",
};

function readableTimeOfDay(value: string): string {
  return value.toLowerCase().replace(/_/g, " ");
}

export function compilePromptPackage(input: PromptCompilerInput): PromptPackage {
  const { creativeDirection: cd, scene, characters, beat } = input;
  const intent = STAGE_INTENT[input.productionStage] ?? "a cinematic image";

  // --- Build the main prompt -------------------------------------------------
  const parts: string[] = [];

  parts.push(
    `Create ${intent} for Scene ${scene.number}${scene.slugline ? ` — ${scene.slugline}` : ""}.`,
  );

  if (beat) {
    parts.push(`Moment: ${beat.description}`);
  } else if (scene.summary) {
    parts.push(`Scene: ${scene.summary}`);
  }

  if (scene.locationName) {
    const loc = scene.locationDescription
      ? `${scene.locationName} — ${scene.locationDescription}`
      : scene.locationName;
    parts.push(`Location: ${loc}.`);
  }

  parts.push(`Time of day: ${readableTimeOfDay(scene.timeOfDay)}.`);

  if (characters.length > 0) {
    const charLines = characters.map((c) => {
      const wardrobe = c.wardrobe.length > 0 ? ` Wardrobe: ${c.wardrobe.join("; ")}.` : "";
      const desc = c.description ? ` ${c.description}` : "";
      return `- ${c.name}:${desc}${wardrobe}`;
    });
    parts.push(`Characters present:\n${charLines.join("\n")}`);
  }

  if (scene.props.length > 0) {
    parts.push(`Key props: ${scene.props.join(", ")}.`);
  }

  const styleBits = [
    cd.styleAndTone && `Style & tone: ${cd.styleAndTone}.`,
    cd.genre && `Genre: ${cd.genre}.`,
    cd.period && `Period: ${cd.period}.`,
    cd.cinematographyNotes && `Cinematography: ${cd.cinematographyNotes}.`,
  ].filter(Boolean);
  if (styleBits.length > 0) {
    parts.push(styleBits.join(" "));
  }

  if (scene.continuityNotes.length > 0) {
    parts.push(`Continuity to respect: ${scene.continuityNotes.join("; ")}.`);
  }

  if (input.userInstructions) {
    parts.push(`Additional direction: ${input.userInstructions}`);
  }

  const prompt = parts.join("\n\n");

  // --- Shot summary ----------------------------------------------------------
  const shotSummary = beat
    ? `Scene ${scene.number}, beat ${beat.order}: ${truncate(beat.description, 120)}`
    : `Scene ${scene.number}: ${truncate(scene.summary || scene.slugline || "Scene still", 120)}`;

  // --- Required references ----------------------------------------------------
  const requiredReferences: RequiredReference[] = [];
  for (const c of characters) {
    requiredReferences.push({
      label: `Character reference: ${c.name}`,
      kind: "character",
      entityKey: c.key,
      required: true,
    });
  }
  if (scene.locationName) {
    requiredReferences.push({
      label: `Location reference: ${scene.locationName}`,
      kind: "location",
      required: false,
    });
  }

  // --- Suggested settings -----------------------------------------------------
  const suggestedSettings = [
    cd.aspectRatio
      ? { label: "Aspect ratio", value: cd.aspectRatio }
      : { label: "Aspect ratio", value: "16:9" },
    { label: "Render quality", value: "High" },
  ];

  // --- Notes ------------------------------------------------------------------
  const notes = [
    "Review and adjust the prompt before generating — you remain in creative control.",
    "SceneArc does not generate images. Run this on your chosen platform manually.",
  ];
  if (requiredReferences.some((r) => r.required)) {
    notes.push("Attach the required character references to keep designs consistent.");
  }

  const result: PromptPackage = {
    prompt,
    shotSummary,
    requiredReferences,
    suggestedSettings,
    productionStage: input.productionStage,
    targetPlatform: input.targetPlatform,
    notes,
  };

  // Validate our own output so a bug can never persist an invalid package.
  return PromptPackageSchema.parse(result);
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
