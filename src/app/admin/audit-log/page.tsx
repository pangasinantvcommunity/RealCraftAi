import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AdminNav from "@/components/admin/AdminNav";
import { ROLE_LABELS } from "@/lib/auth/permissions";

const ACTION_LABELS: Record<string, string> = {
  user_approved: "User Approved",
  user_rejected: "User Rejected",
  role_changed: "Role Changed",
  credits_changed: "Credits Changed",
  credit_defaults_changed: "Credit Defaults Changed",
  episode_modified: "Episode Modified",
  episode_deleted: "Episode Deleted",
  episode_published: "Episode Published",
  episode_returned: "Episode Returned for Revision",
};

export default async function AdminAuditLogPage() {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    redirect("/dashboard");
  }

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-cinematic-glow opacity-30" />

      <AdminNav active="/admin/audit-log" />

      <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Audit Log</h1>
      <p className="mt-2 text-zinc-400">Most recent {entries.length} recorded actions.</p>

      <div className="glass-panel mt-8 overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-5 py-4 font-medium">When</th>
              <th className="px-5 py-4 font-medium">Actor</th>
              <th className="px-5 py-4 font-medium">Action</th>
              <th className="px-5 py-4 font-medium">Target</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-zinc-500">
                  No actions recorded yet.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-4 text-xs text-zinc-500">{entry.createdAt.toLocaleString()}</td>
                  <td className="px-5 py-4 text-zinc-300">
                    {entry.actorName}
                    <span className="ml-2 text-xs text-zinc-500">({ROLE_LABELS[entry.actorRole]})</span>
                  </td>
                  <td className="px-5 py-4 text-white">{ACTION_LABELS[entry.action] ?? entry.action}</td>
                  <td className="px-5 py-4 text-xs text-zinc-500">
                    {entry.targetType}:{entry.targetId.slice(0, 8)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
