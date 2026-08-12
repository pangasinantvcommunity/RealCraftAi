"use client";

export const STORY_DURATIONS = [30, 45, 60];

export default function DurationSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-zinc-400">Duration</label>
      <div className="mt-2 flex gap-2">
        {STORY_DURATIONS.map((duration) => (
          <button
            key={duration}
            type="button"
            onClick={() => onChange(duration)}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors ${
              value === duration
                ? "border-cyan-400/60 bg-cyan-500/15 text-white"
                : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
            }`}
          >
            {duration} sec
          </button>
        ))}
      </div>
    </div>
  );
}
