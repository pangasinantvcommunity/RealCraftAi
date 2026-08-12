"use client";

import { useState } from "react";
import Link from "next/link";

export default function UpgradeModal({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 backdrop-blur-sm px-6"
      onClick={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div className="glass-panel relative max-w-md p-8 text-center">
        <h3 className="cinematic-heading font-heading text-2xl font-bold">Daily Limit Reached</h3>
        <p className="mt-3 text-sm text-zinc-400">
          You&apos;ve used all your free stories today. Upgrade to RealCraft AI Pro for unlimited cinematic
          stories and priority rendering.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
            Maybe Later
          </button>
          <Link href="/#pricing" className="btn-primary">
            Upgrade Now
          </Link>
        </div>
      </div>
    </div>
  );
}
