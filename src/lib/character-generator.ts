import { isDevMode } from "@/lib/config";
import { gemini, GEMINI_TEXT_MODEL } from "@/lib/gemini";

export type GeneratedCharacterSheet = {
  age: string;
  gender: string;
  appearance: string;
  wardrobe: string;
  personality: string;
  voiceTone: string;
  cinematicNotes: string;
};

const CHARACTER_SHEET_SCHEMA = {
  type: "object",
  properties: {
    age: { type: "string" },
    gender: { type: "string" },
    appearance: { type: "string" },
    wardrobe: { type: "string" },
    personality: { type: "string" },
    voiceTone: { type: "string" },
    cinematicNotes: { type: "string" },
  },
  required: ["age", "gender", "appearance", "wardrobe", "personality", "voiceTone", "cinematicNotes"],
} as const;

/** Deterministic, zero-cost character-sheet filler used in dev mode — no Gemini call. */
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

  const response = await gemini.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: `Name: ${name}\nRole: ${role || "unspecified"}`,
    config: {
      systemInstruction:
        "You are a character designer for cinematic AI-generated video. Given a character name and role, " +
        "produce a character sheet. Keep each field to 1-2 sentences. appearance should be vivid and specific " +
        "enough to keep the character visually consistent across scenes.",
      responseMimeType: "application/json",
      responseSchema: CHARACTER_SHEET_SCHEMA,
    },
  });

  const raw = response.text;
  if (!raw) throw new Error("Character generator returned no content.");

  return JSON.parse(raw) as GeneratedCharacterSheet;
}
