import { z } from "zod";
import { ProductionStage, TimeOfDay } from "./enums";

/**
 * A short, URL/ref-safe key used to link entities together within a single
 * analysis (e.g. a scene references characters by their `key`). Keys are stable
 * across edits so relationships survive user editing.
 */
const EntityKey = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9_-]*$/i, "Keys may contain letters, numbers, _ and -");

/** A character identified in the script. */
export const CharacterSchema = z.object({
  key: EntityKey,
  name: z.string().min(1).max(200),
  description: z.string().max(4000).default(""),
  /** Free-text relationships to other characters, e.g. "Sister of MAYA". */
  relationships: z.array(z.string().max(500)).default([]),
});
export type Character = z.infer<typeof CharacterSchema>;

/** A location identified in the script. */
export const LocationSchema = z.object({
  key: EntityKey,
  name: z.string().min(1).max(200),
  description: z.string().max(4000).default(""),
});
export type Location = z.infer<typeof LocationSchema>;

/** A single beat (story moment) within a scene. */
export const SceneBeatSchema = z.object({
  /** 1-based ordering within the scene. */
  order: z.number().int().min(1),
  description: z.string().min(1).max(2000),
});
export type SceneBeat = z.infer<typeof SceneBeatSchema>;

/** A wardrobe note, optionally tied to a specific character. */
export const WardrobeNoteSchema = z.object({
  /** Optional reference to a character key; omit for general wardrobe notes. */
  characterKey: EntityKey.optional(),
  description: z.string().min(1).max(1000),
});
export type WardrobeNote = z.infer<typeof WardrobeNoteSchema>;

/** A single line of dialogue, optionally attributed to a character. */
export const DialogueLineSchema = z.object({
  /** Optional reference to the speaking character's key. */
  characterKey: EntityKey.optional(),
  line: z.string().min(1).max(2000),
});
export type DialogueLine = z.infer<typeof DialogueLineSchema>;

/** A scene in the script with its full breakdown. */
export const SceneSchema = z.object({
  key: EntityKey,
  /** Display scene number, e.g. "1", "12A". Kept as a string for flexibility. */
  number: z.string().min(1).max(20),
  /** Optional slug line, e.g. "INT. KITCHEN - NIGHT". */
  slugline: z.string().max(300).default(""),
  summary: z.string().max(4000).default(""),
  /** Reference to a location key, if one was identified. */
  locationKey: EntityKey.optional(),
  timeOfDay: TimeOfDay.default("UNSPECIFIED"),
  /** Characters appearing in this scene, by key. */
  characterKeys: z.array(EntityKey).default([]),
  props: z.array(z.string().max(500)).default([]),
  wardrobe: z.array(WardrobeNoteSchema).default([]),
  continuityNotes: z.array(z.string().max(1000)).default([]),
  beats: z.array(SceneBeatSchema).default([]),
  /** Dialogue lines spoken in this scene, in order. */
  dialogue: z.array(DialogueLineSchema).default([]),
  /** Generation stages SceneArc suggests for this scene. */
  suggestedStages: z.array(ProductionStage).default([]),
});
export type Scene = z.infer<typeof SceneSchema>;

/**
 * The complete, validated structured breakdown of a script. This is the single
 * source of truth returned by any LLM provider (mock or real) and edited by the
 * user before approval.
 */
export const ScriptAnalysisSchema = z
  .object({
    characters: z.array(CharacterSchema).default([]),
    locations: z.array(LocationSchema).default([]),
    scenes: z.array(SceneSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const characterKeys = new Set(data.characters.map((c) => c.key));
    const locationKeys = new Set(data.locations.map((l) => l.key));

    // Character keys must be unique.
    assertUniqueKeys(data.characters, ctx, ["characters"]);
    assertUniqueKeys(data.locations, ctx, ["locations"]);
    assertUniqueKeys(data.scenes, ctx, ["scenes"]);

    // Scene references must point at entities that exist.
    data.scenes.forEach((scene, sceneIndex) => {
      if (scene.locationKey && !locationKeys.has(scene.locationKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Scene "${scene.number}" references unknown location "${scene.locationKey}".`,
          path: ["scenes", sceneIndex, "locationKey"],
        });
      }
      scene.characterKeys.forEach((characterKey, ckIndex) => {
        if (!characterKeys.has(characterKey)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Scene "${scene.number}" references unknown character "${characterKey}".`,
            path: ["scenes", sceneIndex, "characterKeys", ckIndex],
          });
        }
      });
    });
  });
export type ScriptAnalysis = z.infer<typeof ScriptAnalysisSchema>;

function assertUniqueKeys(
  items: ReadonlyArray<{ key: string }>,
  ctx: z.RefinementCtx,
  basePath: (string | number)[],
): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (seen.has(item.key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate key "${item.key}".`,
        path: [...basePath, index, "key"],
      });
    }
    seen.add(item.key);
  });
}

/** Token / cost accounting for a single LLM call. */
export const LLMUsageSchema = z.object({
  inputTokens: z.number().int().min(0).default(0),
  outputTokens: z.number().int().min(0).default(0),
  /** Estimated cost in USD, when calculable. */
  estimatedCostUsd: z.number().min(0).default(0),
  /** Whether this was a real paid call (false for mock). */
  paid: z.boolean().default(false),
});
export type LLMUsage = z.infer<typeof LLMUsageSchema>;

/** Inputs the analyzer receives (creative direction + script). */
export const ScriptAnalysisInputSchema = z.object({
  scriptText: z.string().min(1, "Script text is required."),
  creativeDirection: z
    .object({
      styleAndTone: z.string().max(4000).default(""),
      genre: z.string().max(200).default(""),
      period: z.string().max(200).default(""),
      aspectRatio: z.string().max(50).default(""),
      cinematographyNotes: z.string().max(4000).default(""),
      additionalInstructions: z.string().max(4000).default(""),
    })
    .default({}),
});
export type ScriptAnalysisInput = z.infer<typeof ScriptAnalysisInputSchema>;
