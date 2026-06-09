import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Document, Page, pdfjs } from 'react-pdf';
import PdfPageSkeleton from './PdfPageSkeleton';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfDocumentViewportProps {
  fileUrl?: string;
  scale: number;
  rotation: number;
  numPages: number;
  overscanValue: number;
  virtuosoRef: MutableRefObject<any>;
  pdfContainerRef: MutableRefObject<HTMLDivElement | null>;
  setCurrentPage: (page: number) => void;
  setNumPages: (pages: number) => void;
  setLoadProgress: (progress: number | null) => void;
  setUnscaledPageWidth: (width: number | null) => void;
}

const pageBaseWidth = 595;
const pageBaseHeight = 842;

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
  const progressResetRef = useRef<number | null>(null);
  const pageUpdateTimerRef = useRef<number | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const isCoarsePointer = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0),
    [],
  );

  const pageHeight = pageBaseHeight * scale;
  const shouldRenderTextLayer = !isCoarsePointer && !isScrolling;

  // 🔥 PERFORMANCE FIX: PDF loading optimization
  const pdfOptions = useMemo(() => ({
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    cMapPacked: true,
    disableAutoFetch: false, // 🚨 Streaming enable karne ke liye false rakhein
    disableStream: false,
    rangeChunkSize: 524288,
  }), []);

  // 🔥 PERFORMANCE FIX: Mobile vs Desktop Config
  const virtuosoScrollConfig = useMemo(() => {
    if (isCoarsePointer) {
      return {
        // Pre-render pages to avoid White Screen
        overscan: { main: 1600, reverse: 1600 },
        increaseViewportBy: { top: 1200, bottom: 1200 },
        scrollSeekConfiguration: undefined,
      };
    }
    return {
      overscan: { main: 2400, reverse: 2400 },
      increaseViewportBy: { top: 1800, bottom: 1800 },
      scrollSeekConfiguration: undefined,
    };
  }, [isCoarsePointer]);

  // 🔥 PERFORMANCE FIX: Resolution (1 for mobile to save CPU)
  const pdfDevicePixelRatio = useMemo(() => (isCoarsePointer ? 1 : 1.5), [isCoarsePointer]);

  const clearProgressReset = useCallback(() => {
    if (progressResetRef.current === null || typeof window === 'undefined') return;
    window.clearTimeout(progressResetRef.current);
    progressResetRef.current = null;
  }, []);

  useEffect(() => () => {
    clearProgressReset();
    if (pageUpdateTimerRef.current !== null) window.clearTimeout(pageUpdateTimerRef.current);
  }, [clearProgressReset]);

  useEffect(() => {
    const target = pdfContainerRef.current;
    if (!target) return undefined;

    let scrollIdleTimer: number | null = null;
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollIdleTimer !== null) window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(() => setIsScrolling(false), 140);
    };

    target.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      target.removeEventListener('scroll', handleScroll);
      if (scrollIdleTimer !== null) window.clearTimeout(scrollIdleTimer);
    };
  }, [numPages, pdfContainerRef]);

  const handleRangeChanged = useCallback((range: { startIndex: number }) => {
    const nextPage = range.startIndex + 1;
    if (pageUpdateTimerRef.current !== null) window.clearTimeout(pageUpdateTimerRef.current);
    pageUpdateTimerRef.current = window.setTimeout(() => {
      setCurrentPage(nextPage);
      pageUpdateTimerRef.current = null;
    }, isCoarsePointer ? 60 : 90);
  }, [isCoarsePointer, setCurrentPage]);

  const handleLoadProgress = ({ loaded, total }: { loaded: number; total: number }) => {
    clearProgressReset();
    if (!total) {
      setLoadProgress(6);
      return;
    }
    setLoadProgress(Math.min(99, Math.round((loaded / total) * 100)));
  };

  const handleDocumentLoadSuccess = async (pdf: any) => {
    clearProgressReset();
    setLoadProgress(100);
    setNumPages(pdf.numPages);
    const firstPage = await pdf.getPage(1);
    setUnscaledPageWidth(firstPage.getViewport({ scale: 1 }).width);
    if (typeof window !== 'undefined') {
      progressResetRef.current = window.setTimeout(() => {
        setLoadProgress(null);
        progressResetRef.current = null;
      }, 450);
    }
  };

  const handleLoadError = (error: Error) => {
    clearProgressReset();
    setLoadProgress(null);
    console.error(error);
  };

  return (
    <Document
      file={fileUrl}
      options={pdfOptions}
      onLoadSuccess={handleDocumentLoadSuccess}
      onLoadProgress={handleLoadProgress}
      onLoadError={handleLoadError}
      loading={<PdfPageSkeleton />}
      className="flex-1 overflow-hidden"
    >
      <Virtuoso
        ref={virtuosoRef}
        overscan={virtuosoScrollConfig.overscan}
        increaseViewportBy={virtuosoScrollConfig.increaseViewportBy}
        scrollSeekConfiguration={virtuosoScrollConfig.scrollSeekConfiguration}
        defaultItemHeight={Math.round(pageHeight + 16)}
        totalCount={numPages}
        scrollerRef={(ref) => {
          if (ref) {
            pdfContainerRef.current = ref as HTMLDivElement;
            const element = ref as HTMLElement;
            element.id = 'pdf-scroll-area';
            element.setAttribute('data-native-scroll', 'true');
            element.setAttribute('data-pdf-scroller', 'true');
            element.classList.add('study-scrollbar');
            element.style.overflowY = 'auto';
            element.style.overscrollBehavior = 'contain';
            element.style.setProperty('-webkit-overflow-scrolling', 'touch');
          }
        }}
        className="study-scrollbar h-full overscroll-contain"
        rangeChanged={handleRangeChanged}
        itemContent={(index) => (
          <div className="flex justify-center py-2 md:py-4">
            <div
              className="bg-white shadow-lg"
              style={{ width: pageBaseWidth * scale, height: pageBaseHeight * scale }}
            >
              <Page
                pageNumber={index + 1}
                className="study-pdf-selectable-page"
                scale={scale}
                rotate={rotation}
                renderAnnotationLayer={false}
                renderTextLayer={shouldRenderTextLayer}
                devicePixelRatio={pdfDevicePixelRatio}
                loading={
                  <div
                    style={{ width: pageBaseWidth * scale, height: pageBaseHeight * scale }}
                    className="animate-pulse rounded-md bg-slate-200"
                  />
                }
              />
            </div>
          </div>
        )}
      />
    </Document>
  );
};

export default PdfDocumentViewport;