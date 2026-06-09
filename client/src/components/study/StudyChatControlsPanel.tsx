import { type MouseEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import StudyVoiceSettings from './StudyVoiceSettings';
import {
  STUDY_CHAT_HISTORY_CHANGED_EVENT,
  clearStudyChatHistory,
  deleteStudyChatSession,
  loadStudyChatHistory,
  type StudyChatSession,
} from '../../utils/studyChatHistory';
import {
  type StudyVoiceProfileId,
} from '../../utils/studyVoicePreferences';

interface StudyChatControlsPanelProps {
  activeChatId: string;
  voiceProfileId: StudyVoiceProfileId;
  voiceRate: number;
  previewingVoiceProfileId?: StudyVoiceProfileId | '';
  onVoiceProfileChange: (id: StudyVoiceProfileId) => void;
  onVoiceRateChange: (rate: number) => void;
  onVoicePreview: (id: StudyVoiceProfileId) => void;
}

const formatChatAge = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Recent';

  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'Just now';
  if (diffMs < hour) return `${Math.max(1, Math.round(diffMs / minute))}m ago`;
  if (diffMs < day) return `${Math.max(1, Math.round(diffMs / hour))}h ago`;
  return `${Math.max(1, Math.round(diffMs / day))}d ago`;
};

const StudyChatControlsPanel = ({
  activeChatId,
  voiceProfileId,
  voiceRate,
  previewingVoiceProfileId = '',
  onVoiceProfileChange,
  onVoiceRateChange,
  onVoicePreview,
}: StudyChatControlsPanelProps) => {
  const [chatHistory, setChatHistory] = useState<StudyChatSession[]>([]);

  useEffect(() => {
    const refreshChatHistory = () => setChatHistory(loadStudyChatHistory());
    refreshChatHistory();
    window.addEventListener(STUDY_CHAT_HISTORY_CHANGED_EVENT, refreshChatHistory);
    return () => window.removeEventListener(STUDY_CHAT_HISTORY_CHANGED_EVENT, refreshChatHistory);
  }, []);

  const handleNewChat = () => {
    window.dispatchEvent(new Event('studyhub:new-chat'));
  };

  const handleDeleteChat = (event: MouseEvent<HTMLButtonElement>, chatId: string) => {
    event.preventDefault();
    event.stopPropagation();
    deleteStudyChatSession(chatId);
    if (chatId === activeChatId) {
      window.dispatchEvent(new Event('studyhub:new-chat'));
    }
  };

  const handleClearChats = () => {
    clearStudyChatHistory();
    if (activeChatId) {
      window.dispatchEvent(new Event('studyhub:new-chat'));
    }
  };

  return (
    <aside className="study-chat-controls-surface hidden h-full w-[20rem] shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-white px-3 py-4 shadow-[16px_0_42px_rgba(15,23,42,0.055)] dark:border-white/10 dark:bg-slate-950 dark:shadow-[18px_0_48px_rgba(0,0,0,0.24)] lg:flex">
      <div className="shrink-0 px-1">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-200">
            Sarathi
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white">
            Chat controls
          </h2>
        </div>
        <button
          type="button"
          onClick={handleNewChat}
          className="study-control-surface inline-flex h-10 w-10 items-center justify-center rounded-2xl text-slate-700 transition hover:-translate-y-0.5 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white"
          aria-label="New chat"
          title="New chat"
        >
          <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      </div>

      <div className="mt-5 flex min-h-0 flex-1 flex-col space-y-2">
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            History
          </p>
          {chatHistory.length > 0 && (
            <button
              type="button"
              onClick={handleClearChats}
              className="rounded-full px-2 py-1 text-[11px] font-black text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-400/10 dark:hover:text-rose-300"
            >
              Clear
            </button>
          )}
        </div>

        <Link
          to="/app/ask"
          onClick={handleNewChat}
          className="study-control-surface flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 dark:text-white"
        >
          <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
          New chat
        </Link>

        <div className="study-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {chatHistory.length > 0 ? (
            chatHistory.map((chat) => {
              const isActive = chat.id === activeChatId;

              return (
                <Link
                  key={chat.id}
                  to={`/app/ask?chat=${chat.id}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'group flex min-h-14 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition-all duration-200',
                    isActive
                      ? 'study-nav-active'
                      : 'text-slate-600 hover:-translate-y-0.5 hover:bg-white/74 hover:text-slate-950 hover:shadow-sm dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-white',
                  ].join(' ')}
                >
                  <ChatBubbleLeftRightIcon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="study-nav-label block truncate">{chat.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] font-bold text-slate-400 dark:text-slate-500">
                      {formatChatAge(chat.updatedAt)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={(event) => handleDeleteChat(event, chat.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-slate-400 opacity-0 transition hover:bg-white hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-white/10 dark:hover:text-rose-300"
                    aria-label={`Delete ${chat.title}`}
                  >
                    <TrashIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </Link>
              );
            })
          ) : (
            <p className="rounded-2xl px-3 py-3 text-xs font-semibold leading-5 text-slate-400 dark:text-slate-500">
              Recent chats will appear here.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 shrink-0">
        <StudyVoiceSettings
          voiceProfileId={voiceProfileId}
          voiceRate={voiceRate}
          previewingVoiceProfileId={previewingVoiceProfileId}
          onVoiceProfileChange={onVoiceProfileChange}
          onVoiceRateChange={onVoiceRateChange}
          onVoicePreview={onVoicePreview}
        />
      </div>
    </aside>
  );
};

export default StudyChatControlsPanel;
