// src/components/viewer/ChatInterface.tsx

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Drawer } from 'vaul';
import { PaperAirplaneIcon, XMarkIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/solid';
import TextareaAutosize from 'react-textarea-autosize';
import Logo from '../Logo';
import ReactMarkdown from 'react-markdown';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

interface ChatInterfaceProps {
  documentId: string;
  isMobileLayout: boolean;
  activeSnapPoint?: number | string | null;
  smallSnapPoint?: number | string | null;
}

const SharedChatUI: React.FC<{ documentId: string, isMobile: boolean, activeSnapPoint?: number | string | null, smallSnapPoint?: number | string | null }> = ({ documentId, isMobile, activeSnapPoint, smallSnapPoint }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSmall = isMobile && activeSnapPoint === smallSnapPoint;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    // ... (This function remains unchanged, so I'm omitting it for brevity)
    if (!text.trim() || isLoading) return;
    const userMessage: Message = { sender: 'user', text };
    const aiMessagePlaceholder: Message = { sender: 'ai', text: '' };
    setMessages(prev => [...prev, userMessage, aiMessagePlaceholder]);
    setInput('');
    setIsLoading(true);
    try {
      const response = await fetch(`/api/pyqs/chat/${documentId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });
      if (!response.ok || !response.body) { throw new Error(`Request failed`); }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullResponse = "";
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: !done });
        const lines = chunk.split('\n\n').filter(line => line.trim().startsWith('data:'));
        for (const line of lines) {
          try {
            const dataStr = line.replace(/^data: /, '');
            const data = JSON.parse(dataStr);
            if (data.chunk) {
              fullResponse += data.chunk;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1].text = fullResponse;
                return newMessages;
              });
            }
          } catch (e) { console.error("Parse error:", e); }
        }
      }
    } catch (error) {
      console.error("Streaming failed:", error);
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages[newMessages.length - 1].text === '') {
          newMessages[newMessages.length - 1].text = "Sorry, I'm having trouble connecting.";
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const suggestedQuestions = ["Explain recursion in simple terms", "Suggest a study plan for GATE CSE", "Who created you?"];

  return (
    <div className={`relative flex-1 grid grid-rows-[auto_1fr_auto] bg-transparent min-h-0`}>

      {/* FIX: Redesigned header for a slimmer look with an integrated drag handle. */}
      <header
        className={`relative border-b border-slate-700 flex items-center px-2 ${isMobile ? 'py-0' : 'py-3'} ${isSmall ? 'hidden' : ''}`}
      >
        {/* Left side: Title */}
        <div className="flex-1">
          <h2 className="text-base font-semibold text-white pl-2">AI Assistant</h2>
        </div>

        {/* Center: Draggable Handle for Mobile */}
        {isMobile && (
          <div className="absolute left-1/2 -translate-x-1/2">
            <div className="h-1.5 w-12 rounded-full bg-slate-600" />
          </div>
        )}

        {/* Right side: Close Button */}
        <div className="flex-1 flex justify-end">
          {isMobile && (
            <Drawer.Close asChild>
              <button
                aria-label="Close chat"
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </Drawer.Close>
          )}
        </div>
      </header>

      <main className={`overflow-y-auto space-y-6 min-h-0 p-4`}>
        {/* ... (The rest of the component remains the same) ... */}
        {messages.length === 0 ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-slate-800 p-2 rounded-full"><Logo isSmall={true} /></div>
              <div className={`bg-slate-800 rounded-xl rounded-bl-none w-fit p-3`}>
                <p className={`text-white text-base`}>Hello! How can I assist you today?</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSendMessage(q)}
                  className={`bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors px-3 py-1 text-sm`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`p-2 rounded-full flex-shrink-0 ${msg.sender === 'user' ? 'bg-cyan-600' : 'bg-slate-700'}`}>
                {msg.sender === 'user' ? <span className="font-bold text-white text-sm h-6 w-6 flex items-center justify-center">You</span> : <Logo isSmall={true} />}
              </div>
              <div className={`group relative p-3 rounded-xl max-w-md text-white ${msg.sender === 'user' ? 'bg-cyan-700 rounded-br-none' : 'bg-slate-800 rounded-bl-none'}`}>
                <div className="prose prose-invert prose-p:my-2 prose-headings:my-2 prose-ul:my-2">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
                {msg.sender === 'ai' && !isLoading && (
                  <button onClick={() => handleCopy(msg.text, index)} className="absolute -top-2 -right-2 bg-slate-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    {copiedIndex === index ? <CheckIcon className="h-4 w-4 text-green-400" /> : <ClipboardDocumentIcon className="h-4 w-4 text-white" />}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && messages[messages.length - 1]?.text === '' && (
          <div className="flex items-start gap-3">
            <div className="bg-slate-800 p-2 rounded-full"><Logo isSmall={true} /></div>
            <div className="bg-slate-800 p-3 rounded-xl rounded-bl-none w-fit flex items-center space-x-1">
              <motion.span animate={{ y: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              <motion.span animate={{ y: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              <motion.span animate={{ y: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-2">
        <form onSubmit={handleFormSubmit} className="flex items-start gap-2 border border-slate-700 bg-slate-800 rounded-xl p-2 focus-within:ring-2 focus-within:ring-cyan-500">
          <TextareaAutosize
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFormSubmit(e); } }}
            placeholder="Ask me anything..."
            className="flex-1 bg-transparent resize-none text-white max-h-40 focus:outline-none"
            maxRows={6}
          />
          <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 p-2 rounded-full disabled:bg-slate-600 transition-colors self-end" disabled={isLoading || !input.trim()}>
            <PaperAirplaneIcon className="h-5 w-5 text-white" />
          </button>
        </form>
      </footer>
    </div>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ documentId, isMobileLayout, activeSnapPoint, smallSnapPoint }) => {
  if (isMobileLayout) {
    return <SharedChatUI documentId={documentId} isMobile={true} activeSnapPoint={activeSnapPoint} smallSnapPoint={smallSnapPoint} />;
  }
  return (
    <div className="relative h-full w-full border-l border-slate-700 flex flex-col">
      <SharedChatUI documentId={documentId} isMobile={false} />
    </div>
  );
};

export default ChatInterface;