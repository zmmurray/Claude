import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { getSceneDetail, listPromptPackagesForScene } from "@/server/repository";
import { CreatePromptForm } from "./create-prompt-form";

export const dynamic = "force-dynamic";

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </div>
  );
}

export default async function SceneWorkspacePage({
  params,
}: {
  params: Promise<{ id: string; sceneId: string }>;
}) {
  const { id, sceneId } = await params;
  const scene = await getSceneDetail(sceneId);
  if (!scene) notFound();
  const packages = await listPromptPackagesForScene(sceneId);

  return (
    <div>
      <PageHeader
        title={`Scene ${scene.number}`}
        subtitle={scene.slugline}
        actions={
          <LinkButton href={`/projects/${id}/breakdown`} variant="secondary">
            Back to breakdown
          </LinkButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Scene context ----------------------------------------------------- */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Badge>{scene.timeOfDay}</Badge>
              {scene.location ? <Badge>{scene.location.name}</Badge> : null}
            </div>
            <p className="text-sm text-cream-100">{scene.summary || "No summary."}</p>
          </Card>

          <Card>
            <div className="grid gap-6 sm:grid-cols-2">
              <InfoBlock title="Characters">
                {scene.characters.length === 0 ? (
                  <p className="text-sm text-muted-dim">None listed.</p>
                ) : (
                  <ul className="space-y-2 text-sm text-cream-100">
                    {scene.characters.map((c) => (
                      <li key={c.key}>
                        <span className="text-cream-50">{c.name}</span>
                        {c.description ? (
                          <span className="text-muted"> — {c.description}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </InfoBlock>

              <InfoBlock title="Location">
                {scene.location ? (
                  <p className="text-sm text-cream-100">
                    <span className="text-cream-50">{scene.location.name}</span>
                    {scene.location.description ? (
                      <span className="text-muted"> — {scene.location.description}</span>
                    ) : null}
                  </p>
                ) : (
                  <p className="text-sm text-muted-dim">None.</p>
                )}
              </InfoBlock>

              <InfoBlock title="Beats">
                {scene.beats.length === 0 ? (
                  <p className="text-sm text-muted-dim">None.</p>
                ) : (
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-cream-100">
                    {scene.beats.map((b) => (
                      <li key={b.order}>{b.description}</li>
                    ))}
                  </ol>
                )}
              </InfoBlock>

              <InfoBlock title="Props">
                {scene.props.length === 0 ? (
                  <p className="text-sm text-muted-dim">None.</p>
                ) : (
                  <ul className="space-y-1 text-sm text-cream-100">
                    {scene.props.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
              </InfoBlock>

              <InfoBlock title="Wardrobe">
                {scene.wardrobe.length === 0 ? (
                  <p className="text-sm text-muted-dim">None.</p>
                ) : (
                  <ul className="space-y-1 text-sm text-cream-100">
                    {scene.wardrobe.map((w, i) => (
                      <li key={i}>{w.description}</li>
                    ))}
                  </ul>
                )}
              </InfoBlock>

              <InfoBlock title="Continuity">
                {scene.continuityNotes.length === 0 ? (
                  <p className="text-sm text-muted-dim">None.</p>
                ) : (
                  <ul className="space-y-1 text-sm text-cream-100">
                    {scene.continuityNotes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </InfoBlock>
            </div>
          </Card>

          {packages.length > 0 ? (
            <Card>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Prompt packages
              </h3>
              <ul className="space-y-2">
                {packages.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${id}/scenes/${sceneId}/package/${p.id}`}
                      className="text-sm text-amber-accent hover:underline"
                    >
                      {p.payload.shotSummary}
                    </Link>
                    <span className="ml-2 text-xs text-muted-dim">
                      {new Date(p.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        {/* Create prompt package -------------------------------------------- */}
        <div>
          <CreatePromptForm
            projectId={id}
            sceneId={sceneId}
            beats={scene.beats}
          />
        </div>
      </div>
    </div>
  );
}
