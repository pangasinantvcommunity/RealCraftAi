import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/auth/is-super-admin";
import EditCreditsForm from "@/components/admin/EditCreditsForm";

export default async function AdminEditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isSuperAdmin(session?.user?.email)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, videoCredits: true },
  });

  if (!user) {
    notFound();
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center px-6 py-32">
      <div className="pointer-events-none absolute inset-0 bg-cinematic-glow" />

      <div className="relative w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Edit User</h1>
          <p className="mt-2 text-zinc-400">
            {user.name} — {user.email}
          </p>
          <span
            className={`mt-3 inline-block rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              user.role === "super_admin"
                ? "border-violet-400/40 bg-violet-500/15 text-violet-300"
                : "border-white/10 bg-white/5 text-zinc-400"
            }`}
          >
            {user.role}
          </span>
        </div>

        <EditCreditsForm userId={user.id} initialCredits={user.videoCredits} />
      </div>
    </section>
  );
}
