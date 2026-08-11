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
