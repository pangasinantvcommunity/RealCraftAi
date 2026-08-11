import OpenAI from "openai";
import { toFile } from "openai/uploads";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
  const response = await openai.audio.transcriptions.create({
    model: process.env.OPENAI_WHISPER_MODEL ?? "whisper-1",
    file: await toFile(audioBuffer, filename),
    response_format: "json",
  });

  const transcript = response.text.trim();
  if (!transcript) {
    throw new Error("Whisper returned an empty transcript.");
  }

  return transcript;
}
