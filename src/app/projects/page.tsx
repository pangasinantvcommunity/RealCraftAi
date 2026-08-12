import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function ProjectsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { characters: true, locations: true, episodes: true } } },
  });

  return (
    <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-cinematic-glow opacity-30" />

      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Your Projects</h1>
          <p className="mt-2 text-zinc-400">
            {projects.length} {projects.length === 1 ? "project" : "projects"} — reusable casts, worlds, and story bibles.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/projects/import" className="btn-secondary">Import Project</Link>
          <Link href="/projects/new" className="btn-primary">+ New Project</Link>
        </div>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <div className="glass-panel col-span-full p-12 text-center">
            <p className="text-zinc-400">You haven&apos;t created a project yet.</p>
            <p className="mt-1 text-sm text-zinc-500">
              Projects let you save characters, locations, and a story bible that every episode automatically reuses.
            </p>
            <Link href="/projects/new" className="btn-primary mt-6 inline-flex">+ New Project</Link>
          </div>
        ) : (
          projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="tilt-card group glass-panel p-6" data-tilt>
              <p className="font-heading text-lg font-semibold text-white">{project.title}</p>
              {project.synopsis && <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{project.synopsis}</p>}
              <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                <span>{project._count.characters} characters</span>
                <span>•</span>
                <span>{project._count.locations} locations</span>
                <span>•</span>
                <span>{project._count.episodes} episodes</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
