import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/auth/is-super-admin";

const schema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: { formErrors: [], fieldErrors: { email: ["That email is already registered."] } } },
      { status: 422 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const bootstrapAdmin = isSuperAdmin(email);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      ...(bootstrapAdmin ? { role: "super_admin" as const, videoCredits: 101 } : {}),
    },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
