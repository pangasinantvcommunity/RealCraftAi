import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AdminNav from "@/components/admin/AdminNav";
import RoleAndCreditsForm from "@/components/admin/RoleAndCreditsForm";
import { ROLE_LABELS } from "@/lib/auth/permissions";

export default async function AdminEditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const [user, roleDefaultRows] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, videoCredits: true, approvalStatus: true },
    }),
    prisma.roleCreditDefault.findMany(),
  ]);

  if (!user) {
    notFound();
  }

  const roleDefaults = Object.fromEntries(roleDefaultRows.map((r) => [r.role, r.defaultCredits]));

  return (
    <section className="relative mx-auto max-w-2xl px-6 pb-24 pt-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-cinematic-glow opacity-30" />

      <AdminNav active="/admin/users" />

      <div className="mb-8 text-center">
        <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Edit User</h1>
        <p className="mt-2 text-zinc-400">
          {user.name} — {user.email}
        </p>
        <span className="mt-3 inline-block rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          {user.approvalStatus}
        </span>
      </div>

      <RoleAndCreditsForm userId={user.id} initialRole={user.role} initialCredits={user.videoCredits} roleDefaults={roleDefaults} />
    </section>
  );
}
