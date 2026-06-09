// File: src/components/GlobalAIChatWidget.tsx

import { useState, useRef, useEffect } from 'react';
import { ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/solid';
import ChatInterface from './viewer/ChatInterface';
import { API_BASE_URL, type Suggestion } from '../api';

// Message Interface
interface Message {
  sender: 'user' | 'ai';
  text: string;
  historicalJourney?: Suggestion[];
  journeyId: string | null;
}

const EMPTY_JOURNEYS: Record<string, Suggestion[]> = {};

const GlobalAIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  // --- CHAT STATE ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const journeys = EMPTY_JOURNEYS;
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [initialLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // --- BODY SCROLL LOCK FIX ---
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (!isOpen) {
      body.style.removeProperty('overflow');
      body.style.removeProperty('overscroll-behavior');
      root.style.removeProperty('overflow');
      root.style.removeProperty('overscroll-behavior');
      body.classList.remove('sarathi-scroll-locked');
      root.classList.remove('sarathi-scroll-locked');
      return undefined;
    }

    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousRootOverflow = root.style.overflow;
    const previousRootOverscroll = root.style.overscrollBehavior;

    body.style.setProperty('overflow', 'hidden');
    body.style.setProperty('overscroll-behavior', 'none');
    root.style.setProperty('overflow', 'hidden');
    root.style.setProperty('overscroll-behavior', 'none');
    body.classList.add('sarathi-scroll-locked');
    root.classList.add('sarathi-scroll-locked');

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      root.style.overflow = previousRootOverflow;
      root.style.overscrollBehavior = previousRootOverscroll;
      body.classList.remove('sarathi-scroll-locked');
      root.classList.remove('sarathi-scroll-locked');
    };
  }, [isOpen]);

  // --- FILTER MESSAGES ---
  const filteredMessages = messages;

  const handleSendMessage = async (text: string, isAiMessage: boolean = false) => {
    if (!text.trim() || isAiLoading) return;
    const currentJourneyId = null;
    
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
      const response = await fetch(`${API_BASE_URL}/api/pyqs/chat/stream`, {
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
    }
  };

  const handleOpenDrawer = () => setIsOpen(true);
  const handleCloseDrawer = () => setIsOpen(false);

  return (
    <>
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] right-4 z-[100] flex items-center justify-center group md:bottom-8 md:right-8">
        <div className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-20 transition-opacity duration-300 group-hover:opacity-35" />
        <button 
          onClick={handleOpenDrawer}
          className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-slate-950 text-cyan-100 shadow-[0_18px_46px_rgba(2,6,23,0.42)] ring-1 ring-cyan-200/15 transition-transform duration-300 ease-out hover:scale-105 hover:border-cyan-200/35 hover:text-white hover:shadow-[0_22px_58px_rgba(34,211,238,0.22)] focus:outline-none focus:ring-4 focus:ring-cyan-400/20 md:h-16 md:w-16"
          title="Ask Sarathi"
        >
          <ChatBubbleBottomCenterTextIcon className="h-7 w-7 md:h-8 md:w-8" />
        </button>
      </div>

      {isOpen && (
        <>
          <button
            type="button"
            aria-label="Close Sarathi chat overlay"
            onClick={handleCloseDrawer}
            className="fixed inset-0 z-[140] bg-slate-950/34 backdrop-blur-sm md:bg-transparent md:backdrop-blur-0"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Sarathi Chat"
            className="sarathi-chat-panel fixed inset-x-0 bottom-0 z-[150] flex max-h-[100dvh] min-h-[100dvh] flex-col overflow-hidden rounded-t-[1.35rem] border-t border-slate-200/80 bg-white pb-[env(safe-area-inset-bottom)] text-slate-950 shadow-[-10px_0_44px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/5 transition-all duration-300 ease-out dark:border-white/12 dark:bg-slate-950 dark:text-white dark:shadow-[-10px_0_44px_rgba(2,6,23,0.55)] dark:ring-white/10 md:inset-y-4 md:left-auto md:right-4 md:bottom-auto md:h-auto md:max-h-none md:min-h-0 md:w-[min(560px,calc(100vw-2rem))] md:rounded-[1.65rem] md:border md:pb-0 md:shadow-[0_30px_86px_rgba(15,23,42,0.20)] dark:md:border-white/12 dark:md:shadow-[0_30px_86px_rgba(2,6,23,0.58)] lg:w-[min(620px,calc(100vw-2rem))] xl:w-[min(680px,calc(100vw-2rem))]"
          >
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent" />
            <span className="mx-auto my-3 h-1.5 w-12 flex-shrink-0 rounded-full bg-white/30 md:hidden" />
            <ChatInterface
              documentId="global"
              isMobileLayout={true}
              messages={filteredMessages}
              isLoading={isAiLoading}
              onSendMessage={handleSendMessage}
              journeys={journeys}
              activeJourneyId={activeJourneyId}
              setActiveJourneyId={setActiveJourneyId}
              isCompleted={isCompleted}
              setIsCompleted={setIsCompleted}
              answeredIds={answeredIds}
              setAnsweredIds={setAnsweredIds}
              initialLoading={initialLoading}
              activeSnapPoint={isOpen ? 1 : null}
              smallSnapPoint={0.18}
              chatScrollRef={chatScrollRef}
              handleCloseDrawer={handleCloseDrawer}
            />
          </section>
        </>
      )}
    </>
  );
};

export default GlobalAIChatWidget;
