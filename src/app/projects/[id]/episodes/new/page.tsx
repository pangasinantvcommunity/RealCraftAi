import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import EpisodePromptForm from "@/components/EpisodePromptForm";
import { computeEpisodeSceneCount } from "@/lib/project-memory";
import { canAccessResource } from "@/lib/auth/permissions";
import type { RuntimeStructure } from "@/types/project";

export default async function NewEpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { _count: { select: { characters: true, locations: true } }, user: { select: { id: true, role: true } } },
  });
  if (!project || !canAccessResource(session!.user, { id: project.user.id, role: project.user.role })) {
    notFound();
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center px-6 py-32">
      <div className="pointer-events-none absolute inset-0 bg-cinematic-glow" />

      <div className="relative w-full max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-violet-300">{project.title}</p>
          <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Generate New Episode</h1>
          <p className="mt-2 text-zinc-400">This episode will automatically use your saved cast, locations, and story bible.</p>
        </div>

        <EpisodePromptForm
          projectId={project.id}
          visualStyle={project.visualStyle}
          aspectRatio={project.aspectRatio}
          characterCount={project._count.characters}
          locationCount={project._count.locations}
          sceneCount={computeEpisodeSceneCount((project.runtimeStructure as RuntimeStructure | null) ?? null)}
        />
      </div>
    </section>
  );
}
