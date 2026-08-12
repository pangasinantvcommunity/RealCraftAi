/**
 * Seeds the dashboard with 3 completed demo videos so the UI has something
 * to show without ever calling OpenAI/FFmpeg. Safe to run repeatedly —
 * upserts a demo user and clears its previous demo videos first.
 *
 * Usage: npm run seed:demo
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { generateMockScenes } from "../src/lib/mock-scene-generator";
import { MOCK_TRANSCRIPT } from "../src/lib/mock-data";
import { MOCK_VIDEO_URL } from "../src/lib/mock-video";

const prisma = new PrismaClient();

const DEMO_USER_EMAIL = "demo@realcraft.ai";
const DEMO_USER_PASSWORD = "DemoPassword123!";
const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {},
    create: { name: "Demo User", email: DEMO_USER_EMAIL, passwordHash },
  });

  await prisma.video.deleteMany({ where: { userId: user.id } });

  const now = Date.now();
  const titles = [
    "The Glowing Lantern",
    "Journey Through the Enchanted Forest",
    "The Village of Music and Light",
  ];

  for (let i = 0; i < 3; i++) {
    const createdAt = new Date(now - (i + 1) * DAY_MS);
    const mockScenes = generateMockScenes();

    const video = await prisma.video.create({
      data: {
        userId: user.id,
        status: "completed",
        audioUrl: `dev-mode://local-placeholder/${titles[i].toLowerCase().replace(/\s+/g, "-")}.webm`,
        transcript: MOCK_TRANSCRIPT,
        videoUrl: MOCK_VIDEO_URL,
        durationSeconds: 8,
        metadata: { devMode: true, seeded: true, title: titles[i] },
        createdAt,
        updatedAt: createdAt,
      },
    });

    await prisma.scene.createMany({
      data: mockScenes.map((scene) => ({
        videoId: video.id,
        sceneOrder: scene.order,
        prompt: scene.prompt,
        subtitle: scene.subtitle,
        imageUrl: scene.imageUrl,
      })),
    });
  }

  console.log(`Seeded 3 demo videos for ${DEMO_USER_EMAIL} (password: ${DEMO_USER_PASSWORD})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
