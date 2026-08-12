import Link from "next/link";
import HeroScene from "@/components/HeroScene";
import CinematicAnimations from "@/components/CinematicAnimations";

const FEATURES = [
  { icon: "✍️", title: "Prompt to Story", desc: "Describe an idea or paste a full screenplay — no editing skills required." },
  { icon: "🧠", title: "Story Understanding", desc: "Title, summary, characters, locations, and emotional arc, extracted automatically." },
  { icon: "🎬", title: "6-Scene Story Engine", desc: "Your story is automatically split into six cinematic beats." },
  { icon: "🖼️", title: "AI Illustration", desc: "Every scene becomes a Pixar-quality 3D cinematic illustration in your chosen style." },
  { icon: "✨", title: "Cinematic Rendering", desc: "Ken Burns motion, crossfades, subtitles, and vignette — all automatic." },
  { icon: "📱", title: "Vertical & Social Ready", desc: "1080×1920 MP4 optimized for TikTok, Reels, and Shorts." },
];

const TESTIMONIALS = [
  { name: "Marisol T.", role: "Content Creator", quote: "I typed one line about my brand story and had a finished cinematic video before I finished my coffee." },
  { name: "Jayson R.", role: "Small Business Owner", quote: "Realcraft AI made our brand story look like a Pixar short. Our Reels engagement tripled." },
  { name: "Ana Dela Cruz", role: "Educator", quote: "I paste in a short screenplay prompt and get a 6-scene storyboard with perfect pacing." },
];

export default function HomePage() {
  return (
    <>
      <CinematicAnimations />

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void">
        <HeroScene />
        <div className="pointer-events-none absolute inset-0 bg-cinematic-glow" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-void/40 to-void" />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <p
            data-hero-eyebrow
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-violet-300 backdrop-blur-md"
          >
            <span className="status-dot bg-cyan-400 text-cyan-400" /> AI Cinematic Story Studio
          </p>

          <h1
            data-hero-headline
            className="cinematic-heading font-heading text-5xl font-bold leading-[1.05] sm:text-6xl md:text-7xl"
          >
            Create Cinematic Stories from Text
          </h1>

          <p data-hero-subtitle className="mx-auto mt-6 max-w-2xl text-lg text-zinc-300 sm:text-xl">
            Describe an idea. Generate a 3D animated story. Share it instantly.
          </p>

          <div data-hero-cta className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register" className="btn-primary">
              Create Cinematic Story
            </Link>
            <a href="#gallery" className="btn-secondary">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 4l10 6-10 6V4z" />
              </svg>
              Watch Demo
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="relative mx-auto max-w-7xl px-6 py-28">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <h2 className="cinematic-heading font-heading text-4xl font-bold sm:text-5xl">
            A Full AI Film Studio, Instantly
          </h2>
          <p className="mt-4 text-zinc-400">From text prompt to vertical cinematic video in six automated scenes.</p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="tilt-card group glass-panel p-8 transition-transform duration-300 hover:-translate-y-1"
              data-reveal
              data-tilt
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 text-2xl">
                {feature.icon}
              </div>
              <h3 className="font-heading text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="gallery" className="relative mx-auto max-w-7xl px-6 py-28">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <h2 className="cinematic-heading font-heading text-4xl font-bold sm:text-5xl">
            Stories Crafted by Realcraft AI
          </h2>
          <p className="mt-4 text-zinc-400">Every video, a cinematic short — generated in minutes.</p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-panel aspect-[9/16] overflow-hidden" data-reveal>
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-900/40 to-cyan-900/20 text-4xl">
                🎞️
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 py-28">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <h2 className="cinematic-heading font-heading text-4xl font-bold sm:text-5xl">Loved by Storytellers</h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="glass-panel p-8" data-reveal>
              <p className="text-zinc-200">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-6 font-heading text-sm font-semibold text-white">{t.name}</p>
              <p className="text-xs text-zinc-500">{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="relative mx-auto max-w-5xl px-6 py-28 text-center">
        <div className="glass-panel relative overflow-hidden p-12" data-reveal>
          <div className="pointer-events-none absolute inset-0 bg-aurora bg-[length:200%_200%] opacity-10 animate-gradient-shift" />
          <h2 className="cinematic-heading font-heading text-3xl font-bold sm:text-4xl">
            Start Free — 3 Stories a Day
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Upgrade anytime for unlimited cinematic stories, priority rendering, and 4K exports.
          </p>
          <Link href="/register" className="btn-primary mt-8 inline-flex">
            Create Your First Story
          </Link>
        </div>
      </section>
    </>
  );
}
