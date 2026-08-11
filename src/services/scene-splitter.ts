export type SplitScene = { order: number; subtitle: string; prompt: string };

function buildImagePrompt(sceneText: string): string {
  return (
    "Ultra cinematic 3D cartoon illustration, Filipino storytelling style, volumetric lighting, " +
    "dramatic depth, Pixar-quality rendering, cinematic composition, vertical 9:16, scene: " +
    sceneText
  );
}

function splitIntoSentences(transcript: string): string[] {
  const cleaned = transcript.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const matches = cleaned.match(/[^.!?]+[.!?]*/g) ?? [];
  return matches.map((s) => s.trim()).filter(Boolean);
}

function distribute(sentences: string[], count: number): string[] {
  if (sentences.length === 0) return Array(count).fill("");

  const buckets: string[][] = Array.from({ length: count }, () => []);
  const total = sentences.length;

  sentences.forEach((sentence, i) => {
    const bucketIndex = Math.min(Math.floor((i / total) * count), count - 1);
    buckets[bucketIndex].push(sentence);
  });

  return buckets.map((bucket) => bucket.join(" "));
}

export function splitTranscriptIntoScenes(transcript: string, count = 6): SplitScene[] {
  const sentences = splitIntoSentences(transcript);
  const chunks = distribute(sentences, count);

  return chunks.map((chunk, index) => {
    const subtitle = chunk.trim() || "The story continues...";
    return { order: index + 1, subtitle, prompt: buildImagePrompt(subtitle) };
  });
}
