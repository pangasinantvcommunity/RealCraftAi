"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fireToast } from "@/components/ToastStack";
import { storyConfig } from "@/lib/config";
import type { ProjectCharacter } from "@/types/project";

const EMPTY_DRAFT = {
  name: "",
  age: "",
  gender: "",
  appearance: "",
  wardrobe: "",
  personality: "",
  role: "",
  relationships: "",
  voiceTone: "",
  cinematicNotes: "",
};

export default function CharacterSheetWizard({
  projectId,
  characters,
  onAdded,
  onRemoved,
}: {
  projectId: string;
  characters: ProjectCharacter[];
  /** Fires with the newly-created row in addition to router.refresh() — lets a
   *  client-only parent (the creation wizard, which has no server-fetched
   *  `characters` prop to refresh) keep its own local list in sync. */
  onAdded?: (character: ProjectCharacter) => void;
  onRemoved?: (characterId: string) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const atCap = characters.length >= storyConfig.maxProjectCharacters;

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/characters/upload", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Photo upload failed.");
      }
      const { url } = await response.json();
      setImageUrl(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Photo upload failed.";
      fireToast({ type: "error", message });
    } finally {
      setUploading(false);
    }
  };

  const autoGenerate = async () => {
    if (!draft.name.trim() || generating) return;
    setGenerating(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/characters/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.name, role: draft.role }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not generate character sheet.");
      }

      const generated = await response.json();
      setDraft((d) => ({
        ...d,
        age: generated.age ?? d.age,
        gender: generated.gender ?? d.gender,
        appearance: generated.appearance ?? d.appearance,
        wardrobe: generated.wardrobe ?? d.wardrobe,
        personality: generated.personality ?? d.personality,
        voiceTone: generated.voiceTone ?? d.voiceTone,
        cinematicNotes: generated.cinematicNotes ?? d.cinematicNotes,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate character sheet.";
      fireToast({ type: "error", message });
    } finally {
      setGenerating(false);
    }
  };

  const submit = async () => {
    if (!draft.name.trim() || !draft.appearance.trim() || submitting) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, imageUrl }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not add character.");
      }

      const created = await response.json();
      setDraft(EMPTY_DRAFT);
      setImageUrl(null);
      setFormOpen(false);
      onAdded?.(created);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not add character.";
      fireToast({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (characterId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/characters/${characterId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not remove character.");
      onRemoved?.(characterId);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not remove character.";
      fireToast({ type: "error", message });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-white">Character Sheets</h2>
        {!atCap && (
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="text-xs font-semibold text-violet-300 transition-colors hover:text-violet-200"
          >
            {formOpen ? "Cancel" : "+ Add Character"}
          </button>
        )}
      </div>

      {characters.length === 0 && !formOpen && (
        <p className="mt-3 text-sm text-zinc-500">
          No characters yet. Every episode you generate will reuse whoever you add here (up to {storyConfig.maxProjectCharacters}).
        </p>
      )}

      {characters.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((c) => (
            <div key={c.id} className="glass-panel flex gap-3 p-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg">🎭</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/projects/${projectId}/characters/${c.id}/edit`}
                      className="text-xs font-semibold text-violet-300 transition-colors hover:text-violet-200"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className="text-zinc-500 transition-colors hover:text-red-400"
                      aria-label={`Remove ${c.name}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
                {c.role && <p className="text-xs text-violet-300">{c.role}</p>}
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{c.appearance}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="glass-panel mt-4 p-5">
          <div className="flex gap-4">
            <label className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 text-center text-[10px] text-zinc-500 hover:border-violet-400/50">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Character reference" className="h-full w-full object-cover" />
              ) : uploading ? (
                <span>Uploading…</span>
              ) : (
                <span>+ Photo</span>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
            </label>

            <div className="grid flex-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value.slice(0, 60) }))}
                placeholder="Name"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/60 sm:col-span-2"
              />
              <input
                type="text"
                value={draft.role}
                onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value.slice(0, 60) }))}
                placeholder="Role (e.g. protagonist)"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/60 sm:col-span-2"
              />
              <button
                type="button"
                onClick={autoGenerate}
                disabled={!draft.name.trim() || generating}
                className="rounded-lg border border-violet-400/40 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 transition-colors hover:bg-violet-500/20 disabled:opacity-40 sm:col-span-2"
              >
                {generating ? "Generating…" : "✨ Auto Generate rest of sheet"}
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={draft.age}
              onChange={(e) => setDraft((d) => ({ ...d, age: e.target.value.slice(0, 20) }))}
              placeholder="Age"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/60"
            />
            <input
              type="text"
              value={draft.gender}
              onChange={(e) => setDraft((d) => ({ ...d, gender: e.target.value.slice(0, 20) }))}
              placeholder="Gender"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/60"
            />
          </div>

          <textarea
            value={draft.appearance}
            onChange={(e) => setDraft((d) => ({ ...d, appearance: e.target.value.slice(0, 500) }))}
            placeholder="Appearance (required) — e.g. humble Filipino janitor, 40 years old, graying hair, worn blue uniform"
            rows={2}
            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/60"
          />
          <textarea
            value={draft.wardrobe}
            onChange={(e) => setDraft((d) => ({ ...d, wardrobe: e.target.value.slice(0, 300) }))}
            placeholder="Wardrobe (optional)"
            rows={1}
            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/60"
          />
          <textarea
            value={draft.personality}
            onChange={(e) => setDraft((d) => ({ ...d, personality: e.target.value.slice(0, 300) }))}
            placeholder="Personality (optional)"
            rows={1}
            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/60"
          />
          <textarea
            value={draft.voiceTone}
            onChange={(e) => setDraft((d) => ({ ...d, voiceTone: e.target.value.slice(0, 200) }))}
            placeholder="Voice tone (optional)"
            rows={1}
            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/60"
          />
          <textarea
            value={draft.relationships}
            onChange={(e) => setDraft((d) => ({ ...d, relationships: e.target.value.slice(0, 300) }))}
            placeholder="Relationships to other characters (optional)"
            rows={1}
            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/60"
          />
          <textarea
            value={draft.cinematicNotes}
            onChange={(e) => setDraft((d) => ({ ...d, cinematicNotes: e.target.value.slice(0, 300) }))}
            placeholder="Cinematic notes (optional — camera/lighting preferences for this character)"
            rows={1}
            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/60"
          />

          <button
            type="button"
            onClick={submit}
            disabled={!draft.name.trim() || !draft.appearance.trim() || submitting}
            className="btn-primary mt-4 w-full !py-2.5 text-sm"
          >
            {submitting ? "Saving..." : "Save Character"}
          </button>
        </div>
      )}
    </div>
  );
}
