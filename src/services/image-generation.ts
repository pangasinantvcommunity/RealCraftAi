import OpenAI, { toFile } from "openai";
import { isDevMode } from "@/lib/config";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ImageSize = "1024x1536" | "1536x1024";

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  if (url.startsWith("data:")) {
    const match = url.match(/^data:(.+?);base64,(.*)$/);
    if (!match) throw new Error("Malformed data URL for reference image.");
    return { buffer: Buffer.from(match[2], "base64"), contentType: match[1] };
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch reference image ${url}: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, contentType: response.headers.get("content-type") ?? "image/png" };
}

export async function generateSceneImage(
  prompt: string,
  options?: { size?: ImageSize; referenceImageUrls?: string[] },
): Promise<Buffer> {
  if (isDevMode) {
    throw new Error("OpenAI API disabled in development mode");
  }

  const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
  const size = options?.size ?? "1024x1536";
  const referenceImageUrls = options?.referenceImageUrls ?? [];

  const response =
    referenceImageUrls.length > 0
      ? await openai.images.edit({
          model,
          image: await Promise.all(
            referenceImageUrls.map(async (url, i) => {
              const { buffer, contentType } = await fetchImageBuffer(url);
              return toFile(buffer, `reference-${i}.png`, { type: contentType });
            }),
          ),
          prompt,
          size,
          n: 1,
        })
      : await openai.images.generate({ model, prompt, size, n: 1 });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("Image generation returned no image data.");
  }

  return Buffer.from(b64, "base64");
}
