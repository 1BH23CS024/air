import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY is not set in the environment.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const modelName = "gemini-2.5-flash-lite";

/**
 * Sends text data to the Gemini API for summarization.
 * @param rawData The large text string to be summarized.
 * @returns A promise that resolves to the summarized text.
 */
export async function summarizeCSV(rawData: string) {
  const fullPrompt = `Summarize the provided data rows (unixTime, newsHeadLine, publisher) into a detailed, sub-300-word narrative that preserves all key facts:\n${rawData}\nDo not include publisher names.`;

  console.log("Sending data to Gemini API for initial summary");

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: fullPrompt,
    });
    const generatedText: string = String(response.text);
    console.log("Summary:", generatedText);
    return generatedText;
  } catch (error) {
    console.error("Gemini API Error in summarizeText:", error);
    throw new Error("Failed to generate summary from API.");
  }
}

/**
 * Answers a follow-up question based ONLY on a previous summary.
 * @param summaryContext The previous summary text.
 * @param followUpQuery The user's new question.
 * @returns A promise that resolves to the answer text.
 */
export async function answerFromSummary(
  summaryContext: string,
  followUpQuery: string
) {
  const fullPrompt = `You are a helpful assistant. Based ONLY on the following news summary, answer the user's question concisely. If the information to answer the question is not present in the summary, you must politely state that the answer is not in the provided context.

Summary:
---
${summaryContext}
---

Question: "${followUpQuery}"`;

  console.log("Sending follow-up question to Gemini API");
  console.log("Follow-up Query:", followUpQuery);

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: fullPrompt,
    });
    const generatedText: string = String(response.text);
    console.log("Answer:", generatedText);
    return generatedText;
  } catch (error) {
    console.error("Gemini API Error in answerFromSummary:", error);
    throw new Error("Failed to generate answer from API.");
  }
}
