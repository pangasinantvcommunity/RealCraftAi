"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DevModeBadge from "@/components/DevModeBadge";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav
        className={`mx-auto flex max-w-7xl items-center justify-between px-6 py-4 transition-all duration-300 ${
          scrolled ? "backdrop-blur-xl bg-void/70 border-b border-white/5" : ""
        }`}
      >
        <Link href="/" className="font-heading text-lg font-bold tracking-tight text-white">
          Realcraft <span className="cinematic-heading">AI</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href="/#features" className="text-sm text-zinc-300 hover:text-white transition-colors">
            Features
          </Link>
          <Link href="/#gallery" className="text-sm text-zinc-300 hover:text-white transition-colors">
            Gallery
          </Link>
          <Link href="/#pricing" className="text-sm text-zinc-300 hover:text-white transition-colors">
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <DevModeBadge />
          {session ? (
            <Link href="/dashboard" className="btn-secondary !px-5 !py-2 text-xs">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-zinc-300 hover:text-white transition-colors">
                Log in
              </Link>
              <Link href="/register" className="btn-primary !px-5 !py-2 text-xs">
                Create Story
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
