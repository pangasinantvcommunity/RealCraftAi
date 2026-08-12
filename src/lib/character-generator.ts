import OpenAI from "openai";
import { isDevMode } from "@/lib/config";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type GeneratedCharacterSheet = {
  age: string;
  gender: string;
  appearance: string;
  wardrobe: string;
  personality: string;
  voiceTone: string;
  cinematicNotes: string;
};

/** Deterministic, zero-cost character-sheet filler used in dev mode — no OpenAI call. */
function generateMockCharacterSheet(name: string, role: string): GeneratedCharacterSheet {
  const roleLabel = role.trim() || "supporting character";
  return {
    age: "30s",
    gender: "unspecified",
    appearance: `${name} has a distinctive, memorable look befitting a ${roleLabel} — expressive eyes, a confident posture, and a face that reads clearly in wide cinematic shots.`,
    wardrobe: `Practical, era-appropriate wardrobe that signals their role as the ${roleLabel}.`,
    personality: `Driven and resourceful, with a clear motivation tied to their role as the ${roleLabel}.`,
    voiceTone: "Warm but grounded, mid-range pitch, measured pacing.",
    cinematicNotes: "Favor medium close-ups; soft key light with a subtle rim light for depth.",
  };
}

export async function generateCharacterSheet(name: string, role: string): Promise<GeneratedCharacterSheet> {
  if (isDevMode) {
    return generateMockCharacterSheet(name, role);
  }

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_TEXT_MODEL ?? "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a character designer for cinematic AI-generated video. Given a character name and role, " +
          "respond with JSON only, exactly matching this shape: " +
          '{"age": string, "gender": string, "appearance": string, "wardrobe": string, "personality": string, ' +
          '"voiceTone": string, "cinematicNotes": string}. Keep each field to 1-2 sentences. ' +
          "appearance should be vivid and specific enough to keep the character visually consistent across scenes.",
      },
      { role: "user", content: `Name: ${name}\nRole: ${role || "unspecified"}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Character generator returned no content.");

  return JSON.parse(raw) as GeneratedCharacterSheet;
}
