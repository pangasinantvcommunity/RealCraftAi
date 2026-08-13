"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fireToast } from "@/components/ToastStack";

export type EpisodeRow = {
  id: string;
  episodeNumber: number;
  title: string | null;
  status: string;
  generationStatus: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Queued",
  transcribing: "Transcribing",
  creating_scenes: "Creating Scenes",
  generating_images: "Generating Images",
  rendering: "Rendering",
  completed: "Completed",
  failed: "Failed",
};

function friendlyStatus(episode: EpisodeRow): string {
  if (episode.generationStatus === "draft") return "Draft";
  return STATUS_LABELS[episode.status] ?? episode.status;
}

function statusClasses(episode: EpisodeRow): string {
  if (episode.generationStatus === "draft") return "border-white/10 bg-white/5 text-zinc-400";
  if (episode.status === "completed") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";
  if (episode.status === "failed") return "border-red-400/30 bg-red-500/10 text-red-300";
  return "border-violet-400/30 bg-violet-500/10 text-violet-300";
}

export default function EpisodeTable({ projectId, episodes }: { projectId: string; episodes: EpisodeRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const generate = async (episode: EpisodeRow) => {
    if (busyId) return;
    setBusyId(episode.id);
    try {
      const response = await fetch(`/api/projects/${projectId}/episodes/${episode.id}/generate`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not start generation.");
      }
      router.push(`/stories/${episode.id}`);
    } catch (error) {
      setBusyId(null);
      const message = error instanceof Error ? error.message : "Could not start generation.";
      fireToast({ type: "error", message });
    }
  };

  const remove = async (episode: EpisodeRow) => {
    if (busyId) return;
    if (!window.confirm(`Delete Episode ${episode.episodeNumber}? This cannot be undone.`)) return;
    setBusyId(episode.id);
    try {
      const response = await fetch(`/api/stories/${episode.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not delete this episode.");
      }
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete this episode.";
      fireToast({ type: "error", message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="glass-panel mt-4 overflow-x-auto p-0">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-5 py-4 font-medium">Episode</th>
            <th className="px-5 py-4 font-medium">Title</th>
            <th className="px-5 py-4 font-medium">Status</th>
            <th className="px-5 py-4 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {episodes.map((episode) => (
            <tr key={episode.id} className="border-b border-white/5 last:border-0">
              <td className="px-5 py-4 text-zinc-300">{episode.episodeNumber}</td>
              <td className="px-5 py-4 text-white">
                {episode.generationStatus === "draft" ? (
                  <span>{episode.title || "Untitled draft"}</span>
                ) : (
                  <Link href={`/stories/${episode.id}`} className="hover:text-violet-300">
                    {episode.title || "Processing your episode..."}
                  </Link>
                )}
              </td>
              <td className="px-5 py-4">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClasses(episode)}`}>
                  {friendlyStatus(episode)}
                </span>
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center justify-end gap-4 text-xs font-semibold">
                  {episode.generationStatus === "draft" && (
                    <button
                      type="button"
                      onClick={() => generate(episode)}
                      disabled={busyId === episode.id}
                      className="text-emerald-300 transition-colors hover:text-emerald-200 disabled:opacity-50"
                    >
                      {busyId === episode.id ? "Starting..." : "Generate"}
                    </button>
                  )}
                  <Link href={`/stories/${episode.id}/edit`} className="text-violet-300 transition-colors hover:text-violet-200">
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(episode)}
                    disabled={busyId === episode.id}
                    aria-label={`Delete Episode ${episode.episodeNumber}`}
                    className="text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
