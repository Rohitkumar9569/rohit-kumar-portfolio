import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';
import API, { fetchDailyJourney, fetchJourneyByDate } from '../api';
import type { JourneyApiResponse, Suggestion } from '../api';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { Drawer } from 'vaul';
import ChatInterface from '../components/viewer/ChatInterface';
import PdfViewerSkeleton from '../components/viewer/PdfViewerSkeleton';
import PdfPageSkeleton from '../components/viewer/PdfPageSkeleton';
import { ArrowLeftIcon, ChatBubbleOvalLeftEllipsisIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowPathIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/solid';
import { useQuery } from '@tanstack/react-query';

import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.js`;

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
};

interface Message {
  sender: 'user' | 'ai';
  text: string;
  historicalJourney?: Suggestion[];
  journeyId: string | null;
}

const extractJourneyIdFromQuestion = (text: string, journeys: Record<string, Suggestion[]>) => {
  const sanitizedText = text.split('. ').slice(1).join('. ');
  for (const id in journeys) {
    if (journeys[id].some(s => s.questionText === sanitizedText)) {
      return id;
    }
  }
  return null;
};

const PdfViewerPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [journeys, setJourneys] = useState<Record<string, Suggestion[]>>({});
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [scrollToIndex, setScrollToIndex] = useState<number | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
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
  const virtuosoRef = useRef<any>(null);
  const [showCustomScrollbar, setShowCustomScrollbar] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const y = useMotionValue(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [overscanValue, setOverscanValue] = useState(470);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [activeSnapPoint, setActiveSnapPoint] = useState<number | string | null>(null);
  const numberOfSteps = 40;
  const snapPoints = Array.from({ length: numberOfSteps }, (_, i) => parseFloat(((i + 1) / numberOfSteps).toFixed(2)));
  const smallSnapPoint = snapPoints[5];
  const THUMB_HEIGHT = 40;
  const pdfViewContainerRef = useRef<HTMLDivElement>(null);

  const handleOpenDrawer = () => setActiveSnapPoint(1);
  const handleCloseDrawer = () => setActiveSnapPoint(null);

  // --- FIX IS HERE ---
  useEffect(() => {
    if (!isMobile || !pdfViewContainerRef.current) return;
    const container = pdfViewContainerRef.current;
    const isDrawerOpen = activeSnapPoint !== null;

    if (isDrawerOpen) {
      document.body.style.setProperty('overflow', 'hidden');
      container.style.setProperty('pointer-events', 'auto', 'important');
    } else {
      document.body.style.removeProperty('overflow');
      container.style.removeProperty('pointer-events');
    }

    // Cleanup function: This runs when the component is unmounted (e.g., when you navigate away)
    return () => {
      document.body.style.removeProperty('overflow');
    };
  }, [activeSnapPoint, isMobile]);

  const { data: todayJourneyData, isLoading: queryLoading } = useQuery<JourneyApiResponse>({
    queryKey: ['dailyJourney'],
    queryFn: fetchDailyJourney,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (todayJourneyData && !todayJourneyData.isExhausted && todayJourneyData.journey) {
      const flatJourney = todayJourneyData.journey.flatMap((pair, pairIndex) => ([
        { _id: pair.ca_question, questionText: pair.ca_question, originalIndex: pairIndex * 2 + 1, isPYQ: false },
        { _id: pair.related_pyq, questionText: pair.related_pyq, originalIndex: pairIndex * 2 + 2, isPYQ: true },
      ]));
      setJourneys(prev => ({ ...prev, 'today': flatJourney }));
    } else if (todayJourneyData && todayJourneyData.isExhausted) {
      setJourneys(prev => ({ ...prev, 'today': [] }));
    }
    if (!queryLoading) {
      setInitialLoading(false);
    }
  }, [todayJourneyData, queryLoading]);

  const filteredMessages = messages.filter(msg => {
    if (messages.length > 0 && messages[0].sender === 'ai' && msg === messages[0] && !activeJourneyId) return true;
    return msg.journeyId === activeJourneyId;
  });

  useEffect(() => {
    if (scrollToIndex !== null && chatScrollRef.current) {
      const children = chatScrollRef.current.querySelectorAll('.chat-message-container');
      if (scrollToIndex >= 0 && scrollToIndex < children.length) {
        (children[scrollToIndex] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setScrollToIndex(null);
    }
  }, [scrollToIndex, chatScrollRef.current]);

  const fetchAndStoreJourney = async (date: string, isAiTriggered: boolean = false) => {
    if (journeys[date]) {
      setActiveJourneyId(date);
      return;
    }
    try {
      const journey = await fetchJourneyByDate(date);
      setJourneys(prev => ({ ...prev, [date]: journey }));
      setActiveJourneyId(date);
      if (isAiTriggered) {
        const aiMessage: Message = { sender: 'ai', text: `Here is the Active Learning Journey for ${date}.`, historicalJourney: journey, journeyId: date };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      handleSendMessage(`Sorry, I couldn't find any questions for ${date}.`, true);
    }
  };

  const handleSendMessage = async (text: string, isAiMessage: boolean = false) => {
    if (!text.trim() || isAiLoading) return;
    const currentJourneyId = activeJourneyId || extractJourneyIdFromQuestion(text, journeys);
    if (isAiMessage) {
      const aiInfoMessage: Message = { sender: 'ai', text, journeyId: currentJourneyId };
      setMessages(prev => [...prev, aiInfoMessage]);
      return;
    }
    const userMessage: Message = { sender: 'user', text, journeyId: currentJourneyId };
    const aiPlaceholder: Message = { sender: 'ai', text: '', journeyId: currentJourneyId };
    const aiMessageIndex = messages.length + 1;
    setMessages(prev => [...prev, userMessage, aiPlaceholder]);
    setIsAiLoading(true);
    let fullResponse = "";
    try {
      const historyForApi = [...messages, userMessage];
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${baseUrl}/api/pyqs/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: historyForApi, question: text }),
      });
      if (!response.ok || !response.body) throw new Error(`Request failed`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n').filter(line => line.trim().startsWith('data:'));
        for (const line of lines) {
          try {
            const dataStr = line.replace(/^data: /, '');
            const data = JSON.parse(dataStr);
            if (data.chunk) {
              fullResponse += data.chunk;
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages[aiMessageIndex]) {
                  newMessages[aiMessageIndex].text = fullResponse;
                  newMessages[aiMessageIndex].journeyId = currentJourneyId;
                }
                return newMessages;
              });
            }
          } catch (e) { /* Ignore */ }
        }
      }
    } catch (error) {
      console.error("Streaming failed:", error);
      setMessages(prev => {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].text === '') {
          updated[updated.length - 1].text = "Sorry, I'm having trouble connecting.";
        }
        return updated;
      });
    } finally {
      setIsAiLoading(false);
      const match = fullResponse.match(/\[FETCH_JOURNEY_FOR_DATE:(.*?)\]/);
      if (match && match[1]) {
        const date = match[1];
        setMessages(prev => prev.slice(0, -1));
        fetchAndStoreJourney(date, true);
      }
    }
  };

  useEffect(() => {
    if (id) setLoading(true);
    API.get(`/api/pyqs/${id}`).then(res => setPyq(res.data)).catch(err => console.error(err)).finally(() => setLoading(false));
  }, [id]);

  const handleLoadProgress = ({ loaded, total }: { loaded: number; total: number }) => setLoadProgress((loaded / total) * 100);
  const onDocumentLoadSuccess = async (pdf: PDFDocumentProxy) => {
    setLoadProgress(null);
    setNumPages(pdf.numPages);
    const firstPage = await pdf.getPage(1);
    setUnscaledPageWidth(firstPage.getViewport({ scale: 1 }).width);
  };

  const preventAutoHide = useCallback(() => {
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current);
    autoHideDisabled.current = true;
    setIsHeaderVisible(true);
    interactionTimeoutRef.current = window.setTimeout(() => { autoHideDisabled.current = false; }, 2000);
  }, []);

  const fitWidth = useCallback(() => {
    preventAutoHide();
    if (unscaledPageWidth && pdfContainerRef.current) {
      const perfectScale = pdfContainerRef.current.clientWidth / unscaledPageWidth;
      setScale(perfectScale * 0.98);
    }
  }, [unscaledPageWidth, preventAutoHide]);

  useEffect(() => {
    if (unscaledPageWidth) {
      fitWidth();
      window.addEventListener('resize', fitWidth);
      return () => window.removeEventListener('resize', fitWidth);
    }
  }, [unscaledPageWidth, fitWidth]);

  useEffect(() => { setPageInput(String(currentPage)); }, [currentPage]);
  const handleZoomIn = () => { preventAutoHide(); setScale(prev => prev + 0.1); };
  const handleZoomOut = () => { preventAutoHide(); setScale(prev => Math.max(0.2, prev - 0.1)); };
  const handleRotate = () => { preventAutoHide(); setRotation(prev => (prev + 90) % 360); };
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

  const updateCustomScrollbarPosition = useCallback(() => {
    const container = pdfContainerRef.current;
    const track = trackRef.current;
    if (container && track && numPages > 0) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const trackHeight = track.clientHeight;
      const maxScrollTop = scrollHeight - clientHeight;
      if (maxScrollTop === 0) {
        y.set(0);
        setShowCustomScrollbar(false);
        return;
      }
      const scrollProgress = scrollTop / maxScrollTop;
      const maxThumbY = trackHeight - THUMB_HEIGHT;
      y.set(scrollProgress * maxThumbY);
      setShowCustomScrollbar(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = window.setTimeout(() => {
        if (!isDragging) {
          setShowCustomScrollbar(false);
        }
      }, 1500);
    }
  }, [y, numPages, isDragging]);

  useEffect(() => {
    const container = pdfContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateCustomScrollbarPosition);
      updateCustomScrollbarPosition();
      return () => {
        container.removeEventListener('scroll', updateCustomScrollbarPosition);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      };
    }
  }, [updateCustomScrollbarPosition]);

  if (loading) return <PdfViewerSkeleton />;

  return (
    <div className="h-screen w-full bg-slate-800 flex flex-col md:flex-row">
      {loadProgress !== null && (<div className="absolute top-0 left-0 w-full h-1 bg-slate-600 z-50"><div className="h-1 bg-cyan-400" style={{ width: `${loadProgress}%`, transition: 'width 0.2s ease-out', }} /></div>)}
      <div ref={pdfViewContainerRef} className="relative w-full md:w-3/5 h-full">
        <motion.header animate={{ y: (isMobile && !isHeaderVisible) ? "-100%" : 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="absolute top-0 left-0 right-0 z-30 bg-neutral-950/80 backdrop-blur-sm shadow-md">
          <div className="py-1 flex justify-between items-center px-2 sm:px-4">
            <button onClick={() => navigate(-1)} className="p-1 sm:p-2 rounded-full hover:bg-black/20" title="Go Back"><ArrowLeftIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" /></button>
            <span className="font-bold text-cyan-400 text-sm sm:text-base ml-2">{pyq?.year}</span>
            <div className="flex items-center justify-center gap-1 sm:gap-2 text-white flex-grow">
              <form onSubmit={handleGoToPage} className="flex items-center gap-1">
                <input type="number" value={pageInput} onChange={(e) => setPageInput(e.target.value)} onClick={preventAutoHide} onFocus={(e) => e.target.select()} className="w-10 text-center bg-slate-700 rounded border border-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm py-0.5" />
                <span className="text-slate-400 text-sm">/ {numPages}</span>
              </form>
              <span className="h-5 w-px bg-slate-700 mx-1"></span>
              <button onClick={handleZoomOut} className="p-2 hover:bg-slate-700 rounded-md max-[272px]:hidden" title="Zoom Out"><MagnifyingGlassMinusIcon className="h-4 w-4 sm:h-5 sm:w-5" /></button>
              <span className="w-12 text-center text-xs sm:text-sm tabular-nums max-[272px]:hidden">{`${Math.round(scale * 100)}%`}</span>
              <button onClick={handleZoomIn} className="p-2 hover:bg-slate-700 rounded-md max-[272px]:hidden" title="Zoom In"><MagnifyingGlassPlusIcon className="h-4 w-4 sm:h-5 sm:w-5" /></button>
              <span className="h-5 w-px bg-slate-700 mx-1 max-[340px]:hidden"></span>
              <button onClick={fitWidth} className="p-2 hover:bg-slate-700 rounded-md max-[340px]:hidden" title="Fit to Width">
                <ArrowsPointingOutIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button onClick={handleRotate} className="p-2 hover:bg-slate-700 rounded-md max-[358px]:hidden" title="Rotate">
                <ArrowPathIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <div className="w-5 sm:w-6"></div> 
          </div>
        </motion.header>
        <main className={`relative h-full flex flex-col bg-slate-100 transition-all duration-300 ${isHeaderVisible ? 'pt-10' : 'pt-0'}`}>
          <Document file={pyq?.fileUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadProgress={handleLoadProgress} onLoadError={console.error} loading={<PdfPageSkeleton />} className="flex-1 overflow-hidden">
            {numPages > 0 && (<Virtuoso ref={virtuosoRef} overscan={overscanValue} totalCount={numPages} scrollerRef={(ref) => { if (ref) { (pdfContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = ref as HTMLDivElement; } }} className="custom-scrollbar" rangeChanged={range => setCurrentPage(range.startIndex + 1)} itemContent={index => (<div className="flex justify-center py-2 md:py-4"><div className="shadow-lg bg-white" style={{ width: 595 * scale, height: 842 * scale }}><Page pageNumber={index + 1} scale={scale} rotate={rotation} loading={<div style={{ width: 595 * scale, height: 842 * scale }} className="bg-slate-200 animate-pulse rounded-md" />} /></div></div>)} />)}
          </Document>
        </main>
        <AnimatePresence>{isMobile && showCustomScrollbar && (<motion.div ref={trackRef} className="absolute top-0 right-0 h-full w-10 z-20 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}><motion.div drag="y" dragConstraints={trackRef} dragElastic={0} dragMomentum={false} onDragStart={() => setIsDragging(true)} onDragEnd={() => setIsDragging(false)} onDrag={(event, info) => { const container = pdfContainerRef.current; const track = trackRef.current; if (container && track) { const maxThumbY = track.clientHeight - THUMB_HEIGHT; const progress = info.offset.y / maxThumbY; const maxScrollTop = container.scrollHeight - container.clientHeight; container.scrollTop = progress * maxScrollTop; } }} style={{ y, height: THUMB_HEIGHT }} className="w-16 bg-slate-800/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-xs shadow-lg cursor-grab active:cursor-grabbing pointer-events-auto -ml-3">{currentPage} / {numPages}</motion.div></motion.div>)}</AnimatePresence>
      </div>
      {isMobile ? (
        <Drawer.Root modal={false} open={activeSnapPoint !== null} onOpenChange={(open) => setActiveSnapPoint(open ? 1 : null)} snapPoints={snapPoints} activeSnapPoint={activeSnapPoint} setActiveSnapPoint={setActiveSnapPoint}>
          <button onClick={handleOpenDrawer} className="fixed bottom-6 right-6 bg-cyan-600 text-white p-4 rounded-full shadow-lg z-20 hover:bg-cyan-700 transition-transform hover:scale-110" title="Chat"><ChatBubbleOvalLeftEllipsisIcon className="h-7 w-7" /></button>
          <Drawer.Portal>
            <Drawer.Content className="fixed bottom-0 left-0 right-0 flex flex-col rounded-t-2xl bg-neutral-950/90 backdrop-blur-md z-40 border-t border-slate-700 h-full">
              <div className="mx-auto my-3 h-1.5 w-12 flex-shrink-0 rounded-full bg-slate-500" />
              <VisuallyHidden><Drawer.Title>AI Assistant Chat</Drawer.Title><Drawer.Description>Chat with the AI assistant to ask questions about the document.</Drawer.Description></VisuallyHidden>
              {id && <ChatInterface documentId={id} isMobileLayout={true} messages={filteredMessages} isLoading={isAiLoading} onSendMessage={handleSendMessage} journeys={journeys} activeJourneyId={activeJourneyId} setActiveJourneyId={setActiveJourneyId} isCompleted={isCompleted} setIsCompleted={setIsCompleted} answeredIds={answeredIds} setAnsweredIds={setAnsweredIds} initialLoading={initialLoading} activeSnapPoint={activeSnapPoint} smallSnapPoint={smallSnapPoint} setScrollToIndex={setScrollToIndex} chatScrollRef={chatScrollRef} handleCloseDrawer={handleCloseDrawer} />}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      ) : (
        <aside className="w-2/5 h-full bg-neutral-950">
          {id && <ChatInterface documentId={id} isMobileLayout={false} messages={filteredMessages} isLoading={isAiLoading} onSendMessage={handleSendMessage} journeys={journeys} activeJourneyId={activeJourneyId} setActiveJourneyId={setActiveJourneyId} isCompleted={isCompleted} setIsCompleted={setIsCompleted} answeredIds={answeredIds} setAnsweredIds={setAnsweredIds} initialLoading={initialLoading} setScrollToIndex={setScrollToIndex} chatScrollRef={chatScrollRef} handleCloseDrawer={handleCloseDrawer} />}
        </aside>
      )}
    </div>
  );
};
export default PdfViewerPage;