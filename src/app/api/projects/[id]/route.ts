import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeRuntimeStructure } from "@/lib/project-memory";

const VALID_ASPECT_RATIOS = ["9:16", "16:9"];

/** Partial update — the project wizard PATCHes one step's fields at a time, so only fields present in the body are touched. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 422 });
  }

  const data: Prisma.ProjectUpdateInput = {};

  if (typeof body.title === "string") {
    const title = body.title.trim().slice(0, 120);
    if (!title) {
      return NextResponse.json({ error: "Please give your project a title." }, { status: 422 });
    }
    data.title = title;
  }
  if (typeof body.synopsis === "string") data.synopsis = body.synopsis.trim().slice(0, 500) || null;
  if (typeof body.storyBible === "string") data.storyBible = body.storyBible.trim().slice(0, 10000) || null;
  if (typeof body.visualStyle === "string") data.visualStyle = body.visualStyle;
  if (VALID_ASPECT_RATIOS.includes(body.aspectRatio)) data.aspectRatio = body.aspectRatio;
  if (body.runtimeStructure && typeof body.runtimeStructure === "object") {
    data.runtimeStructure = sanitizeRuntimeStructure(body.runtimeStructure);
  }

  await prisma.project.update({ where: { id }, data });

  return NextResponse.json({ id }, { status: 200 });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  await prisma.project.delete({ where: { id } });

  return NextResponse.json({ ok: true }, { status: 200 });
}
