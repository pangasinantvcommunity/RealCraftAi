import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { remainingCredits } from "@/lib/story";
import { storyConfig } from "@/lib/config";
import UpgradeModal from "@/components/UpgradeModal";
import DevModeBadge from "@/components/DevModeBadge";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ limitReached?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const { limitReached } = await searchParams;

  const [videos, credits, totalCount, completedCount] = await Promise.all([
    prisma.video.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 9 }),
    remainingCredits(userId),
    prisma.video.count({ where: { userId } }),
    prisma.video.count({ where: { userId, status: "completed" } }),
  ]);

  const dailyLimit = storyConfig.dailyFreeCredits;
  const circumference = 2 * Math.PI * 28;
  const offset = circumference * (1 - (dailyLimit ? credits / dailyLimit : 0));

  return (
    <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-cinematic-glow opacity-30" />

      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Your Stories</h1>
            <DevModeBadge />
          </div>
          <p className="text-zinc-400">{totalCount} cinematic {totalCount === 1 ? "story" : "stories"} created so far.</p>
        </div>
        <Link href="/stories/create" className="btn-primary">+ Create Story</Link>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        <div className="glass-panel flex items-center gap-5 p-6">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <svg className="h-16 w-16 -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
              <circle
                cx="32" cy="32" r="28" stroke="url(#ring-gradient)" strokeWidth="6" fill="none"
                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
              />
              <defs>
                <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7C4DFF" />
                  <stop offset="100%" stopColor="#00E5FF" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute font-heading text-lg font-bold text-white">{credits}</span>
          </div>
          <div>
            <p className="text-sm text-zinc-400">Credits remaining</p>
            <p className="font-heading text-sm text-white">{credits} / {dailyLimit} today</p>
          </div>
        </div>

        <div className="glass-panel p-6">
          <p className="text-sm text-zinc-400">Total stories</p>
          <p className="mt-2 font-heading text-3xl font-bold text-white">{totalCount}</p>
        </div>

        <div className="glass-panel p-6">
          <p className="text-sm text-zinc-400">Completed</p>
          <p className="mt-2 font-heading text-3xl font-bold text-white">{completedCount}</p>
        </div>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {videos.length === 0 ? (
          <div className="glass-panel col-span-full p-12 text-center">
            <p className="text-zinc-400">You haven&apos;t created a story yet.</p>
            <Link href="/stories/create" className="btn-primary mt-6 inline-flex">Create Your First Story</Link>
          </div>
        ) : (
          videos.map((video) => (
            <Link
              key={video.id}
              href={`/stories/${video.id}`}
              className="tilt-card group glass-panel overflow-hidden"
              data-tilt
            >
              <div className="relative aspect-[9/16] bg-gradient-to-br from-violet-900/40 to-cyan-900/20">
                {video.status === "completed" && video.videoUrl ? (
                  <video className="h-full w-full object-cover" muted loop src={video.videoUrl} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl">🎬</div>
                )}
                <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[10px] uppercase tracking-wide text-white backdrop-blur">
                  <span
                    className={`status-dot ${
                      video.status === "completed"
                        ? "bg-cyan-400 text-cyan-400"
                        : video.status === "failed"
                          ? "bg-red-400 text-red-400"
                          : "bg-violet-400 text-violet-400 animate-pulse"
                    }`}
                  />
                  {video.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="p-4">
                <p className="truncate text-sm text-zinc-300">
                  {video.transcript ? video.transcript.slice(0, 60) : "Processing your story..."}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{video.createdAt.toLocaleDateString()}</p>
              </div>
            </Link>
          ))
        )}
      </div>

      <UpgradeModal initialOpen={limitReached === "1"} />
    </section>
  );
}
