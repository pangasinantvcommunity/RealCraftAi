import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { generateSceneImage, type ImageSize } from "@/services/image-generation";
import { renderStoryVideo } from "@/services/video-render";
import { uploadImage } from "@/lib/storage";
import type { RuntimeStructure } from "@/types/project";

function imageSizeFor(aspectRatio: string): ImageSize {
  return aspectRatio === "16:9" ? "1536x1024" : "1024x1536";
}

// How many scenes to generate images for concurrently. Project episodes can
// have up to storyConfig.maxSceneCount scenes (see runtime structure) — a
// single sequential loop over them was taking many minutes and risked
// exceeding the serverless function's execution window. Each scene is now
// its own Inngest step (checkpointed independently, so a failed/timed-out
// invocation resumes only the scenes still missing an image instead of
// restarting from scratch), run in small concurrent batches to stay within
// OpenAI's per-account rate limits.
const IMAGE_GENERATION_CONCURRENCY = 4;

/** True once /api/stories/[id]/cancel has marked the video failed+cancelled. Checked between batches/steps so a cancel request stops further OpenAI/FFmpeg work promptly instead of only after the whole run finishes. */
async function isCancelled(videoId: string): Promise<boolean> {
  const current = await prisma.video.findUnique({ where: { id: videoId }, select: { status: true, metadata: true } });
  const metadata = current?.metadata as { cancelled?: boolean } | null;
  return current?.status === "failed" && Boolean(metadata?.cancelled);
}

export const generateStoryVideo = inngest.createFunction(
  { id: "generate-story-video", retries: 1 },
  { event: "story/generate.requested" },
  async ({ event, step }) => {
    const { videoId } = event.data as { videoId: string };

    try {
      const initialVideo = await step.run("load-video", async () => {
        return prisma.video.findUniqueOrThrow({
          where: { id: videoId },
          include: { characters: true, project: true },
        });
      });

      // Scenes are always pre-created synchronously in the API route (see
      // processPrompt() in src/lib/story-pipeline.ts) — go straight to
      // image generation.
      const scenes = await step.run("load-scenes", async () => {
        await prisma.video.update({ where: { id: videoId }, data: { status: "creating_scenes" } });
        return prisma.scene.findMany({ where: { videoId }, orderBy: { sceneOrder: "asc" } });
      });

      await step.run("mark-generating-images", async () => {
        await prisma.video.update({ where: { id: videoId }, data: { status: "generating_images" } });
      });

      const imageSize = imageSizeFor(initialVideo.aspectRatio);
      const referenceImageUrls = initialVideo.characters.map((c) => c.imageUrl);
      const pendingScenes = scenes.filter((scene) => !scene.imageUrl);

      for (let i = 0; i < pendingScenes.length; i += IMAGE_GENERATION_CONCURRENCY) {
        if (await isCancelled(videoId)) {
          throw new Error("Cancelled by user.");
        }

        const batch = pendingScenes.slice(i, i + IMAGE_GENERATION_CONCURRENCY);
        await Promise.all(
          batch.map((scene) =>
            step.run(`generate-image-scene-${scene.sceneOrder}`, async () => {
              const imageBuffer = await generateSceneImage(scene.prompt, { size: imageSize, referenceImageUrls });
              const imageUrl = await uploadImage(imageBuffer);
              await prisma.scene.update({ where: { id: scene.id }, data: { imageUrl } });
            }),
          ),
        );
      }

      if (await isCancelled(videoId)) {
        throw new Error("Cancelled by user.");
      }

      const videoUrl = await step.run("render-video", async () => {
        await prisma.video.update({ where: { id: videoId }, data: { status: "rendering" } });

        const renderedScenes = await prisma.scene.findMany({
          where: { videoId },
          orderBy: { sceneOrder: "asc" },
        });
        const video = await prisma.video.findUniqueOrThrow({ where: { id: videoId }, include: { project: true } });

        const runtimeStructure = video.project?.runtimeStructure as RuntimeStructure | null | undefined;
        const sceneDurationSeconds = runtimeStructure?.averageSceneDurationSeconds ?? 9;

        return renderStoryVideo(
          renderedScenes.map((s) => ({
            order: s.sceneOrder,
            subtitle: s.subtitle,
            imageUrl: s.imageUrl!,
          })),
          video.audioUrl,
          video.aspectRatio,
          sceneDurationSeconds,
        );
      });

      await step.run("finalize", async () => {
        await prisma.video.update({
          where: { id: videoId },
          data: { status: "completed", videoUrl },
        });
      });

      return { videoId, status: "completed" };
    } catch (error) {
      // If /api/stories/[id]/cancel already marked this failed+cancelled,
      // leave that "Cancelled by user." message in place instead of
      // overwriting it with whatever error the abort produced.
      if (!(await isCancelled(videoId))) {
        await prisma.video.update({
          where: { id: videoId },
          data: {
            status: "failed",
            metadata: {
              error: error instanceof Error ? error.message : "Unknown error",
              failedAt: new Date().toISOString(),
            },
          },
        });
      }
      throw error;
    }
  },
);
