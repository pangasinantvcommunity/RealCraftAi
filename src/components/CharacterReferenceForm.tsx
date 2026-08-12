"use client";

import { fireToast } from "@/components/ToastStack";
import { storyConfig } from "@/lib/config";

export type CharacterDraft = {
  localId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  uploading: boolean;
};

export function createCharacterDraft(): CharacterDraft {
  return { localId: crypto.randomUUID(), name: "", description: "", imageUrl: null, uploading: false };
}

export default function CharacterReferenceForm({
  characters,
  onChange,
}: {
  characters: CharacterDraft[];
  onChange: (characters: CharacterDraft[]) => void;
}) {
  const updateCharacter = (localId: string, patch: Partial<CharacterDraft>) => {
    onChange(characters.map((c) => (c.localId === localId ? { ...c, ...patch } : c)));
  };

  const addCharacter = () => {
    if (characters.length >= storyConfig.maxCharacters) return;
    onChange([...characters, createCharacterDraft()]);
  };

  const removeCharacter = (localId: string) => {
    onChange(characters.filter((c) => c.localId !== localId));
  };

  const handleFileChange = async (localId: string, file: File | undefined) => {
    if (!file) return;
    updateCharacter(localId, { uploading: true });

    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/characters/upload", { method: "POST", body: formData });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Photo upload failed.");
      }

      const { url } = await response.json();
      updateCharacter(localId, { imageUrl: url, uploading: false });
    } catch (error) {
      updateCharacter(localId, { uploading: false });
      const message = error instanceof Error ? error.message : "Photo upload failed.";
      fireToast({ type: "error", message });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs uppercase tracking-wide text-zinc-400">Characters (optional)</label>
        {characters.length < storyConfig.maxCharacters && (
          <button
            type="button"
            onClick={addCharacter}
            className="text-xs font-semibold text-violet-300 transition-colors hover:text-violet-200"
          >
            + Add Character
          </button>
        )}
      </div>

      {characters.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500">
          Upload a photo for each recurring character to keep their appearance consistent across every scene.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {characters.map((character) => (
            <div key={character.localId} className="glass-panel flex gap-3 p-3">
              <label className="relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 text-center text-[10px] text-zinc-500 transition-colors hover:border-violet-400/50">
                {character.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={character.imageUrl}
                    alt={character.name || "Character reference"}
                    className="h-full w-full object-cover"
                  />
                ) : character.uploading ? (
                  <span>Uploading…</span>
                ) : (
                  <span>+ Photo</span>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={(e) => handleFileChange(character.localId, e.target.files?.[0])}
                />
              </label>

              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={character.name}
                  onChange={(e) => updateCharacter(character.localId, { name: e.target.value })}
                  placeholder="Character name (e.g. Ramon)"
                  maxLength={60}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-400/60"
                />
                <input
                  type="text"
                  value={character.description}
                  onChange={(e) => updateCharacter(character.localId, { description: e.target.value })}
                  placeholder="Short description (e.g. humble Filipino janitor, 40 years old)"
                  maxLength={200}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-400/60"
                />
              </div>

              <button
                type="button"
                onClick={() => removeCharacter(character.localId)}
                className="self-start px-1 text-lg leading-none text-zinc-500 transition-colors hover:text-red-400"
                aria-label="Remove character"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
