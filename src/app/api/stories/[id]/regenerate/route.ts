import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isDevMode, storyConfig } from "@/lib/config";
import { inngest } from "@/inngest/client";
import { processPrompt } from "@/lib/story-pipeline";
import { getMockSceneImageUrl, slugify } from "@/lib/mock-story";
import { buildProjectContext, computeEpisodeSceneCount } from "@/lib/project-memory";
import { deleteBlob } from "@/lib/storage";
import { canAccessResource } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import type { ProjectContext } from "@/types/project";

const REGENERATABLE_STATUSES = ["completed", "failed"];

/**
 * Re-runs generation for an existing episode in place (same video id, same
 * position in its project) using its current saved prompt/style/duration —
 * pick up any edits made via PATCH /api/stories/[id] first. For a project
 * episode, characters/locations/story-bible/runtime-structure are re-pulled
 * fresh from the project so recent project edits are reflected too.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const video = await prisma.video.findUnique({
    where: { id },
    include: { scenes: true, characters: true, user: { select: { id: true, role: true } } },
  });
  if (!video || !canAccessResource(session.user, { id: video.user.id, role: video.user.role })) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!REGENERATABLE_STATUSES.includes(video.status)) {
    return NextResponse.json({ error: "This episode is currently in progress." }, { status: 409 });
  }
  if (!video.prompt) {
    return NextResponse.json({ error: "This story has no saved prompt to regenerate from." }, { status: 422 });
  }

  let characters: { name: string; description: string; imageUrl: string }[];
  let projectContext: ProjectContext | undefined;
  let sceneCount: number = storyConfig.defaultSceneCount;

  if (video.projectId) {
    const context = await buildProjectContext(video.projectId, session.user);
    if (!context) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    characters = context.characters.slice(0, storyConfig.maxCharacters).map((c) => ({
      name: c.name,
      description: c.appearance,
      imageUrl: c.imageUrl ?? "",
    }));
    projectContext = context;
    sceneCount = computeEpisodeSceneCount(context.runtimeStructure);
  } else {
    characters = video.characters.map((c) => ({ name: c.name, description: c.description ?? "", imageUrl: c.imageUrl }));
  }

  // Best-effort cleanup of the previous run's assets before regenerating.
  const oldBlobUrls = [video.videoUrl, ...video.scenes.map((s) => s.imageUrl)].filter(
    (url): url is string => !!url && url.startsWith("https://"),
  );
  await Promise.all(oldBlobUrls.map((url) => deleteBlob(url).catch(() => {})));

  await prisma.scene.deleteMany({ where: { videoId: id } });
  if (video.projectId) {
    // Re-snapshotted fresh from the project's current characters below.
    await prisma.character.deleteMany({ where: { videoId: id } });
  }

  await prisma.video.update({
    where: { id },
    data: { status: "pending", videoUrl: null, metadata: isDevMode ? { devMode: true } : Prisma.JsonNull },
  });

  let story;
  try {
    story = await processPrompt({
      prompt: video.prompt,
      style: video.style ?? "3d-cinematic",
      duration: video.targetDuration ?? 45,
      characters,
      projectContext,
      sceneCount,
    });
  } catch (error) {
    console.error("processPrompt failed during regenerate", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    await prisma.video.update({
      where: { id },
      data: {
        status: "failed",
        metadata: { error: "Regeneration failed to start. Please try again.", detail, failedAt: new Date().toISOString() },
      },
    });
    return NextResponse.json({ error: "Regeneration failed to start. Please try again." }, { status: 502 });
  }

  await prisma.video.update({
    where: { id },
    data: { summary: story.summary, emotionalArc: story.emotionalArc },
  });

  const charactersWithImages = characters.filter((c) => c.imageUrl);
  if (video.projectId && charactersWithImages.length > 0) {
    await prisma.character.createMany({
      data: charactersWithImages.map((c, i) => ({
        videoId: id,
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
      videoId: id,
      sceneOrder: scene.order,
      prompt: scene.imagePrompt,
      subtitle: scene.subtitle,
      imageUrl: isDevMode ? getMockSceneImageUrl(`${titleSlug}-scene-${scene.order}`) : null,
    })),
  });

  if (!isDevMode) {
    await inngest.send({ name: "story/generate.requested", data: { videoId: id } });
  }

  if (session.user.id !== video.user.id) {
    await prisma.video.update({ where: { id }, data: { lastModifiedBy: session.user.id } });
    await logAudit({
      actor: { id: session.user.id, name: session.user.name ?? session.user.email ?? "Unknown", role: session.user.role },
      action: "episode_modified",
      targetType: "episode",
      targetId: id,
      metadata: { kind: "regenerate" },
    });
  }

  return NextResponse.json({ id }, { status: 200 });
}
