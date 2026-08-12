"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fireToast } from "@/components/ToastStack";

export default function EpisodeEditForm({
  videoId,
  initialTitle,
  initialPrompt,
}: {
  videoId: string;
  initialTitle: string;
  initialPrompt: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const submit = async () => {
    if (!title.trim() || !prompt.trim() || submitting) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/stories/${videoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, prompt }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not save changes.");
      }

      router.push(`/stories/${videoId}`);
      router.refresh();
    } catch (error) {
      setSubmitting(false);
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setErrorMessage(message);
      fireToast({ type: "error", message });
    }
  };

  return (
    <div className="glass-panel p-8 sm:p-10">
      <div>
        <label className="text-xs uppercase tracking-wide text-zinc-400">Episode Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-400/60"
        />
      </div>

      <div className="mt-6">
        <label className="text-xs uppercase tracking-wide text-zinc-400">Story Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, 10000))}
          rows={10}
          className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm leading-relaxed text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-400/60"
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          Editing the prompt only updates the saved text — it doesn&apos;t regenerate already-created scenes.
        </p>
      </div>

      {errorMessage && <p className="mt-4 text-center text-sm text-red-400">{errorMessage}</p>}

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!title.trim() || !prompt.trim() || submitting}
          className="btn-primary flex-1"
        >
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
