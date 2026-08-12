import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generateStoryVideo } from "@/inngest/functions";

// Vercel clamps this to the plan's actual ceiling if it's lower — safe to
// request the max here. Each Inngest step invocation (video-render in
// particular) can take a while, especially for episodes with many scenes.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateStoryVideo],
});
