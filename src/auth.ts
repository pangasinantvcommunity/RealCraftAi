import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole, ApprovalStatus } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user: signedInUser, trigger }) => {
      if (signedInUser) token.id = signedInUser.id;
      if (!token.id) return token;

      // This callback runs on essentially every request (including every
      // proxy.ts middleware pass), so refetching from Postgres unconditionally
      // here exhausts the connection pool under real traffic. Instead,
      // refetch immediately after sign-in or an explicit client-side
      // update() call (profile save), and otherwise only every 30s — recent
      // enough that a super-admin's approval/role/credit change takes effect
      // without a re-login, without hitting the DB on every single request.
      const REFRESH_INTERVAL_MS = 30_000;
      const refreshedAt = typeof token.refreshedAt === "number" ? token.refreshedAt : 0;
      const shouldRefresh = !!signedInUser || trigger === "update" || Date.now() - refreshedAt > REFRESH_INTERVAL_MS;
      if (!shouldRefresh) return token;

      const user = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: {
          name: true,
          role: true,
          approvalStatus: true,
          videoCredits: true,
          contactNumber: true,
          profilePicture: true,
        },
      });
      if (!user) return token;

      token.name = user.name;
      token.role = user.role;
      token.approvalStatus = user.approvalStatus;
      token.videoCredits = user.videoCredits;
      token.contactNumber = user.contactNumber;
      token.profilePicture = user.profilePicture;
      token.refreshedAt = Date.now();
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.approvalStatus = token.approvalStatus as ApprovalStatus;
        session.user.videoCredits = token.videoCredits as number;
        session.user.contactNumber = (token.contactNumber as string | null) ?? null;
        session.user.profilePicture = (token.profilePicture as string | null) ?? null;
      }
      return session;
    },
  },
});
