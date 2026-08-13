import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AdminNav from "@/components/admin/AdminNav";
import ApprovalActions from "@/components/admin/ApprovalActions";

export default async function AdminApprovalsPage() {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    redirect("/dashboard");
  }

  const pendingUsers = await prisma.user.findMany({
    where: { approvalStatus: "pending" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, contactNumber: true, createdAt: true },
  });

  return (
    <section className="relative mx-auto max-w-5xl px-6 pb-24 pt-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-cinematic-glow opacity-30" />

      <AdminNav active="/admin/approvals" />

      <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Pending Approvals</h1>
      <p className="mt-2 text-zinc-400">
        {pendingUsers.length} {pendingUsers.length === 1 ? "registration" : "registrations"} awaiting review.
      </p>

      {pendingUsers.length === 0 ? (
        <div className="glass-panel mt-8 p-12 text-center text-zinc-400">Nothing pending right now.</div>
      ) : (
        <div className="mt-8 space-y-4">
          {pendingUsers.map((user) => (
            <div key={user.id} className="glass-panel flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="text-sm font-semibold text-white">{user.name}</p>
                <p className="text-xs text-zinc-400">{user.email}</p>
                {user.contactNumber && <p className="text-xs text-zinc-500">{user.contactNumber}</p>}
                <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-600">
                  Registered {user.createdAt.toLocaleDateString()}
                </p>
              </div>
              <ApprovalActions userId={user.id} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
