import { prisma } from "@/lib/prisma";
import { storyConfig } from "@/lib/config";
import { canAccessResource } from "@/lib/auth/permissions";
import type { ProjectContext, RuntimeStructure, Viewer } from "@/types/project";

const RUNTIME_STRUCTURE_KEYS: (keyof RuntimeStructure)[] = [
  "totalRuntimeSeconds",
  "episodes",
  "runtimePerEpisodeSeconds",
  "partsPerEpisode",
  "runtimePerPartSeconds",
  "scenesPerPart",
  "averageSceneDurationSeconds",
];

/** How many scenes an episode generation should target, derived from partsPerEpisode × scenesPerPart. */
export function computeEpisodeSceneCount(runtimeStructure: RuntimeStructure | null): number {
  const { partsPerEpisode, scenesPerPart } = runtimeStructure ?? {};
  if (!partsPerEpisode || !scenesPerPart) return storyConfig.defaultSceneCount;
  return Math.min(storyConfig.maxSceneCount, Math.max(1, partsPerEpisode * scenesPerPart));
}

/** How many parts an episode is split into, from the project's runtime structure. */
export function computeEpisodePartCount(runtimeStructure: RuntimeStructure | null): number {
  return runtimeStructure?.partsPerEpisode ?? 1;
}

/** Keeps only finite positive numbers for known runtime-structure fields; drops everything else. */
export function sanitizeRuntimeStructure(input: unknown): RuntimeStructure {
  const result: RuntimeStructure = {};
  if (!input || typeof input !== "object") return result;

  const record = input as Record<string, unknown>;
  for (const key of RUNTIME_STRUCTURE_KEYS) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      result[key] = Math.round(value);
    }
  }
  return result;
}

/**
 * Loads a project into the flat shape used for prompt-building and export.
 * Accessible to the owner, or to a viewer whose role outranks the owner's
 * (per the hierarchy: Super Admin > Administrator > Moderator > Contributor
 * > Member) — everyone else gets null, same as "not found".
 */
export async function buildProjectContext(projectId: string, viewer: Viewer): Promise<ProjectContext | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      characters: { orderBy: { createdAt: "asc" } },
      locations: { orderBy: { createdAt: "asc" } },
      user: { select: { id: true, role: true } },
    },
  });

  if (!project || !canAccessResource(viewer, { id: project.user.id, role: project.user.role })) {
    return null;
  }

  return {
    id: project.id,
    title: project.title,
    synopsis: project.synopsis,
    storyBible: project.storyBible,
    runtimeStructure: (project.runtimeStructure as RuntimeStructure | null) ?? null,
    visualStyle: project.visualStyle,
    aspectRatio: project.aspectRatio,
    ownerId: project.user.id,
    ownerRole: project.user.role,
    characters: project.characters.map((c) => ({
      id: c.id,
      name: c.name,
      age: c.age,
      gender: c.gender,
      appearance: c.appearance,
      wardrobe: c.wardrobe,
      personality: c.personality,
      role: c.role,
      relationships: c.relationships,
      voiceTone: c.voiceTone,
      cinematicNotes: c.cinematicNotes,
      imageUrl: c.imageUrl,
    })),
    locations: project.locations.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
      mood: l.mood,
      imageUrl: l.imageUrl,
    })),
  };
}
