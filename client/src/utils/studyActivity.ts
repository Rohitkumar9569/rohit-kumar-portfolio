import type { StudyCard, StudyCardFile, StudyResource } from '../studyHubApi';
import { getStudyPdfReaderHref, isStudyPdfUrl, isStudyReadableDocumentUrl } from './studyPdfReader';

const STORAGE_KEY = 'study-hub-recent-activity';
const UPDATE_EVENT = 'study-activity-updated';
const MAX_RECENT_ITEMS = 5;

export interface RecentStudyItem {
  slug: string;
  title: string;
  type: StudyResource['type'];
  summary?: string;
  subject?: string;
  workspaceName?: string;
  workspaceSlug?: string;
  iconKey?: string;
  iconUrl?: string;
  tone?: StudyCard['tone'];
  href: string;
  lastViewedAt: string;
  viewCount: number;
}

const isBrowser = () => typeof window !== 'undefined';

const readRecentItems = (): RecentStudyItem[] => {
  if (!isBrowser()) return [];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as RecentStudyItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRecentItems = (items: RecentStudyItem[]) => {
  if (!isBrowser()) return;

  const normalizedItems = items
    .sort((a, b) => b.lastViewedAt.localeCompare(a.lastViewedAt))
    .filter((item, index, list) => list.findIndex((candidate) => candidate.slug === item.slug) === index)
    .slice(0, MAX_RECENT_ITEMS);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedItems));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: normalizedItems }));
};

export const getRecentStudyItems = () => {
  return readRecentItems()
    .sort((a, b) => b.lastViewedAt.localeCompare(a.lastViewedAt))
    .filter((item, index, list) => list.findIndex((candidate) => candidate.slug === item.slug) === index)
    .slice(0, MAX_RECENT_ITEMS);
};

export const toRecentStudyItem = (resource: StudyResource): RecentStudyItem => ({
  slug: resource.slug,
  title: resource.title,
  type: resource.type,
  summary: resource.summary,
  subject: resource.subject || resource.topic,
  workspaceName: resource.primaryWorkspaceId?.shortName || resource.primaryWorkspaceId?.name,
  workspaceSlug: resource.primaryWorkspaceId?.slug,
  href: resource.type === 'pyq' ? `/app/paper/${resource.slug}` : `/app/resource/${resource.slug}`,
  lastViewedAt: new Date().toISOString(),
  viewCount: 1,
});

export const addRecentStudyResource = (resource: StudyResource) => {
  const current = getRecentStudyItems();
  const existing = current.find((item) => item.slug === resource.slug);
  const nextItem = {
    ...existing,
    ...toRecentStudyItem(resource),
    viewCount: (existing?.viewCount || 0) + 1,
  };
  const nextItems = [nextItem, ...current.filter((item) => item.slug !== resource.slug)];
  writeRecentItems(nextItems);
  return nextItem;
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

export const addRecentStudyCard = (card: StudyCard, title = card.name, href?: string) => {
  const current = getRecentStudyItems();
  const slug = `card-${card._id}`;
  const existing = current.find((item) => item.slug === slug);
  const workspace = getWorkspaceMeta(card.workspaceId);
  const nextItem: RecentStudyItem = {
    ...existing,
    slug,
    title,
    type: 'material',
    summary: '',
    subject: 'Study card',
    workspaceName: workspace.workspaceName,
    workspaceSlug: workspace.workspaceSlug,
    iconKey: card.iconKey,
    iconUrl: card.iconUrl,
    tone: card.tone,
    href: href || `/app/workspace/${workspace.workspaceSlug}?card=${card._id}`,
    lastViewedAt: new Date().toISOString(),
    viewCount: (existing?.viewCount || 0) + 1,
  };
  const nextItems = [nextItem, ...current.filter((item) => item.slug !== slug)];
  writeRecentItems(nextItems);
  return nextItem;
};

const getFileRecentSlug = (url: string) => `file-${url.trim().toLowerCase()}`;

export const addRecentStudyFileView = (
  file: Pick<StudyCardFile, 'name' | 'url' | 'mimeType' | 'resourceType' | 'sizeBytes'> & { _id?: string },
  title = file.name,
  href = isStudyReadableDocumentUrl(file.url, file.mimeType) ? getStudyPdfReaderHref(file.url, title) : file.url,
) => {
  const current = getRecentStudyItems();
  const slug = file._id ? `file-${file._id}` : getFileRecentSlug(file.url);
  const existing = current.find((item) => item.slug === slug);
  const isPdf = isStudyPdfUrl(file.url, file.mimeType);
  const isReadable = isStudyReadableDocumentUrl(file.url, file.mimeType);
  const nextItem: RecentStudyItem = {
    ...existing,
    slug,
    title,
    type: isPdf || file.resourceType === 'pyq'
      ? 'pyq'
      : 'book',
    summary: file.sizeBytes ? `${Math.max(1, Math.round(file.sizeBytes / 1024)).toLocaleString('en-IN')} KB file` : isPdf ? 'PDF document' : 'Complete book',
    subject: isReadable ? (isPdf ? 'PDF document' : 'Complete book') : 'Book package',
    workspaceName: 'Study Hub',
    workspaceSlug: 'study-hub',
    iconKey: 'download',
    tone: 'emerald',
    href,
    lastViewedAt: new Date().toISOString(),
    viewCount: (existing?.viewCount || 0) + 1,
  };
  const nextItems = [nextItem, ...current.filter((item) => item.slug !== slug)];
  writeRecentItems(nextItems);
  return nextItem;
};

export const clearRecentStudyItems = () => {
  writeRecentItems([]);
};

export const STUDY_ACTIVITY_UPDATE_EVENT = UPDATE_EVENT;
