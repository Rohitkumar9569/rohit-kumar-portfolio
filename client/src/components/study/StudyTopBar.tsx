import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  Bars3Icon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import StudyDrawer from './StudyDrawer';
import {
  getStudyRouteOwnerPath,
  type StudyRouteState,
} from './studyActiveRoute';
import {
  STUDY_QUERY_STALE_TIME_MS,
  fetchStudyCard,
  studyCardDetailQueryKey,
} from '../../studyHubApi';

const PLATFORM_WORKSPACE_SLUG = 'study-hub';
const topBlurEdgeClassName =
  'study-top-blur-edge pointer-events-none absolute inset-x-0 bottom-[-2.5rem] h-11 bg-gradient-to-b from-[#eef3f8]/72 via-[#eef3f8]/30 to-transparent backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black_0%,rgba(0,0,0,0.72)_42%,transparent_100%)] dark:from-[#050814]/74 dark:via-[#050814]/32';

const StudyTopBar = () => {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isHeaderLifted, setHeaderLifted] = useState(false);
  const [hasChatContent, setHasChatContent] = useState(false);
  const location = useLocation();

  const pageTitle = (() => {
    if (location.pathname === '/app') return 'Home';
    if (location.pathname.startsWith('/app/catalog') || location.pathname.startsWith('/app/explore')) return 'Catalog';
    if (location.pathname.startsWith('/app/ask') || location.pathname.startsWith('/app/search')) return 'Ask';
    if (location.pathname.startsWith('/app/library')) return 'Library';
    if (location.pathname.startsWith('/app/lab')) return 'My Lab';
    if (location.pathname.startsWith('/app/profile') || location.pathname.startsWith('/app/preferences')) return 'Profile';
    if (location.pathname.startsWith('/app/contribute')) return 'Request Content';
    if (location.pathname.startsWith('/app/portfolio')) return 'Creator Desk';
    if (location.pathname.startsWith('/app/workspace')) return 'Folder';
    return 'Study Hub';
  })();
  const isChatRoute = location.pathname.startsWith('/app/ask') || location.pathname.startsWith('/app/search');
  const isUtilityRoute =
    location.pathname.startsWith('/app/profile') ||
    location.pathname.startsWith('/app/preferences') ||
    location.pathname.startsWith('/app/contribute');
  const hasScrollHeader =
    location.pathname === '/app' ||
    location.pathname.startsWith('/app/catalog') ||
    location.pathname.startsWith('/app/explore') ||
    location.pathname.startsWith('/app/library');
  const hasFloatingMenuOnly = location.pathname.startsWith('/app/workspace');
  const hideForNativeStart =
    hasScrollHeader ||
    location.pathname.startsWith('/app/ask') ||
    location.pathname.startsWith('/app/search') ||
    location.pathname.startsWith('/app/workspace');
  const workspaceCardId = new URLSearchParams(location.search).get('card') || '';
  const workspaceOwnerPath = getStudyRouteOwnerPath(
    location.pathname,
    location.search,
    location.state as StudyRouteState,
  ) || '/app/catalog';
  const workspaceOwnerQuery = encodeURIComponent(workspaceOwnerPath);
  const { data: workspaceCard } = useQuery({
    queryKey: studyCardDetailQueryKey(workspaceCardId),
    queryFn: () => fetchStudyCard(workspaceCardId),
    enabled: hasFloatingMenuOnly && Boolean(workspaceCardId),
    retry: false,
    staleTime: STUDY_QUERY_STALE_TIME_MS,
  });
  const workspaceBackHref = workspaceCard?.parentId
    ? `/app/workspace/${PLATFORM_WORKSPACE_SLUG}?card=${workspaceCard.parentId}&parent=${workspaceOwnerQuery}`
    : workspaceOwnerPath;
  const workspaceTitle = workspaceCard?.name || 'Folder';

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleScroll = () => setHeaderLifted(window.scrollY > 10);
    const handleChatScroll = (event: Event) => {
      const customEvent = event as CustomEvent<{ lifted?: boolean }>;
      setHeaderLifted(Boolean(customEvent.detail?.lifted));
    };
    const handleChatState = (event: Event) => {
      const customEvent = event as CustomEvent<{ hasContent?: boolean }>;
      setHasChatContent(Boolean(customEvent.detail?.hasContent));
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('studyhub:chat-scroll', handleChatScroll as EventListener);
    window.addEventListener('studyhub:chat-state', handleChatState as EventListener);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('studyhub:chat-scroll', handleChatScroll as EventListener);
      window.removeEventListener('studyhub:chat-state', handleChatState as EventListener);
    };
  }, [location.pathname, location.search]);

  if (isChatRoute) {
    const shouldShowChatBrand = hasChatContent;

    return (
      <>
        <header
          className={[
            'study-topbar fixed inset-x-0 top-0 z-40 px-3 pt-[env(safe-area-inset-top)] transition-[background-color,border-color,box-shadow,backdrop-filter] duration-200 lg:hidden',
            isHeaderLifted ? 'study-topbar-lifted' : 'study-topbar-flat',
            isHeaderLifted
              ? 'border-b border-slate-200/65 bg-[#eef3f8]/88 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-2xl [backdrop-filter:saturate(1.28)_blur(18px)] dark:border-white/10 dark:bg-[#050814]/88 dark:shadow-[0_14px_34px_rgba(0,0,0,0.34)]'
              : 'border-b border-transparent bg-[#eef3f8] shadow-none dark:bg-[#050814]',
          ].join(' ')}
        >
          {isHeaderLifted && <div className={topBlurEdgeClassName} />}
          <div className="mx-auto grid h-14 w-full max-w-md grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={[
                'flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 transition-all duration-300 ease-out hover:scale-105 active:scale-95 dark:text-slate-300',
                isHeaderLifted
                  ? 'bg-white/62 shadow-sm shadow-slate-950/5 hover:bg-white hover:text-slate-950 dark:bg-white/[0.07] dark:hover:bg-white/[0.12] dark:hover:text-white'
                  : 'hover:bg-white/60 hover:text-slate-950 dark:hover:bg-white/[0.08] dark:hover:text-white',
              ].join(' ')}
              aria-label="Open menu"
            >
              <Bars3Icon className="h-5 w-5" aria-hidden="true" />
            </button>

            <div
              className={[
                'flex min-w-0 items-center justify-center gap-2 transition duration-200',
                shouldShowChatBrand ? 'opacity-100' : 'pointer-events-none opacity-0',
              ].join(' ')}
            >
              <span className="study-control-surface flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-cyan-700 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:text-cyan-100 dark:shadow-[0_8px_18px_rgba(0,0,0,0.18)]">
                <SparklesIcon className="h-4 w-4" aria-hidden="true" />
              </span>
              <h1 className="truncate text-base font-black tracking-tight text-slate-950 dark:text-white">
                Sarathi
              </h1>
            </div>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('studyhub:new-chat'))}
              className={[
                'inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-600 transition dark:text-slate-300',
                isHeaderLifted
                  ? 'bg-white/62 shadow-sm shadow-slate-950/5 hover:bg-white hover:text-slate-950 dark:bg-white/[0.07] dark:hover:bg-white/[0.12] dark:hover:text-white'
                  : 'hover:bg-white/60 hover:text-slate-950 dark:hover:bg-white/[0.08] dark:hover:text-white',
              ].join(' ')}
              aria-label="New chat"
            >
              <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>
        <StudyDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} />
      </>
    );
  }

  if (hasScrollHeader) {
    return (
      <>
        <header
          className={[
            'study-topbar fixed inset-x-0 top-0 z-40 px-3 pt-[env(safe-area-inset-top)] transition-[background-color,border-color,box-shadow,backdrop-filter] duration-200 lg:hidden',
            isHeaderLifted ? 'study-topbar-lifted' : 'study-topbar-flat',
            isHeaderLifted
              ? 'border-b border-slate-200/70 bg-[#eef3f8]/[0.88] shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-2xl [backdrop-filter:saturate(1.28)_blur(18px)] dark:border-white/10 dark:bg-[#050814]/[0.88] dark:shadow-[0_14px_34px_rgba(0,0,0,0.34)]'
              : 'border-b border-transparent bg-[#eef3f8] shadow-none dark:bg-[#050814]',
          ].join(' ')}
        >
          {isHeaderLifted && <div className={topBlurEdgeClassName} />}
          <div className="mx-auto flex h-14 w-full max-w-md items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={[
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-600 transition-all duration-300 ease-out hover:scale-105 active:scale-95 dark:text-slate-300',
                isHeaderLifted
                  ? 'bg-white/62 shadow-sm shadow-slate-950/5 hover:bg-white hover:text-slate-950 dark:bg-white/[0.07] dark:hover:bg-white/[0.12] dark:hover:text-white'
                  : 'hover:bg-white/60 hover:text-slate-950 dark:hover:bg-white/[0.08] dark:hover:text-white',
              ].join(' ')}
              aria-label="Open menu"
            >
              <Bars3Icon className="h-5 w-5" aria-hidden="true" />
            </button>

            <h1 className="min-w-0 flex-1 truncate text-sm font-black tracking-tight text-slate-950 dark:text-white">
              {pageTitle}
            </h1>
          </div>
        </header>
        <StudyDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} />
      </>
    );
  }

  if (hasFloatingMenuOnly) {
    return (
      <header
        className={[
          'study-topbar fixed inset-x-0 top-0 z-40 px-3 pt-[env(safe-area-inset-top)] transition-[background-color,border-color,box-shadow,backdrop-filter] duration-200 lg:hidden',
          isHeaderLifted ? 'study-topbar-lifted' : 'study-topbar-flat',
          isHeaderLifted
            ? 'border-b border-slate-200/55 bg-[#eef3f8]/[0.82] shadow-[0_12px_34px_rgba(15,23,42,0.08)] backdrop-blur-2xl [backdrop-filter:saturate(1.3)_blur(20px)] dark:border-white/10 dark:bg-[#050814]/[0.82] dark:shadow-[0_16px_42px_rgba(0,0,0,0.34)]'
            : 'border-b border-transparent bg-[#eef3f8] shadow-none dark:bg-[#050814]',
        ].join(' ')}
      >
        {isHeaderLifted && <div className={topBlurEdgeClassName} />}
        <div className="mx-auto flex h-14 w-full max-w-md items-center gap-2">
          <Link
            to={workspaceBackHref}
            state={{ tabOwnerPath: workspaceOwnerPath }}
            className={[
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-600 transition dark:text-cyan-200',
              isHeaderLifted
                ? 'bg-white/62 shadow-sm shadow-slate-950/5 hover:bg-white hover:text-slate-950 dark:bg-white/[0.07] dark:hover:bg-white/[0.12] dark:hover:text-white'
                : 'hover:bg-white/60 hover:text-slate-950 dark:hover:bg-white/[0.08] dark:hover:text-white',
            ].join(' ')}
            aria-label="Back"
          >
            <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
          </Link>

          <h1 className="min-w-0 flex-1 truncate text-sm font-black tracking-tight text-slate-950 dark:text-white">
            {workspaceTitle}
          </h1>
        </div>
      </header>
    );
  }

  if (hideForNativeStart) {
    return null;
  }

  return (
    <>
      <header
        className={[
          'study-topbar inset-x-0 top-0 z-40 px-3 text-slate-950 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-200 dark:text-white lg:hidden',
          isUtilityRoute
            ? 'fixed pt-[env(safe-area-inset-top)]'
            : 'sticky',
          isChatRoute
            ? 'border-b border-slate-200/45 bg-white/[0.66] py-2 shadow-sm backdrop-blur-2xl [backdrop-filter:saturate(1.35)_blur(22px)] dark:border-slate-900/70 dark:bg-slate-950/[0.62]'
            : isUtilityRoute
              ? isHeaderLifted
                ? 'border-b border-slate-200/70 bg-[#eef3f8]/[0.9] py-2 shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur-2xl [backdrop-filter:saturate(1.28)_blur(18px)] dark:border-white/10 dark:bg-[#050814]/[0.9] dark:shadow-[0_14px_34px_rgba(0,0,0,0.34)]'
                : 'border-b border-transparent bg-[#eef3f8] py-2 shadow-none dark:bg-[#050814]'
              : 'border-b border-slate-200/45 bg-[#eef3f8]/70 py-3 shadow-lg shadow-slate-950/5 backdrop-blur-2xl [backdrop-filter:saturate(1.35)_blur(22px)] dark:border-slate-800/60 dark:bg-[#050814]/70',
        ].join(' ')}
      >
        {(!isUtilityRoute || isHeaderLifted) && (
          <div className="study-top-blur-edge pointer-events-none absolute inset-x-0 bottom-[-2.5rem] h-11 bg-gradient-to-b from-[#eef3f8]/64 via-[#eef3f8]/24 to-transparent backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black_0%,rgba(0,0,0,0.7)_42%,transparent_100%)] dark:from-[#050814]/70 dark:via-[#050814]/28" />
        )}
        <div
          className={[
            'mx-auto flex max-w-7xl items-center gap-3',
            isChatRoute || isUtilityRoute
              ? 'h-12'
              : 'rounded-2xl border border-white/60 bg-white/62 px-3 py-2 shadow-xl shadow-slate-950/10 backdrop-blur-2xl dark:border-slate-800/70 dark:bg-slate-900/58 lg:px-4',
          ].join(' ')}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={[
              'flex shrink-0 items-center justify-center transition-all duration-300 ease-out hover:scale-105 active:scale-95 lg:hidden',
              isChatRoute || isUtilityRoute
                ? 'h-10 w-10 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white'
                : 'h-11 w-11 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-cyan-400/40 dark:hover:text-cyan-200',
            ].join(' ')}
            aria-label="Open menu"
          >
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          <div
            className={[
              'min-w-0 flex-1',
              isChatRoute ? 'flex items-center justify-center gap-2' : '',
            ].join(' ')}
          >
            {isChatRoute && (
              <span className="study-control-surface flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-cyan-200 shadow-sm dark:text-cyan-100">
                <SparklesIcon className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
            <h1 className={isChatRoute ? 'truncate text-base font-black' : 'truncate text-xl font-black sm:text-2xl lg:text-2xl'}>
              {isChatRoute ? 'Sarathi' : pageTitle}
            </h1>
          </div>

          {isChatRoute ? (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('studyhub:new-chat'))}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
              aria-label="New chat"
            >
              <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : isUtilityRoute ? null : (
            <Link
              to="/app/ask"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700 hover:shadow-lg hover:shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-cyan-400/40 dark:hover:text-cyan-200"
              aria-label="Open search"
            >
              <MagnifyingGlassIcon className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </header>
      <StudyDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
};

export default StudyTopBar;
