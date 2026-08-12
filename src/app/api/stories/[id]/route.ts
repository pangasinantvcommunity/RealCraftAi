import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_PROMPT_LENGTH = 10000;

/** Renames an episode's title and/or edits its stored prompt text. Does not regenerate scenes/images — for a completed video this only edits metadata. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const video = await prisma.video.findUnique({ where: { id } });
  if (!video || video.userId !== session.user.id) {
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

  await prisma.video.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(prompt !== undefined ? { prompt } : {}),
    },
  });

  return NextResponse.json({ id }, { status: 200 });
}
