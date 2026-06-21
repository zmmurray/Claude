import { ScriptAnalysisSchema } from "@scenearc/shared";
import { describe, expect, it } from "vitest";

import { extractJson } from "./anthropic-provider";

/**
 * These tests simulate what a real provider returns WITHOUT making any network
 * call: they confirm we can pull JSON out of typical model output and that a
 * realistic response validates against the schema (and a bad one is rejected).
 */
describe("extractJson + real-response validation", () => {
  const goodAnalysis = {
    characters: [{ key: "maya", name: "MAYA", description: "Detective.", relationships: [] }],
    locations: [{ key: "precinct", name: "Precinct", description: "" }],
    scenes: [
      {
        key: "s1",
        number: "1",
        slugline: "INT. PRECINCT - NIGHT",
        summary: "Maya works late.",
        locationKey: "precinct",
        timeOfDay: "NIGHT",
        characterKeys: ["maya"],
        props: [],
        wardrobe: [],
        continuityNotes: [],
        beats: [{ order: 1, description: "Maya enters." }],
        suggestedStages: ["scene_still"],
      },
    ],
  };

  it("parses raw JSON", () => {
    expect(extractJson(JSON.stringify(goodAnalysis))).toBeTypeOf("object");
  });

  it("parses JSON wrapped in a ```json code fence", () => {
    const text = "Here is the breakdown:\n```json\n" + JSON.stringify(goodAnalysis) + "\n```\nDone.";
    const parsed = extractJson(text);
    expect(ScriptAnalysisSchema.safeParse(parsed).success).toBe(true);
  });

  it("parses JSON surrounded by prose", () => {
    const text = "Sure! " + JSON.stringify(goodAnalysis) + " Let me know if you need changes.";
    const parsed = extractJson(text);
    expect(ScriptAnalysisSchema.safeParse(parsed).success).toBe(true);
  });

  it("throws on text containing no JSON object", () => {
    expect(() => extractJson("I cannot help with that.")).toThrow();
  });

  it("rejects a structurally-invalid response (dangling character reference)", () => {
    const bad = {
      ...goodAnalysis,
      scenes: [{ ...goodAnalysis.scenes[0], characterKeys: ["does-not-exist"] }],
    };
    const parsed = extractJson(JSON.stringify(bad));
    expect(ScriptAnalysisSchema.safeParse(parsed).success).toBe(false);
  });
});
