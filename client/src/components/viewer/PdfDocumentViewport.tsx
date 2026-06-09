import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import PdfPageSkeleton from './PdfPageSkeleton';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs?v=5.4.296';

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
  overscanValue,
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
  const virtuosoScrollConfig = useMemo(() => {
    if (isCoarsePointer) {
      return {
        overscan: 280,
        increaseViewportBy: { top: 360, bottom: 720 },
        scrollSeekConfiguration: {
          enter: (velocity: number) => Math.abs(velocity) > 900,
          exit: (velocity: number) => Math.abs(velocity) < 180,
        },
      };
    }

    return {
      overscan: overscanValue,
      increaseViewportBy: undefined,
      scrollSeekConfiguration: undefined,
    };
  }, [isCoarsePointer, overscanValue]);
  const pdfDevicePixelRatio = useMemo(
    () => Math.min(window.devicePixelRatio || 1, isCoarsePointer ? 1.25 : 1.5),
    [isCoarsePointer],
  );

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

  const handleDocumentLoadSuccess = async (pdf: PDFDocumentProxy) => {
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
                renderTextLayer={!isCoarsePointer && !isScrolling}
                devicePixelRatio={pdfDevicePixelRatio}
                loading={(
                  <div
                    style={{ width: pageBaseWidth * scale, height: pageBaseHeight * scale }}
                    className="animate-pulse rounded-md bg-slate-200"
                  />
                )}
              />
            </div>
          </div>
        )}
      />
    </Document>
  );
};

export default PdfDocumentViewport;
