import type { NextRequest } from "next/server";

import { DecisionRequestSchema } from "@scenearc/shared";

import { corsJson, corsPreflight } from "@/server/extension/cors";
import { decideOnResult } from "@/server/extension/service";
import { validateBearerToken } from "@/server/extension/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await validateBearerToken(request.headers.get("authorization"));
  if (!auth) return corsJson({ error: "Not paired." }, 401);

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return corsJson({ error: "Invalid request body." }, 400);
  }

  const parsed = DecisionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return corsJson({ error: "Invalid decision." }, 400);
  }

  try {
    await decideOnResult(auth.userId, id, parsed.data.decision, parsed.data.notes);
    return corsJson({ ok: true });
  } catch (err) {
    return corsJson({ error: err instanceof Error ? err.message : "Failed." }, 400);
  }
}
