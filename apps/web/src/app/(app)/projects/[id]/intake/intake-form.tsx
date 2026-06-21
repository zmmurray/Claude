"use client";

import { useActionState } from "react";

import { Button, Card, Input, Label, Notice, Textarea } from "@/components/ui";
import type { CreativeDirection } from "@/server/repository";
import { analyzeScriptAction, type IntakeState } from "./actions";

const initialState: IntakeState = {};

interface ProviderInfo {
  paid: boolean;
  id: string;
  model: string;
  confirmRequired: boolean;
}

export function IntakeForm({
  projectId,
  title,
  direction,
  existingScript,
  provider,
}: {
  projectId: string;
  title: string;
  direction: CreativeDirection;
  existingScript: string;
  provider: ProviderInfo;
}) {
  const [state, formAction, pending] = useActionState(analyzeScriptAction, initialState);
  const showConfirm = provider.confirmRequired || state.needsPaidConfirmation;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="projectId" value={projectId} />

      <Card>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Project title</Label>
            <Input id="title" name="title" defaultValue={title} required />
          </div>
          <div>
            <Label htmlFor="scriptText">Script</Label>
            <Textarea
              id="scriptText"
              name="scriptText"
              rows={12}
              defaultValue={existingScript}
              placeholder={"Paste your script here.\n\nINT. KITCHEN - NIGHT\n\nMAYA pours coffee..."}
            />
            <p className="mt-1.5 text-xs text-muted-dim">
              Or upload a plain-text script (.txt, .fountain, .md):
            </p>
            <input
              type="file"
              name="scriptFile"
              accept=".txt,.fountain,.md,text/plain"
              className="mt-2 block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-charcoal-700 file:px-3 file:py-1.5 file:text-cream-100"
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          Creative direction
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="styleAndTone">Style &amp; tone</Label>
            <Textarea
              id="styleAndTone"
              name="styleAndTone"
              rows={3}
              defaultValue={direction.styleAndTone}
              placeholder="e.g. Gritty neo-noir, restrained, melancholic"
            />
          </div>
          <div>
            <Label htmlFor="genre">Genre</Label>
            <Input id="genre" name="genre" defaultValue={direction.genre} placeholder="Crime" />
          </div>
          <div>
            <Label htmlFor="period">Period</Label>
            <Input id="period" name="period" defaultValue={direction.period} placeholder="Modern day" />
          </div>
          <div>
            <Label htmlFor="aspectRatio">Aspect ratio</Label>
            <Input
              id="aspectRatio"
              name="aspectRatio"
              defaultValue={direction.aspectRatio}
              placeholder="2.39:1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cinematographyNotes">Cinematography notes</Label>
            <Textarea
              id="cinematographyNotes"
              name="cinematographyNotes"
              rows={2}
              defaultValue={direction.cinematographyNotes}
              placeholder="Hard shadows, anamorphic, sodium streetlight"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="additionalInstructions">Additional instructions</Label>
            <Textarea
              id="additionalInstructions"
              name="additionalInstructions"
              rows={2}
              defaultValue={direction.additionalInstructions}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="references">Reference images (optional)</Label>
            <input
              id="references"
              type="file"
              name="references"
              accept="image/*"
              multiple
              className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-charcoal-700 file:px-3 file:py-1.5 file:text-cream-100"
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3">
          {provider.paid ? (
            <Notice tone="warning">
              Active analyzer: <strong>{provider.id}</strong> ({provider.model}). This is a{" "}
              <strong>paid</strong> language-model provider — analyzing will incur cost.
            </Notice>
          ) : (
            <Notice>
              Active analyzer: <strong>mock mode</strong> — free, no API key needed. Returns a
              realistic example breakdown.
            </Notice>
          )}

          {showConfirm ? (
            <label className="flex items-center gap-2 text-sm text-cream-200">
              <input type="checkbox" name="confirmPaid" className="h-4 w-4" />
              I understand this will make a paid request.
            </label>
          ) : null}

          {state.error ? <Notice tone="warning">{state.error}</Notice> : null}

          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Analyzing…" : "Analyze script"}
            </Button>
          </div>
        </div>
      </Card>
    </form>
  );
}
