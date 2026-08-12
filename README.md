# Realcraft AI (Next.js + Vercel)

Turn a voice recording into a cinematic 3D-style animated story video, ready for TikTok, Reels, and Shorts.

## Stack

- **Next.js 15** (App Router, TypeScript) + Tailwind CSS
- **Prisma** + **Neon** (PostgreSQL)
- **Auth.js** (credentials-based sessions)
- **Vercel Blob** for audio/image/video storage
- **Inngest** for the durable background pipeline (transcribe → split scenes → generate images → render)
- **FFmpeg** (bundled static binary) for the cinematic render, **OpenAI** (Whisper + image generation) for the AI steps

## Local setup

```bash
npm install
cp .env.example .env   # fill in real values — see below
npx prisma db push     # or: npx prisma migrate deploy
npm run dev
```

## Free Local Development (Dev Mode)

You can develop and test the entire product locally for **$0** — no OpenAI key,
no Blob storage, no Inngest account — using the built-in mock/dev mode:

```bash
npm install
cp .env.example .env   # NEXT_PUBLIC_DEV_MODE=true by default
npm run dev
```

That's it. No `OPENAI_API_KEY`, `BLOB_READ_WRITE_TOKEN`, or Inngest keys are
required while `NEXT_PUBLIC_DEV_MODE=true` (you still need `DATABASE_URL` /
`DIRECT_URL` pointed at a real Postgres — Neon has a free tier — since dev
mode still exercises real database writes, just no paid AI/render calls).

With dev mode on:

- Creating a story skips Whisper, image generation, and FFmpeg entirely —
  scenes are populated with a fixed mock transcript and deterministic
  [Picsum](https://picsum.photos) placeholder images (`src/lib/mock-data.ts`,
  `src/lib/mock-scene-generator.ts`).
- The generation-status page shows a realistic ~8 second progress animation
  (`src/lib/mock-progress.ts`) before landing on a completed preview.
- The "video" is a small pre-rendered placeholder MP4
  (`public/demo/demo-story.mp4`) — fully downloadable, no rendering cost.
- A **DEV MODE** badge appears in the nav/dashboard, plus a floating
  "No API credits are being used" banner, so it's never ambiguous which mode
  you're in.
- `src/services/whisper.ts`, `image-generation.ts`, and `video-render.ts` all
  throw immediately if somehow invoked while dev mode is on, as a safety net
  against accidental billing.

Want the dashboard pre-populated instead of starting empty? Run:

```bash
npm run seed:demo
```

This upserts a `demo@realcraft.ai` user (password printed to the console) with
3 completed demo videos.

Set `NEXT_PUBLIC_DEV_MODE=false` (and fill in the real API keys below) to
exercise the actual OpenAI/FFmpeg/Inngest pipeline.

## Required environment variables

See `.env.example` for the full list. Notes on the trickier ones:

- **`DATABASE_URL` / `DIRECT_URL`** — both come from Neon. Use the **pooled** endpoint (hostname contains `-pooler`) for `DATABASE_URL`, and the **direct** endpoint (no `-pooler`) for `DIRECT_URL`. Prisma uses `DIRECT_URL` for migrations — pointing migrations at a pooled/PgBouncer connection can fail on multi-statement DDL.
- **`BLOB_READ_WRITE_TOKEN`** — from the Vercel dashboard: Storage → Create a Blob store → connect it to this project. Vercel injects this automatically for deployed environments; only needed manually for local dev.
- **`INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`** — from [app.inngest.com](https://app.inngest.com) after creating an app and connecting it to this Vercel project (Inngest has an official Vercel integration that sets these automatically).
- **`AUTH_SECRET`** — generate with `npx auth secret`.

## Deploying to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import the repo in Vercel.
3. Add a **Neon** Postgres integration (or paste your own Neon connection strings as env vars) and a **Vercel Blob** store from the Storage tab.
4. Add the Inngest integration (or manually set `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` and point Inngest's dashboard at `https://<your-domain>/api/inngest`).
5. Set `OPENAI_API_KEY` and the rest of `.env.example`'s values in Vercel's Environment Variables settings.
6. Deploy. Run `npx prisma migrate deploy` (or `db push`) against the production `DIRECT_URL` once, either via Vercel's build command or manually from your machine — the database schema doesn't create itself.

## Why this stack instead of the original Laravel plan

This project started as a Laravel + FTP-hosted deployment, but the target host turned out to block all outbound network connections from PHP (no reachable database, no reachable OpenAI API) — a dead end no amount of application code could fix. Vercel + Neon + Inngest sidesteps that entirely: serverless functions make outbound calls freely, and Inngest gives the multi-minute AI pipeline durable step-by-step execution instead of relying on a single request or a persistent queue worker.
