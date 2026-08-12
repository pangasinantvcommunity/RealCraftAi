export type StoryboardScene = { order: number; subtitle: string; imageUrl: string | null };

export default function SceneStoryboard({ scenes }: { scenes: StoryboardScene[] }) {
  if (!scenes || scenes.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {scenes.map((scene) => (
        <div key={scene.order} className="glass-panel aspect-[9/16] overflow-hidden" title={scene.subtitle}>
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
