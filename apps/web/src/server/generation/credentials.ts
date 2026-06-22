import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { decryptSecret, encryptSecret } from "./crypto";

const PROVIDER = "freepik";

/** Save (or replace) the user's Freepik API key, encrypted at rest. */
export async function saveFreepikKey(userId: string, apiKey: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const enc = encryptSecret(apiKey.trim());
  const { error } = await supabase.from("provider_credentials").upsert(
    {
      user_id: userId,
      provider: PROVIDER,
      encrypted_key: enc.ciphertext,
      iv: enc.iv,
      auth_tag: enc.authTag,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw new Error(error.message);
}

export async function removeFreepikKey(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.from("provider_credentials").delete().eq("provider", PROVIDER);
}

/** True if the user has stored a key (or a server env fallback exists). */
export async function hasFreepikKey(): Promise<boolean> {
  if (process.env.FREEPIK_API_KEY) return true;
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("provider_credentials")
    .select("id", { count: "exact", head: true })
    .eq("provider", PROVIDER);
  return (count ?? 0) > 0;
}

/**
 * Resolve the usable Freepik API key for a user: their stored key first, then a
 * server-wide FREEPIK_API_KEY env fallback. Returns null if neither exists.
 */
export async function resolveFreepikKey(userId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("provider_credentials")
    .select("encrypted_key, iv, auth_tag")
    .eq("provider", PROVIDER)
    .eq("user_id", userId)
    .maybeSingle();

  if (data) {
    try {
      return decryptSecret({ ciphertext: data.encrypted_key, iv: data.iv, authTag: data.auth_tag });
    } catch {
      // fall through to env fallback
    }
  }
  return process.env.FREEPIK_API_KEY ?? null;
}
