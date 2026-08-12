"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PromptEditor from "@/components/PromptEditor";
import StyleSelector, { STORY_STYLES } from "@/components/StyleSelector";
import DurationSelector, { STORY_DURATIONS } from "@/components/DurationSelector";
import StorySummaryCard from "@/components/StorySummaryCard";
import { fireToast } from "@/components/ToastStack";

const SUGGESTION_CHIPS = [
  "The Janitor Chairman",
  "A magical forest adventure",
  "A futuristic city at night",
  "A brave child and a dragon",
  "A hidden island in the clouds",
];

const LONG_SCRIPT_THRESHOLD = 1500;

export default function PromptStoryForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<string>(STORY_STYLES[0].value);
  const [duration, setDuration] = useState<number>(STORY_DURATIONS[1]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isLongScript = prompt.trim().length > LONG_SCRIPT_THRESHOLD;

  const submit = async () => {
    if (!prompt.trim() || submitting) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, duration }),
      });

      if (response.status === 429) {
        router.push("/dashboard?limitReached=1");
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Story generation failed to start.");
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
      <PromptEditor value={prompt} onChange={setPrompt} onSubmit={submit} />

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setPrompt(chip)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-violet-400/50 hover:text-white"
          >
            {chip}
          </button>
        ))}
      </div>

      {isLongScript && <StorySummaryCard prompt={prompt} style={style} duration={duration} />}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <StyleSelector value={style} onChange={setStyle} />
        <DurationSelector value={duration} onChange={setDuration} />
      </div>

      {errorMessage && <p className="mt-4 text-center text-sm text-red-400">{errorMessage}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!prompt.trim() || submitting}
        className="btn-primary mt-8 w-full"
      >
        {submitting ? "Generating..." : "Generate Cinematic Story"}
      </button>
    </div>
  );
}
