// client/src/utils/studyOfflineCache.ts

import type { StudyResource } from '../studyHubApi';

const CACHE_NAME = 'study-hub-resource-files-v1';

export const canUseCacheStorage = () => {
  return typeof window !== 'undefined' && 'caches' in window;
};

export const getResourceFileUrl = (resource: StudyResource) => {
  // PYQ ya Notes ke liye main file URL uthao
  return resource.fileUrl || resource.externalLinks?.find((link) => link.url.toLowerCase().includes('.pdf'))?.url;
};

/**
 * 1. PDF download aur cache karne ka function
 */
export const cacheStudyResourceFile = async (resource: StudyResource) => {
  const fileUrl = getResourceFileUrl(resource);
  if (!fileUrl) throw new Error('No file URL available.');
  if (!canUseCacheStorage()) throw new Error('Cache not supported.');

  const cache = await window.caches.open(CACHE_NAME);
  
  // Range Request support ke liye headers bhejo
  const response = await fetch(fileUrl, { 
    method: 'GET',
    mode: 'cors',
    headers: { 'Range': 'bytes=0-' } 
  });

  if (!response.ok) throw new Error('Download failed');

  // Response ko cache mein daal do
  await cache.put(fileUrl, response.clone());

  return {
    cachedAt: new Date().toISOString(),
    sizeBytes: Number(response.headers.get('content-length') || 0),
  };
};

/**
 * 2. File check karne ke liye
 */
export const isStudyResourceFileCached = async (resource: StudyResource) => {
  const fileUrl = getResourceFileUrl(resource);
  if (!fileUrl || !canUseCacheStorage()) return false;

  const cache = await window.caches.open(CACHE_NAME);
  const match = await cache.match(fileUrl);
  return !!match;
};

/**
 * 3. Instant loading ke liye Blob URL (Secret sauce)
 */
export const getCachedStudyResourceObjectUrl = async (resource: StudyResource) => {
  const fileUrl = getResourceFileUrl(resource);
  if (!fileUrl || !canUseCacheStorage()) return null;

  const cache = await window.caches.open(CACHE_NAME);
  const match = await cache.match(fileUrl);
  if (!match) return null;

  // Blob mein convert karo taaki PDF viewer ise "Local File" ki tarah treat kare
  const blob = await match.blob();
  return window.URL.createObjectURL(blob);
};

/**
 * 4. Cache clear karne ke liye (Agar storage full ho jaye)
 */
export const clearStudyResourceCache = async () => {
  if (!canUseCacheStorage()) return;
  await window.caches.delete(CACHE_NAME);
};