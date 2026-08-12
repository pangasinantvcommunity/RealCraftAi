import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, characterId } = await params;
  const character = await prisma.projectCharacter.findUnique({
    where: { id: characterId },
    include: { project: true },
  });

  if (!character || character.projectId !== projectId || character.project.userId !== session.user.id) {
    return NextResponse.json({ error: "Character not found." }, { status: 404 });
  }

  await prisma.projectCharacter.delete({ where: { id: characterId } });

  return NextResponse.json({ ok: true }, { status: 200 });
}
