// File: server/src/scripts/generateDailyJourney.ts

import 'dotenv/config';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import DailyJourney from '../models/DailyJourney'; // We will create this model next.

if (!process.env.GEMINI_API_KEY || !process.env.MONGO_URI) {
  throw new Error('GEMINI_API_KEY and MONGO_URI must be defined');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const generativeModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Generates 5 pairs of linked CA and PYQ questions.
const generateJourneyFromAI = async (date: string) => {
  const prompt = `
    You are an elite AI mentor for UPSC CSE aspirants. Your task is to create a "Daily Learning Journey" for today, ${date}.
    This journey consists of exactly 5 pairs of questions. Each pair MUST contain:
    1.  'ca_question': A thought-provoking question on a significant national or international current affairs topic from the last 48 hours.
    2.  'related_pyq': A REAL UPSC CSE Mains (GS 1-4) Previous Year Question that is conceptually linked to the 'ca_question'. The link should be logical, allowing an aspirant to apply knowledge from the current event to the static PYQ.

    The goal is to bridge the gap between dynamic current affairs and the static syllabus.

    IMPORTANT INSTRUCTIONS:
    - The output MUST be a single, valid JSON object with a single key "journey" which is an array of 5 objects.
    - Each object in the array must have two keys: "ca_question" and "related_pyq".
    - Include the UPSC year for the PYQ, e.g., "(UPSC 2019)".
    - Do NOT include any markdown, explanations, or text outside the JSON structure.

    Example Output Structure:
    {
      "journey": [
        {
          "ca_question": "Analyze the recent RBI monetary policy's impact on controlling inflation while promoting growth.",
          "related_pyq": "Do you agree that the Indian economy has experienced V-shaped recovery? Give reasons in support of your answer. (UPSC 2021)"
        },
        {
          "ca_question": "Examine the geopolitical significance of India's 'Neighborhood First' policy in the context of the recent developments in the Maldives.",
          "related_pyq": "‘India’s relations with Israel have, of late, acquired a depth and diversity, which cannot be rolled back.’ Discuss. (UPSC 2018)"
        }
      ]
    }
  `;

  try {
    const result = await generativeModel.generateContent(prompt);
    let responseText = result.response.text();
    // Clean the response to extract only the JSON part.
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      responseText = jsonMatch[1];
    }
    const parsed = JSON.parse(responseText);
    return parsed.journey; // Return the array of question pairs.
  } catch (error) {
    console.error('Error generating journey from AI:', error);
    return null;
  }
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);

    const todayQueryString = new Date().toISOString().split('T')[0];
    const todayDisplayString = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });

    const existing = await DailyJourney.findOne({ journeyDate: todayQueryString });
    if (existing) {
      console.log(`Journey for ${todayQueryString} already exists.`);
      return;
    }

    console.log('Generating new daily journey from AI...');
    const questions = await generateJourneyFromAI(todayDisplayString);
    if (!questions || questions.length === 0) {
      throw new Error('Failed to generate questions.');
    }

    // Save the entire journey as a single document.
    const newJourney = new DailyJourney({
      journeyDate: todayQueryString,
      questions: questions,
    });

    await newJourney.save();
    console.log('Successfully saved new daily journey.');

  } catch (error) {
    console.error('An error occurred during the journey generation:', error);
  } finally {
    await mongoose.disconnect();
  }
};

run();