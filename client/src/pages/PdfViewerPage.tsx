import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso'; // CHANGE 1: Virtuoso ko import kiya
import API from '../api';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Drawer } from 'vaul';
import ChatInterface from '../components/viewer/ChatInterface';
import PdfViewerSkeleton from '../components/viewer/PdfViewerSkeleton';
import PdfPageSkeleton from '../components/viewer/PdfPageSkeleton';
import {
  ArrowLeftIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowPathIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/solid';

pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
};

// CHANGE 2: Alag se PdfPage component ki zaroorat nahi, logic ko merge kar diya.

const PdfViewerPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pyq, setPyq] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  const autoHideDisabled = useRef(false);
  const interactionTimeoutRef = useRef<number | null>(null);

  const [unscaledPageWidth, setUnscaledPageWidth] = useState<number | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<any>(null); // CHANGE 3: Page refs ki jagah Virtuoso ka ref

  const [showCustomScrollbar, setShowCustomScrollbar] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const y = useMotionValue(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [overscanValue, setOverscanValue] = useState(500);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);


  const [activeSnapPoint, setActiveSnapPoint] = useState<number | string | null>(1);
  const snapPoints = [0.6, 1];
  const smallSnapPoint = snapPoints[0];

  useEffect(() => {
    const container = pdfContainerRef.current;
    if (!container || !isMobile) return;

    const handleContainerScroll = () => {
      if (isDragging) return;
      const track = trackRef.current;
      if (track) {
        const thumbHeight = 40;
        const trackHeight = track.clientHeight;
        const contentHeight = container.scrollHeight;
        const visibleHeight = container.clientHeight;
        if (contentHeight > visibleHeight) {
          const scrollableDist = contentHeight - visibleHeight;
          const draggableDist = trackHeight - thumbHeight;
          const progress = container.scrollTop / scrollableDist;
          y.set(progress * draggableDist);
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleContainerScroll);
    resizeObserver.observe(container);
    container.addEventListener('scroll', handleContainerScroll);
    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', handleContainerScroll);
    };
  }, [isDragging, isMobile, numPages]);

  useEffect(() => {
    if (id) setLoading(true);
    API.get(`/api/pyqs/${id}`).then(res => setPyq(res.data)).catch(err => console.error(err)).finally(() => setLoading(false));
  }, [id]);
  const handleLoadProgress = ({ loaded, total }: { loaded: number; total: number }) => {
  setLoadProgress((loaded / total) * 100);
};

  const onDocumentLoadSuccess = async (pdf: PDFDocumentProxy) => {
  setLoadProgress(null);
    setNumPages(pdf.numPages);
    const firstPage = await pdf.getPage(1);
    setUnscaledPageWidth(firstPage.getViewport({ scale: 1 }).width);
  };

  const preventAutoHide = () => {
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    autoHideDisabled.current = true;
    setIsHeaderVisible(true);
    interactionTimeoutRef.current = window.setTimeout(() => { autoHideDisabled.current = false; }, 2000);
  };

  const fitWidth = () => {
    preventAutoHide();
    if (unscaledPageWidth && pdfContainerRef.current) {
      setScale(pdfContainerRef.current.clientWidth / unscaledPageWidth);
    }
  };

  useEffect(() => {
    if (unscaledPageWidth) {
      fitWidth();
      window.addEventListener('resize', fitWidth);
      return () => window.removeEventListener('resize', fitWidth);
    }
  }, [unscaledPageWidth, isMobile]);

  useEffect(() => { setPageInput(String(currentPage)); }, [currentPage]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    setShowCustomScrollbar(true);
    scrollTimeoutRef.current = window.setTimeout(() => setShowCustomScrollbar(false), 1500);

    if (isMobile) {
      if (autoHideDisabled.current) return;
      const currentScrollY = e.currentTarget.scrollTop;
      const scrollDelta = currentScrollY - lastScrollY.current;
      if (scrollDelta > 50 && currentScrollY > 150) {
        setIsHeaderVisible(false);
      } else if (scrollDelta < -10) {
        setIsHeaderVisible(true);
      }
      lastScrollY.current = currentScrollY;
    }
  };

useEffect(() => {
  const timer = setTimeout(() => {
    let finalOverscan = 800; 

    if (isMobile) {
      const deviceRam = (navigator as any).deviceMemory;

      if (deviceRam && deviceRam >= 6) {
        finalOverscan = 2000; 
      } else {
        finalOverscan =800; 
      }
    }
    
    setOverscanValue(finalOverscan);
  }, 1000);

  return () => clearTimeout(timer);
}, [isMobile]);

  const handleZoomIn = () => { preventAutoHide(); setScale(prev => prev + 0.1); };
  const handleZoomOut = () => { preventAutoHide(); setScale(prev => Math.max(0.2, prev - 0.1)); };
  const handleRotate = () => { preventAutoHide(); setRotation(prev => (prev + 90) % 360); };

  // CHANGE 4: handleGoToPage ko Virtuoso ke liye update kiya
  const handleGoToPage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    preventAutoHide();
    const pageNum = parseInt(pageInput, 10);
    if (virtuosoRef.current && pageNum >= 1 && pageNum <= numPages) {
      virtuosoRef.current.scrollToIndex({ index: pageNum - 1, align: 'start', behavior: 'smooth' });
    } else {
      setPageInput(String(currentPage));
    }
  };

  if (loading) {
    return <PdfViewerSkeleton />;
  }
  return (
    <div className="h-screen w-screen bg-slate-800 flex flex-col md:flex-row overflow-hidden">
      {loadProgress !== null && (
      <div className="absolute top-0 left-0 w-full h-1 bg-slate-600 z-50">
        <div
          className="h-1 bg-cyan-400"
          style={{
            width: `${loadProgress}%`,
            transition: 'width 0.2s ease-out',
          }}
        />
      </div>
    )}

      <div className="relative w-full md:w-3/5 h-full">
        <motion.header
          animate={{ y: (isMobile && !isHeaderVisible) ? "-100%" : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute top-0 left-0 right-0 z-30 bg-slate-900/80 backdrop-blur-sm shadow-md"
        >
          {/* Header ka JSX (koi change nahi) */}
          <div className="py-1 flex justify-between items-center px-2 sm:px-4">
            <button onClick={() => navigate(-1)} className="p-1 sm:p-2 rounded-full hover:bg-black/20" title="Go Back">
              <ArrowLeftIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </button>
            <span className="font-bold text-cyan-400 text-sm sm:text-base ml-2">{pyq?.year}</span>
            <div className="flex items-center justify-center gap-1 sm:gap-2 text-white flex-grow">
              <form onSubmit={handleGoToPage} className="flex items-center gap-1">
                <input type="number" value={pageInput} onChange={(e) => setPageInput(e.target.value)} onClick={preventAutoHide} onFocus={(e) => e.target.select()} className="w-10 text-center bg-slate-700 rounded border border-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm py-0.5" />
                <span className="text-slate-400 text-sm">/ {numPages}</span>
              </form>
              <span className="h-5 w-px bg-slate-700 mx-1"></span>
              <button onClick={handleZoomOut} className="p-1 hover:bg-slate-700 rounded-md" title="Zoom Out"><MagnifyingGlassMinusIcon className="h-4 w-4 sm:h-5 sm:w-5" /></button>
              <span className="w-12 text-center text-xs sm:text-sm tabular-nums">{`${Math.round(scale * 100)}%`}</span>
              <button onClick={handleZoomIn} className="p-1 hover:bg-slate-700 rounded-md" title="Zoom In"><MagnifyingGlassPlusIcon className="h-4 w-4 sm:h-5 sm:w-5" /></button>
              <span className="h-5 w-px bg-slate-700 mx-1"></span>
              <button onClick={fitWidth} className="p-1 hover:bg-slate-700 rounded-md hidden md:block" title="Fit to Width"><ArrowsPointingOutIcon className="h-4 w-4 sm:h-5 sm:w-5" /></button>
              <button onClick={handleRotate} className="p-1 hover:bg-slate-700 rounded-md" title="Rotate"><ArrowPathIcon className="h-4 w-4 sm:h-5 sm:w-5" /></button>
            </div>
            <div className="w-5 sm:w-6"></div>
          </div>
        </motion.header>

        <main className={`relative h-full flex flex-col bg-slate-700 transition-all duration-300 ${isHeaderVisible ? 'pt-10' : 'pt-0'}`}>
          {/* CHANGE 5: Main PDF rendering area ko Virtuoso se replace kiya */}
          <Document
            file={pyq?.fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadProgress={handleLoadProgress}
            onLoadError={console.error}
            loading={<PdfPageSkeleton />}
            className="flex-1 overflow-hidden" // Document ko container banaya
          >
            {numPages > 0 && (
              <Virtuoso
                ref={virtuosoRef}
                 overscan={overscanValue}
                totalCount={numPages}
                scrollerRef={(ref) => {
                  if (ref) {
                    (pdfContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = ref as HTMLDivElement;
                  }
                }}
                className="custom-scrollbar"
                rangeChanged={range => setCurrentPage(range.startIndex + 1)}
                itemContent={index => {
                  const pageNumber = index + 1;
                  return (
                    <div className="flex justify-center py-2 md:py-4">
                      <div className="shadow-lg">
                        <Page
                          pageNumber={pageNumber}
                          scale={scale}
                          rotate={rotation}
                          // Page skeleton ko yahan bhi rakha for better UX
                          loading={<div style={{ width: 595 * scale, height: 842 * scale }} className="bg-slate-600 animate-pulse rounded-md" />}
                        />
                      </div>
                    </div>
                  );
                }}
              />
            )}
          </Document>
        </main>

        <AnimatePresence>
          {/* Custom Scrollbar ka JSX (koi change nahi) */}
          {isMobile && showCustomScrollbar && (
            <motion.div ref={trackRef} className="absolute top-0 right-0 h-full w-10 z-20 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <motion.div
                drag="y" dragConstraints={trackRef} dragElastic={0} dragMomentum={false}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={() => setIsDragging(false)}
                onDrag={(event, info) => {
                  const container = pdfContainerRef.current;
                  const track = trackRef.current;
                  if (container && track) {
                    const thumbHeight = 40;
                    const progress = info.offset.y / (track.clientHeight - thumbHeight);
                    container.scrollTop = progress * (container.scrollHeight - container.clientHeight);
                  }
                }}
                style={{ y }}
                className="w-16 h-10 bg-slate-800/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-xs shadow-lg cursor-grab active:cursor-grabbing pointer-events-auto -ml-3"
              >
                {currentPage} / {numPages}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isMobile ? (
        <Drawer.Root modal={false} snapPoints={snapPoints} activeSnapPoint={activeSnapPoint} setActiveSnapPoint={setActiveSnapPoint}>
          <Drawer.Trigger asChild><button className="fixed bottom-6 right-6 bg-cyan-600 text-white p-4 rounded-full shadow-lg z-20 hover:bg-cyan-700 transition-transform hover:scale-110" title="Chat"><ChatBubbleOvalLeftEllipsisIcon className="h-7 w-7" /></button></Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Content className="fixed top-24 bottom-0 left-0 right-0 flex flex-col rounded-t-2xl bg-slate-900/80 backdrop-blur-md z-40 border-t border-slate-700">
              <div className="mx-auto my-3 h-1.5 w-12 flex-shrink-0 rounded-full bg-slate-600" />
              {id && <ChatInterface documentId={id} isMobileLayout={true} activeSnapPoint={activeSnapPoint} smallSnapPoint={smallSnapPoint} />}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      ) : (
        <aside className="w-2/5 h-full">
          {id && <ChatInterface documentId={id} isMobileLayout={false} />}
        </aside>
      )}
    </div>
  );
};

export default PdfViewerPage;