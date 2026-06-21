"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/server/auth";
import { createProject, EMPTY_DIRECTION } from "@/server/repository";

export interface CreateProjectState {
  error?: string;
}

export async function createProjectAction(
  _prev: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return { error: "Please give your project a title." };
  }

  const project = await createProject(user.id, title, EMPTY_DIRECTION);
  redirect(`/projects/${project.id}/intake`);
}
