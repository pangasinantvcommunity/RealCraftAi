"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TunnelScene from "@/components/TunnelScene";
import { fireToast } from "@/components/ToastStack";

const STEPS = [
  { key: "pending", label: "Uploading" },
  { key: "transcribing", label: "Transcribing" },
  { key: "creating_scenes", label: "Creating scenes" },
  { key: "generating_images", label: "Generating images" },
  { key: "rendering", label: "Rendering film" },
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
}: {
  videoId: string;
  initialStatus: string;
  initialProgress: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(initialProgress);
  const [failed, setFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const poll = async () => {
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
    };

    poll();
    intervalRef.current = setInterval(poll, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [videoId, router]);

  const stepIndex = (key: string) => STEPS.findIndex((s) => s.key === key);
  const isDone = (key: string) => stepIndex(key) < stepIndex(status);
  const isActive = (key: string) => key === status;

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-32">
      <TunnelScene progress={progress} />
      <div className="pointer-events-none absolute inset-0 bg-cinematic-glow" />

      <div className="relative z-10 w-full max-w-xl text-center">
        <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Crafting Your Cinematic Story</h1>
        <p className="mt-2 text-zinc-400">Sit back — this usually takes a minute or two.</p>

        <div className="mt-10 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 font-heading text-sm text-zinc-300">{progress}%</p>

        <ol className="mt-10 space-y-4 text-left">
          {STEPS.map((step) => (
            <li
              key={step.key}
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

        {failed && (
          <>
            <p className="mt-8 text-sm text-red-400">{errorMessage || "Something went wrong while generating your story."}</p>
            <Link href="/stories/create" className="btn-secondary mt-4 inline-flex">Try Again</Link>
          </>
        )}
      </div>
    </section>
  );
}
