"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StyleSelector, { STORY_STYLES } from "@/components/StyleSelector";
import AspectRatioSelector, { ASPECT_RATIOS } from "@/components/AspectRatioSelector";
import RuntimeStructureFields from "@/components/project/RuntimeStructureFields";
import CharacterSheetWizard from "@/components/project/CharacterSheetWizard";
import LocationWizard from "@/components/project/LocationWizard";
import { fireToast } from "@/components/ToastStack";
import type { ProjectCharacter, ProjectLocation, RuntimeStructure } from "@/types/project";

const STEPS = ["Title", "Description", "Runtime", "Characters", "Locations", "Story Bible"];

export default function ProjectWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [visualStyle, setVisualStyle] = useState<string>(STORY_STYLES[0].value);
  const [aspectRatio, setAspectRatio] = useState<string>(ASPECT_RATIOS[0].value);
  const [runtimeStructure, setRuntimeStructure] = useState<RuntimeStructure>({});
  const [characters, setCharacters] = useState<ProjectCharacter[]>([]);
  const [locations, setLocations] = useState<ProjectLocation[]>([]);
  const [storyBible, setStoryBible] = useState("");

  const patch = async (body: Record<string, unknown>) => {
    if (!projectId) return;
    const response = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || "Could not save this step.");
    }
  };

  const next = async (afterSave: () => Promise<void>) => {
    setSaving(true);
    try {
      await afterSave();
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      fireToast({ type: "error", message });
    } finally {
      setSaving(false);
    }
  };

  const createProject = async () => {
    if (!title.trim()) return;
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, visualStyle, aspectRatio }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Could not create project.");
    }
    const { id } = await response.json();
    setProjectId(id);
  };

  const finish = async () => {
    setSaving(true);
    try {
      await patch({ storyBible });
      if (projectId) router.push(`/projects/${projectId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      fireToast({ type: "error", message });
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel p-8 sm:p-10">
      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              i === step
                ? "border-violet-400/60 bg-violet-500/15 text-white"
                : i < step
                  ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-300"
                  : "border-white/10 bg-white/5 text-zinc-500"
            }`}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {step === 0 && (
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-400">Project Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 120))}
            placeholder="e.g. THE JANITOR CHAIRMAN — FINAL CINEMATIC PROMPT (540 SECONDS)"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-400/60"
          />
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <StyleSelector value={visualStyle} onChange={setVisualStyle} />
            <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-400">Cinematic Description</label>
          <textarea
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value.slice(0, 500))}
            rows={8}
            placeholder="Describe the series — tone, premise, world..."
            className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm leading-relaxed text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-400/60"
          />
        </div>
      )}

      {step === 2 && (
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-400">Runtime Structure (optional)</label>
          <p className="mt-1 mb-4 text-xs text-zinc-500">
            Drives how many parts/scenes each generated episode gets. Leave blank to keep the default 6-scene episode.
          </p>
          <RuntimeStructureFields value={runtimeStructure} onChange={setRuntimeStructure} />
        </div>
      )}

      {step === 3 && projectId && (
        <CharacterSheetWizard
          projectId={projectId}
          characters={characters}
          onAdded={(c) => setCharacters((prev) => [...prev, c])}
          onRemoved={(id) => setCharacters((prev) => prev.filter((c) => c.id !== id))}
        />
      )}

      {step === 4 && projectId && (
        <LocationWizard
          projectId={projectId}
          locations={locations}
          onAdded={(l) => setLocations((prev) => [...prev, l])}
          onRemoved={(id) => setLocations((prev) => prev.filter((l) => l.id !== id))}
        />
      )}

      {step === 5 && (
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-400">Story Summary / Story Bible</label>
          <textarea
            value={storyBible}
            onChange={(e) => setStoryBible(e.target.value.slice(0, 10000))}
            rows={8}
            placeholder="Ongoing plot, world rules, running continuity — every episode you generate will be given this as context..."
            className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm leading-relaxed text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-400/60"
          />
        </div>
      )}

      <div className="mt-8 flex justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          disabled={step === 0 || saving}
          className="btn-secondary disabled:opacity-40"
        >
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() =>
              next(async () => {
                if (step === 0) {
                  if (!projectId) await createProject();
                } else if (step === 1) {
                  await patch({ synopsis });
                } else if (step === 2) {
                  await patch({ runtimeStructure });
                }
                // Steps 3 (Characters) and 4 (Locations) persist immediately per-item — nothing to save on "Continue".
              })
            }
            disabled={(step === 0 && !title.trim()) || saving}
            className="btn-primary disabled:opacity-40"
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        ) : (
          <button type="button" onClick={finish} disabled={saving} className="btn-primary disabled:opacity-40">
            {saving ? "Saving..." : "Finish"}
          </button>
        )}
      </div>
    </div>
  );
}
