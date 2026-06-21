import Link from "next/link";

import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { listProjects } from "@/server/repository";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  analyzed: "Analyzed",
  approved: "Approved",
};

export default async function DashboardPage() {
  const projects = await listProjects();

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Your film projects. Open one to continue, or start a new project."
        actions={<LinkButton href="/projects/new">New project</LinkButton>}
      />

      {projects.length === 0 ? (
        <EmptyState title="No projects yet">
          Create your first project to paste a script and run a breakdown.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}/breakdown`}>
              <Card className="h-full transition-colors hover:border-amber-deep">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-medium text-cream-50">{p.title}</h2>
                  <Badge>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted">
                  {p.creative_direction.genre || "No genre set"}
                  {p.creative_direction.period ? ` · ${p.creative_direction.period}` : ""}
                </p>
                <p className="mt-4 text-xs text-muted-dim">
                  Updated {new Date(p.updated_at).toLocaleDateString()}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
