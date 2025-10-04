// File: client/src/api.ts

import axios from 'axios';

// Defines the shape of a single question for the frontend.
export interface Suggestion {
  _id: string; 
  questionText: string;
  originalIndex: number; 
  isPYQ: boolean; 
}

// The shape of a pair from the backend.
export interface QuestionPair {
  ca_question: string;
  related_pyq: string;
}

// The shape of the API response for the daily journey.
export interface JourneyApiResponse {
  journey?: QuestionPair[];
  isExhausted: boolean;
  message?: string;
}

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
});

/**
 * Fetches the daily learning journey from the backend.
 */
export const fetchDailyJourney = async (): Promise<JourneyApiResponse> => {
  try {
    const { data } = await API.get('/api/suggestions/today');
    return data;
  } catch (error) {
    console.error("Error fetching daily journey:", error);
    return { 
      isExhausted: true, 
      message: 'Failed to connect to the server.' 
    };
  }
};

// --- NEW FUNCTION ADDED ---
/**
 * Fetches a historical learning journey for a specific date.
 * @param date - The date in DD MMM YYYY format.
 */
export const fetchJourneyByDate = async (date: string): Promise<Suggestion[]> => {
  // This endpoint returns a flat array of Suggestion objects.
  const { data } = await API.get(`/api/suggestions/by-date?date=${date}`);
  return data;
};


export default API;