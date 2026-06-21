import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { getLLMConfig } from "@/server/env";
import { getLLMProvider } from "@/server/llm";
import { getProject, getScript } from "@/server/repository";
import { IntakeForm } from "./intake-form";

export const dynamic = "force-dynamic";

export default async function IntakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const existingScript = await getScript(id);
  const provider = getLLMProvider();
  const config = getLLMConfig();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Project intake"
        subtitle="Add your script and creative direction, then analyze."
      />
      <IntakeForm
        projectId={project.id}
        title={project.title}
        direction={project.creative_direction}
        existingScript={existingScript ?? ""}
        provider={{
          paid: provider.paid,
          id: provider.id,
          model: provider.model,
          confirmRequired: provider.paid && config.confirmPaidCalls,
        }}
      />
    </div>
  );
}
