import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import LocationEditForm from "@/components/project/LocationEditForm";

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string; locationId: string }>;
}) {
  const session = await auth();
  const { id: projectId, locationId } = await params;

  const location = await prisma.projectLocation.findUnique({
    where: { id: locationId },
    include: { project: true },
  });

  if (!location || location.projectId !== projectId || location.project.userId !== session!.user.id) {
    notFound();
  }

  return (
    <section className="relative mx-auto max-w-3xl px-6 pb-24 pt-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-cinematic-glow opacity-30" />

      <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Edit Location</h1>
      <p className="mt-2 text-zinc-400">{location.project.title}</p>

      <div className="mt-8">
        <LocationEditForm projectId={projectId} location={location} />
      </div>
    </section>
  );
}
