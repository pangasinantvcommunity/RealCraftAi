import ProjectWizard from "@/components/ProjectWizard";

export default function NewProjectPage() {
  return (
    <section className="relative flex min-h-screen items-center justify-center px-6 py-32">
      <div className="pointer-events-none absolute inset-0 bg-cinematic-glow" />

      <div className="relative w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">New Project</h1>
          <p className="mt-2 text-zinc-400">Set up the cast, world, and defaults every episode will inherit.</p>
        </div>

        <ProjectWizard />
      </div>
    </section>
  );
}
