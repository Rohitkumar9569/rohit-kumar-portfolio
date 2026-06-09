import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCachedLocalLibraryItems,
  getLocalLibraryItems,
  hasCachedLocalLibraryItems,
  removeLocalLibraryItem,
  STUDY_LIBRARY_UPDATE_EVENT,
  type LocalLibraryItem,
} from '../utils/studyLibrary';

export const useStudyLibrary = () => {
  const [items, setItems] = useState<LocalLibraryItem[]>(() => getCachedLocalLibraryItems());
  const [isLoading, setLoading] = useState(() => !hasCachedLocalLibraryItems());
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const refresh = useCallback(async () => {
    if (!hasCachedLocalLibraryItems() && itemsRef.current.length === 0) setLoading(true);
    try {
      setItems(await getLocalLibraryItems());
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (slug: string) => {
    await removeLocalLibraryItem(slug);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    window.addEventListener(STUDY_LIBRARY_UPDATE_EVENT, refresh);
    return () => window.removeEventListener(STUDY_LIBRARY_UPDATE_EVENT, refresh);
  }, [refresh]);

  return { items, isLoading, refresh, remove };
};
