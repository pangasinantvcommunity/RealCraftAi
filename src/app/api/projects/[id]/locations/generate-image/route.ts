import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessResource } from "@/lib/auth/permissions";
import { isDevMode } from "@/lib/config";
import { getMockSceneImageUrl, slugify } from "@/lib/mock-story";
import { generateSceneImage } from "@/services/image-generation";
import { uploadImage } from "@/lib/storage";

/** Generates a preview image for a location sheet. Not persisted — the client reviews it before saving. */
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
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 500) : "";
  const mood = typeof body?.mood === "string" ? body.mood.trim().slice(0, 60) : "";

  if (!name) {
    return NextResponse.json({ error: "Enter a location name before generating an image." }, { status: 422 });
  }

  if (isDevMode) {
    return NextResponse.json({ url: getMockSceneImageUrl(`location-${slugify(name)}-${Date.now()}`) }, { status: 200 });
  }

  try {
    const prompt = `Cinematic establishing shot, ${project.visualStyle} style: ${name}${description ? `, ${description}` : ""}${mood ? ` (mood: ${mood})` : ""}.`;
    const buffer = await generateSceneImage(prompt, { size: "1536x1024" });
    const url = await uploadImage(buffer);
    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Location image generation failed", error);
    return NextResponse.json({ error: "Could not generate an image. Please try again." }, { status: 502 });
  }
}
