"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generatePairingCode, PAIRING_TTL_MS } from "@/server/extension/tokens";

export interface PairingCodeState {
  code?: string;
  expiresAt?: string;
  error?: string;
}

export async function generatePairingCodeAction(
  _prev: PairingCodeState,
  _formData: FormData,
): Promise<PairingCodeState> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MS).toISOString();

  const { error } = await supabase.from("extension_pairings").insert({
    user_id: user.id,
    code,
    expires_at: expiresAt,
  });
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { code, expiresAt };
}

export async function disconnectDeviceAction(formData: FormData): Promise<void> {
  await requireUser();
  const tokenId = String(formData.get("tokenId") ?? "");
  if (!tokenId) return;
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("extension_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId);
  revalidatePath("/settings");
}

export interface DeviceRow {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
}

export async function listConnectedDevices(): Promise<DeviceRow[]> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("extension_tokens")
    .select("id, label, created_at, last_used_at")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as DeviceRow[];
}
