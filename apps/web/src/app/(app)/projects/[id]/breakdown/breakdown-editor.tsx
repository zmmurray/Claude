"use client";

import { useActionState, useState } from "react";
import type { ScriptAnalysis, TimeOfDay } from "@scenearc/shared";

import { Button, Card, Input, Label, Notice, Textarea } from "@/components/ui";
import {
  approveBreakdownAction,
  saveBreakdownAction,
  type ApproveState,
  type SaveBreakdownState,
} from "./actions";

const TIME_OPTIONS: TimeOfDay[] = [
  "DAY",
  "NIGHT",
  "DAWN",
  "DUSK",
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "CONTINUOUS",
  "UNSPECIFIED",
];

function makeKey(seed: string): string {
  const base =
    seed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "item";
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

const linesToArray = (value: string): string[] =>
  value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

export function BreakdownEditor({
  projectId,
  initialAnalysis,
  approved,
}: {
  projectId: string;
  initialAnalysis: ScriptAnalysis;
  approved: boolean;
}) {
  const [analysis, setAnalysis] = useState<ScriptAnalysis>(initialAnalysis);
  const [saveState, saveAction, saving] = useActionState<SaveBreakdownState, FormData>(
    saveBreakdownAction,
    {},
  );
  const [approveState, approveAction, approving] = useActionState<ApproveState, FormData>(
    approveBreakdownAction,
    {},
  );

  // --- mutation helpers ------------------------------------------------------
  const update = (next: Partial<ScriptAnalysis>) => setAnalysis((a) => ({ ...a, ...next }));

  const updateCharacter = (i: number, patch: Partial<ScriptAnalysis["characters"][number]>) =>
    update({ characters: analysis.characters.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  const updateLocation = (i: number, patch: Partial<ScriptAnalysis["locations"][number]>) =>
    update({ locations: analysis.locations.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });
  const updateScene = (i: number, patch: Partial<ScriptAnalysis["scenes"][number]>) =>
    update({ scenes: analysis.scenes.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });

  return (
    <div className="space-y-8">
      {/* Characters ---------------------------------------------------------- */}
      <section>
        <SectionHeader
          title="Characters"
          onAdd={() =>
            update({
              characters: [
                ...analysis.characters,
                { key: makeKey("character"), name: "New character", description: "", relationships: [] },
              ],
            })
          }
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {analysis.characters.map((c, i) => (
            <Card key={c.key}>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={c.name} onChange={(e) => updateCharacter(i, { name: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    rows={2}
                    value={c.description}
                    onChange={(e) => updateCharacter(i, { description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Relationships (one per line)</Label>
                  <Textarea
                    rows={2}
                    value={c.relationships.join("\n")}
                    onChange={(e) => updateCharacter(i, { relationships: linesToArray(e.target.value) })}
                  />
                </div>
                <RemoveButton
                  onClick={() =>
                    update({ characters: analysis.characters.filter((_, idx) => idx !== i) })
                  }
                />
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Locations ----------------------------------------------------------- */}
      <section>
        <SectionHeader
          title="Locations"
          onAdd={() =>
            update({
              locations: [
                ...analysis.locations,
                { key: makeKey("location"), name: "New location", description: "" },
              ],
            })
          }
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {analysis.locations.map((l, i) => (
            <Card key={l.key}>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={l.name} onChange={(e) => updateLocation(i, { name: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    rows={2}
                    value={l.description}
                    onChange={(e) => updateLocation(i, { description: e.target.value })}
                  />
                </div>
                <RemoveButton
                  onClick={() =>
                    update({ locations: analysis.locations.filter((_, idx) => idx !== i) })
                  }
                />
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Scenes -------------------------------------------------------------- */}
      <section>
        <SectionHeader
          title="Scenes"
          onAdd={() =>
            update({
              scenes: [
                ...analysis.scenes,
                {
                  key: makeKey("scene"),
                  number: String(analysis.scenes.length + 1),
                  slugline: "",
                  summary: "",
                  timeOfDay: "UNSPECIFIED",
                  characterKeys: [],
                  props: [],
                  wardrobe: [],
                  continuityNotes: [],
                  beats: [],
                  suggestedStages: ["scene_still"],
                },
              ],
            })
          }
        />
        <div className="space-y-4">
          {analysis.scenes.map((s, i) => (
            <Card key={s.key}>
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label>Scene number</Label>
                    <Input value={s.number} onChange={(e) => updateScene(i, { number: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Slugline</Label>
                    <Input value={s.slugline} onChange={(e) => updateScene(i, { slugline: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Summary</Label>
                  <Textarea
                    rows={2}
                    value={s.summary}
                    onChange={(e) => updateScene(i, { summary: e.target.value })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Location</Label>
                    <select
                      value={s.locationKey ?? ""}
                      onChange={(e) => updateScene(i, { locationKey: e.target.value || undefined })}
                      className="w-full rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-cream-50"
                    >
                      <option value="">— none —</option>
                      {analysis.locations.map((l) => (
                        <option key={l.key} value={l.key}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Time of day</Label>
                    <select
                      value={s.timeOfDay}
                      onChange={(e) => updateScene(i, { timeOfDay: e.target.value as TimeOfDay })}
                      className="w-full rounded-md border border-charcoal-600 bg-charcoal-900 px-3 py-2 text-sm text-cream-50"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Characters in this scene</Label>
                  <div className="flex flex-wrap gap-3">
                    {analysis.characters.length === 0 ? (
                      <span className="text-xs text-muted-dim">Add characters above first.</span>
                    ) : (
                      analysis.characters.map((c) => {
                        const checked = s.characterKeys.includes(c.key);
                        return (
                          <label key={c.key} className="flex items-center gap-1.5 text-sm text-cream-200">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                updateScene(i, {
                                  characterKeys: e.target.checked
                                    ? [...s.characterKeys, c.key]
                                    : s.characterKeys.filter((k) => k !== c.key),
                                })
                              }
                            />
                            {c.name}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Props (one per line)</Label>
                    <Textarea
                      rows={3}
                      value={s.props.join("\n")}
                      onChange={(e) => updateScene(i, { props: linesToArray(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Continuity notes (one per line)</Label>
                    <Textarea
                      rows={3}
                      value={s.continuityNotes.join("\n")}
                      onChange={(e) => updateScene(i, { continuityNotes: linesToArray(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Scene beats (one per line)</Label>
                  <Textarea
                    rows={3}
                    value={s.beats.map((b) => b.description).join("\n")}
                    onChange={(e) =>
                      updateScene(i, {
                        beats: linesToArray(e.target.value).map((description, idx) => ({
                          order: idx + 1,
                          description,
                        })),
                      })
                    }
                  />
                </div>

                <RemoveButton
                  label="Remove scene"
                  onClick={() => update({ scenes: analysis.scenes.filter((_, idx) => idx !== i) })}
                />
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Save / approve ------------------------------------------------------ */}
      <div className="sticky bottom-4 z-10 rounded-[var(--radius-card)] border border-charcoal-700 bg-charcoal-850/95 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-4">
          <form action={saveAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="analysis" value={JSON.stringify(analysis)} />
            <Button type="submit" variant="secondary" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>

          <form action={approveAction}>
            <input type="hidden" name="projectId" value={projectId} />
            <Button type="submit" disabled={approving}>
              {approving ? "Approving…" : approved ? "Re-approve breakdown" : "Approve breakdown"}
            </Button>
          </form>

          {saveState.savedAt ? <span className="text-sm text-[var(--color-success)]">Saved.</span> : null}
          {approveState.approved ? (
            <span className="text-sm text-[var(--color-success)]">Breakdown approved.</span>
          ) : null}
          {saveState.error ? <Notice tone="warning">{saveState.error}</Notice> : null}
          {approveState.error ? <Notice tone="warning">{approveState.error}</Notice> : null}
        </div>
        <p className="mt-2 text-xs text-muted-dim">
          Tip: Save your edits before approving. Approving unlocks the scene workspaces below.
        </p>
      </div>
    </div>
  );
}

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <Button type="button" variant="ghost" onClick={onAdd}>
        + Add
      </Button>
    </div>
  );
}

function RemoveButton({ onClick, label = "Remove" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs text-muted hover:text-[var(--color-danger)]"
    >
      {label}
    </button>
  );
}
