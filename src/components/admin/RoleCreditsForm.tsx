"use client";

import { useState } from "react";
import { fireToast } from "@/components/ToastStack";
import type { UserRole } from "@prisma/client";

export default function RoleCreditsForm({
  role,
  label,
  initialCredits,
}: {
  role: UserRole;
  label: string;
  initialCredits: number;
}) {
  const [credits, setCredits] = useState(String(initialCredits));
  const [submitting, setSubmitting] = useState(false);

  const save = async () => {
    const value = Number(credits);
    if (!Number.isInteger(value) || value < 0 || submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/settings/role-credits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, defaultCredits: value }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not save.");
      }
      fireToast({ type: "info", message: `${label} default credits updated.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save.";
      fireToast({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm font-medium text-white">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          step={1}
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
          className="w-24 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-violet-400/60"
        />
        <button
          type="button"
          onClick={save}
          disabled={submitting}
          className="rounded-xl border border-violet-400/40 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300 transition-colors hover:bg-violet-500/20 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
