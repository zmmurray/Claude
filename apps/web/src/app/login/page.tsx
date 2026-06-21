"use client";

import { useActionState, useState } from "react";

import { Button, Card, Input, Label, Notice } from "@/components/ui";
import { signInAction, signUpAction, type AuthState } from "./actions";

const initialState: AuthState = {};

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <p className="mb-3 text-center text-sm uppercase tracking-[0.3em] text-amber-accent">
        SceneArc
      </p>
      <Card>
        <h1 className="text-xl font-semibold text-cream-50">
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {mode === "signin"
            ? "Welcome back to your production desk."
            : "Set up access to your projects."}
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
            />
          </div>

          {state.error ? <Notice tone="warning">{state.error}</Notice> : null}
          {state.message ? <Notice>{state.message}</Notice> : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="mt-5 text-center text-sm text-muted">
          {mode === "signin" ? (
            <button className="hover:text-cream-100" onClick={() => setMode("signup")}>
              Need an account? <span className="text-amber-accent">Create one</span>
            </button>
          ) : (
            <button className="hover:text-cream-100" onClick={() => setMode("signin")}>
              Already have an account? <span className="text-amber-accent">Sign in</span>
            </button>
          )}
        </div>
      </Card>
    </main>
  );
}
