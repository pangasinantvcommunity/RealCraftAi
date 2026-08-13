import { GoogleGenAI } from "@google/genai";

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// "-latest" alias so this keeps working as Google rotates model versions,
// rather than pinning a dated id that gets deprecated (e.g. gemini-2.5-flash
// is already 404 "no longer available to new users" as of this writing).
// Override via GEMINI_TEXT_MODEL if needed.
export const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL ?? "gemini-flash-latest";
