import { LinkButton, Notice } from "@/components/ui";
import { isSupabaseConfigured } from "@/server/config-status";

export default function HomePage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm uppercase tracking-[0.3em] text-amber-accent">SceneArc</p>
      <h1 className="text-4xl font-semibold tracking-tight text-cream-50">
        The production desk for AI filmmakers.
      </h1>
      <p className="mt-4 max-w-xl text-muted">
        Bring in your script and creative direction. SceneArc organizes characters, locations,
        scenes, and continuity, then prepares the prompts you take to the generation tools you
        already use. You stay in creative control.
      </p>

      <div className="mt-8 flex gap-3">
        <LinkButton href="/login">Sign in</LinkButton>
        <LinkButton href="/login?mode=signup" variant="secondary">
          Create account
        </LinkButton>
      </div>

      {!configured ? (
        <div className="mt-10">
          <Notice tone="warning">
            SceneArc isn’t connected to its database yet. Sign-in and projects become available once
            the Supabase keys are added — see NONCODER_GUIDE.md.
          </Notice>
        </div>
      ) : null}
    </main>
  );
}
