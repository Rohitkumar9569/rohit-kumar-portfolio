import { useCallback, useEffect, useState } from 'react';
import {
  clearRecentStudyItems,
  getRecentStudyItems,
  STUDY_ACTIVITY_UPDATE_EVENT,
  type RecentStudyItem,
} from '../utils/studyActivity';

export const useStudyActivity = () => {
  const [recentItems, setRecentItems] = useState<RecentStudyItem[]>(() => getRecentStudyItems());

  const refresh = useCallback(() => {
    setRecentItems(getRecentStudyItems());
  }, []);

  const clear = useCallback(() => {
    clearRecentStudyItems();
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'study-hub-recent-activity') refresh();
    };

    const handleActivityUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<RecentStudyItem[]>;
      setRecentItems(customEvent.detail || getRecentStudyItems());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(STUDY_ACTIVITY_UPDATE_EVENT, handleActivityUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(STUDY_ACTIVITY_UPDATE_EVENT, handleActivityUpdate);
    };
  }, [refresh]);

  return { recentItems, refresh, clear };
};
