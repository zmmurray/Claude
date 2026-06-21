import { z } from "zod";

/**
 * Time of day for a scene. Mirrors common screenplay slug-line conventions
 * plus an "unspecified" fallback so analysis never fails on odd input.
 */
export const TimeOfDay = z.enum([
  "DAY",
  "NIGHT",
  "DAWN",
  "DUSK",
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "CONTINUOUS",
  "UNSPECIFIED",
]);
export type TimeOfDay = z.infer<typeof TimeOfDay>;

/**
 * Production stages in the SceneArc filmmaking pipeline. Phase One only acts on
 * character/location/scene-still stages, but the full set is defined so the
 * data model is stable across later phases.
 */
export const ProductionStage = z.enum([
  "character_design",
  "location_design",
  "scene_still",
  "frameburst",
  "video_lowres",
  "video_final",
]);
export type ProductionStage = z.infer<typeof ProductionStage>;

/**
 * Target generation platform. Phase One supports only a single generic platform.
 * Real platforms are added behind adapters in later phases.
 */
export const TargetPlatform = z.enum(["generic_image_generator"]);
export type TargetPlatform = z.infer<typeof TargetPlatform>;

/** Which LLM provider produced a result. */
export const LLMProviderId = z.enum(["mock", "anthropic"]);
export type LLMProviderId = z.infer<typeof LLMProviderId>;
