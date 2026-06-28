"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";

export default function ResetPage() {
  const supabase = createSupabaseBrowser();
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState<boolean | null>(null);
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError("Use at least 6 characters."); return; }
    setStatus("working"); setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setStatus("idle"); return; }
    window.location.assign("/today");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card-strong w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold mb-2">Set a new password</h1>
        {ready === false ? (
          <p className="text-ink-soft">
            Open this page from the reset link in your email, then you can set a new password here.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="New password" className="input" autoComplete="new-password" autoFocus />
            <button type="submit" disabled={status === "working" || ready === null} className="btn-primary w-full">
              {status === "working" ? "Saving…" : "Save new password"}
            </button>
            {error && <p className="text-clay text-sm">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
