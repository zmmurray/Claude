import type { NextRequest } from "next/server";

import { PairRequestSchema } from "@scenearc/shared";

import { corsJson, corsPreflight } from "@/server/extension/cors";
import { redeemPairingCode } from "@/server/extension/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return corsJson({ error: "Invalid request body." }, 400);
  }

  const parsed = PairRequestSchema.safeParse(body);
  if (!parsed.success) {
    return corsJson({ error: "A pairing code is required." }, 400);
  }

  const result = await redeemPairingCode(parsed.data.code);
  if (!result) {
    return corsJson({ error: "That pairing code is invalid or has expired." }, 401);
  }

  return corsJson(result);
}
