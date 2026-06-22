"use client";

import { useActionState } from "react";

import { Button, Notice } from "@/components/ui";
import {
  checkFreepikStatusAction,
  generateWithFreepikAction,
  type GenerateState,
} from "./actions";

interface ModelOption {
  id: string;
  label: string;
  kind: string;
  needsSourceImage?: boolean;
}

interface TaskInfo {
  id: string;
  status: string;
  provider: string | null;
  providerStatus: string | null;
  providerTaskId: string | null;
  errorMessage: string | null;
}

const initialState: GenerateState = {};

export function FreepikGenerator({
  projectId,
  sceneId,
  packageId,
  hasKey,
  models,
  task,
}: {
  projectId: string;
  sceneId: string;
  packageId: string;
  hasKey: boolean;
  models: ModelOption[];
  task: TaskInfo | null;
}) {
  const [state, formAction, pending] = useActionState(generateWithFreepikAction, initialState);

  const selectClass =
    "w-full rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-cream-50";

  const isProcessing =
    task?.provider === "freepik" &&
    task.status === "generating" &&
    Boolean(task.providerTaskId);

  if (!hasKey) {
    return (
      <Notice tone="warning">
        Add your Freepik API key in <strong>Settings → Generation</strong> to generate directly.
      </Notice>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Generate directly with your Freepik key — no copy/paste needed. This uses your Freepik
        credits. Video can take a few minutes.
      </p>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="sceneId" value={sceneId} />
        <input type="hidden" name="packageId" value={packageId} />
        <select name="modelId" className={selectClass} defaultValue={models[0]?.id}>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
              {m.needsSourceImage ? " (needs an approved image first)" : ""}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-cream-200">
          <input type="checkbox" name="confirmPaid" className="h-4 w-4" />
          I understand this uses my Freepik credits (paid).
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Generate with Freepik"}
        </Button>
      </form>

      {state.error ? <Notice tone="warning">{state.error}</Notice> : null}
      {state.status === "completed" ? (
        <Notice>Done — the result appears below.</Notice>
      ) : null}
      {state.status === "processing" ? (
        <Notice>Submitted. Use “Check status” below when it’s ready.</Notice>
      ) : null}

      {isProcessing ? (
        <form action={checkFreepikStatusAction} className="flex items-center gap-3">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="sceneId" value={sceneId} />
          <input type="hidden" name="packageId" value={packageId} />
          <input type="hidden" name="taskRowId" value={task!.id} />
          <span className="text-sm text-amber-accent">Generating…</span>
          <Button type="submit" variant="secondary">
            Check status
          </Button>
        </form>
      ) : null}

      {task?.errorMessage ? <Notice tone="warning">{task.errorMessage}</Notice> : null}
    </div>
  );
}
