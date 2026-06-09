// File: src/utils/aiFallback.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';

const getEnvNumber = (name: string, fallback: number, min = 1000, max = 60000) => {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
};

const AI_PROVIDER_TIMEOUT_MS = getEnvNumber('AI_PROVIDER_TIMEOUT_MS', 9000, 2500, 45000);
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const xaiApiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY || '';
const groqApiKey = process.env.GROQ_API_KEY || '';
const openRouterApiKey = process.env.OPENROUTER_API_KEY || '';

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const groq = new Groq({ apiKey: groqApiKey });
const xai = new OpenAI({
  baseURL: process.env.XAI_BASE_URL || 'https://api.x.ai/v1',
  apiKey: xaiApiKey,
});
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: openRouterApiKey,
});

const withProviderTimeout = async <T>(promise: Promise<T>, provider: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${provider} timed out after ${AI_PROVIDER_TIMEOUT_MS}ms`)), AI_PROVIDER_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const runGemini = async (prompt: string) => {
  if (!genAI) throw new Error('Gemini is not configured.');
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
  const result = await withProviderTimeout(model.generateContent(prompt), 'Gemini');
  return result.response.text();
};

const runGrok = async (prompt: string) => {
  if (!xaiApiKey) throw new Error('Grok is not configured.');
  const response = await withProviderTimeout(xai.chat.completions.create({
    model: process.env.XAI_MODEL || process.env.GROK_MODEL || 'grok-3-mini-latest',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.35,
  }), 'Grok');
  return response.choices[0]?.message?.content || '';
};

const runGroq = async (prompt: string) => {
  if (!groqApiKey) throw new Error('Groq is not configured.');
  const response = await withProviderTimeout(groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.35,
  }), 'Groq');
  return response.choices[0]?.message?.content || '';
};

const runOpenRouter = async (prompt: string) => {
  if (!openRouterApiKey) throw new Error('OpenRouter is not configured.');
  const response = await withProviderTimeout(openrouter.chat.completions.create({
    model: process.env.OPENROUTER_MODEL || 'openrouter/auto',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.35,
  }), 'OpenRouter');
  return response.choices[0]?.message?.content || '';
};

/**
 * Text generation for admin/background AI tasks.
 * Provider order: Gemini -> Grok/xAI -> Groq -> OpenRouter.
 */
export async function generateTextWithFallback(prompt: string): Promise<string> {
  const providers: Array<[string, () => Promise<string>]> = [
    ['Gemini', () => runGemini(prompt)],
    ['Grok', () => runGrok(prompt)],
    ['Groq', () => runGroq(prompt)],
    ['OpenRouter', () => runOpenRouter(prompt)],
  ];

  const failures: string[] = [];

  for (const [name, runProvider] of providers) {
    try {
      const text = await runProvider();
      if (text.trim()) return text;
      failures.push(`${name}: empty response`);
    } catch (error: any) {
      failures.push(`${name}: ${error?.message || 'failed'}`);
    }
  }

  throw new Error(`AI services are currently unavailable. ${failures.join(' | ')}`);
}
