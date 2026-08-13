import { DefaultSession } from "next-auth";
import type { UserRole, ApprovalStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      approvalStatus: ApprovalStatus;
      videoCredits: number;
      contactNumber: string | null;
      profilePicture: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    approvalStatus?: ApprovalStatus;
    videoCredits?: number;
    contactNumber?: string | null;
    profilePicture?: string | null;
    refreshedAt?: number;
  }
}
