import { useCallback, useEffect, useState } from 'react';
import {
  clearLocalStudyPreferences,
  getLocalStudyPreferences,
  saveLocalStudyPreferences,
  type LocalStudyPreferences,
} from '../utils/studyPreferences';

export const useStudyPreferences = () => {
  const [preferences, setPreferences] = useState<LocalStudyPreferences>(() => getLocalStudyPreferences());

  const savePreferences = useCallback((nextPreferences: Partial<LocalStudyPreferences>) => {
    const saved = saveLocalStudyPreferences(nextPreferences);
    setPreferences(saved);
    return saved;
  }, []);

  const clearPreferences = useCallback(() => {
    clearLocalStudyPreferences();
    setPreferences(getLocalStudyPreferences());
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'study-hub-preferences') setPreferences(getLocalStudyPreferences());
    };

    const handlePreferencesUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<LocalStudyPreferences>;
      setPreferences(customEvent.detail || getLocalStudyPreferences());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('study-preferences-updated', handlePreferencesUpdated);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('study-preferences-updated', handlePreferencesUpdated);
    };
  }, []);

  return { preferences, savePreferences, clearPreferences };
};
