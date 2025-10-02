// src/hooks/useCachedData.ts

import { useState, useEffect } from 'react';
import API from '../api';

export function useCachedData<T>(cacheKey: string, apiUrl: string) {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Try to load data from the browser's cache first
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        setData(JSON.parse(cachedData));
      }

      // 2. In the background, fetch the latest data from the server
      try {
        const response = await API.get(apiUrl);
        const freshData = response.data;

        // 3. Save the fresh data to the cache for next time
        localStorage.setItem(cacheKey, JSON.stringify(freshData));

        // 4. Update the state if the data is different from the cache
        if (JSON.stringify(freshData) !== cachedData) {
          setData(freshData);
        }
      } catch (error) {
        console.error(`Failed to fetch fresh data for ${cacheKey}:`, error);
        // If the server fails but we have cached data, we keep showing it
      }
    };

    fetchData();
  }, [cacheKey, apiUrl]);

  return data;
}