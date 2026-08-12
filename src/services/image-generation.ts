import OpenAI from "openai";
import { isDevMode } from "@/lib/config";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateSceneImage(prompt: string): Promise<Buffer> {
  if (isDevMode) {
    throw new Error("OpenAI API disabled in development mode");
  }

  const response = await openai.images.generate({
    model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
    prompt,
    size: "1024x1792",
    n: 1,
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("Image generation returned no image data.");
  }

  return Buffer.from(b64, "base64");
}
