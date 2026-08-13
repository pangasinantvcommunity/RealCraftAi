import { isDevMode, storyConfig } from "@/lib/config";
import { generateMockStory } from "@/lib/mock-story";
import { buildHiddenContext } from "@/lib/prompt-builder";
import { gemini, GEMINI_TEXT_MODEL } from "@/lib/gemini";
import type { ProjectContext } from "@/types/project";

export type ProcessedScene = {
  order: number;
  title: string;
  subtitle: string;
  imagePrompt: string;
  durationSeconds: number;
};

export type ProcessedStory = {
  title: string;
  summary: string;
  emotionalArc: string[];
  characters: string[];
  locations: string[];
  scenes: ProcessedScene[];
};

export type CharacterInput = { name: string; description?: string };
export type LocationInput = { name: string; description: string; mood?: string };

export function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ").slice(0, 10000);
}

/**
 * Entry point: text prompt -> full structured cinematic story breakdown.
 *
 * Dev mode runs each pipeline step deterministically with no external calls
 * (see mock-story.ts). Outside dev mode, one structured Gemini completion
 * produces the full breakdown in a single round trip — cheaper and faster
 * than five sequential calls — and summarizeStory/extractCharacters/
 * extractLocations/detectEmotionalArc/generateSixScenes below are thin
 * accessors over that result, kept as named steps for architectural clarity
 * and so dev-mode's independent step-by-step generation has a matching
 * production-mode shape to compare against.
 *
 * Quick Story (no project) passes `characters` only and keeps the default
 * 6-scene shape. Project episodes pass `projectContext` (full cast/location/
 * story-bible/runtime-structure memory, rendered via buildHiddenContext) and
 * an explicit `sceneCount` derived from the project's runtime structure.
 */
export async function processPrompt(input: {
  prompt: string;
  style: string;
  duration: number;
  characters?: CharacterInput[];
  locations?: LocationInput[];
  storyBible?: string;
  projectContext?: ProjectContext;
  sceneCount?: number;
}): Promise<ProcessedStory> {
  const prompt = normalizePrompt(input.prompt);
  if (!prompt) {
    throw new Error("Prompt must not be empty.");
  }

  const sceneCount = input.sceneCount ?? storyConfig.defaultSceneCount;

  if (isDevMode) {
    return generateMockStory(prompt, input.style, input.duration, {
      characters: input.characters,
      locations: input.locations,
      storyBible: input.storyBible,
      sceneCount,
    });
  }

  return generateStoryWithGemini(prompt, input.style, input.duration, {
    characters: input.characters,
    locations: input.locations,
    storyBible: input.storyBible,
    projectContext: input.projectContext,
    sceneCount,
  });
}

function formatCharacterBrief(characters: CharacterInput[]): string {
  return characters
    .map((c) => (c.description ? `${c.name} — ${c.description}` : c.name))
    .join(". ");
}

function formatLocationBrief(locations: LocationInput[]): string {
  return locations
    .map((l) => (l.mood ? `${l.name} — ${l.description} (mood: ${l.mood})` : `${l.name} — ${l.description}`))
    .join(". ");
}

const STORY_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    emotionalArc: { type: "array", items: { type: "string" } },
    characters: { type: "array", items: { type: "string" } },
    locations: { type: "array", items: { type: "string" } },
    scenes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          order: { type: "number" },
          title: { type: "string" },
          subtitle: { type: "string" },
          imagePrompt: { type: "string" },
        },
        required: ["order", "title", "subtitle", "imagePrompt"],
      },
    },
  },
  required: ["title", "summary", "emotionalArc", "characters", "locations", "scenes"],
} as const;

async function generateStoryWithGemini(
  prompt: string,
  style: string,
  duration: number,
  options: {
    characters?: CharacterInput[];
    locations?: LocationInput[];
    storyBible?: string;
    projectContext?: ProjectContext;
    sceneCount: number;
  },
): Promise<ProcessedStory> {
  if (isDevMode) {
    throw new Error("Gemini API disabled in development mode");
  }

  const { characters, locations, storyBible, projectContext, sceneCount } = options;
  const sceneDuration = Math.max(1, Math.round(duration / sceneCount));

  // Project episodes get the full structured memory block; Quick Story (no
  // project) gets a lighter ad-hoc instruction built from just its own
  // character list.
  let contextBlock: string;
  if (projectContext) {
    contextBlock = `\n\n${buildHiddenContext(projectContext)}`;
  } else {
    const characterInstruction =
      characters && characters.length > 0
        ? `\n\nCharacters (use exactly these names, and keep each character's described appearance and traits ` +
          `consistent in every imagePrompt where they appear): ${formatCharacterBrief(characters)}`
        : "";
    const locationInstruction =
      locations && locations.length > 0
        ? `\n\nRecurring locations (reuse these where relevant instead of inventing new settings): ${formatLocationBrief(locations)}`
        : "";
    const storyBibleInstruction = storyBible ? `\n\nOngoing story so far (maintain continuity with this): ${storyBible}` : "";
    contextBlock = `${characterInstruction}${locationInstruction}${storyBibleInstruction}`;
  }

  const systemInstruction =
    "You are a cinematic story architect for short vertical AI-generated videos. Given a prompt " +
    "(which may be a short idea or a full screenplay), produce a structured breakdown with " +
    `exactly ${sceneCount} scenes covering the story beginning to end. imagePrompt should be a vivid, ` +
    "cinematic image-generation prompt for that scene in the requested visual style.";

  const response = await gemini.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: `Style: ${style}\nTarget duration: ${duration} seconds${contextBlock}\n\nPrompt:\n${prompt}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: STORY_RESPONSE_SCHEMA,
    },
  });

  const raw = response.text;
  if (!raw) throw new Error("Story pipeline returned no content.");

  let parsed: Omit<ProcessedStory, "scenes"> & { scenes: Array<Omit<ProcessedScene, "durationSeconds">> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(
      `Story pipeline returned invalid JSON (requested sceneCount=${sceneCount}, raw length=${raw.length}). ` +
        `Tail: ${raw.slice(-300)}`,
    );
    throw new Error("Story pipeline returned an incomplete or invalid response. Please try again.");
  }
  if (!Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw new Error("Story pipeline returned no scenes. Please try again.");
  }

  return {
    ...parsed,
    scenes: parsed.scenes.slice(0, sceneCount).map((scene, i) => ({
      ...scene,
      order: scene.order ?? i + 1,
      durationSeconds: sceneDuration,
    })),
  };
}

export function summarizeStory(story: ProcessedStory): string {
  return story.summary;
}

export function extractCharacters(story: ProcessedStory): string[] {
  return story.characters;
}

export function extractLocations(story: ProcessedStory): string[] {
  return story.locations;
}

export function detectEmotionalArc(story: ProcessedStory): string[] {
  return story.emotionalArc;
}

export function generateSixScenes(story: ProcessedStory): ProcessedScene[] {
  return story.scenes;
}
