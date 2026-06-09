import { type MouseEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  CloudArrowUpIcon,
  PencilSquareIcon,
  TrashIcon,
  UserCircleIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import {
  STUDY_CHAT_HISTORY_CHANGED_EVENT,
  clearStudyChatHistory,
  deleteStudyChatSession,
  loadStudyChatHistory,
  type StudyChatSession,
} from '../../utils/studyChatHistory';
import {
  STUDY_VOICE_PROFILE_CHANGED_EVENT,
  STUDY_VOICE_RATE_CHANGED_EVENT,
  getStoredStudyVoiceRate,
  getStoredStudyVoiceProfileId,
  getStudyVoiceProfile,
  saveStoredStudyVoiceProfileId,
  saveStoredStudyVoiceRate,
  type StudyVoiceProfileId,
} from '../../utils/studyVoicePreferences';
import ThemeToggleButton from '../ThemeToggleButton';
import StudyVoiceSettings from './StudyVoiceSettings';

interface StudyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const isExactVoiceLanguageMatch = (voice: SpeechSynthesisVoice, language: string) => {
  const voiceLanguage = voice.lang.toLowerCase();
  const targetLanguage = language.toLowerCase();
  return voiceLanguage === targetLanguage || voiceLanguage.startsWith(`${targetLanguage}-`);
};

const isVoiceLanguageMatch = (voice: SpeechSynthesisVoice, language: string) => {
  const voiceLanguage = voice.lang.toLowerCase();
  const targetLanguage = language.toLowerCase();
  const targetBase = targetLanguage.split('-')[0];
  return voiceLanguage === targetLanguage || voiceLanguage.startsWith(`${targetBase}-`);
};

const femaleVoiceHints = [
  'neerja',
  'neeraja',
  'swara',
  'heera',
  'kalpana',
  'asha',
  'meera',
  'kavya',
  'female',
  'zira',
  'samantha',
  'susan',
  'aria',
  'jenny',
  'sonia',
  'natasha',
  'hazel',
];

const maleVoiceHints = [
  'prabhat',
  'madhur',
  'ravi',
  'hemant',
  'arjun',
  'aarav',
  'kabir',
  'kiran',
  'male',
  'david',
  'mark',
  'george',
  'daniel',
  'alex',
  'fred',
];

const indianVoiceNameHints = [
  'india',
  'indian',
  'hindi',
  'neerja',
  'neeraja',
  'swara',
  'madhur',
  'heera',
  'kalpana',
  'prabhat',
  'hemant',
  'ravi',
  'asha',
  'meera',
  'kavya',
];

const getSpeechVoiceGender = (voice: SpeechSynthesisVoice) => {
  const voiceName = voice.name.toLowerCase();
  if (femaleVoiceHints.some((hint) => voiceName.includes(hint))) return 'female';
  if (maleVoiceHints.some((hint) => voiceName.includes(hint))) return 'male';
  return 'unknown';
};

const isIndianSpeechVoice = (voice: SpeechSynthesisVoice) => {
  const voiceName = voice.name.toLowerCase();
  const voiceLanguage = voice.lang.toLowerCase();
  return (
    voiceLanguage === 'en-in' ||
    voiceLanguage === 'hi-in' ||
    voiceLanguage.startsWith('en-in-') ||
    voiceLanguage.startsWith('hi-in-') ||
    indianVoiceNameHints.some((hint) => voiceName.includes(hint))
  );
};

const scoreSpeechVoice = (
  voice: SpeechSynthesisVoice,
  targetLanguage: string,
  profile: ReturnType<typeof getStudyVoiceProfile>,
) => {
  const voiceName = voice.name.toLowerCase();
  const voiceLanguage = voice.lang.toLowerCase();
  const target = targetLanguage.toLowerCase();
  const targetBase = target.split('-')[0];
  const exactTargetLanguage = isExactVoiceLanguageMatch(voice, targetLanguage);
  const targetLanguageMatch = isVoiceLanguageMatch(voice, targetLanguage);
  const isIndianVoice = isIndianSpeechVoice(voice);
  const voiceGender = getSpeechVoiceGender(voice);
  let score = 0;

  if (exactTargetLanguage) score += 142;
  else if (targetLanguageMatch) score += 72;
  if (target === 'hi-in' && voiceLanguage === 'en-in') score += 42;
  if (target === 'en-in' && voiceLanguage === 'hi-in') score -= 160;
  if (isIndianVoice) score += 132;

  profile.languagePriority.forEach((language, index) => {
    const normalized = language.toLowerCase();
    if (voiceLanguage === normalized) score += 76 - index * 7;
    else if (voiceLanguage.startsWith(`${normalized.split('-')[0]}-`)) score += 18 - index * 2;
  });

  profile.voiceNameHints.forEach((hint, index) => {
    if (voiceName.includes(hint.toLowerCase())) score += 58 - Math.min(index, 8) * 3;
  });

  if (voiceName.includes('natural')) score += 38;
  if (voiceName.includes('online')) score += 24;
  if (voiceName.includes('microsoft')) score += 16;
  if (!isIndianVoice && (target === 'en-in' || target === 'hi-in')) score -= 92;

  if (profile.gender === 'female') {
    if (voiceGender === 'female') score += 185;
    if (voiceGender === 'male') score -= 240;
    if (voiceGender === 'unknown') score -= targetBase === 'hi' ? 12 : 4;
  }

  if (profile.gender === 'male') {
    if (voiceGender === 'male') score += 185;
    if (voiceGender === 'female') score -= 240;
    if (voiceGender === 'unknown') score -= targetBase === 'hi' ? 12 : 4;
  }

  return score;
};

const pickSpeechVoice = (
  voices: SpeechSynthesisVoice[],
  targetLanguage: string,
  profile: ReturnType<typeof getStudyVoiceProfile>,
) =>
  voices
    .slice()
    .sort((a, b) => scoreSpeechVoice(b, targetLanguage, profile) - scoreSpeechVoice(a, targetLanguage, profile))[0];

const StudyDrawer = ({ isOpen, onClose }: StudyDrawerProps) => {
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [chatHistory, setChatHistory] = useState<StudyChatSession[]>([]);
  const [voiceProfileId, setVoiceProfileId] = useState<StudyVoiceProfileId>(() => getStoredStudyVoiceProfileId());
  const [voiceRate, setVoiceRate] = useState(() =>
    getStoredStudyVoiceRate(getStudyVoiceProfile(getStoredStudyVoiceProfileId()).rate)
  );
  const [previewingVoiceProfileId, setPreviewingVoiceProfileId] = useState<StudyVoiceProfileId | ''>('');
  const [speechVoices, setSpeechVoices] = useState<SpeechSynthesisVoice[]>([]);
  const previewRunRef = useRef('');
  const isChatRoute = location.pathname.startsWith('/app/ask') || location.pathname.startsWith('/app/search');
  const activeChatId = new URLSearchParams(location.search).get('chat') || '';

  useEffect(() => {
    if (!isChatRoute) {
      setChatHistory([]);
      return undefined;
    }

    const refreshChatHistory = () => setChatHistory(loadStudyChatHistory());
    refreshChatHistory();
    window.addEventListener(STUDY_CHAT_HISTORY_CHANGED_EVENT, refreshChatHistory);

    return () => window.removeEventListener(STUDY_CHAT_HISTORY_CHANGED_EVENT, refreshChatHistory);
  }, [isChatRoute]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!previewingVoiceProfileId) return;
    window.speechSynthesis.cancel();
    previewRunRef.current = '';
    setPreviewingVoiceProfileId('');
  }, [isOpen, previewingVoiceProfileId]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleVoiceChange = (event: Event) => {
      const customEvent = event as CustomEvent<StudyVoiceProfileId>;
      setVoiceProfileId(customEvent.detail || getStoredStudyVoiceProfileId());
    };

    window.addEventListener(STUDY_VOICE_PROFILE_CHANGED_EVENT, handleVoiceChange as EventListener);
    return () => window.removeEventListener(STUDY_VOICE_PROFILE_CHANGED_EVENT, handleVoiceChange as EventListener);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleVoiceRateChange = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      setVoiceRate(getStoredStudyVoiceRate(customEvent.detail));
    };

    window.addEventListener(STUDY_VOICE_RATE_CHANGED_EVENT, handleVoiceRateChange as EventListener);
    return () => window.removeEventListener(STUDY_VOICE_RATE_CHANGED_EVENT, handleVoiceRateChange as EventListener);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;

    const loadVoices = () => {
      setSpeechVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices);
    };
  }, []);

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleNewChat = () => {
    window.dispatchEvent(new Event('studyhub:new-chat'));
    onClose();
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

  const handleVoiceSelect = (id: StudyVoiceProfileId) => {
    setVoiceProfileId(id);
    saveStoredStudyVoiceProfileId(id);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    previewRunRef.current = '';
    setPreviewingVoiceProfileId('');
  };

  const handleVoiceRateChange = (rate: number) => {
    const nextRate = getStoredStudyVoiceRate(rate);
    setVoiceRate(nextRate);
    saveStoredStudyVoiceRate(nextRate);
  };

  const handleVoicePreview = (id: StudyVoiceProfileId) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (previewingVoiceProfileId === id) {
      window.speechSynthesis.cancel();
      previewRunRef.current = '';
      setPreviewingVoiceProfileId('');
      return;
    }

    const profile = getStudyVoiceProfile(id);
    const voices = speechVoices.length ? speechVoices : window.speechSynthesis.getVoices();
    if (!speechVoices.length && voices.length) setSpeechVoices(voices);
    const targetLanguage = 'en-IN';
    const romanPreviewVoices = voices.filter((voice) => !voice.lang.toLowerCase().startsWith('hi'));
    const romanPreviewProfile = {
      ...profile,
      languagePriority: ['en-IN', 'en-GB', 'en-US'],
    };
    const preferredVoice = pickSpeechVoice(
      romanPreviewVoices.length ? romanPreviewVoices : voices,
      targetLanguage,
      romanPreviewProfile,
    );

    window.speechSynthesis.cancel();
    const runId = `drawer-preview-${id}-${Date.now()}`;
    previewRunRef.current = runId;
    setPreviewingVoiceProfileId(id);

    const utterance = new SpeechSynthesisUtterance(
      'Namaste, main Sarathi hoon. Main Hinglish ko natural Indian clarity ke saath padhungi. D B M S aur operating system jaise technical words English me clear rahenge.',
    );
    utterance.lang = preferredVoice?.lang || targetLanguage || profile.recognitionLang;
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = voiceRate;
    utterance.pitch = profile.pitch;
    utterance.onend = () => {
      if (previewRunRef.current === runId) setPreviewingVoiceProfileId('');
    };
    utterance.onerror = () => {
      if (previewRunRef.current === runId) setPreviewingVoiceProfileId('');
    };

    window.speechSynthesis.speak(utterance);
  };

  const drawerLinkClassName = (isActive: boolean) =>
    [
      'group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition',
      isActive
        ? 'study-nav-active'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-white',
    ].join(' ');

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
    <motion.div
      className="fixed inset-0 z-[80] overflow-hidden lg:hidden"
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.button
        className="absolute inset-0 bg-slate-950/28 backdrop-blur-[3px] dark:bg-slate-950/42"
        aria-label="Close menu"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="study-drawer-surface study-scrollbar relative flex h-[100dvh] max-h-[100dvh] w-[min(88vw,24rem)] max-w-sm transform-gpu flex-col overflow-y-auto overflow-x-hidden overscroll-contain bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+1.1rem)] pt-[calc(env(safe-area-inset-top)+1.25rem)] shadow-[18px_0_60px_rgba(15,23,42,0.14)] will-change-transform dark:bg-slate-950 dark:shadow-[18px_0_70px_rgba(0,0,0,0.34)]"
        initial={{ x: '-100%', opacity: 0.96 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '-100%', opacity: 0.96 }}
        transition={{ type: 'tween', duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-700 dark:text-cyan-300">
              Study Hub
            </p>
          </div>
        </div>

        {isChatRoute && (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="px-3 text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Chats
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
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/[0.07]"
            >
              <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
              New chat
            </Link>

            {chatHistory.length > 0 ? (
              <div className="study-scrollbar max-h-60 space-y-1 overflow-y-auto pr-1">
                {chatHistory.map((chat) => {
                  const isActive = chat.id === activeChatId;

                  return (
                    <Link
                      key={chat.id}
                      to={`/app/ask?chat=${chat.id}`}
                      onClick={onClose}
                      aria-current={isActive ? 'page' : undefined}
                      className={[
                        'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition',
                        isActive
                          ? 'study-nav-active'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-white',
                      ].join(' ')}
                    >
                      <ChatBubbleLeftRightIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span className="study-nav-label min-w-0 flex-1 truncate">{chat.title}</span>
                      <button
                        type="button"
                        onClick={(event) => handleDeleteChat(event, chat.id)}
                        className={[
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl opacity-70 transition hover:opacity-100',
                          isActive
                            ? 'text-[rgb(var(--study-muted))] hover:bg-black/[0.04] hover:text-rose-600 dark:hover:bg-white/[0.08] dark:hover:text-rose-300'
                            : 'hover:bg-white hover:text-rose-600 dark:hover:bg-white/10 dark:hover:text-rose-300',
                        ].join(' ')}
                        aria-label={`Delete ${chat.title}`}
                      >
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="px-3 py-2 text-xs font-semibold leading-5 text-slate-400 dark:text-slate-500">
                Your recent chats will appear here.
              </p>
            )}
          </div>
        )}

        {isChatRoute && (
          <div className="mt-5">
            <StudyVoiceSettings
              voiceProfileId={voiceProfileId}
              voiceRate={voiceRate}
              previewingVoiceProfileId={previewingVoiceProfileId}
              onVoiceProfileChange={handleVoiceSelect}
              onVoiceRateChange={handleVoiceRateChange}
              onVoicePreview={handleVoicePreview}
            />
          </div>
        )}

        <div className={[isChatRoute ? 'mt-5' : 'mt-8', 'space-y-1 pt-5'].join(' ')}>
          <Link
            to="/app/profile"
            onClick={onClose}
            aria-current={location.pathname.startsWith('/app/profile') || location.pathname.startsWith('/app/preferences') ? 'page' : undefined}
            className={drawerLinkClassName(location.pathname.startsWith('/app/profile') || location.pathname.startsWith('/app/preferences'))}
          >
            <Cog6ToothIcon className="h-5 w-5" aria-hidden="true" />
            <span className="study-nav-label">Profile</span>
          </Link>
          <Link
            to="/app/contribute"
            onClick={onClose}
            aria-current={location.pathname.startsWith('/app/contribute') ? 'page' : undefined}
            className={drawerLinkClassName(location.pathname.startsWith('/app/contribute'))}
          >
            <CloudArrowUpIcon className="h-5 w-5" aria-hidden="true" />
            <span className="study-nav-label">Request Content</span>
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              onClick={onClose}
              aria-current={location.pathname.startsWith('/admin') ? 'page' : undefined}
              className={drawerLinkClassName(location.pathname.startsWith('/admin'))}
            >
              <WrenchScrewdriverIcon className="h-5 w-5" aria-hidden="true" />
              <span className="study-nav-label">Admin Studio</span>
            </Link>
          )}
          <Link
            to="/app/portfolio"
            onClick={onClose}
            aria-current={location.pathname.startsWith('/app/portfolio') ? 'page' : undefined}
            className={drawerLinkClassName(location.pathname.startsWith('/app/portfolio'))}
          >
            <UserCircleIcon className="h-5 w-5" aria-hidden="true" />
            <span className="study-nav-label">Creator Desk</span>
          </Link>
        </div>

        <div className="mt-auto space-y-2 pt-5">
          <div className="study-control-surface flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
            <span>Theme</span>
            <ThemeToggleButton />
          </div>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-400/10"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              onClick={onClose}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-400/10"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
              Login
            </Link>
          )}
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default StudyDrawer;
