import { z } from "zod";
import { ProductionStage, TargetPlatform } from "./enums";

/** A reference asset the user should supply/select for a generation. */
export const RequiredReferenceSchema = z.object({
  /** Human label, e.g. "Character: MAYA (approved design)". */
  label: z.string().min(1).max(300),
  /** What kind of reference this is. */
  kind: z.enum(["character", "location", "prop", "style", "other"]),
  /** Optional key linking back to a character/location entity. */
  entityKey: z.string().max(80).optional(),
  /** Whether this reference is required or merely recommended. */
  required: z.boolean().default(true),
});
export type RequiredReference = z.infer<typeof RequiredReferenceSchema>;

/**
 * The compiled, ready-to-use prompt package produced by the server-side prompt
 * compiler. This is what the user views and copies; later phases hand it to the
 * Chrome extension.
 */
export const PromptPackageSchema = z.object({
  /** The final, prepared prompt text the user copies into a platform. */
  prompt: z.string().min(1),
  /** One-line summary of the shot. */
  shotSummary: z.string().min(1).max(500),
  /** Reference assets needed/recommended for this generation. */
  requiredReferences: z.array(RequiredReferenceSchema).default([]),
  /** Suggested platform settings, e.g. aspect ratio, steps. Free-form pairs. */
  suggestedSettings: z
    .array(
      z.object({
        label: z.string().min(1).max(120),
        value: z.string().min(1).max(300),
      }),
    )
    .default([]),
  productionStage: ProductionStage,
  targetPlatform: TargetPlatform,
  /** Plain-language notes for the user. */
  notes: z.array(z.string().max(1000)).default([]),
});
export type PromptPackage = z.infer<typeof PromptPackageSchema>;

/** Inputs to the prompt compiler. */
export const PromptCompilerInputSchema = z.object({
  creativeDirection: z.object({
    styleAndTone: z.string().default(""),
    genre: z.string().default(""),
    period: z.string().default(""),
    aspectRatio: z.string().default(""),
    cinematographyNotes: z.string().default(""),
    additionalInstructions: z.string().default(""),
  }),
  scene: z.object({
    number: z.string(),
    slugline: z.string().default(""),
    summary: z.string().default(""),
    timeOfDay: z.string().default("UNSPECIFIED"),
    locationName: z.string().optional(),
    locationDescription: z.string().optional(),
    props: z.array(z.string()).default([]),
    continuityNotes: z.array(z.string()).default([]),
  }),
  characters: z
    .array(
      z.object({
        key: z.string(),
        name: z.string(),
        description: z.string().default(""),
        wardrobe: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  beat: z
    .object({
      order: z.number().int(),
      description: z.string(),
    })
    .optional(),
  productionStage: ProductionStage.default("scene_still"),
  targetPlatform: TargetPlatform.default("generic_image_generator"),
  userInstructions: z.string().default(""),
});
export type PromptCompilerInput = z.infer<typeof PromptCompilerInputSchema>;
