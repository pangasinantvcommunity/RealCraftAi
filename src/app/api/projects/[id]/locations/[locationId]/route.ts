import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessResource } from "@/lib/auth/permissions";
import type { Viewer } from "@/types/project";

async function loadOwnedLocation(projectId: string, locationId: string, viewer: Viewer) {
  const location = await prisma.projectLocation.findUnique({
    where: { id: locationId },
    include: { project: { include: { user: { select: { id: true, role: true } } } } },
  });
  if (
    !location ||
    location.projectId !== projectId ||
    !canAccessResource(viewer, { id: location.project.user.id, role: location.project.user.role })
  ) {
    return null;
  }
  return location;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, locationId } = await params;
  const existing = await loadOwnedLocation(projectId, locationId, session.user);
  if (!existing) {
    return NextResponse.json({ error: "Location not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 500) : "";
  const mood = typeof body?.mood === "string" && body.mood.trim() ? body.mood.trim().slice(0, 60) : null;
  const imageUrl = typeof body?.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;

  if (!name || !description) {
    return NextResponse.json({ error: "A location needs at least a name and a description." }, { status: 422 });
  }

  const location = await prisma.projectLocation.update({
    where: { id: locationId },
    data: { name, description, mood, imageUrl },
  });

  return NextResponse.json(location, { status: 200 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, locationId } = await params;
  const existing = await loadOwnedLocation(projectId, locationId, session.user);
  if (!existing) {
    return NextResponse.json({ error: "Location not found." }, { status: 404 });
  }

  await prisma.projectLocation.delete({ where: { id: locationId } });

  return NextResponse.json({ ok: true }, { status: 200 });
}
