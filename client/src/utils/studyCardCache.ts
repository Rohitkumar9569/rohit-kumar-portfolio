import type { StudyCard } from '../studyHubApi';

const CACHE_VERSION = 1;
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24;

type StudyCardCachePayload = {
  version: number;
  savedAt: number;
  cards: StudyCard[];
};

export const getStudyCardListCacheKey = (scope: string, workspace: string, parent = 'root') =>
  `study-hub:cards:${scope}:${workspace}:${parent || 'root'}`;

export const readStudyCardListCache = (cacheKey: string): StudyCard[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as Partial<StudyCardCachePayload>;
    if (parsed.version !== CACHE_VERSION || !Array.isArray(parsed.cards)) return [];
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS) {
      window.localStorage.removeItem(cacheKey);
      return [];
    }

    return parsed.cards;
  } catch {
    window.localStorage.removeItem(cacheKey);
    return [];
  }
};

export const writeStudyCardListCache = (cacheKey: string, cards: StudyCard[]) => {
  if (typeof window === 'undefined' || !cards.length) return;

  try {
    const payload: StudyCardCachePayload = {
      version: CACHE_VERSION,
      savedAt: Date.now(),
      cards,
    };
    window.localStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch {
    // Local storage can be full or disabled; the live API data still works.
  }
};
