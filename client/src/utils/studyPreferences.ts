import type { StudyResource, StudyWorkspace } from '../studyHubApi';

const STORAGE_KEY = 'study-hub-preferences';

export type StudyLanguage = StudyResource['language'];

export interface LocalInterviewProfile {
  homeState: string;
  graduationStream: string;
  hobbies: string[];
}

export interface LocalStudyPreferences {
  onboardingCompleted: boolean;
  selectedWorkspaceSlugs: string[];
  selectedSectionCardSlugs: Record<string, string[]>;
  activeWorkspaceSlug?: string;
  activePhase?: string;
  language: StudyLanguage;
  selectedSubjects: string[];
  preferredResourceTypes: StudyResource['type'][];
  interviewProfile: LocalInterviewProfile;
  updatedAt: string;
}

export const getDefaultStudyPreferences = (): LocalStudyPreferences => ({
  onboardingCompleted: false,
  selectedWorkspaceSlugs: ['upsc-cse'],
  selectedSectionCardSlugs: {},
  activeWorkspaceSlug: 'upsc-cse',
  activePhase: 'prelims',
  language: 'hinglish',
  selectedSubjects: [],
  preferredResourceTypes: ['pyq', 'notes', 'book', 'syllabus', 'qa', 'practice', 'update'],
  interviewProfile: {
    homeState: '',
    graduationStream: '',
    hobbies: [],
  },
  updatedAt: new Date().toISOString(),
});

const normalizeInterviewProfile = (profile?: Partial<LocalInterviewProfile>): LocalInterviewProfile => ({
  homeState: (profile?.homeState || '').trim().slice(0, 80),
  graduationStream: (profile?.graduationStream || '').trim().slice(0, 120),
  hobbies: (profile?.hobbies || [])
    .map((hobby) => hobby.trim())
    .filter(Boolean)
    .slice(0, 12),
});

const normalizePreferences = (preferences: Partial<LocalStudyPreferences>): LocalStudyPreferences => {
  const defaults = getDefaultStudyPreferences();
  const selectedWorkspaceSlugs = preferences.selectedWorkspaceSlugs?.length
    ? preferences.selectedWorkspaceSlugs
    : defaults.selectedWorkspaceSlugs;
  const selectedSectionCardSlugs = Object.fromEntries(
    Object.entries(preferences.selectedSectionCardSlugs || {})
      .map(([sectionSlug, cardSlugs]) => [
        sectionSlug.trim().toLowerCase(),
        Array.isArray(cardSlugs)
          ? cardSlugs
            .map((slug) => String(slug).trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 5)
          : [],
      ])
      .filter(([sectionSlug, cardSlugs]) => sectionSlug && (cardSlugs as string[]).length)
  ) as Record<string, string[]>;

  return {
    ...defaults,
    ...preferences,
    selectedWorkspaceSlugs,
    selectedSectionCardSlugs,
    activeWorkspaceSlug: preferences.activeWorkspaceSlug || selectedWorkspaceSlugs[0] || defaults.activeWorkspaceSlug,
    selectedSubjects: preferences.selectedSubjects || defaults.selectedSubjects,
    preferredResourceTypes: preferences.preferredResourceTypes || defaults.preferredResourceTypes,
    interviewProfile: normalizeInterviewProfile(preferences.interviewProfile || defaults.interviewProfile),
    updatedAt: preferences.updatedAt || defaults.updatedAt,
  };
};

export const getLocalStudyPreferences = (): LocalStudyPreferences => {
  if (typeof window === 'undefined') return getDefaultStudyPreferences();

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultStudyPreferences();
    return normalizePreferences(JSON.parse(stored) as Partial<LocalStudyPreferences>);
  } catch {
    return getDefaultStudyPreferences();
  }
};

export const saveLocalStudyPreferences = (
  nextPreferences: Partial<LocalStudyPreferences>
): LocalStudyPreferences => {
  const current = getLocalStudyPreferences();
  const next = normalizePreferences({
    ...current,
    ...nextPreferences,
    updatedAt: new Date().toISOString(),
  });

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('study-preferences-updated', { detail: next }));
  }

  return next;
};

export const clearLocalStudyPreferences = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('study-preferences-updated', {
      detail: getDefaultStudyPreferences(),
    }));
  }
};

export const findPreferredWorkspace = (
  workspaces: StudyWorkspace[],
  preferences: LocalStudyPreferences
) => {
  return (
    workspaces.find((workspace) => workspace.slug === preferences.activeWorkspaceSlug) ||
    workspaces.find((workspace) => preferences.selectedWorkspaceSlugs.includes(workspace.slug)) ||
    workspaces[0]
  );
};
