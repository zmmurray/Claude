import { ScriptAnalysisSchema } from "@scenearc/shared";
import { describe, expect, it } from "vitest";

import { MockLLMProvider } from "./mock-provider";

const SAMPLE_SCREENPLAY = `
INT. POLICE PRECINCT - NIGHT

Maya drops a heavy file on the desk. Rain streaks the windows.

MAYA (40s, weary detective)
This one ended careers.

LEO
Then why give it to me?

EXT. APARTMENT ROOFTOP - NIGHT

Leo storms out into the wind.

LEO
You knew her.
`;

describe("MockLLMProvider", () => {
  const provider = new MockLLMProvider();

  it("is free (not paid)", () => {
    expect(provider.paid).toBe(false);
    expect(provider.id).toBe("mock");
  });

  it("returns a schema-valid breakdown for a screenplay", async () => {
    const { analysis, usage } = await provider.analyzeScript({
      scriptText: SAMPLE_SCREENPLAY,
      creativeDirection: {
        styleAndTone: "Noir",
        genre: "Crime",
        period: "Modern",
        aspectRatio: "2.39:1",
        cinematographyNotes: "Low key lighting",
        additionalInstructions: "",
      },
    });

    expect(ScriptAnalysisSchema.safeParse(analysis).success).toBe(true);
    expect(usage.paid).toBe(false);
    expect(usage.estimatedCostUsd).toBe(0);
  });

  it("parses scenes, locations and characters from sluglines and cues", async () => {
    const { analysis } = await provider.analyzeScript({
      scriptText: SAMPLE_SCREENPLAY,
      creativeDirection: {
        styleAndTone: "",
        genre: "",
        period: "",
        aspectRatio: "",
        cinematographyNotes: "",
        additionalInstructions: "",
      },
    });

    expect(analysis.scenes).toHaveLength(2);
    expect(analysis.scenes[0]?.timeOfDay).toBe("NIGHT");
    expect(analysis.characters.map((c) => c.name)).toContain("Maya");
    expect(analysis.characters.map((c) => c.name)).toContain("Leo");
    expect(analysis.locations.length).toBeGreaterThanOrEqual(2);

    // Every scene reference resolves (no dangling keys).
    const charKeys = new Set(analysis.characters.map((c) => c.key));
    for (const scene of analysis.scenes) {
      for (const k of scene.characterKeys) expect(charKeys.has(k)).toBe(true);
    }
  });

  it("captures dialogue spoken under character cues", async () => {
    const { analysis } = await provider.analyzeScript({
      scriptText: SAMPLE_SCREENPLAY,
      creativeDirection: {
        styleAndTone: "",
        genre: "",
        period: "",
        aspectRatio: "",
        cinematographyNotes: "",
        additionalInstructions: "",
      },
    });
    const allDialogue = analysis.scenes.flatMap((s) => s.dialogue);
    expect(allDialogue.length).toBeGreaterThanOrEqual(3);
    expect(allDialogue.some((d) => d.line.includes("ended careers"))).toBe(true);
    const maya = analysis.characters.find((c) => c.name === "Maya");
    expect(allDialogue.some((d) => d.characterKey === maya?.key)).toBe(true);
  });

  it("extracts character descriptions from parentheticals", async () => {
    const { analysis } = await provider.analyzeScript({
      scriptText: SAMPLE_SCREENPLAY,
      creativeDirection: {
        styleAndTone: "",
        genre: "",
        period: "",
        aspectRatio: "",
        cinematographyNotes: "",
        additionalInstructions: "",
      },
    });
    const maya = analysis.characters.find((c) => c.name === "Maya");
    expect(maya?.description.toLowerCase()).toContain("weary");
  });

  it("falls back to a realistic canned example for non-screenplay text", async () => {
    const { analysis } = await provider.analyzeScript({
      scriptText: "Just some prose with no sluglines at all.",
      creativeDirection: {
        styleAndTone: "",
        genre: "",
        period: "",
        aspectRatio: "",
        cinematographyNotes: "",
        additionalInstructions: "",
      },
    });
    expect(analysis.characters.length).toBeGreaterThan(0);
    expect(analysis.scenes.length).toBeGreaterThan(0);
    expect(ScriptAnalysisSchema.safeParse(analysis).success).toBe(true);
  });
});
