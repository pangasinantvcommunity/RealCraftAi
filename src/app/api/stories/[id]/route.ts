import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteBlob } from "@/lib/storage";
import { canAccessResource } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";

const MAX_PROMPT_LENGTH = 10000;
const IN_PROGRESS_STATUSES = ["pending", "transcribing", "creating_scenes", "generating_images", "rendering"];

/** Renames an episode's title and/or edits its stored prompt text. Does not regenerate scenes/images — for a completed video this only edits metadata. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const video = await prisma.video.findUnique({ where: { id }, include: { user: { select: { id: true, role: true } } } });
  if (!video || !canAccessResource(session.user, { id: video.user.id, role: video.user.role })) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : undefined;
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, MAX_PROMPT_LENGTH) : undefined;

  if (title !== undefined && !title) {
    return NextResponse.json({ error: "Title cannot be empty." }, { status: 422 });
  }
  if (prompt !== undefined && !prompt) {
    return NextResponse.json({ error: "Prompt cannot be empty." }, { status: 422 });
  }

  const isNonOwnerEdit = session.user.id !== video.user.id;

  await prisma.video.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(prompt !== undefined ? { prompt } : {}),
      ...(isNonOwnerEdit ? { lastModifiedBy: session.user.id } : {}),
    },
  });

  if (isNonOwnerEdit) {
    await logAudit({
      actor: { id: session.user.id, name: session.user.name ?? session.user.email ?? "Unknown", role: session.user.role },
      action: "episode_modified",
      targetType: "episode",
      targetId: id,
    });
  }

  return NextResponse.json({ id }, { status: 200 });
}

/** Deletes an episode/story and its scenes/characters (cascade) plus best-effort cleanup of its Blob assets. Refuses while a generation is actively in progress — cancel it first. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const video = await prisma.video.findUnique({
    where: { id },
    include: { scenes: true, user: { select: { id: true, role: true } } },
  });
  if (!video || !canAccessResource(session.user, { id: video.user.id, role: video.user.role })) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (video.generationStatus !== "draft" && IN_PROGRESS_STATUSES.includes(video.status)) {
    return NextResponse.json({ error: "Cancel the generation before deleting this episode." }, { status: 409 });
  }

  const blobUrls = [video.videoUrl, ...video.scenes.map((s) => s.imageUrl)].filter(
    (url): url is string => !!url && url.startsWith("https://"),
  );
  await Promise.all(blobUrls.map((url) => deleteBlob(url).catch(() => {})));

  await prisma.video.delete({ where: { id } });

  if (session.user.id !== video.user.id) {
    await logAudit({
      actor: { id: session.user.id, name: session.user.name ?? session.user.email ?? "Unknown", role: session.user.role },
      action: "episode_deleted",
      targetType: "episode",
      targetId: id,
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
