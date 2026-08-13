import { 
  memo, useCallback, useEffect, useMemo, useRef,
  type MutableRefObject 
} from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Document, Page, pdfjs } from 'react-pdf';
import PdfPageSkeleton from './PdfPageSkeleton';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc =
  `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const pageBaseWidth  = 595;
const pageBaseHeight = 842;

// ─── Page ──────────────────────────────────────────────────────────────────
const MemoizedViewportPage = memo(({
  index,
  scale,
  rotation,
  pdfDevicePixelRatio,
}: {
  index: number;
  scale: number;
  rotation: number;
  pdfDevicePixelRatio: number;
}) => {
  const width  = Math.round(pageBaseWidth * scale);
  const height = Math.round(pageBaseHeight * scale);

  return (
    <div className="flex justify-center py-2 md:py-4">
      <div className="bg-white shadow-lg" style={{ width }}>
        <Page
          pageNumber={index + 1}
          className="study-pdf-selectable-page"
          width={width}
          rotate={rotation}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          devicePixelRatio={pdfDevicePixelRatio}
          loading={
            <div
              style={{ width, height }}
              className="animate-pulse rounded-md bg-slate-200"
            />
          }
        />
      </div>
    </div>
  );
});

MemoizedViewportPage.displayName = 'MemoizedViewportPage';

// ─── Props ─────────────────────────────────────────────────────────────────
interface PdfDocumentViewportProps {
  fileUrl?: string;
  scale: number;
  rotation: number;
  numPages: number;
  virtuosoRef: MutableRefObject<any>;
  pdfContainerRef: MutableRefObject<HTMLDivElement | null>;
  setCurrentPage: (page: number) => void;
  setNumPages: (pages: number) => void;
  setLoadProgress: (progress: number | null) => void;
  setUnscaledPageWidth: (width: number | null) => void;
}

// ─── Main ──────────────────────────────────────────────────────────────────
const PdfDocumentViewport = ({
  fileUrl,
  scale,
  rotation,
  numPages,
  virtuosoRef,
  pdfContainerRef,
  setCurrentPage,
  setNumPages,
  setLoadProgress,
  setUnscaledPageWidth,
}: PdfDocumentViewportProps) => {
  const progressResetRef    = useRef<number | null>(null);
  // store setCurrentPage in ref so rangeChanged never needs to re-create
  const setCurrentPageRef   = useRef(setCurrentPage);
  const pageUpdateTimerRef  = useRef<number | null>(null);
  const lastReportedPageRef = useRef(0);
  const isScrollingRef = useRef(false);
  const scrollIdleTimerRef = useRef<number | null>(null);
  const pendingPageRef = useRef<number | null>(null);
  const scrollerElRef = useRef<HTMLElement | null>(null);

  // keep ref in sync without causing re-render
  useEffect(() => { setCurrentPageRef.current = setCurrentPage; }, [setCurrentPage]);

  const isCoarsePointer = useMemo(() =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0),
  []);

  const pdfDevicePixelRatio = isCoarsePointer ? 1 : 1.5;
  const pageHeight          = pageBaseHeight * scale;

  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    disableAutoFetch: false,
    disableStream: false,
    rangeChunkSize: 524288,
  }), []);

  // cleanup
  useEffect(() => () => {
    if (progressResetRef.current  !== null) window.clearTimeout(progressResetRef.current);
    if (pageUpdateTimerRef.current !== null) window.clearTimeout(pageUpdateTimerRef.current);
    if (scrollIdleTimerRef.current !== null) window.clearTimeout(scrollIdleTimerRef.current);
    if (scrollerElRef.current) {
      scrollerElRef.current.removeEventListener('scroll', onPdfScrollerScroll as any);
      scrollerElRef.current = null;
    }
  }, []);

  const clearProgressReset = useCallback(() => {
    if (progressResetRef.current === null) return;
    window.clearTimeout(progressResetRef.current);
    progressResetRef.current = null;
  }, []);

  const onPdfScrollerScroll = useCallback(() => {
    isScrollingRef.current = true;
    if (scrollIdleTimerRef.current !== null) {
      window.clearTimeout(scrollIdleTimerRef.current);
    }
    scrollIdleTimerRef.current = window.setTimeout(() => {
      scrollIdleTimerRef.current = null;
      isScrollingRef.current = false;
      const pending = pendingPageRef.current;
      if (pending !== null && pending !== lastReportedPageRef.current) {
        lastReportedPageRef.current = pending;
        setCurrentPageRef.current(pending);
        pendingPageRef.current = null;
      }
    }, 200);
  }, []);

  // ── rangeChanged: NO state, NO re-render ──────────────────────────────
  // Uses refs only — Virtuoso will not cause any parent re-render
  const handleRangeChanged = useCallback(
    (range: { startIndex: number }) => {
      const nextPage = range.startIndex + 1;
      // skip if same page to avoid unnecessary work
      if (nextPage === lastReportedPageRef.current || pendingPageRef.current === nextPage) return;

      // always store as pending; we'll apply after debounce or when scroll idle
      pendingPageRef.current = nextPage;
      if (pageUpdateTimerRef.current !== null) window.clearTimeout(pageUpdateTimerRef.current);

      pageUpdateTimerRef.current = window.setTimeout(() => {
        pageUpdateTimerRef.current = null;
        // if user is actively scrolling, wait for scroll idle to apply
        if (isScrollingRef.current) return;
        const pending = pendingPageRef.current;
        if (pending !== null && pending !== lastReportedPageRef.current) {
          lastReportedPageRef.current = pending;
          setCurrentPageRef.current(pending);
          pendingPageRef.current = null;
        }
      }, 250);
    },
    [], // ← zero deps, never re-created
  );

  const handleLoadProgress = useCallback(
    ({ loaded, total }: { loaded: number; total: number }) => {
      clearProgressReset();
      setLoadProgress(total ? Math.min(99, Math.round((loaded / total) * 100)) : 6);
    },
    [clearProgressReset, setLoadProgress],
  );

  const handleDocumentLoadSuccess = useCallback(
    async (pdf: any) => {
      clearProgressReset();
      setLoadProgress(100);
      setNumPages(pdf.numPages);
      const firstPage = await pdf.getPage(1);
      setUnscaledPageWidth(firstPage.getViewport({ scale: 1 }).width);
      progressResetRef.current = window.setTimeout(() => {
        setLoadProgress(null);
        progressResetRef.current = null;
      }, 450);
    },
    [clearProgressReset, setLoadProgress, setNumPages, setUnscaledPageWidth],
  );

  const handleLoadError = useCallback(
    (error: Error) => {
      clearProgressReset();
      setLoadProgress(null);
      console.error('PDF load error:', error);
    },
    [clearProgressReset, setLoadProgress],
  );

  const scrollerRefCallback = useCallback(
    (ref: HTMLElement | Window | null) => {
      if (!ref || ref instanceof Window) return;
      const el = ref as HTMLDivElement;
      pdfContainerRef.current = el;
      el.id = 'pdf-scroll-area';
      el.setAttribute('data-pdf-scroller', 'true');
      el.classList.add('study-scrollbar');
      el.style.overflowY = 'auto';
      el.style.overscrollBehavior = 'contain';
      // Prevent browser scroll anchoring which can jump when images/content load
      // https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-anchor
      (el.style as any).overflowAnchor = 'none';
      if (scrollerElRef.current && scrollerElRef.current !== el) {
        scrollerElRef.current.removeEventListener('scroll', onPdfScrollerScroll as any);
      }
      scrollerElRef.current = el;
      el.addEventListener('scroll', onPdfScrollerScroll, { passive: true });
    },
    [pdfContainerRef],
  );

  // itemContent stable — only scale/rotation/dpr trigger re-render (intentional)
  const itemContent = useCallback(
    (index: number) => (
      <MemoizedViewportPage
        index={index}
        scale={scale}
        rotation={rotation}
        pdfDevicePixelRatio={pdfDevicePixelRatio}
      />
    ),
    [scale, rotation, pdfDevicePixelRatio],
  );

  return (
    <Document
      file={fileUrl}
      options={pdfOptions}
      onLoadSuccess={handleDocumentLoadSuccess}
      onLoadProgress={handleLoadProgress}
      onLoadError={handleLoadError}
      loading={<PdfPageSkeleton />}
      className="flex-1 overflow-visible"
    >
      <Virtuoso
        ref={virtuosoRef}
        overscan={isCoarsePointer ? 600 : 1000}
        increaseViewportBy={isCoarsePointer
          ? { top: 400,  bottom: 800  }
          : { top: 700,  bottom: 1400 }}
        defaultItemHeight={Math.round(pageHeight + 16)}
        totalCount={numPages}
        scrollerRef={scrollerRefCallback}
        className="study-scrollbar h-full overscroll-contain"
        rangeChanged={handleRangeChanged}
        itemContent={itemContent}
      />
    </Document>
  );
};

export default memo(PdfDocumentViewport);