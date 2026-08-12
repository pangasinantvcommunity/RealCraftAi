import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storyConfig, isDevMode } from "@/lib/config";
import { remainingCredits } from "@/lib/story";
import { uploadAudio } from "@/lib/storage";
import { inngest } from "@/inngest/client";
import { generateMockScenes } from "@/lib/mock-scene-generator";
import { MOCK_TRANSCRIPT } from "@/lib/mock-data";
import { processPrompt } from "@/lib/story-pipeline";
import { getMockSceneImageUrl, slugify } from "@/lib/mock-story";

const ALLOWED_MIME_TYPES = [
  "audio/webm",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/ogg",
];

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

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  if ((await remainingCredits(userId)) <= 0) {
    return NextResponse.json({ error: "limit_reached" }, { status: 429 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return handlePromptStory(request, userId);
  }

  return handleAudioStory(request, userId);
}

/** Primary flow: text prompt -> structured story -> 6 scenes. No audio involved. */
async function handlePromptStory(request: NextRequest, userId: string) {
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const style = typeof body?.style === "string" ? body.style : "3d-cinematic";
  const duration = Number.isFinite(body?.duration) ? Number(body.duration) : 45;
  const aspectRatio = VALID_ASPECT_RATIOS.includes(body?.aspectRatio) ? body.aspectRatio : "9:16";

  const characters = parseCharacters(body?.characters);

  if (!prompt) {
    return NextResponse.json({ error: "Please describe a story before generating." }, { status: 422 });
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json({ error: `Prompts must be under ${MAX_PROMPT_LENGTH.toLocaleString()} characters.` }, { status: 422 });
  }

  const story = await processPrompt({ prompt, style, duration, characters });

  const video = await prisma.video.create({
    data: {
      userId,
      status: "pending",
      prompt,
      style,
      targetDuration: duration,
      aspectRatio,
      title: story.title,
      summary: story.summary,
      emotionalArc: story.emotionalArc,
      metadata: isDevMode ? { devMode: true } : undefined,
    },
  });

  if (characters.length > 0) {
    await prisma.character.createMany({
      data: characters.map((c, i) => ({
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

/** Secondary flow (Voice / Upload tabs): audio -> transcript -> scenes, unchanged. */
async function handleAudioStory(request: NextRequest, userId: string) {
  const formData = await request.formData();
  const audio = formData.get("audio");

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Please record or upload an audio file." }, { status: 422 });
  }

  if (!ALLOWED_MIME_TYPES.includes(audio.type)) {
    return NextResponse.json(
      { error: "That audio format is not supported. Please use WAV, MP3, M4A, OGG, or WEBM." },
      { status: 422 },
    );
  }

  const maxBytes = storyConfig.maxUploadMb * 1024 * 1024;
  if (audio.size > maxBytes) {
    return NextResponse.json(
      { error: `Audio files must be smaller than ${storyConfig.maxUploadMb}MB.` },
      { status: 422 },
    );
  }

  // Dev mode: skip the real upload/AI pipeline entirely. Scenes are created
  // with mock content up front; the status route simulates progress and
  // stamps status="completed" once enough time has elapsed (see
  // src/lib/mock-progress.ts) — no OpenAI, Blob, or Inngest calls happen.
  if (isDevMode) {
    const video = await prisma.video.create({
      data: {
        userId,
        status: "pending",
        audioUrl: `dev-mode://local-placeholder/${audio.name}`,
        transcript: MOCK_TRANSCRIPT,
        metadata: {
          devMode: true,
          originalFilename: audio.name,
          originalSizeBytes: audio.size,
          originalMimeType: audio.type,
        },
      },
    });

    const mockScenes = generateMockScenes();
    await prisma.scene.createMany({
      data: mockScenes.map((scene) => ({
        videoId: video.id,
        sceneOrder: scene.order,
        prompt: scene.prompt,
        subtitle: scene.subtitle,
        imageUrl: scene.imageUrl,
      })),
    });

    return NextResponse.json({ id: video.id }, { status: 201 });
  }

  const buffer = Buffer.from(await audio.arrayBuffer());
  const ext = audio.name.split(".").pop() || "webm";
  const audioUrl = await uploadAudio(userId, buffer, audio.type, ext);

  const video = await prisma.video.create({
    data: { userId, status: "pending", audioUrl },
  });

  await inngest.send({ name: "story/generate.requested", data: { videoId: video.id } });

  return NextResponse.json({ id: video.id }, { status: 201 });
}
