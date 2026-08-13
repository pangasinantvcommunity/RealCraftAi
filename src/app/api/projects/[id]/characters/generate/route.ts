import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateCharacterSheet } from "@/lib/character-generator";
import { canAccessResource } from "@/lib/auth/permissions";

/** Auto-fills a character sheet draft from just a name + role. Not persisted — the client reviews/edits before saving. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { user: { select: { id: true, role: true } } } });
  if (!project || !canAccessResource(session.user, { id: project.user.id, role: project.user.role })) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const role = typeof body?.role === "string" ? body.role.trim().slice(0, 60) : "";

  if (!name) {
    return NextResponse.json({ error: "Enter a character name before generating." }, { status: 422 });
  }

  try {
    const sheet = await generateCharacterSheet(name, role);
    return NextResponse.json(sheet, { status: 200 });
  } catch (error) {
    console.error("generateCharacterSheet failed", error);
    return NextResponse.json({ error: "Could not generate a character sheet. Please try again." }, { status: 502 });
  }
}
