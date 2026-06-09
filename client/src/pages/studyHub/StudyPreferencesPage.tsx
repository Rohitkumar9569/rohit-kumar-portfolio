import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowPathIcon,
  ArrowRightIcon,
  CheckIcon,
  EnvelopeIcon,
  LockClosedIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import {
  StudyActionButton,
} from '../../components/study/StudyPremium';
import { fetchAccountProfile, updateAccountProfile } from '../../accountApi';
import { getStudyCardVisual } from '../../components/study/StudyVisualCards';
import {
  StudyHomeTileContent,
  studyHomeFloatingActionClassName,
  studyHomeTileClassName,
} from '../../components/study/StudyHomeTile';
import { useAuth } from '../../context/AuthContext';
import { useStudyPreferences } from '../../hooks/useStudyPreferences';
import { fetchStudyCards, type StudyCard } from '../../studyHubApi';
import { getStudyCardDisplayTitle } from '../../utils/studyCardNavigation';
import { getDefaultStudyPreferences } from '../../utils/studyPreferences';

const PLATFORM_WORKSPACE_SLUG = 'study-hub';
const MAX_SECTION_CARDS = 5;
const PROFILE_CATEGORY_LIMIT = 6;
const SECTION_LIMIT_TOAST_ID_PREFIX = 'study-section-card-limit';

const compactPanelClassName =
  'px-0 py-1';

const focusGridClassName = 'grid grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-4 lg:grid-cols-5';
const accountFieldShellClassName =
  'study-input-surface study-account-field mt-2 flex min-h-14 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition duration-200 dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[0_18px_42px_rgba(0,0,0,0.34)]';
const accountInputClassName =
  'min-w-0 flex-1 !border-0 !bg-transparent !shadow-none !outline-none !ring-0 text-base font-semibold text-slate-950 placeholder:text-slate-400 focus:!border-0 focus:!shadow-none focus:!outline-none focus:!ring-0 focus-visible:!outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:text-white sm:text-sm';
const accountReadonlyInputClassName =
  `${accountInputClassName} cursor-not-allowed text-slate-600 dark:text-slate-300`;
const accountLabelClassName = 'text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400';
const getFocusShelfLimit = () => {
  if (typeof window === 'undefined') return 5;
  if (window.matchMedia('(min-width: 640px)').matches) return 5;
  return 4;
};

const useFocusShelfLimit = () => {
  const [limit, setLimit] = useState(getFocusShelfLimit);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateLimit = () => setLimit(getFocusShelfLimit());
    const desktopQuery = window.matchMedia('(min-width: 1280px)');
    const tabletQuery = window.matchMedia('(min-width: 768px)');
    desktopQuery.addEventListener('change', updateLimit);
    tabletQuery.addEventListener('change', updateLimit);
    updateLimit();

    return () => {
      desktopQuery.removeEventListener('change', updateLimit);
      tabletQuery.removeEventListener('change', updateLimit);
    };
  }, []);

  return limit;
};

const getSelectionLabel = (count: number) => `${count} selected`;

const getSelectedSectionCount = (sections: Record<string, string[]>) =>
  Object.values(sections).reduce((total, slugs) => total + slugs.length, 0);

const fillSectionSelection = (seedSlugs: string[], cards: StudyCard[]) => {
  const validSlugs = new Set(cards.map((card) => card.slug));
  const selected = seedSlugs.filter((slug) => validSlugs.has(slug)).slice(0, MAX_SECTION_CARDS);
  const seen = new Set(selected);
  for (const card of cards) {
    if (selected.length >= MAX_SECTION_CARDS) break;
    if (seen.has(card.slug)) continue;
    selected.push(card.slug);
    seen.add(card.slug);
  }
  return selected;
};

const StudyPreferencesPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { preferences, savePreferences, clearPreferences } = useStudyPreferences();
  const focusShelfLimit = useFocusShelfLimit();
  const [accountName, setAccountName] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedSectionCardSlugs, setSelectedSectionCardSlugs] = useState<Record<string, string[]>>(
    preferences.selectedSectionCardSlugs || {}
  );
  const [defaultFocusSlug, setDefaultFocusSlug] = useState(
    preferences.activeWorkspaceSlug || preferences.selectedWorkspaceSlugs[0] || ''
  );
  const [expandedFocusGroups, setExpandedFocusGroups] = useState<Set<string>>(new Set());

  const { data: account, isLoading: isAccountLoading } = useQuery({
    queryKey: ['account-profile'],
    queryFn: fetchAccountProfile,
    enabled: isAuthenticated,
    retry: false,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (!account) return;
    setAccountName(account.name || '');
    setAccountEmail(account.email || '');
    setCurrentPassword('');
    setNewPassword('');
  }, [account]);

  const { data: headings = [], isLoading } = useQuery({
    queryKey: ['study-cards', PLATFORM_WORKSPACE_SLUG, 'setup-root'],
    queryFn: () => fetchStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent: 'root' }),
    placeholderData: [],
    retry: false,
    staleTime: 1000 * 60 * 3,
  });

  const orderedHeadings = useMemo(
    () => headings.slice().sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name)),
    [headings]
  );
  const homePreferenceCategories = useMemo(
    () => orderedHeadings.slice(0, PROFILE_CATEGORY_LIMIT),
    [orderedHeadings]
  );
  const { data: childrenByHeadingId = {}, isFetching: isPreferenceCardsFetching } = useQuery<Record<string, StudyCard[]>>({
    queryKey: ['study-cards', PLATFORM_WORKSPACE_SLUG, 'profile-home-categories', homePreferenceCategories.map((heading) => heading._id).join(',')],
    queryFn: async () => {
      const entries = await Promise.all(
        homePreferenceCategories.map(async (heading) => {
          const children = await fetchStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent: heading._id });
          const orderedChildren = children.slice().sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
          return [heading._id, orderedChildren] as const;
        })
      );
      return Object.fromEntries(entries);
    },
    enabled: homePreferenceCategories.length > 0,
    placeholderData: {},
    retry: false,
    staleTime: 1000 * 60 * 3,
  });
  const allPreferenceExamCards = useMemo(
    () => homePreferenceCategories.flatMap((heading) => childrenByHeadingId[heading._id] || []),
    [childrenByHeadingId, homePreferenceCategories]
  );
  const selectedTotal = useMemo(
    () => getSelectedSectionCount(selectedSectionCardSlugs),
    [selectedSectionCardSlugs]
  );

  useEffect(() => {
    if (!homePreferenceCategories.length) return;

    setSelectedSectionCardSlugs((current) => {
      let changed = false;
      const next: Record<string, string[]> = {};

      homePreferenceCategories.forEach((category) => {
        const cards = childrenByHeadingId[category._id] || [];
        if (!cards.length) return;

        const savedSection = current[category.slug] || preferences.selectedSectionCardSlugs?.[category.slug] || [];
        const legacySelected = preferences.selectedWorkspaceSlugs.filter((slug) =>
          cards.some((card) => card.slug === slug)
        );
        const legacyRootSelected = preferences.selectedWorkspaceSlugs.includes(category.slug)
          ? cards.slice(0, MAX_SECTION_CARDS).map((card) => card.slug)
          : [];
        const filled = fillSectionSelection(
          savedSection.length ? savedSection : legacySelected.length ? legacySelected : legacyRootSelected,
          cards
        );

        next[category.slug] = filled;
        if ((current[category.slug] || []).join('|') !== filled.join('|')) changed = true;
      });

      if (Object.keys(current).some((sectionSlug) => !next[sectionSlug])) changed = true;
      return changed ? next : current;
    });
  }, [childrenByHeadingId, homePreferenceCategories, preferences.selectedSectionCardSlugs, preferences.selectedWorkspaceSlugs]);

  useEffect(() => {
    if (!allPreferenceExamCards.length) return;

    const flattenedSelectedSlugs = homePreferenceCategories.flatMap((category) => selectedSectionCardSlugs[category.slug] || []);
    const selectedSlugs = flattenedSelectedSlugs.length ? flattenedSelectedSlugs : allPreferenceExamCards.map((card) => card.slug);
    setDefaultFocusSlug((current) => {
      if (current && selectedSlugs.includes(current)) return current;
      return selectedSlugs[0] || allPreferenceExamCards[0].slug;
    });
  }, [allPreferenceExamCards, homePreferenceCategories, selectedSectionCardSlugs]);

  const toggleExam = (category: StudyCard, exam: StudyCard) => {
    setSelectedSectionCardSlugs((current) => {
      const currentSection = current[category.slug] || [];
      const exists = currentSection.includes(exam.slug);
      if (!exists && currentSection.length >= MAX_SECTION_CARDS) {
        toast.error(`${category.name} is full. Uncheck one card before choosing another.`, {
          id: `${SECTION_LIMIT_TOAST_ID_PREFIX}-${category.slug}`,
          duration: 2400,
          position: 'top-center',
        });
        return current;
      }

      const nextSection = exists
        ? currentSection.filter((slug) => slug !== exam.slug)
        : [...currentSection, exam.slug];
      const next = {
        ...current,
        [category.slug]: nextSection,
      };
      setDefaultFocusSlug((currentDefault) => (
        Object.values(next).flat().includes(currentDefault) ? currentDefault : Object.values(next).flat()[0] || exam.slug
      ));
      return next;
    });
  };

  const toggleFocusGroup = (group: string) => {
    setExpandedFocusGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const renderFocusMoreButton = (group: string, total: number) => {
    if (total <= focusShelfLimit) return null;

    const expanded = expandedFocusGroups.has(group);
    return (
      <div className="flex justify-center pt-1">
        <button
          type="button"
          onClick={() => toggleFocusGroup(group)}
          className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-cyan-300/30 dark:hover:text-cyan-100"
        >
          {expanded ? 'Show less' : `${total - focusShelfLimit} more`}
        </button>
      </div>
    );
  };

  const handleSave = (destination: 'home' | 'heading') => {
    const fallbackExam = allPreferenceExamCards[0];
    if (!fallbackExam) {
      navigate('/app');
      return;
    }

    const selectedSectionSlugs = Object.fromEntries(
      homePreferenceCategories.map((category) => {
        const cards = childrenByHeadingId[category._id] || [];
        return [
          category.slug,
          fillSectionSelection(selectedSectionCardSlugs[category.slug] || [], cards),
        ] as const;
      }).filter(([, slugs]) => slugs.length)
    ) as Record<string, string[]>;
    const selected = homePreferenceCategories
      .flatMap((category) => selectedSectionSlugs[category.slug] || [])
      .filter(Boolean);
    const activeSlug = selected.includes(defaultFocusSlug) ? defaultFocusSlug : selected[0];
    const nextActiveCard =
      allPreferenceExamCards.find((card) => card.slug === activeSlug) ||
      fallbackExam;

    savePreferences({
      onboardingCompleted: true,
      selectedWorkspaceSlugs: selected,
      selectedSectionCardSlugs: selectedSectionSlugs,
      activeWorkspaceSlug: activeSlug,
      language: preferences.language,
      preferredResourceTypes: preferences.preferredResourceTypes,
      interviewProfile: preferences.interviewProfile,
    });

    navigate(destination === 'heading' ? `/app/workspace/${PLATFORM_WORKSPACE_SLUG}?card=${nextActiveCard._id}` : '/app');
  };

  const handleReset = () => {
    const defaults = getDefaultStudyPreferences();
    const resetSectionSlugs = Object.fromEntries(
      homePreferenceCategories.map((category) => [
        category.slug,
        (childrenByHeadingId[category._id] || []).slice(0, MAX_SECTION_CARDS).map((card) => card.slug),
      ] as const).filter(([, slugs]) => slugs.length)
    ) as Record<string, string[]>;
    const safeSelected = homePreferenceCategories
      .flatMap((category) => resetSectionSlugs[category.slug] || [])
      .filter(Boolean);
    const safeActive = safeSelected.includes(defaults.activeWorkspaceSlug || '')
      ? defaults.activeWorkspaceSlug || safeSelected[0]
      : safeSelected[0] || '';

    clearPreferences();
    setSelectedSectionCardSlugs(resetSectionSlugs);
    setDefaultFocusSlug(safeActive);
  };

  const handleAccountSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAuthenticated) return;

    if (newPassword && newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    const savedAccount = await toast.promise(updateAccountProfile({
      name: accountName.trim(),
      currentPassword,
      newPassword,
    }), {
      loading: 'Updating profile...',
      success: 'Profile updated',
      error: (error: any) => error?.response?.data?.message || 'Profile update failed',
    });

    setAccountName(savedAccount.name || '');
    setAccountEmail(savedAccount.email || '');
    setCurrentPassword('');
    setNewPassword('');
  };

  const renderExamCard = (category: StudyCard, exam: StudyCard) => {
    const visual = getStudyCardVisual(exam.iconKey, exam.tone, exam.name);
    const iconUrl = exam.iconUrl || visual.iconUrl;
    const isSelected = (selectedSectionCardSlugs[category.slug] || []).includes(exam.slug);
    const title = getStudyCardDisplayTitle(exam);

    return (
      <button
        key={exam._id}
        type="button"
        onClick={() => toggleExam(category, exam)}
        className={studyHomeTileClassName}
        aria-pressed={isSelected}
      >
        <StudyHomeTileContent
          icon={visual.icon}
          tone={visual.tone}
          title={title}
          meta=""
          iconUrl={iconUrl}
        />

        <span
          className={['pointer-events-none', studyHomeFloatingActionClassName].join(' ')}
          aria-pressed={isSelected}
          aria-hidden="true"
        >
          <CheckIcon className={['h-4 w-4 transition', isSelected ? 'opacity-100' : 'opacity-0'].join(' ')} />
        </span>
      </button>
    );
  };

  return (
    <div className="w-full max-w-none space-y-5 px-0 pb-24 lg:pb-0">
      {isAuthenticated && (
        <section className={[compactPanelClassName, 'p-0'].join(' ')}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)] dark:bg-white dark:text-slate-950">
                <UserCircleIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-black text-slate-950 dark:text-white">Account</h2>
              </div>
            </div>
            {account?.role && (
              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {account.role}
              </span>
            )}
          </div>

          <form onSubmit={(event) => void handleAccountSave(event)} className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className={accountLabelClassName}>Name</span>
              <span className={accountFieldShellClassName}>
                <UserCircleIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                <input
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  className={accountInputClassName}
                  disabled={isAccountLoading}
                  placeholder="Your name"
                  maxLength={120}
                />
              </span>
            </label>

            <label className="block">
              <span className={accountLabelClassName}>Email</span>
              <span className={[accountFieldShellClassName, 'study-account-field-readonly'].join(' ')}>
                <EnvelopeIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                <input
                  value={accountEmail}
                  className={accountReadonlyInputClassName}
                  disabled={isAccountLoading}
                  placeholder="email@example.com"
                  readOnly
                  aria-readonly="true"
                  type="email"
                  maxLength={254}
                />
              </span>
            </label>

            <label className="block">
              <span className={accountLabelClassName}>Current password</span>
              <span className={accountFieldShellClassName}>
                <LockClosedIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                <input
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className={accountInputClassName}
                  disabled={isAccountLoading}
                  placeholder="Current password"
                  type="password"
                  autoComplete="current-password"
                />
              </span>
            </label>

            <label className="block">
              <span className={accountLabelClassName}>New password</span>
              <span className={accountFieldShellClassName}>
                <LockClosedIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                <input
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className={accountInputClassName}
                  disabled={isAccountLoading}
                  placeholder="New password"
                  type="password"
                  autoComplete="new-password"
                />
              </span>
            </label>

            <div className="md:col-span-2">
              <StudyActionButton type="submit" disabled={isAccountLoading}>
                Save account
              </StudyActionButton>
            </div>
          </form>
        </section>
      )}

      <section className={[compactPanelClassName, 'p-0'].join(' ')}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)] dark:bg-white dark:text-slate-950">
              <Squares2X2Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-slate-950 dark:text-white">Selected exams</h2>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {getSelectionLabel(selectedTotal)} / {homePreferenceCategories.length * MAX_SECTION_CARDS}
          </span>
        </div>

        {isLoading || (isPreferenceCardsFetching && allPreferenceExamCards.length === 0) ? (
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="study-card-surface h-44 animate-pulse rounded-[1.25rem] border border-white/75 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-900 sm:h-44">
                <div className="h-10 w-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <div className="mt-12 h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : homePreferenceCategories.length ? (
          <div className="space-y-5">
            {homePreferenceCategories.map((category) => {
              const categoryCards = childrenByHeadingId[category._id] || [];
              const isMoreExpanded = expandedFocusGroups.has(category._id);
              const visibleCards = isMoreExpanded ? categoryCards : categoryCards.slice(0, focusShelfLimit);

              return (
                <section key={category._id} className="space-y-3">
                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 first:border-t-0 first:pt-0 dark:border-white/10">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-black text-slate-950 dark:text-white sm:text-lg">
                        {category.name}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                      {getSelectionLabel((selectedSectionCardSlugs[category.slug] || []).length)} / {Math.min(MAX_SECTION_CARDS, categoryCards.length)}
                    </span>
                  </div>

                  {visibleCards.length > 0 ? (
                    <>
                      <div className={focusGridClassName}>
                        {visibleCards.map((card) => renderExamCard(category, card))}
                      </div>
                      {renderFocusMoreButton(category._id, categoryCards.length)}
                    </>
                  ) : (
                    <div className="rounded-[1.25rem] border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Cards are not available in this category yet.</p>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.35rem] border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">No heading yet</h2>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              Add the first catalog heading to set preferences.
            </p>
          </div>
        )}
      </section>

      <section className={[compactPanelClassName, 'hidden gap-3 p-4 sm:flex-row sm:items-center sm:justify-end lg:flex'].join(' ')}>
        <div className="flex flex-wrap gap-2">
          <StudyActionButton
            type="button"
            onClick={handleReset}
            variant="secondary"
          >
            <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
            Reset
          </StudyActionButton>
          <StudyActionButton
            type="button"
            onClick={() => handleSave('home')}
          >
            Save
          </StudyActionButton>
          <StudyActionButton
            type="button"
            onClick={() => handleSave('heading')}
            variant="secondary"
          >
            Open heading
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </StudyActionButton>
        </div>
      </section>

      <div className="study-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-[#eef3f8]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3 shadow-[0_-16px_36px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#050814]/95 dark:shadow-[0_-18px_44px_rgba(0,0,0,0.38)] lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            aria-label="Reset preferences"
          >
            <ArrowPathIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => handleSave('home')}
            className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => handleSave('heading')}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-[0_16px_34px_rgba(15,23,42,0.18)] dark:bg-white dark:text-slate-950"
          >
            Open
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyPreferencesPage;
