export const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";
export const isProductionMode = !isDevMode;

export const storyConfig = {
  dailyFreeCredits: Number(process.env.STORY_DAILY_FREE_CREDITS ?? 3),
  maxUploadMb: Number(process.env.STORY_MAX_UPLOAD_MB ?? 25),
  maxCharacterImageMb: Number(process.env.STORY_MAX_CHARACTER_IMAGE_MB ?? 8),
  maxCharacters: 4,
  sceneCount: Number(process.env.STORY_SCENE_COUNT ?? 6),
  video: { width: 1080, height: 1920, fps: 30 },
} as const;
