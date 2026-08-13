import type { UserRole } from "@prisma/client";

const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 5,
  administrator: 4,
  moderator: 3,
  contributor: 2,
  member: 1,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  administrator: "Administrator",
  moderator: "Moderator",
  contributor: "Contributor",
  member: "Member",
};

/** Strictly greater rank — peers cannot manage each other, only someone below them. */
export function outranks(actorRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole];
}

/** Owns the resource, or outranks the resource owner's role in the hierarchy. */
export function canAccessResource(
  actor: { id: string; role: UserRole },
  owner: { id: string; role: UserRole },
): boolean {
  return actor.id === owner.id || outranks(actor.role, owner.role);
}

/** Every role strictly below the given role — used to scope "Team" visibility queries. */
export function rolesOutrankedBy(role: UserRole): UserRole[] {
  return (Object.keys(ROLE_RANK) as UserRole[]).filter((r) => ROLE_RANK[role] > ROLE_RANK[r]);
}
