"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/server/auth";
import { removeFreepikKey, saveFreepikKey } from "@/server/generation/credentials";

export interface FreepikKeyState {
  saved?: boolean;
  error?: string;
}

export async function saveFreepikKeyAction(
  _prev: FreepikKeyState,
  formData: FormData,
): Promise<FreepikKeyState> {
  const user = await requireUser();
  const key = String(formData.get("apiKey") ?? "").trim();
  if (!key) return { error: "Paste your Freepik API key." };
  try {
    await saveFreepikKey(user.id, key);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save the key." };
  }
  revalidatePath("/settings");
  return { saved: true };
}

export async function removeFreepikKeyAction(): Promise<void> {
  await requireUser();
  await removeFreepikKey();
  revalidatePath("/settings");
}
