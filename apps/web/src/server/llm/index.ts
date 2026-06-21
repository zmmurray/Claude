import "server-only";

import { getLLMConfig } from "@/server/env";

import { AnthropicProvider } from "./anthropic-provider";
import { MockLLMProvider } from "./mock-provider";
import type { LLMProvider } from "./types";

export type { LLMProvider, AnalyzeScriptResult } from "./types";

/**
 * Resolve the active LLM provider from configuration. Falls back to the free
 * mock provider whenever the real provider isn't fully configured, so the app
 * never breaks for lack of an API key.
 */
export function getLLMProvider(): LLMProvider {
  const config = getLLMConfig();
  if (config.provider === "anthropic" && config.apiKey) {
    return new AnthropicProvider(config.apiKey, config.model);
  }
  return new MockLLMProvider();
}

/** True when the active provider would incur real cost. */
export function isUsingPaidProvider(): boolean {
  return getLLMProvider().paid;
}
