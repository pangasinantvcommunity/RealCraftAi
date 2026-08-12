import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { progressPercent } from "@/lib/story";
import { isDevMode } from "@/lib/config";
import { getSimulatedProgress } from "@/lib/mock-progress";
import { getMockVideoUrl } from "@/lib/mock-video";

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

  const metadata = video.metadata as { error?: string; devMode?: boolean } | null;

  // Dev mode: derive status/progress from elapsed time rather than a real
  // pipeline (see src/lib/mock-progress.ts). Computed statelessly so it's
  // correct regardless of which serverless invocation handles the request;
  // only persisted once, at the moment the simulated run completes.
  if (isDevMode && metadata?.devMode && video.status !== "completed" && video.status !== "failed") {
    const elapsedMs = Date.now() - video.createdAt.getTime();
    const simulated = getSimulatedProgress(elapsedMs);

    if (simulated.status === "completed") {
      const videoUrl = getMockVideoUrl();
      await prisma.video.update({ where: { id: video.id }, data: { status: "completed", videoUrl } });

      return NextResponse.json({
        status: "completed",
        progress: 100,
        videoUrl,
        redirect_url: `/stories/${video.id}`,
        failed: false,
        error: null,
      });
    }

    return NextResponse.json({
      status: simulated.status,
      progress: simulated.progress,
      videoUrl: null,
      redirect_url: null,
      failed: false,
      error: null,
    });
  }

  return NextResponse.json({
    status: video.status,
    progress: progressPercent(video.status),
    videoUrl: video.status === "completed" ? video.videoUrl : null,
    redirect_url: video.status === "completed" ? `/stories/${video.id}` : null,
    failed: video.status === "failed",
    error: video.status === "failed" ? metadata?.error : null,
  });
}
