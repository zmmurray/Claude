import type {
  ExtensionContextResponse,
  ImportResultResponse,
  PairResponse,
  ResultDecision,
} from "@scenearc/shared";

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

async function asError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? `Request failed (${res.status}).`;
  } catch {
    return `Request failed (${res.status}).`;
  }
}

export async function pair(appUrl: string, code: string): Promise<PairResponse> {
  const res = await fetch(`${normalizeUrl(appUrl)}/api/extension/pair`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(await asError(res));
  return (await res.json()) as PairResponse;
}

export async function getContext(appUrl: string, token: string): Promise<ExtensionContextResponse> {
  const res = await fetch(`${normalizeUrl(appUrl)}/api/extension/context`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await asError(res));
  return (await res.json()) as ExtensionContextResponse;
}

export async function importResult(
  appUrl: string,
  token: string,
  body: { taskId: string; kind: "image" | "video"; source: "extension" | "manual"; dataUrl?: string; sourceUrl?: string },
): Promise<ImportResultResponse> {
  const res = await fetch(`${normalizeUrl(appUrl)}/api/extension/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await asError(res));
  return (await res.json()) as ImportResultResponse;
}

export async function decide(
  appUrl: string,
  token: string,
  resultId: string,
  decision: ResultDecision,
  notes?: string,
): Promise<void> {
  const res = await fetch(`${normalizeUrl(appUrl)}/api/extension/results/${resultId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ decision, notes }),
  });
  if (!res.ok) throw new Error(await asError(res));
}
