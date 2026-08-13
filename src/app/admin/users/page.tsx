import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AdminNav from "@/components/admin/AdminNav";

const ROLE_BADGE_CLASSES: Record<string, string> = {
  super_admin: "border-violet-400/40 bg-violet-500/15 text-violet-300",
  administrator: "border-cyan-400/40 bg-cyan-500/15 text-cyan-300",
  moderator: "border-emerald-400/40 bg-emerald-500/15 text-emerald-300",
  contributor: "border-amber-400/40 bg-amber-500/15 text-amber-300",
  member: "border-white/10 bg-white/5 text-zinc-400",
};

export default async function AdminUsersPage() {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, videoCredits: true, approvalStatus: true },
  });

  return (
    <section className="relative mx-auto max-w-5xl px-6 pb-24 pt-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-cinematic-glow opacity-30" />

      <AdminNav active="/admin/users" />

      <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Users</h1>
      <p className="mt-2 text-zinc-400">{users.length} {users.length === 1 ? "account" : "accounts"} total.</p>

      <div className="glass-panel mt-8 overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-5 py-4 font-medium">Name</th>
              <th className="px-5 py-4 font-medium">Email</th>
              <th className="px-5 py-4 font-medium">Role</th>
              <th className="px-5 py-4 font-medium">Approval</th>
              <th className="px-5 py-4 font-medium">Video Credits</th>
              <th className="px-5 py-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-white/5 last:border-0">
                <td className="px-5 py-4 text-white">{user.name}</td>
                <td className="px-5 py-4 text-zinc-300">{user.email}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${ROLE_BADGE_CLASSES[user.role]}`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      user.approvalStatus === "approved"
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                        : user.approvalStatus === "rejected"
                          ? "border-red-400/30 bg-red-500/10 text-red-300"
                          : "border-amber-400/30 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {user.approvalStatus}
                  </span>
                </td>
                <td className="px-5 py-4 text-zinc-300">{user.videoCredits}</td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="text-xs font-semibold text-violet-300 transition-colors hover:text-violet-200"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
