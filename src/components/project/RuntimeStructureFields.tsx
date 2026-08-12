"use client";

import type { RuntimeStructure } from "@/types/project";

const FIELDS: { key: keyof RuntimeStructure; label: string; placeholder: string }[] = [
  { key: "totalRuntimeSeconds", label: "Total Runtime (seconds)", placeholder: "540" },
  { key: "episodes", label: "Episodes", placeholder: "6" },
  { key: "runtimePerEpisodeSeconds", label: "Runtime Per Episode (seconds)", placeholder: "90" },
  { key: "partsPerEpisode", label: "Parts Per Episode", placeholder: "3" },
  { key: "runtimePerPartSeconds", label: "Runtime Per Part (seconds)", placeholder: "30" },
  { key: "scenesPerPart", label: "Scenes Per Part", placeholder: "3" },
  { key: "averageSceneDurationSeconds", label: "Average Scene Duration (seconds)", placeholder: "10" },
];

export default function RuntimeStructureFields({
  value,
  onChange,
}: {
  value: RuntimeStructure;
  onChange: (next: RuntimeStructure) => void;
}) {
  const setField = (key: keyof RuntimeStructure, raw: string) => {
    const num = raw === "" ? undefined : Number(raw);
    onChange({ ...value, [key]: num !== undefined && Number.isFinite(num) ? num : undefined });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {FIELDS.map((field) => (
        <div key={field.key}>
          <label className="text-xs uppercase tracking-wide text-zinc-400">{field.label}</label>
          <input
            type="number"
            min={0}
            value={value[field.key] ?? ""}
            onChange={(e) => setField(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-400/60"
          />
        </div>
      ))}
    </div>
  );
}
