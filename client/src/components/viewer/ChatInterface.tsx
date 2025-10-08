// File: src/components/viewer/ChatInterface.tsx

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Drawer } from 'vaul';
import { PaperAirplaneIcon, XMarkIcon, ClipboardDocumentIcon, CheckIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import TextareaAutosize from 'react-textarea-autosize';
import Logo from '../Logo';
import type { Suggestion } from '@/api';

const LazyReactMarkdown = lazy(() => import('react-markdown'));

const CONGRATULATIONS_STATE = {
  message: "Congratulations! You've completed today's learning journey. Keep this momentum going!",
  suggestions: [
    { _id: 'fallback1', questionText: 'How can I improve my answer writing skills?', originalIndex: 0, isPYQ: false },
    { _id: 'fallback2', questionText: 'What is an effective revision strategy?', originalIndex: 0, isPYQ: false }
  ]
};

// Message structure from parent
export interface Message {
  sender: 'user' | 'ai';
  text: string;
  historicalJourney?: Suggestion[];
  journeyId: string | null;
}

// Props for the main exported component.
interface ChatInterfaceProps {
  documentId: string;
  isMobileLayout: boolean;
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string, isAiMessage?: boolean) => void;
  journeys: Record<string, Suggestion[]>;
  activeJourneyId: string | null;
  setActiveJourneyId: (id: string | null) => void;
  isCompleted: boolean;
  setIsCompleted: (isCompleted: boolean) => void;
  answeredIds: Set<string>;
  setAnsweredIds: (ids: Set<string>) => void;
  initialLoading: boolean;
  setScrollToIndex: (index: number | null) => void;
  chatScrollRef: React.RefObject<HTMLDivElement>;
  activeSnapPoint?: number | string | null;
  smallSnapPoint?: number | string | null;
  // FIX: Add handleCloseDrawer prop
  handleCloseDrawer: () => void;
}

interface SharedChatUIProps extends ChatInterfaceProps {
  isMobile: boolean;
}

const SharedChatUI: React.FC<SharedChatUIProps> = (props) => {
  const {
    isMobile, messages, isLoading, onSendMessage,
    journeys, activeJourneyId, setActiveJourneyId,
    isCompleted, setIsCompleted, answeredIds, setAnsweredIds,
    initialLoading,
    setScrollToIndex,
    chatScrollRef,
    // FIX: Destructure handleCloseDrawer
    handleCloseDrawer
  } = props;

  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to get the full list for the current journey (ALL 10 questions)
  const activeQuestions: Suggestion[] = activeJourneyId ? journeys[activeJourneyId] || [] : [];

  // Effect to check for completion status
  useEffect(() => {
    if (!activeJourneyId) {
      setIsCompleted(false);
      return;
    }
    const currentQuestions = journeys[activeJourneyId] || [];
    const answeredCount = currentQuestions.filter(q => answeredIds.has(q._id)).length;
    const allQuestionsAnswered = currentQuestions.length > 0 && answeredCount === currentQuestions.length;
    setIsCompleted(allQuestionsAnswered);
  }, [activeJourneyId, answeredIds, journeys, setIsCompleted]);

  useEffect(() => {
    // Scroll to bottom when messages increase
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleJourneyChange = (newJourneyId: string) => {
    // If empty string is selected, set to null to clear questions/chat filter
    const nextJourneyId = newJourneyId === '' ? null : newJourneyId;
    setActiveJourneyId(nextJourneyId);

    // Smooth scroll to the bottom of the current view (or suggestions if new)
    if (messages.length === 0 && nextJourneyId) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const handleSuggestionClick = (clickedSuggestion: Suggestion) => {
    const fullQuestionText = `${clickedSuggestion.originalIndex}. ${clickedSuggestion.questionText}`;
    const isAnswered = answeredIds.has(clickedSuggestion._id);

    if (isAnswered) {
      // Find the index of the user's message in the *filtered* messages list
      const questionMessageIndex = messages.findIndex(
        (msg) => msg.sender === 'user' && msg.text.trim() === fullQuestionText
      );

      if (questionMessageIndex !== -1) {
        // Trigger scrolling to the user's question message
        setScrollToIndex(questionMessageIndex);
      }
      return;
    }

    // New answer logic: send question to AI
    onSendMessage(fullQuestionText);
    const newAnsweredIds = new Set(answeredIds).add(clickedSuggestion._id);
    setAnsweredIds(newAnsweredIds);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(input);
    setInput('');
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const JourneyDropdown = () => (
    <div className="relative w-full">
      <select
        id="journey-select"
        value={activeJourneyId || ''}
        onChange={(e) => handleJourneyChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-cyan-500 bg-slate-700 pl-3 pr-8 py-1.5 text-sm font-bold text-white shadow-lg cursor-pointer transition-colors focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
      >
        <option value="" className="text-slate-400 bg-slate-800 font-semibold">Select a Learning Journey</option>

        {Object.keys(journeys).sort((a, b) => {
          // Sort by 'today' first, then descending by date
          if (a === 'today') return -1;
          if (b === 'today') return 1;
          return b.localeCompare(a);
        }).map(journeyId => (
          <option key={journeyId} value={journeyId} className="bg-slate-800 text-white font-semibold">
            {journeyId === 'today' ? "Today's Journey" : `Journey for ${journeyId}`}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-300">
        <ChevronDownIcon className="h-4 w-4" />
      </div>
    </div>
  );

  const renderSuggestions = () => {
    if (initialLoading && Object.keys(journeys).length === 0) {
      return <p className="text-slate-400 text-sm animate-pulse">Building today's learning journey...</p>;
    }

    // Hide questions if no journey is active
    if (!activeJourneyId) return null;

    // Show fallback suggestions if the journey is completed
    if (isCompleted) {
      return (
        // Fix for Suggestions shrinking - Case 1: Completed State
        <div className='w-full flex-shrink-0'>
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
      // Fix for Suggestions shrinking - Case 2: Active Journey State
      <div className="w-full flex-shrink-0">
        <div className="flex flex-col gap-2">
          {activeQuestions.map((q) => {
            const isAnswered = answeredIds.has(q._id);
            return (
              <button
                key={q._id}
                onClick={() => handleSuggestionClick(q)}
                disabled={isLoading}
                className={`w-full rounded-lg p-3 text-sm text-left transition-colors ${isAnswered ? 'bg-slate-800/80 hover:bg-slate-800/90' : 'bg-slate-800 hover:bg-slate-700/50'}`}
              >
                <span className={`font-semibold mr-2 ${isAnswered ? 'text-slate-500' : (q.isPYQ ? 'text-amber-400' : 'text-cyan-400')}`}>{q.originalIndex}.</span>
                <span className={`${isAnswered ? 'text-slate-500' : 'text-white'}`}>{q.questionText}</span>
              </button>
            );
          })}
        </div>
        {messages.length > 0 && <p className="mt-4 text-slate-400 text-sm">Scroll down to view chat history or select a question from above to begin a new discussion.</p>}

        {!activeJourneyId && (
          <p className="mt-4 text-slate-400 text-sm">Select a learning journey from the dropdown above to view curated questions.</p>
        )}
      </div>
    );
  };

  return (
    // 1. OUTER CONTAINER FIX: Use Flex Column and h-full (h-full is inherited from Drawer.Content)
    <div className={`relative flex-1 h-full flex flex-col bg-transparent`}>
      
      {/* 2. HEADER FIX: Use flex-shrink-0 to ensure it never shrinks */}
      <header className={`sticky top-0 z-20 border-b border-slate-700 flex items-center justify-between px-4 py-3 bg-neutral-950 flex-shrink-0`}>
        {/* AI Assistant Header with Permanent Gradient and Conditional Pulse */}
        <h2 className={`text-base font-semibold flex-shrink-0 ai-default-gradient 
            ${isLoading || initialLoading ? 'ai-pulse' : ''}`}
        >
          AI Assistant
        </h2>

        {!initialLoading && Object.keys(journeys).length > 0 && (
          <div className="flex-grow flex justify-end max-w-[200px] sm:max-w-xs mx-3">
            <JourneyDropdown />
          </div>
        )}

        {/* Use custom handler for closing the drawer */}
        {isMobile && (<button onClick={handleCloseDrawer} aria-label="Close chat" className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 ml-auto"><XMarkIcon className="h-5 w-5" /></button>)}
      </header>

      {/* 3. MAIN AREA FIX: h-0 is the key for shrinkability. */}
      <main ref={chatScrollRef} className={`flex-grow h-0 overflow-y-auto space-y-6 p-4 custom-scroll-smooth`}>
        {messages.length === 0 ? (
          // Welcome Block must have flex-shrink-0 to allow main to shrink
          <div className='relative flex-shrink-0'> 
            <div className="flex items-start mb-4 chat-message-container">
              <div className="flex-shrink-0 mr-3">
                <div className="bg-slate-800 p-2 rounded-full relative">
                  <Logo isSmall={true} />
                  {initialLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {/* Removed old animation ring */}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl rounded-tl-none p-3 max-w-full flex-grow">
                <p className="font-semibold  bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400  text-base ">Welcome! </p>
                <p className="font-semibold  bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400  text-base">Hint: Ask me anything about Rohit's profile or general knowledge</p>
                <p className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 text-base">Hint: Ask "ques 5 oct 2025" - today any date  </p>

              </div>
            </div>

            {activeJourneyId && renderSuggestions()}
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isStreaming = isLoading && msg.sender === 'ai' && index === messages.length - 1;
              const isUser = msg.sender === 'user';

              return (
                // FIX: Ensure every chat message block is shrinkable
                <div key={index} className={`chat-message-container min-h-0 flex-shrink ${isUser ? 'flex justify-end' : 'flex justify-start'}`}>
                  <div className={`flex flex-col max-w-full min-h-0 flex-shrink`}>
                    {/* 1. Profile/Icon Row (Top) */}
                    <div className={`flex items-center mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-2 rounded-full flex-shrink-0 ${isUser ? 'bg-cyan-600' : 'bg-slate-700'} ${isUser ? 'order-2 ml-2' : 'order-1 mr-2'}`}>
                        {isUser ? (
                          <span className="font-bold text-white text-sm h-6 w-6 flex items-center justify-center">You</span>
                        ) : (
                          <div className="relative">
                            <Logo isSmall={true} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. Message Content Row (Full Width Below Icon) */}
                    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`group relative p-3 rounded-xl max-w-full text-white ${isUser ? 'bg-cyan-700 rounded-br-none' : 'bg-slate-800 rounded-bl-none'}`}>
                        <div className="prose prose-invert prose-p:my-2 prose-headings:my-2 prose-ul:my-2">
                          <Suspense fallback={<p>{msg.text}</p>}>
                            <LazyReactMarkdown>{msg.text}</LazyReactMarkdown>
                          </Suspense>

                          {/* CURSOR FIX: Append cursor after markdown is rendered */}
                          {isStreaming && <span className="blinking-cursor"></span>}
                        </div>

                        {msg.sender === 'ai' && !isLoading && msg.text && (
                          <button onClick={() => handleCopy(msg.text, index)} className="absolute -top-2 -right-2 bg-slate-600 p-1 rounded-full opacity-0 group-hover:opacity-100">
                            {copiedIndex === index ? <CheckIcon className="h-4 w-4 text-green-400" /> : <ClipboardDocumentIcon className="h-4 w-4 text-white" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Suggestions Wrapper Fix */}
            {!isLoading && activeJourneyId && <div className="pt-4 flex-shrink-0">{renderSuggestions()}</div>}
          </>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* 4. FOOTER FIX: Use flex-shrink-0 to ensure it never shrinks */}
      <footer className="p-2 flex-shrink-0">
        <form onSubmit={handleFormSubmit} className="flex items-start gap-2 border border-slate-700 bg-slate-800 rounded-xl p-2 focus-within:ring-2 focus-within:ring-cyan-500">
          <TextareaAutosize value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFormSubmit(e); } }} placeholder="Ask me anything..." className="flex-1 bg-transparent resize-none text-white max-h-40 focus:outline-none" maxRows={6} />
          <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 p-2 rounded-full disabled:bg-slate-600" disabled={isLoading || !input.trim()}><PaperAirplaneIcon className="h-5 w-5 text-white" /></button>
        </form>
      </footer>
    </div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = (props) => {
  if (props.isMobileLayout) {
    return <SharedChatUI {...props} isMobile={true} />;
  }
  return (
    <div className="relative h-full w-full border-l border-slate-700 flex flex-col">
      <SharedChatUI {...props} isMobile={false} />
    </div>
  );
};

export default ChatInterface;