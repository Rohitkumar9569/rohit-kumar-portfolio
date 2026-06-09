import {
  getPrimaryStudyNavPath,
  readStoredPrimaryStudyNavPath,
} from '../components/study/studyActiveRoute';
import { API_BASE_URL } from '../api';

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);
const isBrowserSafeUrl = (value: string) => /^(https?:|blob:|data:)/i.test(value);

const getCurrentOrigin = () => {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
};

const getApiOrigin = () => {
  if (!API_BASE_URL) return '';

  try {
    return new URL(API_BASE_URL, getCurrentOrigin()).origin;
  } catch {
    return '';
  }
};

export const isStudyPdfUrl = (fileUrl?: string, mimeType?: string) => {
  const normalizedMime = mimeType?.toLowerCase() || '';
  if (normalizedMime.includes('application/pdf')) return true;
  const path = (fileUrl || '').toLowerCase().split('?')[0].split('#')[0];
  return path.endsWith('.pdf');
};

export const isStudyBookPackageUrl = (fileUrl?: string, mimeType?: string) => {
  const normalizedMime = mimeType?.toLowerCase() || '';
  const normalizedUrl = (fileUrl || '').toLowerCase().split('?')[0].split('#')[0];
  const isZip = normalizedMime.includes('zip') || normalizedUrl.endsWith('.zip');
  const isOfficialNcertCompleteBook =
    normalizedUrl.includes('ncert.nic.in/textbook/pdf/') &&
    /[a-z0-9]+dd\.zip$/i.test(normalizedUrl);

  return isZip && isOfficialNcertCompleteBook;
};

export const isStudyReadableDocumentUrl = (fileUrl?: string, mimeType?: string) =>
  isStudyPdfUrl(fileUrl, mimeType) || isStudyBookPackageUrl(fileUrl, mimeType);

export const getStudyAssetUrl = (fileUrl = '') => {
  if (!fileUrl || isBrowserSafeUrl(fileUrl)) return fileUrl;
  if (fileUrl.startsWith('/static/') || fileUrl.startsWith('/api/')) {
    return `${API_BASE_URL || getCurrentOrigin()}${fileUrl}`;
  }
  return fileUrl;
};

export const getStudyPdfDisplayUrl = (fileUrl: string) => {
  if (!fileUrl || !isHttpUrl(fileUrl)) return fileUrl;

  try {
    const parsed = new URL(fileUrl);
    const currentOrigin = getCurrentOrigin();
    const apiOrigin = getApiOrigin();
    if (parsed.origin === currentOrigin || (apiOrigin && parsed.origin === apiOrigin)) return fileUrl;
  } catch {
    return fileUrl;
  }

  const apiBase = API_BASE_URL || getCurrentOrigin();
  return `${apiBase}/api/study/pdf-proxy?url=${encodeURIComponent(fileUrl)}`;
};

export const getStudyPdfPreflightUrl = (fileUrl: string) => {
  const apiBase = API_BASE_URL || getCurrentOrigin();
  return `${apiBase}/api/study/pdf-preflight?url=${encodeURIComponent(fileUrl)}`;
};

const warmedReaderDocuments = new Set<string>();

export const warmStudyReadableDocument = (fileUrl?: string, mimeType?: string) => {
  if (!fileUrl || !isStudyBookPackageUrl(fileUrl, mimeType) || warmedReaderDocuments.has(fileUrl)) return;
  warmedReaderDocuments.add(fileUrl);
  void fetch(getStudyPdfPreflightUrl(fileUrl), {
    headers: { Accept: 'application/json' },
  }).catch(() => {
    warmedReaderDocuments.delete(fileUrl);
  });
};

export const getStudyPdfReaderHref = (fileUrl: string, title: string, returnTo?: string) => {
  const normalizedFileUrl = getStudyAssetUrl(fileUrl);
  const params = new URLSearchParams({
    url: normalizedFileUrl,
    title,
  });

  if (returnTo) {
    params.set('returnTo', returnTo);
    params.set('parent', getPrimaryStudyNavPath(returnTo.split('?')[0]) || readStoredPrimaryStudyNavPath('/app'));
  } else {
    params.set('parent', readStoredPrimaryStudyNavPath('/app'));
  }

  return `/app/pdf?${params.toString()}`;
};
