import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function PendingApprovalPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.approvalStatus === "approved") redirect("/dashboard");

  const rejected = session.user.approvalStatus === "rejected";

  return (
    <section className="relative flex min-h-screen items-center justify-center px-6 py-32">
      <div className="pointer-events-none absolute inset-0 bg-cinematic-glow" />

      <div className="glass-panel relative w-full max-w-md p-8 text-center sm:p-10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-2xl">
          {rejected ? "✕" : "⏳"}
        </div>
        <h1 className="cinematic-heading font-heading text-2xl font-bold">
          {rejected ? "Registration Not Approved" : "Awaiting Approval"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {rejected
            ? "A Super Admin has reviewed your registration and did not approve it. Contact your administrator if you believe this is a mistake."
            : "Your account has been created and is waiting for a Super Admin to approve it. You'll be able to access the full system once approved."}
        </p>

        <div className="mt-8">
          <LogoutButton />
        </div>
      </div>
    </section>
  );
}
