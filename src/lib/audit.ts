import { prisma } from "@/lib/prisma";
import type { Prisma, UserRole } from "@prisma/client";

export async function logAudit({
  actor,
  action,
  targetType,
  targetId,
  metadata,
}: {
  actor: { id: string; name: string; role: UserRole };
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      targetType,
      targetId,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
