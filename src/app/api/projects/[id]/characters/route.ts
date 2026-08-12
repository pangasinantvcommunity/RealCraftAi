import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storyConfig } from "@/lib/config";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const existingCount = await prisma.projectCharacter.count({ where: { projectId } });
  if (existingCount >= storyConfig.maxProjectCharacters) {
    return NextResponse.json(
      { error: `Projects can have up to ${storyConfig.maxProjectCharacters} character sheets.` },
      { status: 422 },
    );
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const appearance = typeof body?.appearance === "string" ? body.appearance.trim().slice(0, 500) : "";

  if (!name || !appearance) {
    return NextResponse.json({ error: "A character needs at least a name and an appearance description." }, { status: 422 });
  }

  const optionalField = (value: unknown, max: number) =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

  const character = await prisma.projectCharacter.create({
    data: {
      projectId,
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

  return NextResponse.json(character, { status: 201 });
}
