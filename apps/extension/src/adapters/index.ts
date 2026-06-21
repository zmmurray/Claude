import { mockAdapter } from "./mock";
import type { PlatformAdapter } from "./types";

/** Registry of all platform adapters. Add real platforms here in Phase Three. */
export const adapters: PlatformAdapter[] = [mockAdapter];

export function pickAdapter(url: string): PlatformAdapter | null {
  return adapters.find((a) => a.matches(url)) ?? null;
}

export type { PlatformAdapter, DetectedResult } from "./types";
