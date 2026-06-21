import "server-only";

import type { LLMProviderId, LLMUsage, ScriptAnalysis, ScriptAnalysisInput } from "@scenearc/shared";

export interface AnalyzeScriptResult {
  analysis: ScriptAnalysis;
  usage: LLMUsage;
  providerId: LLMProviderId;
  model: string;
}

/**
 * The replaceable LLM provider interface. Adding a new model/provider means
 * implementing this once — no UI or schema changes required.
 */
export interface LLMProvider {
  readonly id: LLMProviderId;
  readonly model: string;
  /** True if calling this provider costs money (mock is free). */
  readonly paid: boolean;
  analyzeScript(input: ScriptAnalysisInput): Promise<AnalyzeScriptResult>;
}
