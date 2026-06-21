import { describe, expect, it } from "vitest";
import { ScriptAnalysisSchema } from "./script-analysis";

const validAnalysis = {
  characters: [
    { key: "maya", name: "MAYA", description: "A weary detective.", relationships: ["Partner of LEO"] },
    { key: "leo", name: "LEO", description: "An optimistic rookie.", relationships: [] },
  ],
  locations: [{ key: "precinct", name: "Police Precinct", description: "A worn-down station." }],
  scenes: [
    {
      key: "s1",
      number: "1",
      slugline: "INT. PRECINCT - NIGHT",
      summary: "Maya briefs Leo.",
      locationKey: "precinct",
      timeOfDay: "NIGHT",
      characterKeys: ["maya", "leo"],
      props: ["case file"],
      wardrobe: [{ characterKey: "maya", description: "Long grey coat." }],
      continuityNotes: ["Coffee mug stays half-full."],
      beats: [{ order: 1, description: "Maya enters." }],
      suggestedStages: ["scene_still"],
    },
  ],
};

describe("ScriptAnalysisSchema", () => {
  it("accepts a valid, fully-linked analysis", () => {
    const result = ScriptAnalysisSchema.safeParse(validAnalysis);
    expect(result.success).toBe(true);
  });

  it("applies defaults for omitted optional arrays", () => {
    const parsed = ScriptAnalysisSchema.parse({
      characters: [{ key: "x", name: "X" }],
      locations: [],
      scenes: [],
    });
    expect(parsed.characters[0]?.relationships).toEqual([]);
    expect(parsed.characters[0]?.description).toBe("");
  });

  it("rejects a scene referencing an unknown character", () => {
    const bad = {
      ...validAnalysis,
      scenes: [{ ...validAnalysis.scenes[0], characterKeys: ["ghost"] }],
    };
    const result = ScriptAnalysisSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("ghost"))).toBe(true);
    }
  });

  it("rejects a scene referencing an unknown location", () => {
    const bad = {
      ...validAnalysis,
      scenes: [{ ...validAnalysis.scenes[0], locationKey: "nowhere" }],
    };
    const result = ScriptAnalysisSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects duplicate character keys", () => {
    const bad = {
      ...validAnalysis,
      characters: [
        { key: "dup", name: "A" },
        { key: "dup", name: "B" },
      ],
      scenes: [],
    };
    const result = ScriptAnalysisSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects malformed entity keys", () => {
    const bad = { characters: [{ key: "has spaces", name: "A" }], locations: [], scenes: [] };
    const result = ScriptAnalysisSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});
