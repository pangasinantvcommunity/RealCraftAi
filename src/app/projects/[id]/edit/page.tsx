import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProjectForm from "@/components/ProjectForm";
import type { RuntimeStructure } from "@/types/project";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session!.user.id) {
    notFound();
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center px-6 py-32">
      <div className="pointer-events-none absolute inset-0 bg-cinematic-glow" />

      <div className="relative w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Edit Project</h1>
        </div>

        <ProjectForm
          mode="edit"
          projectId={project.id}
          initial={{
            title: project.title,
            synopsis: project.synopsis ?? "",
            storyBible: project.storyBible ?? "",
            visualStyle: project.visualStyle,
            aspectRatio: project.aspectRatio,
            runtimeStructure: (project.runtimeStructure as RuntimeStructure | null) ?? {},
          }}
        />
      </div>
    </section>
  );
}
