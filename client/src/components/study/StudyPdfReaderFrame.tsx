import { type FormEvent, type TouchEvent as ReactTouchEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Virtuoso } from 'react-virtuoso';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
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

const StudyPdfReaderFrame = ({
  title,
  fileUrl,
  downloadUrl,
  onClose,
  isPreparing = false,
  preparingProgress = null,
}: StudyPdfReaderFrameProps) => {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(() => readStoredPdfPage(fileUrl));
  const [pageInput, setPageInput] = useState(() => String(readStoredPdfPage(fileUrl)));
  const [scale, setScale] = useState(1);
  const [widthMode, setWidthMode] = useState<ReaderWidthMode>('comfort');
  const [pdfTone, setPdfTone] = useState<PdfToneMode>(() => readStoredPdfTone());
  const [readerMode, setReaderMode] = useState<PdfReaderMode>('normal');
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [pageSize, setPageSize] = useState({ width: 595, height: 842 });
  const [hasError, setHasError] = useState(false);
  const virtuosoRef = useRef<any>(null);
  const scrollAreaRef = useRef<HTMLElement | null>(null);
  const readerShellRef = useRef<HTMLDivElement | null>(null);
  const progressResetRef = useRef<number | null>(null);
  const scaleRef = useRef(scale);
  const pinchStateRef = useRef<{ distance: number; scale: number } | null>(null);

  const pageWidth = pageSize.width * scale;
  const pageHeight = pageSize.height * scale;
  const sourceUrl = downloadUrl || fileUrl;
  const documentFile = useMemo(() => ({ url: fileUrl }), [fileUrl]);
  const documentOptions = useMemo(() => ({
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
  const isFullMode = readerMode === 'full';
  const isReadMode = readerMode === 'read';
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
    ScrollSeekPlaceholder: ({ height }: { height: number }) => (
      <div className="study-reader-canvas flex justify-center px-0 py-2 sm:px-6 sm:py-4" style={{ height }}>
        <div className="study-reader-page-frame overflow-hidden rounded-lg bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.045))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.025))] sm:rounded-xl" style={{ width: pageWidth, maxWidth: '100%', height: Math.max(240, height - 32) }}>
          <div className="h-full w-full animate-pulse bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.10)_45%,transparent_70%)]" />
        </div>
      </div>
    ),
  }), [pageWidth, readerTopGap]);
  const closeButtonClassName =
    'study-control-surface inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-cyan-400/40';

  const clearProgressReset = useCallback(() => {
    if (progressResetRef.current === null || typeof window === 'undefined') return;
    window.clearTimeout(progressResetRef.current);
    progressResetRef.current = null;
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
    if (event.touches.length < 2) {
      pinchStateRef.current = null;
    }
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
      // Fullscreen can fail when a browser blocks the request; read mode still improves sizing.
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
      // Browsers only allow fullscreen from a direct user gesture.
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
      // Ignore fullscreen exit failures; the local mode state still restores the reader chrome.
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

  const handleClose = async () => {
    try {
      if (typeof document !== 'undefined' && document.fullscreenElement) {
        await document.exitFullscreen?.();
      }
    } catch {
      // Ignore fullscreen exit failures and continue closing the reader.
    }
    setReaderMode('normal');
    setMobileMenuOpen(false);
    onClose?.();
  };

  const handleScrollerRef = useCallback((ref: HTMLElement | Window | null) => {
    if (!(ref instanceof HTMLElement)) return;
    scrollAreaRef.current = ref;
  }, []);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    const storedPage = readStoredPdfPage(fileUrl);
    clearProgressReset();
    setCurrentPage(storedPage);
    setPageInput(String(storedPage));
    setNumPages(0);
    setLoadProgress(null);
    setHasError(false);
  }, [clearProgressReset, fileUrl]);

  useEffect(() => () => clearProgressReset(), [clearProgressReset]);

  useEffect(() => {
    if (!numPages) return;
    writeStoredPdfPage(fileUrl, Math.min(currentPage, numPages));
  }, [currentPage, fileUrl, numPages]);

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

  const handleLoadSuccess = async (pdf: PDFDocumentProxy) => {
    clearProgressReset();
    setLoadProgress(100);

    const firstPage = await pdf.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1 });
    const storedPage = Math.min(readStoredPdfPage(fileUrl), pdf.numPages);
    setPageSize({ width: viewport.width, height: viewport.height });
    setNumPages(pdf.numPages);
    setCurrentPage(storedPage);
    setHasError(false);
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

  const handlePageSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextPage = Number(pageInput);
    if (!Number.isInteger(nextPage) || nextPage < 1 || nextPage > numPages) {
      setPageInput(String(currentPage));
      return;
    }
    setCurrentPage(nextPage);
    virtuosoRef.current?.scrollToIndex({
      index: nextPage - 1,
      align: 'start',
      offset: -readerTopGap,
      behavior: 'auto',
    });
  };

  return (
    <div
      ref={readerShellRef}
      className={['study-shell study-pdf-reader-shell relative flex h-full flex-col overflow-hidden text-slate-950 dark:text-white', isFullMode ? 'study-pdf-full-mode' : ''].join(' ')}
    >
      {!isFullMode && (
      <header className="study-topbar absolute inset-x-0 top-0 z-30 bg-white/[0.68] px-2 pb-2 pt-[calc(0.55rem+env(safe-area-inset-top))] backdrop-blur-3xl transition duration-200 [backdrop-filter:saturate(1.35)_blur(24px)] dark:bg-[#050814]/[0.62] sm:px-3 sm:py-2 xl:px-5">
          <div className="study-top-blur-edge pointer-events-none absolute inset-x-0 bottom-[-3.25rem] h-14 bg-gradient-to-b from-white/[0.58] via-white/[0.24] to-transparent backdrop-blur-2xl opacity-100 [mask-image:linear-gradient(to_bottom,black_0%,rgba(0,0,0,0.76)_42%,transparent_100%)] dark:from-[#050814]/[0.68] dark:via-[#050814]/[0.22]" />
        {clampedVisibleLoadProgress !== null && (
          <div
            className="pointer-events-none absolute inset-x-3 top-1.5 z-20 h-1.5 overflow-hidden rounded-full bg-slate-950/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_0_1px_rgba(15,23,42,0.08)] dark:bg-white/[0.14] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_0_0_1px_rgba(255,255,255,0.08)]"
            role="progressbar"
            aria-label="PDF loading progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clampedVisibleLoadProgress)}
          >
            <div
              className="relative h-full overflow-hidden rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_48%,#fef3c7_100%)] shadow-[0_0_22px_rgba(34,211,238,0.58)] transition-[width] duration-700 ease-out"
              style={{ width: `${clampedVisibleLoadProgress}%` }}
            >
              <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.70)_42%,transparent_68%)] opacity-80" />
            </div>
            <div
              className="absolute inset-y-[-0.22rem] w-12 rounded-full bg-cyan-200/35 blur-md transition-[left] duration-700 ease-out dark:bg-cyan-300/30"
              style={{ left: `${Math.max(0, clampedVisibleLoadProgress - 8)}%` }}
            />
          </div>
        )}
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
            <h2 className="truncate text-sm font-black tracking-tight text-slate-950 [text-shadow:none] dark:text-white sm:text-base">
              {title}
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
              PDF
            </p>
          </div>
          <div className="min-w-0 flex-1 sm:hidden" aria-hidden="true" />

          <div className="study-control-surface hidden h-10 shrink-0 items-center gap-1 rounded-2xl bg-slate-100/80 px-1.5 shadow-sm dark:bg-white/5 md:flex">
            <button
              type="button"
              onClick={() => zoomBy(-0.1)}
              className="flex h-7 w-7 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Zoom out"
              title="Zoom out"
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
              title="Zoom in"
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => fitToWidth()}
              className="flex h-7 items-center justify-center rounded-xl px-2 text-xs font-black text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Fit to width"
              title="Fit to width"
            >
              Fit
            </button>
            <button
              type="button"
              onClick={cycleWidthMode}
              className="flex h-7 items-center justify-center gap-1 rounded-xl bg-white px-2 text-xs font-black text-slate-800 shadow-sm transition hover:text-cyan-700 dark:bg-white/10 dark:text-slate-100 dark:hover:text-cyan-200"
              aria-label="Change PDF width"
              title="Change PDF width"
            >
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

          <form onSubmit={handlePageSubmit} className="study-control-surface flex h-10 shrink-0 items-center gap-1.5 rounded-2xl bg-slate-100/80 px-2 shadow-sm dark:bg-white/5">
            <input
              value={pageInput}
              onChange={(event) => setPageInput(event.target.value)}
              onFocus={(event) => event.target.select()}
              inputMode="numeric"
              className="h-7 w-9 rounded-lg border border-slate-200 bg-white text-center text-sm font-black text-slate-950 outline-none focus:border-cyan-500 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:border-cyan-400/70"
              aria-label="Page number"
            />
            <span className="text-xs font-black text-slate-500 dark:text-slate-400">/{numPages || '-'}</span>
          </form>

          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            download
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100 md:inline-flex"
            aria-label="Download PDF"
            title="Download PDF"
          >
            <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
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
                    <span className="text-slate-400">{Math.round(scale * 100)}%</span>
                  </button>
                  <button
                    type="button"
                    onClick={cycleWidthMode}
                    className="flex h-10 items-center justify-between rounded-2xl px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]"
                  >
                    <span>Width</span>
                    <span className="text-cyan-700 dark:text-cyan-300">{readerWidthModeLabels[widthMode]}</span>
                  </button>
                  <button
                    type="button"
                    onClick={cyclePdfTone}
                    className="flex h-10 items-center justify-between rounded-2xl px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]"
                  >
                    <span>Tone</span>
                    <span className="text-cyan-700 dark:text-cyan-300">{pdfToneLabels[pdfTone]}</span>
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
        </div>
      </header>
      )}

      <div
        className="study-reader-canvas min-h-0 flex-1"
        onTouchStart={handlePdfTouchStart}
        onTouchMove={handlePdfTouchMove}
        onTouchEnd={handlePdfTouchEnd}
        onTouchCancel={handlePdfTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        {isPreparing ? (
          documentLoadingFallback
        ) : hasError ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div className="study-panel-surface max-w-md rounded-3xl bg-white p-6 shadow-2xl shadow-slate-950/10 dark:bg-white/5 dark:shadow-2xl">
              <h3 className="text-lg font-black text-slate-950 dark:text-white">Preview could not load</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                Download the PDF, or try opening it again.
              </p>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
              >
                <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
                Download
              </a>
            </div>
          </div>
        ) : (
          <Document
            file={documentFile}
            options={documentOptions}
            onLoadSuccess={handleLoadSuccess}
            onLoadProgress={handleLoadProgress}
            onLoadError={() => {
              clearProgressReset();
              setLoadProgress(null);
              setHasError(true);
            }}
            loading={documentLoadingFallback}
            className="study-reader-canvas h-full"
          >
            <Virtuoso
              ref={virtuosoRef}
              totalCount={numPages}
              initialItemCount={Math.min(numPages || 4, 4)}
              defaultItemHeight={Math.round(pageHeight + (isFullMode ? 16 : 32))}
              increaseViewportBy={{ top: 2200, bottom: 5200 }}
              overscan={{ main: 2600, reverse: 1200 }}
              initialTopMostItemIndex={Math.max(0, Math.min(currentPage, numPages || currentPage) - 1)}
              components={virtuosoComponents}
              scrollSeekConfiguration={{
                enter: (velocity) => Math.abs(velocity) > 2200,
                exit: (velocity) => Math.abs(velocity) < 420,
              }}
              className="study-reader-canvas h-full custom-scrollbar"
              scrollerRef={handleScrollerRef}
              rangeChanged={(range) => setCurrentPage(range.startIndex + 1)}
              itemContent={(index) => (
                <div className={['study-reader-canvas flex justify-center px-0', isFullMode ? 'py-1 sm:px-2 sm:py-2' : 'py-2 sm:px-6 sm:py-4'].join(' ')}>
                  <div
                    className={[
                      'study-reader-page-frame overflow-hidden rounded-lg sm:rounded-xl',
                      pdfToneClassName,
                    ].join(' ')}
                    style={{ width: pageWidth, height: pageHeight }}
                  >
                    <Page
                      pageNumber={index + 1}
                      className="study-pdf-selectable-page"
                      scale={scale}
                      renderAnnotationLayer={false}
                      renderTextLayer
                      devicePixelRatio={Math.min(window.devicePixelRatio || 1, 2)}
                      loading={(
                        <div
                          className="h-full w-full animate-pulse bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.045))] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))]"
                          style={{ width: pageWidth, height: pageHeight }}
                        />
                      )}
                    />
                  </div>
                </div>
              )}
            />
          </Document>
        )}
      </div>
    </div>
  );
};

export default StudyPdfReaderFrame;
