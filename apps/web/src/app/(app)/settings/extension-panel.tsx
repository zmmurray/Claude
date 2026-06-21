"use client";

import { useActionState } from "react";

import { Button, Notice } from "@/components/ui";
import {
  disconnectDeviceAction,
  generatePairingCodeAction,
  type DeviceRow,
  type PairingCodeState,
} from "./extension-actions";

const initialState: PairingCodeState = {};

export function ExtensionPanel({ devices }: { devices: DeviceRow[] }) {
  const [state, formAction, pending] = useActionState(generatePairingCodeAction, initialState);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Link the SceneArc Chrome extension to this account. Generate a code, then enter it in the
        extension within 10 minutes. The code can be used once.
      </p>

      <form action={formAction}>
        <Button type="submit" disabled={pending}>
          {pending ? "Generating…" : "Generate pairing code"}
        </Button>
      </form>

      {state.error ? <Notice tone="warning">{state.error}</Notice> : null}

      {state.code ? (
        <Notice tone="warning">
          <div className="space-y-1">
            <p>
              Your pairing code (valid for 10 minutes):
            </p>
            <p className="font-mono text-2xl tracking-widest text-amber-bright">{state.code}</p>
            <p className="text-xs text-muted">Enter this in the extension's “Pair” screen.</p>
          </div>
        </Notice>
      ) : null}

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Connected extensions
        </h3>
        {devices.length === 0 ? (
          <p className="text-sm text-muted-dim">No extensions connected yet.</p>
        ) : (
          <ul className="space-y-2">
            {devices.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded-md border border-charcoal-700 bg-charcoal-900 px-3 py-2 text-sm"
              >
                <span>
                  <span className="text-cream-100">{d.label}</span>
                  <span className="ml-2 text-xs text-muted-dim">
                    {d.last_used_at
                      ? `last used ${new Date(d.last_used_at).toLocaleString()}`
                      : `paired ${new Date(d.created_at).toLocaleDateString()}`}
                  </span>
                </span>
                <form action={disconnectDeviceAction}>
                  <input type="hidden" name="tokenId" value={d.id} />
                  <Button type="submit" variant="danger">
                    Disconnect
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
