import { memo, type FormEvent, type TouchEvent as ReactTouchEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Virtuoso } from 'react-virtuoso';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  ArrowsPointingOutIcon,
  EllipsisVerticalIcon,
  MinusIcon,
  PlusIcon,
  SwatchIcon,
} from '@heroicons/react/24/outline';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs?v=5.4.296';

interface StudyPdfReaderFrameProps {
  title: string;
  fileUrl: string;
  downloadUrl?: string;
  onClose?: () => void;
  isPreparing?: boolean;
  preparingProgress?: number | null;
}

const clampScale = (value: number) => Math.min(2.2, Math.max(0.45, value));
type ReaderWidthMode = 'compact' | 'comfort' | 'wide';
type PdfToneMode = 'auto' | 'paper' | 'night' | 'warm';
type PdfReaderMode = 'normal' | 'read' | 'full';

const readerWidthModes: ReaderWidthMode[] = ['comfort', 'wide', 'compact'];
const readerWidthModeLabels: Record<ReaderWidthMode, string> = {
  compact: 'Page',
  comfort: 'Fit',
  wide: 'Wide',
};
const readerWidthModeMax: Record<ReaderWidthMode, number> = {
  compact: 760,
  comfort: 980,
  wide: Number.POSITIVE_INFINITY,
};
const readerTopOffset = 76;
const pdfToneStorageKey = 'studyhub-pdf-tone';

const pdfToneModes: PdfToneMode[] = ['auto', 'paper', 'night', 'warm'];
const pdfToneLabels: Record<PdfToneMode, string> = {
  auto: 'Auto',
  paper: 'Paper',
  night: 'Night',
  warm: 'Warm',
};
const pdfToneClassNames: Record<PdfToneMode, string> = {
  auto: 'transition-[filter] duration-200 dark:[filter:invert(0.82)_hue-rotate(180deg)_brightness(1.02)_contrast(1.12)_saturate(0.52)_sepia(0.06)]',
  paper: 'transition-[filter] duration-200 [filter:none]',
  night: 'transition-[filter] duration-200 [filter:invert(0.82)_hue-rotate(180deg)_brightness(1.02)_contrast(1.12)_saturate(0.52)_sepia(0.06)]',
  warm: 'transition-[filter] duration-200 [filter:sepia(0.18)_brightness(0.98)_contrast(1.02)] dark:[filter:sepia(0.12)_invert(0.80)_hue-rotate(180deg)_brightness(1.05)_contrast(1.08)_saturate(0.48)]',
};

const getPdfReaderStateKey = (fileUrl: string) => {
  let hash = 0;
  for (let index = 0; index < fileUrl.length; index += 1) {
    hash = ((hash << 5) - hash + fileUrl.charCodeAt(index)) | 0;
  }
  return `studyhub-pdf-page:${Math.abs(hash)}`;
};

const readStoredPdfPage = (fileUrl: string) => {
  if (typeof window === 'undefined') return 1;
  const storedPage = Number(window.sessionStorage.getItem(getPdfReaderStateKey(fileUrl)));
  return Number.isInteger(storedPage) && storedPage > 0 ? storedPage : 1;
};

const writeStoredPdfPage = (fileUrl: string, page: number) => {
  if (typeof window === 'undefined' || !Number.isInteger(page) || page < 1) return;
  window.sessionStorage.setItem(getPdfReaderStateKey(fileUrl), String(page));
};

const readStoredPdfTone = (): PdfToneMode => {
  if (typeof window === 'undefined') return 'auto';
  const storedTone = window.localStorage.getItem(pdfToneStorageKey) as PdfToneMode | null;
  return storedTone && pdfToneModes.includes(storedTone) ? storedTone : 'auto';
};

const canUsePdfCacheStorage = () => typeof window !== 'undefined' && 'caches' in window;

const readCachedPdfObjectUrl = async (url: string) => {
  if (!canUsePdfCacheStorage()) return null;
  try {
    const cache = await window.caches.open('study-hub-pdf-cache-v1');
    const match = await cache.match(url);
    if (!match) return null;
    const blob = await match.blob();
    return window.URL.createObjectURL(blob);
  } catch {
    return null;
  }
};

const cachePdfUrlForOffline = async (url: string) => {
  if (!canUsePdfCacheStorage()) throw new Error('Offline cache is not supported.');
  const cache = await window.caches.open('study-hub-pdf-cache-v1');
  const existing = await cache.match(url);
  if (existing) {
    const blob = await existing.blob();
    return { objectUrl: window.URL.createObjectURL(blob), sizeBytes: blob.size };
  }
  const response = await fetch(url, { method: 'GET', mode: 'no-cors' });
  await cache.put(url, response.clone());
  const blob = await response.blob();
  return { objectUrl: window.URL.createObjectURL(blob), sizeBytes: blob.size };
};

const MemoizedPdfPage = memo(({
  index,
  scale,
  pageWidth,
  pageHeight,
  shouldRenderTextLayer,
  pdfDevicePixelRatio,
  pdfToneClassName,
  isFullMode,
  isLastPage,
}: {
  index: number;
  scale: number;
  pageWidth: number;
  pageHeight: number;
  shouldRenderTextLayer: boolean;
  pdfDevicePixelRatio: number;
  pdfToneClassName: string;
  isFullMode: boolean;
  isLastPage: boolean;
}) => (
  <div
    className={[
      'study-reader-canvas flex flex-col items-center px-0',
      isFullMode ? 'py-1 sm:px-2 sm:py-2' : 'py-2 sm:px-6 sm:py-4',
    ].join(' ')}
  >
    <div
      className={[
        'study-reader-page-frame overflow-hidden rounded-lg sm:rounded-xl',
        pdfToneClassName,
        isLastPage ? 'shadow-[0_0_0_2px_rgba(148,163,184,0.3)] dark:shadow-[0_0_0_2px_rgba(255,255,255,0.08)]' : '',
      ].join(' ')}
      style={{ width: pageWidth, height: pageHeight }}
    >
      <Page
        pageNumber={index + 1}
        className="study-pdf-selectable-page"
        scale={scale}
        renderAnnotationLayer={false}
        renderTextLayer={shouldRenderTextLayer}
        devicePixelRatio={pdfDevicePixelRatio}
        loading={(
          <div
            className="h-full w-full animate-pulse bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.045))] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))]"
            style={{ width: pageWidth, height: pageHeight }}
          />
        )}
      />
    </div>
  </div>
));

MemoizedPdfPage.displayName = 'MemoizedPdfPage';

const DocumentEndFooter = () => (
  <div className="flex flex-col items-center justify-center gap-3 pb-10 pt-6">
    <div className="flex items-center gap-3">
      <div className="h-px w-16 bg-gradient-to-r from-transparent to-slate-300 dark:to-slate-700" />
      <div className="flex h-7 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 dark:border-white/10 dark:bg-white/5">
        <svg
          className="h-3 w-3 text-slate-400 dark:text-slate-500"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
          End of document
        </span>
      </div>
      <div className="h-px w-16 bg-gradient-to-l from-transparent to-slate-300 dark:to-slate-700" />
    </div>
  </div>
);

// ─── Page Number Display - Pure UI, no scroll side effects ──────────────────
const PageNumberDisplay = memo(({
  displayPage,
  numPages,
  onSubmit,
}: {
  displayPage: number;
  numPages: number;
  onSubmit: (page: number) => void;
}) => {
  const [inputValue, setInputValue] = useState(String(displayPage));
  const inputRef = useRef<HTMLInputElement>(null);
  const isUserEditingRef = useRef(false);

  // Sync input when page changes externally (scroll), but only if user is not typing
  useEffect(() => {
    if (!isUserEditingRef.current) {
      setInputValue(String(displayPage));
    }
  }, [displayPage]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextPage = Number(inputValue);
    if (!Number.isInteger(nextPage) || nextPage < 1 || nextPage > numPages) {
      setInputValue(String(displayPage));
      isUserEditingRef.current = false;
      return;
    }
    isUserEditingRef.current = false;
    onSubmit(nextPage);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="study-control-surface flex h-10 shrink-0 items-center gap-1.5 rounded-2xl bg-slate-100/80 px-2 shadow-sm dark:bg-white/5"
    >
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => {
          isUserEditingRef.current = true;
          setInputValue(e.target.value);
        }}
        onFocus={(e) => {
          isUserEditingRef.current = true;
          e.target.select();
        }}
        onBlur={() => {
          isUserEditingRef.current = false;
          setInputValue(String(displayPage));
        }}
        inputMode="numeric"
        className="h-7 w-9 rounded-lg border border-slate-200 bg-white text-center text-sm font-black text-slate-950 outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:border-cyan-400/70"
        aria-label="Page number"
      />
      <span className="text-xs font-black text-slate-500 dark:text-slate-400">
        /{numPages || '-'}
      </span>
    </form>
  );
});

PageNumberDisplay.displayName = 'PageNumberDisplay';

const StudyPdfReaderFrame = ({
  title,
  fileUrl,
  downloadUrl,
  onClose,
  isPreparing = false,
  preparingProgress = null,
}: StudyPdfReaderFrameProps) => {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [widthMode, setWidthMode] = useState<ReaderWidthMode>('comfort');
  const [pdfTone, setPdfTone] = useState<PdfToneMode>(() => readStoredPdfTone());
  const [readerMode, setReaderMode] = useState<PdfReaderMode>('normal');
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [pageSize, setPageSize] = useState({ width: 595, height: 842 });
  const [hasError, setHasError] = useState(false);
  const [corsBlocked, setCorsBlocked] = useState(false);
  const [documentSource, setDocumentSource] = useState<string>(fileUrl);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [isSavingOffline, setIsSavingOffline] = useState(false);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // ─── Page tracking via refs only - NO state updates during scroll ──────────
  // displayPage is only for UI rendering, updated via RAF to avoid layout thrash
  const [displayPage, setDisplayPage] = useState(() => readStoredPdfPage(fileUrl));
  const currentPageRef = useRef(readStoredPdfPage(fileUrl));
  const pageDisplayRafRef = useRef<number | null>(null);
  const pageWriteTimerRef = useRef<number | null>(null);
  // ──────────────────────────────────────────────────────────────────────────

  const activeObjectUrlRef = useRef<string | null>(null);
  const virtuosoRef = useRef<any>(null);
  const scrollAreaRef = useRef<HTMLElement | null>(null);
  const readerShellRef = useRef<HTMLDivElement | null>(null);
  const progressResetRef = useRef<number | null>(null);
  const scrollIdleTimerRef = useRef<number | null>(null);
  const scaleRef = useRef(scale);
  const pinchStateRef = useRef<{ distance: number; scale: number } | null>(null);
  const lastScrollTopRef = useRef(0);
  const numPagesRef = useRef(0);
  const fileUrlRef = useRef(fileUrl);

  const isCoarsePointer = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0),
    [],
  );

  const pageWidth = pageSize.width * scale;
  const pageHeight = pageSize.height * scale;
  const sourceUrl = downloadUrl || fileUrl;

  const isFullMode = readerMode === 'full';
  const isReadMode = readerMode === 'read';
  const itemHeight = Math.round(pageHeight + (isFullMode ? 8 : 16));

  const documentFile = useMemo(() => ({ url: documentSource }), [documentSource]);

  const documentOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    disableRange: false,
    disableAutoFetch: false,
    disableStream: false,
    rangeChunkSize: 524288,
  }), []);

  const visibleLoadProgress = isPreparing
    ? Math.max(4, Math.min(98, Math.round(preparingProgress || 8)))
    : loadProgress;
  const clampedVisibleLoadProgress = visibleLoadProgress === null
    ? null
    : Math.max(0, Math.min(100, visibleLoadProgress));
  const progressBarPercent = clampedVisibleLoadProgress === null ? 0 : Math.max(2, clampedVisibleLoadProgress);
  const showProgressBar = isPreparing || isDocumentLoading || (clampedVisibleLoadProgress !== null && clampedVisibleLoadProgress < 100);

  const modeButtonLabel = isFullMode ? 'Exit' : isReadMode ? 'Full' : 'Read';
  const modeButtonTitle = isFullMode ? 'Exit full mode' : isReadMode ? 'Full PDF mode' : 'Read mode';
  const readerTopGap = isFullMode ? 0 : readerTopOffset;

  const documentLoadingFallback = (
    <div className="study-reader-canvas flex h-full items-center justify-center p-3 sm:p-6">
      <div className="h-[70vh] w-full max-w-3xl animate-pulse rounded-2xl bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.05))] shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.035))] sm:rounded-3xl" />
    </div>
  );

  const pdfToneClassName = pdfToneClassNames[pdfTone];

  const virtuosoComponents = useMemo(() => ({
    Header: () => <div style={{ height: readerTopGap }} aria-hidden="true" />,
    Footer: () => <DocumentEndFooter />,
    ScrollSeekPlaceholder: ({ height }: { height: number }) => (
      <div className="study-reader-canvas flex justify-center px-0 py-2 sm:px-6 sm:py-4" style={{ height }}>
        <div
          className="study-reader-page-frame overflow-hidden rounded-lg bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.045))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.025))] sm:rounded-xl"
          style={{ width: pageWidth, maxWidth: '100%', height: Math.max(240, height - 32) }}
        >
          <div className="h-full w-full bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.10)_45%,transparent_70%)]" />
        </div>
      </div>
    ),
  }), [pageWidth, readerTopGap]);

  const virtuosoScrollConfig = useMemo(() => {
    if (isCoarsePointer) {
      return {
        increaseViewportBy: { top: 1600, bottom: 1600 },
        overscan: { main: 1600, reverse: 1600 },
        scrollSeekConfiguration: {
          enter: (velocity: number) => Math.abs(velocity) > 1200,
          exit: (velocity: number) => Math.abs(velocity) < 200,
        },
      };
    }
    return {
      increaseViewportBy: { top: 1800, bottom: 1800 },
      overscan: { main: 1800, reverse: 1800 },
      scrollSeekConfiguration: {
        enter: (velocity: number) => Math.abs(velocity) > 2500,
        exit: (velocity: number) => Math.abs(velocity) < 400,
      },
    };
  }, [isCoarsePointer]);

  const pdfDevicePixelRatio = useMemo(
    () => Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1 : 1.5),
    [isCoarsePointer],
  );

  const shouldRenderTextLayer = !isCoarsePointer && !isScrolling;

  const closeButtonClassName =
    'study-control-surface inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-cyan-400/40';

  const clearProgressReset = useCallback(() => {
    if (progressResetRef.current === null || typeof window === 'undefined') return;
    window.clearTimeout(progressResetRef.current);
    progressResetRef.current = null;
  }, []);

  const revokeActiveObjectUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (activeObjectUrlRef.current) {
      window.URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
  }, []);

  const fitToWidth = useCallback((baseWidth = pageSize.width) => {
    const containerWidth = scrollAreaRef.current?.clientWidth || window.innerWidth;
    const isCompact = containerWidth < 640;
    const usableWidth = Math.max(280, containerWidth - (isCompact ? 12 : 48));
    const targetWidth = isCompact ? usableWidth : Math.min(usableWidth, readerWidthModeMax[widthMode]);
    setScale(clampScale(targetWidth / baseWidth));
  }, [pageSize.width, widthMode]);

  const zoomBy = (delta: number) => {
    setScale((current) => clampScale(Number((current + delta).toFixed(2))));
  };

  const handlePdfTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    const [firstTouch, secondTouch] = Array.from(event.touches);
    const distance = Math.hypot(firstTouch.clientX - secondTouch.clientX, firstTouch.clientY - secondTouch.clientY);
    pinchStateRef.current = { distance, scale: scaleRef.current };
  };

  const handlePdfTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || !pinchStateRef.current) return;
    event.preventDefault();
    const [firstTouch, secondTouch] = Array.from(event.touches);
    const currentDistance = Math.hypot(firstTouch.clientX - secondTouch.clientX, firstTouch.clientY - secondTouch.clientY);
    const nextScale = clampScale(pinchStateRef.current.scale * (currentDistance / pinchStateRef.current.distance));
    setScale(Number(nextScale.toFixed(2)));
  };

  const handlePdfTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length < 2) pinchStateRef.current = null;
  };

  const cycleWidthMode = () => {
    setWidthMode((current) => {
      const index = readerWidthModes.indexOf(current);
      return readerWidthModes[(index + 1) % readerWidthModes.length];
    });
  };

  const cyclePdfTone = () => {
    setPdfTone((current) => {
      const index = pdfToneModes.indexOf(current);
      return pdfToneModes[(index + 1) % pdfToneModes.length];
    });
  };

  const enterReadMode = async () => {
    if (typeof document === 'undefined') return;
    try {
      const shell = readerShellRef.current;
      setReaderMode('read');
      if (shell?.requestFullscreen && document.fullscreenElement !== shell) {
        await shell.requestFullscreen();
      }
      requestAnimationFrame(() => fitToWidth());
    } catch {
      setReaderMode('read');
      requestAnimationFrame(() => fitToWidth());
    }
  };

  const enterFullMode = async () => {
    if (typeof document === 'undefined') return;
    try {
      const shell = readerShellRef.current;
      setReaderMode('full');
      setWidthMode('wide');
      if (shell?.requestFullscreen && document.fullscreenElement !== shell) {
        await shell.requestFullscreen();
      }
      requestAnimationFrame(() => fitToWidth());
    } catch {
      setReaderMode('full');
      setWidthMode('wide');
      requestAnimationFrame(() => fitToWidth());
    }
  };

  const exitReaderMode = async () => {
    try {
      if (typeof document !== 'undefined' && document.fullscreenElement === readerShellRef.current) {
        await document.exitFullscreen?.();
      }
    } catch {
      // ignore
    }
    setReaderMode('normal');
    setMobileMenuOpen(false);
    requestAnimationFrame(() => fitToWidth());
  };

  const handleModeAction = () => {
    if (readerMode === 'full') { void exitReaderMode(); return; }
    if (readerMode === 'read') { void enterFullMode(); return; }
    void enterReadMode();
  };

  useEffect(() => { scaleRef.current = scale; }, [scale]);

  const handleClose = async () => {
    try {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        await document.exitFullscreen?.();
      }
    } catch {
      // ignore
    }
    setReaderMode('normal');
    setMobileMenuOpen(false);
    onClose?.();
  };

  const handleScrollerRef = useCallback((ref: HTMLElement | Window | null) => {
    if (!(ref instanceof HTMLElement)) return;
    ref.id = 'pdf-scroll-area';
    ref.setAttribute('data-native-scroll', 'true');
    ref.setAttribute('data-pdf-scroller', 'true');
    ref.classList.add('study-scrollbar');
    scrollAreaRef.current = ref;
  }, []);

  // ─── Core: rangeChanged updates ONLY refs + RAF display, never causes scroll ─
  const handleRangeChanged = useCallback((range: { startIndex: number; endIndex: number }) => {
    const nextPage = range.startIndex + 1;

    // Already on this page - skip everything
    if (nextPage === currentPageRef.current) return;

    // Update ref immediately (sync, no render)
    currentPageRef.current = nextPage;

    // Cancel pending display update
    if (pageDisplayRafRef.current !== null) {
      cancelAnimationFrame(pageDisplayRafRef.current);
    }

    // Schedule display update in next paint - completely decoupled from scroll
    pageDisplayRafRef.current = requestAnimationFrame(() => {
      pageDisplayRafRef.current = null;
      // This setDisplayPage triggers re-render of PageNumberDisplay only
      // Virtuoso is NOT affected because it has no dependency on displayPage
      setDisplayPage(nextPage);
    });

    // Debounced sessionStorage write - no render triggered
    if (pageWriteTimerRef.current !== null) {
      window.clearTimeout(pageWriteTimerRef.current);
    }
    pageWriteTimerRef.current = window.setTimeout(() => {
      writeStoredPdfPage(fileUrlRef.current, nextPage);
      pageWriteTimerRef.current = null;
    }, 300);
  }, []); // empty deps - this never changes, no stale closure issues

  // ─── Explicit navigation from page input form ──────────────────────────────
  const handlePageNavigate = useCallback((nextPage: number) => {
    currentPageRef.current = nextPage;
    setDisplayPage(nextPage);
    writeStoredPdfPage(fileUrlRef.current, nextPage);
    virtuosoRef.current?.scrollToIndex({
      index: nextPage - 1,
      align: 'start',
      offset: -readerTopGap,
      behavior: 'auto',
    });
  }, [readerTopGap]);

  useEffect(() => {
    fileUrlRef.current = fileUrl;
  }, [fileUrl]);

  useEffect(() => {
    numPagesRef.current = numPages;
  }, [numPages]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      revokeActiveObjectUrl();
      setDocumentSource(fileUrl);
      setIsOfflineReady(false);
      setIsDocumentLoading(true);
      setLoadProgress(null);
      setHasError(false);
      setCorsBlocked(false);
      try {
        const cachedObjectUrl = await readCachedPdfObjectUrl(sourceUrl);
        if (!isMounted) return;
        if (cachedObjectUrl) {
          revokeActiveObjectUrl();
          activeObjectUrlRef.current = cachedObjectUrl;
          setDocumentSource(cachedObjectUrl);
          setIsOfflineReady(true);
        }
      } catch {
        if (isMounted) setDocumentSource(fileUrl);
      }
    };
    const storedPage = readStoredPdfPage(fileUrl);
    clearProgressReset();
    currentPageRef.current = storedPage;
    setDisplayPage(storedPage);
    setNumPages(0);
    void init();
    return () => { isMounted = false; };
  }, [clearProgressReset, fileUrl, revokeActiveObjectUrl, sourceUrl]);

  useEffect(() => () => {
    clearProgressReset();
    revokeActiveObjectUrl();
    if (pageDisplayRafRef.current !== null) cancelAnimationFrame(pageDisplayRafRef.current);
    if (pageWriteTimerRef.current !== null) window.clearTimeout(pageWriteTimerRef.current);
    if (scrollIdleTimerRef.current !== null) window.clearTimeout(scrollIdleTimerRef.current);
  }, [clearProgressReset, revokeActiveObjectUrl]);

  useEffect(() => {
    const target = scrollAreaRef.current;
    if (!target) return undefined;

    const handleScroll = () => {
      lastScrollTopRef.current = target.scrollTop;
      setIsScrolling(true);
      if (scrollIdleTimerRef.current !== null) window.clearTimeout(scrollIdleTimerRef.current);
      scrollIdleTimerRef.current = window.setTimeout(() => {
        setIsScrolling(false);
        scrollIdleTimerRef.current = null;
      }, 150);
    };

    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      target.removeEventListener('scroll', handleScroll);
      if (scrollIdleTimerRef.current !== null) window.clearTimeout(scrollIdleTimerRef.current);
    };
  }, [numPages]);

  useEffect(() => {
    const target = scrollAreaRef.current;
    if (!target || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => fitToWidth());
    observer.observe(target);
    return () => observer.disconnect();
  }, [fitToWidth]);

  useEffect(() => {
    if (numPages > 0) fitToWidth();
  }, [fitToWidth, numPages]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(pdfToneStorageKey, pdfTone);
  }, [pdfTone]);

  useEffect(() => {
    if (readerMode === 'full') setMobileMenuOpen(false);
  }, [readerMode]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const handleFullscreenChange = () => {
      const isCurrentReaderFullscreen = document.fullscreenElement === readerShellRef.current;
      setReaderMode((current) => {
        if (isCurrentReaderFullscreen) return current === 'normal' ? 'read' : current;
        return 'normal';
      });
      if (!isCurrentReaderFullscreen) setMobileMenuOpen(false);
      requestAnimationFrame(() => fitToWidth());
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [fitToWidth]);

  const handleLoadProgress = ({ loaded, total }: { loaded: number; total: number }) => {
    clearProgressReset();
    if (!total) {
      setLoadProgress((current) => current ?? 6);
      return;
    }
    const nextProgress = Math.min(99, Math.round((loaded / total) * 100));
    setLoadProgress((current) => Math.max(current || 0, nextProgress));
  };

  const handleSaveOffline = async () => {
    if (!sourceUrl || isSavingOffline) return;
    setIsSavingOffline(true);
    try {
      const cachedPdf = await cachePdfUrlForOffline(sourceUrl);
      revokeActiveObjectUrl();
      activeObjectUrlRef.current = cachedPdf.objectUrl;
      setDocumentSource(cachedPdf.objectUrl);
      setIsOfflineReady(true);
      setHasError(false);
      setCorsBlocked(false);
    } catch (error) {
      console.error('PDF offline save failed:', error);
    } finally {
      setIsSavingOffline(false);
    }
  };

  const handleLoadSuccess = async (pdf: any) => {
    clearProgressReset();
    setIsDocumentLoading(false);
    setLoadProgress(100);
    setHasError(false);
    setCorsBlocked(false);
    const firstPage = await pdf.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1 });
    const storedPage = Math.min(readStoredPdfPage(fileUrl), pdf.numPages);
    setPageSize({ width: viewport.width, height: viewport.height });
    setNumPages(pdf.numPages);
    numPagesRef.current = pdf.numPages;
    currentPageRef.current = storedPage;
    setDisplayPage(storedPage);
    if (typeof window !== 'undefined') {
      progressResetRef.current = window.setTimeout(() => {
        setLoadProgress(null);
        progressResetRef.current = null;
      }, 450);
    }
    requestAnimationFrame(() => {
      fitToWidth(viewport.width);
      if (storedPage > 1) {
        virtuosoRef.current?.scrollToIndex({
          index: storedPage - 1,
          align: 'start',
          offset: -readerTopGap,
          behavior: 'auto',
        });
      }
    });
  };

  const handleLoadError = (error: Error) => {
    clearProgressReset();
    setIsDocumentLoading(false);
    setLoadProgress(null);
    const msg = error?.message?.toLowerCase() ?? '';
    setCorsBlocked(msg.includes('cors') || msg.includes('fetch') || msg.includes('network'));
    setHasError(true);
  };

  const errorPanel = (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <div className="study-panel-surface w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-slate-950/10 dark:bg-white/5 dark:shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
          <ArrowDownTrayIcon className="h-7 w-7 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-black text-slate-950 dark:text-white">
          {corsBlocked ? 'External PDF — Cannot Preview' : 'Preview could not load'}
        </h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
          {corsBlocked
            ? 'This PDF is on an external server that blocks in-app loading. Open it directly in your browser.'
            : 'Something went wrong loading this PDF. Try downloading it directly.'}
        </p>
        <div className="mt-5">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
          >
            <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
            Open / Download PDF
          </a>
        </div>
      </div>
    </div>
  );

  // ─── Stable initial index - never recalculated after mount ────────────────
  const initialIndexRef = useRef(Math.max(0, currentPageRef.current - 1));

  return (
    <div
      ref={readerShellRef}
      className={[
        'study-shell study-pdf-reader-shell relative flex h-full flex-col overflow-hidden text-slate-950 dark:text-white',
        isFullMode ? 'study-pdf-full-mode' : '',
      ].join(' ')}
    >
      {showProgressBar && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[80]">
          <div className="relative h-[3px] w-full overflow-hidden">
            <div className="absolute inset-0 bg-slate-200/60 dark:bg-white/[0.08]" />
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 via-sky-400 to-cyan-500 transition-[width] duration-300 ease-out"
              style={{ width: `${progressBarPercent}%` }}
            />
          </div>
        </div>
      )}

      {!isFullMode && (
        <header className="study-topbar absolute inset-x-0 top-0 z-30 bg-white/[0.68] px-2 pb-2 pt-[calc(0.55rem+env(safe-area-inset-top))] backdrop-blur-3xl transition duration-200 [backdrop-filter:saturate(1.35)_blur(24px)] dark:bg-[#050814]/[0.62] sm:px-3 sm:py-2 xl:px-5">
          <div className="study-top-blur-edge pointer-events-none absolute inset-x-0 bottom-[-3.25rem] h-14 bg-gradient-to-b from-white/[0.58] via-white/[0.24] to-transparent backdrop-blur-2xl opacity-100 [mask-image:linear-gradient(to_bottom,black_0%,rgba(0,0,0,0.76)_42%,transparent_100%)] dark:from-[#050814]/[0.68] dark:via-[#050814]/[0.22]" />
          <div className="flex min-h-11 min-w-0 flex-wrap items-center gap-2">
            {onClose ? (
              <button type="button" onClick={handleClose} className={closeButtonClassName} aria-label="Back">
                <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              <Dialog.Close className={closeButtonClassName} aria-label="Back" onClick={() => { void handleClose(); }}>
                <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
              </Dialog.Close>
            )}

            <div className="hidden min-w-0 flex-1 sm:block">
              <div className="flex items-center gap-2.5">
                <h2 className="truncate text-sm font-black tracking-tight text-slate-950 [text-shadow:none] dark:text-white sm:text-base">
                  {title}
                </h2>
                {showProgressBar && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-black tabular-nums tracking-wide text-cyan-700 ring-1 ring-cyan-500/20 dark:bg-cyan-400/10 dark:text-cyan-300 dark:ring-cyan-400/20">
                    <span className="relative flex h-1.5 w-1.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-500 opacity-75 dark:bg-cyan-400" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-600 dark:bg-cyan-400" />
                    </span>
                    {Math.round(progressBarPercent)}%
                  </span>
                )}
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">PDF</p>
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-2 sm:hidden">
              {showProgressBar && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-black tabular-nums tracking-wide text-cyan-700 ring-1 ring-cyan-500/20 dark:bg-cyan-400/10 dark:text-cyan-300 dark:ring-cyan-400/20">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-500 opacity-75 dark:bg-cyan-400" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-600 dark:bg-cyan-400" />
                  </span>
                  {Math.round(progressBarPercent)}%
                </span>
              )}
            </div>

            <div className="study-control-surface hidden h-10 shrink-0 items-center gap-1 rounded-2xl bg-slate-100/80 px-1.5 shadow-sm dark:bg-white/5 md:flex">
              <button type="button" onClick={() => zoomBy(-0.1)} className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Zoom out" title="Zoom out">
                <MinusIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="w-12 text-center text-xs font-black tabular-nums text-slate-700 dark:text-slate-200">
                {Math.round(scale * 100)}%
              </span>
              <button type="button" onClick={() => zoomBy(0.1)} className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Zoom in" title="Zoom in">
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => fitToWidth()} className="flex h-7 items-center justify-center rounded-xl px-2 text-xs font-black text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Fit to width" title="Fit to width">
                Fit
              </button>
              <button type="button" onClick={cycleWidthMode} className="flex h-7 items-center justify-center gap-1 rounded-xl bg-white px-2 text-xs font-black text-slate-800 shadow-sm transition hover:text-cyan-700 dark:bg-white/10 dark:text-slate-100 dark:hover:text-cyan-200" aria-label="Change PDF width" title="Change PDF width">
                <ArrowsPointingOutIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {readerWidthModeLabels[widthMode]}
              </button>
            </div>

            <button
              type="button"
              onClick={handleModeAction}
              className={[
                'study-control-surface inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-2xl px-3 text-xs font-black shadow-sm transition',
                isReadMode
                  ? 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100'
                  : 'bg-slate-100/80 text-slate-700 hover:bg-white hover:text-cyan-700 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-cyan-200',
              ].join(' ')}
              aria-label={modeButtonTitle}
              title={modeButtonTitle}
            >
              {isReadMode && <ArrowsPointingOutIcon className="h-4 w-4" aria-hidden="true" />}
              <span>{modeButtonLabel}</span>
            </button>

            <button
              type="button"
              onClick={cyclePdfTone}
              className="study-control-surface hidden h-10 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-slate-100/80 px-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:bg-white hover:text-cyan-700 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-cyan-200 md:inline-flex"
              aria-label={`PDF tone: ${pdfToneLabels[pdfTone]}`}
              title={`PDF tone: ${pdfToneLabels[pdfTone]}`}
            >
              <SwatchIcon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{pdfToneLabels[pdfTone]}</span>
            </button>

            {/* ─── Page Number - isolated component, no scroll side effects ── */}
            <PageNumberDisplay
              displayPage={displayPage}
              numPages={numPages}
              onSubmit={handlePageNavigate}
            />

            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="hidden h-10 shrink-0 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100 md:inline-flex"
              title="Download PDF"
            >
              <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
              <span className="hidden lg:inline">{isOfflineReady ? 'Saved' : 'Save'}</span>
            </a>

            <div className="relative ml-auto flex-none self-start md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((current) => !current)}
                className="study-control-surface inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100/80 text-slate-700 shadow-sm transition hover:bg-white hover:text-cyan-700 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-cyan-200"
                aria-label="Reader options"
                title="Reader options"
                aria-expanded={isMobileMenuOpen}
              >
                <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
              </button>

              {isMobileMenuOpen && (
                <div className="study-control-surface absolute right-0 top-[calc(100%+0.55rem)] z-[60] w-52 max-w-[calc(100vw-1.25rem)] origin-top-right rounded-3xl border border-white/70 bg-white/[0.92] p-2 shadow-[0_20px_52px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#101521]/[0.92] dark:shadow-[0_24px_64px_rgba(0,0,0,0.42)]">
                  <div className="grid grid-cols-3 gap-1.5">
                    <button type="button" onClick={() => zoomBy(-0.1)} className="flex h-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 dark:bg-white/[0.07] dark:text-slate-200 dark:hover:bg-white/[0.12]" aria-label="Zoom out">
                      <MinusIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="flex h-10 items-center justify-center rounded-2xl bg-slate-100 text-xs font-black tabular-nums text-slate-700 dark:bg-white/[0.07] dark:text-slate-200">
                      {Math.round(scale * 100)}%
                    </span>
                    <button type="button" onClick={() => zoomBy(0.1)} className="flex h-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 dark:bg-white/[0.07] dark:text-slate-200 dark:hover:bg-white/[0.12]" aria-label="Zoom in">
                      <PlusIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-2 grid gap-1.5">
                    <button type="button" onClick={() => fitToWidth()} className="flex h-10 items-center justify-between rounded-2xl px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]">
                      <span>Fit</span>
                      <span className="text-slate-400">{Math.round(scale * 100)}%</span>
                    </button>
                    <button type="button" onClick={cycleWidthMode} className="flex h-10 items-center justify-between rounded-2xl px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]">
                      <span>Width</span>
                      <span className="text-cyan-700 dark:text-cyan-300">{readerWidthModeLabels[widthMode]}</span>
                    </button>
                    <button type="button" onClick={cyclePdfTone} className="flex h-10 items-center justify-between rounded-2xl px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]">
                      <span>Tone</span>
                      <span className="text-cyan-700 dark:text-cyan-300">{pdfToneLabels[pdfTone]}</span>
                    </button>
                    <a href={sourceUrl} target="_blank" rel="noreferrer" download className="flex h-10 items-center justify-between rounded-2xl px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]">
                      <span>Download</span>
                      <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      <div
        className="study-reader-canvas relative min-h-0 flex-1"
        onTouchStart={handlePdfTouchStart}
        onTouchMove={handlePdfTouchMove}
        onTouchEnd={handlePdfTouchEnd}
        onTouchCancel={handlePdfTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        {isPreparing ? (
          documentLoadingFallback
        ) : hasError ? (
          errorPanel
        ) : (
          <Document
            file={documentFile}
            options={documentOptions}
            onLoadSuccess={handleLoadSuccess}
            onLoadProgress={handleLoadProgress}
            onLoadError={handleLoadError}
            loading={documentLoadingFallback}
            className="study-reader-canvas h-full"
          >
            <Virtuoso
              ref={virtuosoRef}
              totalCount={numPages}
              initialItemCount={Math.min(numPages || 4, isCoarsePointer ? 2 : 4)}
              defaultItemHeight={itemHeight}
              // ✅ fixedItemHeight removed - Virtuoso measures actual DOM height
              // This prevents wrong startIndex reports that caused page skipping
              increaseViewportBy={virtuosoScrollConfig.increaseViewportBy}
              overscan={virtuosoScrollConfig.overscan}
              // ✅ Static ref - never recalculates, never causes scroll jumps
              initialTopMostItemIndex={initialIndexRef.current}
              components={virtuosoComponents}
              scrollSeekConfiguration={virtuosoScrollConfig.scrollSeekConfiguration}
              className="study-scrollbar study-reader-canvas h-full overscroll-contain"
              scrollerRef={handleScrollerRef}
              rangeChanged={handleRangeChanged}
              itemContent={(index) => (
                <MemoizedPdfPage
                  index={index}
                  scale={scale}
                  pageWidth={pageWidth}
                  pageHeight={pageHeight}
                  shouldRenderTextLayer={shouldRenderTextLayer}
                  pdfDevicePixelRatio={pdfDevicePixelRatio}
                  pdfToneClassName={pdfToneClassName}
                  isFullMode={isFullMode}
                  isLastPage={numPages > 0 && index === numPages - 1}
                />
              )}
            />
          </Document>
        )}
      </div>
    </div>
  );
};

export default StudyPdfReaderFrame;