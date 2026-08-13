import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AdminNav from "@/components/admin/AdminNav";
import RoleCreditsForm from "@/components/admin/RoleCreditsForm";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";

const ROLE_ORDER: UserRole[] = ["super_admin", "administrator", "moderator", "contributor", "member"];

export default async function AdminSettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    redirect("/dashboard");
  }

  const defaults = await prisma.roleCreditDefault.findMany();
  const defaultsByRole = new Map(defaults.map((d) => [d.role, d.defaultCredits]));

  return (
    <section className="relative mx-auto max-w-3xl px-6 pb-24 pt-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-cinematic-glow opacity-30" />

      <AdminNav active="/admin/settings" />

      <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Credit Settings</h1>
      <p className="mt-2 text-zinc-400">Default video credits assigned when a user is set to each role.</p>

      <div className="glass-panel mt-8 p-6 sm:p-8">
        <div className="space-y-5">
          {ROLE_ORDER.map((role) => (
            <RoleCreditsForm key={role} role={role} label={ROLE_LABELS[role]} initialCredits={defaultsByRole.get(role) ?? 0} />
          ))}
        </div>
      </div>
    </section>
  );
}
