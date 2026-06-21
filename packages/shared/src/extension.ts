import { z } from "zod";

/**
 * Shared contract between the SceneArc web API and the Chrome extension.
 * Plain DTOs + zod schemas for request validation. No secrets here.
 */

export interface ExtensionAccount {
  email: string;
}

export interface ExtensionReference {
  label: string;
  kind: string;
  required: boolean;
  /** Optional download URL for the reference file, when available. */
  url?: string;
}

export interface ExtensionActiveTask {
  taskId: string;
  projectId: string;
  projectTitle: string;
  sceneId: string | null;
  sceneNumber: string | null;
  sceneSlugline: string | null;
  stage: string;
  targetPlatform: string;
  status: string;
  prompt: string;
  shotSummary: string;
  references: ExtensionReference[];
}

export interface ExtensionContextResponse {
  account: ExtensionAccount;
  activeTask: ExtensionActiveTask | null;
}

export interface ExtensionResultSummary {
  id: string;
  kind: string;
  source: string;
  status: string;
  url: string | null;
  createdAt: string;
}

// --- Requests ----------------------------------------------------------------

export const PairRequestSchema = z.object({
  code: z.string().min(4).max(20),
});
export type PairRequest = z.infer<typeof PairRequestSchema>;

export interface PairResponse {
  token: string;
  account: ExtensionAccount;
}

export const ImportResultRequestSchema = z.object({
  taskId: z.string().uuid(),
  kind: z.enum(["image", "video"]).default("image"),
  source: z.enum(["extension", "manual"]).default("extension"),
  /** Inline data URL (data:image/...;base64,...) to store, OR */
  dataUrl: z.string().optional(),
  /** an external URL reference (kept as-is). */
  sourceUrl: z.string().url().optional(),
});
export type ImportResultRequest = z.infer<typeof ImportResultRequestSchema>;

export interface ImportResultResponse {
  resultId: string;
}

export const ResultDecision = z.enum(["approved", "rejected", "revision_requested"]);
export type ResultDecision = z.infer<typeof ResultDecision>;

export const DecisionRequestSchema = z.object({
  decision: ResultDecision,
  notes: z.string().max(2000).optional(),
});
export type DecisionRequest = z.infer<typeof DecisionRequestSchema>;
