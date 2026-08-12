"use client";

import { useState } from "react";
import PromptStoryForm from "@/components/PromptStoryForm";
import AudioRecorder from "@/components/AudioRecorder";
import UploadAudioForm from "@/components/UploadAudioForm";

type Tab = "prompt" | "voice" | "upload";

const TABS: { key: Tab; label: string }[] = [
  { key: "prompt", label: "Prompt" },
  { key: "voice", label: "Voice" },
  { key: "upload", label: "Upload" },
];

export default function CreateStoryTabs() {
  const [tab, setTab] = useState<Tab>("prompt");

  return (
    <div>
      <div className="mb-6 flex justify-center">
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                tab === t.key ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-glow" : "text-zinc-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "prompt" && <PromptStoryForm />}
      {tab === "voice" && <AudioRecorder />}
      {tab === "upload" && <UploadAudioForm />}
    </div>
  );
}
