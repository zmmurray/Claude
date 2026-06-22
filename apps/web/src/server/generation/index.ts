import "server-only";

import { FreepikProvider } from "./freepik";
import type { GenerationProvider } from "./types";

export type { GenerationModelInfo, GenerationProvider } from "./types";

/** The active generation provider. Add real platforms behind this in future. */
export function getGenerationProvider(): GenerationProvider {
  return new FreepikProvider();
}
