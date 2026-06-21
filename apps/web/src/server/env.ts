/**
 * Server-only environment access.
 *
 * Everything here is read lazily so the app can build and import without all
 * secrets present (e.g. during `next build` or unit tests). Values are validated
 * at the moment they are actually needed.
 *
 * Do NOT import this file from client components.
 */
import "server-only";

import type { LLMProviderId } from "@scenearc/shared";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". See .env.example and NONCODER_GUIDE.md.`,
    );
  }
  return value;
}

/** Public Supabase values (also safe in the browser, but read here for server use). */
export function getSupabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string {
  return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

/** SECRET service-role key, server-only. */
export function getSupabaseServiceRoleKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY");
}

export interface LLMConfig {
  provider: LLMProviderId;
  model: string;
  apiKey: string | undefined;
  confirmPaidCalls: boolean;
}

/**
 * Resolve the LLM configuration. Defaults to the free "mock" provider when no
 * provider is configured, so the whole app is usable without spending money.
 */
export function getLLMConfig(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER ?? "mock").toLowerCase();
  const resolvedProvider: LLMProviderId = provider === "anthropic" ? "anthropic" : "mock";
  return {
    provider: resolvedProvider,
    model: process.env.LLM_MODEL ?? "claude-haiku-4-5-20251001",
    apiKey: process.env.LLM_API_KEY || undefined,
    // Default to requiring confirmation before paid calls during development.
    confirmPaidCalls: (process.env.LLM_CONFIRM_PAID_CALLS ?? "true").toLowerCase() !== "false",
  };
}
