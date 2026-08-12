import { isDevMode } from "@/lib/config";

export default function DevModeBadge() {
  if (!isDevMode) return null;

  return (
    <span
      title="AI APIs disabled — running with mock data"
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300"
    >
      <span className="status-dot bg-amber-400 text-amber-400" />
      Dev Mode
    </span>
  );
}
