import OpenAI from "openai";
import { isDevMode } from "@/lib/config";
import { generateMockStory } from "@/lib/mock-story";

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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ").slice(0, 10000);
}

/**
 * Entry point: text prompt -> full structured cinematic story breakdown.
 *
 * Dev mode runs each pipeline step deterministically with no external calls
 * (see mock-story.ts). Outside dev mode, one structured OpenAI completion
 * produces the full breakdown in a single round trip — cheaper and faster
 * than five sequential calls — and summarizeStory/extractCharacters/
 * extractLocations/detectEmotionalArc/generateSixScenes below are thin
 * accessors over that result, kept as named steps for architectural clarity
 * and so dev-mode's independent step-by-step generation has a matching
 * production-mode shape to compare against.
 */
export async function processPrompt(input: {
  prompt: string;
  style: string;
  duration: number;
  characters?: CharacterInput[];
}): Promise<ProcessedStory> {
  const prompt = normalizePrompt(input.prompt);
  if (!prompt) {
    throw new Error("Prompt must not be empty.");
  }

  if (isDevMode) {
    return generateMockStory(prompt, input.style, input.duration, input.characters);
  }

  return generateStoryWithOpenAI(prompt, input.style, input.duration, input.characters);
}

function formatCharacterBrief(characters: CharacterInput[]): string {
  return characters
    .map((c) => (c.description ? `${c.name} — ${c.description}` : c.name))
    .join(". ");
}

async function generateStoryWithOpenAI(
  prompt: string,
  style: string,
  duration: number,
  characters?: CharacterInput[],
): Promise<ProcessedStory> {
  if (isDevMode) {
    throw new Error("OpenAI API disabled in development mode");
  }

  const sceneCount = 6;
  const sceneDuration = Math.max(1, Math.round(duration / sceneCount));

  const characterInstruction =
    characters && characters.length > 0
      ? `\n\nCharacters (use exactly these names, and keep each character's described appearance and traits ` +
        `consistent in every imagePrompt where they appear): ${formatCharacterBrief(characters)}`
      : "";

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL ?? "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a cinematic story architect for short vertical AI-generated videos. Given a prompt " +
          "(which may be a short idea or a full screenplay), respond with JSON only, exactly matching this shape: " +
          '{"title": string, "summary": string (2-3 sentences), "emotionalArc": string[] (3-5 beats, e.g. ' +
          '"Setup", "Discovery", "Climax"), "characters": string[], "locations": string[], ' +
          '"scenes": [{"order": number, "title": string, "subtitle": string, "imagePrompt": string}]} ' +
          "with exactly 6 scenes covering the story beginning to end. imagePrompt should be a vivid, " +
          "cinematic image-generation prompt for that scene in the requested visual style.",
      },
      {
        role: "user",
        content: `Style: ${style}\nTarget duration: ${duration} seconds${characterInstruction}\n\nPrompt:\n${prompt}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Story pipeline returned no content.");

  const parsed = JSON.parse(raw) as Omit<ProcessedStory, "scenes"> & {
    scenes: Array<Omit<ProcessedScene, "durationSeconds">>;
  };

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
