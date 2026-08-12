import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storyConfig, isDevMode } from "@/lib/config";
import { remainingCredits } from "@/lib/story";
import { uploadAudio } from "@/lib/storage";
import { inngest } from "@/inngest/client";
import { generateMockScenes } from "@/lib/mock-scene-generator";
import { MOCK_TRANSCRIPT } from "@/lib/mock-data";

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

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  if ((await remainingCredits(userId)) <= 0) {
    return NextResponse.json({ error: "limit_reached" }, { status: 429 });
  }

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
