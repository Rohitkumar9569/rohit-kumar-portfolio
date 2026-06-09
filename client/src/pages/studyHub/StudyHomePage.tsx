import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  getResourceVisual,
  getStudyCardVisual,
  type StudyIcon,
  type StudyTone,
  type StudyTileMetaInput,
} from '../../components/study/StudyVisualCards';
import {
  StudyHomeTileContent as HomeTileContent,
  studyHomeFloatingActionClassName as homeFloatingSaveClassName,
  studyHomeTileClassName as homeTileClassName,
} from '../../components/study/StudyHomeTile';
import { useStudyActivity } from '../../hooks/useStudyActivity';
import { useStudyPreferences } from '../../hooks/useStudyPreferences';
import SaveLibraryItemButton from '../../components/study/SaveLibraryItemButton';
import {
  STUDY_QUERY_GC_TIME_MS,
  STUDY_QUERY_STALE_TIME_MS,
  fetchStudyCards,
  type StudyCard,
  type StudyCardFile,
} from '../../studyHubApi';
import { getSingleFileShortcut, getStudyCardDisplayTitle } from '../../utils/studyCardNavigation';
import {
  getStudyPdfReaderHref,
  isStudyBookPackageUrl,
  isStudyReadableDocumentUrl,
  warmStudyReadableDocument,
} from '../../utils/studyPdfReader';
import {
  toStudyCardFileLibraryItem,
  toStudyCardLibraryItem,
  type LocalLibraryItem,
} from '../../utils/studyLibrary';
import { getStudyFileDisplayTitle, getStudyFileSubtitle } from '../../utils/studyBookDisplay';
import { getStudyGoalTypeLabel, inferStudyGoalType } from '../../utils/studyHierarchy';
import {
  getStudyCardListCacheKey,
  readStudyCardListCache,
  writeStudyCardListCache,
} from '../../utils/studyCardCache';
import { dedupeStudyPremiumItems } from '../../utils/studyPremiumOrder';
import {
  StudyActionButton,
  StudyActionLink,
  StudyCardSkeletonGrid,
  StudyEmptyState,
} from '../../components/study/StudyPremium';

const PLATFORM_WORKSPACE_SLUG = 'study-hub';
const HOME_PARENT_QUERY = encodeURIComponent('/app');
const HOME_LIBRARY_MOBILE_PREVIEW_COUNT = 4;
const HOME_LIBRARY_DESKTOP_PREVIEW_COUNT = 5;

const formatRecentTime = (value: string) => {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return 'Recently opened';

  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const getCardMeta = (card: StudyCard, shortcutFile: StudyCardFile | null) => {
  if (shortcutFile) {
    return getStudyFileSubtitle(shortcutFile);
  }

  return getStudyGoalTypeLabel(inferStudyGoalType(card));
};

const compactGridClassName =
  'grid w-full grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-4 lg:grid-cols-5';

const homeSectionClassName =
  'px-0 py-1';

const HomeSection = ({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <section className={homeSectionClassName} aria-label={title}>
    <div className="mb-3 flex items-end justify-between gap-3 px-4 sm:px-0">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">{eyebrow}</p>
        )}
        <h2 className="truncate text-lg font-black tracking-tight text-slate-950 dark:text-white sm:text-xl">{title}</h2>
        {description && (
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    {children}
  </section>
);

const getHomeShelfLimit = () => {
  if (typeof window === 'undefined') return 10;
  if (window.matchMedia('(min-width: 1280px)').matches) return 10;
  if (window.matchMedia('(min-width: 768px)').matches) return 8;
  return 4;
};

const useHomeShelfLimit = () => {
  const [limit, setLimit] = useState(getHomeShelfLimit);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateLimit = () => setLimit(getHomeShelfLimit());
    const desktopQuery = window.matchMedia('(min-width: 1280px)');
    const tabletQuery = window.matchMedia('(min-width: 768px)');
    desktopQuery.addEventListener('change', updateLimit);
    tabletQuery.addEventListener('change', updateLimit);
    updateLimit();

    return () => {
      desktopQuery.removeEventListener('change', updateLimit);
      tabletQuery.removeEventListener('change', updateLimit);
    };
  }, []);

  return limit;
};

const HomeLinkTile = ({
  to,
  title,
  meta,
  icon,
  tone,
  iconUrl,
  libraryItem,
}: {
  to: string;
  title: string;
  meta: string;
  icon: StudyIcon;
  tone: StudyTone;
  iconUrl?: string;
  libraryItem?: LocalLibraryItem;
}) => (
  <article className={homeTileClassName}>
    <Link to={to} className="flex min-h-0 flex-1 flex-col">
      <HomeTileContent icon={icon} tone={tone} title={title} meta={meta} iconUrl={iconUrl} />
    </Link>
    {libraryItem && (
      <SaveLibraryItemButton
        item={libraryItem}
        iconOnly
        className={homeFloatingSaveClassName}
      />
    )}
  </article>
);

const HomeAnchorTile = ({
  href,
  title,
  meta,
  icon,
  tone,
  iconUrl,
  libraryItem,
  sourceName,
  sourceType,
  year,
  stage,
  paper,
}: {
  href: string;
  title: string;
  meta: string;
  icon: StudyIcon;
  tone: StudyTone;
  iconUrl?: string;
  libraryItem?: LocalLibraryItem;
} & StudyTileMetaInput) => {
  const location = useLocation();
  const isReadable = isStudyReadableDocumentUrl(href);
  const isBookPackage = isStudyBookPackageUrl(href);
  const readerHref = getStudyPdfReaderHref(href, title, `${location.pathname}${location.search}`);
  const warmReader = () => {
    if (isBookPackage) warmStudyReadableDocument(href);
  };

  return (
    <article className={homeTileClassName}>
      {isReadable ? (
        <Link to={readerHref} onFocus={warmReader} onPointerEnter={warmReader} className="flex min-h-0 flex-1 flex-col">
          <HomeTileContent
            icon={icon}
            tone={tone}
            title={title}
            meta={meta}
            iconUrl={iconUrl}
            sourceName={sourceName}
            sourceType={sourceType}
            year={year}
            stage={stage}
            paper={paper}
          />
        </Link>
      ) : (
        <a href={href} target="_blank" rel="noreferrer" className="flex min-h-0 flex-1 flex-col">
          <HomeTileContent
            icon={icon}
            tone={tone}
            title={title}
            meta={meta}
            iconUrl={iconUrl}
            sourceName={sourceName}
            sourceType={sourceType}
            year={year}
            stage={stage}
            paper={paper}
          />
        </a>
      )}
      {libraryItem && (
        <SaveLibraryItemButton
          item={libraryItem}
          iconOnly
          className={homeFloatingSaveClassName}
        />
      )}
    </article>
  );
};

const StudyHomePage = () => {
  const queryClient = useQueryClient();
  const { recentItems } = useStudyActivity();
  const { preferences } = useStudyPreferences();
  const shelfLimit = useHomeShelfLimit();
  const recentShelfLimit = shelfLimit >= 10 ? 5 : shelfLimit;
  const libraryPreviewCount = shelfLimit >= 8
    ? HOME_LIBRARY_DESKTOP_PREVIEW_COUNT
    : HOME_LIBRARY_MOBILE_PREVIEW_COUNT;
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const homeCardsQueryKey = useMemo(
    () => ['study-home-cards', PLATFORM_WORKSPACE_SLUG, 'summary-v2'] as const,
    []
  );
  const homeCardsCacheKey = useMemo(
    () => getStudyCardListCacheKey('student-home', PLATFORM_WORKSPACE_SLUG, 'summary-v2'),
    []
  );
  const persistedAllCards = useMemo(
    () => readStudyCardListCache(homeCardsCacheKey),
    [homeCardsCacheKey]
  );
  const queryCachedAllCards = queryClient.getQueryData<StudyCard[]>(homeCardsQueryKey);
  const cachedAllCards = queryCachedAllCards?.length ? queryCachedAllCards : persistedAllCards;
  const {
    data: allCardsData,
    isError,
    isFetched,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: homeCardsQueryKey,
    queryFn: () => fetchStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent: 'all', summary: true }),
    placeholderData: () => cachedAllCards.length ? cachedAllCards : undefined,
    retry: 1,
    gcTime: STUDY_QUERY_GC_TIME_MS,
    staleTime: STUDY_QUERY_STALE_TIME_MS,
    refetchOnMount: (query) => {
      const data = query.state.data as StudyCard[] | undefined;
      return !data?.length;
    },
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    networkMode: 'offlineFirst',
  });
  const allCards = allCardsData?.length ? allCardsData : cachedAllCards;

  useEffect(() => {
    if (allCardsData?.length) {
      writeStudyCardListCache(homeCardsCacheKey, allCardsData);
    }
  }, [allCardsData, homeCardsCacheKey]);
  const cardsByParentId = useMemo(() => {
    const groups = new Map<string, StudyCard[]>();
    allCards.forEach((card) => {
      const parentKey = card.parentId || 'root';
      const siblings = groups.get(parentKey) || [];
      siblings.push(card);
      groups.set(parentKey, siblings);
    });

    groups.forEach((cards, parentKey) => {
      groups.set(parentKey, dedupeStudyPremiumItems(cards));
    });

    return groups;
  }, [allCards]);
  const rootCards = cardsByParentId.get('root') || [];

  const sortedRootCards = useMemo(
    () => dedupeStudyPremiumItems(rootCards),
    [rootCards]
  );
  const homeLibrarySections = useMemo(
    () => sortedRootCards.slice(0, 6),
    [sortedRootCards]
  );
  const activeRecentItems = recentItems.slice(0, recentShelfLimit);
  const isHomeLoading = rootCards.length === 0 && cachedAllCards.length === 0 && activeRecentItems.length === 0 && !isError && isLoading;
  const isTrulyEmpty = isFetched && !isError && rootCards.length === 0;
  const hasSectionCardPreferences = useMemo(
    () => Object.values(preferences.selectedSectionCardSlugs || {}).some((slugs) => slugs.length > 0),
    [preferences.selectedSectionCardSlugs]
  );
  const selectedHomeCards = useMemo(
    () => hasSectionCardPreferences
      ? []
      : preferences.selectedWorkspaceSlugs
      .slice(0, HOME_LIBRARY_DESKTOP_PREVIEW_COUNT)
      .map((slug) => allCards.find((card) => card.slug === slug))
      .filter((card): card is StudyCard => Boolean(card)),
    [allCards, hasSectionCardPreferences, preferences.selectedWorkspaceSlugs]
  );
  const getSectionChildrenForHome = (section: StudyCard, children: StudyCard[]) => {
    const preferredSlugs = preferences.selectedSectionCardSlugs?.[section.slug] || [];
    if (!preferredSlugs.length) return children;

    const selectedChildren = preferredSlugs
      .map((slug) => children.find((card) => card.slug === slug))
      .filter((card): card is StudyCard => Boolean(card));
    const selectedIds = new Set(selectedChildren.map((card) => card._id));
    return [
      ...selectedChildren,
      ...children.filter((card) => !selectedIds.has(card._id)),
    ];
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const renderStudyCardTile = (card: StudyCard) => {
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
        <HomeAnchorTile
          key={card._id}
          href={shortcutFile.url}
          title={title}
          meta={getCardMeta(card, shortcutFile)}
          icon={visual.icon}
          tone={visual.tone}
          iconUrl={card.iconUrl || visual.iconUrl}
          sourceName={shortcutFile.sourceName}
          sourceType={shortcutFile.sourceType}
          year={shortcutFile.year}
          stage={shortcutFile.stage}
          paper={shortcutFile.paper}
          libraryItem={toStudyCardFileLibraryItem(shortcutFile, fileTitle)}
        />
      );
    }

    return (
      <HomeLinkTile
        key={card._id}
        to={`/app/workspace/${PLATFORM_WORKSPACE_SLUG}?card=${card._id}&parent=${HOME_PARENT_QUERY}`}
        title={title}
        meta={getCardMeta(card, shortcutFile)}
        icon={visual.icon}
        tone={visual.tone}
        iconUrl={card.iconUrl || visual.iconUrl}
        libraryItem={toStudyCardLibraryItem(card, title)}
      />
    );
  };

  return (
    <div className="space-y-5">
      {activeRecentItems.length > 0 && (
        <HomeSection
          title="Continue recently opened"
        >
          <div className={compactGridClassName}>
            {activeRecentItems.map((item) => {
              const visual = item.iconKey || item.iconUrl
                ? getStudyCardVisual(item.iconKey, item.tone, item.title)
                : getResourceVisual(item.type);
              return (
                <Link
                  key={item.slug}
                  to={item.href}
                  className={homeTileClassName}
                >
                  <HomeTileContent
                    icon={visual.icon}
                    tone={visual.tone}
                    title={item.title}
                    meta={formatRecentTime(item.lastViewedAt)}
                    iconUrl={item.iconUrl || visual.iconUrl}
                  />
                </Link>
              );
            })}
          </div>
        </HomeSection>
      )}

      {selectedHomeCards.length > 0 && (
        <HomeSection title="Selected exams">
          <div className={compactGridClassName}>
            {selectedHomeCards.map(renderStudyCardTile)}
          </div>
        </HomeSection>
      )}

      <section>
        {isHomeLoading ? (
          <StudyCardSkeletonGrid count={10} />
        ) : isError && rootCards.length === 0 ? (
          <StudyEmptyState
            icon={<ExclamationTriangleIcon className="h-8 w-8" aria-hidden="true" />}
            eyebrow="Connection"
            title="Study Hub content could not load"
            description={
              import.meta.env.DEV
                ? 'Start the API server in another terminal with `cd server && npm run dev`, then retry. Cached cards will appear automatically when the server is back.'
                : 'Check your connection and retry to load the latest Study Hub cards.'
            }
            actions={<StudyActionButton onClick={() => void refetch()}>Retry loading</StudyActionButton>}
          />
        ) : homeLibrarySections.length > 0 ? (
          <div className="space-y-5">
            {homeLibrarySections.map((section) => {
              const children = cardsByParentId.get(section._id) || [];
              const orderedChildren = getSectionChildrenForHome(section, children);
              const isExpanded = expandedSections.has(section._id);
              const visibleChildren = isExpanded
                ? orderedChildren
                : orderedChildren.slice(0, libraryPreviewCount);
              const hasMore = orderedChildren.length > libraryPreviewCount;

              return (
                <HomeSection
                  key={section._id}
                  title={getStudyCardDisplayTitle(section)}
                >
                  {visibleChildren.length > 0 ? (
                    <div className={compactGridClassName}>
                      {visibleChildren.map(renderStudyCardTile)}
                    </div>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-slate-300/80 px-4 py-5 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:text-slate-400">
                      This category is being organized.
                    </p>
                  )}

                  {hasMore && (
                    <div className="flex justify-center pt-3">
                      <button
                        type="button"
                        onClick={() => toggleSection(section._id)}
                        className="inline-flex items-center gap-2 rounded-full border border-cyan-300/60 bg-cyan-500/10 px-4 py-2 text-sm font-black text-cyan-700 shadow-[0_14px_34px_rgba(6,182,212,0.16)] transition hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-cyan-500/15 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-100 dark:shadow-[0_16px_38px_rgba(8,145,178,0.18)]"
                        aria-label={isExpanded ? `Collapse ${section.name}` : `Show more ${section.name}`}
                      >
                        <span>
                          {isExpanded
                            ? 'Show less'
                            : 'Show more'}
                        </span>
                        <ChevronDownIcon
                          className={['h-5 w-5 transition-transform duration-200', isExpanded ? 'rotate-180' : ''].join(' ')}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  )}
                </HomeSection>
              );
            })}
          </div>
        ) : isTrulyEmpty ? (
          <StudyEmptyState
            icon={<ArrowDownTrayIcon className="h-8 w-8" aria-hidden="true" />}
            eyebrow="Starting library"
            title="Content is coming soon"
            description="The first home cards have not been published yet. Request content or add the first exam from admin."
            actions={<StudyActionLink to="/app/contribute">Request Content</StudyActionLink>}
          />
        ) : null}

      </section>
    </div>
  );
};

export default StudyHomePage;
