import type { NextRequest } from "next/server";

import type { ExtensionContextResponse } from "@scenearc/shared";

import { corsJson, corsPreflight } from "@/server/extension/cors";
import { getActiveTaskForUser } from "@/server/extension/service";
import { validateBearerToken } from "@/server/extension/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: NextRequest) {
  const auth = await validateBearerToken(request.headers.get("authorization"));
  if (!auth) return corsJson({ error: "Not paired." }, 401);

  const activeTask = await getActiveTaskForUser(auth.userId);
  const body: ExtensionContextResponse = {
    account: { email: auth.email },
    activeTask,
  };
  return corsJson(body);
}
