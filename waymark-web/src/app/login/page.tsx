"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";

type Mode = "password" | "magic" | "reset";

export default function LoginPage() {
  const supabase = createSupabaseBrowser();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function google() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(prettyError(error.message));
  }

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

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null); setInfo(null); setStatus("working");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset`,
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

        {/* Google — always available */}
        <button onClick={google} className="btn-quiet w-full mb-4">
          <span className="font-semibold text-[15px]">G</span> Continue with Google
        </button>
        <div className="flex items-center gap-3 mb-4 text-ink-faint text-xs">
          <div className="h-px flex-1 bg-black/10" /> or <div className="h-px flex-1 bg-black/10" />
        </div>

        {mode === "reset" ? (
          status === "sent" ? (
            <p className="text-moss-deep">Check your email for a link to set a new password.</p>
          ) : (
            <form onSubmit={sendReset} className="space-y-3">
              <p className="text-ink-soft text-sm">Enter your email and I'll send a reset link.</p>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder={copy.login.emailPlaceholder} className="input" autoFocus />
              <button type="submit" disabled={status === "working"} className="btn-primary w-full">
                {status === "working" ? "Sending…" : "Send reset link"}
              </button>
              {error && <p className="text-clay text-sm">{error}</p>}
              <button type="button" onClick={() => { setMode("password"); setError(null); }}
                className="text-ink-faint text-sm w-full text-center pt-1">Back to log in</button>
            </form>
          )
        ) : mode === "magic" ? (
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
                className="text-ink-faint text-sm w-full text-center pt-1">Use a password instead</button>
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
            <div className="flex justify-between pt-1 text-sm">
              <button type="button" onClick={() => { setMode("reset"); setError(null); }} className="text-ink-faint">Forgot password?</button>
              <button type="button" onClick={() => { setMode("magic"); setError(null); }} className="text-ink-faint">Email me a link</button>
            </div>
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
  if (m.includes("provider is not enabled") || m.includes("oauth")) return "Google sign-in isn't switched on yet in Supabase.";
  return msg;
}
