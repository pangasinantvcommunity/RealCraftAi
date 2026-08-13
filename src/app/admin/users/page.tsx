import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/auth/is-super-admin";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.email)) {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, videoCredits: true },
  });

  return (
    <section className="relative mx-auto max-w-5xl px-6 pb-24 pt-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-cinematic-glow opacity-30" />

      <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Users</h1>
      <p className="mt-2 text-zinc-400">{users.length} {users.length === 1 ? "account" : "accounts"} total.</p>

      <div className="glass-panel mt-8 overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-5 py-4 font-medium">Name</th>
              <th className="px-5 py-4 font-medium">Email</th>
              <th className="px-5 py-4 font-medium">Role</th>
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
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      user.role === "super_admin"
                        ? "border-violet-400/40 bg-violet-500/15 text-violet-300"
                        : "border-white/10 bg-white/5 text-zinc-400"
                    }`}
                  >
                    {user.role}
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
