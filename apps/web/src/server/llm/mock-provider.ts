import "server-only";

import {
  ScriptAnalysisSchema,
  type ScriptAnalysis,
  type ScriptAnalysisInput,
  type TimeOfDay,
} from "@scenearc/shared";

import type { AnalyzeScriptResult, LLMProvider } from "./types";

/**
 * Free, deterministic mock provider. It performs light screenplay parsing so
 * the breakdown reflects the pasted script, and falls back to a realistic
 * canned example when nothing recognizable is found. Costs nothing.
 */
export class MockLLMProvider implements LLMProvider {
  readonly id = "mock" as const;
  readonly model = "mock-analyzer-v1";
  readonly paid = false;

  async analyzeScript(input: ScriptAnalysisInput): Promise<AnalyzeScriptResult> {
    const parsed = parseScreenplay(input.scriptText);
    const analysis = parsed ?? CANNED_EXAMPLE;
    // Validate even mock output so it can never produce an invalid breakdown.
    const validated = ScriptAnalysisSchema.parse(analysis);
    return {
      analysis: validated,
      usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, paid: false },
      providerId: this.id,
      model: this.model,
    };
  }
}

function slugify(value: string, fallback: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || fallback;
}

function detectTimeOfDay(text: string): TimeOfDay {
  const t = text.toUpperCase();
  if (t.includes("NIGHT")) return "NIGHT";
  if (t.includes("DAWN")) return "DAWN";
  if (t.includes("DUSK")) return "DUSK";
  if (t.includes("MORNING")) return "MORNING";
  if (t.includes("AFTERNOON")) return "AFTERNOON";
  if (t.includes("EVENING")) return "EVENING";
  if (t.includes("CONTINUOUS")) return "CONTINUOUS";
  if (t.includes("DAY")) return "DAY";
  return "UNSPECIFIED";
}

const SLUGLINE_RE = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s*(.+)$/i;

/**
 * Best-effort screenplay parser. Returns null if the text doesn't look like a
 * screenplay (so the caller can use the canned example instead).
 */
function parseScreenplay(scriptText: string): ScriptAnalysis | null {
  const lines = scriptText.split(/\r?\n/);

  const locations = new Map<string, { key: string; name: string; description: string }>();
  const characters = new Map<string, { key: string; name: string }>();

  interface RawScene {
    key: string;
    number: string;
    slugline: string;
    locationKey?: string;
    timeOfDay: TimeOfDay;
    actionLines: string[];
    characterKeys: Set<string>;
  }
  const scenes: RawScene[] = [];
  let current: RawScene | null = null;
  let sceneCounter = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const slug = line.match(SLUGLINE_RE);
    if (slug) {
      sceneCounter += 1;
      const rest = slug[2] ?? "";
      // Split "KITCHEN - NIGHT" into location + time.
      const [locationPart = rest, ...timeParts] = rest.split(/\s+[-–—]\s+/);
      const timeText = timeParts.join(" ") || rest;
      const locName = locationPart.trim().replace(/\s+/g, " ");
      const locKey = slugify(locName, `location-${locations.size + 1}`);
      if (!locations.has(locKey)) {
        locations.set(locKey, {
          key: locKey,
          name: titleCase(locName),
          description: "",
        });
      }
      current = {
        key: `scene-${sceneCounter}`,
        number: String(sceneCounter),
        slugline: line.toUpperCase(),
        locationKey: locKey,
        timeOfDay: detectTimeOfDay(timeText),
        actionLines: [],
        characterKeys: new Set(),
      };
      scenes.push(current);
      continue;
    }

    if (!current) continue;

    // Character cue: short, mostly uppercase line (allow (V.O.), (O.S.)).
    const cueCandidate = line.replace(/\([^)]*\)/g, "").trim();
    const isCue =
      cueCandidate.length > 0 &&
      cueCandidate.length <= 40 &&
      /^[A-Z][A-Z0-9 .'\-]+$/.test(cueCandidate) &&
      /[A-Z]/.test(cueCandidate) &&
      !SLUGLINE_RE.test(cueCandidate);

    if (isCue) {
      const name = titleCaseName(cueCandidate);
      const key = slugify(cueCandidate, `character-${characters.size + 1}`);
      if (!characters.has(key)) characters.set(key, { key, name });
      current.characterKeys.add(key);
    } else {
      current.actionLines.push(line);
    }
  }

  // Heuristic: only treat as a screenplay if we found at least one slugline.
  if (scenes.length === 0) return null;

  const analysis: ScriptAnalysis = {
    characters: [...characters.values()].map((c) => ({
      key: c.key,
      name: c.name,
      description: "",
      relationships: [],
    })),
    locations: [...locations.values()],
    scenes: scenes.map((s) => {
      const summary = s.actionLines.slice(0, 2).join(" ").slice(0, 400);
      const beats = s.actionLines.slice(0, 4).map((description, idx) => ({
        order: idx + 1,
        description: description.slice(0, 300),
      }));
      return {
        key: s.key,
        number: s.number,
        slugline: s.slugline,
        summary: summary || "Scene from the script.",
        locationKey: s.locationKey,
        timeOfDay: s.timeOfDay,
        characterKeys: [...s.characterKeys],
        props: [],
        wardrobe: [],
        continuityNotes: [],
        beats: beats.length > 0 ? beats : [{ order: 1, description: "Scene action." }],
        suggestedStages: ["scene_still" as const],
      };
    }),
  };

  return analysis;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function titleCaseName(value: string): string {
  // Keep names readable: "JOHN DOE" -> "John Doe".
  return titleCase(value.replace(/\s+/g, " ").trim());
}

/** A realistic fallback used when the pasted text isn't a screenplay. */
const CANNED_EXAMPLE: ScriptAnalysis = {
  characters: [
    {
      key: "maya",
      name: "Maya",
      description:
        "A guarded, sharp-eyed detective in her early forties, more comfortable with evidence than people.",
      relationships: ["Mentor to LEO"],
    },
    {
      key: "leo",
      name: "Leo",
      description: "An eager rookie detective, idealistic and quick to speak.",
      relationships: ["Mentored by MAYA"],
    },
  ],
  locations: [
    {
      key: "precinct",
      name: "Police Precinct",
      description: "A worn, fluorescent-lit station, paperwork stacked on every desk.",
    },
    {
      key: "rooftop",
      name: "Apartment Rooftop",
      description: "A windswept rooftop overlooking the city at night.",
    },
  ],
  scenes: [
    {
      key: "scene-1",
      number: "1",
      slugline: "INT. POLICE PRECINCT - NIGHT",
      summary: "Maya briefs Leo on a cold case as the night shift empties out.",
      locationKey: "precinct",
      timeOfDay: "NIGHT",
      characterKeys: ["maya", "leo"],
      props: ["case file", "coffee mug", "corkboard of photos"],
      wardrobe: [
        { characterKey: "maya", description: "Long grey wool coat over a rumpled blouse." },
        { characterKey: "leo", description: "Crisp new suit, slightly too large." },
      ],
      continuityNotes: ["Maya's coffee mug stays half-full throughout the scene."],
      beats: [
        { order: 1, description: "Maya drops a heavy case file on Leo's desk." },
        { order: 2, description: "Leo flips it open, scanning faded photographs." },
        { order: 3, description: "Maya warns him this case ended careers." },
      ],
      suggestedStages: ["scene_still"],
    },
    {
      key: "scene-2",
      number: "2",
      slugline: "EXT. APARTMENT ROOFTOP - NIGHT",
      summary: "Leo confronts Maya about a detail she left out of the file.",
      locationKey: "rooftop",
      timeOfDay: "NIGHT",
      characterKeys: ["maya", "leo"],
      props: ["cigarette", "city skyline"],
      wardrobe: [{ characterKey: "maya", description: "Same grey coat, collar turned up." }],
      continuityNotes: ["Continues directly from Scene 1; same night."],
      beats: [
        { order: 1, description: "Leo storms onto the rooftop." },
        { order: 2, description: "Maya admits she knew the victim." },
      ],
      suggestedStages: ["scene_still"],
    },
  ],
};
