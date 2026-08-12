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

  // video.videoUrl is a root-relative path in dev mode (served from public/,
  // e.g. "/demo/demo-story.mp4") but a full https:// Blob URL in production —
  // Node's server-side fetch throws on a relative URL with no base, so
  // resolve it against the current request's origin first.
  const absoluteUrl = new URL(video.videoUrl, request.nextUrl.origin).toString();

  const response = await fetch(absoluteUrl);
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
