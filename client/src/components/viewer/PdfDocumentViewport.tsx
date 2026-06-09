import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
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

  const clearProgressReset = useCallback(() => {
    if (progressResetRef.current === null || typeof window === 'undefined') return;
    window.clearTimeout(progressResetRef.current);
    progressResetRef.current = null;
  }, []);

  useEffect(() => () => clearProgressReset(), [clearProgressReset]);

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
        overscan={overscanValue}
        totalCount={numPages}
        scrollerRef={(ref) => {
          if (ref) {
            pdfContainerRef.current = ref as HTMLDivElement;
            (ref as HTMLElement).id = 'pdf-scroll-area';
          }
        }}
        className="custom-scrollbar"
        rangeChanged={(range) => setCurrentPage(range.startIndex + 1)}
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
                renderTextLayer
                devicePixelRatio={Math.min(window.devicePixelRatio || 1, 1.5)}
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
