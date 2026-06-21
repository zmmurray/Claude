import { PromptPackageSchema } from "@scenearc/shared";
import { describe, expect, it } from "vitest";

import { compilePromptPackage } from "./prompt-compiler";

const baseInput = {
  creativeDirection: {
    styleAndTone: "Gritty neo-noir",
    genre: "Crime",
    period: "Modern day",
    aspectRatio: "2.39:1",
    cinematographyNotes: "Hard shadows, sodium streetlight",
    additionalInstructions: "",
  },
  scene: {
    number: "1",
    slugline: "INT. POLICE PRECINCT - NIGHT",
    summary: "Maya briefs Leo on a cold case.",
    timeOfDay: "NIGHT",
    locationName: "Police Precinct",
    locationDescription: "Worn, fluorescent-lit station.",
    props: ["case file", "coffee mug"],
    continuityNotes: ["Coffee mug stays half-full."],
  },
  characters: [
    {
      key: "maya",
      name: "Maya",
      description: "A guarded detective.",
      wardrobe: ["Long grey coat"],
    },
  ],
  productionStage: "scene_still" as const,
  targetPlatform: "generic_image_generator" as const,
  userInstructions: "Push in slowly on Maya.",
};

describe("compilePromptPackage", () => {
  it("produces a schema-valid prompt package", () => {
    const pkg = compilePromptPackage(baseInput);
    expect(PromptPackageSchema.safeParse(pkg).success).toBe(true);
  });

  it("includes scene, location, character, props and continuity in the prompt", () => {
    const pkg = compilePromptPackage(baseInput);
    expect(pkg.prompt).toContain("Scene 1");
    expect(pkg.prompt).toContain("Police Precinct");
    expect(pkg.prompt).toContain("Maya");
    expect(pkg.prompt).toContain("case file");
    expect(pkg.prompt).toContain("half-full");
    expect(pkg.prompt).toContain("Push in slowly");
  });

  it("requires a character reference for each character", () => {
    const pkg = compilePromptPackage(baseInput);
    const charRefs = pkg.requiredReferences.filter((r) => r.kind === "character");
    expect(charRefs).toHaveLength(1);
    expect(charRefs[0]?.entityKey).toBe("maya");
    expect(charRefs[0]?.required).toBe(true);
  });

  it("uses the creative-direction aspect ratio in suggested settings", () => {
    const pkg = compilePromptPackage(baseInput);
    const ar = pkg.suggestedSettings.find((s) => s.label === "Aspect ratio");
    expect(ar?.value).toBe("2.39:1");
  });

  it("emphasizes a specific beat when one is provided", () => {
    const pkg = compilePromptPackage({
      ...baseInput,
      beat: { order: 2, description: "Leo flips open the file." },
    });
    expect(pkg.prompt).toContain("Leo flips open the file.");
    expect(pkg.shotSummary).toContain("beat 2");
  });
});
