import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Self-service profile update — always scoped to the caller's own account. */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 255) : "";
  const contactNumber =
    typeof body?.contactNumber === "string" && body.contactNumber.trim() ? body.contactNumber.trim().slice(0, 40) : null;
  const profilePicture =
    typeof body?.profilePicture === "string" && body.profilePicture.trim() ? body.profilePicture.trim() : null;

  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 422 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { name, contactNumber, profilePicture },
    select: { id: true, name: true, contactNumber: true, profilePicture: true },
  });

  return NextResponse.json({ user }, { status: 200 });
}
