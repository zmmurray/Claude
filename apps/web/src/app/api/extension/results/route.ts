import type { NextRequest } from "next/server";

import { ImportResultRequestSchema, type ImportResultResponse } from "@scenearc/shared";

import { corsJson, corsPreflight } from "@/server/extension/cors";
import { importResult } from "@/server/extension/service";
import { validateBearerToken } from "@/server/extension/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest) {
  const auth = await validateBearerToken(request.headers.get("authorization"));
  if (!auth) return corsJson({ error: "Not paired." }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return corsJson({ error: "Invalid request body." }, 400);
  }

  const parsed = ImportResultRequestSchema.safeParse(body);
  if (!parsed.success) {
    return corsJson({ error: "Invalid result payload." }, 400);
  }

  try {
    const resultId = await importResult(auth.userId, parsed.data);
    const response: ImportResultResponse = { resultId };
    return corsJson(response, 201);
  } catch (err) {
    return corsJson({ error: err instanceof Error ? err.message : "Import failed." }, 400);
  }
}
