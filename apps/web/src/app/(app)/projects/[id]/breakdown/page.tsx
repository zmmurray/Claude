import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import {
  getBreakdown,
  getProject,
  isBreakdownApproved,
  listScenes,
} from "@/server/repository";
import { BreakdownEditor } from "./breakdown-editor";

export const dynamic = "force-dynamic";

export default async function BreakdownPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [breakdown, approved, scenes] = await Promise.all([
    getBreakdown(id),
    isBreakdownApproved(id),
    listScenes(id),
  ]);

  const isEmpty =
    breakdown.characters.length === 0 &&
    breakdown.locations.length === 0 &&
    breakdown.scenes.length === 0;

  return (
    <div>
      <PageHeader
        title={project.title}
        subtitle="Review and edit the breakdown, then approve it to open scenes."
        actions={
          <>
            <LinkButton href={`/projects/${id}/intake`} variant="secondary">
              Edit intake
            </LinkButton>
            {approved ? <Badge>Approved</Badge> : null}
          </>
        }
      />

      {isEmpty ? (
        <EmptyState title="No breakdown yet">
          Go to{" "}
          <Link className="text-amber-accent" href={`/projects/${id}/intake`}>
            project intake
          </Link>{" "}
          to paste your script and analyze it.
        </EmptyState>
      ) : (
        <>
          <BreakdownEditor projectId={id} initialAnalysis={breakdown} approved={approved} />

          {scenes.length > 0 ? (
            <div className="mt-10">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
                Scenes
              </h2>
              {!approved ? (
                <p className="mb-4 text-sm text-muted-dim">
                  Approve the breakdown above to open a scene workspace.
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {scenes.map((s) => {
                  const inner = (
                    <Card className="h-full transition-colors hover:border-amber-deep">
                      <div className="flex items-baseline gap-2">
                        <span className="text-amber-accent">Scene {s.number}</span>
                        <span className="text-xs text-muted-dim">{s.slugline}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted">{s.summary}</p>
                    </Card>
                  );
                  return approved ? (
                    <Link key={s.id} href={`/projects/${id}/scenes/${s.id}`}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={s.id} className="opacity-60">
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
