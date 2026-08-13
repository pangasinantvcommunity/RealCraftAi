"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TunnelScene from "@/components/TunnelScene";
import SceneStoryboard, { type StoryboardScene } from "@/components/SceneStoryboard";
import EmotionalArcChips from "@/components/EmotionalArcChips";
import { fireToast } from "@/components/ToastStack";

const STEPS = [
  { key: "pending", label: "Understanding Story" },
  { key: "transcribing", label: "Understanding Story" },
  { key: "creating_scenes", label: "Creating Scenes" },
  { key: "generating_images", label: "Designing Cinematic Frames" },
  { key: "rendering", label: "Rendering Film" },
  { key: "completed", label: "Finalizing" },
];

type StatusResponse = {
  status: string;
  progress: number;
  redirect_url: string | null;
  failed: boolean;
  error: string | null;
};

export default function StatusPoller({
  videoId,
  initialStatus,
  initialProgress,
  title,
  emotionalArc,
  scenes,
  aspectRatio,
  projectId,
}: {
  videoId: string;
  initialStatus: string;
  initialProgress: number;
  title?: string | null;
  emotionalArc?: string[];
  scenes?: StoryboardScene[];
  aspectRatio?: string;
  projectId?: string | null;
}) {
  const router = useRouter();
  const retryUrl = projectId ? `/projects/${projectId}/episodes/new` : "/stories/create";
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(initialProgress);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const response = await fetch(`/api/stories/${videoId}/status`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Status request failed");

      const data: StatusResponse = await response.json();
      setStatus(data.status);
      setProgress(data.progress);
      setFailed(data.failed);
      setErrorMessage(data.error || "");

      if (data.failed) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        fireToast({ type: "error", message: data.error || "Story generation failed." });
        return;
      }

      if (data.redirect_url) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        router.push(data.redirect_url);
        router.refresh();
      }
    } catch {
      fireToast({ type: "error", message: "Lost connection while checking your story status." });
    }
  }, [videoId, router]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    poll();
    intervalRef.current = setInterval(poll, 3000);
  }, [poll]);

  useEffect(() => {
    startPolling();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startPolling]);

  const cancelGeneration = async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      const response = await fetch(`/api/stories/${videoId}/cancel`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not cancel this story.");
      }
      // Next poll tick (within 3s) will pick up status="failed" and show the cancelled state.
    } catch (error) {
      setCancelling(false);
      const message = error instanceof Error ? error.message : "Could not cancel this story.";
      fireToast({ type: "error", message });
    }
  };

  const regenerate = async () => {
    if (regenerating) return;
    setRegenerating(true);
    try {
      const response = await fetch(`/api/stories/${videoId}/regenerate`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not regenerate this episode.");
      }
      setFailed(false);
      setErrorMessage("");
      setStatus("pending");
      setProgress(5);
      startPolling();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not regenerate this episode.";
      fireToast({ type: "error", message });
    } finally {
      setRegenerating(false);
    }
  };

  const deleteEpisode = async () => {
    if (deleting) return;
    if (!window.confirm("Delete this episode? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/stories/${videoId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not delete this episode.");
      }
      router.push(projectId ? `/projects/${projectId}` : "/dashboard");
      router.refresh();
    } catch (error) {
      setDeleting(false);
      const message = error instanceof Error ? error.message : "Could not delete this episode.";
      fireToast({ type: "error", message });
    }
  };

  const stepIndex = (key: string) => STEPS.findIndex((s) => s.key === key);
  const isDone = (key: string) => stepIndex(key) < stepIndex(status);
  const isActive = (key: string) => key === status;
  const currentLabel = STEPS.find((s) => s.key === status)?.label ?? "Processing";

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-32">
      <TunnelScene progress={progress} />
      <div className="pointer-events-none absolute inset-0 bg-cinematic-glow" />

      <div className="relative z-10 w-full max-w-xl text-center">
        {title && <p className="mb-2 text-xs uppercase tracking-[0.3em] text-violet-300">{title}</p>}
        <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Crafting Your Cinematic Story</h1>
        <p className="mt-2 text-zinc-400">{currentLabel} — this usually takes a minute or two.</p>

        {emotionalArc && emotionalArc.length > 0 && (
          <div className="mt-6">
            <EmotionalArcChips arc={emotionalArc} />
          </div>
        )}

        <div className="mt-10 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 font-heading text-sm text-zinc-300">{progress}%</p>

        <ol className="mt-10 space-y-4 text-left">
          {STEPS.map((step, i) => (
            <li
              key={`${step.key}-${i}`}
              className={`glass-panel flex items-center gap-4 px-5 py-4 transition-opacity ${
                isActive(step.key) ? "border-violet-400/50" : ""
              }`}
              style={{ opacity: isDone(step.key) || isActive(step.key) ? 1 : 0.35 }}
            >
              <span
                className={`status-dot ${
                  isDone(step.key)
                    ? "bg-cyan-400 text-cyan-400"
                    : isActive(step.key)
                      ? "bg-violet-400 text-violet-400 animate-pulse"
                      : "bg-zinc-600 text-zinc-600"
                }`}
              />
              <span className="text-sm text-zinc-200">{step.label}</span>
              {isDone(step.key) && (
                <svg className="ml-auto h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </li>
          ))}
        </ol>

        {scenes && scenes.length > 0 && (
          <div className="mt-10">
            <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Scene Thumbnails</p>
            <SceneStoryboard scenes={scenes} aspectRatio={aspectRatio} />
          </div>
        )}

        {!failed && (
          <button
            type="button"
            onClick={cancelGeneration}
            disabled={cancelling}
            className="btn-secondary mt-8 !border-red-500/30 !text-red-300 hover:!text-red-200 disabled:opacity-50"
          >
            {cancelling ? "Cancelling..." : "Cancel Generation"}
          </button>
        )}

        {failed && (
          <>
            <p className="mt-8 text-sm text-red-400">{errorMessage || "Something went wrong while generating your story."}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link href={`/stories/${videoId}/edit`} className="btn-secondary">Edit Title/Prompt</Link>
              <button type="button" onClick={regenerate} disabled={regenerating} className="btn-primary disabled:opacity-50">
                {regenerating ? "Starting..." : "↻ Regenerate"}
              </button>
              <Link href={retryUrl} className="btn-secondary">New Story</Link>
              <button
                type="button"
                onClick={deleteEpisode}
                disabled={deleting}
                className="btn-secondary !border-red-500/30 !text-red-300 hover:!text-red-200 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
