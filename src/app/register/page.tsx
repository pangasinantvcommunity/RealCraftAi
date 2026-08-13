"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const email = form.get("email") as string;
    const password = form.get("password") as string;
    const passwordConfirmation = form.get("password_confirmation") as string;

    if (password !== passwordConfirmation) {
      setErrors(["Passwords do not match."]);
      setSubmitting(false);
      return;
    }

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const body = await response.json();
      const fieldErrors = Object.values(body.error?.fieldErrors ?? {}).flat() as string[];
      setErrors(fieldErrors.length ? fieldErrors : ["Something went wrong. Please try again."]);
      setSubmitting(false);
      return;
    }

    const { user } = await response.json();
    await signIn("credentials", { email, password, redirect: false });
    router.push(user.approvalStatus === "approved" ? "/dashboard" : "/pending-approval");
    router.refresh();
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center px-6 py-32">
      <div className="pointer-events-none absolute inset-0 bg-cinematic-glow" />

      <div className="glass-panel relative w-full max-w-md p-8 sm:p-10">
        <h1 className="cinematic-heading font-heading text-2xl font-bold">Create your account</h1>
        <p className="mt-2 text-sm text-zinc-400">Start turning your voice into cinematic stories — free.</p>

        {errors.length > 0 && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <ul className="list-inside list-disc space-y-1">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-400">Name</label>
            <input
              type="text"
              name="name"
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/60"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-400">Email</label>
            <input
              type="email"
              name="email"
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/60"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-400">Password</label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/60"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-400">Confirm Password</label>
            <input
              type="password"
              name="password_confirmation"
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-400/60"
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Creating..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-violet-300 hover:text-white">
            Log in
          </Link>
        </p>
      </div>
    </section>
  );
}
