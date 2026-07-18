import { type ChangeEvent, type FormEvent, type UIEvent, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { AnimatePresence, motion } from 'framer-motion';
import { API_BASE_URL } from '../../api';
import {
  ArrowUpIcon,
  ArrowTopRightOnSquareIcon,
  Bars3Icon,
  ChevronLeftIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  MicrophoneIcon,
  PaperClipIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  getStudyCardVisual,
  getToneBadgeClass,
  type StudyIcon,
  type StudyTone,
} from '../../components/study/StudyVisualCards';
import StudyChatControlsPanel from '../../components/study/StudyChatControlsPanel';
import SaveLibraryItemButton from '../../components/study/SaveLibraryItemButton';
import { useStudyPreferences } from '../../hooks/useStudyPreferences';
import type { StudyCard } from '../../studyHubApi';
import { getPdfThumbnailUrl } from '../../utils/cloudinaryPdfThumbnail';
import {
  createStudyChatId,
  getLastActiveStudyChatId,
  getStudyChatSession,
  getStudyChatTitle,
  saveStudyChatSession,
  setLastActiveStudyChatId,
  type StudyChatAttachment,
  type StudyChatMessage,
} from '../../utils/studyChatHistory';
import { getSingleFileShortcut, getStudyCardDisplayTitle } from '../../utils/studyCardNavigation';
import {
  getStudyPdfReaderHref,
  isStudyBookPackageUrl,
  isStudyPdfUrl,
  isStudyReadableDocumentUrl,
  warmStudyReadableDocument,
} from '../../utils/studyPdfReader';
import { toStudyCardFileLibraryItem, toStudyCardLibraryItem } from '../../utils/studyLibrary';
import {
  STUDY_VOICE_PROFILE_CHANGED_EVENT,
  STUDY_VOICE_RATE_CHANGED_EVENT,
  getStoredStudyVoiceProfileId,
  getStoredStudyVoiceRate,
  getStudyVoiceProfile,
  saveStoredStudyVoiceProfileId,
  saveStoredStudyVoiceRate,
  type StudyVoiceProfile,
  type StudyVoiceProfileId,
} from '../../utils/studyVoicePreferences';

const PLATFORM_WORKSPACE_SLUG = 'study-hub';
const ASK_PARENT_QUERY = encodeURIComponent('/app/ask');
const CARD_PAGE_SIZE = 12;
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_TEXT_LENGTH = 22000;
const VOICE_PREVIEW_TEXT = 'Namaste, main Sarathi hoon. Main Hinglish ko natural Indian clarity ke saath padhungi. DBMS aur operating system jaise technical words English me clear rahenge.';
const starterPrompts = [
  {
    title: 'Find notes',
    example: 'GATE CSE DBMS notes',
    prompt: 'GATE CSE DBMS notes',
  },
  {
    title: 'Explain topic',
    example: 'Photosynthesis',
    prompt: 'Explain photosynthesis',
  },
  {
    title: 'Find papers',
    example: 'GATE CSE PYQ',
    prompt: 'GATE CSE previous year papers',
  },
  {
    title: 'Find books',
    example: 'NCERT history',
    prompt: 'NCERT history books',
  },
];

type StudyAskMessage = StudyChatMessage;

type AttachmentStatus = 'processing' | 'ready' | 'unsupported' | 'error';

type ComposerAttachment = StudyChatAttachment & {
  status: AttachmentStatus;
};

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike | undefined;
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike | undefined;
  };
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type BrowserWindowWithSpeech = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

type StudyAskCard = StudyCard & {
  pathNames?: string[];
};

type UserLanguageStyle = 'english' | 'hindi' | 'hinglish';
type SpeechScript = 'hindi' | 'hinglish' | 'latin';

interface SpeechSegment {
  text: string;
  script: SpeechScript;
}

const detectUserLanguageStyle = (value: string): UserLanguageStyle => {
  if (/[\u0900-\u097F]/.test(value)) return 'hindi';

  const normalized = value.toLowerCase();
  const hinglishMarkers = [
    'hai',
    'hain',
    'kya',
    'kaise',
    'karo',
    'bata',
    'batao',
    'mujhe',
    'isme',
    'iske',
    'aur',
    'nahi',
    'nahin',
    'chahiye',
    'samjhao',
    'main',
    'mein',
    'karne',
    'cheezon',
    'sab',
    'sabhi',
    'padhai',
    'dhundhne',
    'taiyari',
    'puchte',
    'jaiye',
  ];

  return hinglishMarkers.some((marker) => new RegExp(`\\b${marker}\\b`).test(normalized))
    ? 'hinglish'
    : 'english';
};

const getConnectionErrorText = (style: UserLanguageStyle) => {
  if (style === 'hindi') return 'मैं अभी Sarathi से connect नहीं कर पा रहा हूं. थोड़ी देर बाद फिर try करें.';
  if (style === 'hindi') return 'मैं अभी Sarathi से connect नहीं कर पा रहा हूँ. थोड़ी देर बाद फिर try करें.';
  if (style === 'hinglish') return 'Main abhi Sarathi se connect nahi kar pa raha hoon. Thodi der baad phir try karo.';
  return 'I could not connect to Sarathi. Please try again in a moment.';
};

const getQueryFromParams = (params: URLSearchParams) =>
  params.get('q') ||
  [
    params.get('subject'),
    params.get('type'),
    params.get('stage'),
    params.get('paper'),
    params.get('workspace'),
  ].filter(Boolean).join(' ');

const parseSsePayloads = (rawEvent: string) =>
  rawEvent
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.replace(/^data:\s?/, '').trim())
    .filter(Boolean);

const isMoreCommand = (value: string) =>
  value.trim() === 'और' ||
  /^(more|show more|next|aur|aur dikhao|और|next 5|more cards)$/i.test(value.trim());

const isAllCommand = (value: string) =>
  value.trim() === 'सभी' ||
  /^(all|show all|sab|sare|saare|sabhi|सभी|all cards)$/i.test(value.trim());

const createAttachmentId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `attachment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const formatAttachmentSize = (size: number) => {
  if (!size) return '0 KB';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const isTextAttachment = (file: File) => {
  const name = file.name.toLowerCase();
  return (
    file.type.startsWith('text/') ||
    ['.txt', '.md', '.csv', '.json', '.html', '.xml'].some((extension) => name.endsWith(extension))
  );
};

const compactAttachmentText = (value: string) =>
  value.replace(/\s+/g, ' ').trim().slice(0, MAX_ATTACHMENT_TEXT_LENGTH);

const extractPdfText = async (file: File) => {
  const { pdfjs } = await import('react-pdf');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs?v=5.4.296';

  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageTexts: string[] = [];
  const pageCount = Math.min(pdf.numPages, 18);

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ('str' in item ? String(item.str) : ''))
      .filter(Boolean)
      .join(' ');

    if (pageText) pageTexts.push(`[Page ${pageNumber}]\n${pageText}`);
    if (pageTexts.join(' ').length >= MAX_ATTACHMENT_TEXT_LENGTH) break;
  }

  await pdf.destroy();
  return compactAttachmentText(pageTexts.join('\n\n'));
};

const readAttachmentText = async (file: File) => {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const textPreview = await extractPdfText(file);
    return {
      status: textPreview ? 'ready' as const : 'unsupported' as const,
      textPreview,
      error: textPreview ? undefined : 'No selectable text found',
    };
  }

  if (isTextAttachment(file)) {
    return {
      status: 'ready' as const,
      textPreview: compactAttachmentText(await file.text()),
    };
  }

  return {
    status: 'unsupported' as const,
    textPreview: '',
    error: 'Preview unavailable',
  };
};

const getSpeechRecognitionConstructor = () => {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as BrowserWindowWithSpeech;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
};

const getSpeechText = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '. ')
    .replace(/[*_`>|]/g, ' ')
    .replace(/\bPYQs\b/gi, 'previous year questions')
    .replace(/\bPYQ\b/gi, 'previous year questions')
    .replace(/\bMCQ\b/gi, 'M C Q')
    .replace(/\bUPSC\b/g, 'U P S C')
    .replace(/\bGATE\b/g, 'GATE')
    .replace(/\bCSE\b/g, 'C S E')
    .replace(/\bECE\b/g, 'E C E')
    .replace(/\bDBMS\b/g, 'D B M S')
    .replace(/\bOS\b/g, 'operating system')
    .replace(/\s+/g, ' ')
    .trim();

const HINGLISH_HINDI_SPEECH_WORDS: Record<string, string> = {
  aap: '\u0906\u092a',
  ap: '\u0906\u092a',
  aapko: '\u0906\u092a\u0915\u094b',
  apko: '\u0906\u092a\u0915\u094b',
  aapka: '\u0906\u092a\u0915\u093e',
  apka: '\u0906\u092a\u0915\u093e',
  aapki: '\u0906\u092a\u0915\u0940',
  apki: '\u0906\u092a\u0915\u0940',
  aapke: '\u0906\u092a\u0915\u0947',
  apke: '\u0906\u092a\u0915\u0947',
  main: '\u092e\u0948\u0902',
  mai: '\u092e\u0948\u0902',
  mujhe: '\u092e\u0941\u091d\u0947',
  mere: '\u092e\u0947\u0930\u0947',
  meri: '\u092e\u0947\u0930\u0940',
  mera: '\u092e\u0947\u0930\u093e',
  hum: '\u0939\u092e',
  ham: '\u0939\u092e',
  kya: '\u0915\u094d\u092f\u093e',
  kyu: '\u0915\u094d\u092f\u094b\u0902',
  kyun: '\u0915\u094d\u092f\u094b\u0902',
  kyon: '\u0915\u094d\u092f\u094b\u0902',
  kaise: '\u0915\u0948\u0938\u0947',
  kab: '\u0915\u092c',
  kahan: '\u0915\u0939\u093e\u0902',
  kaha: '\u0915\u0939\u093e\u0902',
  ka: '\u0915\u093e',
  ki: '\u0915\u0940',
  ke: '\u0915\u0947',
  ko: '\u0915\u094b',
  se: '\u0938\u0947',
  mein: '\u092e\u0947\u0902',
  me: '\u092e\u0947\u0902',
  par: '\u092a\u0930',
  aur: '\u0914\u0930',
  ya: '\u092f\u093e',
  lekin: '\u0932\u0947\u0915\u093f\u0928',
  magar: '\u092e\u0917\u0930',
  kyunki: '\u0915\u094d\u092f\u094b\u0902\u0915\u093f',
  kyonki: '\u0915\u094d\u092f\u094b\u0902\u0915\u093f',
  isliye: '\u0907\u0938\u0932\u093f\u090f',
  agar: '\u0905\u0917\u0930',
  toh: '\u0924\u094b',
  phir: '\u092b\u093f\u0930',
  ab: '\u0905\u092c',
  abhi: '\u0905\u092d\u0940',
  bas: '\u092c\u0938',
  bhi: '\u092d\u0940',
  sirf: '\u0938\u093f\u0930\u094d\u092b',
  nahi: '\u0928\u0939\u0940\u0902',
  nahin: '\u0928\u0939\u0940\u0902',
  haan: '\u0939\u093e\u0902',
  ha: '\u0939\u093e\u0902',
  hai: '\u0939\u0948',
  hain: '\u0939\u0948\u0902',
  ho: '\u0939\u094b',
  hota: '\u0939\u094b\u0924\u093e',
  hoti: '\u0939\u094b\u0924\u0940',
  hote: '\u0939\u094b\u0924\u0947',
  hoga: '\u0939\u094b\u0917\u093e',
  hogi: '\u0939\u094b\u0917\u0940',
  honge: '\u0939\u094b\u0902\u0917\u0947',
  tha: '\u0925\u093e',
  thi: '\u0925\u0940',
  the: '\u0925\u0947',
  ye: '\u092f\u0947',
  yeh: '\u092f\u0947',
  yah: '\u092f\u0939',
  wo: '\u0935\u094b',
  woh: '\u0935\u094b',
  vah: '\u0935\u0939',
  isme: '\u0907\u0938\u092e\u0947\u0902',
  ismein: '\u0907\u0938\u092e\u0947\u0902',
  usme: '\u0909\u0938\u092e\u0947\u0902',
  usmein: '\u0909\u0938\u092e\u0947\u0902',
  jisme: '\u091c\u093f\u0938\u092e\u0947\u0902',
  jismein: '\u091c\u093f\u0938\u092e\u0947\u0902',
  iska: '\u0907\u0938\u0915\u093e',
  iski: '\u0907\u0938\u0915\u0940',
  iske: '\u0907\u0938\u0915\u0947',
  uska: '\u0909\u0938\u0915\u093e',
  uski: '\u0909\u0938\u0915\u0940',
  uske: '\u0909\u0938\u0915\u0947',
  jiska: '\u091c\u093f\u0938\u0915\u093e',
  jiski: '\u091c\u093f\u0938\u0915\u0940',
  jiske: '\u091c\u093f\u0938\u0915\u0947',
  kar: '\u0915\u0930',
  karna: '\u0915\u0930\u0928\u093e',
  karta: '\u0915\u0930\u0924\u093e',
  karti: '\u0915\u0930\u0924\u0940',
  karte: '\u0915\u0930\u0924\u0947',
  karo: '\u0915\u0930\u094b',
  kare: '\u0915\u0930\u0947',
  karen: '\u0915\u0930\u0947\u0902',
  samjho: '\u0938\u092e\u091d\u094b',
  samjha: '\u0938\u092e\u091d\u093e',
  samjhana: '\u0938\u092e\u091d\u093e\u0928\u093e',
  samajhna: '\u0938\u092e\u091d\u0928\u093e',
  samjhte: '\u0938\u092e\u091d\u0924\u0947',
  samjhenge: '\u0938\u092e\u091d\u0947\u0902\u0917\u0947',
  bata: '\u092c\u0924\u093e',
  batao: '\u092c\u0924\u093e\u0913',
  batata: '\u092c\u0924\u093e\u0924\u093e',
  batati: '\u092c\u0924\u093e\u0924\u0940',
  padho: '\u092a\u0922\u093c\u094b',
  padhna: '\u092a\u0922\u093c\u0928\u093e',
  padhte: '\u092a\u0922\u093c\u0924\u0947',
  padhate: '\u092a\u0922\u093c\u093e\u0924\u0947',
  padhenge: '\u092a\u0922\u093c\u0947\u0902\u0917\u0947',
  chahiye: '\u091a\u093e\u0939\u093f\u090f',
  zaroori: '\u091c\u0930\u0942\u0930\u0940',
  jaruri: '\u091c\u0930\u0942\u0930\u0940',
  achha: '\u0905\u091a\u094d\u091b\u093e',
  acha: '\u0905\u091a\u094d\u091b\u093e',
  achhe: '\u0905\u091a\u094d\u091b\u0947',
  ache: '\u0905\u091a\u094d\u091b\u0947',
  achhi: '\u0905\u091a\u094d\u091b\u0940',
  acchi: '\u0905\u091a\u094d\u091b\u0940',
  matlab: '\u092e\u0924\u0932\u092c',
  jaise: '\u091c\u0948\u0938\u0947',
  wale: '\u0935\u093e\u0932\u0947',
  wala: '\u0935\u093e\u0932\u093e',
  wali: '\u0935\u093e\u0932\u0940',
  zyada: '\u091c\u094d\u092f\u093e\u0926\u093e',
  jyada: '\u091c\u094d\u092f\u093e\u0926\u093e',
  kam: '\u0915\u092e',
  thoda: '\u0925\u094b\u0921\u093c\u093e',
  thodi: '\u0925\u094b\u0921\u093c\u0940',
  saath: '\u0938\u093e\u0925',
  sath: '\u0938\u093e\u0925',
  pehle: '\u092a\u0939\u0932\u0947',
  baad: '\u092c\u093e\u0926',
};

const HINGLISH_ROMAN_SPEECH_WORDS: Record<string, string> = {
  aapko: 'aap ko',
  apko: 'aap ko',
  aapki: 'aap ki',
  aapke: 'aap ke',
  aapka: 'aap ka',
  cheez: 'cheez',
  cheezein: 'chee zain',
  cheezon: 'chee zon',
  dhundhne: 'dhoondh nay',
  dhoondhne: 'dhoondh nay',
  karne: 'kar nay',
  karna: 'kar na',
  karte: 'kar tay',
  karti: 'kar tee',
  karta: 'kar ta',
  padhai: 'padhai',
  padhne: 'padh nay',
  padhte: 'padh tay',
  padho: 'padho',
  puchte: 'pooch tay',
  puchna: 'pooch na',
  pucho: 'poocho',
  jaiye: 'jai yeh',
  kijiye: 'kee ji yeh',
  chahiye: 'cha hi yay',
  taiyari: 'tai yaari',
  samjhao: 'sam jhao',
  samjhana: 'sam jha na',
  samajhne: 'samajh nay',
  samajh: 'samajh',
  ismein: 'iss main',
  isme: 'iss main',
  usmein: 'uss main',
  usme: 'uss main',
  jismein: 'jiss main',
  jisme: 'jiss main',
  mein: 'main',
  mujhe: 'mujh hey',
  nahin: 'nahi',
  nahi: 'nahi',
  sabhi: 'sab hi',
  saare: 'saaray',
  sare: 'saaray',
  jaise: 'jai say',
  kyonki: 'kyon ki',
  kyunki: 'kyun ki',
  thodi: 'tho dee',
  thoda: 'tho da',
  zaroori: 'zaroori',
  jaruri: 'zaroori',
};

const prepareHinglishSpeechText = (value: string) => {
  const normalizedValue = value.replace(/\s+/g, ' ').trim();
  const hasKnownHinglishWords = normalizedValue
    .toLowerCase()
    .match(/[a-z]+/g)
    ?.some((word) => Boolean(HINGLISH_HINDI_SPEECH_WORDS[word]));

  if (!hasKnownHinglishWords) return normalizedValue;

  return normalizedValue
    .replace(/\b[A-Za-z]+\b/g, (word) => HINGLISH_ROMAN_SPEECH_WORDS[word.toLowerCase()] || word)
    .replace(/\s+([,.!?;:\u0964])/g, '$1')
    .trim();
};

const chunkSpeechSegment = (segment: SpeechSegment) => {
  const maxChunkLength = 520;
  if (segment.text.length <= maxChunkLength) return [segment];

  const parts = segment.text.match(/[^.!?\u0964]+[.!?\u0964]?/g) || [segment.text];
  const chunks: SpeechSegment[] = [];
  let current = '';

  parts.forEach((part) => {
    const next = `${current} ${part}`.trim();
    if (next.length <= maxChunkLength) {
      current = next;
      return;
    }

    if (current) chunks.push({ ...segment, text: current });
    if (part.length <= maxChunkLength) {
      current = part.trim();
      return;
    }

    const words = part.trim().split(/\s+/);
    current = '';
    words.forEach((word) => {
      const wordNext = `${current} ${word}`.trim();
      if (wordNext.length > maxChunkLength && current) {
        chunks.push({ ...segment, text: current });
        current = word;
      } else {
        current = wordNext;
      }
    });
  });

  if (current) chunks.push({ ...segment, text: current });
  return chunks;
};

const getSpeechSegments = (value: string): SpeechSegment[] => {
  const rawSpeechText = getSpeechText(value);
  if (!rawSpeechText) return [];

  const languageStyle = detectUserLanguageStyle(rawSpeechText);
  const speechText = languageStyle === 'hinglish'
    ? prepareHinglishSpeechText(rawSpeechText)
    : rawSpeechText;
  if (!speechText) return [];

  return chunkSpeechSegment({
    text: speechText,
    script: languageStyle === 'hindi'
      ? 'hindi'
      : languageStyle === 'hinglish'
        ? 'hinglish'
        : 'latin',
  });
};

const getSegmentLanguage = (segment: SpeechSegment) => segment.script === 'hindi' ? 'hi-IN' : 'en-IN';

const getSegmentVoiceCandidates = (voices: SpeechSynthesisVoice[], segment: SpeechSegment) => {
  if (segment.script === 'hindi') return voices;

  const nonHindiVoices = voices.filter((voice) => !voice.lang.toLowerCase().startsWith('hi'));
  return nonHindiVoices.length ? nonHindiVoices : voices;
};

const getSegmentVoiceProfile = (profile: StudyVoiceProfile, segment: SpeechSegment): StudyVoiceProfile => {
  if (segment.script === 'hindi') return profile;

  return {
    ...profile,
    languagePriority: ['en-IN', 'en-GB', 'en-US'],
    voiceNameHints: [
      'neerja',
      'neeraja',
      'prabhat',
      'india',
      'indian',
      'english',
      'natural',
      'online',
      'microsoft',
      'google',
      ...profile.voiceNameHints.filter((hint) => !['swara', 'madhur', 'hindi'].includes(hint.toLowerCase())),
    ],
  };
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
  'susan',
];

const maleVoiceHints = [
  'ravi',
  'hemant',
  'prabhat',
  'madhur',
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

const getSpeechVoiceGender = (voice: SpeechSynthesisVoice) => {
  const voiceName = voice.name.toLowerCase();
  if (femaleVoiceHints.some((hint) => voiceName.includes(hint))) return 'female';
  if (maleVoiceHints.some((hint) => voiceName.includes(hint))) return 'male';
  return 'unknown';
};

const isVoiceLanguageMatch = (voice: SpeechSynthesisVoice, targetLanguage: string) => {
  const voiceLanguage = voice.lang.toLowerCase();
  const target = targetLanguage.toLowerCase();
  const targetBase = target.split('-')[0];
  return voiceLanguage === target || voiceLanguage.startsWith(`${targetBase}-`);
};

const isExactVoiceLanguageMatch = (voice: SpeechSynthesisVoice, targetLanguage: string) => {
  const voiceLanguage = voice.lang.toLowerCase();
  const target = targetLanguage.toLowerCase();
  return voiceLanguage === target || voiceLanguage.startsWith(`${target}-`);
};

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
  profile: StudyVoiceProfile,
) => {
  const voiceName = voice.name.toLowerCase();
  const voiceLanguage = voice.lang.toLowerCase();
  const target = targetLanguage.toLowerCase();
  const targetBase = target.split('-')[0];
  const exactTargetLanguage = isExactVoiceLanguageMatch(voice, targetLanguage);
  const targetLanguageMatch = isVoiceLanguageMatch(voice, targetLanguage);
  const isIndianVoice = isIndianSpeechVoice(voice);
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
  if (voiceName.includes('google')) score += 12;
  if (voiceName.includes('microsoft')) score += 16;
  if (!isIndianVoice && (target === 'en-in' || target === 'hi-in')) score -= 92;

  const voiceGender = getSpeechVoiceGender(voice);

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
  profile: StudyVoiceProfile,
) => {
  if (!voices.length) return undefined;

  return voices
    .slice()
    .sort((a, b) => scoreSpeechVoice(b, targetLanguage, profile) - scoreSpeechVoice(a, targetLanguage, profile))[0];
};

const waitForSpeechVoices = async () => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];

  const immediateVoices = window.speechSynthesis.getVoices();
  if (immediateVoices.length) return immediateVoices;

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener?.('voiceschanged', finish);
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.addEventListener?.('voiceschanged', finish, { once: true });
    window.setTimeout(finish, 900);
  });
};

const SearchCardPreview = ({
  thumbnailUrl,
  icon: Icon,
  tone,
  iconUrl,
}: {
  thumbnailUrl?: string;
  icon: StudyIcon;
  tone: StudyTone;
  iconUrl?: string;
}) => {
  const [previewFailed, setPreviewFailed] = useState(false);
  const showThumbnail = Boolean(thumbnailUrl && !previewFailed);

  if (showThumbnail) {
    return (
      <div className="study-card-preview relative h-28 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-inner dark:border-slate-800 dark:bg-slate-900">
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          className="h-full w-full bg-white object-cover object-top dark:bg-slate-900"
          onError={() => setPreviewFailed(true)}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950/35 to-transparent" />
      </div>
    );
  }

  return (
    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconUrl ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-950' : getToneBadgeClass(tone)}`}>
      {iconUrl ? (
        <img src={iconUrl} alt="" loading="lazy" className="h-8 w-8 object-contain" />
      ) : (
        <Icon className="h-6 w-6" aria-hidden="true" />
      )}
    </span>
  );
};

const SarathiThinkingIndicator = () => (
  <div className="study-ai-thinking w-full max-w-[34rem] rounded-[1.45rem] px-4 py-4">
    <div className="flex items-start gap-3">
      <span className="study-ai-thinking-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
        <SparklesIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-slate-900 dark:text-white">
            Sarathi is analyzing
          </p>
          <span className="study-ai-live-pill rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
            Live
          </span>
        </div>
        <div className="study-ai-step-stack mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
          <span className="study-ai-step study-ai-step-one">Understanding your question</span>
          <span className="study-ai-step study-ai-step-two">Checking study context</span>
          <span className="study-ai-step study-ai-step-three">Preparing a clear answer</span>
        </div>
      </div>
    </div>
    <div className="mt-4 space-y-2" aria-hidden="true">
      <span className="study-ai-scan-bar block h-2 w-11/12 rounded-full" />
      <span className="study-ai-scan-bar study-ai-scan-bar-two block h-2 w-2/3 rounded-full" />
      <span className="study-ai-scan-bar study-ai-scan-bar-three block h-2 w-5/6 rounded-full" />
    </div>
  </div>
);

const SarathiTypingCue = () => (
  <div className="study-ai-streaming-cue mt-2 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-black">
    <span className="study-ai-cursor" aria-hidden="true" />
    <span>Writing answer</span>
    <span className="flex items-center gap-0.5" aria-hidden="true">
      <span className="study-ai-dot" />
      <span className="study-ai-dot study-ai-dot-two" />
      <span className="study-ai-dot study-ai-dot-three" />
    </span>
  </div>
);

const StudySearchPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { preferences } = useStudyPreferences();
  const [searchParams] = useSearchParams();
  const initialQuery = getQueryFromParams(searchParams);
  const chatIdFromParams = searchParams.get('chat') || '';
  const [query, setQuery] = useState(initialQuery);
  const [activeChatId, setActiveChatId] = useState('');
  const [messages, setMessages] = useState<StudyAskMessage[]>([]);
  const [answerCards, setAnswerCards] = useState<StudyAskCard[]>([]);
  const [cardDisplayLimit, setCardDisplayLimit] = useState(CARD_PAGE_SIZE);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [voiceNotice, setVoiceNotice] = useState('');
  const [isListening, setListening] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState('');
  const [speakingMessageKey, setSpeakingMessageKey] = useState('');
  const [voiceProfileId, setVoiceProfileId] = useState<StudyVoiceProfileId>(() => getStoredStudyVoiceProfileId());
  const [voiceRate, setVoiceRate] = useState(() =>
    getStoredStudyVoiceRate(getStudyVoiceProfile(getStoredStudyVoiceProfileId()).rate)
  );
  const [isDesktopControlsOpen, setDesktopControlsOpen] = useState(false);
  const [speechVoices, setSpeechVoices] = useState<SpeechSynthesisVoice[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const speechRunRef = useRef('');
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechResumeTimerRef = useRef<number | null>(null);
  const autoSubmittedQueryRef = useRef('');

  const handleChatScroll = (event: UIEvent<HTMLDivElement>) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('studyhub:chat-scroll', {
      detail: { lifted: event.currentTarget.scrollTop > 8 },
    }));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('studyhub:chat-state', {
      detail: { hasContent: messages.length > 0 },
    }));
  }, [messages.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleVoiceProfileChange = (event: Event) => {
      const customEvent = event as CustomEvent<StudyVoiceProfileId>;
      setVoiceProfileId(customEvent.detail || getStoredStudyVoiceProfileId());
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      speechRunRef.current = '';
      setSpeakingMessageKey('');
    };

    window.addEventListener(STUDY_VOICE_PROFILE_CHANGED_EVENT, handleVoiceProfileChange as EventListener);
    return () => window.removeEventListener(STUDY_VOICE_PROFILE_CHANGED_EVENT, handleVoiceProfileChange as EventListener);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleVoiceRateChange = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      setVoiceRate(getStoredStudyVoiceRate(customEvent.detail));
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      speechRunRef.current = '';
      setSpeakingMessageKey('');
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

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      speechRunRef.current = '';
    };
  }, []);

  useEffect(() => {
    const resetChat = () => {
      if (isAiLoading) return;

      setLastActiveStudyChatId('');
      setActiveChatId('');
      setQuery('');
      setMessages([]);
      setAnswerCards([]);
      setAttachments([]);
      setCardDisplayLimit(CARD_PAGE_SIZE);
      setAiError('');
      setVoiceNotice('');
      setVoiceDraft('');
      setSpeakingMessageKey('');
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      speechRunRef.current = '';
      autoSubmittedQueryRef.current = '';
      navigate('/app/ask', { replace: true });
    };

    window.addEventListener('studyhub:new-chat', resetChat);
    return () => window.removeEventListener('studyhub:new-chat', resetChat);
  }, [isAiLoading, navigate]);

  useEffect(() => {
    if (!chatIdFromParams && (activeChatId || messages.length > 0 || isAiLoading)) return;

    const nextChatId = chatIdFromParams || getLastActiveStudyChatId();
    if (!nextChatId) return;

    if (nextChatId === activeChatId && messages.length > 0) return;

    const session = getStudyChatSession(nextChatId);
    if (!session) {
      if (nextChatId === activeChatId) return;
      setActiveChatId('');
      return;
    }

    setActiveChatId(nextChatId);
    setLastActiveStudyChatId(nextChatId);
    if (!chatIdFromParams) {
      navigate(`/app/ask?chat=${nextChatId}`, { replace: true });
    }
    setQuery('');
    setAttachments([]);
    setAiError('');
    setCardDisplayLimit(CARD_PAGE_SIZE);
    autoSubmittedQueryRef.current = '';

    setMessages(session.messages);
    setAnswerCards((session.answerCards || []) as StudyAskCard[]);
  }, [activeChatId, chatIdFromParams, isAiLoading, messages.length, navigate]);

  useEffect(() => {
    if (!activeChatId || messages.length === 0) return;
    setLastActiveStudyChatId(activeChatId);
    saveStudyChatSession({
      id: activeChatId,
      title: getStudyChatTitle(messages),
      messages,
      answerCards,
    });
  }, [activeChatId, answerCards, messages]);

  useEffect(() => {
    const urlQuery = getQueryFromParams(searchParams);
    setQuery(urlQuery);
  }, [searchParams]);

  useEffect(() => {
    if (messages.length === 0 && answerCards.length === 0 && !aiError) return;
    const frameId = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [messages, cardDisplayLimit, answerCards.length, aiError]);

  const displayedCards = answerCards.slice(0, cardDisplayLimit);
  const visibleCardCount = displayedCards.length;
  const hasMoreCards = answerCards.length > visibleCardCount;
  const hasProcessingAttachment = attachments.some((attachment) => attachment.status === 'processing');
  const canSubmit = !isAiLoading && !hasProcessingAttachment && Boolean(query.trim() || attachments.length);
  const hasChatContent = messages.length > 0 || answerCards.length > 0 || Boolean(aiError);

  const appendQuickAnswer = (userText: string, aiText: string) => {
    setMessages((current) => [
      ...current,
      { sender: 'user', text: userText },
      { sender: 'ai', text: aiText },
    ]);
  };

  const handleCardCommand = (nextQuery: string) => {
    if (!answerCards.length) return false;

    if (isAllCommand(nextQuery)) {
      setCardDisplayLimit(answerCards.length);
      appendQuickAnswer(nextQuery, `Showing all ${answerCards.length} available cards.`);
      return true;
    }

    if (isMoreCommand(nextQuery)) {
      if (!hasMoreCards) {
        appendQuickAnswer(nextQuery, 'All available cards are already shown.');
        return true;
      }

      const nextLimit = Math.min(cardDisplayLimit + CARD_PAGE_SIZE, answerCards.length);
      setCardDisplayLimit(nextLimit);
      appendQuickAnswer(nextQuery, `Showing ${nextLimit}/${answerCards.length} cards. Type "all" to view everything.`);
      return true;
    }

    return false;
  };

  const handleAttachmentInput = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []).slice(0, MAX_ATTACHMENTS);
    event.target.value = '';

    if (!selectedFiles.length) return;

    const availableSlots = Math.max(0, MAX_ATTACHMENTS - attachments.length);
    const filesToAdd = selectedFiles.slice(0, availableSlots);

    if (!filesToAdd.length) {
      setVoiceNotice(`Only ${MAX_ATTACHMENTS} files can be attached at once.`);
      return;
    }

    filesToAdd.forEach((file) => {
      const id = createAttachmentId();
      const baseAttachment: ComposerAttachment = {
        id,
        name: file.name,
        type: file.type || 'unknown',
        size: file.size,
        status: 'processing',
      };

      setAttachments((current) => [...current, baseAttachment]);

      void readAttachmentText(file)
        .then((result) => {
          setAttachments((current) =>
            current.map((attachment) =>
              attachment.id === id
                ? {
                    ...attachment,
                    status: result.status,
                    textPreview: result.textPreview,
                    error: result.error,
                  }
                : attachment,
            ),
          );
        })
        .catch(() => {
          setAttachments((current) =>
            current.map((attachment) =>
              attachment.id === id
                ? {
                    ...attachment,
                    status: 'error',
                    textPreview: '',
                    error: 'Could not read file',
                  }
                : attachment,
            ),
          );
        });
    });
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  };

  const appendTranscriptToQuery = (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    setQuery((current) => `${current.trim()} ${cleanText}`.trim());
  };

  const stopVoiceInput = () => {
    recognitionRef.current?.stop();
    setListening(false);
    setVoiceDraft('');
  };

  const stopVoiceOutput = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (speechResumeTimerRef.current) {
      window.clearInterval(speechResumeTimerRef.current);
      speechResumeTimerRef.current = null;
    }
    speechUtteranceRef.current = null;
    speechRunRef.current = '';
    setSpeakingMessageKey('');
  };

  const handleVoiceProfileSelect = (id: StudyVoiceProfileId) => {
    setVoiceProfileId(id);
    saveStoredStudyVoiceProfileId(id);
    stopVoiceOutput();
  };

  const handleVoiceRateChange = (rate: number) => {
    const nextRate = getStoredStudyVoiceRate(rate);
    setVoiceRate(nextRate);
    saveStoredStudyVoiceRate(nextRate);
    stopVoiceOutput();
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopVoiceInput();
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setVoiceNotice('Voice input is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    const voiceProfile = getStudyVoiceProfile(voiceProfileId);
    const queryLanguageStyle = detectUserLanguageStyle(query);
    recognition.lang = queryLanguageStyle === 'hindi'
      ? 'hi-IN'
      : queryLanguageStyle === 'hinglish'
        ? 'en-IN'
        : voiceProfile.recognitionLang;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setVoiceNotice('');
      setVoiceDraft('');
      setListening(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript || '';
        if (result?.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) appendTranscriptToQuery(finalTranscript);
      setVoiceDraft(interimTranscript.trim());
    };

    recognition.onerror = (event) => {
      setVoiceNotice(event.error === 'not-allowed' ? 'Microphone permission was blocked.' : 'Voice input paused. Tap mic again.');
      setListening(false);
      setVoiceDraft('');
    };

    recognition.onend = () => {
      setListening(false);
      setVoiceDraft('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const speakTextWithProfile = async (
    speechKey: string,
    value: string,
    profileId: StudyVoiceProfileId,
  ) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceNotice('Voice reply is not supported in this browser.');
      return;
    }

    if (speakingMessageKey === speechKey) {
      stopVoiceOutput();
      return;
    }

    const segments = getSpeechSegments(value);
    if (!segments.length) {
      setVoiceNotice('Nothing readable found in this answer.');
      return;
    }

    stopVoiceOutput();
    window.speechSynthesis.resume();
    const runId = `${speechKey}-${Date.now()}`;
    const voiceProfile = getStudyVoiceProfile(profileId);
    const availableVoices = speechVoices.length ? speechVoices : await waitForSpeechVoices();
    if (!speechVoices.length && availableVoices.length) setSpeechVoices(availableVoices);

    const finishSpeechRun = () => {
      if (speechRunRef.current !== runId) return;
      if (speechResumeTimerRef.current) {
        window.clearInterval(speechResumeTimerRef.current);
        speechResumeTimerRef.current = null;
      }
      speechUtteranceRef.current = null;
      speechRunRef.current = '';
      setSpeakingMessageKey('');
    };

    const speakUtterance = (utterance: SpeechSynthesisUtterance) => {
      speechUtteranceRef.current = utterance;
      window.setTimeout(() => {
        if (speechRunRef.current !== runId || speechUtteranceRef.current !== utterance) return;

        try {
          window.speechSynthesis.speak(utterance);
          window.speechSynthesis.resume();
        } catch {
          setVoiceNotice('Voice playback failed. Try another voice from Voice settings.');
          finishSpeechRun();
        }
      }, 90);
    };

    const speakSegment = (segmentIndex: number) => {
      if (speechRunRef.current !== runId) return;

      const segment = segments[segmentIndex];
      if (!segment) {
        finishSpeechRun();
        return;
      }

      const segmentLanguage = getSegmentLanguage(segment);
      const segmentVoices = getSegmentVoiceCandidates(availableVoices, segment);
      const segmentVoiceProfile = getSegmentVoiceProfile(voiceProfile, segment);
      const voice =
        pickSpeechVoice(segmentVoices, segmentLanguage, segmentVoiceProfile) ||
        availableVoices.find((availableVoice) => availableVoice.default) ||
        availableVoices[0];

      const buildUtterance = (usePreferredVoice: boolean) => {
        const utterance = new SpeechSynthesisUtterance(segment.text);
        utterance.lang = usePreferredVoice && voice ? voice.lang : segmentLanguage;
        if (usePreferredVoice && voice) utterance.voice = voice;
        utterance.rate = segment.script === 'hindi'
          ? Math.max(0.82, voiceRate - 0.02)
          : segment.script === 'hinglish'
            ? Math.min(0.98, Math.max(0.84, voiceRate - 0.01))
            : voiceRate;
        utterance.pitch = voiceProfile.pitch;
        utterance.volume = 1;
        return utterance;
      };

      const attachSpeechHandlers = (utterance: SpeechSynthesisUtterance, isFallback: boolean) => {
        let didStart = false;
        let startWatchdogId: number | null = window.setTimeout(() => {
          if (speechRunRef.current !== runId || didStart) return;
          if (startWatchdogId) {
            window.clearTimeout(startWatchdogId);
            startWatchdogId = null;
          }

          if (isFallback) {
            setVoiceNotice('Voice did not start. Check browser sound permission or try another voice.');
            finishSpeechRun();
            return;
          }

          window.speechSynthesis.cancel();
          const fallbackUtterance = buildUtterance(false);
          attachSpeechHandlers(fallbackUtterance, true);
          speakUtterance(fallbackUtterance);
        }, 1500);

        const clearStartWatchdog = () => {
          if (!startWatchdogId) return;
          window.clearTimeout(startWatchdogId);
          startWatchdogId = null;
        };

        utterance.onstart = () => {
          didStart = true;
          clearStartWatchdog();
          setVoiceNotice('');
        };

        utterance.onend = () => {
          clearStartWatchdog();
          speakSegment(segmentIndex + 1);
        };

        utterance.onerror = (event) => {
          clearStartWatchdog();
          if (speechRunRef.current !== runId || event.error === 'interrupted' || event.error === 'canceled') return;

          if (!isFallback) {
            const fallbackUtterance = buildUtterance(false);
            attachSpeechHandlers(fallbackUtterance, true);
            speakUtterance(fallbackUtterance);
            return;
          }

          setVoiceNotice('Voice playback failed. Try another voice from Voice settings.');
          finishSpeechRun();
        };
      };

      const utterance = buildUtterance(true);
      attachSpeechHandlers(utterance, false);
      speakUtterance(utterance);
    };

    setSpeakingMessageKey(speechKey);
    setVoiceNotice('Starting voice...');
    speechRunRef.current = runId;
    speechResumeTimerRef.current = window.setInterval(() => {
      if (speechRunRef.current !== runId) return;
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 1000);
    speakSegment(0);
  };

  const speakMessage = (messageKey: string, value: string) => {
    void speakTextWithProfile(messageKey, value, voiceProfileId);
  };

  const previewVoiceProfile = (profileId: StudyVoiceProfileId) => {
    void speakTextWithProfile(`voice-preview-${profileId}`, VOICE_PREVIEW_TEXT, profileId);
  };

  const askStudyHub = async (nextQuery: string, requestAttachments: StudyChatAttachment[] = []) => {
    if (!nextQuery || isAiLoading) return;

    if (!requestAttachments.length && handleCardCommand(nextQuery)) {
      setQuery('');
      return;
    }

    setAnswerCards([]);
    setCardDisplayLimit(CARD_PAGE_SIZE);
    setAiError('');

    const nextChatId = activeChatId || createStudyChatId();
    if (!activeChatId) {
      setActiveChatId(nextChatId);
      setLastActiveStudyChatId(nextChatId);
      navigate(`/app/ask?chat=${nextChatId}`, { replace: true });
    }

    const userMessage: StudyAskMessage = {
      sender: 'user',
      text: nextQuery,
      attachments: requestAttachments.length ? requestAttachments : undefined,
    };
    const aiPlaceholder: StudyAskMessage = { sender: 'ai', text: '' };
    const historyForApi = [...messages, userMessage];

    setMessages((current) => [...current, userMessage, aiPlaceholder]);
    setIsAiLoading(true);

    let fullAnswer = '';
    let pendingBuffer = '';

    try {
      const response = await fetch(`${API_BASE_URL}/api/study/ask/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: nextQuery,
          history: historyForApi,
          attachments: requestAttachments,
          preferredLanguage: preferences.language,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Study Hub AI request failed.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        pendingBuffer += decoder.decode(value, { stream: true });
        const events = pendingBuffer.split('\n\n');
        pendingBuffer = events.pop() || '';

        for (const event of events) {
          const payloads = parseSsePayloads(event);
          for (const payload of payloads) {
            let data: { cards?: StudyAskCard[]; chunk?: string };
            try {
              data = JSON.parse(payload);
            } catch {
              continue;
            }

            if (Array.isArray(data.cards)) {
              setAnswerCards(data.cards);
              setCardDisplayLimit(CARD_PAGE_SIZE);
            }

            if (data.chunk) {
              fullAnswer += data.chunk;
              setMessages((current) => {
                const updated = [...current];
                for (let index = updated.length - 1; index >= 0; index -= 1) {
                  if (updated[index].sender === 'ai') {
                    updated[index] = { sender: 'ai', text: fullAnswer };
                    break;
                  }
                }
                return updated;
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Study Hub AI failed:', error);
      const languageStyle = detectUserLanguageStyle(nextQuery);
      setAiError(getConnectionErrorText(languageStyle));
      setMessages((current) => {
        const updated = [...current];
        for (let index = updated.length - 1; index >= 0; index -= 1) {
          if (updated[index].sender === 'ai') {
            updated[index] = {
              sender: 'ai',
              text: getConnectionErrorText(languageStyle),
            };
            break;
          }
        }
        return updated;
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    const urlQuery = getQueryFromParams(searchParams).trim();
    if (!urlQuery || autoSubmittedQueryRef.current === urlQuery || messages.length > 0 || isAiLoading) return;

    autoSubmittedQueryRef.current = urlQuery;
    setQuery('');
    void askStudyHub(urlQuery);
  }, [searchParams, messages.length, isAiLoading]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const requestAttachments = attachments.filter((attachment) => attachment.status !== 'processing');
    const nextQuery = query.trim() || 'Summarize the attached file and suggest the most useful study actions.';
    setQuery('');
    setAttachments([]);
    setVoiceNotice('');
    void askStudyHub(nextQuery, requestAttachments);
  };

  const handleStarterPrompt = (value: string) => {
    if (isAiLoading) return;

    setQuery('');
    setAttachments([]);
    void askStudyHub(value);
  };

  const getCardKind = (card: StudyAskCard) => {
    if (card.files?.length) return `${card.files.length} file${card.files.length === 1 ? '' : 's'}`;
    if (card.iconKey === 'heading') return 'Heading';
    if (card.iconKey === 'pyq' || card.iconKey === 'paper' || card.iconKey === 'papers') return 'Papers';
    if (card.iconKey === 'notes') return 'Notes';
    if (card.iconKey === 'book' || card.iconKey === 'books') return 'Books';
    return 'Folder';
  };

  const getCardPath = (card: StudyAskCard) => {
    const path = card.pathNames?.length ? card.pathNames : [card.name];
    return path.join(' / ');
  };

  const renderAnswerCard = (card: StudyAskCard) => {
    const shortcutFile = getSingleFileShortcut(card);
    const isShortcutPdf = shortcutFile ? isStudyPdfUrl(shortcutFile.url, shortcutFile.mimeType) : false;
    const isShortcutReadable = shortcutFile ? isStudyReadableDocumentUrl(shortcutFile.url, shortcutFile.mimeType) : false;
    const isShortcutBookPackage = shortcutFile ? isStudyBookPackageUrl(shortcutFile.url, shortcutFile.mimeType) : false;
    const visual = shortcutFile
      ? isShortcutBookPackage
        ? getStudyCardVisual('book', 'emerald')
        : getStudyCardVisual('download', 'emerald')
      : getStudyCardVisual(card.iconKey, card.tone, card.name);
    const Icon = visual.icon;
    const title = getStudyCardDisplayTitle(card);
    const filePreview = (card.files || []).slice(0, 2).map((file) => file.name).join(', ');
    const thumbnailUrl = shortcutFile && !isShortcutPdf ? undefined : getPdfThumbnailUrl(shortcutFile || card.files?.[0]);
    const libraryItem = shortcutFile
      ? toStudyCardFileLibraryItem(shortcutFile, title)
      : toStudyCardLibraryItem(card, title);
    const tileClassName = 'study-card-surface group rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/[0.03] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_16px_38px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900 dark:ring-white/5 dark:hover:border-slate-700';
    const content = (
      <>
        <div className="flex items-start gap-3">
          <SearchCardPreview thumbnailUrl={thumbnailUrl} icon={Icon} tone={visual.tone} iconUrl={card.iconUrl || visual.iconUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {shortcutFile ? 'Direct file' : getCardKind(card)}
              </span>
              {card.files?.length ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                  <DocumentTextIcon className="h-3 w-3" aria-hidden="true" />
                  Files
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">
                  <FolderOpenIcon className="h-3 w-3" aria-hidden="true" />
                  Folder
                </span>
              )}
            </div>
            <h3 className="mt-3 line-clamp-2 text-base font-black leading-snug text-slate-950 dark:text-white">
              {title}
            </h3>
            <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {getCardPath(card)}
            </p>
          </div>
        </div>

        {filePreview && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
            <p className="line-clamp-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {filePreview}
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
          <span className="text-xs font-black uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
            {shortcutFile ? isShortcutReadable ? 'Open file' : 'Download file' : 'Open card'}
          </span>
          <div className="flex items-center gap-2">
            <SaveLibraryItemButton
              item={libraryItem}
              className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800"
            />
            <ArrowTopRightOnSquareIcon className="h-4 w-4 text-slate-400 transition group-hover:text-cyan-500" aria-hidden="true" />
          </div>
        </div>
      </>
    );

    if (shortcutFile) {
      if (!isShortcutReadable) {
        return (
          <a
            key={card._id}
            href={shortcutFile.url}
            target="_blank"
            rel="noreferrer"
            download
            className={tileClassName}
          >
            {content}
          </a>
        );
      }

      return (
        <Link
          key={card._id}
          to={getStudyPdfReaderHref(shortcutFile.url, title, `${location.pathname}${location.search}`)}
          onFocus={() => {
            if (isShortcutBookPackage) warmStudyReadableDocument(shortcutFile.url, shortcutFile.mimeType);
          }}
          onPointerEnter={() => {
            if (isShortcutBookPackage) warmStudyReadableDocument(shortcutFile.url, shortcutFile.mimeType);
          }}
          className={tileClassName}
        >
          {content}
        </Link>
      );
    }

    return (
      <Link
        key={card._id}
        to={`/app/workspace/${PLATFORM_WORKSPACE_SLUG}?card=${card._id}&parent=${ASK_PARENT_QUERY}`}
        className={tileClassName}
      >
        {content}
      </Link>
    );
  };

  const activeVoiceProfile = getStudyVoiceProfile(voiceProfileId);
  const previewingVoiceProfileId = speakingMessageKey.startsWith('voice-preview-')
    ? speakingMessageKey.replace('voice-preview-', '') as StudyVoiceProfileId
    : '';

  return (
    <div className="study-shell study-chat-page relative flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#eef3f8] pt-[calc(env(safe-area-inset-top)+3.5rem)] dark:bg-[#050814] lg:h-full lg:pt-0">
      <div className="flex min-h-0 flex-1 lg:flex-row">
      <AnimatePresence initial={false}>
        {isDesktopControlsOpen && (
          <motion.div
            key="chat-controls"
            initial={{ width: 0, opacity: 0, x: -14 }}
            animate={{ width: 320, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: -14 }}
            transition={{ type: 'tween', duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="hidden min-h-0 overflow-hidden lg:block"
          >
            <StudyChatControlsPanel
              activeChatId={activeChatId}
              voiceProfileId={voiceProfileId}
              voiceRate={voiceRate}
              previewingVoiceProfileId={previewingVoiceProfileId}
              onVoiceProfileChange={handleVoiceProfileSelect}
              onVoiceRateChange={handleVoiceRateChange}
              onVoicePreview={previewVoiceProfile}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="study-chat-main relative flex min-w-0 flex-1 flex-col">
      <button
        type="button"
        onClick={() => setDesktopControlsOpen((current) => !current)}
        className="study-control-surface absolute left-4 top-4 z-20 hidden h-10 w-10 items-center justify-center rounded-2xl text-slate-600 shadow-[0_12px_30px_rgba(15,23,42,0.10)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-105 hover:text-slate-950 active:scale-95 lg:inline-flex dark:text-slate-200 dark:hover:text-white"
        aria-label={isDesktopControlsOpen ? 'Hide chat controls' : 'Show chat controls'}
        title={isDesktopControlsOpen ? 'Hide chat controls' : 'Show chat controls'}
      >
        <span className="transition-transform duration-300">
          {isDesktopControlsOpen ? (
            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Bars3Icon className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
      </button>
      <div
        className={[
          'study-chat-canvas min-h-0 flex-1 overscroll-contain px-4 pb-4 pt-4 lg:px-8 lg:pb-6 lg:pt-16',
          hasChatContent
            ? 'study-scrollbar overflow-y-auto'
            : 'study-chat-canvas-empty overflow-hidden',
        ].join(' ')}
        onScroll={hasChatContent ? handleChatScroll : undefined}
      >
      <section className={['mx-auto w-full max-w-3xl', hasChatContent ? 'space-y-4' : 'h-full'].join(' ')}>
        {messages.length === 0 && (
          <div className="flex h-full min-h-0 items-center justify-center py-4">
            <div className="flex w-full flex-col items-center text-center">
              <span className="study-control-surface flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-cyan-700 shadow-[0_14px_32px_rgba(15,23,42,0.10)] ring-1 ring-white/80 dark:border-white/10 dark:text-cyan-100 dark:shadow-[0_14px_32px_rgba(0,0,0,0.18)] dark:ring-white/10">
                <SparklesIcon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white">Sarathi</h1>
              <div className="mt-7 grid w-full max-w-sm gap-2 sm:max-w-xl sm:grid-cols-2">
                {starterPrompts.map((starter) => (
                  <button
                    key={starter.title}
                    type="button"
                    onClick={() => handleStarterPrompt(starter.prompt)}
                    disabled={isAiLoading}
                    className="study-card-surface rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-left shadow-[0_8px_22px_rgba(15,23,42,0.07)] ring-1 ring-slate-950/[0.03] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_34px_rgba(15,23,42,0.10)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/5 dark:hover:border-slate-700"
                  >
                    <span className="block text-sm font-black text-slate-800 dark:text-slate-100">
                      {starter.title}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {starter.example}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.sender}-${index}-${message.text.slice(0, 20)}`}
            className={[
              'flex',
              message.sender === 'user' ? 'justify-end' : 'justify-start',
            ].join(' ')}
          >
            <div
              className={[
                'max-w-[min(44rem,92%)]',
                message.sender === 'user'
                  ? 'study-primary-action rounded-[1.35rem] rounded-br-md bg-slate-950 px-4 py-3 text-white shadow-sm dark:bg-white dark:text-slate-950'
                  : 'w-full px-1 py-2 text-slate-900 dark:text-slate-100',
              ].join(' ')}
            >
              {message.text ? (
                message.sender === 'ai' ? (
                  <div className="prose prose-sm max-w-none text-slate-700 prose-headings:mb-2 prose-headings:mt-3 prose-headings:font-black prose-p:my-2 prose-p:leading-7 prose-strong:text-slate-950 prose-ul:my-2 prose-li:my-1 dark:prose-invert dark:text-slate-200 dark:prose-strong:text-white">
                    <ReactMarkdown>{message.text}</ReactMarkdown>
                    {isAiLoading && index === messages.length - 1 ? <SarathiTypingCue /> : null}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm font-semibold leading-6">
                    {message.text}
                  </div>
                )
              ) : (
                <SarathiThinkingIndicator />
              )}
              {message.attachments?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.attachments.map((attachment) => (
                    <span
                      key={attachment.id}
                      className="inline-flex max-w-full items-center gap-2 rounded-xl bg-white/12 px-2.5 py-1.5 text-[11px] font-black text-white/90 ring-1 ring-white/15 dark:bg-slate-950/10 dark:text-slate-800 dark:ring-slate-950/10"
                    >
                      <DocumentTextIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{attachment.name}</span>
                    </span>
                  ))}
                </div>
              ) : null}
              {message.sender === 'ai' && message.text && !(isAiLoading && index === messages.length - 1) ? (
                <div className="mt-2 flex justify-start">
                  <button
                    type="button"
                    onClick={() => speakMessage(`${message.sender}-${index}`, message.text)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white/72 px-2.5 text-[11px] font-black text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:text-cyan-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:border-cyan-300/30 dark:hover:text-cyan-200"
                  >
                    {speakingMessageKey === `${message.sender}-${index}` ? (
                      <SpeakerXMarkIcon className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <SpeakerWaveIcon className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span>{speakingMessageKey === `${message.sender}-${index}` ? 'Stop' : 'Listen'}</span>
                    {speakingMessageKey !== `${message.sender}-${index}` && (
                      <span className="hidden opacity-70 sm:inline">{activeVoiceProfile.shortLabel}</span>
                    )}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </section>

      {aiError && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
          {aiError}
        </div>
      )}

      <AnimatePresence mode="wait">
        {isAiLoading && displayedCards.length === 0 && (
          <motion.div
            key="loading-results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mx-auto mt-5 w-full max-w-3xl rounded-2xl border border-slate-200/50 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="h-5 w-5 rounded-full border-2 border-slate-200 border-t-cyan-500 dark:border-slate-700 dark:border-t-cyan-400"
                />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Searching...</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Finding the best results for you</p>
            </div>
          </motion.div>
        )}

        {displayedCards.length > 0 && (
          <motion.section
            key="results-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="study-panel-surface mx-auto mt-5 w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.09)] ring-1 ring-slate-950/[0.03] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_20px_48px_rgba(0,0,0,0.42)] dark:ring-white/5"
          >
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-950 dark:text-white">
                    Results
                  </h2>
                  <motion.p
                    key={`count-${visibleCardCount}-${answerCards.length}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400"
                  >
                    {visibleCardCount}/{answerCards.length}
                  </motion.p>
                </div>
                {hasMoreCards && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextLimit = Math.min(cardDisplayLimit + CARD_PAGE_SIZE, answerCards.length);
                        setCardDisplayLimit(nextLimit);
                      }}
                      className="rounded-xl bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 transition hover:-translate-y-0.5 hover:bg-cyan-100 dark:bg-cyan-400/10 dark:text-cyan-200 dark:hover:bg-cyan-400/15"
                    >
                      More
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardDisplayLimit(answerCards.length)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-cyan-300/40 dark:hover:text-cyan-200"
                    >
                      All
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2 2xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {displayedCards.map((card, index) => (
                  <motion.div
                    key={card._id}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{
                      duration: 0.3,
                      delay: Math.min(index * 0.05, 0.15),
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    {renderAnswerCard(card)}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <div ref={messagesEndRef} />
      </div>

      <div
        data-no-swipe="true"
        className="study-chat-composer-rail study-bottom-nav shrink-0 bg-gradient-to-t from-[#eef3f8] via-[#eef3f8]/95 to-[#eef3f8]/70 px-2 pb-[calc(env(safe-area-inset-bottom)+5rem)] pt-3 shadow-[0_-18px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:from-[#050814] dark:via-[#050814]/95 dark:to-[#050814]/68 dark:shadow-[0_-22px_60px_rgba(0,0,0,0.30)] sm:px-3 lg:px-8 lg:pb-4 lg:pt-4"
      >
        <form
          onSubmit={handleSubmit}
          className="study-input-surface study-chat-input-surface mx-auto flex w-full max-w-none flex-col gap-2 rounded-[1.7rem] bg-white/82 px-2.5 py-2.5 shadow-[0_18px_42px_rgba(15,23,42,0.11),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-2xl transition focus-within:shadow-[0_22px_54px_rgba(8,145,178,0.15),inset_0_1px_0_rgba(255,255,255,0.76)] dark:bg-white/[0.075] dark:shadow-[0_22px_58px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.07)] dark:focus-within:shadow-[0_26px_68px_rgba(8,145,178,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] sm:max-w-3xl sm:px-3 lg:max-w-4xl"
        >
          {(attachments.length > 0 || isListening || voiceNotice) && (
            <div className="flex w-full flex-wrap items-center gap-2 px-1 pt-1">
              {attachments.map((attachment) => (
                <span
                  key={attachment.id}
                  className={[
                    'inline-flex max-w-full items-center gap-2 rounded-2xl px-2.5 py-1.5 text-[11px] font-black shadow-[0_8px_18px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.42)]',
                    attachment.status === 'processing'
                      ? 'bg-cyan-50 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-100'
                      : attachment.status === 'ready'
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-100'
                        : 'bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-100',
                  ].join(' ')}
                >
                  <DocumentTextIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="max-w-[11rem] truncate">{attachment.name}</span>
                  <span className="shrink-0 opacity-70">{attachment.status === 'processing' ? 'Reading' : formatAttachmentSize(attachment.size)}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.id)}
                    className="ml-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/70 text-current transition hover:bg-white dark:bg-white/10 dark:hover:bg-white/20"
                    aria-label={`Remove ${attachment.name}`}
                  >
                    <XMarkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </span>
              ))}
              {isListening && (
                <span className="inline-flex items-center gap-2 rounded-2xl bg-cyan-50 px-2.5 py-1.5 text-[11px] font-black text-cyan-800 shadow-[0_8px_18px_rgba(6,182,212,0.12),inset_0_1px_0_rgba(255,255,255,0.46)] dark:bg-cyan-400/10 dark:text-cyan-100">
                  <span className="flex items-center gap-0.5">
                    <span className="h-3 w-1 animate-pulse rounded-full bg-cyan-500" />
                    <span className="h-4 w-1 animate-pulse rounded-full bg-cyan-500 [animation-delay:120ms]" />
                    <span className="h-2.5 w-1 animate-pulse rounded-full bg-cyan-500 [animation-delay:240ms]" />
                  </span>
                  {voiceDraft || 'Listening...'}
                </span>
              )}
              {voiceNotice && !isListening && (
                <span className="rounded-2xl bg-amber-50 px-2.5 py-1.5 text-[11px] font-black text-amber-800 shadow-[0_8px_18px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.42)] dark:bg-amber-400/10 dark:text-amber-100">
                  {voiceNotice}
                </span>
              )}
            </div>
          )}

          <div className="flex w-full items-center gap-1.5 sm:gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md,.csv,.json,.html,.xml,text/*,application/pdf"
              className="hidden"
              onChange={handleAttachmentInput}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAiLoading || attachments.length >= MAX_ATTACHMENTS}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/72 text-slate-600 shadow-[0_8px_22px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.74)] transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-white/[0.075] dark:text-slate-200 dark:shadow-[0_10px_24px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] dark:hover:bg-white/[0.12] dark:hover:text-white sm:h-10 sm:w-10"
              aria-label="Attach file"
            >
              <PaperClipIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
              placeholder={attachments.length ? 'Ask about attached file' : 'Message Sarathi'}
              className="study-chat-input min-h-11 min-w-0 flex-1 bg-transparent px-1 text-[15px] font-semibold text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
            />
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={isAiLoading}
              className={[
                'relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-45 sm:h-10 sm:w-10',
                isListening
                  ? 'bg-gradient-to-br from-slate-600 via-slate-500 to-slate-300 text-white shadow-[0_12px_30px_rgba(15,23,42,0.22),0_0_0_6px_rgba(148,163,184,0.12)]'
                  : 'bg-white/72 text-slate-600 shadow-[0_8px_22px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.74)] hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 dark:bg-white/[0.075] dark:text-slate-200 dark:shadow-[0_10px_24px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] dark:hover:bg-white/[0.12] dark:hover:text-white',
              ].join(' ')}
              aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            >
              {isListening && <span className="absolute inset-0 rounded-full border border-white/45" aria-hidden="true" />}
              <MicrophoneIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="study-primary-action inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:disabled:bg-white/10 dark:disabled:text-slate-500 sm:h-10 sm:w-10"
              aria-label="Ask"
            >
              <ArrowUpIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
      </div>
      </div>
    </div>
  );
};

export default StudySearchPage;
