export const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";
export const isProductionMode = !isDevMode;

export const storyConfig = {
  dailyFreeCredits: Number(process.env.STORY_DAILY_FREE_CREDITS ?? 3),
  maxCharacterImageMb: Number(process.env.STORY_MAX_CHARACTER_IMAGE_MB ?? 8),
  // How many character reference images get sent to a single gpt-image-1 edit
  // call per scene — kept small regardless of maxProjectCharacters below.
  maxCharacters: 4,
  // How many character sheets a project can store overall.
  maxProjectCharacters: 20,
  maxProjectLocations: 20,
  defaultSceneCount: 6,
  maxSceneCount: 30,
  video: { width: 1080, height: 1920, fps: 30 },
} as const;
