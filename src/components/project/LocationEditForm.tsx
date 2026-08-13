"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fireToast } from "@/components/ToastStack";
import type { ProjectLocation } from "@/types/project";

export default function LocationEditForm({
  projectId,
  location,
}: {
  projectId: string;
  location: ProjectLocation;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState({
    name: location.name,
    description: location.description,
    mood: location.mood ?? "",
  });
  const [imageUrl, setImageUrl] = useState<string | null>(location.imageUrl);
  const [uploading, setUploading] = useState(false);
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

  const save = async () => {
    if (!draft.name.trim() || !draft.description.trim() || submitting) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/locations/${location.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, imageUrl }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not save location.");
      }

      fireToast({ type: "info", message: "Location updated." });
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (error) {
      setSubmitting(false);
      const message = error instanceof Error ? error.message : "Could not save location.";
      fireToast({ type: "error", message });
    }
  };

  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/locations/${location.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not remove location.");
      fireToast({ type: "info", message: "Location removed." });
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (error) {
      setDeleting(false);
      const message = error instanceof Error ? error.message : "Could not remove location.";
      fireToast({ type: "error", message });
    }
  };

  return (
    <div className="glass-panel p-6 sm:p-8">
      <div className="flex gap-4">
        <label className="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 text-center text-[10px] text-zinc-500 hover:border-cyan-400/50">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Location reference" className="h-full w-full object-cover" />
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

        <div className="grid flex-1 gap-2">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value.slice(0, 60) }))}
            placeholder="Location name"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-400/60"
          />
          <input
            type="text"
            value={draft.mood}
            onChange={(e) => setDraft((d) => ({ ...d, mood: e.target.value.slice(0, 60) }))}
            placeholder="Mood (optional)"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-400/60"
          />
        </div>
      </div>

      <textarea
        value={draft.description}
        onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value.slice(0, 500) }))}
        placeholder="Description (required)"
        rows={2}
        className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-400/60"
      />

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={remove}
          disabled={deleting || submitting}
          className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete Location"}
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
          disabled={!draft.name.trim() || !draft.description.trim() || submitting || deleting}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
