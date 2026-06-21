import "server-only";

import { createHash, randomBytes, randomInt } from "node:crypto";

import type { ExtensionAccount } from "@scenearc/shared";

import { createSupabaseServiceClient } from "@/lib/supabase/server";

const PAIRING_TTL_MS = 10 * 60 * 1000; // 10 minutes
// Unambiguous alphabet (no 0/O/1/I).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePairingCode(): string {
  let code = "";
  for (let i = 0; i < 8; i += 1) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export interface RedeemResult {
  token: string;
  account: ExtensionAccount;
}

/**
 * Redeem a one-time pairing code (server-side, service role): validate it,
 * mark it used, and issue a long-lived bearer token for the extension.
 */
export async function redeemPairingCode(rawCode: string): Promise<RedeemResult | null> {
  const code = rawCode.trim().toUpperCase();
  const supabase = createSupabaseServiceClient();

  const { data: pairing } = await supabase
    .from("extension_pairings")
    .select("id, user_id, expires_at, used_at")
    .eq("code", code)
    .maybeSingle();

  if (!pairing) return null;
  if (pairing.used_at) return null;
  if (new Date(pairing.expires_at).getTime() < Date.now()) return null;

  // Mark used immediately (single-use).
  await supabase
    .from("extension_pairings")
    .update({ used_at: new Date().toISOString() })
    .eq("id", pairing.id);

  const token = generateToken();
  const { error } = await supabase.from("extension_tokens").insert({
    user_id: pairing.user_id,
    token_hash: hashToken(token),
    label: "Chrome extension",
  });
  if (error) return null;

  const { data: userResult } = await supabase.auth.admin.getUserById(pairing.user_id);
  const email = userResult.user?.email ?? "";

  return { token, account: { email } };
}

export interface ValidatedToken {
  userId: string;
  email: string;
}

/** Validate a bearer token from the extension; returns the owning user or null. */
export async function validateBearerToken(authorization: string | null): Promise<ValidatedToken | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  if (!token) return null;

  const supabase = createSupabaseServiceClient();
  const { data: row } = await supabase
    .from("extension_tokens")
    .select("id, user_id, revoked_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!row || row.revoked_at) return null;

  await supabase
    .from("extension_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  const { data: userResult } = await supabase.auth.admin.getUserById(row.user_id);
  return { userId: row.user_id, email: userResult.user?.email ?? "" };
}

export { PAIRING_TTL_MS };
