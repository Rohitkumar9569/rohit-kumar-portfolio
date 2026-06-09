import { useCallback, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  getStudyRouteOwnerPath,
  type StudyRouteState,
} from '../../components/study/studyActiveRoute';
import {
  getStudyCardVisual,
  StudyAnchorTile,
  StudyLinkTile,
  StudyTileGrid,
} from '../../components/study/StudyVisualCards';
import {
  StudyActionButton,
  StudyActionLink,
  StudyCardSkeletonGrid,
  StudyEmptyState,
  StudySectionHeader,
} from '../../components/study/StudyPremium';
import {
  STUDY_QUERY_STALE_TIME_MS,
  fetchStudyCard,
  fetchStudyCards,
  studyCardDetailQueryKey,
  studyCardQueryKey,
  type StudyCard,
  type StudyCardFile,
} from '../../studyHubApi';
import { getPdfThumbnailUrl } from '../../utils/cloudinaryPdfThumbnail';
import { getStudyCardDisplayTitle } from '../../utils/studyCardNavigation';
import { toStudyCardFileLibraryItem, toStudyCardLibraryItem } from '../../utils/studyLibrary';
import { addRecentStudyCard } from '../../utils/studyActivity';
import { getStudyFileBadge, getStudyFileCompactMeta, getStudyFileDisplayTitle } from '../../utils/studyBookDisplay';
import { getStudyAssetUrl, isStudyBookPackageUrl, isStudyPdfUrl, isStudyReadableDocumentUrl } from '../../utils/studyPdfReader';
import { dedupeStudyPremiumItems, getStudyPremiumPriority } from '../../utils/studyPremiumOrder';

const PLATFORM_WORKSPACE_SLUG = 'study-hub';
const objectIdPattern = /^[a-f\d]{24}$/i;

const getShelfBadge = (name = '') => {
  const key = name.toLowerCase();
  if (key.includes('ncert')) return 'NCERT';
  if (key.includes('previous') || key.includes('pyq') || key.includes('paper')) return 'PYQ';
  if (key.includes('syllabus')) return 'Syllabus';
  if (key.includes('study material') || key.includes('material')) return 'Material';
  if (key.includes('textbook') || key.includes('book')) return 'Books';
  if (key.includes('practice') || key.includes('worksheet') || key.includes('question')) return 'Practice';
  if (key.includes('answer')) return 'Answer Key';
  if (key.includes('note')) return 'Notes';
  if (key.includes('sample')) return 'Sample Papers';
  if (key.includes('update')) return 'Updates';
  return '';
};

const getEmptyShelfCopy = (name = '') => {
  const shelfBadge = getShelfBadge(name);

  if (shelfBadge === 'NCERT') {
    return {
      eyebrow: 'NCERT shelf',
      title: 'NCERT Books shelf is ready',
      description: 'Official NCERT books and complete book PDFs will appear here as clean study cards.',
    };
  }

  if (shelfBadge === 'PYQ') {
    return {
      eyebrow: 'PYQ shelf',
      title: 'Previous papers shelf is ready',
      description: 'Year-wise papers, sample papers, and answer keys stay organized in this shelf.',
    };
  }

  if (shelfBadge === 'Syllabus') {
    return {
      eyebrow: 'Syllabus shelf',
      title: 'Syllabus shelf is ready',
      description: 'Latest syllabus PDFs and official circulars will appear here.',
    };
  }

  if (shelfBadge === 'Material' || shelfBadge === 'Notes' || shelfBadge === 'Practice') {
    return {
      eyebrow: `${shelfBadge} shelf`,
      title: `${shelfBadge} shelf is ready`,
      description: 'Study files will appear here as neatly arranged cards.',
    };
  }

  return {
    eyebrow: 'Ready shelf',
    title: `${name || 'Folder'} is ready`,
    description: 'This folder is ready. New resources will appear here.',
  };
};

const normalizeOrderKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const branchOrderHints: Array<[RegExp, number]> = [
  [/\bsyllabus\b/, 10],
  [/\bncert\b.*\bbooks?\b|\btextbooks?\b|\bbooks?\b/, 20],
  [/\bncert\b.*\bsolutions?\b|\bsolutions?\b/, 30],
  [/\bstudy materials?\b|\bmaterials?\b/, 40],
  [/\brevision\b|\bnotes?\b/, 50],
  [/\bprevious year\b|\bpyq\b|\bpast papers?\b|\bquestion papers?\b/, 60],
  [/\bsample papers?\b/, 70],
  [/\bmock tests?\b/, 75],
  [/\bpractice\b/, 80],
  [/\bimportant questions?\b/, 85],
  [/\bexemplar\b/, 90],
  [/\bformula\b/, 95],
  [/\banswer keys?\b/, 100],
  [/\bmarking schemes?\b/, 105],
  [/\bupdates?\b|\bnotification\b/, 110],
  [/\bstrategy\b/, 120],
  [/\binterview\b/, 130],
];

const exactBranchOrder = new Map<string, number>([
  ['overview', 5],
  ['about', 5],
  ['board pattern', 8],
  ['syllabus', 10],
  ['ncert books', 20],
  ['books', 20],
  ['textbooks', 20],
  ['board textbooks', 20],
  ['ncert solutions', 30],
  ['study material', 40],
  ['study materials', 40],
  ['revision notes', 50],
  ['notes', 50],
  ['previous year papers', 60],
  ['previous year paper', 60],
  ['pyq', 60],
  ['pyqs', 60],
  ['sample papers', 70],
  ['mock tests', 75],
  ['practice questions', 80],
  ['practice', 80],
  ['important questions', 85],
  ['ncert exemplar', 90],
  ['formula sheets', 95],
  ['answer keys', 100],
  ['answer key', 100],
  ['marking schemes', 105],
  ['updates', 110],
  ['strategy', 120],
  ['interview', 130],
]);

const getBranchOrder = (name = '') => {
  const key = normalizeOrderKey(name);
  const classMatch = key.match(/^class\s+(\d{1,2})$/);
  if (classMatch) return 100 + Number(classMatch[1]);

  const yearMatch = key.match(/^(?:year\s*)?(\d{4})$/);
  if (yearMatch) return 200 + (3000 - Number(yearMatch[1]));

  const exact = exactBranchOrder.get(key);
  if (typeof exact === 'number') return exact;

  const hint = branchOrderHints.find(([pattern]) => pattern.test(key));
  if (hint) return hint[1];

  return 500;
};

const resourceTypeOrder = new Map<string, number>([
  ['book', 10],
  ['syllabus', 20],
  ['pyq', 30],
  ['sample_paper', 40],
  ['answer_key', 50],
  ['material', 60],
  ['notes', 70],
  ['practice', 80],
  ['update', 90],
]);

const getFileOrderKey = (file: StudyCardFile) => {
  const typeOrder = resourceTypeOrder.get(String(file.resourceType || '').toLowerCase()) ?? 99;
  const yearOrder = file.year ? 3000 - Number(file.year) : 9999;
  return [
    String(typeOrder).padStart(3, '0'),
    String(yearOrder).padStart(4, '0'),
    normalizeOrderKey(file.subject || ''),
    normalizeOrderKey(file.paper || ''),
    normalizeOrderKey(file.stage || ''),
    normalizeOrderKey(file.name || ''),
  ].join('|');
};

const subjectOrderKeys = [
  'english',
  'hindi',
  'sanskrit',
  'mathematics',
  'physics',
  'chemistry',
  'biology',
  'computer science',
  'informatics practices',
  'accountancy',
  'business studies',
  'economics',
  'history',
  'geography',
  'political science',
  'polity',
  'psychology',
  'sociology',
  'home science',
  'biotechnology',
  'fine art',
  'knowledge traditions practices of india',
  'general',
] as const;

const subjectFolderOrder = new Map<string, number>(subjectOrderKeys.map((key, index) => [key, 300 + index]));
const subjectFolderKeys = new Set<string>(subjectOrderKeys);

const getCardFileSubjectKey = (card: StudyCard) =>
  normalizeOrderKey((card.files || []).find((file) => file.subject)?.subject || '');

const getSubjectFolderKey = (card: StudyCard) => {
  const cardKey = normalizeOrderKey(card.name);
  const fileSubjectKey = getCardFileSubjectKey(card);

  if (card.goalType === 'subject') {
    return subjectFolderKeys.has(fileSubjectKey) ? fileSubjectKey : cardKey;
  }

  if (subjectFolderKeys.has(cardKey)) return cardKey;
  if (fileSubjectKey && cardKey.includes(fileSubjectKey)) return fileSubjectKey;
  return '';
};

const isSubjectFolderCard = (card: StudyCard) => Boolean(getSubjectFolderKey(card));

const getCardBranchOrder = (card: StudyCard) => {
  const subjectKey = getSubjectFolderKey(card);
  if (subjectKey) return subjectFolderOrder.get(subjectKey) ?? 420;
  return getBranchOrder(card.name);
};

const sortStudyFiles = (files: StudyCardFile[] = []) =>
  [...files].sort((a, b) => getFileOrderKey(a).localeCompare(getFileOrderKey(b)));

const sortStudyCards = (cards: StudyCard[] = []) =>
  dedupeStudyPremiumItems(cards).sort((a, b) =>
    getStudyPremiumPriority(a) - getStudyPremiumPriority(b) ||
    getCardBranchOrder(a) - getCardBranchOrder(b) ||
    (a.order || 0) - (b.order || 0) ||
    getStudyCardDisplayTitle(a).localeCompare(getStudyCardDisplayTitle(b), undefined, { numeric: true, sensitivity: 'base' })
  );

const shouldInlineChildFiles = (card: StudyCard) => {
  if (isSubjectFolderCard(card)) return false;

  const files = card.files || [];
  const childCount = typeof card.childCount === 'number' ? card.childCount : 0;
  return childCount === 0 && files.length === 1;
};

const StudyWorkspacePage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { slug = PLATFORM_WORKSPACE_SLUG } = useParams<{ slug: string }>();
  const cardParam = searchParams.get('card') || '';
  const activeCardId = objectIdPattern.test(cardParam) ? cardParam : '';
  const routeOwnerPath = getStudyRouteOwnerPath(
    location.pathname,
    location.search,
    location.state as StudyRouteState,
  ) || '/app/catalog';
  const workspaceOwnerQuery = encodeURIComponent(routeOwnerPath);
  const getWorkspaceHref = useCallback(
    (cardId: string) => `/app/workspace/${PLATFORM_WORKSPACE_SLUG}?card=${cardId}&parent=${workspaceOwnerQuery}`,
    [workspaceOwnerQuery],
  );

  const {
    data: activeCard,
    isLoading: isActiveCardLoading,
    isError: isActiveCardError,
    refetch: refetchActiveCard,
  } = useQuery({
    queryKey: studyCardDetailQueryKey(activeCardId),
    queryFn: () => fetchStudyCard(activeCardId),
    enabled: Boolean(activeCardId),
    retry: false,
    staleTime: STUDY_QUERY_STALE_TIME_MS,
  });

  const {
    data: childCardsData,
    isError: isChildCardsError,
    isFetched: areChildCardsFetched,
    isFetching: areChildCardsFetching,
    isLoading,
    refetch: refetchChildCards,
  } = useQuery({
    queryKey: studyCardQueryKey(PLATFORM_WORKSPACE_SLUG, activeCardId || 'root'),
    queryFn: () => fetchStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent: activeCardId || 'root' }),
    placeholderData: [],
    retry: false,
    staleTime: STUDY_QUERY_STALE_TIME_MS,
  });
  const childCards = useMemo(
    () => sortStudyCards(childCardsData || []).map((card) => ({
      ...card,
      files: sortStudyFiles(card.files || []),
    })),
    [childCardsData],
  );

  const title = activeCard ? getStudyCardDisplayTitle(activeCard) : 'Study Hub';
  const files = useMemo(() => sortStudyFiles(activeCard?.files || []), [activeCard?.files]);
  const activeVisual = getStudyCardVisual(activeCard?.iconKey, activeCard?.tone, activeCard?.name);
  const ActiveIcon = activeVisual.icon;
  const activeIconUrl = activeCard?.iconUrl || activeVisual.iconUrl;
  const childFolderCards = childCards.filter((card) => !shouldInlineChildFiles(card));
  const childResourceEntries = childCards.flatMap((card) => (
    shouldInlineChildFiles(card)
      ? (card.files || []).map((file) => ({ card, file }))
      : []
  ));
  const resourceCount = childResourceEntries.length + files.length;
  const isActiveSubjectFolder = activeCard ? isSubjectFolderCard(activeCard) : false;
  const emptyShelfCopy = getEmptyShelfCopy(title);
  const backHref = activeCard?.parentId ? getWorkspaceHref(activeCard.parentId) : routeOwnerPath;
  const isWorkspaceLoading =
    (childCards.length === 0 && !isChildCardsError && (isLoading || areChildCardsFetching || !areChildCardsFetched)) ||
    Boolean(activeCardId && isActiveCardLoading && !activeCard);
  const retryWorkspace = () => {
    void refetchChildCards();
    if (activeCardId) void refetchActiveCard();
  };

  useEffect(() => {
    if (activeCardId || slug === PLATFORM_WORKSPACE_SLUG || isLoading) return;

    const matchingRootCard = childCards.find((card) => card.slug === slug);
    if (matchingRootCard) {
      navigate(getWorkspaceHref(matchingRootCard._id), {
        replace: true,
        state: { tabOwnerPath: routeOwnerPath },
      });
    }
  }, [activeCardId, childCards, getWorkspaceHref, isLoading, navigate, routeOwnerPath, slug]);

  useEffect(() => {
    if (!activeCard) return;
    addRecentStudyCard(activeCard, getStudyCardDisplayTitle(activeCard), getWorkspaceHref(activeCard._id));
  }, [activeCard, getWorkspaceHref]);

  const renderResourceTile = (file: StudyCardFile, key: string, parentName: string) => {
    const fileUrl = getStudyAssetUrl(file.url);
    const isPdf = isStudyPdfUrl(fileUrl, file.mimeType);
    const isReadable = isStudyReadableDocumentUrl(fileUrl, file.mimeType);
    const isCleanBookCard = isActiveSubjectFolder && (
      isStudyBookPackageUrl(fileUrl, file.mimeType) ||
      String(file.resourceType || '').toLowerCase().includes('book')
    );
    const visual = isStudyBookPackageUrl(fileUrl, file.mimeType)
      ? getStudyCardVisual('book', 'emerald')
      : getStudyCardVisual('download', 'emerald');
    const resourceTitle = getStudyFileDisplayTitle(file, parentName);

    return (
      <StudyAnchorTile
        key={key}
        href={fileUrl}
        title={resourceTitle}
        subtitle={isCleanBookCard ? undefined : getStudyFileCompactMeta(file, resourceTitle)}
        badge={isCleanBookCard ? undefined : getStudyFileBadge(file, resourceTitle)}
        icon={visual.icon}
        tone={visual.tone}
        iconUrl={visual.iconUrl}
        thumbnailUrl={isCleanBookCard ? undefined : isPdf ? getPdfThumbnailUrl(file) : undefined}
        libraryItem={toStudyCardFileLibraryItem(file, resourceTitle)}
        variant={isCleanBookCard && isReadable ? 'book' : 'default'}
        className="max-w-none"
      />
    );
  };

  return (
    <div className="mx-auto w-full max-w-full min-w-0 space-y-5 overflow-visible lg:max-w-7xl lg:space-y-6">
      <header className="hidden min-w-0 items-center gap-3 sm:flex">
        {activeCardId && (
          <Link
            to={backHref}
            state={{ tabOwnerPath: routeOwnerPath }}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-white/55 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white"
            aria-label="Back"
          >
            <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
          </Link>
        )}
        <h1 className="min-w-0 break-words text-2xl font-black leading-tight tracking-normal text-slate-950 dark:text-white sm:text-3xl lg:text-[2.15rem]">
          {title}
        </h1>
      </header>

      {isActiveCardError ? (
        <StudyEmptyState
          icon={<ExclamationTriangleIcon className="h-8 w-8" aria-hidden="true" />}
          title="This folder is not available"
          description="The link may be old or the folder may have been removed."
          actions={<StudyActionLink to="/app">Back to Home</StudyActionLink>}
        />
      ) : isWorkspaceLoading ? (
        <StudyCardSkeletonGrid
          count={8}
          className="!grid-cols-2 justify-stretch !gap-2 md:!grid-cols-4 lg:!grid-cols-5 sm:!gap-3"
          tileClassName="h-[190px] sm:h-[232px]"
        />
      ) : isChildCardsError && childCards.length === 0 && files.length === 0 ? (
        <StudyEmptyState
          icon={<ExclamationTriangleIcon className="h-8 w-8" aria-hidden="true" />}
          title="Resources could not load"
          description="The folder is available, but its inner cards and resources did not finish loading. Retry to reload them."
          actions={<StudyActionButton onClick={retryWorkspace}>Retry folder</StudyActionButton>}
        />
      ) : childCards.length > 0 || files.length > 0 ? (
        <div className="min-w-0 space-y-5 overflow-visible lg:space-y-6">
          {childFolderCards.length > 0 && (
            <section className="-mx-4 min-w-0 space-y-3 overflow-visible sm:mx-0">
              <div className="px-4 sm:px-0">
                <StudySectionHeader title="Folders" />
              </div>
              <StudyTileGrid columns="three" className="!grid-cols-2 justify-stretch !gap-2 md:!grid-cols-4 lg:!grid-cols-5 sm:!gap-3">
                {childFolderCards.map((card) => {
                  const isSubjectFolder = isSubjectFolderCard(card);
                  const previewFile = card.files?.[0] || null;
                  const previewPdfFile = previewFile && isStudyPdfUrl(getStudyAssetUrl(previewFile.url), previewFile.mimeType) ? previewFile : null;
                  const visual = getStudyCardVisual(card.iconKey, card.tone, card.name);
                  const cardTitle = getStudyCardDisplayTitle(card);

                  return (
                    <StudyLinkTile
                      key={card._id}
                      to={getWorkspaceHref(card._id)}
                      title={cardTitle}
                      badge={isSubjectFolder ? undefined : getShelfBadge(card.name) || undefined}
                      icon={visual.icon}
                      tone={visual.tone}
                      iconUrl={card.iconUrl || visual.iconUrl}
                      thumbnailUrl={isSubjectFolder ? undefined : getPdfThumbnailUrl(previewPdfFile)}
                      libraryItem={toStudyCardLibraryItem(card, title)}
                      compact
                      className="max-w-none"
                    />
                  );
                })}
              </StudyTileGrid>
            </section>
          )}

          {resourceCount > 0 && (
            <section className="min-w-0 space-y-3 overflow-x-hidden">
              <StudySectionHeader title={isActiveSubjectFolder ? 'Books' : 'Resources'} />
              <StudyTileGrid columns="three" className="!grid-cols-1 justify-stretch gap-3 sm:!grid-cols-2 lg:!grid-cols-3 xl:!grid-cols-4">
                {childResourceEntries.map(({ card, file }) => renderResourceTile(file, `${card._id}-${file._id}`, activeCard?.name || card.name))}
                {files.map((file) => renderResourceTile(file, file._id, activeCard?.name || title))}
              </StudyTileGrid>
            </section>
          )}
        </div>
      ) : (
        <StudyEmptyState
          icon={activeIconUrl ? (
            <img src={activeIconUrl} alt="" loading="lazy" className="h-10 w-10 object-contain" />
          ) : (
            <ActiveIcon className="h-8 w-8" aria-hidden="true" />
          )}
          eyebrow={emptyShelfCopy.eyebrow}
          title={emptyShelfCopy.title}
          description={emptyShelfCopy.description}
          actions={<StudyActionLink to="/app/contribute">Request content</StudyActionLink>}
        />
      )}
    </div>
  );
};

export default StudyWorkspacePage;
