"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fireToast } from "@/components/ToastStack";
import type { ProjectCharacter } from "@/types/project";

export default function CharacterEditForm({
  projectId,
  character,
}: {
  projectId: string;
  character: ProjectCharacter;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState({
    name: character.name,
    age: character.age ?? "",
    gender: character.gender ?? "",
    appearance: character.appearance,
    wardrobe: character.wardrobe ?? "",
    personality: character.personality ?? "",
    role: character.role ?? "",
    relationships: character.relationships ?? "",
    voiceTone: character.voiceTone ?? "",
    cinematicNotes: character.cinematicNotes ?? "",
  });
  const [imageUrl, setImageUrl] = useState<string | null>(character.imageUrl);
  const [uploading, setUploading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const generateImage = async () => {
    if (!draft.name.trim() || generatingImage) return;
    setGeneratingImage(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/characters/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.name, appearance: draft.appearance }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not generate an image.");
      }
      const { url } = await response.json();
      setImageUrl(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not generate an image.";
      fireToast({ type: "error", message });
    } finally {
      setGeneratingImage(false);
    }
  };

  const save = async () => {
    if (!draft.name.trim() || !draft.appearance.trim() || submitting) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/characters/${character.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, imageUrl }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not save character.");
      }

      fireToast({ type: "info", message: "Character updated." });
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (error) {
      setSubmitting(false);
      const message = error instanceof Error ? error.message : "Could not save character.";
      fireToast({ type: "error", message });
    }
  };

  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/characters/${character.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not remove character.");
      fireToast({ type: "info", message: "Character removed." });
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (error) {
      setDeleting(false);
      const message = error instanceof Error ? error.message : "Could not remove character.";
      fireToast({ type: "error", message });
    }
  };

  return (
    <div className="glass-panel p-6 sm:p-8">
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
        <button
          type="button"
          onClick={generateImage}
          disabled={!draft.name.trim() || generatingImage}
          className="shrink-0 self-start rounded-lg border border-violet-400/40 bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-300 transition-colors hover:bg-violet-500/20 disabled:opacity-40"
        >
          {generatingImage ? "Generating…" : "✨ Generate"}
        </button>

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
        placeholder="Appearance (required)"
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
        placeholder="Cinematic notes (optional)"
        rows={1}
        className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/60"
      />

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={remove}
          disabled={deleting || submitting}
          className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete Character"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/projects/${projectId}`)}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!draft.name.trim() || !draft.appearance.trim() || submitting || deleting}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
