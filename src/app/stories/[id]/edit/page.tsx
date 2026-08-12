import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EpisodeEditForm from "@/components/EpisodeEditForm";

export default async function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  const video = await prisma.video.findUnique({ where: { id } });
  if (!video || video.userId !== session!.user.id) {
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
        />
      </div>
    </section>
  );
}
