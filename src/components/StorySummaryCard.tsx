"use client";

import { useMemo } from "react";
import { generateMockStory } from "@/lib/mock-story";

/**
 * Free, local "Cinematic Script Detected" preview shown while typing a long
 * prompt — runs the deterministic heuristic generator client-side (no
 * OpenAI call, in dev mode or not) purely to reassure the user their long
 * script was recognized. The real generation (Step 4 pipeline) runs
 * server-side after submit and may differ from this preview.
 */
export default function StorySummaryCard({
  prompt,
  style,
  duration,
}: {
  prompt: string;
  style: string;
  duration: number;
}) {
  const preview = useMemo(() => generateMockStory(prompt, style, duration), [prompt, style, duration]);

  return (
    <div className="glass-panel mt-4 p-5">
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
        <span className="status-dot bg-cyan-400 text-cyan-400" />
        Cinematic Script Detected
      </div>

      <p className="font-heading text-lg font-semibold text-white">{preview.title}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Main Characters</p>
          <p className="mt-1 text-sm text-zinc-300">{preview.characters.join(", ")}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Locations</p>
          <p className="mt-1 text-sm text-zinc-300">{preview.locations.join(", ")}</p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Emotional Arc</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {preview.emotionalArc.map((beat) => (
            <span key={beat} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
              {beat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
