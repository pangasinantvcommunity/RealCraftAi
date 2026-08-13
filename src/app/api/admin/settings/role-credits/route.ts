import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { UserRole } from "@prisma/client";

const VALID_ROLES: UserRole[] = ["super_admin", "administrator", "moderator", "contributor", "member"];

/** Super-admin only: sets the default video-credit allocation for a role. Also gated at the edge by src/proxy.ts. */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const role = VALID_ROLES.includes(body?.role) ? (body.role as UserRole) : null;
  const defaultCredits = Number(body?.defaultCredits);

  if (!role) {
    return NextResponse.json({ error: "Invalid role." }, { status: 422 });
  }
  if (!Number.isInteger(defaultCredits) || defaultCredits < 0) {
    return NextResponse.json({ error: "defaultCredits must be a non-negative integer." }, { status: 422 });
  }

  await prisma.roleCreditDefault.upsert({
    where: { role },
    update: { defaultCredits },
    create: { role, defaultCredits },
  });

  await logAudit({
    actor: { id: session.user.id, name: session.user.name ?? session.user.email ?? "Unknown", role: session.user.role },
    action: "credit_defaults_changed",
    targetType: "role_credit_default",
    targetId: role,
    metadata: { role, defaultCredits },
  });

  return NextResponse.json({ role, defaultCredits }, { status: 200 });
}
