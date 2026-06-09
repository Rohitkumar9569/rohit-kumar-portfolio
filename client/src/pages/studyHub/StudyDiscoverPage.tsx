import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  getStudyCardVisual,
  getStudyTileMetaChips,
  getToneBadgeClass,
  StudyTileMetaChipRow,
  type StudyIcon,
  type StudyTone,
} from '../../components/study/StudyVisualCards';
import SaveLibraryItemButton from '../../components/study/SaveLibraryItemButton';
import {
  STUDY_QUERY_STALE_TIME_MS,
  fetchStudyCards,
  searchStudyCards,
  searchStudyResources,
  studyCardQueryKey,
  type StudyCard,
  type StudyCardFile,
  type StudyResource,
} from '../../studyHubApi';
import { getPdfThumbnailUrl } from '../../utils/cloudinaryPdfThumbnail';
import { getSingleFileShortcut, getStudyCardDisplayTitle } from '../../utils/studyCardNavigation';
import { getStudyFileCompactMeta, getStudyFileDisplayTitle } from '../../utils/studyBookDisplay';
import {
  getStudyPdfReaderHref,
  isStudyBookPackageUrl,
  isStudyPdfUrl,
  isStudyReadableDocumentUrl,
  warmStudyReadableDocument,
} from '../../utils/studyPdfReader';
import {
  toLocalLibraryItem,
  toStudyCardFileLibraryItem,
  toStudyCardLibraryItem,
  type LocalLibraryItem,
} from '../../utils/studyLibrary';
import { dedupeStudyPremiumItems } from '../../utils/studyPremiumOrder';
import {
  StudyActionButton,
  StudyActionLink,
  StudyCardSkeletonGrid,
  StudyEmptyState,
} from '../../components/study/StudyPremium';

const PLATFORM_WORKSPACE_SLUG = 'study-hub';
const CATALOG_PARENT_QUERY = encodeURIComponent('/app/catalog');
const CATALOG_SEARCH_CARD_LIMIT = 600;
const CATALOG_SEARCH_FILE_LIMIT = 600;
const CATALOG_SEARCH_FOLDER_LIMIT = 72;
const catalogFloatingSaveClassName =
  'study-save-action absolute right-2 top-2 z-20 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/80 bg-white/85 text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.16)] backdrop-blur-md transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800 aria-pressed:border-cyan-200 aria-pressed:bg-cyan-50 aria-pressed:text-cyan-800 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-100 dark:hover:border-cyan-300/30 dark:hover:bg-cyan-400/15 dark:aria-pressed:border-cyan-300/35 dark:aria-pressed:bg-cyan-400/20 sm:right-2.5 sm:top-2.5 sm:h-8 sm:w-8';

type SearchableStudyCard = StudyCard & {
  pathNames?: string[];
};

type CatalogFileSearchResult = {
  key: string;
  card: SearchableStudyCard;
  file: StudyCardFile;
  title: string;
  score: number;
};

const normalizeCatalogSearchText = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const catalogSearchTokenAliases: Record<string, string[]> = {
  math: ['maths', 'mathematics', 'ganit'],
  maths: ['math', 'mathematics', 'ganit'],
  mathematics: ['math', 'maths', 'ganit'],
  ganit: ['math', 'maths', 'mathematics'],
  bio: ['biology'],
  biology: ['bio', 'botany', 'zoology'],
  accounts: ['accountancy'],
  accountancy: ['accounts'],
  book: ['books', 'textbook', 'textbooks', 'ncert'],
  books: ['book', 'textbook', 'textbooks', 'ncert'],
  textbook: ['book', 'books', 'ncert'],
  textbooks: ['book', 'books', 'ncert'],
  pyq: ['pyqs', 'previous year papers', 'question paper', 'paper'],
  pyqs: ['pyq', 'previous year papers', 'question paper', 'paper'],
  paper: ['papers', 'pyq', 'question paper'],
  papers: ['paper', 'pyq', 'question paper'],
  file: ['files', 'pdf', 'document'],
  files: ['file', 'pdf', 'document'],
  fules: ['files', 'file', 'pdf', 'document'],
  pdf: ['file', 'files', 'document'],
  pdfs: ['pdf', 'file', 'files', 'document'],
  document: ['file', 'files', 'pdf'],
  documents: ['document', 'file', 'files', 'pdf'],
};

const catalogSearchIntentTokens = new Set(['file', 'files', 'fules', 'pdf', 'pdfs', 'document', 'documents']);

const expandCatalogSearchToken = (token: string) => {
  const variants = new Set<string>([token, ...(catalogSearchTokenAliases[token] || [])]);
  if (token.length > 3 && token.endsWith('s')) variants.add(token.slice(0, -1));
  if (token.length > 3 && !token.endsWith('s')) variants.add(`${token}s`);
  return [...variants].map(normalizeCatalogSearchText).filter(Boolean);
};

const useDebouncedValue = (value: string, delayMs = 260) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
};

const formatFileSize = (sizeBytes?: number, fallback = 'PDF document') => {
  if (!sizeBytes) return fallback;
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB file`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB file`;
};

const formatFileMeta = (file: StudyCardFile, title = '') =>
  getStudyFileCompactMeta(file, title) || formatFileSize(file.sizeBytes, isStudyPdfUrl(file.url, file.mimeType) ? 'PDF document' : 'Complete book');

const getFileSearchText = (file: StudyCardFile, card: SearchableStudyCard) =>
  normalizeCatalogSearchText([
    card.name,
    card.slug,
    ...(card.pathNames || []),
    file.name,
    file.subject,
    file.paper,
    file.topic,
    file.resourceType,
    file.stage,
    file.sourceName,
    file.year,
    file.url,
    isStudyPdfUrl(file.url, file.mimeType) ? 'pdf file document' : 'file document',
  ].filter(Boolean).join(' '));

const fileMatchesQuery = (file: StudyCardFile, card: SearchableStudyCard, query: string) => {
  const allTokens = getCatalogSearchTokens(query);
  const contentTokens = allTokens.filter((token) => !catalogSearchIntentTokens.has(token));
  const tokens = contentTokens.length ? contentTokens : allTokens;
  if (!tokens.length) return false;

  const searchable = getFileSearchText(file, card);
  return tokens.every((token) => expandCatalogSearchToken(token).some((variant) => searchable.includes(variant)));
};

const getCatalogSearchTokens = (query: string) =>
  normalizeCatalogSearchText(query)
    .split(' ')
    .filter((token) => token.length > 1);

const getCatalogQueryClassNumber = (query: string) => {
  const normalized = normalizeCatalogSearchText(query);
  const classMatch = normalized.match(/\bclass\s*(\d{1,2})\b/);
  if (classMatch) return classMatch[1];
  if (/\bxi\b/i.test(query)) return '11';
  if (/\bxii\b/i.test(query)) return '12';
  return '';
};

const getCatalogFileScore = (file: StudyCardFile, card: SearchableStudyCard, query: string, title: string) => {
  const allTokens = getCatalogSearchTokens(query);
  const contentTokens = allTokens.filter((token) => !catalogSearchIntentTokens.has(token));
  const tokens = contentTokens.length ? contentTokens : allTokens;
  const normalizedQuery = normalizeCatalogSearchText(query);
  const titleText = normalizeCatalogSearchText(title);
  const fileNameText = normalizeCatalogSearchText(file.name);
  const subjectText = normalizeCatalogSearchText(file.subject);
  const detailText = normalizeCatalogSearchText([
    file.paper,
    file.topic,
    file.resourceType,
    file.stage,
    file.sourceName,
    file.year,
  ].filter(Boolean).join(' '));
  const pathText = normalizeCatalogSearchText([
    card.name,
    card.slug,
    ...(card.pathNames || []),
  ].filter(Boolean).join(' '));
  const allText = normalizeCatalogSearchText([titleText, fileNameText, subjectText, detailText, pathText].join(' '));

  let score = isStudyPdfUrl(file.url, file.mimeType) ? 4 : 1;
  if (normalizedQuery && titleText.includes(normalizedQuery)) score += 28;
  if (normalizedQuery && fileNameText.includes(normalizedQuery)) score += 24;
  if (normalizedQuery && subjectText.includes(normalizedQuery)) score += 22;
  if (normalizedQuery && pathText.includes(normalizedQuery)) score += 6;

  tokens.forEach((token) => {
    const variants = expandCatalogSearchToken(token);
    const matchesTitleStart = variants.some((variant) => titleText.startsWith(variant));
    const matchesTitle = variants.some((variant) => titleText.includes(variant));
    const matchesFileName = variants.some((variant) => fileNameText.includes(variant));
    const matchesSubject = variants.some((variant) => subjectText.includes(variant));
    const matchesDetail = variants.some((variant) => detailText.includes(variant));
    const matchesPath = variants.some((variant) => pathText.includes(variant));

    if (matchesTitleStart) score += 18;
    if (matchesSubject) score += 16;
    if (matchesFileName) score += 14;
    if (matchesTitle) score += 12;
    if (matchesDetail) score += 8;
    if (matchesPath) score += 3;
  });

  const classNumber = getCatalogQueryClassNumber(query);
  if (classNumber) {
    if (allText.includes(`class ${classNumber}`) || allText.includes(`class${classNumber}`)) score += 26;
    else score -= 12;
  }

  return Math.max(0, score);
};

const getCatalogFilePathText = (result: CatalogFileSearchResult) =>
  normalizeCatalogSearchText([
    ...(result.card.pathNames || []),
    result.card.name,
    result.title,
    result.file.subject,
    result.file.sourceName,
  ].filter(Boolean).join(' '));

const getCatalogFileGroupRank = (result: CatalogFileSearchResult) => {
  const text = getCatalogFilePathText(result);
  if (/\bupsc\b|\bcse\b|\bprelims\b|\bmains\b/.test(text)) return 10;
  if (/\bcbse\b|\bschool boards?\b|\bncert\b|\bclass\s*\d{1,2}\b/.test(text)) return 20;
  if (/\bcompetitive exams?\b|\bgate\b|\bcds\b|\bnda\b|\bssc\b|\bbanking\b|\brailway\b/.test(text)) return 30;
  if (/\bentrance exams?\b|\bjee\b|\bneet\b|\bbitsat\b/.test(text)) return 40;
  if (/\bstate exams?\b|\brpsc\b|\bjpsc\b|\bbpsc\b|\buppsc\b/.test(text)) return 50;
  if (/\buniversity exams?\b|\bdelhi university\b|\bdu\b|\bvtu\b|\bignou\b/.test(text)) return 60;
  if (/\bplacement\b|\bprivate\b/.test(text)) return 70;
  return 90;
};

const getCatalogFileClassRank = (result: CatalogFileSearchResult) => {
  const text = getCatalogFilePathText(result);
  const match = text.match(/\bclass\s*(\d{1,2})\b/);
  return match ? Number(match[1]) : 99;
};

const getCatalogFileYearRank = (result: CatalogFileSearchResult) =>
  result.file.year ? 3000 - Number(result.file.year) : 9999;

const getCatalogExactTitleRank = (result: CatalogFileSearchResult, query: string) => {
  const normalizedQuery = normalizeCatalogSearchText(query);
  const titleText = normalizeCatalogSearchText(result.title);
  const fileNameText = normalizeCatalogSearchText(result.file.name);
  const allTokens = getCatalogSearchTokens(query);
  const contentTokens = allTokens.filter((token) => !catalogSearchIntentTokens.has(token));
  const tokens = contentTokens.length ? contentTokens : allTokens;

  if (normalizedQuery && (titleText.includes(normalizedQuery) || fileNameText.includes(normalizedQuery))) return 0;
  if (tokens.length && tokens.every((token) => expandCatalogSearchToken(token).some((variant) => titleText.includes(variant) || fileNameText.includes(variant)))) return 1;
  return 2;
};

const sortCatalogFileResults = (results: CatalogFileSearchResult[], query: string, limit: number) =>
  results
    .slice()
    .sort((a, b) => (
      getCatalogExactTitleRank(a, query) - getCatalogExactTitleRank(b, query) ||
      getCatalogFileGroupRank(a) - getCatalogFileGroupRank(b) ||
      getCatalogFileClassRank(a) - getCatalogFileClassRank(b) ||
      getCatalogFileYearRank(a) - getCatalogFileYearRank(b) ||
      b.score - a.score ||
      normalizeCatalogSearchText(a.title).localeCompare(normalizeCatalogSearchText(b.title), undefined, { numeric: true })
    ))
    .slice(0, limit);

const getResourceTone = (resource: StudyResource): StudyTone => {
  if (resource.type === 'pyq') return 'violet';
  if (resource.type === 'book') return 'emerald';
  if (resource.type === 'syllabus') return 'cyan';
  if (resource.type === 'practice') return 'amber';
  if (resource.type === 'update') return 'rose';
  return 'slate';
};

const toneAccents: Record<StudyTone, { bar: string; text: string }> = {
  blue: {
    bar: 'from-slate-500 to-slate-300',
    text: 'text-slate-900 dark:text-white',
  },
  violet: {
    bar: 'from-indigo-500 to-slate-400',
    text: 'text-slate-900 dark:text-white',
  },
  emerald: {
    bar: 'from-emerald-700 to-slate-400',
    text: 'text-slate-900 dark:text-white',
  },
  amber: {
    bar: 'from-amber-600 to-slate-400',
    text: 'text-slate-900 dark:text-white',
  },
  rose: {
    bar: 'from-slate-600 to-slate-300',
    text: 'text-slate-900 dark:text-white',
  },
  cyan: {
    bar: 'from-cyan-700 to-slate-400',
    text: 'text-slate-900 dark:text-white',
  },
  indigo: {
    bar: 'from-indigo-600 to-slate-400',
    text: 'text-slate-900 dark:text-white',
  },
  slate: {
    bar: 'from-slate-600 to-slate-400',
    text: 'text-slate-900 dark:text-white',
  },
};

const CatalogCollectionCard = ({
  to,
  title,
  icon: Icon,
  tone,
  iconUrl,
  libraryItem,
}: {
  to: string;
  title: string;
  icon: StudyIcon;
  tone: StudyTone;
  iconUrl?: string;
  libraryItem?: LocalLibraryItem;
}) => {
  const accent = toneAccents[tone];

  return (
    <article
      className={[
        'study-card-surface group relative flex h-36 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white p-2 shadow-[0_10px_26px_rgba(15,23,42,0.09)] ring-1 ring-slate-950/[0.035] transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)] focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_16px_36px_rgba(0,0,0,0.36)] dark:ring-white/5 dark:hover:border-cyan-300/30 sm:h-36 sm:p-2.5 lg:h-[9.25rem]',
      ].join(' ')}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.bar}`} />
      <Link to={to} className="flex flex-1 flex-col items-center justify-center pb-3 pt-1.5 text-center sm:pb-2.5">
        <span className="relative flex h-[4.15rem] w-[4.75rem] items-center justify-center transition duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.02] sm:h-[4.35rem] sm:w-[4.95rem] lg:h-[4.5rem] lg:w-[5.1rem]">
          <span className="pointer-events-none absolute bottom-2 h-5 w-[58%] rounded-full bg-slate-950/10 blur-xl dark:bg-cyan-300/10" />
          {iconUrl ? (
            <img src={iconUrl} alt="" loading="lazy" className="study-icon-asset relative z-10 h-[4.15rem] w-[4.15rem] object-contain transition duration-300 group-hover:scale-105 sm:h-[4.35rem] sm:w-[4.35rem] lg:h-[4.5rem] lg:w-[4.5rem]" />
          ) : (
            <Icon className="relative z-10 h-[3.25rem] w-[3.25rem] text-slate-700 transition duration-300 group-hover:scale-105 dark:text-slate-200 sm:h-[3.45rem] sm:w-[3.45rem] lg:h-[3.6rem] lg:w-[3.6rem]" aria-hidden="true" />
          )}
        </span>
        <h2 className={`mt-2 line-clamp-3 break-words text-[12px] font-black leading-tight sm:text-[13px] ${accent.text}`}>
          {title}
        </h2>
      </Link>
      {libraryItem && (
        <SaveLibraryItemButton
          item={libraryItem}
          iconOnly
          className={catalogFloatingSaveClassName}
        />
      )}
    </article>
  );
};

const CatalogResourceCard = ({ resource }: { resource: StudyResource }) => {
  const href = resource.type === 'pyq' ? `/app/paper/${resource.slug}` : `/app/resource/${resource.slug}`;
  const visual = getStudyCardVisual(resource.type, getResourceTone(resource), resource.title);
  const Icon = visual.icon;
  const workspaceName = resource.primaryWorkspaceId?.shortName || resource.primaryWorkspaceId?.name || 'Study Hub';
  const meta = [
    resource.type.toUpperCase(),
    resource.subject || resource.topic,
    resource.year,
    workspaceName,
  ].filter(Boolean).join(' / ');

  return (
    <article className="study-card-surface group relative flex h-36 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white p-2 shadow-[0_10px_26px_rgba(15,23,42,0.09)] ring-1 ring-slate-950/[0.035] transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_16px_36px_rgba(0,0,0,0.36)] dark:ring-white/5 dark:hover:border-cyan-300/30 sm:h-36 sm:p-2.5 lg:h-[9.25rem]">
      <Link to={href} className="flex flex-1 flex-col items-center justify-center pb-3 pt-1.5 text-center sm:pb-2.5">
        <span className="mb-1 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/70 bg-cyan-500/10 text-cyan-700 shadow-sm dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100">
          {visual.iconUrl ? (
            <img src={visual.iconUrl} alt="" loading="lazy" className="study-icon-asset h-9 w-9 object-contain" />
          ) : (
            <Icon className="h-8 w-8" aria-hidden="true" />
          )}
        </span>
        <h2 className="line-clamp-2 break-words text-[12px] font-black leading-tight text-slate-900 dark:text-white sm:text-[13px]">
          {resource.title}
        </h2>
        <p className="mt-1 max-w-full truncate text-[10px] font-bold leading-4 text-slate-500 dark:text-slate-400 sm:text-[11px]">
          {meta}
        </p>
      </Link>
      <SaveLibraryItemButton
        item={toLocalLibraryItem(resource)}
        iconOnly
        className={catalogFloatingSaveClassName}
      />
    </article>
  );
};

const CatalogPdfCard = ({
  file,
  title,
  icon: Icon,
  tone,
  iconUrl,
  libraryItem,
}: {
  file: StudyCardFile;
  title: string;
  icon: StudyIcon;
  tone: StudyTone;
  iconUrl?: string;
  libraryItem?: LocalLibraryItem;
}) => {
  const [previewFailed, setPreviewFailed] = useState(false);
  const location = useLocation();
  const isPdf = isStudyPdfUrl(file.url, file.mimeType);
  const isReadable = isStudyReadableDocumentUrl(file.url, file.mimeType);
  const isBookPackage = isStudyBookPackageUrl(file.url, file.mimeType);
  const thumbnailUrl = isPdf ? getPdfThumbnailUrl(file) : undefined;
  const readerHref = getStudyPdfReaderHref(file.url, title, `${location.pathname}${location.search}`);
  const metaChips: ReturnType<typeof getStudyTileMetaChips> = [];
  const warmReader = () => {
    if (isBookPackage) warmStudyReadableDocument(file.url, file.mimeType);
  };
  const actionColumns = isReadable ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <article className="study-card-surface group relative flex min-h-[232px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.09)] ring-1 ring-slate-950/[0.03] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_44px_rgba(15,23,42,0.13)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_20px_48px_rgba(0,0,0,0.44)] dark:ring-white/5 dark:hover:border-slate-700">
      <div className="study-card-preview relative flex h-32 items-center justify-center overflow-hidden border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60">
        {thumbnailUrl && !previewFailed ? (
          <img
            src={thumbnailUrl}
            alt=""
            loading="lazy"
            className="h-full w-full bg-white object-cover object-top transition duration-300 group-hover:scale-[1.025] dark:bg-slate-900"
            onError={() => setPreviewFailed(true)}
          />
        ) : (
          <>
            <div className="relative h-24 w-32">
              <div className="absolute left-4 top-1 h-8 w-16 rounded-t-2xl border border-slate-200/80 bg-white/72 shadow-sm dark:border-white/10 dark:bg-white/[0.08]" />
              <div className="absolute inset-x-0 bottom-0 flex h-20 items-center justify-center rounded-[1.35rem] border border-slate-200/80 bg-white/86 shadow-[0_12px_26px_rgba(15,23,42,0.09)] dark:border-white/10 dark:bg-white/[0.08] dark:shadow-[0_16px_34px_rgba(0,0,0,0.24)]">
                <span className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ${iconUrl ? 'bg-white text-slate-950 dark:bg-slate-950' : getToneBadgeClass(tone)}`}>
                  {iconUrl ? (
                    <img src={iconUrl} alt="" loading="lazy" className="h-9 w-9 object-contain" />
                  ) : (
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  )}
                </span>
              </div>
            </div>
          </>
        )}
        {thumbnailUrl && !previewFailed && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/45 via-slate-950/12 to-transparent" />
        )}
        <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur dark:bg-slate-950/80 dark:text-slate-200">
          {iconUrl ? (
            <img src={iconUrl} alt="" loading="lazy" className="h-6 w-6 object-contain" />
          ) : (
            <DocumentTextIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        <span className="absolute left-14 top-3 rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.12)] backdrop-blur dark:border-slate-700/70 dark:bg-slate-950/80 dark:text-slate-200">
          {isBookPackage ? 'BOOK' : isPdf ? 'PDF' : 'FILE'}
        </span>
      </div>
      {libraryItem && (
        <SaveLibraryItemButton
          item={libraryItem}
          iconOnly
          className={catalogFloatingSaveClassName}
        />
      )}

      <div className="px-3 py-3">
        <StudyTileMetaChipRow chips={metaChips} className="mb-2" />
        <h2 className="line-clamp-2 text-base font-black leading-snug text-slate-950 dark:text-white">
          {title}
        </h2>
        <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
          {formatFileMeta(file, title)}
        </p>
      </div>

      <div className={['mt-auto grid gap-2 px-3 pb-3 pt-0', actionColumns].join(' ')}>
        {isReadable && (
          <Link
            to={readerHref}
            onFocus={warmReader}
            onPointerEnter={warmReader}
            className="study-soft-action inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-100 px-2 text-sm font-black text-slate-800 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            <EyeIcon className="h-4 w-4" aria-hidden="true" />
            View
          </Link>
        )}
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer"
          download
          className="study-primary-action inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-slate-950 px-2 text-[13px] font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
          <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
          Download
        </a>
      </div>
    </article>
  );
};

const StudyDiscoverPage = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim());
  const isSearchMode = debouncedQuery.length > 0;
  const {
    data: rootCardsData,
    isError,
    isFetched,
    isFetching,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: studyCardQueryKey(PLATFORM_WORKSPACE_SLUG, 'root'),
    queryFn: () => fetchStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent: 'root' }),
    placeholderData: [],
    retry: false,
    staleTime: STUDY_QUERY_STALE_TIME_MS,
  });
  const rootCards = rootCardsData || [];
  const isInitialLoading = rootCards.length === 0 && !isError && (isLoading || isFetching || !isFetched);

  const {
    data: searchedCardsData,
    isError: isSearchCardsError,
    isFetching: isSearchCardsFetching,
  } = useQuery({
    queryKey: ['study-catalog-card-search', PLATFORM_WORKSPACE_SLUG, debouncedQuery],
    queryFn: () => searchStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, q: debouncedQuery, limit: CATALOG_SEARCH_CARD_LIMIT }),
    enabled: isSearchMode,
    placeholderData: [],
    retry: false,
    staleTime: STUDY_QUERY_STALE_TIME_MS,
  });

  const {
    data: searchedResourcesData,
    isError: isSearchResourcesError,
    isFetching: isSearchResourcesFetching,
  } = useQuery({
    queryKey: ['study-catalog-resource-search', PLATFORM_WORKSPACE_SLUG, debouncedQuery],
    queryFn: () => searchStudyResources({ workspace: PLATFORM_WORKSPACE_SLUG, q: debouncedQuery, limit: 24 }),
    enabled: isSearchMode,
    placeholderData: [],
    retry: false,
    staleTime: STUDY_QUERY_STALE_TIME_MS,
  });

  const visibleCards = useMemo(() => dedupeStudyPremiumItems(rootCards), [rootCards]);
  const searchedCards = useMemo(
    () => dedupeStudyPremiumItems((searchedCardsData || []) as SearchableStudyCard[]),
    [searchedCardsData]
  );
  const fileResults = useMemo<CatalogFileSearchResult[]>(() => {
    if (!isSearchMode) return [];

    const results: CatalogFileSearchResult[] = [];
    const seen = new Set<string>();
    for (const card of searchedCards) {
      for (const file of card.files || []) {
        if (!file.url || !fileMatchesQuery(file, card, debouncedQuery)) continue;
        const key = `${card._id}-${file._id || file.url}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const title = getStudyFileDisplayTitle(file, getStudyCardDisplayTitle(card));
        results.push({
          key,
          card,
          file,
          title,
          score: getCatalogFileScore(file, card, debouncedQuery, title),
        });
      }
    }

    return sortCatalogFileResults(results, debouncedQuery, CATALOG_SEARCH_FILE_LIMIT);
  }, [debouncedQuery, isSearchMode, searchedCards]);
  const fileResultCardIds = useMemo(
    () => new Set(fileResults.map((item) => item.card._id)),
    [fileResults]
  );
  const folderResults = useMemo(
    () => searchedCards
      .filter((card) => !getSingleFileShortcut(card) && !fileResultCardIds.has(card._id))
      .slice(0, CATALOG_SEARCH_FOLDER_LIMIT),
    [fileResultCardIds, searchedCards]
  );
  const resourceResults = useMemo(
    () => (searchedResourcesData || []).slice(0, 24),
    [searchedResourcesData]
  );
  const totalSearchResults = fileResults.length + folderResults.length + resourceResults.length;
  const isSearching = isSearchMode && (isSearchCardsFetching || isSearchResourcesFetching);
  const hasSearchError = isSearchMode && isSearchCardsError && isSearchResourcesError;

  return (
    <div className="space-y-5">
      <header className="py-2 sm:py-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="hidden min-w-0 sm:block">
            <span className="inline-flex min-h-7 items-center gap-2 text-[11px] font-black uppercase text-cyan-700 dark:text-cyan-200">
              <SparklesIcon className="h-4 w-4" aria-hidden="true" />
              Premium Catalog
            </span>
            <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
              <h1 className="text-4xl font-black tracking-normal text-slate-950 dark:text-white sm:text-5xl">
                Catalog
              </h1>
              <p className="pb-1 text-sm font-black uppercase text-slate-500 dark:text-slate-400">
                {isInitialLoading
                  ? 'Loading shelves'
                  : isSearchMode
                    ? isSearching ? 'Searching' : `${totalSearchResults.toLocaleString('en-IN')} results`
                    : `${visibleCards.length.toLocaleString('en-IN')} / ${rootCards.length.toLocaleString('en-IN')} shelves`}
              </p>
            </div>
            <div className="mt-3 h-1 w-24 rounded-full bg-cyan-500 shadow-sm shadow-cyan-500/30 dark:bg-cyan-300" />
          </div>
          <div className="flex h-12 w-full items-center gap-3 rounded-full border border-slate-200/80 bg-white/85 px-4 shadow-sm shadow-slate-950/5 backdrop-blur-xl transition focus-within:border-cyan-400 focus-within:shadow-[0_0_0_1px_rgba(34,211,238,0.28),0_18px_42px_rgba(8,145,178,0.12)] dark:border-slate-800 dark:bg-slate-950/70 dark:focus-within:border-cyan-500 lg:max-w-md">
            <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search exams, PDFs, files"
              className="study-search-input min-w-0 flex-1 appearance-none border-0 bg-transparent text-sm font-bold text-slate-950 shadow-none outline-none ring-0 [box-shadow:none] [outline:0] placeholder:text-slate-400 focus:border-transparent focus:shadow-none focus:outline-none focus:ring-0 focus:[box-shadow:none] focus-visible:outline-none dark:text-white"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-400 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Clear search"
              >
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </header>

      {isInitialLoading ? (
        <StudyCardSkeletonGrid count={10} />
      ) : isError && rootCards.length === 0 ? (
        <StudyEmptyState
          icon={<ExclamationTriangleIcon className="h-8 w-8" aria-hidden="true" />}
          eyebrow="Connection"
          title="Catalog could not load"
          description="Your catalog data is still available. Retry to fetch the latest shelves again."
          actions={<StudyActionButton onClick={() => void refetch()}>Retry catalog</StudyActionButton>}
        />
      ) : isSearchMode ? (
        <div className="space-y-5">
          {isSearching && totalSearchResults === 0 ? (
            <StudyCardSkeletonGrid count={10} />
          ) : hasSearchError && totalSearchResults === 0 ? (
            <StudyEmptyState
              icon={<ExclamationTriangleIcon className="h-8 w-8" aria-hidden="true" />}
              eyebrow="Search"
              title="Search could not load"
              description="The search request did not finish. Clear the query and search again."
              actions={<StudyActionButton onClick={() => setQuery('')}>Clear search</StudyActionButton>}
            />
          ) : totalSearchResults > 0 ? (
            <>
              {fileResults.length > 0 && (
                <section className="space-y-3" aria-label="Matching files">
                  <h2 className="text-xl font-black text-slate-950 dark:text-white">Files & PDFs</h2>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {fileResults.map(({ key, file, title }) => {
                      const visual = isStudyBookPackageUrl(file.url, file.mimeType)
                        ? getStudyCardVisual('book', 'emerald')
                        : getStudyCardVisual('download', 'emerald');
                      return (
                        <CatalogPdfCard
                          key={key}
                          file={file}
                          title={title}
                          icon={visual.icon}
                          tone={visual.tone}
                          iconUrl={visual.iconUrl}
                          libraryItem={toStudyCardFileLibraryItem(file, title)}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {resourceResults.length > 0 && (
                <section className="space-y-3" aria-label="Matching resources">
                  <h2 className="text-xl font-black text-slate-950 dark:text-white">Resources</h2>
                  <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:grid-cols-5">
                    {resourceResults.map((resource) => (
                      <CatalogResourceCard key={resource._id} resource={resource} />
                    ))}
                  </div>
                </section>
              )}

              {folderResults.length > 0 && (
                <section className="space-y-3" aria-label="Matching folders and exams">
                  <h2 className="text-xl font-black text-slate-950 dark:text-white">Folders & Exams</h2>
                  <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:grid-cols-5">
                    {folderResults.map((card) => {
                      const shortcutFile = getSingleFileShortcut(card);
                      const visual = shortcutFile
                        ? isStudyBookPackageUrl(shortcutFile.url, shortcutFile.mimeType)
                          ? getStudyCardVisual('book', 'emerald')
                          : getStudyCardVisual('download', 'emerald')
                        : getStudyCardVisual(card.iconKey, card.tone, card.name);
                      const title = getStudyCardDisplayTitle(card);

                      if (shortcutFile) {
                        const fileTitle = getStudyFileDisplayTitle(shortcutFile, title);
                        return (
                          <CatalogPdfCard
                            key={card._id}
                            file={shortcutFile}
                            title={fileTitle}
                            icon={visual.icon}
                            tone={visual.tone}
                            iconUrl={visual.iconUrl}
                            libraryItem={toStudyCardFileLibraryItem(shortcutFile, fileTitle)}
                          />
                        );
                      }

                      return (
                        <CatalogCollectionCard
                          key={card._id}
                          to={`/app/workspace/${PLATFORM_WORKSPACE_SLUG}?card=${card._id}&parent=${CATALOG_PARENT_QUERY}`}
                          title={title}
                          icon={visual.icon}
                          tone={visual.tone}
                          iconUrl={card.iconUrl || visual.iconUrl}
                          libraryItem={toStudyCardLibraryItem(card, title)}
                        />
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          ) : (
            <StudyEmptyState
              icon={<MagnifyingGlassIcon className="h-8 w-8" aria-hidden="true" />}
              title="No matching files or folders"
              description="Try an exam name, subject, class, PDF title, PYQ, book, or syllabus keyword."
              actions={<StudyActionButton onClick={() => setQuery('')}>Clear search</StudyActionButton>}
            />
          )}
        </div>
      ) : visibleCards.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:grid-cols-5">
          {visibleCards.map((card) => {
            const shortcutFile = getSingleFileShortcut(card);
            const visual = shortcutFile
              ? isStudyBookPackageUrl(shortcutFile.url, shortcutFile.mimeType)
                ? getStudyCardVisual('book', 'emerald')
                : getStudyCardVisual('download', 'emerald')
              : getStudyCardVisual(card.iconKey, card.tone, card.name);
            const title = getStudyCardDisplayTitle(card);

            if (shortcutFile) {
              const fileTitle = getStudyFileDisplayTitle(shortcutFile, title);
              return (
                <CatalogPdfCard
                  key={card._id}
                  file={shortcutFile}
                  title={fileTitle}
                  icon={visual.icon}
                  tone={visual.tone}
                  iconUrl={visual.iconUrl}
                  libraryItem={toStudyCardFileLibraryItem(shortcutFile, fileTitle)}
                />
              );
            }

            return (
              <CatalogCollectionCard
                key={card._id}
                to={`/app/workspace/${PLATFORM_WORKSPACE_SLUG}?card=${card._id}&parent=${CATALOG_PARENT_QUERY}`}
                title={title}
                icon={visual.icon}
                tone={visual.tone}
                iconUrl={card.iconUrl || visual.iconUrl}
                libraryItem={toStudyCardLibraryItem(card, title)}
              />
            );
          })}
        </div>
      ) : query ? (
        <StudyEmptyState
          icon={<MagnifyingGlassIcon className="h-8 w-8" aria-hidden="true" />}
          title="No matching card"
          description="Shorten the search term or clear search to view every catalog card."
          actions={<StudyActionButton onClick={() => setQuery('')}>Clear search</StudyActionButton>}
        />
      ) : (
        <StudyEmptyState
          icon={<MagnifyingGlassIcon className="h-8 w-8" aria-hidden="true" />}
          eyebrow="Starting library"
          title="Catalog is coming soon"
          description="The first catalog shelves have not been published yet. Request content or add the first folder from admin."
          actions={<StudyActionLink to="/app/contribute">Request Content</StudyActionLink>}
        />
      )}
    </div>
  );
};

export default StudyDiscoverPage;
