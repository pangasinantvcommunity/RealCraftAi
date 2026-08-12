"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fireToast } from "@/components/ToastStack";

export default function UploadAudioForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const setValidatedFile = (candidate: File) => {
    if (!candidate.type.startsWith("audio/")) {
      setErrorMessage("Please choose a valid audio file.");
      return;
    }
    if (candidate.size > 25 * 1024 * 1024) {
      setErrorMessage("Audio files must be smaller than 25MB.");
      return;
    }
    setFile(candidate);
    setErrorMessage("");
  };

  const submit = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setErrorMessage("");

    const formData = new FormData();
    formData.append("audio", file, file.name);

    try {
      const response = await fetch("/api/stories", { method: "POST", body: formData });

      if (response.status === 429) {
        router.push("/dashboard?limitReached=1");
        return;
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Upload failed");
      }

      const { id } = await response.json();
      router.push(`/stories/${id}`);
    } catch {
      setUploading(false);
      const message = "Upload failed. Please check your connection and try again.";
      setErrorMessage(message);
      fireToast({ type: "error", message });
    }
  };

  return (
    <div className="glass-panel p-8 sm:p-10">
      <div
        className={`rounded-2xl border-2 border-dashed border-white/15 p-10 text-center transition-colors ${
          dragging ? "border-violet-400/70 bg-violet-500/5" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files[0];
          if (dropped) setValidatedFile(dropped);
        }}
      >
        <p className="text-3xl">📁</p>
        <p className="mt-3 text-sm text-zinc-400">Drag &amp; drop an audio file here, or</p>
        <label className="mt-3 inline-block cursor-pointer text-sm font-semibold text-violet-300 hover:text-white">
          browse files
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) setValidatedFile(selected);
            }}
          />
        </label>
        <p className="mt-2 text-xs text-zinc-600">WAV, MP3, M4A, OGG, WEBM — up to 25MB</p>

        {file && <p className="mt-4 text-sm text-zinc-300">Selected: {file.name}</p>}
      </div>

      {errorMessage && <p className="mt-4 text-center text-sm text-red-400">{errorMessage}</p>}

      <button type="button" onClick={submit} disabled={!file || uploading} className="btn-primary mt-8 w-full">
        {uploading ? "Uploading..." : "Generate My Story"}
      </button>
    </div>
  );
}
