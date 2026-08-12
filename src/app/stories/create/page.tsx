import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { remainingCredits } from "@/lib/story";
import CreateStoryTabs from "@/components/CreateStoryTabs";

export default async function CreateStoryPage() {
  const session = await auth();
  const credits = await remainingCredits(session!.user.id);

  if (credits <= 0) {
    redirect("/dashboard?limitReached=1");
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center px-6 py-32">
      <div className="pointer-events-none absolute inset-0 bg-cinematic-glow" />

      <div className="relative w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">Create Your Cinematic Story</h1>
          <p className="mt-2 text-zinc-400">{credits} {credits === 1 ? "credit" : "credits"} remaining today</p>
        </div>

        <CreateStoryTabs />
      </div>
    </section>
  );
}
