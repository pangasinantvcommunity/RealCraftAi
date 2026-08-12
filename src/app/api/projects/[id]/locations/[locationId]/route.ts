import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, locationId } = await params;
  const location = await prisma.projectLocation.findUnique({
    where: { id: locationId },
    include: { project: true },
  });

  if (!location || location.projectId !== projectId || location.project.userId !== session.user.id) {
    return NextResponse.json({ error: "Location not found." }, { status: 404 });
  }

  await prisma.projectLocation.delete({ where: { id: locationId } });

  return NextResponse.json({ ok: true }, { status: 200 });
}
