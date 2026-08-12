import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildProjectContext } from "@/lib/project-memory";
import { slugify } from "@/lib/mock-story";

/** Downloads a project's full memory (title, synopsis, runtime structure, characters, locations, story bible) as JSON. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const context = await buildProjectContext(id, session.user.id);
  if (!context) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const exportPayload = {
    format: "realcraft-project-bible",
    version: 1,
    project: {
      title: context.title,
      synopsis: context.synopsis,
      storyBible: context.storyBible,
      runtimeStructure: context.runtimeStructure,
      visualStyle: context.visualStyle,
      aspectRatio: context.aspectRatio,
    },
    characters: context.characters.map(({ id: _id, ...rest }) => rest),
    locations: context.locations.map(({ id: _id, ...rest }) => rest),
  };

  const filename = `${slugify(context.title)}-project-bible.json`;

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
