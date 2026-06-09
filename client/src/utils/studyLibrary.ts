import type { StudyCard, StudyCardFile, StudyResource } from '../studyHubApi';
import { getStudyAssetUrl, getStudyPdfReaderHref, isStudyPdfUrl, isStudyReadableDocumentUrl } from './studyPdfReader';

const DB_NAME = 'study-hub-library';
const STORE_NAME = 'resources';
const DB_VERSION = 1;
const UPDATE_EVENT = 'study-library-updated';

export type LocalLibraryStatus = 'saved' | 'downloaded' | 'bookmarked' | 'completed';

export interface LocalLibraryItem {
  slug: string;
  title: string;
  type: StudyResource['type'];
  summary?: string;
  subject?: string;
  iconKey?: StudyCard['iconKey'];
  iconUrl?: StudyCard['iconUrl'];
  tone?: StudyCard['tone'];
  year?: number;
  language?: StudyResource['language'];
  sourceType?: string;
  sourceName?: string;
  workspaceName?: string;
  workspaceSlug?: string;
  href: string;
  status: LocalLibraryStatus;
  savedAt: string;
  updatedAt: string;
  progress?: {
    page?: number;
    percent?: number;
    updatedAt?: string;
  };
  offline?: {
    available: boolean;
    cachedAt?: string;
    sizeBytes?: number;
  };
}

const memoryFallback = new Map<string, LocalLibraryItem>();
let cachedLibraryItems: LocalLibraryItem[] | null = null;

const isIndexedDbAvailable = () => {
  return typeof window !== 'undefined' && 'indexedDB' in window;
};

const dispatchLibraryUpdate = (detail: unknown) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail }));
};

const requestToPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const openLibraryDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error('IndexedDB is not available.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'slug' });
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('status', 'status');
        store.createIndex('workspaceSlug', 'workspaceSlug');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const withStore = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
) => {
  const db = await openLibraryDb();
  try {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    return await requestToPromise(action(store));
  } finally {
    db.close();
  }
};

export const toLocalLibraryItem = (
  resource: StudyResource,
  status: LocalLibraryStatus = 'saved'
): LocalLibraryItem => {
  const now = new Date().toISOString();
  return {
    slug: resource.slug,
    title: resource.title,
    type: resource.type,
    summary: resource.summary,
    subject: resource.subject || resource.topic,
    year: resource.year,
    language: resource.language,
    sourceType: resource.sourceType,
    sourceName: resource.sourceName,
    workspaceName: resource.primaryWorkspaceId?.shortName || resource.primaryWorkspaceId?.name,
    workspaceSlug: resource.primaryWorkspaceId?.slug,
    href: resource.type === 'pyq' ? `/app/paper/${resource.slug}` : `/app/resource/${resource.slug}`,
    status,
    savedAt: now,
    updatedAt: now,
    offline: {
      available: status === 'downloaded',
      cachedAt: status === 'downloaded' ? now : undefined,
    },
  };
};

const getWorkspaceMeta = (workspaceId?: StudyCard['workspaceId']) => {
  if (!workspaceId || typeof workspaceId === 'string') {
    return {
      workspaceName: 'Study Hub',
      workspaceSlug: 'study-hub',
    };
  }

  return {
    workspaceName: workspaceId.shortName || workspaceId.name || 'Study Hub',
    workspaceSlug: workspaceId.slug || 'study-hub',
  };
};

export const toStudyCardLibraryItem = (
  card: StudyCard,
  title = card.name,
  status: LocalLibraryStatus = 'saved'
): LocalLibraryItem => {
  const now = new Date().toISOString();
  const workspace = getWorkspaceMeta(card.workspaceId);

  return {
    slug: `card-${card._id}`,
    title,
    type: 'material',
    summary: '',
    subject: 'Study card',
    iconKey: card.iconKey,
    iconUrl: card.iconUrl,
    tone: card.tone,
    workspaceName: workspace.workspaceName,
    workspaceSlug: workspace.workspaceSlug,
    href: `/app/workspace/${workspace.workspaceSlug}?card=${card._id}`,
    status,
    savedAt: now,
    updatedAt: now,
  };
};

export const toStudyCardFileLibraryItem = (
  file: StudyCardFile,
  title = file.name,
  status: LocalLibraryStatus = 'saved',
  workspaceSlug = 'study-hub',
  workspaceName = 'Study Hub'
): LocalLibraryItem => {
  const now = new Date().toISOString();
  const fileUrl = getStudyAssetUrl(file.url);
  const isPdf = isStudyPdfUrl(fileUrl, file.mimeType);
  const isReadable = isStudyReadableDocumentUrl(fileUrl, file.mimeType);

  return {
    slug: `file-${file._id}`,
    title,
    type: isPdf ? 'pyq' : 'book',
    summary: file.sizeBytes ? `${Math.max(1, Math.round(file.sizeBytes / 1024))} KB file` : isPdf ? 'PDF document' : 'Complete book',
    subject: isPdf ? 'PDF document' : 'Complete book',
    iconKey: isPdf ? 'download' : 'book',
    tone: 'emerald',
    sourceType: file.resourceType || 'file',
    sourceName: file.name,
    workspaceName,
    workspaceSlug,
    href: isReadable ? getStudyPdfReaderHref(fileUrl, title) : fileUrl,
    status,
    savedAt: now,
    updatedAt: now,
  };
};

export const getLocalLibraryItems = async () => {
  if (cachedLibraryItems) return cachedLibraryItems;

  if (!isIndexedDbAvailable()) {
    cachedLibraryItems = Array.from(memoryFallback.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return cachedLibraryItems;
  }

  const items = await withStore<LocalLibraryItem[]>('readonly', (store) => store.getAll());
  cachedLibraryItems = items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return cachedLibraryItems;
};

export const getCachedLocalLibraryItems = () => cachedLibraryItems || [];

export const hasCachedLocalLibraryItems = () => cachedLibraryItems !== null;

export const getLocalLibraryItem = async (slug: string) => {
  if (!isIndexedDbAvailable()) {
    return memoryFallback.get(slug) || null;
  }

  const item = await withStore<LocalLibraryItem | undefined>('readonly', (store) => store.get(slug));
  return item || null;
};

export const saveLocalLibraryItem = async (item: LocalLibraryItem) => {
  const existing = await getLocalLibraryItem(item.slug);
  const nextItem = {
    ...existing,
    ...item,
    savedAt: existing?.savedAt || item.savedAt,
    updatedAt: new Date().toISOString(),
  };

  if (!isIndexedDbAvailable()) {
    memoryFallback.set(nextItem.slug, nextItem);
    cachedLibraryItems = Array.from(memoryFallback.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    dispatchLibraryUpdate(nextItem);
    return nextItem;
  }

  await withStore<IDBValidKey>('readwrite', (store) => store.put(nextItem));
  cachedLibraryItems = null;
  dispatchLibraryUpdate(nextItem);
  return nextItem;
};

export const removeLocalLibraryItem = async (slug: string) => {
  if (!isIndexedDbAvailable()) {
    memoryFallback.delete(slug);
    cachedLibraryItems = Array.from(memoryFallback.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    dispatchLibraryUpdate({ slug });
    return;
  }

  await withStore<undefined>('readwrite', (store) => store.delete(slug));
  cachedLibraryItems = null;
  dispatchLibraryUpdate({ slug });
};

export const STUDY_LIBRARY_UPDATE_EVENT = UPDATE_EVENT;
