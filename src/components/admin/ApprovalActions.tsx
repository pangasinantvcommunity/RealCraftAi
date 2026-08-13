"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fireToast } from "@/components/ToastStack";

export default function ApprovalActions({ userId }: { userId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);

  const decide = async (decision: "approve" | "reject") => {
    if (submitting) return;
    setSubmitting(decision);
    try {
      const response = await fetch(`/api/admin/users/${userId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Could not update approval status.");
      }
      fireToast({ type: "info", message: decision === "approve" ? "User approved." : "User rejected." });
      router.refresh();
    } catch (error) {
      setSubmitting(null);
      const message = error instanceof Error ? error.message : "Could not update approval status.";
      fireToast({ type: "error", message });
    }
  };

  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        onClick={() => decide("reject")}
        disabled={!!submitting}
        className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"
      >
        {submitting === "reject" ? "Rejecting..." : "Reject"}
      </button>
      <button
        type="button"
        onClick={() => decide("approve")}
        disabled={!!submitting}
        className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
      >
        {submitting === "approve" ? "Approving..." : "Approve"}
      </button>
    </div>
  );
}
