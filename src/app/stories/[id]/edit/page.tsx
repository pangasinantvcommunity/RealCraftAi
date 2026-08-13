import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EpisodeEditForm from "@/components/EpisodeEditForm";
import { canAccessResource } from "@/lib/auth/permissions";

export default async function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  const video = await prisma.video.findUnique({ where: { id }, include: { user: { select: { id: true, role: true } } } });
  if (!video || !canAccessResource(session!.user, { id: video.user.id, role: video.user.role })) {
    notFound();
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center px-6 py-32">
      <div className="pointer-events-none absolute inset-0 bg-cinematic-glow" />

      <div className="relative w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Edit Episode</h1>
        </div>

        <EpisodeEditForm
          videoId={video.id}
          initialTitle={video.title ?? ""}
          initialPrompt={video.prompt ?? ""}
          redirectTo={video.generationStatus === "draft" && video.projectId ? `/projects/${video.projectId}` : `/stories/${video.id}`}
        />
      </div>
    </section>
  );
}
