import { prisma } from "@/lib/prisma";
import { storyConfig } from "@/lib/config";
import type { ProjectContext, RuntimeStructure } from "@/types/project";

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

/** Loads a project (scoped to its owner) into the flat shape used for prompt-building and export. */
export async function buildProjectContext(projectId: string, userId: string): Promise<ProjectContext | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      characters: { orderBy: { createdAt: "asc" } },
      locations: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!project || project.userId !== userId) {
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
