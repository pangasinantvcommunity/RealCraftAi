"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PromptEditor from "@/components/PromptEditor";
import DurationSelector, { STORY_DURATIONS } from "@/components/DurationSelector";
import { STORY_STYLES } from "@/components/StyleSelector";
import { ASPECT_RATIOS } from "@/components/AspectRatioSelector";
import { fireToast } from "@/components/ToastStack";

export default function EpisodePromptForm({
  projectId,
  visualStyle,
  aspectRatio,
  characterCount,
  locationCount,
  sceneCount,
}: {
  projectId: string;
  visualStyle: string;
  aspectRatio: string;
  characterCount: number;
  locationCount: number;
  sceneCount: number;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<number>(STORY_DURATIONS[1]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const styleLabel = STORY_STYLES.find((s) => s.value === visualStyle)?.label ?? visualStyle;
  const aspectLabel = ASPECT_RATIOS.find((a) => a.value === aspectRatio)?.label ?? aspectRatio;

  const submit = async () => {
    if (!prompt.trim() || submitting) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, duration, projectId, title: title.trim() || undefined }),
      });

      if (response.status === 429) {
        router.push("/dashboard?limitReached=1");
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Episode generation failed to start.");
      }

      const { id } = await response.json();
      router.push(`/stories/${id}`);
    } catch (error) {
      setSubmitting(false);
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setErrorMessage(message);
      fireToast({ type: "error", message });
    }
  };

  return (
    <div className="glass-panel p-8 sm:p-10">
      <div className="mb-6 flex flex-wrap gap-2">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300">{styleLabel}</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300">{aspectLabel}</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300">
          {characterCount} {characterCount === 1 ? "character" : "characters"}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300">
          {locationCount} {locationCount === 1 ? "location" : "locations"}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300">
          {sceneCount} scenes
        </span>
      </div>

      <div className="mb-4">
        <label className="text-xs uppercase tracking-wide text-zinc-400">Episode Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          placeholder="Leave blank to auto-title from the prompt"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-400/60"
        />
      </div>

      <PromptEditor value={prompt} onChange={setPrompt} onSubmit={submit} />

      <div className="mt-6">
        <DurationSelector value={duration} onChange={setDuration} />
      </div>

      {errorMessage && <p className="mt-4 text-center text-sm text-red-400">{errorMessage}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!prompt.trim() || submitting}
        className="btn-primary mt-8 w-full"
      >
        {submitting ? "Generating..." : "Generate Episode"}
      </button>
    </div>
  );
}
