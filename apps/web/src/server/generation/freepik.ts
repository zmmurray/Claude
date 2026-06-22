import "server-only";

import type {
  GenerationAsset,
  GenerationModelInfo,
  GenerationProvider,
  PollResult,
  SubmitArgs,
  SubmitResult,
} from "./types";

const BASE_URL = "https://api.freepik.com";

/**
 * Per-model configuration. All Freepik-specific paths live here so the model
 * list can be updated without touching the rest of the app. If Freepik renames
 * a model slug, change it in this one place.
 */
interface FreepikModel extends GenerationModelInfo {
  submitPath: string;
  statusPath: (taskId: string) => string;
}

const MODELS: Record<string, FreepikModel> = {
  nano_banana: {
    id: "nano_banana",
    label: "Nano Banana — image (Google Gemini)",
    kind: "image",
    submitPath: "/v1/ai/text-to-image/nano-banana",
    statusPath: (t) => `/v1/ai/text-to-image/nano-banana/${t}`,
  },
  seedance_2: {
    id: "seedance_2",
    label: "Seedance 2.0 — video",
    kind: "video",
    needsSourceImage: true,
    submitPath: "/v1/ai/image-to-video/seedance-pro-1080p",
    statusPath: (t) => `/v1/ai/image-to-video/seedance-pro-1080p/${t}`,
  },
};

function headers(apiKey: string): HeadersInit {
  return { "Content-Type": "application/json", "x-freepik-api-key": apiKey };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

/** Freepik wraps payloads in `data`. Pull task id from common shapes. */
export function extractTaskId(json: unknown): string | undefined {
  const root = asRecord(json);
  const data = asRecord(root.data);
  const candidate = data.task_id ?? data.id ?? root.task_id ?? root.id;
  return typeof candidate === "string" ? candidate : undefined;
}

export function extractStatus(json: unknown): string {
  const data = asRecord(asRecord(json).data);
  const status = (data.status ?? asRecord(json).status ?? "").toString().toUpperCase();
  return status;
}

/** Collect result URLs (or base64) from the various fields Freepik may use. */
export function extractAssets(json: unknown, kind: GenerationAsset["kind"]): GenerationAsset[] {
  const data = asRecord(asRecord(json).data);
  const buckets: unknown[] = [
    data.generated,
    data.images,
    data.output,
    data.videos,
    data.video,
    data.url,
    data.result,
  ];
  const assets: GenerationAsset[] = [];
  for (const bucket of buckets) {
    if (!bucket) continue;
    const items = Array.isArray(bucket) ? bucket : [bucket];
    for (const item of items) {
      if (typeof item === "string") {
        if (item.startsWith("http") || item.startsWith("data:")) assets.push({ kind, url: item });
      } else {
        const rec = asRecord(item);
        const url = rec.url ?? rec.uri ?? rec.image_url ?? rec.video_url;
        const base64 = rec.base64 ?? rec.b64;
        if (typeof url === "string") assets.push({ kind, url });
        else if (typeof base64 === "string")
          assets.push({ kind, url: `data:image/png;base64,${base64}` });
      }
    }
  }
  return assets;
}

export class FreepikProvider implements GenerationProvider {
  readonly id = "freepik";
  readonly displayName = "Freepik";

  listModels(): GenerationModelInfo[] {
    return Object.values(MODELS).map(({ submitPath: _s, statusPath: _p, ...info }) => info);
  }

  async submit(args: SubmitArgs): Promise<SubmitResult> {
    const model = MODELS[args.modelId];
    if (!model) throw new Error(`Unknown Freepik model: ${args.modelId}`);

    const body: Record<string, unknown> = { prompt: args.prompt };
    if (args.aspectRatio) body.aspect_ratio = args.aspectRatio;
    if (model.kind === "video") {
      if (!args.imageUrl) {
        throw new Error("This video model needs a source image — approve an image result first.");
      }
      body.image = args.imageUrl;
      body.duration = 5;
    }

    const res = await fetch(`${BASE_URL}${model.submitPath}`, {
      method: "POST",
      headers: headers(args.apiKey),
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(freepikError(json, res.status));
    }

    const taskId = extractTaskId(json);
    if (taskId) return { taskId };

    const assets = extractAssets(json, model.kind);
    if (assets.length > 0) return { assets };

    throw new Error("Freepik accepted the request but returned no task id or result.");
  }

  async poll(args: { apiKey: string; modelId: string; taskId: string }): Promise<PollResult> {
    const model = MODELS[args.modelId];
    if (!model) throw new Error(`Unknown Freepik model: ${args.modelId}`);

    const res = await fetch(`${BASE_URL}${model.statusPath(args.taskId)}`, {
      headers: headers(args.apiKey),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { status: "failed", assets: [], error: freepikError(json, res.status) };
    }

    const status = extractStatus(json);
    if (["COMPLETED", "DONE", "FINISHED", "SUCCESS"].includes(status)) {
      return { status: "completed", assets: extractAssets(json, model.kind) };
    }
    if (["FAILED", "ERROR", "CANCELLED"].includes(status)) {
      return { status: "failed", assets: [], error: `Freepik reported status ${status}.` };
    }
    return { status: "processing", assets: [] };
  }
}

function freepikError(json: unknown, status: number): string {
  const root = asRecord(json);
  const msg =
    (typeof root.message === "string" && root.message) ||
    (typeof root.error === "string" && root.error) ||
    (Array.isArray(root.errors) && root.errors.length > 0 && JSON.stringify(root.errors));
  return msg ? `Freepik error (${status}): ${msg}` : `Freepik request failed (${status}).`;
}

export { MODELS as FREEPIK_MODELS };
