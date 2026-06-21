import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { ScriptAnalysisSchema, type ScriptAnalysisInput } from "@scenearc/shared";

import { buildScriptAnalysisUserPrompt, SCRIPT_ANALYSIS_SYSTEM_PROMPT } from "./prompts";
import type { AnalyzeScriptResult, LLMProvider } from "./types";

/**
 * Rough price table (USD per 1M tokens). Used only to record an ESTIMATED cost
 * for transparency. Update as pricing changes; unknown models fall back to a
 * conservative default.
 */
const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
  default: { input: 1, output: 5 },
};

export class AnthropicProvider implements LLMProvider {
  readonly id = "anthropic" as const;
  readonly paid = true;
  readonly model: string;
  private readonly client: Anthropic;

  constructor(apiKey: string, model: string) {
    this.model = model;
    this.client = new Anthropic({ apiKey });
  }

  async analyzeScript(input: ScriptAnalysisInput): Promise<AnalyzeScriptResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8000,
      system: SCRIPT_ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildScriptAnalysisUserPrompt(input),
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    const json = extractJson(text);
    const analysis = ScriptAnalysisSchema.parse(json);

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const price = PRICE_PER_MTOK[this.model] ?? PRICE_PER_MTOK.default!;
    const estimatedCostUsd =
      (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;

    return {
      analysis,
      usage: {
        inputTokens,
        outputTokens,
        estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
        paid: true,
      },
      providerId: this.id,
      model: this.model,
    };
  }
}

/**
 * Models sometimes wrap JSON in prose or code fences. Extract the first complete
 * JSON object so validation has a fair chance.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // Strip ```json ... ``` fences if present.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1]!.trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    // Fall back to slicing from the first "{" to the last "}".
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("The language model did not return valid JSON.");
  }
}
