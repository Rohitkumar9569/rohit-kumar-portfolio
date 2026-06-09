const STORAGE_KEY = 'studyhub-chat-history';
const LAST_ACTIVE_CHAT_KEY = 'studyhub-chat-last-active';
const MAX_CHAT_SESSIONS = 12;

export const STUDY_CHAT_HISTORY_CHANGED_EVENT = 'studyhub:chat-history-changed';

export type StudyChatAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  status?: 'ready' | 'processing' | 'unsupported' | 'error';
  textPreview?: string;
  error?: string;
};

export type StudyChatMessage = {
  sender: 'user' | 'ai';
  text: string;
  attachments?: StudyChatAttachment[];
};

export type StudyChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StudyChatMessage[];
  answerCards?: unknown[];
};

const emitHistoryChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(STUDY_CHAT_HISTORY_CHANGED_EVENT));
};

const isSession = (value: unknown): value is StudyChatSession => {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<StudyChatSession>;
  return Boolean(
    session.id &&
    typeof session.id === 'string' &&
    Array.isArray(session.messages),
  );
};

export const loadStudyChatHistory = (): StudyChatSession[] => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isSession)
      .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
      .slice(0, MAX_CHAT_SESSIONS);
  } catch {
    return [];
  }
};

const persistStudyChatHistory = (sessions: StudyChatSession[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_CHAT_SESSIONS)));
  emitHistoryChanged();
};

export const createStudyChatId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getStudyChatSession = (id: string) =>
  loadStudyChatHistory().find((session) => session.id === id) || null;

export const getLatestStudyChatSession = () =>
  loadStudyChatHistory()[0] || null;

export const getLastActiveStudyChatId = () => {
  if (typeof window === 'undefined') return '';

  try {
    const storedId = window.localStorage.getItem(LAST_ACTIVE_CHAT_KEY) || '';
    return storedId && getStudyChatSession(storedId) ? storedId : getLatestStudyChatSession()?.id || '';
  } catch {
    return getLatestStudyChatSession()?.id || '';
  }
};

export const setLastActiveStudyChatId = (id: string) => {
  if (typeof window === 'undefined') return;

  try {
    if (id) {
      window.localStorage.setItem(LAST_ACTIVE_CHAT_KEY, id);
    } else {
      window.localStorage.removeItem(LAST_ACTIVE_CHAT_KEY);
    }
  } catch {
    // Chat history still works without this tiny navigation hint.
  }
};

export const getStudyChatTitle = (messages: StudyChatMessage[]) => {
  const firstUserMessage = messages.find((message) => message.sender === 'user' && message.text.trim());
  const title = firstUserMessage?.text.trim().replace(/\s+/g, ' ') || 'New chat';
  return title.length > 44 ? `${title.slice(0, 41)}...` : title;
};

export const saveStudyChatSession = (session: Pick<StudyChatSession, 'id' | 'messages'> & Partial<StudyChatSession>) => {
  if (!session.messages.length) return;

  const now = new Date().toISOString();
  const existingSessions = loadStudyChatHistory();
  const existingSession = existingSessions.find((item) => item.id === session.id);
  const nextSession: StudyChatSession = {
    id: session.id,
    title: session.title || getStudyChatTitle(session.messages),
    createdAt: existingSession?.createdAt || session.createdAt || now,
    updatedAt: now,
    messages: session.messages,
    answerCards: session.answerCards || [],
  };

  persistStudyChatHistory([
    nextSession,
    ...existingSessions.filter((item) => item.id !== session.id),
  ]);
};

export const deleteStudyChatSession = (id: string) => {
  const nextSessions = loadStudyChatHistory().filter((session) => session.id !== id);
  const wasLastActive = typeof window !== 'undefined' && window.localStorage.getItem(LAST_ACTIVE_CHAT_KEY) === id;
  persistStudyChatHistory(nextSessions);
  if (wasLastActive) setLastActiveStudyChatId(nextSessions[0]?.id || '');
};

export const clearStudyChatHistory = () => {
  persistStudyChatHistory([]);
  setLastActiveStudyChatId('');
};
