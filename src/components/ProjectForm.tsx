"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StyleSelector, { STORY_STYLES } from "@/components/StyleSelector";
import AspectRatioSelector, { ASPECT_RATIOS } from "@/components/AspectRatioSelector";
import RuntimeStructureFields from "@/components/project/RuntimeStructureFields";
import { fireToast } from "@/components/ToastStack";
import type { RuntimeStructure } from "@/types/project";

export type ProjectFormInitial = {
  title: string;
  synopsis: string;
  storyBible: string;
  visualStyle: string;
  aspectRatio: string;
  runtimeStructure: RuntimeStructure;
};

export default function ProjectForm({
  mode,
  projectId,
  initial,
}: {
  mode: "create" | "edit";
  projectId?: string;
  initial?: ProjectFormInitial;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [synopsis, setSynopsis] = useState(initial?.synopsis ?? "");
  const [storyBible, setStoryBible] = useState(initial?.storyBible ?? "");
  const [visualStyle, setVisualStyle] = useState(initial?.visualStyle ?? STORY_STYLES[0].value);
  const [aspectRatio, setAspectRatio] = useState(initial?.aspectRatio ?? ASPECT_RATIOS[0].value);
  const [runtimeStructure, setRuntimeStructure] = useState<RuntimeStructure>(initial?.runtimeStructure ?? {});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const submit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      const url = mode === "create" ? "/api/projects" : `/api/projects/${projectId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, synopsis, storyBible, visualStyle, aspectRatio, runtimeStructure }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not save this project.");
      }

      const { id } = await response.json();
      router.push(`/projects/${id ?? projectId}`);
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
        <label className="text-xs uppercase tracking-wide text-zinc-400">Project Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 120))}
          placeholder="e.g. The Janitor Chairman"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-400/60"
        />
      </div>

      <div className="mt-6">
        <label className="text-xs uppercase tracking-wide text-zinc-400">Synopsis (optional)</label>
        <textarea
          value={synopsis}
          onChange={(e) => setSynopsis(e.target.value.slice(0, 500))}
          rows={2}
          placeholder="A one-line pitch for the series..."
          className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm leading-relaxed text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-400/60"
        />
      </div>

      <div className="mt-6">
        <label className="text-xs uppercase tracking-wide text-zinc-400">Story Bible (optional)</label>
        <textarea
          value={storyBible}
          onChange={(e) => setStoryBible(e.target.value.slice(0, 10000))}
          rows={6}
          placeholder="Ongoing plot, world rules, running continuity — every episode you generate will be given this as context..."
          className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm leading-relaxed text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-400/60"
        />
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <StyleSelector value={visualStyle} onChange={setVisualStyle} />
        <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
      </div>

      <div className="mt-6">
        <label className="text-xs uppercase tracking-wide text-zinc-400">Runtime Structure (optional)</label>
        <p className="mt-1 text-xs text-zinc-500">
          Drives how many parts/scenes each generated episode gets. Leave blank to keep the default 6-scene episode.
        </p>
        <div className="mt-3">
          <RuntimeStructureFields value={runtimeStructure} onChange={setRuntimeStructure} />
        </div>
      </div>

      {errorMessage && <p className="mt-4 text-center text-sm text-red-400">{errorMessage}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!title.trim() || submitting}
        className="btn-primary mt-8 w-full"
      >
        {submitting ? "Saving..." : mode === "create" ? "Create Project" : "Save Changes"}
      </button>
    </div>
  );
}
