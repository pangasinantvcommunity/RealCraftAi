import type { CharacterInput, ProcessedScene, ProcessedStory } from "@/lib/story-pipeline";

const STOP_WORDS = new Set(["The", "A", "An", "In", "On", "At", "Once", "When", "This", "That", "It", "He", "She", "They"]);

const STYLE_DESCRIPTORS: Record<string, string> = {
  "3d-cinematic": "Ultra cinematic 3D rendering, volumetric lighting, dramatic depth, Pixar-quality",
  anime: "Vibrant anime illustration, dynamic linework, cel-shaded, Studio Ghibli-inspired",
  cartoon: "Playful 2D cartoon illustration, bold outlines, saturated colors",
  realistic: "Photorealistic cinematic still, natural lighting, shallow depth of field",
};

const EMOTIONAL_ARC_TEMPLATE = ["Setup", "Discovery", "Rising Tension", "Climax", "Resolution"];

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "story"
  );
}

export function getMockSceneImageUrl(seed: string): string {
  return `https://picsum.photos/seed/${seed}/1080/1920`;
}

function titleCase(text: string): string {
  return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

function deriveTitle(prompt: string): string {
  const firstSentence = prompt.split(/[.!?]/)[0]?.trim();
  const words = (firstSentence || prompt).split(" ").filter(Boolean).slice(0, 6).join(" ");
  return words.length > 0 ? titleCase(words) : "Untitled Cinematic Story";
}

function extractCapitalizedWords(prompt: string): string[] {
  const matches = prompt.match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
  return Array.from(new Set(matches.filter((w) => !STOP_WORDS.has(w))));
}

function splitIntoSentences(prompt: string): string[] {
  return (prompt.match(/[^.!?]+[.!?]*/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

function buildImagePrompt(sceneText: string, style: string): string {
  const descriptor = STYLE_DESCRIPTORS[style] ?? STYLE_DESCRIPTORS["3d-cinematic"];
  return `${descriptor}, cinematic composition, vertical 9:16, scene: ${sceneText}`;
}

/**
 * Deterministic, zero-cost story generator used in dev mode — no OpenAI call.
 * Same prompt/style/duration always produces the same output.
 */
export function generateMockStory(
  prompt: string,
  style: string,
  duration: number,
  characterInputs?: CharacterInput[],
): ProcessedStory {
  const words = extractCapitalizedWords(prompt);
  const title = deriveTitle(prompt);

  const summary = prompt.length > 220 ? prompt.slice(0, 217).trimEnd() + "..." : prompt || "A cinematic story waiting to be told.";
  const characters =
    characterInputs && characterInputs.length > 0
      ? characterInputs.map((c) => c.name)
      : words.length > 0
        ? words.slice(0, 3)
        : ["The Protagonist"];
  const locations = words.length > 3 ? words.slice(3, 6) : ["An Unknown Place"];

  const sceneCount = 6;
  const sceneDuration = Math.max(1, Math.round(duration / sceneCount));
  const sentences = splitIntoSentences(prompt);

  const scenes: ProcessedScene[] = Array.from({ length: sceneCount }, (_, i) => {
    const order = i + 1;
    const bucketStart = Math.floor((i / sceneCount) * sentences.length);
    const bucketEnd = Math.floor(((i + 1) / sceneCount) * sentences.length);
    let chunk = sentences.slice(bucketStart, bucketEnd).join(" ").trim();

    if (!chunk && sentences.length > 0) {
      // Fewer sentences than scenes (e.g. a one-line prompt) — the bucket
      // above can land empty. Fall back to a proportionally-picked sentence
      // instead of leaving this scene with no real content from the prompt.
      const fallbackIndex = Math.min(Math.floor((i / sceneCount) * sentences.length), sentences.length - 1);
      chunk = sentences[fallbackIndex];
    }

    const subtitle = chunk || `${title} continues to unfold.`;

    return {
      order,
      title: `Scene ${order}`,
      subtitle,
      imagePrompt: buildImagePrompt(subtitle, style),
      durationSeconds: sceneDuration,
    };
  });

  return {
    title,
    summary,
    emotionalArc: EMOTIONAL_ARC_TEMPLATE,
    characters,
    locations,
    scenes,
  };
}
