"use client";

const MAX_LENGTH = 10000;

export default function PromptEditor({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-zinc-400">Story Prompt</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_LENGTH))}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            onSubmit();
          }
        }}
        maxLength={MAX_LENGTH}
        rows={10}
        placeholder="Describe a cinematic story or paste a screenplay prompt…"
        className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm leading-relaxed text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-400/60"
      />
      <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-500">
        <span>Tip: Ctrl+Enter to generate</span>
        <span>
          {value.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
