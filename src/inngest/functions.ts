import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { transcribeAudio } from "@/services/whisper";
import { splitTranscriptIntoScenes } from "@/services/scene-splitter";
import { generateSceneImage, type ImageSize } from "@/services/image-generation";
import { renderStoryVideo } from "@/services/video-render";
import { uploadImage } from "@/lib/storage";
import { storyConfig } from "@/lib/config";

function imageSizeFor(aspectRatio: string): ImageSize {
  return aspectRatio === "16:9" ? "1536x1024" : "1024x1536";
}

export const generateStoryVideo = inngest.createFunction(
  { id: "generate-story-video", retries: 1 },
  { event: "story/generate.requested" },
  async ({ event, step }) => {
    const { videoId } = event.data as { videoId: string };

    try {
      const initialVideo = await step.run("load-video", async () => {
        return prisma.video.findUniqueOrThrow({ where: { id: videoId }, include: { characters: true } });
      });

      // Prompt-originated videos already have their scenes created
      // synchronously in the API route (see processPrompt() in
      // src/lib/story-pipeline.ts) — skip straight to image generation.
      // Voice/upload-originated videos still need transcription + splitting.
      const isPromptStory = Boolean(initialVideo.prompt);

      const scenes = isPromptStory
        ? await step.run("load-scenes", async () => {
            await prisma.video.update({ where: { id: videoId }, data: { status: "creating_scenes" } });
            return prisma.scene.findMany({ where: { videoId }, orderBy: { sceneOrder: "asc" } });
          })
        : await (async () => {
            const transcript = await step.run("transcribe", async () => {
              await prisma.video.update({ where: { id: videoId }, data: { status: "transcribing" } });

              const video = await prisma.video.findUniqueOrThrow({ where: { id: videoId } });
              if (!video.audioUrl) throw new Error("Video has no audio to transcribe.");

              const response = await fetch(video.audioUrl);
              const audioBuffer = Buffer.from(await response.arrayBuffer());

              const text = await transcribeAudio(audioBuffer, "audio.webm");
              await prisma.video.update({ where: { id: videoId }, data: { transcript: text } });

              return text;
            });

            return step.run("create-scenes", async () => {
              await prisma.video.update({ where: { id: videoId }, data: { status: "creating_scenes" } });

              const split = splitTranscriptIntoScenes(transcript, storyConfig.sceneCount);

              await prisma.scene.createMany({
                data: split.map((s) => ({
                  videoId,
                  sceneOrder: s.order,
                  prompt: s.prompt,
                  subtitle: s.subtitle,
                })),
              });

              return prisma.scene.findMany({ where: { videoId }, orderBy: { sceneOrder: "asc" } });
            });
          })();

      await step.run("generate-images", async () => {
        await prisma.video.update({ where: { id: videoId }, data: { status: "generating_images" } });

        const imageSize = imageSizeFor(initialVideo.aspectRatio);
        const referenceImageUrls = initialVideo.characters.map((c) => c.imageUrl);

        for (const scene of scenes) {
          if (scene.imageUrl) continue;
          const imageBuffer = await generateSceneImage(scene.prompt, { size: imageSize, referenceImageUrls });
          const imageUrl = await uploadImage(imageBuffer);
          await prisma.scene.update({ where: { id: scene.id }, data: { imageUrl } });
        }
      });

      const videoUrl = await step.run("render-video", async () => {
        await prisma.video.update({ where: { id: videoId }, data: { status: "rendering" } });

        const renderedScenes = await prisma.scene.findMany({
          where: { videoId },
          orderBy: { sceneOrder: "asc" },
        });
        const video = await prisma.video.findUniqueOrThrow({ where: { id: videoId } });

        return renderStoryVideo(
          renderedScenes.map((s) => ({
            order: s.sceneOrder,
            subtitle: s.subtitle,
            imageUrl: s.imageUrl!,
          })),
          video.audioUrl,
          video.aspectRatio,
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
      throw error;
    }
  },
);
