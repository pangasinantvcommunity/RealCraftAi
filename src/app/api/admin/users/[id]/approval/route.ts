import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

/** Super-admin only: approves or rejects a pending registration. Also gated at the edge by src/proxy.ts. */
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
  const decision = body?.decision === "approve" || body?.decision === "reject" ? body.decision : null;
  if (!decision) {
    return NextResponse.json({ error: "decision must be 'approve' or 'reject'." }, { status: 422 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const approvalStatus = decision === "approve" ? "approved" : "rejected";
  const user = await prisma.user.update({
    where: { id },
    data: { approvalStatus, approvedBy: session.user.id, approvedAt: new Date() },
    select: { id: true, approvalStatus: true },
  });

  await logAudit({
    actor: { id: session.user.id, name: session.user.name ?? session.user.email ?? "Unknown", role: session.user.role },
    action: decision === "approve" ? "user_approved" : "user_rejected",
    targetType: "user",
    targetId: id,
  });

  return NextResponse.json({ user }, { status: 200 });
}
