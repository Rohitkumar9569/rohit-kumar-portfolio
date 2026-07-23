import { memo, type FormEvent, type TouchEvent as ReactTouchEvent, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Virtuoso } from 'react-virtuoso';
import { Document, Page, pdfjs } from 'react-pdf';
import PdfPageSkeleton from '@/components/viewer/PdfPageSkeleton';
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

const NORMAL_MODE_VERTICAL_GAP = 24;
const FULL_MODE_VERTICAL_GAP = 0;
const NORMAL_MODE_HORIZONTAL_PADDING = 12;

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

const canUsePdfCacheStorage = () =>
  typeof window !== 'undefined' && 'caches' in window;

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

// ✅ Backend proxy URL — mobile ke liye top-level navigation ka target.
// (X-Frame-Options / CORS wale external PDFs ko bhi apne server se stream
// karke serve karta hai.)
const buildPdfProxyUrl = (url: string) => `/api/pdf-proxy?url=${encodeURIComponent(url)}`;

// ✅ MemoizedPdfPage — stable props, zoom pe remount nahi hoga
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
  verticalGap,
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
  verticalGap: number;
}) => (
  <div
    className="flex w-full flex-col items-center"
    style={{
      paddingTop: verticalGap / 2,
      paddingBottom: verticalGap / 2,
      paddingLeft: isFullMode ? 0 : NORMAL_MODE_HORIZONTAL_PADDING,
      paddingRight: isFullMode ? 0 : NORMAL_MODE_HORIZONTAL_PADDING,
    }}
  >
    <div
      className={[
        'study-reader-page-frame overflow-hidden',
        isFullMode ? '' : 'rounded-lg shadow-md sm:rounded-xl',
        pdfToneClassName,
        isLastPage && !isFullMode
          ? 'shadow-[0_0_0_2px_rgba(148,163,184,0.3)] dark:shadow-[0_0_0_2px_rgba(255,255,255,0.08)]'
          : '',
      ].join(' ')}
      style={{
        width: pageWidth,
        height: pageHeight,
        transform: 'translateZ(0)',
        willChange: 'transform',
        contain: 'layout paint size',
      }}
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
  const [scrollerVersion, setScrollerVersion] = useState(0);

  // ✅ Mobile viewport detection — mobile pe hum embed nahi karte, seedha
  // Chrome/Edge ke apne native PDF viewer pe top-level navigate karte hain.
  // Wajah: iframe ke andar embed kiya hua PDF kabhi bhi 100% crisp pinch-zoom
  // + native scroll nahi de sakta (browser gesture-routing limitation).
  // Sirf top-level navigation (jaise seedha PDF URL address bar mein) se
  // Chrome ka PDFium renderer full control leta hai — perfect zoom + scroll.
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  const hasRedirectedToNativeViewerRef = useRef(false);

  // ✅ NEW: Stable item height — zoom pe change nahi hoga, Virtuoso remount nahi karega
  const [stableItemHeight, setStableItemHeight] = useState(0);
  const [stableVerticalGap, setStableVerticalGap] = useState(NORMAL_MODE_VERTICAL_GAP);

  const [, startTransition] = useTransition();

  const isScrollingRef = useRef(false);

  const [displayPage, setDisplayPage] = useState(() => readStoredPdfPage(fileUrl));
  const currentPageRef = useRef(readStoredPdfPage(fileUrl));
  const pageWriteTimerRef = useRef<number | null>(null);

  const activeObjectUrlRef = useRef<string | null>(null);
  const virtuosoRef = useRef<any>(null);
  const scrollAreaRef = useRef<HTMLElement | null>(null);
  const readerShellRef = useRef<HTMLDivElement | null>(null);
  const progressResetRef = useRef<number | null>(null);
  const scrollIdleTimerRef = useRef<number | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const scaleRef = useRef(scale);
  const pinchStateRef = useRef<{ distance: number; scale: number } | null>(null);
  const lastScrollTopRef = useRef(0);
  const numPagesRef = useRef(0);
  const fileUrlRef = useRef(fileUrl);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  // ✅ NEW: Scroll ratio ref — zoom ke baad position restore karne ke liye
  const scrollRatioBeforeZoomRef = useRef(0);
  const isZoomingRef = useRef(false);
  const zoomRestoreRafRef = useRef<number | null>(null);

  const isCoarsePointer = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches ||
        navigator.maxTouchPoints > 0),
    [],
  );

  const pageWidth = Math.round(pageSize.width * scale);
  const pageHeight = Math.round(pageSize.height * scale);
  const sourceUrl = downloadUrl || fileUrl;

  const isFullMode = readerMode === 'full';
  const isReadMode = readerMode === 'read';

  const verticalGap = isFullMode ? FULL_MODE_VERTICAL_GAP : NORMAL_MODE_VERTICAL_GAP;

  // ✅ itemHeight — rendering ke liye actual use (zoom ke saath change hota hai)
  const itemHeight = Math.round(pageHeight + verticalGap);

  // ✅ stableItemHeight — Virtuoso ke liye (zoom pe NAHI badlega)
  useEffect(() => {
    if (pageHeight > 0) {
      const newStableHeight = Math.round(pageHeight + verticalGap);
      setStableItemHeight((prev) => {
        if (prev === 0) return newStableHeight;
        return prev;
      });
      setStableVerticalGap(verticalGap);
    }
  }, [pageHeight, verticalGap]);

  useEffect(() => {
    setStableItemHeight(0);
  }, [fileUrl]);

  useEffect(() => {
    setStableItemHeight(0);
  }, [readerMode]);

  // ✅ Viewport resize/orientation tracking — mobile <-> desktop switch
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mql = window.matchMedia('(max-width: 768px)');
    const handleChange = (event: MediaQueryListEvent) => setIsMobileViewport(event.matches);
    if (mql.addEventListener) mql.addEventListener('change', handleChange);
    else mql.addListener(handleChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handleChange);
      else mql.removeListener(handleChange);
    };
  }, []);

  // ✅ File badalne par redirect flag reset karo (naya PDF khula toh dubara redirect ho)
  useEffect(() => {
    hasRedirectedToNativeViewerRef.current = false;
  }, [fileUrl]);

  const mobilePdfProxyUrl = useMemo(() => buildPdfProxyUrl(sourceUrl), [sourceUrl]);

  // ✅ THE REAL FIX: mobile pe embed karne ki jagah seedha Chrome/Edge ke
  // native PDF viewer pe top-level navigate karo. Isse:
  //  - Scroll 100% native ho jata hai (koi iframe wrapper nahi)
  //  - Pinch-zoom bilkul crisp/vector-sharp hota hai (koi "page zoom" blur nahi)
  //  - Chrome/Edge ka apna progress bar dikhta hai
  //  - Sirf ek hi navbar (Chrome ka) dikhega, koi double nahi
  // Chhota sa delay isliye taaki apna branded splash ek pal ke liye dikhe,
  // phir turant redirect ho jaye — abrupt blank flash na ho.
  useEffect(() => {
    if (!isMobileViewport || isPreparing || !sourceUrl) return undefined;
    if (hasRedirectedToNativeViewerRef.current) return undefined;
    hasRedirectedToNativeViewerRef.current = true;

    const redirectTimer = window.setTimeout(() => {
      window.location.href = mobilePdfProxyUrl;
    }, 220);

    return () => window.clearTimeout(redirectTimer);
  }, [isMobileViewport, isPreparing, sourceUrl, mobilePdfProxyUrl]);

  const documentFile = useMemo(() => ({ url: documentSource }), [documentSource]);

  const documentOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    disableRange: false,
    disableAutoFetch: false,
    disableStream: false,
    rangeChunkSize: isCoarsePointer ? 131072 : 524288,
  }), [isCoarsePointer]);

  const visibleLoadProgress = isPreparing
    ? Math.max(4, Math.min(98, Math.round(preparingProgress || 8)))
    : loadProgress;
  const clampedVisibleLoadProgress =
    visibleLoadProgress === null
      ? null
      : Math.max(0, Math.min(100, visibleLoadProgress));
  const progressBarPercent =
    clampedVisibleLoadProgress === null
      ? 0
      : Math.max(2, clampedVisibleLoadProgress);
  const showProgressBar =
    isPreparing ||
    isDocumentLoading ||
    (clampedVisibleLoadProgress !== null && clampedVisibleLoadProgress < 100);

  const modeButtonLabel = isFullMode
    ? 'Exit'
    : isReadMode
      ? 'Full'
      : 'Read';
  const modeButtonTitle = isFullMode
    ? 'Exit full mode'
    : isReadMode
      ? 'Full PDF mode'
      : 'Read mode';
  const readerTopGap = isFullMode ? 0 : readerTopOffset;

  const documentLoadingFallback = (
    <div className="study-reader-canvas flex h-full w-full items-start justify-center overflow-y-auto">
      <PdfPageSkeleton />
    </div>
  );

  const pdfToneClassName = pdfToneClassNames[pdfTone];
  const shouldRenderTextLayer = true;

  const virtuosoComponents = useMemo(() => ({
    Header: () => <div style={{ height: readerTopGap }} aria-hidden="true" />,
    Footer: () => <DocumentEndFooter />,
    ScrollSeekPlaceholder: ({ height }: { height: number }) => (
      <div
        className="flex w-full justify-center"
        style={{
          height,
          paddingTop: stableVerticalGap / 2,
          paddingBottom: stableVerticalGap / 2,
          paddingLeft: isFullMode ? 0 : NORMAL_MODE_HORIZONTAL_PADDING,
          paddingRight: isFullMode ? 0 : NORMAL_MODE_HORIZONTAL_PADDING,
        }}
      >
        <div
          className={[
            'overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.045))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.025))]',
            isFullMode ? '' : 'rounded-lg sm:rounded-xl',
          ].join(' ')}
          style={{
            width: pageWidth,
            maxWidth: '100%',
            height: Math.max(240, height - stableVerticalGap),
          }}
        >
          <div className="h-full w-full bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.10)_45%,transparent_70%)]" />
        </div>
      </div>
    ),
  }), [pageWidth, readerTopGap, stableVerticalGap, isFullMode]);

  const pdfDevicePixelRatio = useMemo(() => {
    const nativeDpr =
      typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    if (isCoarsePointer) {
      return Math.min(nativeDpr, 1.5);
    }
    return Math.min(nativeDpr * 1.15, 2);
  }, [isCoarsePointer]);

  const virtuosoScrollConfig = useMemo(() => {
    if (isCoarsePointer) {
      return {
        increaseViewportBy: { top: 800, bottom: 800 },
        overscan: { main: 800, reverse: 800 },
        scrollSeekConfiguration: {
          enter: (velocity: number) => Math.abs(velocity) > 1000,
          exit: (velocity: number) => Math.abs(velocity) < 100,
        },
      };
    }
    return {
      increaseViewportBy: { top: 1600, bottom: 1600 },
      overscan: { main: 1600, reverse: 1600 },
      scrollSeekConfiguration: {
        enter: (velocity: number) => Math.abs(velocity) > 900,
        exit: (velocity: number) => Math.abs(velocity) < 80,
      },
    };
  }, [isCoarsePointer]);

  const closeButtonClassName =
    'study-control-surface inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-cyan-400/40';

  const clearProgressReset = useCallback(() => {
    if (
      progressResetRef.current === null ||
      typeof window === 'undefined'
    ) return;
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

  const fitToWidth = useCallback(
    (baseWidth = pageSize.width) => {
      const containerWidth =
        scrollAreaRef.current?.clientWidth || window.innerWidth;
      const isCompact = containerWidth < 640;

      if (isFullMode) {
        const usableWidth = Math.max(280, containerWidth);
        setScale(clampScale(usableWidth / baseWidth));
        return;
      }

      const usableWidth = Math.max(
        280,
        containerWidth - NORMAL_MODE_HORIZONTAL_PADDING * 2,
      );
      const targetWidth = isCompact
        ? usableWidth
        : Math.min(usableWidth, readerWidthModeMax[widthMode]);
      setScale(clampScale(targetWidth / baseWidth));
    },
    [pageSize.width, widthMode, isFullMode],
  );

  const zoomBy = (delta: number) => {
    const el = scrollAreaRef.current;
    if (el) {
      scrollRatioBeforeZoomRef.current =
        el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
      isZoomingRef.current = true;
    }
    setScale((current) => clampScale(Number((current + delta).toFixed(2))));
  };

  const handlePdfTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return;
    event.preventDefault();
    const el = scrollAreaRef.current;
    if (el) {
      scrollRatioBeforeZoomRef.current =
        el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
      isZoomingRef.current = true;
    }
    const [firstTouch, secondTouch] = Array.from(event.touches);
    const distance = Math.hypot(
      firstTouch.clientX - secondTouch.clientX,
      firstTouch.clientY - secondTouch.clientY,
    );
    pinchStateRef.current = { distance, scale: scaleRef.current };
  };

  const handlePdfTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || !pinchStateRef.current) return;
    event.preventDefault();
    const [firstTouch, secondTouch] = Array.from(event.touches);
    const currentDistance = Math.hypot(
      firstTouch.clientX - secondTouch.clientX,
      firstTouch.clientY - secondTouch.clientY,
    );
    const nextScale = clampScale(
      pinchStateRef.current.scale *
        (currentDistance / pinchStateRef.current.distance),
    );
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
      if (
        shell?.requestFullscreen &&
        document.fullscreenElement !== shell
      ) {
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
      if (
        shell?.requestFullscreen &&
        document.fullscreenElement !== shell
      ) {
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
      if (
        typeof document !== 'undefined' &&
        document.fullscreenElement === readerShellRef.current
      ) {
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
    if (readerMode === 'full') {
      void exitReaderMode();
      return;
    }
    if (readerMode === 'read') {
      void enterFullMode();
      return;
    }
    void enterReadMode();
  };

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    if (!isZoomingRef.current) return;
    const el = scrollAreaRef.current;
    if (!el) return;

    if (zoomRestoreRafRef.current !== null) {
      cancelAnimationFrame(zoomRestoreRafRef.current);
    }

    zoomRestoreRafRef.current = requestAnimationFrame(() => {
      zoomRestoreRafRef.current = requestAnimationFrame(() => {
        if (!el) return;
        const targetScrollTop =
          scrollRatioBeforeZoomRef.current *
          (el.scrollHeight - el.clientHeight);
        el.scrollTop = targetScrollTop;
        isZoomingRef.current = false;
        zoomRestoreRafRef.current = null;
      });
    });
  }, [scale]);

  const handleClose = async () => {
    try {
      if (
        typeof document !== 'undefined' &&
        document.fullscreenElement
      ) {
        await document.exitFullscreen?.();
      }
    } catch {
      // ignore
    }
    setReaderMode('normal');
    setMobileMenuOpen(false);
    onClose?.();
  };

  const handleScrollerRef = useCallback(
    (ref: HTMLElement | Window | null) => {
      if (!(ref instanceof HTMLElement)) return;
      ref.id = 'pdf-scroll-area';
      ref.setAttribute('data-native-scroll', 'true');
      ref.setAttribute('data-pdf-scroller', 'true');
      ref.classList.add('study-scrollbar');
      ref.style.width = '100%';
      ref.style.maxWidth = '100%';
      ref.style.overflowX = 'hidden';
      ref.style.overflowY = 'auto';
      ref.style.overscrollBehavior = 'none';
      ref.style.boxSizing = 'border-box';
      (ref.style as any).webkitOverflowScrolling = 'touch';
      ref.style.transform = 'translateZ(0)';
      (ref.style as any).willChange = 'scroll-position';
      scrollAreaRef.current = ref;
      setScrollerVersion((v) => v + 1);
    },
    [],
  );

  const handlePageNavigate = useCallback(
    (nextPage: number) => {
      currentPageRef.current = nextPage;
      setDisplayPage(nextPage);
      writeStoredPdfPage(fileUrlRef.current, nextPage);
      virtuosoRef.current?.scrollToIndex({
        index: nextPage - 1,
        align: 'start',
        offset: -readerTopGap,
        behavior: 'auto',
      });
    },
    [readerTopGap],
  );

  useEffect(() => {
    fileUrlRef.current = fileUrl;
  }, [fileUrl]);

  useEffect(() => {
    numPagesRef.current = numPages;
  }, [numPages]);

  useEffect(() => {
    // ✅ Mobile viewport pe react-pdf/pdf.js document load skip karte hain —
    // wahan top-level redirect flow chalta hai (upar wala effect).
    if (isMobileViewport) {
      setIsDocumentLoading(false);
      return undefined;
    }

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
    return () => {
      isMounted = false;
    };
  }, [clearProgressReset, fileUrl, revokeActiveObjectUrl, sourceUrl, isMobileViewport]);

  useEffect(
    () => () => {
      clearProgressReset();
      revokeActiveObjectUrl();
      if (pageWriteTimerRef.current !== null)
        window.clearTimeout(pageWriteTimerRef.current);
      if (scrollIdleTimerRef.current !== null)
        window.clearTimeout(scrollIdleTimerRef.current);
      if (scrollRafRef.current !== null)
        cancelAnimationFrame(scrollRafRef.current);
      if (zoomRestoreRafRef.current !== null)
        cancelAnimationFrame(zoomRestoreRafRef.current);
    },
    [clearProgressReset, revokeActiveObjectUrl],
  );

  useEffect(() => {
    if (isMobileViewport) return undefined;
    const target = scrollAreaRef.current;
    if (!target) return undefined;

    const effectiveItemHeight = stableItemHeight || itemHeight;

    const computeAndSetPage = () => {
      scrollRafRef.current = null;
      if (!numPagesRef.current) return;
      const scrollTop = target.scrollTop;
      const adjustedScrollTop = Math.max(0, scrollTop - readerTopGap);
      const approxIndex = Math.floor(
        adjustedScrollTop / Math.max(1, effectiveItemHeight),
      );
      const nextPage = Math.min(
        numPagesRef.current,
        Math.max(1, approxIndex + 1),
      );

      if (nextPage !== currentPageRef.current) {
        currentPageRef.current = nextPage;

        startTransition(() => {
          setDisplayPage(nextPage);
        });

        if (pageWriteTimerRef.current !== null) {
          window.clearTimeout(pageWriteTimerRef.current);
        }
        pageWriteTimerRef.current = window.setTimeout(() => {
          writeStoredPdfPage(fileUrlRef.current, nextPage);
          pageWriteTimerRef.current = null;
        }, 300);
      }
    };

    const handleScroll = () => {
      lastScrollTopRef.current = target.scrollTop;
      isScrollingRef.current = true;

      if (scrollIdleTimerRef.current !== null)
        window.clearTimeout(scrollIdleTimerRef.current);
      scrollIdleTimerRef.current = window.setTimeout(() => {
        isScrollingRef.current = false;
        scrollIdleTimerRef.current = null;
      }, 150);

      if (scrollRafRef.current === null) {
        scrollRafRef.current = requestAnimationFrame(computeAndSetPage);
      }
    };

    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      target.removeEventListener('scroll', handleScroll);
      if (scrollIdleTimerRef.current !== null)
        window.clearTimeout(scrollIdleTimerRef.current);
      if (scrollRafRef.current !== null)
        cancelAnimationFrame(scrollRafRef.current);
    };
  }, [itemHeight, stableItemHeight, readerTopGap, scrollerVersion, startTransition, isMobileViewport]);

  useEffect(() => {
    if (isMobileViewport) return undefined;
    const target = scrollAreaRef.current;
    if (!target || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => fitToWidth());
    observer.observe(target);
    return () => observer.disconnect();
  }, [fitToWidth, scrollerVersion, isMobileViewport]);

  useEffect(() => {
    if (isMobileViewport) return;
    if (numPages > 0) fitToWidth();
  }, [fitToWidth, numPages, isMobileViewport]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(pdfToneStorageKey, pdfTone);
  }, [pdfTone]);

  useEffect(() => {
    if (readerMode === 'full') setMobileMenuOpen(false);
  }, [readerMode]);

  useEffect(() => {
    if (isMobileViewport) return undefined;
    if (typeof document === 'undefined') return undefined;
    const handleFullscreenChange = () => {
      const isCurrentReaderFullscreen =
        document.fullscreenElement === readerShellRef.current;
      setReaderMode((current) => {
        if (isCurrentReaderFullscreen)
          return current === 'normal' ? 'read' : current;
        return 'normal';
      });
      if (!isCurrentReaderFullscreen) setMobileMenuOpen(false);
      requestAnimationFrame(() => fitToWidth());
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [fitToWidth, isMobileViewport]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isMobileMenuOpen]);

  const handleLoadProgress = ({
    loaded,
    total,
  }: {
    loaded: number;
    total: number;
  }) => {
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
    setCorsBlocked(
      msg.includes('cors') ||
        msg.includes('fetch') ||
        msg.includes('network'),
    );
    setHasError(true);
  };

  const errorPanel = (
    <div className="flex h-full items-center justify-center p-6 text-center">
      <div className="study-panel-surface w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-slate-950/10 dark:bg-white/5 dark:shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
          <ArrowDownTrayIcon
            className="h-7 w-7 text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
        </div>
        <h3 className="text-lg font-black text-slate-950 dark:text-white">
          {corsBlocked
            ? 'External PDF — Cannot Preview'
            : 'Preview could not load'}
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

  const initialIndexRef = useRef(Math.max(0, currentPageRef.current - 1));

  const virtuosoItemHeight = stableItemHeight || itemHeight;

  // ================================================================
  // ✅ MOBILE VIEW: Sirf ek chhota branded "opening…" splash dikhta hai,
  // phir turant Chrome/Edge ke native PDF viewer pe top-level navigate
  // ho jata hai (upar wala redirect effect). Isse:
  //  - Scroll 100% native/smooth
  //  - Pinch-zoom perfectly crisp (vector re-render, koi blur nahi)
  //  - Chrome/Edge ka apna progress bar
  //  - Sirf ek hi navbar (Chrome ka)
  // Desktop is se bilkul touch nahi hota — neeche wala existing flow same hai.
  // ================================================================
  if (isMobileViewport) {
    return (
      <div
        ref={readerShellRef}
        className="study-shell study-pdf-reader-shell relative flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden bg-white text-slate-950 dark:bg-[#050814] dark:text-white"
      >
        {onClose ? (
          <button
            type="button"
            onClick={handleClose}
            className="absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 shadow-sm transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
            aria-label="Back"
          >
            <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <Dialog.Close
            className="absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 shadow-sm transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
            aria-label="Back"
            onClick={() => {
              void handleClose();
            }}
          >
            <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
          </Dialog.Close>
        )}

        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500/25 border-t-cyan-500" />
        <p className="max-w-[80vw] truncate text-sm font-black text-slate-800 dark:text-slate-100">
          {title}
        </p>
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
          Opening in your browser&apos;s PDF viewer…
        </p>
      </div>
    );
  }

  // ================================================================
  // ✅ DESKTOP VIEW: existing react-pdf + Virtuoso experience — untouched
  // ================================================================
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
              <button
                type="button"
                onClick={handleClose}
                className={closeButtonClassName}
                aria-label="Back"
              >
                <ArrowLeftIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : (
              <Dialog.Close
                className={closeButtonClassName}
                aria-label="Back"
                onClick={() => {
                  void handleClose();
                }}
              >
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
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
                PDF
              </p>
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
              <button
                type="button"
                onClick={() => zoomBy(-0.1)}
                className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Zoom out"
              >
                <MinusIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="w-12 text-center text-xs font-black tabular-nums text-slate-700 dark:text-slate-200">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => zoomBy(0.1)}
                className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Zoom in"
              >
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => fitToWidth()}
                className="flex h-7 items-center justify-center rounded-xl px-2 text-xs font-black text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Fit to width"
              >
                Fit
              </button>
              <button
                type="button"
                onClick={cycleWidthMode}
                className="flex h-7 items-center justify-center gap-1 rounded-xl bg-white px-2 text-xs font-black text-slate-800 shadow-sm transition hover:text-cyan-700 dark:bg-white/10 dark:text-slate-100 dark:hover:text-cyan-200"
                aria-label="Change PDF width"
              >
                <ArrowsPointingOutIcon
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                />
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
            >
              {isReadMode && (
                <ArrowsPointingOutIcon
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              )}
              <span>{modeButtonLabel}</span>
            </button>

            <button
              type="button"
              onClick={cyclePdfTone}
              className="study-control-surface hidden h-10 shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-slate-100/80 px-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:bg-white hover:text-cyan-700 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-cyan-200 md:inline-flex"
              aria-label={`PDF tone: ${pdfToneLabels[pdfTone]}`}
            >
              <SwatchIcon className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{pdfToneLabels[pdfTone]}</span>
            </button>

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
              <span className="hidden lg:inline">
                {isOfflineReady ? 'Saved' : 'Save'}
              </span>
            </a>

            <div
              className="invisible ml-auto h-10 w-10 shrink-0 md:hidden"
              aria-hidden="true"
            />
          </div>
        </header>
      )}

      {!isFullMode && (
        <div
          ref={mobileMenuRef}
          className="fixed right-3 top-[calc(0.6rem+env(safe-area-inset-top))] z-[95] md:hidden"
        >
          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="study-control-surface inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100/90 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.18)] backdrop-blur-xl transition hover:bg-white hover:text-cyan-700 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20 dark:hover:text-cyan-200"
            aria-label="Reader options"
            aria-expanded={isMobileMenuOpen}
          >
            <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
          </button>

          {isMobileMenuOpen && (
            <div className="study-control-surface absolute right-0 top-[calc(100%+0.55rem)] z-[95] w-52 max-w-[calc(100vw-1.25rem)] origin-top-right rounded-3xl border border-white/70 bg-white/[0.96] p-2 shadow-[0_20px_52px_rgba(15,23,42,0.22)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#101521]/[0.96] dark:shadow-[0_24px_64px_rgba(0,0,0,0.48)]">
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => zoomBy(-0.1)}
                  className="flex h-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 dark:bg-white/[0.07] dark:text-slate-200 dark:hover:bg-white/[0.12]"
                  aria-label="Zoom out"
                >
                  <MinusIcon className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="flex h-10 items-center justify-center rounded-2xl bg-slate-100 text-xs font-black tabular-nums text-slate-700 dark:bg-white/[0.07] dark:text-slate-200">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => zoomBy(0.1)}
                  className="flex h-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 dark:bg-white/[0.07] dark:text-slate-200 dark:hover:bg-white/[0.12]"
                  aria-label="Zoom in"
                >
                  <PlusIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-2 grid gap-1.5">
                <button
                  type="button"
                  onClick={() => fitToWidth()}
                  className="flex h-10 items-center justify-between rounded-2xl px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]"
                >
                  <span>Fit</span>
                  <span className="text-slate-400">
                    {Math.round(scale * 100)}%
                  </span>
                </button>
                <button
                  type="button"
                  onClick={cycleWidthMode}
                  className="flex h-10 items-center justify-between rounded-2xl px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]"
                >
                  <span>Width</span>
                  <span className="text-cyan-700 dark:text-cyan-300">
                    {readerWidthModeLabels[widthMode]}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={cyclePdfTone}
                  className="flex h-10 items-center justify-between rounded-2xl px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]"
                >
                  <span>Tone</span>
                  <span className="text-cyan-700 dark:text-cyan-300">
                    {pdfToneLabels[pdfTone]}
                  </span>
                </button>
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="flex h-10 items-center justify-between rounded-2xl px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]"
                >
                  <span>Download</span>
                  <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          )}
        </div>
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
              initialItemCount={Math.min(numPages || 4, isCoarsePointer ? 1 : 4)}
              fixedItemHeight={virtuosoItemHeight}
              increaseViewportBy={virtuosoScrollConfig.increaseViewportBy}
              overscan={virtuosoScrollConfig.overscan}
              initialTopMostItemIndex={initialIndexRef.current}
              components={virtuosoComponents}
              scrollSeekConfiguration={virtuosoScrollConfig.scrollSeekConfiguration}
              className="study-scrollbar study-reader-canvas h-full"
              style={{ overscrollBehavior: 'none' }}
              scrollerRef={handleScrollerRef}
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
                  verticalGap={verticalGap}
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