import { isDevMode } from "@/lib/config";

export default function DevModeBanner() {
  if (!isDevMode) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[90]">
      <div className="glass-panel pointer-events-auto flex items-center gap-2 border-amber-400/30 px-4 py-2.5 text-xs text-amber-200">
        <span className="status-dot bg-amber-400 text-amber-400" />
        Development Mode — No API credits are being used.
      </div>
    </div>
  );
}
