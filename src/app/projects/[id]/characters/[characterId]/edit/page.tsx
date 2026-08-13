import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import CharacterEditForm from "@/components/project/CharacterEditForm";
import { canAccessResource } from "@/lib/auth/permissions";

export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string; characterId: string }>;
}) {
  const session = await auth();
  const { id: projectId, characterId } = await params;

  const character = await prisma.projectCharacter.findUnique({
    where: { id: characterId },
    include: { project: { include: { user: { select: { id: true, role: true } } } } },
  });

  if (
    !character ||
    character.projectId !== projectId ||
    !canAccessResource(session!.user, { id: character.project.user.id, role: character.project.user.role })
  ) {
    notFound();
  }

  return (
    <section className="relative mx-auto max-w-3xl px-6 pb-24 pt-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-cinematic-glow opacity-30" />

      <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Edit Character</h1>
      <p className="mt-2 text-zinc-400">{character.project.title}</p>

      <div className="mt-8">
        <CharacterEditForm projectId={projectId} character={character} />
      </div>
    </section>
  );
}
