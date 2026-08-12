import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storyConfig } from "@/lib/config";
import { sanitizeRuntimeStructure } from "@/lib/project-memory";

const VALID_ASPECT_RATIOS = ["9:16", "16:9"];

function str(value: unknown, max: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
}

type ImportedCharacter = {
  name: string;
  appearance: string;
  age: string | null;
  gender: string | null;
  wardrobe: string | null;
  personality: string | null;
  role: string | null;
  relationships: string | null;
  voiceTone: string | null;
  cinematicNotes: string | null;
  imageUrl: string | null;
};

function parseImportedCharacters(input: unknown): ImportedCharacter[] {
  if (!Array.isArray(input)) return [];

  const result: ImportedCharacter[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const name = str((item as Record<string, unknown>).name, 60);
    const appearance = str((item as Record<string, unknown>).appearance, 500);
    if (!name || !appearance) continue;

    const rec = item as Record<string, unknown>;
    result.push({
      name,
      appearance,
      age: str(rec.age, 20),
      gender: str(rec.gender, 20),
      wardrobe: str(rec.wardrobe, 300),
      personality: str(rec.personality, 300),
      role: str(rec.role, 60),
      relationships: str(rec.relationships, 300),
      voiceTone: str(rec.voiceTone, 200),
      cinematicNotes: str(rec.cinematicNotes, 300),
      imageUrl: typeof rec.imageUrl === "string" ? rec.imageUrl : null,
    });
  }
  return result.slice(0, storyConfig.maxProjectCharacters);
}

type ImportedLocation = { name: string; description: string; mood: string | null; imageUrl: string | null };

function parseImportedLocations(input: unknown): ImportedLocation[] {
  if (!Array.isArray(input)) return [];

  const result: ImportedLocation[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const name = str(rec.name, 60);
    const description = str(rec.description, 500);
    if (!name || !description) continue;

    result.push({
      name,
      description,
      mood: str(rec.mood, 60),
      imageUrl: typeof rec.imageUrl === "string" ? rec.imageUrl : null,
    });
  }
  return result.slice(0, storyConfig.maxProjectLocations);
}

/** Creates a new project from a previously exported project-bible JSON document. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const project = body?.project;
  const title = str(project?.title, 120);

  if (!title) {
    return NextResponse.json({ error: "That file doesn't look like a project bible (missing project title)." }, { status: 422 });
  }

  const created = await prisma.project.create({
    data: {
      userId: session.user.id,
      title,
      synopsis: str(project?.synopsis, 500),
      storyBible: str(project?.storyBible, 10000),
      visualStyle: typeof project?.visualStyle === "string" ? project.visualStyle : "3d-cinematic",
      aspectRatio: VALID_ASPECT_RATIOS.includes(project?.aspectRatio) ? project.aspectRatio : "9:16",
      runtimeStructure: project?.runtimeStructure ? sanitizeRuntimeStructure(project.runtimeStructure) : undefined,
    },
  });

  const characters = parseImportedCharacters(body?.characters);
  if (characters.length > 0) {
    await prisma.projectCharacter.createMany({
      data: characters.map((c) => ({ projectId: created.id, ...c })),
    });
  }

  const locations = parseImportedLocations(body?.locations);
  if (locations.length > 0) {
    await prisma.projectLocation.createMany({
      data: locations.map((l) => ({ projectId: created.id, ...l })),
    });
  }

  return NextResponse.json({ id: created.id }, { status: 201 });
}
