import type { StudyResource } from '../studyHubApi';

const CACHE_NAME = 'study-hub-resource-files-v1';

export const canUseCacheStorage = () => {
  return typeof window !== 'undefined' && 'caches' in window;
};

export const getResourceFileUrl = (resource: StudyResource) => {
  return resource.fileUrl || resource.externalLinks?.find((link) => link.url.toLowerCase().includes('.pdf'))?.url;
};

export const cacheStudyResourceFile = async (resource: StudyResource) => {
  const fileUrl = getResourceFileUrl(resource);
  if (!fileUrl) {
    throw new Error('No file URL available for this resource.');
  }

  if (!canUseCacheStorage()) {
    throw new Error('Cache Storage is not available in this browser.');
  }

  const cache = await window.caches.open(CACHE_NAME);
  const response = await fetch(fileUrl, { mode: 'cors' });

  if (!response.ok) {
    throw new Error('Could not download this resource for offline access.');
  }

  const clonedResponse = response.clone();
  await cache.put(fileUrl, clonedResponse);

  const sizeHeader = response.headers.get('content-length');
  return {
    fileUrl,
    sizeBytes: sizeHeader ? Number(sizeHeader) : undefined,
    cachedAt: new Date().toISOString(),
  };
};

export const isStudyResourceFileCached = async (resource: StudyResource) => {
  const fileUrl = getResourceFileUrl(resource);
  if (!fileUrl || !canUseCacheStorage()) return false;

  const cache = await window.caches.open(CACHE_NAME);
  const match = await cache.match(fileUrl);
  return Boolean(match);
};

export const getCachedStudyResourceObjectUrl = async (resource: StudyResource) => {
  const fileUrl = getResourceFileUrl(resource);
  if (!fileUrl || !canUseCacheStorage()) return null;

  const cache = await window.caches.open(CACHE_NAME);
  const match = await cache.match(fileUrl);
  if (!match) return null;

  const blob = await match.blob();
  return window.URL.createObjectURL(blob);
};
