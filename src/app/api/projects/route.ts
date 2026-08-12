import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeRuntimeStructure } from "@/lib/project-memory";

const VALID_ASPECT_RATIOS = ["9:16", "16:9"];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  const synopsis = typeof body?.synopsis === "string" ? body.synopsis.trim().slice(0, 500) : "";
  const storyBible = typeof body?.storyBible === "string" ? body.storyBible.trim().slice(0, 10000) : "";
  const visualStyle = typeof body?.visualStyle === "string" ? body.visualStyle : "3d-cinematic";
  const aspectRatio = VALID_ASPECT_RATIOS.includes(body?.aspectRatio) ? body.aspectRatio : "9:16";
  const runtimeStructure = body?.runtimeStructure ? sanitizeRuntimeStructure(body.runtimeStructure) : null;

  if (!title) {
    return NextResponse.json({ error: "Please give your project a title." }, { status: 422 });
  }

  const project = await prisma.project.create({
    data: {
      userId: session.user.id,
      title,
      synopsis: synopsis || null,
      storyBible: storyBible || null,
      visualStyle,
      aspectRatio,
      runtimeStructure: runtimeStructure ?? undefined,
    },
  });

  return NextResponse.json({ id: project.id }, { status: 201 });
}
