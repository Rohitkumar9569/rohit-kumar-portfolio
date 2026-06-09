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

export const createAppLenisOptions = (options: {
  anchors?: Lenis['options']['anchors'];
} = {}) => {
  const isTouchDevice =
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);

  return {
    autoRaf: true,
    lerp: isTouchDevice ? 0.22 : 0.16,
    duration: isTouchDevice ? 0.95 : 0.75,
    wheelMultiplier: 2.2,
    touchMultiplier: isTouchDevice ? 2.1 : 2.0,
    syncTouch: isTouchDevice,
    syncTouchLerp: isTouchDevice ? 0.14 : 0.11,
    touchInertiaExponent: 1.4,
    gestureOrientation: 'vertical' as const,
    smoothTouch: true,
    smoothWheel: true,
    prevent: (node: Element) => shouldPreventLenisScroll(node),
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
      duration: 1.1,
      lock: false,
    });
    return;
  }

  const target = document.getElementById(sectionId);
  if (!target) return;

  const top = target.getBoundingClientRect().top + window.scrollY + PORTFOLIO_NAV_OFFSET;
  window.scrollTo({ top, behavior: 'smooth' });
};
