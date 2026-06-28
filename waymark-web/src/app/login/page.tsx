"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card-strong w-full max-w-md p-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-full bg-moss/15 flex items-center justify-center text-moss text-lg">◆</div>
          <h1 className="text-2xl font-semibold">{copy.brand}</h1>
        </div>
        <p className="text-ink-soft mb-6">{copy.login.tagline}</p>

        {status === "sent" ? (
          <p className="text-moss-deep">{copy.login.sent}</p>
        ) : (
          <form onSubmit={send} className="space-y-3">
            <label className="block text-sm text-ink-soft">{copy.login.emailLabel}</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.login.emailPlaceholder} className="input" autoFocus
            />
            <button type="submit" disabled={status === "sending"} className="btn-primary w-full">
              {status === "sending" ? copy.login.sending : copy.login.send}
            </button>
            {status === "error" && <p className="text-clay text-sm">{copy.login.error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
