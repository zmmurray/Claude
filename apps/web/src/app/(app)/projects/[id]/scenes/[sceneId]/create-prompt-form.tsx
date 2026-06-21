"use client";

import { useActionState } from "react";

import { Button, Card, Label, Notice, Textarea } from "@/components/ui";
import { createPromptPackageAction, type CreatePromptState } from "./actions";

const initialState: CreatePromptState = {};

const STAGES: { value: string; label: string }[] = [
  { value: "scene_still", label: "Scene still" },
  { value: "character_design", label: "Character design" },
  { value: "location_design", label: "Location design" },
];

export function CreatePromptForm({
  projectId,
  sceneId,
  beats,
}: {
  projectId: string;
  sceneId: string;
  beats: { order: number; description: string }[];
}) {
  const [state, formAction, pending] = useActionState(createPromptPackageAction, initialState);

  const selectClass =
    "w-full rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-cream-50";

  return (
    <Card className="sticky top-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Create prompt package
      </h2>
      <p className="mt-1 text-xs text-muted-dim">
        SceneArc compiles a ready-to-use prompt. You run generation yourself.
      </p>

      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="sceneId" value={sceneId} />

        <div>
          <Label htmlFor="stage">Production stage</Label>
          <select id="stage" name="stage" className={selectClass} defaultValue="scene_still">
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="beatOrder">Focus on a beat (optional)</Label>
          <select id="beatOrder" name="beatOrder" className={selectClass} defaultValue="">
            <option value="">Whole scene</option>
            {beats.map((b) => (
              <option key={b.order} value={b.order}>
                Beat {b.order}: {b.description.slice(0, 40)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="userInstructions">Your direction (optional)</Label>
          <Textarea
            id="userInstructions"
            name="userInstructions"
            rows={3}
            placeholder="e.g. Tight close-up, push in slowly."
          />
        </div>

        <div>
          <Label>Target platform</Label>
          <p className="rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-muted">
            Generic Image Generator
          </p>
        </div>

        {state.error ? <Notice tone="warning">{state.error}</Notice> : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Compiling…" : "Create prompt package"}
        </Button>
      </form>
    </Card>
  );
}
