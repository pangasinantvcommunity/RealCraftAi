export type StoryboardScene = { order: number; subtitle: string; imageUrl: string | null };

export default function SceneStoryboard({
  scenes,
  aspectRatio = "9:16",
}: {
  scenes: StoryboardScene[];
  aspectRatio?: string;
}) {
  if (!scenes || scenes.length === 0) return null;

  const aspectClass = aspectRatio === "16:9" ? "aspect-[16/9]" : "aspect-[9/16]";

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {scenes.map((scene) => (
        <div key={scene.order} className={`glass-panel ${aspectClass} overflow-hidden`} title={scene.subtitle}>
          {scene.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={scene.imageUrl} alt={scene.subtitle} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg">🎞️</div>
          )}
        </div>
      ))}
    </div>
  );
}
