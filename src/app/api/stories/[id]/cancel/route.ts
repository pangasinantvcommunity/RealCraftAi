import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const CANCELLABLE_STATUSES = ["pending", "transcribing", "creating_scenes", "generating_images", "rendering"];

/** Marks an in-progress story as failed/cancelled. The running Inngest job cooperatively checks for this between steps and stops doing further work (see isCancelled() in src/inngest/functions.ts). */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const video = await prisma.video.findUnique({ where: { id } });
  if (!video || video.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!CANCELLABLE_STATUSES.includes(video.status)) {
    return NextResponse.json({ error: "This story is no longer in progress." }, { status: 409 });
  }

  await prisma.video.update({
    where: { id },
    data: {
      status: "failed",
      metadata: { cancelled: true, error: "Cancelled by user.", failedAt: new Date().toISOString() },
    },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
