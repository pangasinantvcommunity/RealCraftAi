"use client";

export const STORY_STYLES = [
  { value: "3d-cinematic", label: "3D Cinematic" },
  { value: "anime", label: "Anime" },
  { value: "cartoon", label: "Cartoon" },
  { value: "realistic", label: "Realistic" },
];

export default function StyleSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-zinc-400">Style</label>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STORY_STYLES.map((style) => (
          <button
            key={style.value}
            type="button"
            onClick={() => onChange(style.value)}
            className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
              value === style.value
                ? "border-violet-400/60 bg-violet-500/15 text-white"
                : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
            }`}
          >
            {style.label}
          </button>
        ))}
      </div>
    </div>
  );
}
