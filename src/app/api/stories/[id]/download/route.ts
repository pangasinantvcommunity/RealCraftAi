import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const video = await prisma.video.findUnique({ where: { id } });

  if (!video || video.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (video.status !== "completed" || !video.videoUrl) {
    return NextResponse.json({ error: "Video is not ready yet." }, { status: 409 });
  }

  const response = await fetch(video.videoUrl);
  if (!response.ok || !response.body) {
    return NextResponse.json({ error: "Could not fetch video." }, { status: 502 });
  }

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": 'attachment; filename="realcraft-ai-story.mp4"',
    },
  });
}
