import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import DailyJourney from '../models/DailyJourney';
import fs from 'fs';
import path from 'path';

// Ensures CommonJS compatibility for axios-retry.
const { default: axiosRetry } = require('axios-retry');

// --- Type Definitions ---
type Article = {
  source: 'The Hindu' | 'Indian Express' | 'NewsAPI';
  title: string;
  url: string;
  summary?: string;
  publishedAt: string;
};

type Pair = {
  ca_question: string | null;
  related_pyq: string | null;
  pyq_verified?: boolean;
  pyq_source_url?: string | null;
};

// --- Environment Variable Check ---
if (!process.env.GEMINI_API_KEY || !process.env.MONGO_URI) {
  throw new Error('Required environment variables are not defined');
}

// --- Client Initialization ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const generativeModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
const httpClient = axios.create({ timeout: 15000 });
axiosRetry(httpClient, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

const INDIA_TZ = 'Asia/Kolkata';

// --- Utility Functions ---
const hoursBetween = (d1: Date, d2: Date): number => Math.abs((d1.getTime() - d2.getTime()) / 36e5);

/**
 * Fetches, scrapes, and summarizes the content of a given article URL.
 */
async function getArticleContentAndSummarize(url: string): Promise<string> {
  try {
    const response = await httpClient.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(response.data);
    const articleText = $('article, .story-details, .main-content, .article-body').text();
    const cleanedText = articleText.replace(/\s\s+/g, ' ').trim().slice(0, 8000);
    if (cleanedText.length < 200) return cleanedText;
    const prompt = `Summarize the key arguments from the following news article text in about 150 words for a UPSC aspirant.\n\nArticle Text: "${cleanedText}"`;
    const result = await generativeModel.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    console.warn(`Could not summarize article at ${url}: ${error.message}`);
    return "Summary not available.";
  }
}

/**
 * Fetches and enriches a pool of relevant news articles from various sources.
 */
async function fetchAndEnrichEditorials(): Promise<Article[]> {
  let articles: Omit<Article, 'summary'>[] = [];
  const timeNow = new Date(new Date().toLocaleString('en-US', { timeZone: INDIA_TZ }));

  if (process.env.NEWSAPI_KEY) {
    console.log('Attempting to fetch news via NewsAPI...');
    try {
      const upscQuery = `(policy OR governance OR judiciary OR "Supreme Court" OR RBI OR geopolitics OR economy OR scheme OR bill OR act OR environment OR climate) NOT (sports OR cricket OR entertainment OR bollywood OR movie)`;
      // Fetches a larger set of articles to create a diverse selection pool.
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(upscQuery)}&domains=thehindu.com,indianexpress.com&language=en&pageSize=20&sortBy=publishedAt`;
      const { data } = await httpClient.get(url, { headers: { 'X-Api-Key': process.env.NEWSAPI_KEY } });
      for (const article of data.articles || []) {
        const publishedDate = new Date(article.publishedAt);
        if (hoursBetween(publishedDate, timeNow) <= 24) {
          articles.push({
            source: article.source.name.includes('Hindu') ? 'The Hindu' : 'Indian Express',
            title: article.title,
            url: article.url,
            publishedAt: article.publishedAt,
          });
        }
      }
      console.log(`NewsAPI found ${articles.length} relevant articles.`);
    } catch (e: any) {
      console.warn('NewsAPI fetch failed:', e.message);
    }
  }

  // Initiates fallback web scraping if the primary API yields insufficient results.
  if (articles.length < 10) {
    console.log('NewsAPI returned too few results. Falling back to web scraping...');
    try {
      const { data } = await httpClient.get('https://www.thehindu.com/opinion/editorial/');
      const $ = cheerio.load(data);
      $('a[href*="/opinion/editorial/"]').each((i: number, el: cheerio.Element) => {
        const title = $(el).text().trim();
        const url = $(el).attr('href');
        if (title && url && url.includes('thehindu.com')) {
          articles.push({ source: 'The Hindu', title, url, publishedAt: new Date().toISOString() });
        }
      });
    } catch (e: any) { console.warn('The Hindu scrape fallback failed:', e.message); }
  }

  const dedupedUrls = Array.from(new Set(articles.map(r => r.url)));
  // Consolidates and processes all unique articles found.
  const articlesToProcess = dedupedUrls.map(url => articles.find(r => r.url === url)!);

  console.log(`Processing and summarizing ${articlesToProcess.length} articles...`);
  const enrichedArticles: Article[] = [];
  for (const article of articlesToProcess) {
    const summary = await getArticleContentAndSummarize(article.url);
    enrichedArticles.push({ ...article, summary });
  }

  return enrichedArticles;
}

/**
 * Verifies the authenticity of a Previous Year Question (PYQ) against a local database or Google Custom Search.
 */
async function verifyPyq(pyqText: string): Promise<{ verified: boolean; url?: string | null }> {
    const normalizedQuery = pyqText.replace(/\(UPSC GS-\d, \d{4}\)/i, '').trim();
    if (process.env.PYQ_DB_PATH) {
        try {
            const dbPath = path.resolve(process.env.PYQ_DB_PATH);
            if (fs.existsSync(dbPath)) {
                const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
                const match = db.find((entry: any) => entry.question.includes(normalizedQuery));
                if (match) return { verified: true, url: match.source || null };
            }
        } catch (e: any) { console.warn('Local PYQ DB read error:', e.message); }
    }
    if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_CX) {
        try {
            const { data } = await httpClient.get('https://www.googleapis.com/customsearch/v1', {
                params: { key: process.env.GOOGLE_CSE_API_KEY, cx: process.env.GOOGLE_CSE_CX, q: `"${normalizedQuery}"` },
            });
            if (data.items && data.items.length > 0) return { verified: true, url: data.items[0].link };
        } catch (e: any) { console.warn('Google CSE verification failed:', e.message); }
    }
    return { verified: false, url: null };
}

/**
 * Generates a question pair (Current Affairs and PYQ) for a given article.
 */
async function generatePairForArticle(article: Article, dateDisplay: string): Promise<Pair | null> {
  const prompt = `You are an expert AI mentor for UPSC aspirants.
CONTEXT: An AI has summarized a news article titled "${article.title}" (Source: ${article.source}).
SUMMARY OF ARTICLE: "${article.summary}"
YOUR TASK: Based on the provided summary, create one analytical,Brainstorming Mains-style question (ca_question) and find one REAL, conceptually linked UPSC CSE Mains Previous Year Question (related_pyq).
THE GOLDEN RULE: The 'related_pyq' MUST be a 100% real, verbatim question that has appeared in a previous UPSC CSE Mains exam. You are strictly forbidden from inventing, paraphrasing, or creating questions that look like PYQs. Accuracy is the highest priority. If you cannot find a real PYQ, you MUST return null for that value.

REQUIREMENTS:
- Output ONLY a single, valid JSON object with keys "ca_question" and "related_pyq".
- "ca_question" must be a thought-provoking question based on the summary, ending with "(${article.source}, ${dateDisplay})".
- "related_pyq" must be a REAL UPSC PYQ, ending with its tag, e.g., "(UPSC GS-2, 2019)".
- CRITICAL: If you cannot find a real, matching PYQ, set the value of "related_pyq" to null. DO NOT invent a PYQ.
Produce the JSON now.`;

  try {
    const result = await generativeModel.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) throw new Error('No JSON object found in AI response');
    const parsed = JSON.parse(jsonMatch[0]);

    // Validates the generated pair, ensuring both a current affairs question and a PYQ are present.
    const { ca_question = null, related_pyq = null } = parsed;
    if (!ca_question || !related_pyq) {
        console.log(`- Discarding pair for "${article.title}" due to missing PYQ.`);
        return null;
    }

    const verification = await verifyPyq(related_pyq);
    return { ca_question, related_pyq, pyq_verified: verification.verified, pyq_source_url: verification.url };
  } catch (e: any) {
    console.error(`Failed to generate/parse pair for ${article.url}: ${e.message}`);
    return null;
  }
}

/**
 * Main orchestrator for the daily journey generation script.
 */
export const generateDailyJourney = async () => {
  console.log('🚀 Starting Daily Journey Generation...');
  let dbConnection: typeof mongoose | null = null;
  try {
    dbConnection = await mongoose.connect(process.env.MONGO_URI!);
    console.log('✅ MongoDB connected.');

    const todayQueryString = new Date().toLocaleDateString('en-GB', { timeZone: INDIA_TZ }).replace(/\//g, '-');
    const exists = await DailyJourney.findOne({ journeyDate: todayQueryString });
    if (exists) {
      console.log(`✅ Journey already exists for ${todayQueryString}. Exiting.`);
      return;
    }

    const articles = await fetchAndEnrichEditorials();
    if (articles.length === 0) throw new Error('No articles found to process.');

    console.log(`🤖 Enriched ${articles.length} articles. Now generating up to 5 complete pairs...`);
    const todayDisplay = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: INDIA_TZ });
    const pairs: Pair[] = [];
    for (const article of articles) {
      // Iterates through articles until the target number of complete pairs is generated.
      if (pairs.length >= 5) break;

      const pair = await generatePairForArticle(article, todayDisplay);
      if (pair) {
        pairs.push(pair);
        console.log(`+ Successfully generated complete pair ${pairs.length}/5.`);
      }
    }

    if (pairs.length < 5) {
        console.warn(`Warning: Could only generate ${pairs.length} complete pairs. The news content may not have had strong PYQ links today.`);
    }

    if (pairs.length === 0) throw new Error('Failed to generate any valid pairs.');

    const doc = new DailyJourney({
      journeyDate: todayQueryString,
      questions: pairs,
      meta: { generatedAt: new Date().toISOString(), sourceFetchCount: articles.length },
    });
    await doc.save();
    console.log(`✅ Successfully saved Daily Journey for ${todayQueryString} with ${pairs.length} pairs.`);

  } catch (error: any)
{
    console.error('❌ An error occurred during the main generation process:', error.message);
    throw error;
  } finally {
    if (dbConnection) {
      await dbConnection.disconnect();
      console.log('🔌 MongoDB disconnected.');
    }
  }
};

// Allows the script to be executed directly.
if (require.main === module) {
  generateDailyJourney().catch(e => {});
}