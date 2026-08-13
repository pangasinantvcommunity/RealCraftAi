"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fireToast } from "@/components/ToastStack";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";

const ROLE_ORDER: UserRole[] = ["super_admin", "administrator", "moderator", "contributor", "member"];

export default function RoleAndCreditsForm({
  userId,
  initialRole,
  initialCredits,
  roleDefaults,
}: {
  userId: string;
  initialRole: UserRole;
  initialCredits: number;
  /** Role -> default credits, used to prefill the credits field when the role dropdown changes. */
  roleDefaults: Record<string, number>;
}) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(initialRole);
  const [credits, setCredits] = useState(String(initialCredits));
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleRoleChange = (nextRole: UserRole) => {
    setRole(nextRole);
    if (nextRole in roleDefaults) {
      setCredits(String(roleDefaults[nextRole]));
    }
  };

  const submit = async () => {
    const value = Number(credits);
    if (!Number.isInteger(value) || value < 0 || submitting) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, videoCredits: value }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not update user.");
      }

      fireToast({ type: "info", message: "User updated." });
      router.push("/admin/users");
      router.refresh();
    } catch (error) {
      setSubmitting(false);
      const message = error instanceof Error ? error.message : "Could not update user.";
      setErrorMessage(message);
      fireToast({ type: "error", message });
    }
  };

  return (
    <div className="glass-panel p-8 sm:p-10">
      <label className="text-xs uppercase tracking-wide text-zinc-400">Role</label>
      <select
        value={role}
        onChange={(e) => handleRoleChange(e.target.value as UserRole)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white outline-none transition-colors focus:border-violet-400/60"
      >
        {ROLE_ORDER.map((r) => (
          <option key={r} value={r} className="bg-void">
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>

      <label className="mt-6 block text-xs uppercase tracking-wide text-zinc-400">Video Credits</label>
      <input
        type="number"
        min={0}
        step={1}
        value={credits}
        onChange={(e) => setCredits(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white outline-none transition-colors focus:border-violet-400/60"
      />
      <p className="mt-1.5 text-xs text-zinc-500">Prefilled from the role's default when you change role above — adjust if needed.</p>

      {errorMessage && <p className="mt-4 text-center text-sm text-red-400">{errorMessage}</p>}

      <div className="mt-8 flex gap-3">
        <button type="button" onClick={() => router.push("/admin/users")} className="btn-secondary">
          Cancel
        </button>
        <button type="button" onClick={submit} disabled={submitting} className="btn-primary flex-1 disabled:opacity-50">
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
