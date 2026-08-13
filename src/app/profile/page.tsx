import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { id: true, name: true, email: true, contactNumber: true, profilePicture: true, role: true, videoCredits: true },
  });

  if (!user) return null;

  return (
    <section className="relative flex min-h-screen items-center justify-center px-6 py-32">
      <div className="pointer-events-none absolute inset-0 bg-cinematic-glow" />

      <div className="relative w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">My Profile</h1>
          <p className="mt-2 text-zinc-400">{user.email}</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="rounded-full border border-violet-400/40 bg-violet-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
              {ROLE_LABELS[user.role]}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-wide text-zinc-400">
              {user.videoCredits} credits
            </span>
          </div>
        </div>

        <ProfileForm
          initialName={user.name}
          initialContactNumber={user.contactNumber ?? ""}
          initialProfilePicture={user.profilePicture}
        />
      </div>
    </section>
  );
}
