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

// Compatibility shape for the premium assistant endpoints.
export interface JourneyApiResponse {
  journey?: QuestionPair[];
  isExhausted: boolean;
  message?: string;
}

const getDefaultApiBaseUrl = () => {
  if (import.meta.env.DEV) return '';
  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return '';
  }
  return '';
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || getDefaultApiBaseUrl();

const API = axios.create({
  baseURL: API_BASE_URL,
});

API.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;
  const token = window.localStorage.getItem('authToken');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const disabledJourneyMessage = 'Sarathi is ready for Study Hub, portfolio, exam, software, and general learning guidance.';

export const fetchDailyJourney = async (): Promise<JourneyApiResponse> => {
  try {
    const { data } = await API.get('/api/suggestions/today');
    return data;
  } catch (error) {
    console.error("Error checking assistant suggestions:", error);
    return { 
      isExhausted: true, 
      message: disabledJourneyMessage,
      journey: [],
    };
  }
};

export const fetchJourneyByDate = async (_date: string): Promise<Suggestion[]> => {
  const { data } = await API.get('/api/suggestions/by-date');
  return data;
};


export default API;
