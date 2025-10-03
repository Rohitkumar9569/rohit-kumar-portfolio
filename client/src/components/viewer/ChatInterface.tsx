// File: src/components/viewer/ChatInterface.tsx

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Drawer } from 'vaul';
import { PaperAirplaneIcon, XMarkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/solid';
import TextareaAutosize from 'react-textarea-autosize';
import { useQuery } from '@tanstack/react-query';

import Logo from '../Logo';
import { fetchDailyJourney } from '@/api';
import type { JourneyApiResponse, Suggestion } from '@/api';

const LazyReactMarkdown = lazy(() => import('react-markdown'));

const CONGRATULATIONS_STATE = {
  message: "Congratulations! You've completed today's learning journey. Keep this momentum going!",
  suggestions: [
    { _id: 'fallback1', questionText: 'How can I improve my answer writing skills?', originalIndex: 0, isPYQ: false },
    { _id: 'fallback2', questionText: 'What is an effective revision strategy?', originalIndex: 0, isPYQ: false }
  ]
};

interface Message { sender: 'user' | 'ai'; text: string; }

// --- UPDATED: Props to receive state from parent ---
interface ChatInterfaceProps {
  documentId: string;
  isMobileLayout: boolean;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  activeSnapPoint?: number | string | null;
  smallSnapPoint?: number | string | null;
}

// --- UPDATED: Props for the UI component ---
interface SharedChatUIProps {
  documentId: string;
  isMobile: boolean;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  activeSnapPoint?: number | string | null;
  smallSnapPoint?: number | string | null;
}

const SharedChatUI: React.FC<SharedChatUIProps> = ({ documentId, isMobile, messages, isLoading, onSendMessage, activeSnapPoint, smallSnapPoint }) => {
  // --- REMOVED: Internal state for messages and loading. It now comes from props. ---
  // const [messages, setMessages] = useState<Message[]>([]);
  // const [isLoading, setIsLoading] = useState(false);

  // Internal state for UI remains here
  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Journey-related state remains here as it's specific to this UI
  const [masterJourney, setMasterJourney] = useState<Suggestion[]>([]);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const [currentSuggestions, setCurrentSuggestions] = useState<Suggestion[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  // This logic is unchanged
  const { data: journeyData, isLoading: initialLoading } = useQuery<JourneyApiResponse>({
    queryKey: ['dailyJourney'],
    queryFn: fetchDailyJourney,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  // This logic is unchanged
  useEffect(() => {
    if (journeyData && !journeyData.isExhausted && journeyData.journey) {
      const flatJourney = journeyData.journey.flatMap((pair, pairIndex) => ([
        { _id: pair.ca_question, questionText: pair.ca_question, originalIndex: pairIndex * 2 + 1, isPYQ: false },
        { _id: pair.related_pyq, questionText: pair.related_pyq, originalIndex: pairIndex * 2 + 2, isPYQ: true },
      ]));
      setMasterJourney(flatJourney);
      setCurrentSuggestions(flatJourney.slice(0, 5));
    } else if (journeyData && journeyData.isExhausted) {
      setIsCompleted(true);
    }
  }, [journeyData]);

  // --- NO CHANGE: Scroll behavior is kept exactly as it was, as you requested ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSuggestionClick = (clickedSuggestion: Suggestion) => {
    const fullQuestionText = `${clickedSuggestion.originalIndex}. ${clickedSuggestion.questionText}`;
    onSendMessage(fullQuestionText); // UPDATED: Use onSendMessage from props
    const newAnsweredIds = new Set(answeredIds).add(clickedSuggestion._id);
    setAnsweredIds(newAnsweredIds);

    // ... rest of the journey logic is unchanged
    let prioritySuggestion: Suggestion | undefined = undefined;
    const pairIndex = Math.floor((clickedSuggestion.originalIndex - 1) / 2);
    const pair = masterJourney.slice(pairIndex * 2, pairIndex * 2 + 2);
    const partner = pair.find(s => s._id !== clickedSuggestion._id);
    if (partner && !newAnsweredIds.has(partner._id)) {
      prioritySuggestion = partner;
    }
    const availablePool = masterJourney.filter(s => !newAnsweredIds.has(s._id));
    let nextSuggestions: Suggestion[] = [];
    if (prioritySuggestion) {
      nextSuggestions.push(prioritySuggestion);
      nextSuggestions.push(...availablePool.filter(s => s._id !== prioritySuggestion!._id));
    } else {
      nextSuggestions.push(...availablePool);
    }
    const finalNextSuggestions = nextSuggestions.slice(0, 5);
    setCurrentSuggestions(finalNextSuggestions);
    if (finalNextSuggestions.length === 0) {
      setIsCompleted(true);
    }
  };

  // --- REMOVED: The entire handleSendMessage function is gone from here ---
  // It now lives in the parent component (PdfViewerPage.tsx)

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(input); // UPDATED: Use onSendMessage from props
    setInput('');
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderSuggestions = () => {
    if (initialLoading) {
      return <p className="text-slate-400 text-sm animate-pulse">Building today's learning journey...</p>;
    }
    if (isCompleted) {
      return (
        <div className='w-full'>
          <p className="text-slate-300 text-sm mb-2">{CONGRATULATIONS_STATE.message}</p>
          <div className="flex flex-wrap gap-2">
            {CONGRATULATIONS_STATE.suggestions.map((q) => (
              <button key={q._id} onClick={() => onSendMessage(q.questionText)} className="bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors px-3 py-1 text-sm">{q.questionText}</button>
            ))}
          </div>
        </div>
      )
    }
    return (
      <div className="flex flex-wrap gap-2">
        {currentSuggestions.map((q) => (
          <button
            key={q._id}
            onClick={() => handleSuggestionClick(q)}
            className="bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors px-3 py-1 text-sm text-left"
          >
            <span className={`font-semibold mr-2 ${q.isPYQ ? 'text-amber-400' : 'text-cyan-400'}`}>{q.originalIndex}.</span>
            {q.questionText}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={`relative flex-1 h-full grid grid-rows-[auto_1fr_auto] bg-transparent min-h-0`}>
      <header className={`relative border-b border-slate-700 flex items-center px-4 py-3`}>
        <h2 className="text-base font-semibold text-white">AI Assistant</h2>
        {isMobile && (<Drawer.Close asChild className='ml-auto'><button aria-label="Close chat" className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700"><XMarkIcon className="h-5 w-5" /></button></Drawer.Close>)}
      </header>
      <main className={`overflow-y-auto space-y-6 min-h-0 p-4`}>
        {messages.length === 0 ? (
          <div>
            <div className="flex items-center gap-3 mb-4"><div className="bg-slate-800 p-2 rounded-full"><Logo isSmall={true} /></div><div className="bg-slate-800 rounded-xl rounded-bl-none w-fit p-3"><p className="text-white text-base">Hello! How can I assist you today?</p></div></div>
            {renderSuggestions()}
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isStreaming = isLoading && msg.sender === 'ai' && index === messages.length - 1;
              return (
                <div key={index}>
                  {msg.sender === 'user' ? (
                    // User ke message ke liye layout (jaisa pehle tha)
                    <div className="flex items-start gap-3 flex-row-reverse">
                      <div className="p-2 rounded-full flex-shrink-0 bg-cyan-600">
                        <span className="font-bold text-white text-sm h-6 w-6 flex items-center justify-center">You</span>
                      </div>
                      <div className="group relative p-3 rounded-xl max-w-md text-white bg-cyan-700 rounded-br-none">
                        <div className={`prose prose-invert prose-p:my-2 prose-headings:my-2 prose-ul:my-2`}>
                          <Suspense fallback={<p>{msg.text}</p>}>
                            <LazyReactMarkdown>{msg.text}</LazyReactMarkdown>
                          </Suspense>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // AI ke message ke liye naya layout (logo upar, bubble neeche)
                    <div className="flex flex-col items-start gap-2">
                      <div className="p-2 rounded-full flex-shrink-0 bg-slate-700">
                        <Logo isSmall={true} />
                      </div>
                      <div className="group relative p-3 rounded-xl w-full max-w-xl text-white bg-slate-800 rounded-bl-none">
                        <div className={`prose prose-invert prose-p:my-2 prose-headings:my-2 prose-ul:my-2 ${isStreaming ? 'blinking-cursor' : ''}`}>
                          <Suspense fallback={<p>{msg.text}</p>}>
                            <LazyReactMarkdown>{msg.text}</LazyReactMarkdown>
                          </Suspense>
                        </div>
                        {msg.sender === 'ai' && !isLoading && msg.text && (<button onClick={() => handleCopy(msg.text, index)} className="absolute -top-2 -right-2 bg-slate-600 p-1 rounded-full opacity-0 group-hover:opacity-100">{copiedIndex === index ? <CheckIcon className="h-4 w-4 text-green-400" /> : <ClipboardDocumentIcon className="h-4 w-4 text-white" />}</button>)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {!isLoading && (
              <div className="pt-4">{renderSuggestions()}</div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </main>
      <footer className="p-2">
        <form onSubmit={handleFormSubmit} className="flex items-start gap-2 border border-slate-700 bg-slate-800 rounded-xl p-2 focus-within:ring-2 focus-within:ring-cyan-500">
          <TextareaAutosize value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFormSubmit(e); } }} placeholder="Ask me anything..." className="flex-1 bg-transparent resize-none text-white max-h-40 focus:outline-none" maxRows={6} />
          <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 p-2 rounded-full disabled:bg-slate-600" disabled={isLoading || !input.trim()}><PaperAirplaneIcon className="h-5 w-5 text-white" /></button>
        </form>
      </footer>
    </div>
  );
};

// --- UPDATED: Main component now passes all props down ---
export const ChatInterface: React.FC<ChatInterfaceProps> = ({ documentId, isMobileLayout, messages, isLoading, onSendMessage, activeSnapPoint, smallSnapPoint }) => {
  if (isMobileLayout) {
    return <SharedChatUI
      documentId={documentId}
      isMobile={true}
      messages={messages}
      isLoading={isLoading}
      onSendMessage={onSendMessage}
      activeSnapPoint={activeSnapPoint}
      smallSnapPoint={smallSnapPoint}
    />;
  }
  return (
    <div className="relative h-full w-full border-l border-slate-700 flex flex-col">
      <SharedChatUI
        documentId={documentId}
        isMobile={false}
        messages={messages}
        isLoading={isLoading}
        onSendMessage={onSendMessage}
      />
    </div>
  );
};

export default ChatInterface;