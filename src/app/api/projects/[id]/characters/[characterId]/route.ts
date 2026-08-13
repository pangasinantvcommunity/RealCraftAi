import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessResource } from "@/lib/auth/permissions";
import type { Viewer } from "@/types/project";

async function loadOwnedCharacter(projectId: string, characterId: string, viewer: Viewer) {
  const character = await prisma.projectCharacter.findUnique({
    where: { id: characterId },
    include: { project: { include: { user: { select: { id: true, role: true } } } } },
  });
  if (
    !character ||
    character.projectId !== projectId ||
    !canAccessResource(viewer, { id: character.project.user.id, role: character.project.user.role })
  ) {
    return null;
  }
  return character;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, characterId } = await params;
  const existing = await loadOwnedCharacter(projectId, characterId, session.user);
  if (!existing) {
    return NextResponse.json({ error: "Character not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const appearance = typeof body?.appearance === "string" ? body.appearance.trim().slice(0, 500) : "";

  if (!name || !appearance) {
    return NextResponse.json({ error: "A character needs at least a name and an appearance description." }, { status: 422 });
  }

  const optionalField = (value: unknown, max: number) =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

  const character = await prisma.projectCharacter.update({
    where: { id: characterId },
    data: {
      name,
      appearance,
      age: optionalField(body?.age, 20),
      gender: optionalField(body?.gender, 20),
      wardrobe: optionalField(body?.wardrobe, 300),
      personality: optionalField(body?.personality, 300),
      role: optionalField(body?.role, 60),
      relationships: optionalField(body?.relationships, 300),
      voiceTone: optionalField(body?.voiceTone, 200),
      cinematicNotes: optionalField(body?.cinematicNotes, 300),
      imageUrl: typeof body?.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null,
    },
  });

  return NextResponse.json(character, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; characterId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, characterId } = await params;
  const existing = await loadOwnedCharacter(projectId, characterId, session.user);
  if (!existing) {
    return NextResponse.json({ error: "Character not found." }, { status: 404 });
  }

  await prisma.projectCharacter.delete({ where: { id: characterId } });

  return NextResponse.json({ ok: true }, { status: 200 });
}
