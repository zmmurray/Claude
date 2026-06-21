"use client";

import { useActionState } from "react";

import { Button, Card, Input, Label, Notice, PageHeader } from "@/components/ui";
import { createProjectAction, type CreateProjectState } from "./actions";

const initialState: CreateProjectState = {};

export default function NewProjectPage() {
  const [state, formAction, pending] = useActionState(createProjectAction, initialState);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Create project" subtitle="Name your film. You'll add the script next." />
      <Card>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="title">Project title</Label>
            <Input id="title" name="title" placeholder="e.g. The Long Night" required />
          </div>
          {state.error ? <Notice tone="warning">{state.error}</Notice> : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create and continue"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
