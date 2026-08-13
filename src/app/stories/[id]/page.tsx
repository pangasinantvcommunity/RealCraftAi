import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { progressPercent } from "@/lib/story";
import StatusPoller from "@/components/StatusPoller";
import StoryPreview from "@/components/StoryPreview";
import type { RuntimeStructure } from "@/types/project";

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      scenes: { orderBy: { sceneOrder: "asc" } },
      characters: { orderBy: { sortOrder: "asc" } },
      project: { include: { locations: { orderBy: { createdAt: "asc" } } } },
    },
  });

  if (!video || video.userId !== session!.user.id) {
    notFound();
  }

  if (video.generationStatus === "draft" && video.projectId) {
    redirect(`/projects/${video.projectId}`);
  }

  const emotionalArc = Array.isArray(video.emotionalArc) ? (video.emotionalArc as string[]) : [];
  const runtimeStructure = (video.project?.runtimeStructure as RuntimeStructure | null) ?? null;

  if (video.status === "completed" && video.videoUrl) {
    return (
      <StoryPreview
        videoId={video.id}
        videoUrl={video.videoUrl}
        posterUrl={video.scenes[0]?.imageUrl ?? null}
        title={video.title}
        projectTitle={video.project?.title ?? null}
        summary={video.summary}
        emotionalArc={emotionalArc}
        transcript={video.transcript}
        scenes={video.scenes.map((s) => ({ subtitle: s.subtitle, imageUrl: s.imageUrl }))}
        aspectRatio={video.aspectRatio}
        characters={video.characters.map((c) => ({ name: c.name, imageUrl: c.imageUrl }))}
        locations={video.project?.locations.map((l) => ({ name: l.name, imageUrl: l.imageUrl })) ?? []}
        runtimeStructure={runtimeStructure}
        sceneCount={video.scenes.length}
        partsPerEpisode={runtimeStructure?.partsPerEpisode ?? null}
        projectId={video.projectId}
      />
    );
  }

  return (
    <StatusPoller
      videoId={video.id}
      initialStatus={video.status}
      initialProgress={progressPercent(video.status)}
      title={video.title}
      emotionalArc={emotionalArc}
      scenes={video.scenes.map((s, i) => ({ order: i + 1, subtitle: s.subtitle, imageUrl: s.imageUrl }))}
      aspectRatio={video.aspectRatio}
      projectId={video.projectId}
    />
  );
}
