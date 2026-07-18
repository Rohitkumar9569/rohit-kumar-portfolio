import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type TouchEvent as ReactTouchEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import MobileBottomNav from './MobileBottomNav';
import StudySidebar from './StudySidebar';
import StudyPwaStatus from './StudyPwaStatus';
import StudyTopBar from './StudyTopBar';
import {
  getPrimaryStudyNavIndex,
  getStudyRouteOwnerPath,
  readStoredStudyTabRoute,
  writeStoredPrimaryStudyNavPath,
  writeStoredStudyTabRoute,
  type StudyRouteState,
} from './studyActiveRoute';
import {
  STUDY_QUERY_GC_TIME_MS,
  STUDY_QUERY_STALE_TIME_MS,
  fetchStudyCards,
  studyCardQueryKey,
} from '../../studyHubApi';
import {
  focusFirstMatchingElement,
  getAltDigitIndex,
  isPlainKeyboardKey,
} from '../../utils/keyboardNavigation';
import { scrollByLenis } from '../../utils/lenisController';

const swipeTabs = ['/app', '/app/catalog', '/app/ask', '/app/library'];
const PLATFORM_WORKSPACE_SLUG = 'study-hub';

const preloadPrimaryStudyTabModules = () => {
  void import('../../pages/studyHub/StudyHomePage');
  void import('../../pages/studyHub/StudyDiscoverPage');
  void import('../../pages/studyHub/StudySearchPage');
  void import('../../pages/studyHub/StudyLibraryPage');
};

const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('a,button,input,textarea,select,[role="button"],[data-no-swipe="true"]'));
};

const isKeyboardInputTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]'));
};

const swipeVariants = {
  enter: (direction: number) => ({
    opacity: direction === 0 ? 1 : 0.92,
    x: direction > 0 ? 34 : direction < 0 ? -34 : 0,
    scale: direction === 0 ? 1 : 0.996,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  exit: (direction: number) => ({
    opacity: direction === 0 ? 1 : 0.88,
    x: direction > 0 ? -24 : direction < 0 ? 24 : 0,
    scale: direction === 0 ? 1 : 0.996,
  }),
};

const StudyAppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();
  const dragControls = useDragControls();
  const queryClient = useQueryClient();
  const mainRef = useRef<HTMLElement | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const [isDesktopViewport, setDesktopViewport] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  ));
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(() => (
    typeof window !== 'undefined' && window.localStorage.getItem('study-sidebar-collapsed') === 'true'
  ));
  const [isTopBlurVisible, setTopBlurVisible] = useState(false);
  const isChatRoute = location.pathname.startsWith('/app/ask') || location.pathname.startsWith('/app/search');
  const isPdfRoute = location.pathname.startsWith('/app/pdf');
  const isPortfolioRoute = location.pathname.startsWith('/app/portfolio');
  const isUtilityRoute =
    location.pathname.startsWith('/app/profile') ||
    location.pathname.startsWith('/app/preferences') ||
    location.pathname.startsWith('/app/contribute');
  const locationState = location.state as StudyRouteState;
  const routeOwnerPath = getStudyRouteOwnerPath(location.pathname, location.search, locationState);
  const hasMobileFloatingChrome =
    location.pathname === '/app' ||
    location.pathname.startsWith('/app/catalog') ||
    location.pathname.startsWith('/app/explore') ||
    location.pathname.startsWith('/app/library') ||
    location.pathname.startsWith('/app/workspace');
  const hasMobileTopChrome = hasMobileFloatingChrome || isUtilityRoute;
  const isHomeRoute = location.pathname === '/app';
  const mainClassName = isChatRoute || isPdfRoute
      ? isPdfRoute
        ? 'h-[100dvh] overflow-x-hidden px-0 pb-0 pt-0 lg:h-screen'
      : 'mx-auto h-[100dvh] w-full max-w-full overflow-x-hidden px-0 pb-0 pt-0 shadow-[0_0_34px_rgba(15,23,42,0.06)] sm:max-w-[560px] md:max-w-[760px] lg:mx-0 lg:h-screen lg:max-w-none lg:shadow-none'
      : isPortfolioRoute
      ? 'study-portfolio-main-scroll w-full max-w-full min-w-0 overflow-x-clip overflow-y-visible pb-0'
      : [
        [
          'relative w-full min-w-0 overflow-x-hidden pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:px-8 lg:pb-10 lg:pt-4',
          isHomeRoute || isUtilityRoute ? 'px-0 sm:px-6' : 'px-4 sm:px-6',
        ].join(' '),
        hasMobileTopChrome ? 'pt-[calc(env(safe-area-inset-top)+4.25rem)]' : 'pt-3',
      ].join(' ');
  const activeSwipeIndex = getPrimaryStudyNavIndex(routeOwnerPath);
  const isPrimarySwipeRoute = swipeTabs.includes(location.pathname);
  const outletKey = activeSwipeIndex >= 0 ? `tab-${activeSwipeIndex}` : location.pathname;
  const previousSwipeIndexRef = useRef(activeSwipeIndex);
  const navigationDirection = locationState?.tabDirection;
  const inferredDirection =
    activeSwipeIndex >= 0 &&
    previousSwipeIndexRef.current >= 0 &&
    activeSwipeIndex !== previousSwipeIndexRef.current
      ? activeSwipeIndex > previousSwipeIndexRef.current
        ? 1
        : -1
      : 0;
  const transitionDirection =
    typeof navigationDirection === 'number' ? navigationDirection : inferredDirection;
  const canSwipeTabs = isPrimarySwipeRoute && activeSwipeIndex >= 0 && !isPdfRoute && !isPortfolioRoute && !isDesktopViewport;

  const handleStudyShellWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (target.scrollHeight <= target.clientHeight) return;

    const nextScrollTop = target.scrollTop + event.deltaY;
    const maxScrollTop = target.scrollHeight - target.clientHeight;

    target.scrollTop = Math.min(Math.max(nextScrollTop, 0), Math.max(maxScrollTop, 0));
  }, []);

  const handleStudyShellTouchStart = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  }, []);

  const handleStudyShellTouchMove = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    // Don't prevent default - let native scrolling work
    // Only track touch position for potential future use
    if (touchStartYRef.current === null) return;

    const currentY = event.touches[0]?.clientY ?? touchStartYRef.current;
    touchStartYRef.current = currentY;
    // Removed preventDefault() to allow native momentum scrolling on mobile
  }, []);

  const prewarmPrimaryTabs = useCallback(() => {
    preloadPrimaryStudyTabModules();
    ['root', 'all'].forEach((parent) => {
      const cardsQueryKey = studyCardQueryKey(PLATFORM_WORKSPACE_SLUG, parent);
      if (queryClient.getQueryData(cardsQueryKey)) return;

      void queryClient.prefetchQuery({
        queryKey: cardsQueryKey,
        queryFn: () => fetchStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent }),
        gcTime: STUDY_QUERY_GC_TIME_MS,
        staleTime: STUDY_QUERY_STALE_TIME_MS,
        networkMode: 'offlineFirst',
      });
    });
  }, [queryClient]);

  const navigateToPrimaryTab = useCallback((direction: number) => {
    const nextIndex = activeSwipeIndex + direction;
    const nextTabPath = swipeTabs[nextIndex];
    if (!nextTabPath) return;

    navigate(readStoredStudyTabRoute(nextTabPath, nextTabPath), {
      state: { tabDirection: direction, tabOwnerPath: nextTabPath },
    });
  }, [activeSwipeIndex, navigate]);

  const navigateToPrimaryTabIndex = useCallback((nextIndex: number) => {
    const nextTabPath = swipeTabs[nextIndex];
    if (!nextTabPath) return;

    const tabDirection = activeSwipeIndex >= 0 && nextIndex !== activeSwipeIndex
      ? nextIndex > activeSwipeIndex ? 1 : -1
      : 0;

    navigate(readStoredStudyTabRoute(nextTabPath, nextTabPath), {
      state: { tabDirection, tabOwnerPath: nextTabPath },
    });
  }, [activeSwipeIndex, navigate]);

  const navigateToSwipeTab = useCallback((direction: number) => {
    if (!canSwipeTabs) return;
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) return;
    navigateToPrimaryTab(direction);
  }, [canSwipeTabs, navigateToPrimaryTab]);

  const handleRoutePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canSwipeTabs || isInteractiveTarget(event.target)) return;
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) return;
    dragControls.start(event, { snapToCursor: false });
  }, [canSwipeTabs, dragControls]);

  const handleRouteDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;
    const shouldChangeTab = Math.abs(offsetX) > 74 || (Math.abs(offsetX) > 34 && Math.abs(velocityX) > 460);
    if (!shouldChangeTab) return;

    navigateToSwipeTab(offsetX < 0 ? 1 : -1);
  }, [navigateToSwipeTab]);

  const animatedOutlet = useMemo(() => {
    if (!canSwipeTabs) return outlet;

    return (
      <div className={['relative w-full max-w-full min-w-0 overflow-x-hidden', isChatRoute ? 'h-full' : 'min-h-full'].join(' ')}>
        <AnimatePresence mode="popLayout" initial={false} custom={transitionDirection}>
          <motion.div
            key={outletKey}
            custom={transitionDirection}
            variants={swipeVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragControls={dragControls}
            dragDirectionLock
            dragElastic={0}
            dragListener={isDesktopViewport}
            dragMomentum={false}
            dragConstraints={{ left: 0, right: 0 }}
            onPointerDown={handleRoutePointerDown}
            onDragEnd={handleRouteDragEnd}
            style={{ touchAction: 'pan-y pinch-zoom' }}
            transition={{ type: 'spring', stiffness: 560, damping: 46, mass: 0.72 }}
            className={['w-full max-w-full min-w-0 overflow-x-hidden will-change-transform', isChatRoute ? 'h-full' : 'min-h-full'].join(' ')}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }, [
    canSwipeTabs,
    dragControls,
    handleRouteDragEnd,
    handleRoutePointerDown,
    isChatRoute,
    outlet,
    outletKey,
    transitionDirection,
    isDesktopViewport,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('study-sidebar-collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    document.documentElement.classList.add('study-app-scroll-root');
    document.body.classList.add('study-app-scroll-root');

    return () => {
      document.documentElement.classList.remove('study-app-scroll-root');
      document.body.classList.remove('study-app-scroll-root');
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const root = document.documentElement;
    const body = document.body;

    if (!isPortfolioRoute) {
      root.classList.remove('study-portfolio-scroll-root');
      body.classList.remove('study-portfolio-scroll-root');
      return undefined;
    }

    root.classList.add('study-portfolio-scroll-root');
    body.classList.add('study-portfolio-scroll-root');

    return () => {
      root.classList.remove('study-portfolio-scroll-root');
      body.classList.remove('study-portfolio-scroll-root');
    };
  }, [isPortfolioRoute]);

  useLayoutEffect(() => {
    if (!isPortfolioRoute || typeof window === 'undefined') return undefined;

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    const resetScroll = () => {
      const mainScroller = mainRef.current ?? document.getElementById('study-main-content');

      if (mainScroller) {
        mainScroller.scrollTop = 0;
        mainScroller.scrollLeft = 0;
      }

      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    resetScroll();

    let secondFrameId = 0;
    const firstFrameId = window.requestAnimationFrame(() => {
      resetScroll();
      secondFrameId = window.requestAnimationFrame(resetScroll);
    });
    const shortTimerId = window.setTimeout(resetScroll, 80);
    const contentTimerId = window.setTimeout(resetScroll, 260);

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId) window.cancelAnimationFrame(secondFrameId);
      window.clearTimeout(shortTimerId);
      window.clearTimeout(contentTimerId);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [isPortfolioRoute, location.key, location.pathname, location.search]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (isPortfolioRoute) return undefined;

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(prewarmPrimaryTabs, { timeout: 900 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(prewarmPrimaryTabs, 250);
    return () => window.clearTimeout(timeoutId);
  }, [isPortfolioRoute, prewarmPrimaryTabs]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleViewportChange = () => setDesktopViewport(mediaQuery.matches);

    handleViewportChange();
    mediaQuery.addEventListener('change', handleViewportChange);

    return () => {
      mediaQuery.removeEventListener('change', handleViewportChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleWindowScroll = () => setTopBlurVisible(window.scrollY > 10);
    const handleChatScroll = (event: Event) => {
      const customEvent = event as CustomEvent<{ lifted?: boolean }>;
      setTopBlurVisible(Boolean(customEvent.detail?.lifted));
    };

    handleWindowScroll();
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    window.addEventListener('studyhub:chat-scroll', handleChatScroll as EventListener);

    return () => {
      window.removeEventListener('scroll', handleWindowScroll);
      window.removeEventListener('studyhub:chat-scroll', handleChatScroll as EventListener);
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    previousSwipeIndexRef.current = activeSwipeIndex;
  }, [activeSwipeIndex]);

  useEffect(() => {
    const ownerPath = getStudyRouteOwnerPath(location.pathname, location.search, locationState);
    if (!ownerPath) return;
    writeStoredPrimaryStudyNavPath(ownerPath);
    writeStoredStudyTabRoute(ownerPath, `${location.pathname}${location.search}`);
  }, [location.pathname, location.search, locationState]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleKeyboardNavigation = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (isKeyboardInputTarget(event.target)) {
        if (event.key === 'Escape' && event.target instanceof HTMLElement) {
          event.preventDefault();
          event.target.blur();
        }
        return;
      }

      const altTabIndex = getAltDigitIndex(event, swipeTabs.length);
      if (altTabIndex >= 0) {
        event.preventDefault();
        navigateToPrimaryTabIndex(altTabIndex);
        return;
      }

      if (isPlainKeyboardKey(event, '/')) {
        event.preventDefault();
        const didFocus = focusFirstMatchingElement(mainRef.current, [
          '[data-study-primary-input="true"]',
          'input[type="search"]',
          'input[placeholder*="Search" i]',
          'textarea[placeholder*="Message" i]',
          'input[placeholder*="Message" i]',
          'textarea:not([disabled])',
          'input:not([type="hidden"]):not([disabled])',
        ]);
        if (!didFocus) {
          document.getElementById('study-main-content')?.focus({ preventScroll: true });
        }
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'Backspace') {
        event.preventDefault();
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/app', { replace: true });
        }
        return;
      }

      if (event.key === 'ArrowLeft' && activeSwipeIndex > 0) {
        event.preventDefault();
        navigateToPrimaryTab(-1);
        return;
      }

      if (event.key === 'ArrowRight' && activeSwipeIndex >= 0 && activeSwipeIndex < swipeTabs.length - 1) {
        event.preventDefault();
        navigateToPrimaryTab(1);
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const scrollDelta = (event.key === 'ArrowDown' ? 1 : -1) * Math.max(220, window.innerHeight * 0.62);

        if (!scrollByLenis(scrollDelta)) {
          window.scrollBy({ top: scrollDelta, behavior: 'auto' });
        }
        return;
      }

      if (event.key === 'Home' && activeSwipeIndex > 0) {
        event.preventDefault();
        navigate(readStoredStudyTabRoute(swipeTabs[0], swipeTabs[0]), {
          state: { tabDirection: -1, tabOwnerPath: swipeTabs[0] },
        });
        return;
      }

      if (event.key === 'End' && activeSwipeIndex >= 0 && activeSwipeIndex < swipeTabs.length - 1) {
        const lastTabPath = swipeTabs[swipeTabs.length - 1];
        event.preventDefault();
        navigate(readStoredStudyTabRoute(lastTabPath, lastTabPath), {
          state: { tabDirection: 1, tabOwnerPath: lastTabPath },
        });
      }
    };

    window.addEventListener('keydown', handleKeyboardNavigation);
    return () => window.removeEventListener('keydown', handleKeyboardNavigation);
  }, [activeSwipeIndex, navigate, navigateToPrimaryTab, navigateToPrimaryTabIndex]);

  return (
    <div
      className={[
        'study-shell relative flex min-h-[100dvh] flex-col overflow-hidden text-slate-950 dark:text-slate-100',
        isPortfolioRoute ? 'overflow-x-clip' : 'overflow-x-hidden',
        isPortfolioRoute ? 'study-portfolio-embed' : '',
      ].join(' ')}
      aria-keyshortcuts="Alt+1 Alt+2 Alt+3 Alt+4 / Backspace ArrowLeft ArrowRight ArrowUp ArrowDown Home End Escape"
    >
      <StudySidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
      />
      <div className={['relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-y-visible', isPortfolioRoute ? 'overflow-x-clip' : 'overflow-x-hidden', isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'].join(' ')}>
        {!isPdfRoute && !isPortfolioRoute && <StudyTopBar />}
        {!isPdfRoute && !isPortfolioRoute && (
          <div
            aria-hidden="true"
            className={[
              'pointer-events-none fixed right-0 top-0 z-30 hidden h-24 transition-opacity duration-200 lg:block',
              isSidebarCollapsed ? 'left-20' : 'left-64',
              isTopBlurVisible ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          >
            <div className="study-top-blur-edge h-full bg-gradient-to-b from-[#eef3f8]/88 via-[#eef3f8]/42 to-transparent backdrop-blur-2xl [mask-image:linear-gradient(to_bottom,black_0%,rgba(0,0,0,0.74)_44%,transparent_100%)] dark:from-[#050814]/90 dark:via-[#050814]/44" />
          </div>
        )}
        <main
          ref={mainRef}
          id="study-main-content"
          tabIndex={-1}
          className={['flex-1 min-h-0 min-w-0 overflow-y-auto overscroll-contain outline-none pr-0', mainClassName].join(' ')}
          style={{ touchAction: 'pan-y pinch-zoom' }}
          onWheel={handleStudyShellWheel}
          onTouchStart={handleStudyShellTouchStart}
          onTouchMove={handleStudyShellTouchMove}
        >
          {animatedOutlet}
        </main>
      </div>
      {!isPdfRoute && !isPortfolioRoute && <MobileBottomNav />}
      {!isPdfRoute && !isPortfolioRoute && <StudyPwaStatus />}
    </div>
  );
};

export default StudyAppLayout;
