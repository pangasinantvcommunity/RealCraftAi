import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storyConfig } from "@/lib/config";
import { canAccessResource } from "@/lib/auth/permissions";

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

  const existingCount = await prisma.projectLocation.count({ where: { projectId } });
  if (existingCount >= storyConfig.maxProjectLocations) {
    return NextResponse.json(
      { error: `Projects can have up to ${storyConfig.maxProjectLocations} locations.` },
      { status: 422 },
    );
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 500) : "";
  const mood = typeof body?.mood === "string" && body.mood.trim() ? body.mood.trim().slice(0, 60) : null;
  const imageUrl = typeof body?.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;

  if (!name || !description) {
    return NextResponse.json({ error: "A location needs at least a name and a description." }, { status: 422 });
  }

  const location = await prisma.projectLocation.create({
    data: { projectId, name, description, mood, imageUrl },
  });

  return NextResponse.json(location, { status: 201 });
}
