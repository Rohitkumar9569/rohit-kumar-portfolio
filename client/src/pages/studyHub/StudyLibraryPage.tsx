import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  BookmarkIcon,
  ClockIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import SaveLibraryItemButton from '../../components/study/SaveLibraryItemButton';
import {
  getResourceVisual,
  StudyAnchorTile,
  getStudyCardVisual,
  type StudyTone,
} from '../../components/study/StudyVisualCards';
import { useStudyActivity } from '../../hooks/useStudyActivity';
import { useStudyLibrary } from '../../hooks/useStudyLibrary';
import type { RecentStudyItem } from '../../utils/studyActivity';
import type { LocalLibraryItem } from '../../utils/studyLibrary';

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

const libraryTopActionClassName =
  'absolute right-2 top-2 z-20 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/80 bg-white/85 text-slate-600 shadow-[0_10px_22px_rgba(15,23,42,0.16)] backdrop-blur-md dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-200 sm:right-2.5 sm:top-2.5 sm:h-8 sm:w-8';

const librarySaveActionClassName =
  'study-save-action absolute right-2 top-2 z-20 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/80 bg-white/85 text-slate-600 shadow-[0_10px_22px_rgba(15,23,42,0.16)] backdrop-blur-md dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-200 sm:right-2.5 sm:top-2.5 sm:h-8 sm:w-8';

const formatRecentTime = (value: string) => {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'Recently';

  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const getMeta = (item: Pick<LocalLibraryItem | RecentStudyItem, 'workspaceName' | 'subject' | 'type'> & { year?: number }) => {
  const parts = [item.workspaceName, item.subject, item.year].filter(Boolean);
  return parts.length ? parts.join(' / ') : item.type;
};

const isFolderSummaryItem = (item: Pick<LocalLibraryItem | RecentStudyItem, 'slug' | 'summary' | 'subject'>) => {
  const summary = item.summary || '';
  return (
    item.slug.startsWith('card-') ||
    item.subject === 'Folder' ||
    summary === 'Study folder' ||
    /\b\d+\s+(?:folder|folders)\b/i.test(summary)
  );
};

type LibraryVisualItem = {
  slug: string;
  title: string;
  type: LocalLibraryItem['type'];
  summary?: string;
  subject?: string;
  sourceType?: string;
  sourceName?: string;
  workspaceName?: string;
  iconKey?: string;
  iconUrl?: string;
  tone?: StudyTone;
  href?: string;
  year?: number;
};

const isLibraryFileItem = (item: LibraryVisualItem) => (
  item.slug.startsWith('file-') ||
  item.subject === 'PDF document' ||
  item.subject === 'Complete book' ||
  item.sourceType === 'file'
);

const getLibraryDirectFileHref = (item: LibraryVisualItem) => {
  if (!item.href || !isLibraryFileItem(item)) return '';

  const href = item.href.trim();
  if (!href) return '';

  try {
    const parsed = new URL(href, 'https://study-hub.local');
    const readerFileUrl = parsed.searchParams.get('url') || parsed.searchParams.get('src') || parsed.searchParams.get('file');
    if (readerFileUrl) return readerFileUrl;

    if (!parsed.pathname.startsWith('/app/')) return href;
  } catch {
    if (!href.startsWith('/app/')) return href;
  }

  return '';
};

const getLibraryItemVisual = (item: LibraryVisualItem) => {
  if (item.iconKey || item.iconUrl || item.tone) {
    return getStudyCardVisual(item.iconKey, item.tone, item.title);
  }

  if (isLibraryFileItem(item)) {
    return getStudyCardVisual(item.type === 'book' ? 'book' : 'download', 'emerald', item.title);
  }

  if (isFolderSummaryItem(item)) {
    return getStudyCardVisual(undefined, undefined, item.title);
  }

  return getResourceVisual(item.type);
};

const LibraryFileResourceCard = ({
  item,
  fileHref,
  libraryItem,
}: {
  item: LibraryVisualItem;
  fileHref: string;
  libraryItem?: LocalLibraryItem;
}) => {
  const visual = getLibraryItemVisual(item);
  const isBookLike = item.type === 'book' || item.subject === 'Complete book';

  return (
    <StudyAnchorTile
      href={fileHref}
      title={item.title}
      subtitle={item.subject || (isBookLike ? 'Complete book' : 'PDF document')}
      badge={isBookLike ? 'BOOK' : item.subject === 'PDF document' ? 'PDF' : 'FILE'}
      icon={visual.icon}
      tone={visual.tone}
      iconUrl={item.iconUrl || visual.iconUrl}
      variant={isBookLike ? 'book' : 'default'}
      libraryItem={libraryItem}
      className="h-full"
    />
  );
};

const RecentResourceCard = ({ item }: { item: RecentStudyItem }) => {
  const fileHref = getLibraryDirectFileHref(item);
  if (fileHref) {
    return <LibraryFileResourceCard item={item} fileHref={fileHref} />;
  }

  const visual = getLibraryItemVisual(item);
  const Icon = visual.icon;
  const accent = toneAccents[visual.tone];
  const iconUrl = item.iconUrl || visual.iconUrl;
  const meta = isFolderSummaryItem(item) ? '' : item.summary || getMeta(item);

  return (
    <Link
      to={item.href}
      className="study-card-surface group relative flex h-44 flex-col overflow-hidden rounded-[1.25rem] border border-white/70 bg-white p-2.5 shadow-[0_14px_32px_rgba(15,23,42,0.095)] ring-1 ring-slate-950/[0.035] focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_42px_rgba(0,0,0,0.38)] dark:ring-white/5 sm:h-[11rem] sm:p-3 lg:h-[11.25rem]"
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.bar}`} />
      <div className="flex flex-1 flex-col items-center justify-center pb-8 pt-2 text-center sm:pb-7">
        <span className="relative flex h-[6rem] w-[6.35rem] items-center justify-center sm:h-[6.25rem] sm:w-[6.65rem] lg:h-[6.45rem] lg:w-[6.85rem]">
          <span className="pointer-events-none absolute bottom-2 h-5 w-[58%] rounded-full bg-slate-950/10 blur-xl dark:bg-cyan-300/10" />
          {iconUrl ? (
            <img
              src={iconUrl}
              alt=""
              loading="lazy"
              className="study-icon-asset study-tile-icon-asset relative z-10 h-[5.25rem] w-[5.25rem] object-contain sm:h-[5.55rem] sm:w-[5.55rem] lg:h-[5.85rem] lg:w-[5.85rem]"
            />
          ) : (
            <Icon className="relative z-10 h-[3.9rem] w-[3.9rem] text-slate-700 dark:text-slate-200 sm:h-[4.25rem] sm:w-[4.25rem] lg:h-[4.45rem] lg:w-[4.45rem]" aria-hidden="true" />
          )}
        </span>
        <h3 className={`mt-0 line-clamp-2 break-words text-[13px] font-black leading-tight sm:text-sm ${accent.text}`}>
          {item.title}
        </h3>
        {meta && (
          <p className="mt-1 max-w-full truncate text-[10px] font-bold leading-4 text-slate-500 dark:text-slate-400 sm:text-[11px]">
            {meta}
          </p>
        )}
      </div>
      <span className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-3.25rem)] items-center gap-1 rounded-lg border border-slate-200 bg-white/90 px-2 py-1 text-[10px] font-black text-slate-500 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
        <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="truncate">{formatRecentTime(item.lastViewedAt)}</span>
      </span>
      <span className={libraryTopActionClassName}>
        <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  );
};

const SavedResourceCard = ({
  item,
}: {
  item: LocalLibraryItem;
}) => {
  const fileHref = getLibraryDirectFileHref(item);
  if (fileHref) {
    return <LibraryFileResourceCard item={item} fileHref={fileHref} libraryItem={item} />;
  }

  const visual = getLibraryItemVisual(item);
  const Icon = visual.icon;
  const accent = toneAccents[visual.tone];
  const iconUrl = item.iconUrl || visual.iconUrl;
  const meta = isFolderSummaryItem(item) ? '' : item.summary || getMeta(item);

  return (
    <article className="study-card-surface group relative flex h-44 flex-col overflow-hidden rounded-[1.25rem] border border-white/70 bg-white p-2.5 shadow-[0_14px_32px_rgba(15,23,42,0.095)] ring-1 ring-slate-950/[0.035] focus-within:ring-0 dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_18px_42px_rgba(0,0,0,0.38)] dark:ring-white/5 sm:h-[11rem] sm:p-3 lg:h-[11.25rem]">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.bar}`} />
      <Link to={item.href} className="flex flex-1 flex-col items-center justify-center pb-4 pt-2 text-center sm:pb-3">
        <span className="relative flex h-[6rem] w-[6.35rem] items-center justify-center sm:h-[6.25rem] sm:w-[6.65rem] lg:h-[6.45rem] lg:w-[6.85rem]">
          <span className="pointer-events-none absolute bottom-2 h-5 w-[58%] rounded-full bg-slate-950/10 blur-xl dark:bg-cyan-300/10" />
          {iconUrl ? (
            <img
              src={iconUrl}
              alt=""
              loading="lazy"
              className="study-icon-asset study-tile-icon-asset relative z-10 h-[5.25rem] w-[5.25rem] object-contain sm:h-[5.55rem] sm:w-[5.55rem] lg:h-[5.85rem] lg:w-[5.85rem]"
            />
          ) : (
            <Icon className="relative z-10 h-[3.9rem] w-[3.9rem] text-slate-700 dark:text-slate-200 sm:h-[4.25rem] sm:w-[4.25rem] lg:h-[4.45rem] lg:w-[4.45rem]" aria-hidden="true" />
          )}
        </span>
        <h2 className={`mt-0 line-clamp-2 break-words text-[13px] font-black leading-tight sm:text-sm ${accent.text}`}>
          {item.title}
        </h2>
        {meta && (
          <p className="mt-1 max-w-full truncate text-[10px] font-bold leading-4 text-slate-500 dark:text-slate-400 sm:text-[11px]">
            {meta}
          </p>
        )}
      </Link>
      <SaveLibraryItemButton
        item={item}
        iconOnly
        className={librarySaveActionClassName}
        label="Save"
        savedLabel="Remove from Library"
      />
    </article>
  );
};

const LibrarySkeleton = () => (
  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-4 lg:grid-cols-5">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={index}
        className="study-card-surface h-40 animate-pulse overflow-hidden rounded-[1.25rem] border border-slate-200/90 bg-white p-2.5 shadow-[0_14px_32px_rgba(15,23,42,0.095)] ring-1 ring-slate-950/[0.03] dark:border-slate-800 dark:bg-slate-900 dark:ring-white/5 sm:h-[10.25rem] sm:p-3 lg:h-[10.5rem]"
      >
        <div className="mx-auto h-[4.85rem] w-[5.25rem] rounded-2xl bg-slate-200 dark:bg-white/10 sm:h-[5.15rem] sm:w-[5.65rem]" />
        <div className="mx-auto mt-2 h-4 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
        <div className="mx-auto mt-2 h-3 w-1/2 rounded bg-slate-200 dark:bg-white/10" />
      </div>
    ))}
  </div>
);

const StudyLibraryPage = () => {
  const { items, isLoading } = useStudyLibrary();
  const { recentItems, clear: clearRecent } = useStudyActivity();
  const hasContent = items.length > 0 || recentItems.length > 0 || isLoading;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-2">
      {recentItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
              Recent
            </h2>
            <button
              type="button"
              onClick={clearRecent}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-500 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-red-400/10 dark:hover:text-red-300"
            >
              Clear
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-4 lg:grid-cols-5">
            {recentItems.slice(0, 4).map((item) => (
              <RecentResourceCard key={item.slug} item={item} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        {hasContent && (
          <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
            Saved
          </h2>
        )}

        {isLoading ? (
          <LibrarySkeleton />
        ) : items.length === 0 ? (
          <div className="flex min-h-[calc(100dvh-14rem)] items-center justify-center px-5 py-10 text-center">
            <div className="mx-auto max-w-xs">
              <span className="study-primary-action mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_16px_34px_rgba(15,23,42,0.18)] dark:bg-white dark:text-slate-950">
                <BookmarkIcon className="h-7 w-7" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                No saved resources
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                Save papers and notes for quick access.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <Link
                  to="/app/catalog"
                  className="study-primary-action inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  Catalog
                </Link>
                <Link
                  to="/app/ask"
                  className="study-control-surface inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/10"
                >
                  <MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />
                  Ask
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-4 lg:grid-cols-5">
            {items.map((item) => (
              <SavedResourceCard key={item.slug} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default StudyLibraryPage;
