import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/auth/is-super-admin";

/** Super-admin only: sets a user's videoCredits balance. Also gated at the edge by src/proxy.ts. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const videoCredits = Number(body?.videoCredits);

  if (!Number.isInteger(videoCredits) || videoCredits < 0) {
    return NextResponse.json({ error: "videoCredits must be a non-negative integer." }, { status: 422 });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { videoCredits },
    select: { id: true, videoCredits: true },
  });

  return NextResponse.json({ user }, { status: 200 });
}
