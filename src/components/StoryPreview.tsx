"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { isDevMode } from "@/lib/config";
import SceneStoryboard from "@/components/SceneStoryboard";
import EmotionalArcChips from "@/components/EmotionalArcChips";

export type PreviewScene = { subtitle: string; imageUrl: string | null };

function useMagnetic() {
  useEffect(() => {
    const buttons = document.querySelectorAll<HTMLElement>("[data-magnetic]");
    const handlers: Array<[HTMLElement, (e: MouseEvent) => void, () => void]> = [];

    buttons.forEach((btn) => {
      const onMove = (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.3, ease: "power2.out" });
      };
      const onLeave = () => gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });

      btn.addEventListener("mousemove", onMove);
      btn.addEventListener("mouseleave", onLeave);
      handlers.push([btn, onMove, onLeave]);
    });

    return () => {
      handlers.forEach(([btn, onMove, onLeave]) => {
        btn.removeEventListener("mousemove", onMove);
        btn.removeEventListener("mouseleave", onLeave);
      });
    };
  }, []);
}

export default function StoryPreview({
  videoId,
  videoUrl,
  posterUrl,
  title,
  summary,
  emotionalArc,
  transcript,
  scenes,
  aspectRatio = "9:16",
}: {
  videoId: string;
  videoUrl: string;
  posterUrl: string | null;
  title?: string | null;
  summary?: string | null;
  emotionalArc?: string[];
  transcript?: string | null;
  scenes?: PreviewScene[];
  aspectRatio?: string;
}) {
  const isLandscape = aspectRatio === "16:9";
  useMagnetic();
  const shareUrlRef = useRef<string>("");

  useEffect(() => {
    shareUrlRef.current = window.location.href;
  }, []);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: "My RealCraft AI Story", url: shareUrlRef.current });
    } else {
      navigator.clipboard.writeText(shareUrlRef.current);
    }
  };

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-32">
      <div className="pointer-events-none absolute inset-0 bg-cinematic-glow" />
      <div className="pointer-events-none absolute inset-0 bg-aurora bg-[length:200%_200%] opacity-[0.06] animate-gradient-shift" />

      <div className="relative z-10 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Your Story Is Ready</p>
        <h1 className="cinematic-heading mt-3 font-heading text-3xl font-bold sm:text-4xl">
          {title || "Watch Your Cinematic Story"}
        </h1>
        {summary && <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-400">{summary}</p>}
        {emotionalArc && emotionalArc.length > 0 && (
          <div className="mt-4">
            <EmotionalArcChips arc={emotionalArc} />
          </div>
        )}
      </div>

      <div className="relative z-10 mt-10">
        <div className="pointer-events-none absolute -inset-8 rounded-[2rem] bg-gradient-to-br from-violet-500/30 to-cyan-500/30 blur-3xl" />
        <div
          className={`relative overflow-hidden rounded-3xl border border-white/10 shadow-glow ${
            isLandscape ? "aspect-[16/9] w-[90vw] max-w-2xl" : "aspect-[9/16] w-[320px] sm:w-[360px]"
          }`}
        >
          <video
            className="h-full w-full object-cover"
            src={videoUrl}
            controls
            playsInline
            autoPlay={isDevMode}
            muted={isDevMode}
            loop={isDevMode}
            poster={posterUrl ?? undefined}
          />
        </div>
      </div>

      {transcript && (
        <div className="glass-panel relative z-10 mt-10 w-full max-w-xl p-6">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Transcript</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">{transcript}</p>
        </div>
      )}

      {scenes && scenes.length > 0 && (
        <div className="relative z-10 mt-8 w-full max-w-3xl">
          <p className="mb-3 text-center text-xs uppercase tracking-wide text-zinc-500">Storyboard</p>
          <SceneStoryboard scenes={scenes.map((scene, i) => ({ order: i + 1, ...scene }))} aspectRatio={aspectRatio} />
        </div>
      )}

      <div className="relative z-10 mt-10 flex flex-col items-center gap-4 sm:flex-row">
        <a href={`/api/stories/${videoId}/download`} data-magnetic className="btn-primary">
          ⬇ Download
        </a>
        <button type="button" data-magnetic className="btn-secondary" onClick={handleShare}>
          ↗ Share
        </button>
        <Link href="/stories/create" data-magnetic className="btn-secondary">
          + Create Another Story
        </Link>
      </div>

      <p className="relative z-10 mt-8 max-w-md text-center text-xs text-zinc-500">
        {isLandscape
          ? "Optimized 1920×1080 MP4 — ready for YouTube and widescreen playback."
          : "Optimized 1080×1920 MP4 — ready for TikTok, Instagram Reels, Facebook Reels, and YouTube Shorts."}
      </p>
    </section>
  );
}
