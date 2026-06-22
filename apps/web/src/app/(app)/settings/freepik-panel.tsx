"use client";

import { useActionState } from "react";

import { Button, Input, Notice } from "@/components/ui";
import {
  removeFreepikKeyAction,
  saveFreepikKeyAction,
  type FreepikKeyState,
} from "./generation-actions";

const initialState: FreepikKeyState = {};

export function FreepikPanel({ hasKey }: { hasKey: boolean }) {
  const [state, formAction, pending] = useActionState(saveFreepikKeyAction, initialState);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Add your own Freepik API key to generate images (Nano Banana) and video (Seedance) directly
        from a scene. Your key is encrypted and stored server-side — never shown in the browser.
        Generations bill to your Freepik account.
      </p>

      {hasKey ? (
        <Notice>A Freepik key is saved. Generation is enabled.</Notice>
      ) : (
        <Notice tone="warning">No Freepik key yet — add one to enable direct generation.</Notice>
      )}

      <form action={formAction} className="space-y-3">
        <Input
          name="apiKey"
          type="password"
          placeholder="Paste your Freepik API key"
          autoComplete="off"
        />
        {state.error ? <Notice tone="warning">{state.error}</Notice> : null}
        {state.saved ? <span className="text-sm text-[var(--color-success)]">Saved.</span> : null}
        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : hasKey ? "Replace key" : "Save key"}
          </Button>
        </div>
      </form>

      {hasKey ? (
        <form action={removeFreepikKeyAction}>
          <Button type="submit" variant="danger">
            Remove key
          </Button>
        </form>
      ) : null}

      <p className="text-xs text-muted-dim">
        Get a key at freepik.com → API (requires a Freepik plan with API access).
      </p>
    </div>
  );
}
