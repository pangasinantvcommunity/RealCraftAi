"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fireToast } from "@/components/ToastStack";
import { storyConfig } from "@/lib/config";
import type { ProjectLocation } from "@/types/project";

const EMPTY_DRAFT = { name: "", description: "", mood: "" };

export default function LocationWizard({
  projectId,
  locations,
  onAdded,
  onRemoved,
}: {
  projectId: string;
  locations: ProjectLocation[];
  onAdded?: (location: ProjectLocation) => void;
  onRemoved?: (locationId: string) => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const atCap = locations.length >= storyConfig.maxProjectLocations;

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

  const submit = async () => {
    if (!draft.name.trim() || !draft.description.trim() || submitting) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, imageUrl }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not add location.");
      }

      const created = await response.json();
      setDraft(EMPTY_DRAFT);
      setImageUrl(null);
      setFormOpen(false);
      onAdded?.(created);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not add location.";
      fireToast({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (locationId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/locations/${locationId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not remove location.");
      onRemoved?.(locationId);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not remove location.";
      fireToast({ type: "error", message });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-white">Recurring Locations</h2>
        {!atCap && (
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="text-xs font-semibold text-violet-300 transition-colors hover:text-violet-200"
          >
            {formOpen ? "Cancel" : "+ Add Location"}
          </button>
        )}
      </div>

      {locations.length === 0 && !formOpen && (
        <p className="mt-3 text-sm text-zinc-500">No locations yet. Add recurring settings to keep every episode consistent.</p>
      )}

      {locations.length > 0 && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((l) => (
            <div key={l.id} className="glass-panel flex gap-3 p-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {l.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.imageUrl} alt={l.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg">🏙️</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-white">{l.name}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/projects/${projectId}/locations/${l.id}/edit`}
                      className="text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(l.id)}
                      className="text-zinc-500 transition-colors hover:text-red-400"
                      aria-label={`Remove ${l.name}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
                {l.mood && <p className="text-xs text-cyan-300">{l.mood}</p>}
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{l.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="glass-panel mt-4 p-5">
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
                placeholder="Location name (e.g. Rooftop Garden)"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-400/60"
              />
              <input
                type="text"
                value={draft.mood}
                onChange={(e) => setDraft((d) => ({ ...d, mood: e.target.value.slice(0, 60) }))}
                placeholder="Mood (optional, e.g. golden hour, quiet)"
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

          <button
            type="button"
            onClick={submit}
            disabled={!draft.name.trim() || !draft.description.trim() || submitting}
            className="btn-primary mt-4 w-full !py-2.5 text-sm"
          >
            {submitting ? "Saving..." : "Save Location"}
          </button>
        </div>
      )}
    </div>
  );
}
