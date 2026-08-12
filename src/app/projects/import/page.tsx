"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fireToast } from "@/components/ToastStack";

export default function ImportProjectPage() {
  const router = useRouter();
  const [json, setJson] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setJson(text);
  };

  const submit = async () => {
    if (!json.trim() || submitting) return;
    setSubmitting(true);
    setErrorMessage("");

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setSubmitting(false);
      setErrorMessage("That doesn't look like valid JSON.");
      return;
    }

    try {
      const response = await fetch("/api/projects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not import this project bible.");
      }

      const { id } = await response.json();
      router.push(`/projects/${id}`);
    } catch (error) {
      setSubmitting(false);
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setErrorMessage(message);
      fireToast({ type: "error", message });
    }
  };

  return (
    <section className="relative flex min-h-screen items-center justify-center px-6 py-32">
      <div className="pointer-events-none absolute inset-0 bg-cinematic-glow" />

      <div className="relative w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Import Project Bible</h1>
          <p className="mt-2 text-zinc-400">Paste or upload a project bible JSON file exported from another project.</p>
        </div>

        <div className="glass-panel p-8 sm:p-10">
          <label className="inline-block cursor-pointer text-sm font-semibold text-violet-300 hover:text-white">
            Upload a .json file
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>

          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={14}
            placeholder="...or paste the exported project bible JSON here"
            className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-mono text-xs leading-relaxed text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-400/60"
          />

          {errorMessage && <p className="mt-4 text-center text-sm text-red-400">{errorMessage}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={!json.trim() || submitting}
            className="btn-primary mt-6 w-full"
          >
            {submitting ? "Importing..." : "Import Project"}
          </button>
        </div>
      </div>
    </section>
  );
}
