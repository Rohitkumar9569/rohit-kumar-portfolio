// File: src/components/viewer/ChatInterface.tsx

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { PaperAirplaneIcon, XMarkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/solid';
import TextareaAutosize from 'react-textarea-autosize';
import Logo from '../Logo';
import type { Suggestion } from '@/api';

const LazyReactMarkdown = lazy(() => import('react-markdown'));

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
    initialLoading,
    chatScrollRef,
    // FIX: Destructure handleCloseDrawer
    handleCloseDrawer
  } = props;

  const [input, setInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasConversation = messages.length > 0;
  const starterPrompts = [
    {
      label: 'Rohit profile',
      prompt: 'Give me a concise premium summary of Rohit Kumar profile.',
    },
    {
      label: 'Study Hub',
      prompt: 'Explain Study Hub features and how a student should use it.',
    },
    {
      label: 'Projects',
      prompt: 'Show Rohit Kumar best portfolio projects and what makes them strong.',
    },
    {
      label: 'Skills',
      prompt: 'Summarize Rohit Kumar technical skills and strengths.',
    },
  ];

  useEffect(() => {
    // Scroll to bottom when messages increase
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(input);
    setInput('');
  };

  const handleStarterPrompt = (prompt: string) => {
    onSendMessage(prompt);
    setInput('');
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className={`relative flex-1 h-full flex flex-col bg-transparent`}>
      
      <header className="sticky top-0 z-20 flex flex-shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/88 px-4 py-3 shadow-[0_16px_38px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/92 dark:shadow-[0_18px_44px_rgba(2,6,23,0.42)]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/40 bg-cyan-50 shadow-sm dark:border-cyan-200/15 dark:bg-white/[0.04]">
            <Logo isSmall={true} />
          </span>
          <h2 className={`truncate text-base font-black tracking-normal text-slate-950 dark:text-white
            ${isLoading || initialLoading ? 'ai-pulse' : ''}`}
          >
            Sarathi
          </h2>
        </div>

        {isMobile && (<button onClick={handleCloseDrawer} aria-label="Close chat" className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"><XMarkIcon className="h-5 w-5" /></button>)}
      </header>

      <main id="ai-chat-scroll-area"
       ref={chatScrollRef} className={`sarathi-chat-scroll ${hasConversation ? 'overflow-y-auto' : 'sarathi-chat-scroll-empty overflow-y-hidden'} flex-grow h-0 space-y-6 p-4 custom-scroll-smooth`}>
        {!hasConversation ? (
          <div className="flex min-h-full flex-col items-center justify-center px-1 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/40 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_18px_46px_rgba(2,6,23,0.35)]">
              <Logo isSmall={true} />
            </div>
            <h3 className="mt-5 text-2xl font-black tracking-normal text-slate-950 dark:text-white">Ask Sarathi</h3>
            <div className="mt-6 grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2">
              {starterPrompts.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleStarterPrompt(item.prompt)}
                  className="rounded-2xl border border-slate-200/80 bg-white/88 px-4 py-3 text-left text-sm font-black text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.10)] transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-cyan-400/25 dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-100 dark:shadow-[0_14px_34px_rgba(2,6,23,0.26)] dark:hover:border-cyan-200/25 dark:hover:bg-cyan-300/10 dark:hover:text-white dark:focus:ring-cyan-300/20"
                >
                  {item.label}
                </button>
              ))}
            </div>
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
                    <div className={`flex items-center mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex-shrink-0 rounded-full border p-2 shadow-lg ${isUser ? 'order-2 ml-2 border-cyan-200/25 bg-cyan-500/20 shadow-cyan-950/40' : 'order-1 mr-2 border-amber-100/15 bg-slate-900/80 shadow-slate-950/50'}`}>
                        {isUser ? (
                          <span className="font-bold text-white text-sm h-6 w-6 flex items-center justify-center">You</span>
                        ) : (
                          <div className="relative">
                            <Logo isSmall={true} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`group relative max-w-full rounded-2xl border p-3 shadow-[0_18px_44px_rgba(15,23,42,0.14)] dark:shadow-[0_18px_44px_rgba(2,6,23,0.30)] ${isUser ? 'rounded-br-none border-cyan-200/30 bg-cyan-600/90 text-white' : 'rounded-bl-none border-slate-200/80 bg-white/90 text-slate-800 dark:border-white/10 dark:bg-white/[0.055] dark:text-white'}`}>
                        <div className={`${isUser ? 'prose-invert' : 'prose-slate dark:prose-invert'} prose prose-p:my-2 prose-headings:my-2 prose-ul:my-2`}>
                          <Suspense fallback={<p>{msg.text}</p>}>
                            <LazyReactMarkdown>{msg.text}</LazyReactMarkdown>
                          </Suspense>

                          {isStreaming && <span className="blinking-cursor"></span>}
                        </div>

                        {msg.sender === 'ai' && !isLoading && msg.text && (
                          <button onClick={() => handleCopy(msg.text, index)} className="absolute -right-2 -top-2 rounded-full border border-white/10 bg-slate-900/90 p-1 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                            {copiedIndex === index ? <CheckIcon className="h-4 w-4 text-green-400" /> : <ClipboardDocumentIcon className="h-4 w-4 text-white" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="flex-shrink-0 border-t border-slate-200/70 bg-white/88 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80">
        <form onSubmit={handleFormSubmit} className="flex items-start gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_34px_rgba(15,23,42,0.10)] focus-within:border-cyan-300 focus-within:ring-2 focus-within:ring-cyan-400/20 dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_40px_rgba(2,6,23,0.35)] dark:focus-within:border-cyan-200/30">
          <TextareaAutosize value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFormSubmit(e); } }} placeholder="Message Sarathi" className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-400" maxRows={6} />
          <button type="submit" className="rounded-full bg-slate-950 p-2 text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:scale-105 disabled:scale-100 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none dark:bg-white dark:text-slate-950 dark:shadow-[0_12px_30px_rgba(2,6,23,0.24)] dark:disabled:bg-slate-700 dark:disabled:text-slate-300" disabled={isLoading || !input.trim()}><PaperAirplaneIcon className="h-5 w-5" /></button>
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
