import { notFound } from "next/navigation";

import { Badge, Button, Card, Input, LinkButton, Notice, PageHeader } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { requireUser } from "@/server/auth";
import { listResultsForTask } from "@/server/extension/service";
import { hasFreepikKey } from "@/server/generation/credentials";
import { getGenerationProvider } from "@/server/generation";
import { getPromptPackage, getTaskForPackage } from "@/server/repository";
import { decideResultAction, startTaskAction } from "./actions";
import { FreepikGenerator } from "./freepik-generator";

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

  const user = await requireUser();
  const task = await getTaskForPackage(packageId);
  const results = task ? await listResultsForTask(user.id, task.id) : [];
  const freepikConnected = await hasFreepikKey();
  const models = getGenerationProvider().listModels();

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

      <Card className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Generate directly (Freepik)
        </h2>
        <FreepikGenerator
          projectId={id}
          sceneId={sceneId}
          packageId={packageId}
          hasKey={freepikConnected}
          models={models}
          task={
            task
              ? {
                  id: task.id,
                  status: task.status,
                  provider: task.provider,
                  providerStatus: task.provider_status,
                  providerTaskId: task.provider_task_id,
                  errorMessage: task.error_message,
                }
              : null
          }
        />
      </Card>

      <Card className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Generation (Chrome extension)
          </h2>
          {task ? <Badge>task: {task.status}</Badge> : null}
        </div>

        <p className="mb-4 text-sm text-muted">
          Send this prompt package to the SceneArc extension, then use it on a generation site and
          import the result. You run generation yourself.
        </p>

        <form action={startTaskAction}>
          <input type="hidden" name="projectId" value={id} />
          <input type="hidden" name="sceneId" value={sceneId} />
          <input type="hidden" name="packageId" value={packageId} />
          <input type="hidden" name="stage" value={pkg.productionStage} />
          <Button type="submit" variant={task ? "secondary" : "primary"}>
            {task ? "Re-send to extension" : "Send to extension"}
          </Button>
        </form>

        {results.length > 0 ? (
          <div className="mt-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
              Imported results
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((r) => (
                <div key={r.id} className="rounded-md border border-charcoal-700 bg-charcoal-900 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge>{r.status}</Badge>
                    <span className="text-xs text-muted-dim">{r.kind}</span>
                  </div>
                  {r.url ? (
                    r.kind === "video" ? (
                      <video src={r.url} controls className="w-full rounded" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.url} alt="Imported result" className="w-full rounded" />
                    )
                  ) : (
                    <p className="text-xs text-muted-dim">No preview available.</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={decideResultAction}>
                      <input type="hidden" name="resultId" value={r.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="sceneId" value={sceneId} />
                      <input type="hidden" name="packageId" value={packageId} />
                      <Button type="submit" className="px-3 py-1 text-xs">
                        Approve
                      </Button>
                    </form>
                    <form action={decideResultAction}>
                      <input type="hidden" name="resultId" value={r.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="sceneId" value={sceneId} />
                      <input type="hidden" name="packageId" value={packageId} />
                      <Button type="submit" variant="danger" className="px-3 py-1 text-xs">
                        Reject
                      </Button>
                    </form>
                  </div>
                  <form action={decideResultAction} className="mt-2 flex gap-2">
                    <input type="hidden" name="resultId" value={r.id} />
                    <input type="hidden" name="decision" value="revision_requested" />
                    <input type="hidden" name="projectId" value={id} />
                    <input type="hidden" name="sceneId" value={sceneId} />
                    <input type="hidden" name="packageId" value={packageId} />
                    <Input name="notes" placeholder="Revision notes…" className="text-xs" />
                    <Button type="submit" variant="secondary" className="px-3 py-1 text-xs">
                      Revise
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
