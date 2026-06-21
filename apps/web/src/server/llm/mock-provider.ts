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
interface MockCharacter {
  key: string;
  name: string;
  description: string;
}

/** Screenplay extensions (not descriptions): V.O., O.S., CONT'D, etc. */
function isDescriptiveParenthetical(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return false;
  if (/^(v\.?\s*o\.?|o\.?\s*s\.?|o\.?\s*c\.?|cont'?d|contd|continuing|beat|pause|more|to\b.*)$/i.test(t))
    return false;
  // Treat as a description if it has a number, a comma, or multiple words.
  return /\d/.test(t) || /,/.test(t) || t.split(/\s+/).length >= 2;
}

function cleanDescription(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, 400);
}

/** Pull "Name (description)" introductions from anywhere into matching characters. */
function applyInlineDescriptions(scriptText: string, characters: Map<string, MockCharacter>): void {
  const re = /([A-Za-z][A-Za-z.'-]*)\s*\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(scriptText)) !== null) {
    const desc = m[2]!;
    if (!isDescriptiveParenthetical(desc)) continue;
    const key = slugify(m[1]!, "");
    const ch = characters.get(key);
    if (ch && !ch.description) ch.description = cleanDescription(desc);
  }
}

function parseScreenplay(scriptText: string): ScriptAnalysis | null {
  const lines = scriptText.split(/\r?\n/);

  const locations = new Map<string, { key: string; name: string; description: string }>();
  const characters = new Map<string, MockCharacter>();

  interface RawScene {
    key: string;
    number: string;
    slugline: string;
    locationKey?: string;
    timeOfDay: TimeOfDay;
    actionLines: string[];
    dialogue: { characterKey?: string; line: string }[];
    characterKeys: Set<string>;
  }
  const scenes: RawScene[] = [];
  let current: RawScene | null = null;
  // The character currently "speaking"; lines directly under a cue are dialogue.
  let currentSpeaker: string | null = null;
  let sceneCounter = 0;

  const ensureCharacter = (rawName: string): string => {
    const key = slugify(rawName, `character-${characters.size + 1}`);
    if (!characters.has(key)) {
      characters.set(key, { key, name: titleCaseName(rawName), description: "" });
    }
    return key;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      // A blank line ends the current dialogue block.
      currentSpeaker = null;
      continue;
    }

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
        dialogue: [],
        characterKeys: new Set(),
      };
      currentSpeaker = null;
      scenes.push(current);
      continue;
    }

    if (!current) continue;

    // Character cue: short, mostly uppercase line (ignoring any parenthetical).
    const parenMatch = line.match(/\(([^)]*)\)/);
    const cueCandidate = line.replace(/\([^)]*\)/g, "").trim();
    const isCue =
      cueCandidate.length > 0 &&
      cueCandidate.length <= 40 &&
      /^[A-Z][A-Z0-9 .'\-]+$/.test(cueCandidate) &&
      /[A-Z]/.test(cueCandidate) &&
      !SLUGLINE_RE.test(cueCandidate);

    if (isCue) {
      const key = ensureCharacter(cueCandidate);
      current.characterKeys.add(key);
      currentSpeaker = key;
      // A descriptive parenthetical on the cue line, e.g. "MAYA (65, purple shirt)".
      if (parenMatch && isDescriptiveParenthetical(parenMatch[1]!)) {
        const ch = characters.get(key)!;
        if (!ch.description) ch.description = cleanDescription(parenMatch[1]!);
      }
      continue;
    }

    if (currentSpeaker) {
      // Lines directly under a cue (until a blank line) are that character's dialogue.
      current.dialogue.push({ characterKey: currentSpeaker, line });
      current.characterKeys.add(currentSpeaker);
    } else {
      current.actionLines.push(line);
    }
  }

  // Heuristic: only treat as a screenplay if we found at least one slugline.
  if (scenes.length === 0) return null;

  // Second pass: capture "Name (description)" introductions from any line.
  applyInlineDescriptions(scriptText, characters);

  const analysis: ScriptAnalysis = {
    characters: [...characters.values()].map((c) => ({
      key: c.key,
      name: c.name,
      description: c.description,
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
        dialogue: s.dialogue,
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
      dialogue: [
        { characterKey: "maya", line: "This one ended careers." },
        { characterKey: "leo", line: "Then why give it to me?" },
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
      dialogue: [{ characterKey: "leo", line: "You knew her." }],
      suggestedStages: ["scene_still"],
    },
  ],
};
