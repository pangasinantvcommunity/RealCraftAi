import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { STORY_STYLES, ASPECT_RATIOS } from "@/lib/story-options";
import CharacterSheetWizard from "@/components/project/CharacterSheetWizard";
import LocationWizard from "@/components/project/LocationWizard";
import type { RuntimeStructure } from "@/types/project";

function runtimeSummary(rs: RuntimeStructure | null): { label: string; value: string }[] {
  if (!rs) return [];
  const items: { label: string; value: string }[] = [];
  if (rs.totalRuntimeSeconds) items.push({ label: "Total Runtime", value: `${rs.totalRuntimeSeconds}s` });
  if (rs.episodes) items.push({ label: "Episodes", value: String(rs.episodes) });
  if (rs.runtimePerEpisodeSeconds) items.push({ label: "Runtime / Episode", value: `${rs.runtimePerEpisodeSeconds}s` });
  if (rs.partsPerEpisode) items.push({ label: "Parts / Episode", value: String(rs.partsPerEpisode) });
  if (rs.runtimePerPartSeconds) items.push({ label: "Runtime / Part", value: `${rs.runtimePerPartSeconds}s` });
  if (rs.scenesPerPart) items.push({ label: "Scenes / Part", value: String(rs.scenesPerPart) });
  if (rs.averageSceneDurationSeconds) items.push({ label: "Avg Scene Duration", value: `${rs.averageSceneDurationSeconds}s` });
  return items;
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      characters: { orderBy: { createdAt: "asc" } },
      locations: { orderBy: { createdAt: "asc" } },
      episodes: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!project || project.userId !== session!.user.id) {
    notFound();
  }

  const styleLabel = STORY_STYLES.find((s) => s.value === project.visualStyle)?.label ?? project.visualStyle;
  const aspectLabel = ASPECT_RATIOS.find((a) => a.value === project.aspectRatio)?.label ?? project.aspectRatio;
  const runtimeItems = runtimeSummary((project.runtimeStructure as RuntimeStructure | null) ?? null);

  const episodesNewestFirst = [...project.episodes].reverse();

  return (
    <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-cinematic-glow opacity-30" />

      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-start">
        <div>
          <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">{project.title}</h1>
          {project.synopsis && <p className="mt-2 max-w-2xl text-zinc-400">{project.synopsis}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300">{styleLabel}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300">{aspectLabel}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <a href={`/api/projects/${project.id}/export`} className="btn-secondary" download>
            Export Project Bible
          </a>
          <Link href={`/projects/${project.id}/edit`} className="btn-secondary">Edit Project</Link>
          <Link href={`/projects/${project.id}/episodes/new`} className="btn-primary">+ Generate Episode</Link>
        </div>
      </div>

      {runtimeItems.length > 0 && (
        <div className="glass-panel mt-10 p-6">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Runtime Structure</p>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {runtimeItems.map((item) => (
              <div key={item.label}>
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">{item.label}</p>
                <p className="mt-1 font-heading text-lg text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {project.storyBible && (
        <div className="glass-panel mt-6 p-6">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Story Bible</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-300">{project.storyBible}</p>
        </div>
      )}

      <div className="mt-12">
        <CharacterSheetWizard projectId={project.id} characters={project.characters} />
      </div>

      <div className="mt-12">
        <LocationWizard projectId={project.id} locations={project.locations} />
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-white">Episodes</h2>
          <Link href={`/projects/${project.id}/episodes/new`} className="text-xs font-semibold text-violet-300 transition-colors hover:text-violet-200">
            + Generate Episode
          </Link>
        </div>

        {project.episodes.length === 0 ? (
          <div className="glass-panel mt-4 p-12 text-center">
            <p className="text-zinc-400">No episodes yet.</p>
            <Link href={`/projects/${project.id}/episodes/new`} className="btn-primary mt-6 inline-flex">Generate Episode 1</Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {episodesNewestFirst.map((video) => {
              const episodeNumber = project.episodes.findIndex((e) => e.id === video.id) + 1;
              return (
                <Link key={video.id} href={`/stories/${video.id}`} className="tilt-card group glass-panel overflow-hidden" data-tilt>
                  <div className="relative aspect-[9/16] bg-gradient-to-br from-violet-900/40 to-cyan-900/20">
                    {video.status === "completed" && video.videoUrl ? (
                      <video className="h-full w-full object-cover" muted loop src={video.videoUrl} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">🎬</div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[10px] uppercase tracking-wide text-white backdrop-blur">
                      Episode {episodeNumber}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="truncate text-sm text-zinc-300">{video.title || "Processing your episode..."}</p>
                    <p className="mt-1 text-xs text-zinc-500">{video.createdAt.toLocaleDateString()}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
