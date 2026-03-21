// File: src/components/GlobalAIChatWidget.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Drawer } from 'vaul';
import { ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/solid'; // Naya Icon Import
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useQuery } from '@tanstack/react-query';
import ChatInterface from './viewer/ChatInterface';
import { fetchDailyJourney, fetchJourneyByDate } from '../api';
import type { Suggestion, JourneyApiResponse } from '../api';

// Message Interface
interface Message {
  sender: 'user' | 'ai';
  text: string;
  historicalJourney?: Suggestion[];
  journeyId: string | null;
}

// Helper Function
const extractJourneyIdFromQuestion = (text: string, journeys: Record<string, Suggestion[]>) => {
  const sanitizedText = text.split('. ').slice(1).join('. ');
  for (const id in journeys) {
    if (journeys[id].some(s => s.questionText === sanitizedText)) {
      return id;
    }
  }
  return null;
};

const GlobalAIChatWidget = () => {
  // --- DRAWER STATE ---
  const [activeSnapPoint, setActiveSnapPoint] = useState<number | string | null>(null);
  const numberOfSteps = 40;
  const snapPoints = Array.from({ length: numberOfSteps }, (_, i) => parseFloat(((i + 1) / numberOfSteps).toFixed(2)));
  const smallSnapPoint = snapPoints[5];

  // --- CHAT STATE ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [journeys, setJourneys] = useState<Record<string, Suggestion[]>>({});
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [initialLoading, setInitialLoading] = useState(true);
  const [scrollToIndex, setScrollToIndex] = useState<number | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // --- BODY SCROLL LOCK FIX ---
  useEffect(() => {
    if (activeSnapPoint !== null) {
      document.body.style.setProperty('overflow', 'hidden');
    } else {
      document.body.style.removeProperty('overflow');
    }
    return () => document.body.style.removeProperty('overflow');
  }, [activeSnapPoint]);

  // --- FETCH DAILY JOURNEY ---
  const { data: todayJourneyData, isLoading: queryLoading } = useQuery<JourneyApiResponse>({
    queryKey: ['dailyJourney_global'],
    queryFn: fetchDailyJourney,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

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

  // --- FILTER MESSAGES ---
  const filteredMessages = messages.filter(msg => {
    if (messages.length > 0 && messages[0].sender === 'ai' && msg === messages[0] && !activeJourneyId) return true;
    return msg.journeyId === activeJourneyId;
  });

  // --- SCROLL LOGIC ---
  useEffect(() => {
    if (scrollToIndex !== null && chatScrollRef.current) {
      const children = chatScrollRef.current.querySelectorAll('.chat-message-container');
      if (scrollToIndex >= 0 && scrollToIndex < children.length) {
        (children[scrollToIndex] as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setScrollToIndex(null);
    }
  }, [scrollToIndex]);

  // --- API LOGIC ---
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

  const handleOpenDrawer = () => setActiveSnapPoint(1);
  const handleCloseDrawer = () => setActiveSnapPoint(null);

  return (
    <Drawer.Root 
      modal={false} 
      open={activeSnapPoint !== null} 
      onOpenChange={(open) => setActiveSnapPoint(open ? 1 : null)} 
      snapPoints={snapPoints} 
      activeSnapPoint={activeSnapPoint} 
      setActiveSnapPoint={setActiveSnapPoint}
    >
      {/* 1. ATTRACTIVE MODERN FLOATING BUTTON */}
      <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-[100] flex items-center justify-center group">
        
        {/*  Glowing Pulse Animation */}
        <div className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-40 group-hover:opacity-60 transition-opacity duration-300"></div>
        
        {/* Main Attractive Button */}
        <button 
          onClick={handleOpenDrawer}
          className="relative flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/50 transition-transform duration-300 ease-out hover:scale-110 hover:shadow-cyan-400/80 focus:outline-none"
          title="Need help? Let's chat!"
        >
          <ChatBubbleBottomCenterTextIcon className="h-7 w-7 md:h-8 md:w-8 drop-shadow-md" />
        </button>

      </div>

      {/* 2. CHAT DRAWER CONTENT */}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-[140] md:hidden" />
        <Drawer.Content 
          className="fixed bottom-0 left-0 right-0 flex flex-col rounded-t-2xl bg-neutral-950/95 backdrop-blur-xl z-[150] border-t border-slate-700 h-[90vh] md:h-[80vh] md:w-[450px] md:left-auto md:right-6 md:bottom-24 md:rounded-2xl md:border shadow-2xl"
        >
          <div className="mx-auto my-3 h-1.5 w-12 flex-shrink-0 rounded-full bg-slate-500 md:hidden" />
          <VisuallyHidden>
            <Drawer.Title>AI Assistant Chat</Drawer.Title>
            <Drawer.Description>Global chat assistant for Rohit's portfolio.</Drawer.Description>
          </VisuallyHidden>
          
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
            activeSnapPoint={activeSnapPoint} 
            smallSnapPoint={smallSnapPoint} 
            setScrollToIndex={setScrollToIndex} 
            chatScrollRef={chatScrollRef} 
            handleCloseDrawer={handleCloseDrawer} 
          />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default GlobalAIChatWidget;