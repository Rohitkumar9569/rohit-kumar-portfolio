// File: client/src/api.ts

import axios from 'axios';

// Defines the shape of a single question for the frontend.
export interface Suggestion {
  _id: string; // The question text itself will be the ID.
  questionText: string;
  originalIndex: number; // To display the number 1-10.
  isPYQ: boolean; // To identify if the question is a PYQ or CA.
}

// The shape of a pair from the backend.
export interface QuestionPair {
  ca_question: string;
  related_pyq: string;
}

// The shape of the API response.
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
 * It's a simple GET request with no parameters.
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

export default API;