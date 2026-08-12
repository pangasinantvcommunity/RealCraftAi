/**
 * Seeds the dashboard with 3 completed demo videos so the UI has something
 * to show without ever calling OpenAI/FFmpeg. Safe to run repeatedly —
 * upserts a demo user and clears its previous demo videos first.
 *
 * Usage: npm run seed:demo
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { generateMockStory, getMockSceneImageUrl, slugify } from "../src/lib/mock-story";
import { MOCK_VIDEO_URL } from "../src/lib/mock-video";

const prisma = new PrismaClient();

const DEMO_USER_EMAIL = "demo@realcraft.ai";
const DEMO_USER_PASSWORD = "DemoPassword123!";
const DAY_MS = 24 * 60 * 60 * 1000;

const DEMO_PROMPTS = [
  "A glowing lantern guides a lost child through a mysterious enchanted forest at night.",
  "Two rival musicians discover their village is powered by a hidden magical light source.",
  "A young explorer journeys through a bioluminescent forest to find a legendary song.",
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {},
    create: { name: "Demo User", email: DEMO_USER_EMAIL, passwordHash },
  });

  await prisma.video.deleteMany({ where: { userId: user.id } });

  const now = Date.now();

  for (let i = 0; i < DEMO_PROMPTS.length; i++) {
    const createdAt = new Date(now - (i + 1) * DAY_MS);
    const story = generateMockStory(DEMO_PROMPTS[i], "3d-cinematic", 45);
    const titleSlug = slugify(story.title);

    const video = await prisma.video.create({
      data: {
        userId: user.id,
        status: "completed",
        prompt: DEMO_PROMPTS[i],
        style: "3d-cinematic",
        targetDuration: 45,
        aspectRatio: "9:16",
        title: story.title,
        summary: story.summary,
        emotionalArc: story.emotionalArc,
        videoUrl: MOCK_VIDEO_URL,
        metadata: { devMode: true, seeded: true },
        createdAt,
        updatedAt: createdAt,
      },
    });

    await prisma.scene.createMany({
      data: story.scenes.map((scene) => ({
        videoId: video.id,
        sceneOrder: scene.order,
        prompt: scene.imagePrompt,
        subtitle: scene.subtitle,
        imageUrl: getMockSceneImageUrl(`${titleSlug}-scene-${scene.order}`),
      })),
    });
  }

  console.log(`Seeded ${DEMO_PROMPTS.length} demo videos for ${DEMO_USER_EMAIL} (password: ${DEMO_USER_PASSWORD})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
