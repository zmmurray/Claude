import "server-only";

import type { ScriptAnalysis } from "@scenearc/shared";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Server-side data access. All queries run as the signed-in user, so Row Level
 * Security guarantees a user only ever touches their own rows. We also set
 * `user_id` explicitly on inserts to satisfy the insert policies.
 */

export interface CreativeDirection {
  styleAndTone: string;
  genre: string;
  period: string;
  aspectRatio: string;
  cinematographyNotes: string;
  additionalInstructions: string;
}

export interface ProjectRow {
  id: string;
  title: string;
  status: string;
  creative_direction: CreativeDirection;
  created_at: string;
  updated_at: string;
}

const EMPTY_DIRECTION: CreativeDirection = {
  styleAndTone: "",
  genre: "",
  period: "",
  aspectRatio: "",
  cinematographyNotes: "",
  additionalInstructions: "",
};

export function normalizeDirection(value: unknown): CreativeDirection {
  const v = (value ?? {}) as Partial<CreativeDirection>;
  return {
    styleAndTone: v.styleAndTone ?? "",
    genre: v.genre ?? "",
    period: v.period ?? "",
    aspectRatio: v.aspectRatio ?? "",
    cinematographyNotes: v.cinematographyNotes ?? "",
    additionalInstructions: v.additionalInstructions ?? "",
  };
}

// --- Projects ----------------------------------------------------------------

export async function createProject(
  userId: string,
  title: string,
  creativeDirection: CreativeDirection,
): Promise<ProjectRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: userId, title, creative_direction: creativeDirection })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapProject(data);
}

export async function listProjects(): Promise<ProjectRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapProject);
}

export async function getProject(projectId: string): Promise<ProjectRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProject(data) : null;
}

export async function updateProjectDirection(
  projectId: string,
  title: string,
  creativeDirection: CreativeDirection,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("projects")
    .update({ title, creative_direction: creativeDirection, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
}

async function setProjectStatus(projectId: string, status: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("projects")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) throw new Error(error.message);
}

// --- Scripts -----------------------------------------------------------------

export async function saveScript(
  projectId: string,
  userId: string,
  originalText: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  // One script per project in Phase One: replace any existing.
  await supabase.from("scripts").delete().eq("project_id", projectId);
  const { error } = await supabase
    .from("scripts")
    .insert({ project_id: projectId, user_id: userId, original_text: originalText });
  if (error) throw new Error(error.message);
}

export async function getScript(projectId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("scripts")
    .select("original_text")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.original_text ?? null;
}

// --- Breakdown (analysis) persistence ----------------------------------------

/**
 * Replace the entire structured breakdown for a project. Used for both the
 * initial analysis and subsequent user edits.
 */
export async function persistAnalysis(
  projectId: string,
  userId: string,
  analysis: ScriptAnalysis,
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // Clear existing breakdown (cascades remove beats + scene_characters).
  await supabase.from("scenes").delete().eq("project_id", projectId);
  await supabase.from("characters").delete().eq("project_id", projectId);
  await supabase.from("locations").delete().eq("project_id", projectId);

  // Locations
  const locationKeyToId = new Map<string, string>();
  if (analysis.locations.length > 0) {
    const { data, error } = await supabase
      .from("locations")
      .insert(
        analysis.locations.map((l) => ({
          project_id: projectId,
          user_id: userId,
          entity_key: l.key,
          name: l.name,
          description: l.description,
        })),
      )
      .select("id, entity_key");
    if (error) throw new Error(error.message);
    for (const row of data ?? []) locationKeyToId.set(row.entity_key, row.id);
  }

  // Characters
  const characterKeyToId = new Map<string, string>();
  if (analysis.characters.length > 0) {
    const { data, error } = await supabase
      .from("characters")
      .insert(
        analysis.characters.map((c) => ({
          project_id: projectId,
          user_id: userId,
          entity_key: c.key,
          name: c.name,
          description: c.description,
          relationships: c.relationships,
        })),
      )
      .select("id, entity_key");
    if (error) throw new Error(error.message);
    for (const row of data ?? []) characterKeyToId.set(row.entity_key, row.id);
  }

  // Scenes
  const sceneKeyToId = new Map<string, string>();
  if (analysis.scenes.length > 0) {
    const { data, error } = await supabase
      .from("scenes")
      .insert(
        analysis.scenes.map((s, index) => ({
          project_id: projectId,
          user_id: userId,
          entity_key: s.key,
          number: s.number,
          slugline: s.slugline,
          summary: s.summary,
          time_of_day: s.timeOfDay,
          props: s.props,
          continuity_notes: s.continuityNotes,
          wardrobe: s.wardrobe,
          suggested_stages: s.suggestedStages,
          position: index,
          location_id: s.locationKey ? (locationKeyToId.get(s.locationKey) ?? null) : null,
        })),
      )
      .select("id, entity_key");
    if (error) throw new Error(error.message);
    for (const row of data ?? []) sceneKeyToId.set(row.entity_key, row.id);

    // Beats + scene_characters
    const beats: Record<string, unknown>[] = [];
    const sceneChars: Record<string, unknown>[] = [];
    for (const s of analysis.scenes) {
      const sceneId = sceneKeyToId.get(s.key);
      if (!sceneId) continue;
      for (const beat of s.beats) {
        beats.push({
          scene_id: sceneId,
          project_id: projectId,
          user_id: userId,
          beat_order: beat.order,
          description: beat.description,
        });
      }
      for (const ck of s.characterKeys) {
        const characterId = characterKeyToId.get(ck);
        if (!characterId) continue;
        sceneChars.push({
          scene_id: sceneId,
          character_id: characterId,
          project_id: projectId,
          user_id: userId,
        });
      }
    }
    if (beats.length > 0) {
      const { error: beatErr } = await supabase.from("scene_beats").insert(beats);
      if (beatErr) throw new Error(beatErr.message);
    }
    if (sceneChars.length > 0) {
      const { error: scErr } = await supabase.from("scene_characters").insert(sceneChars);
      if (scErr) throw new Error(scErr.message);
    }
  }

  await setProjectStatus(projectId, "analyzed");
}

/** Rebuild a ScriptAnalysis from the stored relational breakdown. */
export async function getBreakdown(projectId: string): Promise<ScriptAnalysis> {
  const supabase = await createSupabaseServerClient();

  const [{ data: characters }, { data: locations }, { data: scenes }] = await Promise.all([
    supabase.from("characters").select("*").eq("project_id", projectId).order("name"),
    supabase.from("locations").select("*").eq("project_id", projectId).order("name"),
    supabase.from("scenes").select("*").eq("project_id", projectId).order("position"),
  ]);

  const sceneIds = (scenes ?? []).map((s: { id: string }) => s.id);
  const [{ data: beats }, { data: sceneChars }] = await Promise.all([
    sceneIds.length
      ? supabase.from("scene_beats").select("*").in("scene_id", sceneIds).order("beat_order")
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    sceneIds.length
      ? supabase.from("scene_characters").select("*").in("scene_id", sceneIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const locationIdToKey = new Map<string, string>();
  for (const l of locations ?? []) locationIdToKey.set(l.id, l.entity_key);
  const characterIdToKey = new Map<string, string>();
  for (const c of characters ?? []) characterIdToKey.set(c.id, c.entity_key);

  return {
    characters: (characters ?? []).map((c: Record<string, unknown>) => ({
      key: c.entity_key as string,
      name: c.name as string,
      description: (c.description as string) ?? "",
      relationships: (c.relationships as string[]) ?? [],
    })),
    locations: (locations ?? []).map((l: Record<string, unknown>) => ({
      key: l.entity_key as string,
      name: l.name as string,
      description: (l.description as string) ?? "",
    })),
    scenes: (scenes ?? []).map((s: Record<string, unknown>) => {
      const id = s.id as string;
      return {
        key: s.entity_key as string,
        number: s.number as string,
        slugline: (s.slugline as string) ?? "",
        summary: (s.summary as string) ?? "",
        locationKey: s.location_id ? locationIdToKey.get(s.location_id as string) : undefined,
        timeOfDay: (s.time_of_day as ScriptAnalysis["scenes"][number]["timeOfDay"]) ?? "UNSPECIFIED",
        characterKeys: (sceneChars ?? [])
          .filter((sc: Record<string, unknown>) => sc.scene_id === id)
          .map((sc: Record<string, unknown>) => characterIdToKey.get(sc.character_id as string))
          .filter((k): k is string => Boolean(k)),
        props: (s.props as string[]) ?? [],
        wardrobe: (s.wardrobe as ScriptAnalysis["scenes"][number]["wardrobe"]) ?? [],
        continuityNotes: (s.continuity_notes as string[]) ?? [],
        beats: (beats ?? [])
          .filter((b: Record<string, unknown>) => b.scene_id === id)
          .map((b: Record<string, unknown>) => ({
            order: b.beat_order as number,
            description: b.description as string,
          })),
        suggestedStages:
          (s.suggested_stages as ScriptAnalysis["scenes"][number]["suggestedStages"]) ?? [],
      };
    }),
  };
}

// --- Scenes (workspace) ------------------------------------------------------

export interface SceneDetail {
  id: string;
  number: string;
  slugline: string;
  summary: string;
  timeOfDay: string;
  props: string[];
  continuityNotes: string[];
  wardrobe: { characterKey?: string; description: string }[];
  location: { name: string; description: string } | null;
  characters: { key: string; name: string; description: string }[];
  beats: { order: number; description: string }[];
}

export async function listScenes(
  projectId: string,
): Promise<{ id: string; number: string; slugline: string; summary: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("scenes")
    .select("id, number, slugline, summary")
    .eq("project_id", projectId)
    .order("position");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSceneDetail(sceneId: string): Promise<SceneDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: scene, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("id", sceneId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!scene) return null;

  const [{ data: location }, { data: sceneChars }, { data: beats }] = await Promise.all([
    scene.location_id
      ? supabase
          .from("locations")
          .select("name, description")
          .eq("id", scene.location_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("scene_characters").select("character_id").eq("scene_id", sceneId),
    supabase.from("scene_beats").select("beat_order, description").eq("scene_id", sceneId).order("beat_order"),
  ]);

  const characterIds = (sceneChars ?? []).map((sc: { character_id: string }) => sc.character_id);
  const { data: characters } = characterIds.length
    ? await supabase
        .from("characters")
        .select("entity_key, name, description")
        .in("id", characterIds)
    : { data: [] as Record<string, unknown>[] };

  return {
    id: scene.id,
    number: scene.number,
    slugline: scene.slugline ?? "",
    summary: scene.summary ?? "",
    timeOfDay: scene.time_of_day ?? "UNSPECIFIED",
    props: scene.props ?? [],
    continuityNotes: scene.continuity_notes ?? [],
    wardrobe: scene.wardrobe ?? [],
    location: location ? { name: location.name, description: location.description ?? "" } : null,
    characters: (characters ?? []).map((c: Record<string, unknown>) => ({
      key: c.entity_key as string,
      name: c.name as string,
      description: (c.description as string) ?? "",
    })),
    beats: (beats ?? []).map((b: Record<string, unknown>) => ({
      order: b.beat_order as number,
      description: b.description as string,
    })),
  };
}

// --- Approvals ---------------------------------------------------------------

export async function approveBreakdown(projectId: string, userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("approvals")
    .insert({ project_id: projectId, user_id: userId, subject_type: "breakdown", status: "approved" });
  if (error) throw new Error(error.message);
  await setProjectStatus(projectId, "approved");
}

export async function isBreakdownApproved(projectId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("approvals")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("subject_type", "breakdown");
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

// --- Prompt packages ---------------------------------------------------------

export interface PromptPackageRow {
  id: string;
  scene_id: string | null;
  stage: string;
  target_platform: string;
  payload: import("@scenearc/shared").PromptPackage;
  created_at: string;
}

export async function savePromptPackage(args: {
  projectId: string;
  userId: string;
  sceneId: string;
  stage: string;
  targetPlatform: string;
  payload: import("@scenearc/shared").PromptPackage;
}): Promise<string> {
  const supabase = await createSupabaseServerClient();

  // Record a generation task for traceability.
  const { data: task, error: taskErr } = await supabase
    .from("generation_tasks")
    .insert({
      project_id: args.projectId,
      user_id: args.userId,
      scene_id: args.sceneId,
      stage: args.stage,
      target_platform: args.targetPlatform,
      status: "prepared",
    })
    .select("id")
    .single();
  if (taskErr) throw new Error(taskErr.message);

  const { data, error } = await supabase
    .from("prompt_packages")
    .insert({
      project_id: args.projectId,
      user_id: args.userId,
      scene_id: args.sceneId,
      generation_task_id: task.id,
      stage: args.stage,
      target_platform: args.targetPlatform,
      payload: args.payload,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function getPromptPackage(id: string): Promise<PromptPackageRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("prompt_packages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function listPromptPackagesForScene(sceneId: string): Promise<PromptPackageRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("prompt_packages")
    .select("*")
    .eq("scene_id", sceneId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

function mapProject(row: Record<string, unknown>): ProjectRow {
  return {
    id: row.id as string,
    title: row.title as string,
    status: (row.status as string) ?? "draft",
    creative_direction: normalizeDirection(row.creative_direction),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export { EMPTY_DIRECTION };
