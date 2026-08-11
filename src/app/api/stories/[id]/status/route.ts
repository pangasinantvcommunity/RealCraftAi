import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { progressPercent } from "@/lib/story";

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

  const metadata = video.metadata as { error?: string } | null;

  return NextResponse.json({
    status: video.status,
    progress: progressPercent(video.status),
    redirect_url: video.status === "completed" ? `/stories/${video.id}` : null,
    failed: video.status === "failed",
    error: video.status === "failed" ? metadata?.error : null,
  });
}
