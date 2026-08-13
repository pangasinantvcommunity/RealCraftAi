import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

const VALID_ROLES: UserRole[] = ["super_admin", "administrator", "moderator", "contributor", "member"];

/** Super-admin only: changes a user's role and (optionally, in the same request) their credits. Also gated at the edge by src/proxy.ts. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const role = VALID_ROLES.includes(body?.role) ? (body.role as UserRole) : null;
  const videoCredits = body?.videoCredits === undefined ? undefined : Number(body.videoCredits);

  if (!role) {
    return NextResponse.json({ error: "Invalid role." }, { status: 422 });
  }
  if (videoCredits !== undefined && (!Number.isInteger(videoCredits) || videoCredits < 0)) {
    return NextResponse.json({ error: "videoCredits must be a non-negative integer." }, { status: 422 });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role, ...(videoCredits !== undefined ? { videoCredits } : {}) },
    select: { id: true, role: true, videoCredits: true },
  });

  const actor = { id: session.user.id, name: session.user.name ?? session.user.email ?? "Unknown", role: session.user.role };

  if (existing.role !== role) {
    await logAudit({ actor, action: "role_changed", targetType: "user", targetId: id, metadata: { from: existing.role, to: role } });
  }
  if (videoCredits !== undefined && existing.videoCredits !== videoCredits) {
    await logAudit({
      actor,
      action: "credits_changed",
      targetType: "user",
      targetId: id,
      metadata: { from: existing.videoCredits, to: videoCredits },
    });
  }

  return NextResponse.json({ user }, { status: 200 });
}
