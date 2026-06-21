import { Badge, Button, Card, Notice, PageHeader } from "@/components/ui";
import { signOutAction } from "@/app/login/actions";
import { requireUser } from "@/server/auth";
import { getLLMConfig } from "@/server/env";
import { getLLMProvider } from "@/server/llm";
import { ExtensionPanel } from "./extension-panel";
import { listConnectedDevices } from "./extension-actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const provider = getLLMProvider();
  const config = getLLMConfig();
  const devices = await listConnectedDevices();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" subtitle="Account and analysis configuration." />

      <div className="space-y-6">
        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Account</h2>
          <p className="text-sm text-cream-100">{user.email}</p>
          <div className="mt-4">
            <form action={signOutAction}>
              <Button type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Script analysis
          </h2>
          <div className="space-y-3 text-sm">
            <Row label="Active provider">
              <Badge>{provider.id}</Badge>
            </Row>
            <Row label="Model">
              <span className="text-cream-100">{provider.model}</span>
            </Row>
            <Row label="Cost">
              <span className="text-cream-100">{provider.paid ? "Paid (per use)" : "Free (mock)"}</span>
            </Row>
            <Row label="Confirm before paid calls">
              <span className="text-cream-100">{config.confirmPaidCalls ? "On" : "Off"}</span>
            </Row>
          </div>

          <div className="mt-4">
            {provider.paid ? (
              <Notice tone="warning">
                A paid analyzer is active. Real script analysis will incur language-model costs.
              </Notice>
            ) : (
              <Notice>
                Mock mode is active — analysis is free and needs no API key. To enable real analysis,
                set the language-model environment variables (see NONCODER_GUIDE.md), then redeploy.
              </Notice>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Chrome extension
          </h2>
          <ExtensionPanel devices={devices} />
        </Card>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      {children}
    </div>
  );
}
