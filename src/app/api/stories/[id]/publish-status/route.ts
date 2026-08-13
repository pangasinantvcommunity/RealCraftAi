import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { outranks } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";

/**
 * Publishing/returning an episode requires the actor to outrank the owner —
 * unlike editing, an owner cannot publish their own work under this
 * hierarchy (that's the point of the review step).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const action = body?.action === "publish" || body?.action === "return_for_revision" ? body.action : null;
  if (!action) {
    return NextResponse.json({ error: "action must be 'publish' or 'return_for_revision'." }, { status: 422 });
  }

  const video = await prisma.video.findUnique({ where: { id }, include: { user: { select: { id: true, role: true } } } });
  if (!video) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!outranks(session.user.role, video.user.role)) {
    return NextResponse.json({ error: "You don't have authority to publish this episode." }, { status: 403 });
  }
  if (video.status !== "completed") {
    return NextResponse.json({ error: "Only a completed episode can be published or returned." }, { status: 409 });
  }

  const publishStatus = action === "publish" ? "published" : "returned_for_revision";
  await prisma.video.update({
    where: { id },
    data: {
      publishStatus,
      publishedAt: action === "publish" ? new Date() : null,
      publishedBy: action === "publish" ? session.user.id : null,
    },
  });

  await logAudit({
    actor: { id: session.user.id, name: session.user.name ?? session.user.email ?? "Unknown", role: session.user.role },
    action: action === "publish" ? "episode_published" : "episode_returned",
    targetType: "episode",
    targetId: id,
  });

  return NextResponse.json({ id, publishStatus }, { status: 200 });
}
