export default function EmotionalArcChips({ arc }: { arc: string[] }) {
  if (!arc || arc.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {arc.map((beat, i) => (
        <span key={beat} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          <span className="mr-1 text-zinc-500">{i + 1}.</span>
          {beat}
        </span>
      ))}
    </div>
  );
}
