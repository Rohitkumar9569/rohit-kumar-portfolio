export const STUDY_VOICE_PROFILE_STORAGE_KEY = 'study-hub-voice-profile';
export const STUDY_VOICE_RATE_STORAGE_KEY = 'study-hub-voice-rate';
export const STUDY_VOICE_PROFILE_CHANGED_EVENT = 'studyhub:voice-profile-changed';
export const STUDY_VOICE_RATE_CHANGED_EVENT = 'studyhub:voice-rate-changed';

export type StudyVoiceProfileId =
  | 'indian-female'
  | 'indian-male'
  | 'hindi-female'
  | 'hindi-male'
  | 'balanced-natural';

export interface StudyVoiceProfile {
  id: StudyVoiceProfileId;
  label: string;
  shortLabel: string;
  description: string;
  gender: 'female' | 'male' | 'any';
  languagePriority: string[];
  voiceNameHints: string[];
  recognitionLang: string;
  rate: number;
  pitch: number;
}

export const defaultStudyVoiceRate = 0.94;
export const minStudyVoiceRate = 0.75;
export const maxStudyVoiceRate = 1.08;

export const studyVoiceProfiles: StudyVoiceProfile[] = [
  {
    id: 'indian-female',
    label: 'Neerja - Indian Female',
    shortLabel: 'Female IN',
    description: 'Clear Indian English + Hinglish',
    gender: 'female',
    languagePriority: ['en-IN', 'hi-IN', 'en-GB', 'en-US'],
    voiceNameHints: [
      'neerja',
      'neeraja',
      'neerja online',
      'microsoft neerja',
      'swara',
      'microsoft swara',
      'heera',
      'microsoft heera',
      'kalpana',
      'google hindi',
      'india',
      'indian',
      'hindi',
      'asha',
      'kavya',
      'meera',
      'female',
    ],
    recognitionLang: 'en-IN',
    rate: 0.93,
    pitch: 1.04,
  },
  {
    id: 'indian-male',
    label: 'Prabhat - Indian Male',
    shortLabel: 'Male IN',
    description: 'Clear Indian English + Hinglish',
    gender: 'male',
    languagePriority: ['en-IN', 'hi-IN', 'en-GB', 'en-US'],
    voiceNameHints: [
      'prabhat',
      'prabhat online',
      'microsoft prabhat',
      'madhur',
      'microsoft madhur',
      'hemant',
      'ravi',
      'india',
      'indian',
      'hindi',
      'arjun',
      'aarav',
      'kiran',
      'male',
    ],
    recognitionLang: 'en-IN',
    rate: 0.93,
    pitch: 0.92,
  },
  {
    id: 'hindi-female',
    label: 'Swara - Hindi Female',
    shortLabel: 'Hindi F',
    description: 'Natural Hindi + Hinglish',
    gender: 'female',
    languagePriority: ['hi-IN', 'en-IN', 'en-GB', 'en-US'],
    voiceNameHints: [
      'swara',
      'swara online',
      'microsoft swara',
      'heera',
      'microsoft heera',
      'kalpana',
      'neerja',
      'neeraja',
      'google hindi',
      'india',
      'indian',
      'hindi',
      'meera',
      'kavya',
      'female',
    ],
    recognitionLang: 'hi-IN',
    rate: 0.91,
    pitch: 1,
  },
  {
    id: 'hindi-male',
    label: 'Madhur - Hindi Male',
    shortLabel: 'Hindi M',
    description: 'Natural Hindi + Hinglish',
    gender: 'male',
    languagePriority: ['hi-IN', 'en-IN', 'en-GB', 'en-US'],
    voiceNameHints: [
      'madhur',
      'madhur online',
      'microsoft madhur',
      'hemant',
      'ravi',
      'prabhat',
      'microsoft prabhat',
      'india',
      'indian',
      'hindi',
      'kabir',
      'arjun',
      'male',
    ],
    recognitionLang: 'hi-IN',
    rate: 0.91,
    pitch: 0.92,
  },
  {
    id: 'balanced-natural',
    label: 'Natural Balanced',
    shortLabel: 'Natural',
    description: 'Best available Indian match',
    gender: 'any',
    languagePriority: ['en-IN', 'hi-IN', 'en-GB', 'en-US'],
    voiceNameHints: [
      'neerja',
      'swara',
      'madhur',
      'heera',
      'prabhat',
      'india',
      'indian',
      'hindi',
      'natural',
      'online',
      'premium',
      'google',
      'microsoft',
    ],
    recognitionLang: 'en-IN',
    rate: 0.94,
    pitch: 0.98,
  },
];

export const defaultStudyVoiceProfileId: StudyVoiceProfileId = 'indian-female';

export const getStudyVoiceProfile = (id?: string | null) =>
  studyVoiceProfiles.find((profile) => profile.id === id) ||
  studyVoiceProfiles.find((profile) => profile.id === defaultStudyVoiceProfileId) ||
  studyVoiceProfiles[0];

export const getStoredStudyVoiceProfileId = (): StudyVoiceProfileId => {
  if (typeof window === 'undefined') return defaultStudyVoiceProfileId;
  const stored = window.localStorage.getItem(STUDY_VOICE_PROFILE_STORAGE_KEY);
  return getStudyVoiceProfile(stored).id;
};

export const saveStoredStudyVoiceProfileId = (id: StudyVoiceProfileId) => {
  if (typeof window === 'undefined') return;
  const profile = getStudyVoiceProfile(id);
  window.localStorage.setItem(STUDY_VOICE_PROFILE_STORAGE_KEY, profile.id);
  window.dispatchEvent(new CustomEvent(STUDY_VOICE_PROFILE_CHANGED_EVENT, { detail: profile.id }));
};

const clampStudyVoiceRate = (value: number) =>
  Math.min(maxStudyVoiceRate, Math.max(minStudyVoiceRate, Number.isFinite(value) ? value : defaultStudyVoiceRate));

export const getStoredStudyVoiceRate = (fallback = defaultStudyVoiceRate) => {
  if (typeof window === 'undefined') return clampStudyVoiceRate(fallback);
  const storedValue = Number(window.localStorage.getItem(STUDY_VOICE_RATE_STORAGE_KEY));
  return clampStudyVoiceRate(Number.isFinite(storedValue) && storedValue > 0 ? storedValue : fallback);
};

export const saveStoredStudyVoiceRate = (rate: number) => {
  if (typeof window === 'undefined') return;
  const nextRate = clampStudyVoiceRate(Number(rate));
  window.localStorage.setItem(STUDY_VOICE_RATE_STORAGE_KEY, String(nextRate));
  window.dispatchEvent(new CustomEvent(STUDY_VOICE_RATE_CHANGED_EVENT, { detail: nextRate }));
};
