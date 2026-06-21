import { describe, expect, it } from "vitest";
import { PromptPackageSchema } from "./prompt-package";

describe("PromptPackageSchema", () => {
  it("accepts a minimal valid package", () => {
    const result = PromptPackageSchema.safeParse({
      prompt: "A weary detective stands in a dim precinct at night.",
      shotSummary: "Maya in the precinct, night.",
      productionStage: "scene_still",
      targetPlatform: "generic_image_generator",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requiredReferences).toEqual([]);
      expect(result.data.notes).toEqual([]);
    }
  });

  it("rejects an empty prompt", () => {
    const result = PromptPackageSchema.safeParse({
      prompt: "",
      shotSummary: "x",
      productionStage: "scene_still",
      targetPlatform: "generic_image_generator",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown target platform", () => {
    const result = PromptPackageSchema.safeParse({
      prompt: "x",
      shotSummary: "x",
      productionStage: "scene_still",
      targetPlatform: "midjourney",
    });
    expect(result.success).toBe(false);
  });
});
