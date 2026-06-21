"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
  message?: string;
}

function safeRedirectPath(input: FormDataEntryValue | null): string {
  const value = typeof input === "string" ? input : "";
  // Only allow internal paths to avoid open-redirects.
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }
  redirect(redirectTo);
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { error: error.message };
  }
  // If email confirmation is enabled, no session is returned yet.
  if (!data.session) {
    return {
      message:
        "Account created. Check your email to confirm, then sign in. (You can disable email confirmation in Supabase to skip this.)",
    };
  }
  redirect(redirectTo);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
