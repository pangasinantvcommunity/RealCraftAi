import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isDevMode, storyConfig } from "@/lib/config";
import { inngest } from "@/inngest/client";
import { processPrompt } from "@/lib/story-pipeline";
import { getMockSceneImageUrl, slugify } from "@/lib/mock-story";
import { buildProjectContext, computeEpisodeSceneCount } from "@/lib/project-memory";

/** Manually starts generation for a draft episode saved via "Save Episode Draft". */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; episodeId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, episodeId } = await params;
  const video = await prisma.video.findUnique({ where: { id: episodeId } });
  if (!video || video.projectId !== projectId || video.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!video.prompt) {
    return NextResponse.json({ error: "This draft has no saved prompt to generate from." }, { status: 422 });
  }

  // Atomically claim the draft so a slow generation call (which can take
  // 10-30s against real OpenAI) can't be raced by a second click or a
  // reload landing back on a still-"draft"-looking table row.
  const claim = await prisma.video.updateMany({
    where: { id: episodeId, generationStatus: "draft" },
    data: { generationStatus: "queued" },
  });
  if (claim.count === 0) {
    return NextResponse.json({ error: "This episode has already started generating." }, { status: 409 });
  }

  const context = await buildProjectContext(projectId, session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const characters = context.characters.slice(0, storyConfig.maxCharacters).map((c) => ({
    name: c.name,
    description: c.appearance,
    imageUrl: c.imageUrl ?? "",
  }));
  const sceneCount = video.sceneCount ?? computeEpisodeSceneCount(context.runtimeStructure);

  let story;
  try {
    story = await processPrompt({
      prompt: video.prompt,
      style: video.style ?? context.visualStyle,
      duration: video.targetDuration ?? 45,
      characters,
      projectContext: context,
      sceneCount,
    });
  } catch (error) {
    console.error("processPrompt failed generating draft episode", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    await prisma.video.update({
      where: { id: episodeId },
      data: {
        status: "failed",
        metadata: { error: "Generation failed to start. Please try again.", detail, failedAt: new Date().toISOString() },
      },
    });
    return NextResponse.json({ error: "Generation failed to start. Please try again." }, { status: 502 });
  }

  await prisma.video.update({
    where: { id: episodeId },
    data: {
      title: video.title ?? story.title,
      summary: story.summary,
      emotionalArc: story.emotionalArc,
      metadata: isDevMode ? { devMode: true } : undefined,
    },
  });

  const charactersWithImages = characters.filter((c) => c.imageUrl);
  if (charactersWithImages.length > 0) {
    await prisma.character.createMany({
      data: charactersWithImages.map((c, i) => ({
        videoId: episodeId,
        name: c.name,
        description: c.description || null,
        imageUrl: c.imageUrl,
        sortOrder: i,
      })),
    });
  }

  const titleSlug = slugify(story.title);
  await prisma.scene.createMany({
    data: story.scenes.map((scene) => ({
      videoId: episodeId,
      sceneOrder: scene.order,
      prompt: scene.imagePrompt,
      subtitle: scene.subtitle,
      imageUrl: isDevMode ? getMockSceneImageUrl(`${titleSlug}-scene-${scene.order}`) : null,
    })),
  });

  if (!isDevMode) {
    await inngest.send({ name: "story/generate.requested", data: { videoId: episodeId } });
  }

  return NextResponse.json({ id: episodeId }, { status: 200 });
}
