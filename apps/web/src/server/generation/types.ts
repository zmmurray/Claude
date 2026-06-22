import "server-only";

export type GenerationKind = "image" | "video";

export interface GenerationModelInfo {
  id: string;
  label: string;
  kind: GenerationKind;
  /** Whether this model needs a source image (image-to-video). */
  needsSourceImage?: boolean;
}

export interface GenerationAsset {
  kind: GenerationKind;
  url: string;
}

export interface SubmitArgs {
  apiKey: string;
  modelId: string;
  prompt: string;
  /** Source image URL for image-to-video models. */
  imageUrl?: string;
  aspectRatio?: string;
}

export interface SubmitResult {
  /** Set when the job is asynchronous and must be polled. */
  taskId?: string;
  /** Set when results came back immediately. */
  assets?: GenerationAsset[];
}

export interface PollResult {
  status: "processing" | "completed" | "failed";
  assets: GenerationAsset[];
  error?: string;
}

/**
 * A real generation platform behind a replaceable interface (mirrors the LLM
 * provider pattern). Platform-specific details stay inside the implementation.
 */
export interface GenerationProvider {
  readonly id: string;
  readonly displayName: string;
  listModels(): GenerationModelInfo[];
  submit(args: SubmitArgs): Promise<SubmitResult>;
  poll(args: { apiKey: string; modelId: string; taskId: string }): Promise<PollResult>;
}
