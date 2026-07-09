import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateText(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 8192 },
  });
  return response.text ?? "";
}

export async function generateJSON<T>(prompt: string): Promise<T> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });
  const text = response.text ?? "{}";
  return JSON.parse(text) as T;
}
