import { MOCK_SCENE_TEXTS } from "@/lib/mock-data";

export type MockScene = {
  order: number;
  subtitle: string;
  prompt: string;
  imageUrl: string;
};

function buildImagePrompt(sceneText: string): string {
  return (
    "Ultra cinematic 3D cartoon illustration, Filipino storytelling style, volumetric lighting, " +
    "dramatic depth, Pixar-quality rendering, cinematic composition, vertical 9:16, scene: " +
    sceneText
  );
}

/** Deterministic placeholder scenes — no external AI service involved. */
export function generateMockScenes(): MockScene[] {
  return MOCK_SCENE_TEXTS.map((subtitle, index) => {
    const order = index + 1;
    return {
      order,
      subtitle,
      prompt: buildImagePrompt(subtitle),
      imageUrl: `https://picsum.photos/seed/realcraft-scene-${order}/1080/1920`,
    };
  });
}
