import { notFound } from "next/navigation";

import { Badge, Card, LinkButton, Notice, PageHeader } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { getPromptPackage } from "@/server/repository";

export const dynamic = "force-dynamic";

const STAGE_LABEL: Record<string, string> = {
  scene_still: "Scene still",
  character_design: "Character design",
  location_design: "Location design",
  frameburst: "Frameburst",
  video_lowres: "Low-res video",
  video_final: "Final video",
};

export default async function PromptPackagePage({
  params,
}: {
  params: Promise<{ id: string; sceneId: string; packageId: string }>;
}) {
  const { id, sceneId, packageId } = await params;
  const row = await getPromptPackage(packageId);
  if (!row) notFound();
  const pkg = row.payload;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Prompt package"
        subtitle={pkg.shotSummary}
        actions={
          <LinkButton href={`/projects/${id}/scenes/${sceneId}`} variant="secondary">
            Back to scene
          </LinkButton>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge>{STAGE_LABEL[pkg.productionStage] ?? pkg.productionStage}</Badge>
        <Badge>Target: Generic Image Generator</Badge>
      </div>

      <Card className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Prepared prompt
          </h2>
          <CopyButton text={pkg.prompt} label="Copy prompt" />
        </div>
        <pre className="whitespace-pre-wrap rounded-md border border-charcoal-700 bg-charcoal-900 p-4 text-sm leading-relaxed text-cream-100">
          {pkg.prompt}
        </pre>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Required references
          </h2>
          {pkg.requiredReferences.length === 0 ? (
            <p className="text-sm text-muted-dim">None.</p>
          ) : (
            <ul className="space-y-2 text-sm text-cream-100">
              {pkg.requiredReferences.map((r, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span>{r.label}</span>
                  <Badge>{r.required ? "required" : "optional"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Suggested settings
          </h2>
          {pkg.suggestedSettings.length === 0 ? (
            <p className="text-sm text-muted-dim">None.</p>
          ) : (
            <ul className="space-y-2 text-sm text-cream-100">
              {pkg.suggestedSettings.map((s, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="text-muted">{s.label}</span>
                  <span>{s.value}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {pkg.notes.length > 0 ? (
        <div className="mt-6">
          <Notice>
            <ul className="list-disc space-y-1 pl-5">
              {pkg.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </Notice>
        </div>
      ) : null}
    </div>
  );
}
