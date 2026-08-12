import { prisma } from "@/lib/prisma";
import { storyConfig } from "@/lib/config";
import { VideoStatus } from "@prisma/client";

export async function remainingCredits(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const usedToday = await prisma.video.count({
    where: { userId, createdAt: { gte: startOfDay } },
  });

  return Math.max(0, storyConfig.dailyFreeCredits - usedToday);
}

export function progressPercent(status: VideoStatus): number {
  switch (status) {
    case "pending":
      return 5;
    case "transcribing":
      return 20;
    case "creating_scenes":
      return 40;
    case "generating_images":
      return 65;
    case "rendering":
      return 85;
    case "completed":
      return 100;
    case "failed":
    default:
      return 0;
  }
}

/** Cinematic display name for each pipeline stage (used by the status page). */
export function stageLabel(status: VideoStatus): string {
  switch (status) {
    case "pending":
    case "transcribing":
      return "Understanding Story";
    case "creating_scenes":
      return "Creating Scenes";
    case "generating_images":
      return "Designing Cinematic Frames";
    case "rendering":
      return "Rendering Film";
    case "completed":
      return "Finalizing";
    case "failed":
      return "Failed";
    default:
      return "Processing";
  }
}
