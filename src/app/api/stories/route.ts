import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storyConfig, isDevMode } from "@/lib/config";
import { remainingCredits } from "@/lib/story";
import { inngest } from "@/inngest/client";
import { processPrompt } from "@/lib/story-pipeline";
import { getMockSceneImageUrl, slugify } from "@/lib/mock-story";
import { buildProjectContext, computeEpisodeSceneCount, computeEpisodePartCount } from "@/lib/project-memory";
import type { ProjectContext } from "@/types/project";

const MAX_PROMPT_LENGTH = 10000;
const VALID_ASPECT_RATIOS = ["9:16", "16:9"];

type ParsedCharacter = { name: string; description: string; imageUrl: string };

function parseCharacters(input: unknown): ParsedCharacter[] {
  if (!Array.isArray(input)) return [];

  const result: ParsedCharacter[] = [];
  for (const item of input) {
    if (
      item &&
      typeof item === "object" &&
      typeof item.name === "string" &&
      item.name.trim().length > 0 &&
      typeof item.imageUrl === "string"
    ) {
      result.push({
        name: item.name.trim().slice(0, 60),
        description: typeof item.description === "string" ? item.description.trim().slice(0, 200) : "",
        imageUrl: item.imageUrl,
      });
    }
  }

  return result.slice(0, storyConfig.maxCharacters);
}

/** Prompt-only entry point: text prompt -> structured story -> N scenes. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  if ((await remainingCredits(userId)) <= 0) {
    return NextResponse.json({ error: "limit_reached" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const duration = Number.isFinite(body?.duration) ? Number(body.duration) : 45;
  const projectId = typeof body?.projectId === "string" && body.projectId ? body.projectId : null;
  const episodeTitle = typeof body?.title === "string" && body.title.trim() ? body.title.trim().slice(0, 120) : null;
  const mode = body?.mode === "draft" ? "draft" : "generate";

  if (!prompt) {
    return NextResponse.json({ error: "Please describe a story before generating." }, { status: 422 });
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json({ error: `Prompts must be under ${MAX_PROMPT_LENGTH.toLocaleString()} characters.` }, { status: 422 });
  }
  if (mode === "draft" && !projectId) {
    return NextResponse.json({ error: "Drafts are only available for project episodes." }, { status: 422 });
  }

  let style: string;
  let aspectRatio: string;
  let characters: ParsedCharacter[];
  let projectContext: ProjectContext | undefined;
  let sceneCount: number = storyConfig.defaultSceneCount;
  let partCount: number | null = null;

  if (projectId) {
    // Episode generation inside a project: style/aspect ratio/characters are
    // locked to the project's saved defaults — any client-sent values for
    // those fields are ignored so inheritance can't be bypassed.
    const context = await buildProjectContext(projectId, { id: userId, role: session.user.role });
    if (!context) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    style = context.visualStyle;
    aspectRatio = context.aspectRatio;
    characters = context.characters.slice(0, storyConfig.maxCharacters).map((c) => ({
      name: c.name,
      description: c.appearance,
      imageUrl: c.imageUrl ?? "",
    }));
    projectContext = context;
    sceneCount = computeEpisodeSceneCount(context.runtimeStructure);
    partCount = computeEpisodePartCount(context.runtimeStructure);
  } else {
    style = typeof body?.style === "string" ? body.style : "3d-cinematic";
    aspectRatio = VALID_ASPECT_RATIOS.includes(body?.aspectRatio) ? body.aspectRatio : "9:16";
    characters = parseCharacters(body?.characters);
  }

  if (mode === "draft") {
    const episodeNumber = (await prisma.video.count({ where: { projectId } })) + 1;
    const draft = await prisma.video.create({
      data: {
        userId,
        projectId,
        status: "pending",
        prompt,
        style,
        targetDuration: duration,
        aspectRatio,
        title: episodeTitle,
        episodeNumber,
        partCount,
        sceneCount,
        generationStatus: "draft",
      },
    });
    return NextResponse.json({ id: draft.id, draft: true }, { status: 201 });
  }

  let story;
  try {
    story = await processPrompt({ prompt, style, duration, characters, projectContext, sceneCount });
  } catch (error) {
    console.error("processPrompt failed", error);
    const status = typeof error === "object" && error && "status" in error ? (error as { status?: number }).status : undefined;
    const message =
      status === 429
        ? "The AI service is temporarily out of capacity or credits. Please try again later."
        : "Story generation failed to start. Please try again in a moment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const episodeNumber = projectId ? (await prisma.video.count({ where: { projectId } })) + 1 : null;

  const video = await prisma.video.create({
    data: {
      userId,
      projectId,
      status: "pending",
      prompt,
      style,
      targetDuration: duration,
      aspectRatio,
      title: episodeTitle ?? story.title,
      summary: story.summary,
      emotionalArc: story.emotionalArc,
      metadata: isDevMode ? { devMode: true } : undefined,
      episodeNumber,
      partCount,
      sceneCount,
      generationStatus: "queued",
    },
  });

  const charactersWithImages = characters.filter((c) => c.imageUrl);
  if (charactersWithImages.length > 0) {
    await prisma.character.createMany({
      data: charactersWithImages.map((c, i) => ({
        videoId: video.id,
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
      videoId: video.id,
      sceneOrder: scene.order,
      prompt: scene.imagePrompt,
      subtitle: scene.subtitle,
      imageUrl: isDevMode ? getMockSceneImageUrl(`${titleSlug}-scene-${scene.order}`) : null,
    })),
  });

  if (!isDevMode) {
    await inngest.send({ name: "story/generate.requested", data: { videoId: video.id } });
  }
  // Dev mode: no job to dispatch — the status route simulates progress from
  // elapsed time and stamps status="completed" once it's done (see
  // src/lib/mock-progress.ts).

  return NextResponse.json({ id: video.id }, { status: 201 });
}
