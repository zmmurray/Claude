"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";

type Mode = "password" | "magic";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("password");
  const [status, setStatus] = useState<"idle" | "working" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const supabase = createSupabaseBrowser();

  async function logIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null); setStatus("working");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setError(prettyError(error.message)); setStatus("idle"); return; }
    window.location.assign("/today");
  }

  async function createAccount() {
    setError(null); setInfo(null);
    if (!email.trim() || password.length < 6) { setError("Enter your email and a password (6+ characters)."); return; }
    setStatus("working");
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) { setError(prettyError(error.message)); setStatus("idle"); return; }
    if (data.session) { window.location.assign("/today"); return; }
    // Email confirmation is on in Supabase — tell them.
    setInfo("Account created — check your email to confirm, then come back and log in.");
    setStatus("idle");
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null); setInfo(null); setStatus("working");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(prettyError(error.message)); setStatus("idle"); return; }
    setStatus("sent");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="card-strong w-full max-w-md p-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-full bg-moss/15 flex items-center justify-center text-moss text-lg">◆</div>
          <h1 className="text-2xl font-semibold">{copy.brand}</h1>
        </div>
        <p className="text-ink-soft mb-6">{copy.login.tagline}</p>

        {mode === "magic" ? (
          status === "sent" ? (
            <p className="text-moss-deep">{copy.login.sent}</p>
          ) : (
            <form onSubmit={magicLink} className="space-y-3">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={copy.login.emailPlaceholder} className="input" autoFocus />
              <button type="submit" disabled={status === "working"} className="btn-primary w-full">
                {status === "working" ? copy.login.sending : copy.login.send}
              </button>
              {error && <p className="text-clay text-sm">{error}</p>}
              <button type="button" onClick={() => { setMode("password"); setError(null); }}
                className="text-ink-faint text-sm w-full text-center pt-1">
                Use a password instead
              </button>
            </form>
          )
        ) : (
          <form onSubmit={logIn} className="space-y-3">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.login.emailPlaceholder} className="input" autoComplete="email" autoFocus />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" className="input" autoComplete="current-password" />
            <button type="submit" disabled={status === "working"} className="btn-primary w-full">
              {status === "working" ? "…" : "Log in"}
            </button>
            <button type="button" onClick={createAccount} disabled={status === "working"} className="btn-quiet w-full">
              Create account
            </button>
            {error && <p className="text-clay text-sm">{error}</p>}
            {info && <p className="text-moss-deep text-sm">{info}</p>}
            <button type="button" onClick={() => { setMode("magic"); setError(null); }}
              className="text-ink-faint text-sm w-full text-center pt-1">
              Email me a link instead
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

function prettyError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "That email/password didn't match. New here? Tap Create account.";
  if (m.includes("already registered")) return "That email already has an account — just log in with your password.";
  if (m.includes("rate limit")) return "Too many tries for now — give it a few minutes.";
  return msg;
}
