import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { progressPercent } from "@/lib/story";
import StatusPoller from "@/components/StatusPoller";
import StoryPreview from "@/components/StoryPreview";

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  const video = await prisma.video.findUnique({
    where: { id },
    include: { scenes: { orderBy: { sceneOrder: "asc" } } },
  });

  if (!video || video.userId !== session!.user.id) {
    notFound();
  }

  if (video.status === "completed" && video.videoUrl) {
    return (
      <StoryPreview
        videoId={video.id}
        videoUrl={video.videoUrl}
        posterUrl={video.scenes[0]?.imageUrl ?? null}
        transcript={video.transcript}
        scenes={video.scenes.map((s) => ({ subtitle: s.subtitle, imageUrl: s.imageUrl }))}
      />
    );
  }

  return (
    <StatusPoller videoId={video.id} initialStatus={video.status} initialProgress={progressPercent(video.status)} />
  );
}
