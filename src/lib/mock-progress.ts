import type { VideoStatus } from "@prisma/client";

export type SimulatedStep = { status: VideoStatus; progress: number };

/**
 * Mirrors the real pipeline's status vocabulary (see Video.status in
 * prisma/schema.prisma and StatusPoller.tsx's step list) so the existing
 * progress UI works unmodified in dev mode.
 */
const STEPS: SimulatedStep[] = [
  { status: "pending", progress: 10 },
  { status: "transcribing", progress: 25 },
  { status: "creating_scenes", progress: 40 },
  { status: "generating_images", progress: 65 },
  { status: "rendering", progress: 85 },
  { status: "completed", progress: 100 },
];

const STEP_DURATION_MS = 1300; // 6 steps * 1.3s ≈ 8s total, matching the acceptance criteria

/**
 * Stateless: derives the simulated step purely from elapsed time since the
 * video was created, so it works correctly across separate serverless
 * invocations (no reliance on an in-memory timer surviving between requests).
 */
export function getSimulatedProgress(elapsedMs: number): SimulatedStep {
  const index = Math.min(Math.floor(elapsedMs / STEP_DURATION_MS), STEPS.length - 1);
  return STEPS[index];
}

/** Async generator form, for scripts/tests that want to watch each step fire in real time. */
export async function* simulateProgress(): AsyncGenerator<SimulatedStep> {
  for (const step of STEPS) {
    await new Promise((resolve) => setTimeout(resolve, STEP_DURATION_MS));
    yield step;
  }
}
