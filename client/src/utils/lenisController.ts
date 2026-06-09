import type Lenis from 'lenis';

let lenisInstance: Lenis | null = null;

export const PORTFOLIO_NAV_OFFSET = -72;

// Ye saare classes Lenis ke scroll ko bypass karenge
const LENIS_NESTED_SCROLL_SELECTOR =
  '.sarathi-chat-panel, .portfolio-horizontal-scroll, [data-native-scroll="true"], .study-drawer-surface, .study-chat-canvas, .study-scrollbar, .study-reader-canvas, .study-pdf-reader-shell, .admin-tree-scroll, .admin-command-scroll';

export const shouldPreventLenisScroll = (node: Element) => {
  const element = node as HTMLElement;
  const isPdfScroller =
    element.id === 'pdf-scroll-area' ||
    element.getAttribute('data-pdf-scroller') === 'true' ||
    element.closest?.('#pdf-scroll-area') ||
    element.closest?.('[data-pdf-scroller="true"]');

  return Boolean(
    isPdfScroller ||
    element.id === 'ai-chat-scroll-area' ||
    element.closest?.(LENIS_NESTED_SCROLL_SELECTOR),
  );
};

export const isLenisSupported = (): boolean => {
  if (typeof window === 'undefined') return false;

  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches;
  const hasTouchSupport = navigator.maxTouchPoints > 0;

  if (hasCoarsePointer || hasTouchSupport) return false;

  // Reduced motion: accessibility ke liye skip
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
};

export const createAppLenisOptions = (options = {}) => {
  const isTouch =
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches ||
      navigator.maxTouchPoints > 0);

  if (isTouch) {
    return {
      autoRaf: false,
      prevent: shouldPreventLenisScroll,
      smoothTouch: false,
      syncTouch: false,
      ...options,
    };
  }

  // 💻 DESKTOP CONFIG (Snappy & Light)
  return {
    autoRaf: false,
    prevent: shouldPreventLenisScroll,
    lerp: 0.15,             // Scroll stickiness khatam karne ke liye
    wheelMultiplier: 1.5,   // Kam force mein zyada scroll
    smoothWheel: true,      // Desktop par premium glide
    smoothTouch: false,     
    syncTouch: false,       
    ...options,
  };
};

export const scrollByLenis = (delta: number, duration = 0.75) => {
  const lenis = getLenisInstance();
  if (lenis) {
    lenis.scrollTo(lenis.scroll + delta, { duration });
    return true;
  }
  return false;
};

export const setLenisInstance = (instance: Lenis | null) => {
  lenisInstance = instance;
};

export const getLenisInstance = () => lenisInstance;

export const scrollToPortfolioSection = (sectionId: string) => {
  const lenis = getLenisInstance();
  if (lenis) {
    lenis.scrollTo(`#${sectionId}`, {
      offset: PORTFOLIO_NAV_OFFSET,
      duration: 1.6,
      lock: false,
    });
    return;
  }
  
  // ✅ window object SSR safety check
  if (typeof window !== 'undefined') {
    const target = document.getElementById(sectionId);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY + PORTFOLIO_NAV_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
  }
};