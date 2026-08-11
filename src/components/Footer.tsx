import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative mt-32 overflow-hidden border-t border-white/5">
      <div className="pointer-events-none absolute inset-0 bg-cinematic-glow opacity-40" />

      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <p className="font-heading text-lg font-bold text-white">
              Realcraft <span className="cinematic-heading">AI</span>
            </p>
            <p className="mt-3 max-w-xs text-sm text-zinc-400">
              Turn your voice into a cinematic 3D animated story — built for TikTok, Reels, and Shorts.
            </p>
          </div>

          <div>
            <p className="font-heading text-sm font-semibold text-white">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li><Link href="/#features" className="hover:text-white">Features</Link></li>
              <li><Link href="/#gallery" className="hover:text-white">Gallery</Link></li>
              <li><Link href="/#pricing" className="hover:text-white">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-heading text-sm font-semibold text-white">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li><Link href="#" className="hover:text-white">About</Link></li>
              <li><Link href="#" className="hover:text-white">Contact</Link></li>
              <li><Link href="/sitemap.xml" className="hover:text-white">Sitemap</Link></li>
            </ul>
          </div>

          <div>
            <p className="font-heading text-sm font-semibold text-white">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li><Link href="#" className="hover:text-white">Privacy</Link></li>
              <li><Link href="#" className="hover:text-white">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-zinc-500 md:flex-row">
          <p>&copy; {new Date().getFullYear()} Realcraft AI. All rights reserved.</p>
          <p className="cinematic-heading font-heading">Cinematic AI, crafted for creators.</p>
        </div>
      </div>
    </footer>
  );
}
