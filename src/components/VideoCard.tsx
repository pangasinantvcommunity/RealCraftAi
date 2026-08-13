"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fireToast } from "@/components/ToastStack";

export type VideoCardData = {
  id: string;
  status: string;
  videoUrl: string | null;
  title: string | null;
  transcript: string | null;
  style: string | null;
  targetDuration: number | null;
  createdAt: Date;
  projectTitle: string | null;
  ownerName?: string | null;
};

export default function VideoCard({ video, styleLabel }: { video: VideoCardData; styleLabel: string | null }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    if (!window.confirm("Delete this story? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/stories/${video.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not delete this story.");
      }
      router.refresh();
    } catch (error) {
      setDeleting(false);
      const message = error instanceof Error ? error.message : "Could not delete this story.";
      fireToast({ type: "error", message });
    }
  };

  return (
    <Link href={`/stories/${video.id}`} className="tilt-card group glass-panel overflow-hidden" data-tilt>
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
        {video.projectTitle && (
          <span className="absolute right-3 top-3 rounded-full bg-violet-500/80 px-3 py-1 text-[10px] uppercase tracking-wide text-white backdrop-blur">
            {video.projectTitle}
          </span>
        )}
        {video.ownerName && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[10px] uppercase tracking-wide text-white backdrop-blur">
            by {video.ownerName}
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-2 p-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-zinc-300">
            {video.title || (video.transcript ? video.transcript.slice(0, 60) : "Processing your story...")}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
            {styleLabel && <span>{styleLabel}</span>}
            {video.targetDuration && (
              <>
                <span className="text-zinc-700">•</span>
                <span>{video.targetDuration}s</span>
              </>
            )}
            <span className="text-zinc-700">•</span>
            <span>{video.createdAt.toLocaleDateString()}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete story"
          className="shrink-0 rounded-lg p-1.5 text-zinc-500 opacity-0 transition-colors hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
        >
          🗑
        </button>
      </div>
    </Link>
  );
}
