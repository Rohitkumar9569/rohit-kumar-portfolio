import type Lenis from 'lenis';

let lenisInstance: Lenis | null = null;

export const PORTFOLIO_NAV_OFFSET = -72;

const LENIS_NESTED_SCROLL_SELECTOR =
  '.sarathi-chat-panel, .portfolio-horizontal-scroll, [data-native-scroll="true"], .study-drawer-surface, .study-chat-canvas, .study-scrollbar, .study-reader-canvas, .study-pdf-reader-shell, .admin-tree-scroll, .admin-command-scroll';

export const shouldPreventLenisScroll = (node: Element) => {
  const element = node as HTMLElement;
  return Boolean(
    element.id === 'pdf-scroll-area' ||
    element.id === 'ai-chat-scroll-area' ||
    element.closest?.(LENIS_NESTED_SCROLL_SELECTOR),
  );
};

// ✅ KEY FIX: Mobile par Lenis disable, desktop par buttery smooth
export const isLenisSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Reduced motion: always skip
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  // Touch/mobile devices: native scroll is smoother — disable Lenis
  const isTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  if (isTouch) return false;
  return true;
};

export const createAppLenisOptions = (options = {}) => {
  return {
    autoRaf: true,
    lerp: 0.075,           // Desktop: silky smooth (0.075 = premium feel)
    duration: 1.4,
    wheelMultiplier: 1.0,  // Don't over-amplify
    smoothWheel: true,
    syncTouch: false,      // Mobile par disable (native hi best hai)
    smoothTouch: false,    // Native momentum = premium feel on touch
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
  const target = document.getElementById(sectionId);
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY + PORTFOLIO_NAV_OFFSET;
  window.scrollTo({ top, behavior: 'smooth' });
};