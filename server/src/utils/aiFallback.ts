// File: src/utils/aiFallback.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';

// 1. Initialize all AI Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || '',
});

/**
 * Normal Text Generation (For Daily Journey / Background Tasks)
 */
export async function generateTextWithFallback(prompt: string): Promise<string> {
  // TIER 1: GEMINI
  try {
    console.log("🟢 [AI] Trying Gemini API...");
    const result = await geminiModel.generateContent(prompt);
    return result.response.text();
  } catch (geminiError: any) {
    console.warn("⚠️ [AI] Gemini failed. Switching to Groq...", geminiError.message);
  }

  // TIER 2: GROQ (Llama 3)
  try {
    console.log("🟡 [AI] Trying Groq API...");
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192',
      temperature: 0.7,
    });
    return chatCompletion.choices[0]?.message?.content || "";
  } catch (groqError: any) {
    console.warn("⚠️ [AI] Groq failed. Switching to OpenRouter...", groqError.message);
  }

  // TIER 3: OPENROUTER (Free Meta Llama Model)
  try {
    console.log("🟠 [AI] Trying OpenRouter Free API...");
    const response = await openrouter.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct:free",
      messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0]?.message?.content || "";
  } catch (openRouterError: any) {
    console.error("❌ [AI] All AI APIs failed!", openRouterError.message);
    throw new Error("AI Services are currently unavailable.");
  }
}