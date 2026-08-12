"use client";

export const ASPECT_RATIOS = [
  { value: "9:16", label: "9:16 Vertical" },
  { value: "16:9", label: "16:9 Horizontal" },
] as const;

export default function AspectRatioSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-zinc-400">Aspect Ratio</label>
      <div className="mt-2 flex gap-2">
        {ASPECT_RATIOS.map((ratio) => (
          <button
            key={ratio.value}
            type="button"
            onClick={() => onChange(ratio.value)}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
              value === ratio.value
                ? "border-cyan-400/60 bg-cyan-500/15 text-white"
                : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
            }`}
          >
            {ratio.label}
          </button>
        ))}
      </div>
    </div>
  );
}
