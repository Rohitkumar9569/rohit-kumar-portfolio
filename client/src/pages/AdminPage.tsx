import { lazy, Suspense, startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AcademicCapIcon,
  ArrowLeftOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon as BookOpenOutlineIcon,
  CheckCircleIcon,
  ChartBarSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentListIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  FolderPlusIcon,
  HomeIcon as HomeOutlineIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon as Squares2X2OutlineIcon,
  TrashIcon,
  UsersIcon as UsersOutlineIcon,
} from '@heroicons/react/24/outline';
import {
  BookOpenIcon as BookOpenSolidIcon,
  ClipboardDocumentListIcon as ClipboardDocumentListSolidIcon,
  HomeIcon as HomeSolidIcon,
  Squares2X2Icon as Squares2X2SolidIcon,
  UsersIcon as UsersSolidIcon,
} from '@heroicons/react/24/solid';
import API from '../api';
import ThemeToggleButton from '../components/ThemeToggleButton';
import StudyHubLogo from '../components/study/StudyHubLogo';
import { useAuth } from '../context/AuthContext';
import {
  adminPermissionOptions,
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  type AdminPermissionKey,
  type AdminScope,
  type AdminUser,
} from '../adminApi';
import {
  STUDY_QUERY_GC_TIME_MS,
  STUDY_QUERY_STALE_TIME_MS,
  createAdminStudyCard,
  deleteAdminStudyCard,
  fetchAdminStudyCards,
  fetchAdminStudyRequests,
  prepareAdminNcertBooks,
  researchAdminKitWithAi,
  updateAdminStudyCard,
  updateAdminStudyCardPublication,
  updateAdminStudyRequest,
  type AdminKitAiSuggestion,
  type StudyCard,
  type StudyCardPayload,
  type StudyResourceRequest,
} from '../studyHubApi';
import ASSETS from '../assets';
import { getStudyCardVisual, inferStudyIconKey, studyIconOptions } from '../components/study/StudyVisualCards';
import { premiumCardClassName, premiumSurfaceClassName } from '../components/study/StudyPremium';
import {
  inferStudyGoalType,
  studyGoalTypeOptions,
  type StudyGoalType,
} from '../utils/studyHierarchy';
import {
  focusFirstMatchingElement,
  getAltDigitIndex,
  isPlainKeyboardKey,
} from '../utils/keyboardNavigation';
import { confirmAdminAction } from '../utils/adminConfirm';
import {
  getStudyCardListCacheKey,
  readStudyCardListCache,
  writeStudyCardListCache,
} from '../utils/studyCardCache';
import { fetchAccountProfile } from '../accountApi';

const PLATFORM_WORKSPACE_SLUG = 'study-hub';
type StudyTone = StudyCard['tone'];
type AdminPanel = 'dashboard' | 'library' | 'kits' | 'review' | 'users';
type AdminPromptInputType = 'text' | 'email' | 'password';

type AdminPromptDialog = {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  defaultValue: string;
  placeholder?: string;
  inputType: AdminPromptInputType;
};

type AdminExamOption = {
  _id: string;
  name: string;
  shortName: string;
  slug: string;
};

const panelItems: Array<{
  key: AdminPanel;
  label: string;
  icon: typeof ChartBarSquareIcon;
  activeIcon: typeof ChartBarSquareIcon;
}> = [
  { key: 'dashboard', label: 'Home', icon: HomeOutlineIcon, activeIcon: HomeSolidIcon },
  { key: 'library', label: 'Library', icon: BookOpenOutlineIcon, activeIcon: BookOpenSolidIcon },
  { key: 'kits', label: 'Kits', icon: Squares2X2OutlineIcon, activeIcon: Squares2X2SolidIcon },
  { key: 'review', label: 'Review', icon: ClipboardDocumentListIcon, activeIcon: ClipboardDocumentListSolidIcon },
  { key: 'users', label: 'Users', icon: UsersOutlineIcon, activeIcon: UsersSolidIcon },
];

const legacyPanelMap: Record<string, AdminPanel> = {
  overview: 'dashboard',
  explorer: 'library',
  content: 'library',
  builder: 'kits',
  create: 'kits',
  catalog: 'review',
  preview: 'review',
  recycle: 'review',
  access: 'users',
};

const RaisedAdminNavIcon = ({
  icon: Icon,
  activeIcon: ActiveIcon,
  isActive,
}: {
  icon: typeof ChartBarSquareIcon;
  activeIcon?: typeof ChartBarSquareIcon;
  isActive: boolean;
}) => {
  const RenderIcon = isActive && ActiveIcon ? ActiveIcon : Icon;

  return (
    <span
      className={[
        'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] transition duration-200',
        isActive
          ? 'study-nav-icon-active text-slate-950'
          : 'text-slate-500 group-hover:bg-slate-100 group-hover:text-slate-950 dark:text-slate-400 dark:group-hover:bg-slate-800 dark:group-hover:text-white',
      ].join(' ')}
    >
      {isActive && (
        <span className="pointer-events-none absolute inset-0 rounded-[1rem] bg-gradient-to-br from-white/48 via-transparent to-cyan-400/16 dark:from-white/38 dark:to-cyan-100/18" />
      )}
      <RenderIcon className="relative h-5 w-5" aria-hidden="true" />
    </span>
  );
};

const inputClassName = 'w-full rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2.5 text-sm font-semibold text-[#f3f3f3] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition placeholder:text-[#8a8a8a] focus:border-[#4cc2ff] focus:bg-white/[0.075] focus:ring-2 focus:ring-[#4cc2ff]/20';
const primaryButtonClassName = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-100/30 bg-[#5fd0ff] px-4 text-sm font-black text-[#071014] shadow-[0_16px_34px_rgba(76,194,255,0.22)] transition hover:bg-[#8ddeff] active:scale-[0.99] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.055] disabled:text-[#777] disabled:shadow-none disabled:active:scale-100';
const secondaryButtonClassName = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm font-black text-[#e8e8e8] shadow-sm transition hover:border-cyan-200/25 hover:bg-white/[0.095] active:scale-[0.99] disabled:cursor-not-allowed disabled:text-[#777] disabled:active:scale-100';
const defaultAdminPermissions = adminPermissionOptions.map((option) => option.key);
const panelPermissionMap: Partial<Record<AdminPanel, AdminPermissionKey>> = {
  library: 'library:view',
  kits: 'kits:manage',
  review: 'review:manage',
  users: 'users:manage',
};
const adminPanelClassName = `${premiumSurfaceClassName} p-4`;
const adminCardClassName = `${premiumCardClassName} p-4`;
const LibraryExplorer = lazy(() => import('../components/admin/StudyDriveExplorer'));
const libraryPanelFallback = (
  <div className={`${adminPanelClassName} min-h-[70vh]`}>
    <div className="relative overflow-hidden rounded-[2.2rem] border border-cyan-400/25 bg-[radial-gradient(circle_at_top_left,rgba(95,208,255,0.30),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.34),0_0_0_1px_rgba(255,255,255,0.04)_inset] sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(120,119,198,0.22),transparent_30%)]" />
      <div className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/15 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100 shadow-[0_0_24px_rgba(95,208,255,0.16)]">
            <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Premium Library
          </div>
          <div className="h-3 w-32 animate-pulse rounded-full bg-white/15" />
          <div className="h-9 w-[18rem] max-w-full rounded-[1.1rem] bg-white/15 animate-pulse" />
          <div className="h-4 w-[24rem] max-w-full rounded-full bg-white/12 animate-pulse" />
        </div>
        <div className="flex items-center gap-3 rounded-[1.2rem] border border-white/15 bg-white/[0.08] px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="h-10 w-10 animate-pulse rounded-2xl bg-white/15" />
          <div className="space-y-2">
            <div className="h-2.5 w-16 rounded-full bg-white/15 animate-pulse" />
            <div className="h-2.5 w-24 rounded-full bg-white/15 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="relative mt-8 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.5rem] border border-white/15 bg-slate-950/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="h-4 w-36 rounded-full bg-white/15 animate-pulse" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-[1.15rem] border border-white/12 bg-white/[0.06] p-3">
                <div className="h-10 w-10 animate-pulse rounded-2xl bg-white/15" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded-full bg-white/15 animate-pulse" />
                  <div className="h-3 w-1/2 rounded-full bg-white/12 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/15 bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded-full bg-white/15 animate-pulse" />
            <div className="h-8 w-20 rounded-[1rem] border border-white/15 bg-white/[0.05]" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-[1.15rem] border border-white/12 bg-slate-950/20 p-3">
                <div className="h-3 w-16 rounded-full bg-white/15 animate-pulse" />
                <div className="mt-3 h-6 w-20 rounded-full bg-white/15 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
const adminMetricClassName = `${premiumCardClassName} rounded-2xl px-3 py-2`;
const adminMiniCardClassName = `${premiumCardClassName} rounded-2xl p-3`;
const adminEmptyStateClassName = `${premiumSurfaceClassName} border-dashed p-8 text-center`;
const kitTemplateStorageKey = 'study-hub-admin-kit-templates-v1';

type ExamKitTemplate = {
  id: string;
  name: string;
  category: string;
  body: string;
  examName: string;
  description: string;
  goalType?: StudyGoalType;
  iconKey?: string;
  tone?: StudyTone;
  paths: string[][];
  updatedAt: string;
};

type KitAiTemplateInput = ExamKitTemplate & {
  source?: 'saved' | 'library' | 'draft';
  sourceCardId?: string;
};

type KitBranchClipboard = {
  action: 'copy' | 'cut';
  path: string[];
};

type ExamKitDraft = {
  id: string;
  name: string;
  category: string;
  body: string;
  examName: string;
  description: string;
  goalType: StudyGoalType;
  iconKey: string;
  tone: StudyTone;
  pathsText: string;
};

type KitTreeNode = {
  key: string;
  name: string;
  children: KitTreeNode[];
};

const createBlankKitDraft = (): ExamKitDraft => ({
  id: '',
  name: '',
  category: '',
  body: '',
  examName: '',
  description: '',
  goalType: 'exam',
  iconKey: 'exam',
  tone: 'indigo',
  pathsText: '',
});

const parseKitPaths = (value: string) => {
  const seen = new Set<string>();
  return value
    .split(/\r?\n/)
    .map((line) => line.split('/').map((part) => part.trim()).filter(Boolean))
    .filter((parts) => parts.length > 0)
    .filter((parts) => {
      const key = parts.join(' / ').toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const serializeKitPaths = (paths: string[][]) => paths.map((path) => path.join(' / ')).join('\n');

const normalizeKey = (value: string) => value.trim().toLowerCase();

const kitRootOrder = [
  'Syllabus',
  'Previous Year Papers',
  'Study Material',
  'Mock Tests',
  'Answer Keys',
  'Updates',
  'Strategy',
  'Interview',
];
const kitMaxStudentPathDepth = 3;

const compactKitNamePart = (value: string) => {
  const replacements: Array<[RegExp, string]> = [
    [/\bCivil Services Examination\b/gi, 'CSE'],
    [/\bCivil Services Exam\b/gi, 'CSE'],
    [/\bComprehensive\b/gi, ''],
    [/\bContent Kit\b/gi, 'Kit'],
    [/\bPYQs?\b/gi, 'Previous Year Papers'],
    [/\bPrevious Year Question Papers?\b/gi, 'Previous Year Papers'],
    [/\bMock Test\b/gi, 'Mock Tests'],
    [/\bStudy Materials\b/gi, 'Study Material'],
    [/\bAnswer Key\b/gi, 'Answer Keys'],
    [/\bPractice Tests?\b/gi, 'Practice'],
    [/\bPractice Sets?\b/gi, 'Practice'],
    [/\bQuestion Banks?\b/gi, 'Question Bank'],
    [/\bModel Papers?\b/gi, 'Model Papers'],
    [/\bGeneral Studies\b/gi, 'GS'],
    [/\bBasic Numeracy & Data Interpretation\b/gi, 'Numeracy & DI'],
    [/\bLogical Reasoning & Aptitude\b/gi, 'Reasoning'],
    [/\bDecision Making & Problem Solving\b/gi, 'Decision Making'],
    [/\bIndian Polity & Governance\b/gi, 'Polity'],
    [/\bEnvironment & Ecology\b/gi, 'Environment'],
    [/\bScience & Technology\b/gi, 'Science & Tech'],
    [/\bInternational Relations\b/gi, 'IR'],
    [/\bInternal Security\b/gi, 'Security'],
    [/\bNotifications & Updates\b/gi, 'Updates'],
    [/\bNotifications\b/gi, 'Updates'],
    [/\bExam Updates? & Alerts?\b/gi, 'Updates'],
    [/\bExam Strategy\b/gi, 'Strategy'],
    [/\bSubject-wise Strategy\b/gi, 'Subject Strategy'],
    [/\bInterview Preparation\b/gi, 'Interview'],
    [/\bInterview FAQs?\b/gi, 'FAQs'],
    [/\bRecruitment Alerts?\b/gi, 'Recruitment'],
    [/\bImportant Dates?\b/gi, 'Dates'],
    [/\bPrevious Year Cut-?offs?\b/gi, 'Cut-offs'],
    [/^TCS National Qualifier Test$/gi, 'TCS'],
    [/^TCS NQT$/gi, 'TCS'],
    [/^Infosys Off-Campus$/gi, 'Infosys'],
    [/^Wipro Elite and NTH$/gi, 'Wipro'],
    [/^Wipro Elite NTH$/gi, 'Wipro'],
    [/^Placement Private$/gi, 'Placement / Private'],
    [/\bToppers'? Notes & Strategy\b/gi, 'Topper Strategy'],
    [/\bCompulsory Language\b/gi, 'Language'],
    [/\bOptional Subjects\b/gi, 'Optional'],
    [/\bDaily Updates\b/gi, 'Daily'],
    [/\bWeekly Compilations\b/gi, 'Weekly'],
    [/\bMonthly Compilations\b/gi, 'Monthly'],
    [/\bYearly Compilations\b/gi, 'Yearly'],
  ];

  return replacements
    .reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), value)
    .replace(/\s{2,}/g, ' ')
    .replace(/\bCSE\s+\(CSE\)/gi, 'CSE')
    .replace(/\bKit\s+Kit\b/gi, 'Kit')
    .replace(/\s+\/\s+/g, ' / ')
    .replace(/\s+\)/g, ')')
    .replace(/\(\s+/g, '(')
    .trim();
};

const kitRootTokenIgnoreList = new Set([
  'and',
  'exam',
  'exams',
  'folder',
  'folders',
  'india',
  'indian',
  'kit',
  'library',
  'content',
  'collection',
  'document',
  'documents',
  'resource',
  'resources',
  'preparation',
]);

const kitGenericPathPartKeys = new Set([
  'all',
  'content',
  'documents',
  'exam',
  'exams',
  'folder',
  'folders',
  'library',
  'materials',
  'preparation',
  'resources',
  'section',
  'sections',
  'topic',
  'topics',
]);

const getKitLabelTokens = (value: string) =>
  normalizeKey(compactKitNamePart(value))
    .replace(/&/g, ' and ')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !kitRootTokenIgnoreList.has(token));

const isLikelyRedundantRootPart = (part: string, rootParts: string[]) => {
  if (!rootParts.length) return false;
  const normalizedPart = normalizeKey(compactKitNamePart(part));
  if (rootParts.some((rootPart) => normalizeKey(compactKitNamePart(rootPart)) === normalizedPart)) return true;

  const partTokens = getKitLabelTokens(part);
  if (!partTokens.length) return false;
  const rootTokens = new Set(rootParts.flatMap(getKitLabelTokens));
  const sharedTokens = partTokens.filter((token) => rootTokens.has(token)).length;
  return sharedTokens === partTokens.length;
};

const stripRedundantKitRootParts = (path: string[], rootParts: string[] = []) => {
  let nextPath = path.map(compactKitNamePart).filter(Boolean);
  while (nextPath.length > 1 && isLikelyRedundantRootPart(nextPath[0], rootParts)) {
    nextPath = nextPath.slice(1);
  }
  return nextPath;
};

const getCompactKitPathPart = (parts: string[]) => {
  const compacted = parts.map(compactKitNamePart).filter(Boolean);
  if (!compacted.length) return '';
  return compacted
    .join(' ')
    .replace(/\b(Updates|Papers|Tests|Material|Keys)\b(?:\s+\1\b)+/gi, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const compactKitPathForStudentClicks = (path: string[], rootParts: string[] = []) => {
  const withoutRoot = stripRedundantKitRootParts(path, rootParts);
  const cleanedParts = withoutRoot.reduce<string[]>((result, part) => {
    const normalizedPart = normalizeKey(part);
    const previousPart = result[result.length - 1] || '';
    if (!part) return result;
    if (kitGenericPathPartKeys.has(normalizedPart) && withoutRoot.length > 1) return result;
    if (previousPart && normalizeKey(previousPart) === normalizedPart) return result;
    if (previousPart && isLikelyRedundantRootPart(part, [previousPart])) return result;
    return [...result, part];
  }, []);

  if (cleanedParts.length <= kitMaxStudentPathDepth) return cleanedParts;

  return [
    cleanedParts[0],
    cleanedParts[1],
    getCompactKitPathPart(cleanedParts.slice(2)),
  ].filter(Boolean);
};

const getKitPathNodeCount = (paths: string[][]) => {
  const uniqueNodeKeys = new Set<string>();
  paths.forEach((path) => {
    path.forEach((_, index) => {
      uniqueNodeKeys.add(normalizeKey(path.slice(0, index + 1).join(' / ')));
    });
  });
  return uniqueNodeKeys.size;
};

const getKitRootRank = (value: string) => {
  const normalized = normalizeKey(value);
  const index = kitRootOrder.findIndex((item) => normalizeKey(item) === normalized || normalized.includes(normalizeKey(item)));
  return index >= 0 ? index : kitRootOrder.length;
};

const polishKitPaths = (paths: string[][], rootParts: string[] = []) => {
  const seen = new Set<string>();
  const uniquePaths = paths
    .map((path) => compactKitPathForStudentClicks(path, rootParts))
    .filter((path) => {
      const key = normalizeKey(path.join(' / '));
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return uniquePaths
    .filter((path) => !uniquePaths.some((otherPath) => otherPath.length > path.length && isKitPathPrefix(path, otherPath)))
    .sort((a, b) => (
      getKitRootRank(a[0] || '') - getKitRootRank(b[0] || '') ||
      (a[0] || '').localeCompare(b[0] || '') ||
      a.join(' / ').localeCompare(b.join(' / '))
    ));
};

const getKitPathIconKey = (path: string[]) => {
  return inferStudyIconKey(path.join(' '), 'folder');
};

const isKitPathPrefix = (prefix: string[], path: string[]) => (
  prefix.length <= path.length &&
  prefix.every((part, index) => normalizeKey(part) === normalizeKey(path[index] || ''))
);

const analyzeKitPaths = (value: string) => {
  const rawPaths = value
    .split(/\r?\n/)
    .map((line) => line.split('/').map((part) => part.trim()).filter(Boolean))
    .filter((parts) => parts.length > 0);
  const uniquePaths = parseKitPaths(value);
  const seen = new Set<string>();
  let duplicateCount = 0;
  rawPaths.forEach((path) => {
    const key = normalizeKey(path.join(' / '));
    if (seen.has(key)) duplicateCount += 1;
    seen.add(key);
  });
  const uniqueNodeKeys = new Set<string>();
  uniquePaths.forEach((path) => {
    path.forEach((_, index) => {
      uniqueNodeKeys.add(normalizeKey(path.slice(0, index + 1).join(' / ')));
    });
  });

  return {
    paths: uniquePaths,
    rawCount: rawPaths.length,
    duplicateCount,
    maxDepth: uniquePaths.reduce((max, path) => Math.max(max, path.length), 0),
    nodeCount: uniqueNodeKeys.size,
  };
};

const buildKitTree = (paths: string[][]) => {
  const rootNodes: KitTreeNode[] = [];

  paths.forEach((path) => {
    let level = rootNodes;
    let prefix = '';
    path.forEach((part) => {
      prefix = prefix ? `${prefix} / ${part}` : part;
      let node = level.find((item) => normalizeKey(item.name) === normalizeKey(part));
      if (!node) {
        node = { key: prefix, name: part, children: [] };
        level.push(node);
      }
      level = node.children;
    });
  });

  return rootNodes;
};

const isValidKitTemplate = (value: unknown): value is ExamKitTemplate => {
  if (!value || typeof value !== 'object') return false;
  const template = value as Partial<ExamKitTemplate>;
  return Boolean(
    typeof template.id === 'string' &&
    typeof template.name === 'string' &&
    typeof template.category === 'string' &&
    typeof template.body === 'string' &&
    typeof template.examName === 'string' &&
    typeof template.description === 'string' &&
    typeof template.updatedAt === 'string' &&
    (template.iconKey === undefined || typeof template.iconKey === 'string') &&
    (template.tone === undefined || ['blue', 'violet', 'emerald', 'amber', 'rose', 'cyan', 'indigo', 'slate'].includes(template.tone as string)) &&
    Array.isArray(template.paths) &&
    template.paths.every((path) => Array.isArray(path) && path.every((part) => typeof part === 'string'))
  );
};

const loadKitTemplates = (): ExamKitTemplate[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(kitTemplateStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidKitTemplate);
  } catch {
    return [];
  }
};

const saveKitTemplatesToStorage = (templates: ExamKitTemplate[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(kitTemplateStorageKey, JSON.stringify(templates));
};

const createKitId = () => `kit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const splitKitRootPath = (value: string) => {
  const rawParts = value.split('/').map((part) => part.trim()).filter(Boolean);
  const parts: string[] = [];

  for (let index = 0; index < rawParts.length; index += 1) {
    const current = rawParts[index];
    const next = rawParts[index + 1];
    const pair = `${current} / ${next || ''}`.toLowerCase();
    if (next && (pair === 'placement / private' || pair === 'icse / isc')) {
      parts.push(`${current} / ${next}`);
      index += 1;
    } else {
      parts.push(current);
    }
  }

  return parts;
};

const expandKitPathParts = (parts: string[]) =>
  parts.flatMap((part) => splitKitRootPath(part)).map((part) => part.trim()).filter(Boolean);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const normalizeCompanyNameKey = (value: string) =>
  compactKitNamePart(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const companyLogoDomains = new Map<string, string>([
  ['tcs', 'tcs.com'],
  ['tata consultancy services', 'tcs.com'],
  ['infosys', 'infosys.com'],
  ['wipro', 'wipro.com'],
  ['cognizant', 'cognizant.com'],
  ['accenture', 'accenture.com'],
  ['capgemini', 'capgemini.com'],
  ['hcltech', 'hcltech.com'],
  ['hcl technologies', 'hcltech.com'],
  ['tech mahindra', 'techmahindra.com'],
  ['ibm', 'ibm.com'],
  ['deloitte', 'deloitte.com'],
  ['amazon', 'amazon.com'],
  ['microsoft', 'microsoft.com'],
  ['google', 'google.com'],
  ['adobe', 'adobe.com'],
  ['oracle', 'oracle.com'],
  ['zoho', 'zoho.com'],
  ['flipkart', 'flipkart.com'],
  ['phonepe', 'phonepe.com'],
  ['razorpay', 'razorpay.com'],
  ['paytm', 'paytm.com'],
  ['goldman sachs', 'goldmansachs.com'],
  ['jp morgan', 'jpmorganchase.com'],
  ['jpmorgan', 'jpmorganchase.com'],
  ['jpmorgan chase', 'jpmorganchase.com'],
  ['morgan stanley', 'morganstanley.com'],
  ['deutsche bank', 'deutschebank.com'],
  ['barclays', 'barclays.com'],
  ['hsbc', 'hsbc.com'],
]);

const getCompanyLogoUrl = (name: string) => {
  const domain = companyLogoDomains.get(normalizeCompanyNameKey(name));
  return domain ? `https://logo.clearbit.com/${domain}` : '';
};

const inferCardStyle = (): { iconKey: string; tone: StudyTone } => {
  return { iconKey: 'folder', tone: 'blue' };
};

const buildCardPayload = (
  parentId: string | null,
  name: string,
  order: number,
  overrides: Partial<Pick<StudyCardPayload, 'status' | 'visibility' | 'goalType' | 'iconKey' | 'tone' | 'iconUrl'>> = {},
): StudyCardPayload => {
  const inferred = inferCardStyle();
  const iconUrl = overrides.iconUrl || getCompanyLogoUrl(name);
  return {
    workspaceSlug: PLATFORM_WORKSPACE_SLUG,
    parentId,
    name,
    slug: slugify(name),
    goalType: overrides.goalType || (parentId ? 'resource_folder' : 'exam_category'),
    iconKey: overrides.iconKey || inferred.iconKey,
    iconUrl,
    tone: overrides.tone || inferred.tone,
    order,
    status: overrides.status || 'published',
    visibility: overrides.visibility || 'public',
  };
};

const payloadFromCard = (
  card: StudyCard,
  overrides: Partial<Pick<StudyCardPayload, 'name' | 'status' | 'visibility' | 'parentId'>> = {},
): StudyCardPayload => ({
  workspaceSlug: PLATFORM_WORKSPACE_SLUG,
  parentId: overrides.parentId !== undefined ? overrides.parentId : card.parentId || null,
  name: overrides.name || card.name,
  slug: slugify(overrides.name || card.name),
  goalType: card.goalType || inferStudyGoalType(card),
  iconKey: card.iconKey,
  iconUrl: card.iconUrl || '',
  tone: card.tone,
  order: card.order,
  status: overrides.status || card.status,
  visibility: overrides.visibility || card.visibility,
});

const formatDate = (value?: string) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCount = (count: number, singular: string, plural = `${singular}s`) =>
  `${count.toLocaleString('en-IN')} ${count === 1 ? singular : plural}`;

const getCardFileCount = (card: StudyCard) => card.fileCount ?? card.files?.length ?? 0;

const getCardDirectFileCount = (cards: StudyCard[]) =>
  cards.reduce((total, card) => total + getCardFileCount(card), 0);

const getRequestWorkspaceLabel = (request: StudyResourceRequest) => {
  const workspace = request.workspaceId;
  if (workspace && typeof workspace === 'object') {
    return workspace.shortName || workspace.name || workspace.slug || 'Study Hub';
  }
  return 'Study Hub';
};

const getRequestRequesterLabel = (request: StudyResourceRequest) => {
  const requester = request.requester;
  if (requester && typeof requester === 'object') {
    return requester.name || requester.email || 'Student';
  }
  return 'Student';
};

const formatAdminDate = (value?: string) => {
  if (!value) return 'New';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'New';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isAdminKeyboardInputTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]'));
};

const StatusBadge = ({ children, tone = 'slate' }: { children: string; tone?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' }) => {
  const toneClass = {
    cyan: 'bg-[#243a47] text-[#9cdcfe]',
    emerald: 'bg-[#1f3a2d] text-[#8fe3b0]',
    amber: 'bg-[#42351d] text-[#ffd88a]',
    rose: 'bg-[#452329] text-[#ffabb8]',
    slate: 'bg-[#2a2a2a] text-[#d0d0d0]',
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-black uppercase tracking-wide ${toneClass}`}>
      {children}
    </span>
  );
};

const requestStatusOptions: Array<{ value: 'all' | StudyResourceRequest['status']; label: string }> = [
  { value: 'all', label: 'All requests' },
  { value: 'open', label: 'Open' },
  { value: 'planned', label: 'Planned' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'rejected', label: 'Rejected' },
];

const requestStatusTone: Record<StudyResourceRequest['status'], 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate'> = {
  open: 'cyan',
  planned: 'amber',
  fulfilled: 'emerald',
  rejected: 'rose',
};

const toneBarClassName: Record<StudyTone, string> = {
  blue: 'from-sky-500 to-slate-300',
  violet: 'from-violet-500 to-slate-300',
  emerald: 'from-emerald-500 to-slate-300',
  amber: 'from-amber-500 to-slate-300',
  rose: 'from-rose-500 to-slate-300',
  cyan: 'from-cyan-500 to-slate-300',
  indigo: 'from-indigo-500 to-slate-300',
  slate: 'from-slate-500 to-slate-300',
};

type AdminScopeFolderTreeProps = {
  user: AdminUser;
  selectedRootIds: Set<string>;
  cards: StudyCard[];
  childrenByParentId: Map<string, StudyCard[]>;
  getCardPathLabel: (card: StudyCard) => string;
  onToggleRoot: (user: AdminUser, cardId: string) => void;
};

const AdminScopeFolderTree = ({
  user,
  selectedRootIds,
  cards,
  childrenByParentId,
  getCardPathLabel,
  onToggleRoot,
}: AdminScopeFolderTreeProps) => {
  const [folderQuery, setFolderQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const normalizedQuery = folderQuery.trim().toLowerCase();
  const deferredQuery = useDeferredValue(normalizedQuery);

  const matchesCard = useCallback((card: StudyCard) => {
    const haystack = `${card.name} ${getCardPathLabel(card)}`.toLowerCase();
    return !deferredQuery || haystack.includes(deferredQuery);
  }, [getCardPathLabel, deferredQuery]);

  const hasMatchingDescendant = useCallback((cardId: string): boolean => {
    const stack = [...(childrenByParentId.get(cardId) || [])];
    while (stack.length) {
      const current = stack.shift();
      if (!current) continue;
      if (matchesCard(current) || hasMatchingDescendant(current._id)) return true;
      stack.push(...(childrenByParentId.get(current._id) || []));
    }
    return false;
  }, [childrenByParentId, matchesCard]);

  const toggleExpanded = (cardId: string) => {
    setExpandedIds((previous) => previous.includes(cardId)
      ? previous.filter((id) => id !== cardId)
      : [...previous, cardId]);
  };

  const renderTreeNode = (card: StudyCard, depth: number) => {
    const childCards = (childrenByParentId.get(card._id) || []).filter((child) => child.status !== 'archived');
    const hasChildren = childCards.length > 0;
    const isSelected = selectedRootIds.has(card._id);
    const isMatch = matchesCard(card);
    const hasRelevantDescendant = hasMatchingDescendant(card._id);
    const isQueryActive = Boolean(deferredQuery);
    const shouldRender = !isQueryActive || isMatch || hasRelevantDescendant || isSelected;
    const shouldShowChildren = hasChildren && (isQueryActive
      ? (isMatch || hasRelevantDescendant || isSelected || expandedIds.includes(card._id))
      : expandedIds.includes(card._id));

    if (!shouldRender) return null;

    return (
      <div key={card._id} className="space-y-1">
        <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
          <button
            type="button"
            onClick={() => hasChildren && toggleExpanded(card._id)}
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-[#9cdcfe]"
            aria-label={hasChildren ? `Toggle ${card.name}` : undefined}
          >
            {hasChildren ? (
              <ChevronRightIcon className={`h-4 w-4 transition ${shouldShowChildren ? 'rotate-90' : ''}`} aria-hidden="true" />
            ) : (
              <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onToggleRoot(user, card._id)}
            className="flex-1 text-left"
          >
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-200/15 bg-cyan-300/10 text-cyan-200">
                  {hasChildren ? <FolderPlusIcon className="h-4 w-4" aria-hidden="true" /> : <DocumentDuplicateIcon className="h-4 w-4" aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{card.name}</p>
                  <p className="truncate text-[11px] font-semibold text-[#8d8d8d]">{getCardPathLabel(card)}</p>
                </div>
              </div>
            </div>
          </button>
        </div>
        {hasChildren && shouldShowChildren && (
          <div className="ml-5 space-y-1 border-l border-white/10 pl-4" style={{ paddingLeft: `${depth * 1.1 + 1.0}rem` }}>
            {childCards.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootCards = useMemo(() => cards.filter((card) => !card.parentId && card.status !== 'archived').sort((a, b) => getCardPathLabel(a).localeCompare(getCardPathLabel(b))), [cards, getCardPathLabel]);

  return (
    <div className="mt-3 space-y-3">
      <label className="relative block">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#9a9a9a]" aria-hidden="true" />
        <input
          value={folderQuery}
          onChange={(event) => setFolderQuery(event.target.value)}
          className={`${inputClassName} pl-9`}
          placeholder="Search folders or branches"
        />
      </label>
      <div className="max-h-80 space-y-2 overflow-auto rounded-2xl border border-white/10 bg-black/10 p-2">
        {rootCards.length ? rootCards.map((card) => renderTreeNode(card, 0)) : <p className="px-2 py-3 text-sm font-semibold text-[#8d8d8d]">No library folders available yet.</p>}
        {deferredQuery && !rootCards.some((card) => matchesCard(card) || hasMatchingDescendant(card._id)) && (
          <p className="px-2 py-3 text-sm font-semibold text-[#8d8d8d]">No folders match this search.</p>
        )}
      </div>
    </div>
  );
};

const AdminPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const currentAdminUserId = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const token = window.localStorage.getItem('authToken');
    if (!token) return null;

    try {
      const base64Url = token.split('.')[1] || '';
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const payload = JSON.parse(window.atob(padded));
      const candidateId = payload.id || payload._id || payload.userId;
      return typeof candidateId === 'string' ? candidateId : null;
    } catch {
      return null;
    }
  }, []);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const requestedPanel = searchParams.get('panel');
  const mappedPanel = requestedPanel ? legacyPanelMap[requestedPanel] || requestedPanel : null;
  const requestedActivePanel: AdminPanel = panelItems.some((item) => item.key === mappedPanel)
    ? mappedPanel as AdminPanel
    : 'dashboard';

  const { data: currentAccount } = useQuery({
    queryKey: ['account-profile', 'admin-console'],
    queryFn: fetchAccountProfile,
    staleTime: STUDY_QUERY_STALE_TIME_MS,
    gcTime: STUDY_QUERY_GC_TIME_MS,
    refetchOnWindowFocus: false,
  });
  const currentAdminScope = currentAccount?.adminScope;
  const isScopedAdmin = Boolean(currentAdminScope?.enabled);
  const currentAdminPermissions = useMemo(
    () => new Set(currentAdminScope?.permissions?.length ? currentAdminScope.permissions : defaultAdminPermissions),
    [currentAdminScope?.permissions]
  );
  const { data: adminExamOptions = [] } = useQuery({
    queryKey: ['admin-exam-options'],
    queryFn: async () => {
      const { data } = await API.get<AdminExamOption[]>('/api/exams');
      return data;
    },
    staleTime: STUDY_QUERY_STALE_TIME_MS,
    gcTime: STUDY_QUERY_GC_TIME_MS,
    refetchOnWindowFocus: false,
    networkMode: 'offlineFirst',
  });
  const hasAdminPermission = useCallback(
    (permission: AdminPermissionKey) => !isScopedAdmin || currentAdminPermissions.has(permission),
    [currentAdminPermissions, isScopedAdmin]
  );
  const visiblePanelItems = useMemo(
    () => panelItems.filter((item) => {
      const permission = panelPermissionMap[item.key];
      return !permission || hasAdminPermission(permission);
    }),
    [hasAdminPermission]
  );
  const [activePanelState, setActivePanelState] = useState<AdminPanel>(requestedActivePanel);
  const [isPanelTransitionPending, startPanelTransition] = useTransition();
  const activePanel: AdminPanel = visiblePanelItems.some((item) => item.key === activePanelState)
    ? activePanelState
    : visiblePanelItems[0]?.key || 'dashboard';
  const canViewLibrary = hasAdminPermission('library:view');
  const canManageKits = hasAdminPermission('kits:manage');
  const canManageReview = hasAdminPermission('review:manage');
  const canManageUsers = hasAdminPermission('users:manage');
  const previousPanelRef = useRef(activePanel);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('studyHubAdminSidebarCollapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [buildingTemplateKey, setBuildingTemplateKey] = useState('');
  const [kitTemplates, setKitTemplates] = useState<ExamKitTemplate[]>(() => loadKitTemplates());
  const [kitDraft, setKitDraft] = useState<ExamKitDraft>(() => createBlankKitDraft());
  const [kitPathLine, setKitPathLine] = useState('');
  const [kitSearchQuery, setKitSearchQuery] = useState('');
  const [kitSourceFilter, setKitSourceFilter] = useState<'all' | 'saved' | 'library'>('all');
  const [isKitBulkEditorOpen, setKitBulkEditorOpen] = useState(false);
  const [kitPathMenu, setKitPathMenu] = useState<{ x: number; y: number; path: string[] } | null>(null);
  const [kitTemplateMenu, setKitTemplateMenu] = useState<{ x: number; y: number; templateId: string } | null>(null);
  const [kitBranchClipboard, setKitBranchClipboard] = useState<KitBranchClipboard | null>(null);
  const [editingKitPathKey, setEditingKitPathKey] = useState('');
  const [editingKitPathValue, setEditingKitPathValue] = useState('');
  const [isKitIconPickerOpen, setKitIconPickerOpen] = useState(false);
  const [kitAiExamName, setKitAiExamName] = useState('');
  const [kitAiDepth, setKitAiDepth] = useState<'standard' | 'deep'>('deep');
  const [kitAiInstruction, setKitAiInstruction] = useState('');
  const [, setKitAiSuggestion] = useState<AdminKitAiSuggestion | null>(null);
  const [isKitAiLoading, setKitAiLoading] = useState(false);
  const [improvingTemplateKey, setImprovingTemplateKey] = useState('');
  const [previewQuery, setPreviewQuery] = useState('');
  const [previewFilter, setPreviewFilter] = useState<'all' | 'visible' | 'draft' | 'hidden'>('all');
  const [requestQuery, setRequestQuery] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | StudyResourceRequest['status']>('all');
  const [userQuery, setUserQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | AdminUser['role']>('all');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<AdminUser['role']>('user');
  const [isPreparingNcert, setPreparingNcert] = useState(false);
  const [isMirroringNcert, setMirroringNcert] = useState(false);
  const [adminPromptDialog, setAdminPromptDialog] = useState<AdminPromptDialog | null>(null);
  const [adminPromptValue, setAdminPromptValue] = useState('');
  const adminPromptResolveRef = useRef<((value: string | null) => void) | null>(null);
  const adminCardsCacheKey = useMemo(
    () => getStudyCardListCacheKey('admin-console', PLATFORM_WORKSPACE_SLUG, 'summary-v2'),
    []
  );
  const cachedAdminCards = useMemo(
    () => readStudyCardListCache(adminCardsCacheKey),
    [adminCardsCacheKey]
  );

  const shouldLoadAdminCards = canViewLibrary && (activePanel === 'library' || activePanel === 'review');
  const { data: fetchedAdminCards = [], isLoading: isLoadingCards, isError: isCardsError } = useQuery({
    queryKey: ['admin-study-cards', PLATFORM_WORKSPACE_SLUG, 'summary-v2', activePanel],
    queryFn: () => fetchAdminStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent: 'all', summary: true }),
    staleTime: STUDY_QUERY_STALE_TIME_MS,
    gcTime: STUDY_QUERY_GC_TIME_MS,
    placeholderData: (previousData) => previousData?.length ? previousData : cachedAdminCards.length ? cachedAdminCards : undefined,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    networkMode: 'offlineFirst',
    enabled: shouldLoadAdminCards,
  });
  const allCards = activePanel === 'library' || activePanel === 'review' ? fetchedAdminCards : [];

  const { data: users = [], isLoading: isLoadingUsers, isError: isUsersError } = useQuery({
    queryKey: ['admin-users', 'console', activePanel],
    queryFn: () => fetchAdminUsers({ limit: 300 }),
    staleTime: STUDY_QUERY_STALE_TIME_MS,
    gcTime: STUDY_QUERY_GC_TIME_MS,
    placeholderData: (previousData) => previousData ?? [],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    networkMode: 'offlineFirst',
    enabled: canManageUsers && activePanel === 'users',
  });

  const { data: contentRequests = [], isLoading: isLoadingRequests, isError: isRequestsError } = useQuery({
    queryKey: ['admin-study-requests', 'console', activePanel],
    queryFn: () => fetchAdminStudyRequests({ limit: 300 }),
    staleTime: STUDY_QUERY_STALE_TIME_MS,
    gcTime: STUDY_QUERY_GC_TIME_MS,
    placeholderData: (previousData) => previousData ?? [],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    networkMode: 'offlineFirst',
    enabled: canManageReview && activePanel === 'review',
  });

  useEffect(() => {
    if (fetchedAdminCards.length) {
      writeStudyCardListCache(adminCardsCacheKey, fetchedAdminCards);
    }
  }, [adminCardsCacheKey, fetchedAdminCards]);

  const cardById = useMemo(() => new Map(allCards.map((card) => [card._id, card])), [allCards]);
  const allChildrenByParentId = useMemo(() => {
    const grouped = new Map<string, StudyCard[]>();
    allCards.forEach((card) => {
      const parentKey = card.parentId || 'root';
      const children = grouped.get(parentKey) || [];
      children.push(card);
      grouped.set(parentKey, children);
    });
    return grouped;
  }, [allCards]);
  const cardPathById = useMemo(() => {
    const cache = new Map<string, StudyCard[]>();

    const resolvePath = (card: StudyCard): StudyCard[] => {
      const cachedPath = cache.get(card._id);
      if (cachedPath) return cachedPath;

      const path: StudyCard[] = [];
      const visited = new Set<string>();
      let current: StudyCard | undefined = card;

      while (current && !visited.has(current._id)) {
        visited.add(current._id);
        path.unshift(current);
        current = current.parentId ? cardById.get(current.parentId) : undefined;
      }

      cache.set(card._id, path);
      return path;
    };

    allCards.forEach(resolvePath);
    return cache;
  }, [allCards, cardById]);
  const cardPathLabelById = useMemo(() => {
    const labels = new Map<string, string>();
    allCards.forEach((card) => {
      const path = cardPathById.get(card._id) || [card];
      labels.set(card._id, path.map((pathCard) => pathCard.name).join(' / ') || card.name);
    });
    return labels;
  }, [allCards, cardPathById]);
  const hasAdminSyncError = isCardsError || isUsersError || isRequestsError;

  const childCountByParentId = useMemo(() => {
    const counts = new Map<string, number>();
    allCards.forEach((card) => {
      if (card.status === 'archived') return;
      const parentKey = card.parentId || 'root';
      counts.set(parentKey, (counts.get(parentKey) || 0) + 1);
    });
    return counts;
  }, [allCards]);

  const getCardPath = useCallback(
    (card: StudyCard) => cardPathById.get(card._id) || [card],
    [cardPathById]
  );

  const getCardPathLabel = useCallback(
    (card: StudyCard) => cardPathLabelById.get(card._id) || card.name,
    [cardPathLabelById]
  );

  const handlePrepareNcertBooks = async () => {
    if (isPreparingNcert) return;
    setPreparingNcert(true);
    try {
      const result = await toast.promise(prepareAdminNcertBooks({ warmLimit: 36 }), {
        loading: 'Preparing NCERT books...',
        success: (data) => `NCERT ready: ${data.completeBooks} books, ${data.warmQueued} queued`,
        error: 'NCERT prepare failed',
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-study-cards'] });
      toast.success(`${result.renamedBooks} names polished, ${result.archivedChapterFiles} chapter files hidden`);
    } finally {
      setPreparingNcert(false);
    }
  };

  const handleMirrorNcertBooks = async () => {
    if (isMirroringNcert) return;
    setMirroringNcert(true);
    try {
      const result = await toast.promise(prepareAdminNcertBooks({ warmLimit: 0, mirrorToCloudinary: true, mirrorLimit: 25 }), {
        loading: 'Mirroring NCERT books...',
        success: (data) => `Mirrored ${data.mirroredBooks} books to Cloudinary`,
        error: 'NCERT mirror failed',
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-study-cards'] });
      if (result.mirroredBooks === 0) toast.success('No new official NCERT books left in this batch');
    } finally {
      setMirroringNcert(false);
    }
  };

  const getDescendantCards = useCallback((rootId: string) => {
    const descendants: StudyCard[] = [];
    const stack = [...(allChildrenByParentId.get(rootId) || [])];
    while (stack.length) {
      const current = stack.shift();
      if (!current) continue;
      descendants.push(current);
      stack.push(...(allChildrenByParentId.get(current._id) || []));
    }
    return descendants;
  }, [allChildrenByParentId]);

  const sortedCards = useMemo(
    () => allCards.slice().sort((a, b) => getCardPathLabel(a).localeCompare(getCardPathLabel(b))),
    [allCards, getCardPathLabel]
  );
  const activeCards = useMemo(() => sortedCards.filter((card) => card.status !== 'archived'), [sortedCards]);
  const archivedCards = useMemo(() => sortedCards.filter((card) => (
    card.status === 'archived' && (!card.parentId || cardById.get(card.parentId)?.status !== 'archived')
  )), [cardById, sortedCards]);
  const rootCards = useMemo(() => activeCards.filter((card) => !card.parentId), [activeCards]);
  const totalFiles = useMemo(() => getCardDirectFileCount(activeCards), [activeCards]);
  const needsContentCards = useMemo(
    () => activeCards.filter((card) => !(childCountByParentId.get(card._id) || 0) && !getCardFileCount(card)),
    [activeCards, childCountByParentId]
  );
  const pdfFolders = useMemo(() => activeCards.filter((card) => getCardFileCount(card) > 0), [activeCards]);
  const adminScopeAssignableCards = useMemo(
    () => activeCards
      .slice()
      .sort((a, b) => getCardPathLabel(a).localeCompare(getCardPathLabel(b))),
    [activeCards, getCardPathLabel]
  );
  const freshestPdfFolders = useMemo(() => (
    pdfFolders
      .slice()
      .sort((a, b) => {
        const aLatest = Math.max(...(a.files || []).map((file) => new Date(file.uploadedAt || 0).getTime()), 0);
        const bLatest = Math.max(...(b.files || []).map((file) => new Date(file.uploadedAt || 0).getTime()), 0);
        return bLatest - aLatest || getCardPathLabel(a).localeCompare(getCardPathLabel(b));
      })
      .slice(0, 4)
  ), [getCardPathLabel, pdfFolders]);

  const filteredPreviewCards = useMemo(() => {
    if (activePanel !== 'review') return [];
    return activeCards.filter((card) => {
    const haystack = `${getCardPathLabel(card)} ${card.status} ${card.visibility}`.toLowerCase();
    const matchesQuery = !previewQuery.trim() || haystack.includes(previewQuery.trim().toLowerCase());
    const isVisible = card.status === 'published' && card.visibility === 'public';
    const matchesFilter =
      previewFilter === 'all' ||
      (previewFilter === 'visible' && isVisible) ||
      (previewFilter === 'draft' && card.status === 'draft') ||
      (previewFilter === 'hidden' && !isVisible);
    return matchesQuery && matchesFilter;
    });
  }, [activeCards, activePanel, getCardPathLabel, previewFilter, previewQuery]);

  const filteredContentRequests = useMemo(() => {
    if (activePanel !== 'review') return [];
    return contentRequests.filter((request) => {
    const haystack = [
      request.title,
      request.resourceType,
      request.subject,
      request.message,
      request.sourceUrl,
      request.status,
      getRequestWorkspaceLabel(request),
      getRequestRequesterLabel(request),
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesQuery = !requestQuery.trim() || haystack.includes(requestQuery.trim().toLowerCase());
    const matchesStatus = requestStatusFilter === 'all' || request.status === requestStatusFilter;
    return matchesQuery && matchesStatus;
    });
  }, [activePanel, contentRequests, requestQuery, requestStatusFilter]);

  const filteredUsers = useMemo(() => {
    if (activePanel !== 'users') return [];
    return users.filter((user) => {
    const haystack = `${user.email} ${user.name || ''} ${user.role} ${user.authProvider}`.toLowerCase();
    const matchesQuery = !userQuery.trim() || haystack.includes(userQuery.trim().toLowerCase());
    const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;
    return matchesQuery && matchesRole;
    });
  }, [activePanel, userQuery, userRoleFilter, users]);
  const roleSummaries = useMemo(() => {
    if (activePanel !== 'users') return [];
    return Array.from(new Set(users.map((user) => user.role))).sort().map((role) => {
    const roleUsers = users.filter((user) => user.role === role);
    return {
      role,
      count: roleUsers.length,
      google: roleUsers.filter((user) => user.authProvider === 'google' || user.googleLinked).length,
      active: roleUsers.filter((user) => user.library.total > 0 || Boolean(user.library.lastActivityAt)).length,
      onboarded: roleUsers.filter((user) => user.preference?.onboardingCompleted).length,
    };
    });
  }, [activePanel, users]);
  const libraryKitTemplates = useMemo(() => rootCards.map((rootCard) => {
    const descendants = getDescendantCards(rootCard._id).filter((card) => card.status !== 'archived');
    const paths = descendants
      .map((card) => {
        const path = getCardPath(card);
        const rootIndex = path.findIndex((pathCard) => pathCard._id === rootCard._id);
        return rootIndex >= 0 ? path.slice(rootIndex + 1).map((pathCard) => pathCard.name) : [];
      })
      .filter((path) => path.length > 0);

    return {
      id: `library-${rootCard._id}`,
      name: rootCard.name,
      category: '',
      body: '',
      examName: rootCard.name,
      description: getCardPathLabel(rootCard),
      goalType: rootCard.goalType || inferStudyGoalType(rootCard),
      iconKey: rootCard.iconKey || 'exam',
      tone: rootCard.tone || 'indigo',
      paths,
      updatedAt: rootCard.updatedAt || rootCard.createdAt || '',
      source: 'library' as const,
      sourceCardId: rootCard._id,
    };
  }), [getCardPath, getCardPathLabel, getDescendantCards, rootCards]);
  const displayedKitTemplates = useMemo(() => [
    ...kitTemplates.map((template) => ({ ...template, source: 'saved' as const, sourceCardId: '' })),
    ...libraryKitTemplates,
  ], [kitTemplates, libraryKitTemplates]);
  const filteredKitTemplates = useMemo(() => {
    if (activePanel !== 'kits') return [];
    return displayedKitTemplates.filter((template) => {
    const haystack = [
      template.name,
      template.category,
      template.body,
      template.examName,
      template.description,
      template.source,
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesQuery = !kitSearchQuery.trim() || haystack.includes(kitSearchQuery.trim().toLowerCase());
    const matchesSource = kitSourceFilter === 'all' || template.source === kitSourceFilter;
    return matchesQuery && matchesSource;
    });
  }, [activePanel, displayedKitTemplates, kitSearchQuery, kitSourceFilter]);
  const selectedKitMenuTemplate = useMemo(() => {
    if (activePanel !== 'kits' || !kitTemplateMenu) return null;
    return displayedKitTemplates.find((template) => template.id === kitTemplateMenu.templateId) || null;
  }, [activePanel, displayedKitTemplates, kitTemplateMenu]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  const closeAdminPrompt = useCallback((value: string | null) => {
    const resolve = adminPromptResolveRef.current;
    adminPromptResolveRef.current = null;
    setAdminPromptDialog(null);
    setAdminPromptValue('');
    resolve?.(value);
  }, []);

  const openAdminPrompt = useCallback((dialog: Partial<AdminPromptDialog> & Pick<AdminPromptDialog, 'title'>) => (
    new Promise<string | null>((resolve) => {
      adminPromptResolveRef.current?.(null);
      adminPromptResolveRef.current = resolve;
      setAdminPromptDialog({
        confirmLabel: 'Save',
        cancelLabel: 'Cancel',
        defaultValue: '',
        inputType: 'text',
        ...dialog,
      });
      setAdminPromptValue(dialog.defaultValue || '');
    })
  ), []);

  const setPanel = useCallback((panel: AdminPanel, cardId?: string) => {
    const nextPanel = visiblePanelItems.some((item) => item.key === panel) ? panel : visiblePanelItems[0]?.key || 'dashboard';
    setActivePanelState(nextPanel);

    const params = new URLSearchParams();
    params.set('panel', nextPanel);
    if (cardId) {
      params.set('card', cardId);
    } else {
      params.delete('card');
    }

    if (typeof window !== 'undefined') {
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`;
      window.history.replaceState(window.history.state, '', nextUrl);
    }

    startTransition(() => {
      setSearchParams(params, { replace: true });
    });
  }, [setSearchParams, visiblePanelItems]);

  useEffect(() => {
    if (activePanelState !== requestedActivePanel) {
      const nextPanel = visiblePanelItems.some((item) => item.key === requestedActivePanel)
        ? requestedActivePanel
        : visiblePanelItems[0]?.key || 'dashboard';
      if (nextPanel !== activePanelState) {
        setActivePanelState(nextPanel);
      }
    }
  }, [activePanelState, requestedActivePanel, visiblePanelItems]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    document.documentElement.classList.add('admin-scroll-root');
    document.body.classList.add('admin-scroll-root');

    return () => {
      document.documentElement.classList.remove('admin-scroll-root');
      document.body.classList.remove('admin-scroll-root');
    };
  }, []);

  useEffect(() => {
    if (previousPanelRef.current === activePanel) return;
    previousPanelRef.current = activePanel;

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [activePanel]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleAdminKeyboardNavigation = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (adminPromptDialog) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeAdminPrompt(null);
        }
        return;
      }

      if (isAdminKeyboardInputTarget(event.target)) {
        if (event.key === 'Escape' && event.target instanceof HTMLElement) {
          event.preventDefault();
          event.target.blur();
        }
        return;
      }

      const activeIndex = visiblePanelItems.findIndex((item) => item.key === activePanel);
      const goToPanelIndex = (index: number) => {
        const nextPanel = visiblePanelItems[index]?.key;
        if (nextPanel) setPanel(nextPanel);
      };

      const altPanelIndex = getAltDigitIndex(event, visiblePanelItems.length);
      if (altPanelIndex >= 0) {
        event.preventDefault();
        goToPanelIndex(altPanelIndex);
        return;
      }

      if (isPlainKeyboardKey(event, '/')) {
        event.preventDefault();
        const didFocus = focusFirstMatchingElement(document.getElementById('admin-main-content'), [
          '[data-admin-primary-input="true"]',
          'input[type="search"]',
          'input[placeholder*="Search" i]',
          'textarea[placeholder*="Search" i]',
          'input[placeholder*="Filter" i]',
          'textarea:not([disabled])',
          'input:not([type="hidden"]):not([disabled])',
        ]);
        if (!didFocus) {
          document.getElementById('admin-main-content')?.focus({ preventScroll: true });
        }
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'Backspace') {
        event.preventDefault();
        if (searchParams.get('card')) {
          setPanel(activePanel);
        } else if (window.history.length > 1) {
          navigate(-1);
        } else {
          setPanel('dashboard');
        }
        return;
      }

      if (event.key === 'ArrowLeft' && activeIndex > 0) {
        event.preventDefault();
        goToPanelIndex(activeIndex - 1);
        return;
      }

      if (event.key === 'ArrowRight' && activeIndex >= 0 && activeIndex < visiblePanelItems.length - 1) {
        event.preventDefault();
        goToPanelIndex(activeIndex + 1);
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        window.scrollBy({
          top: (event.key === 'ArrowDown' ? 1 : -1) * Math.max(240, window.innerHeight * 0.62),
          behavior: 'smooth',
        });
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        setPanel(visiblePanelItems[0]?.key || 'dashboard');
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        setPanel(visiblePanelItems[visiblePanelItems.length - 1]?.key || 'dashboard');
        return;
      }

      if (event.key === 'Escape' && activePanel !== 'dashboard') {
        event.preventDefault();
        setPanel('dashboard');
      }
    };

    window.addEventListener('keydown', handleAdminKeyboardNavigation);
    return () => window.removeEventListener('keydown', handleAdminKeyboardNavigation);
  }, [activePanel, adminPromptDialog, closeAdminPrompt, navigate, searchParams, setPanel, visiblePanelItems]);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem('studyHubAdminSidebarCollapsed', String(next));
      } catch {
        // Ignore storage failures; the visible toggle should still work.
      }
      return next;
    });
  };

  const openCardInManager = (cardId: string) => {
    setPanel('library', cardId);
  };

  const refreshAdminData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-study-cards'] }),
      queryClient.invalidateQueries({ queryKey: ['study-cards'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-study-card'] }),
      queryClient.invalidateQueries({ queryKey: ['study-card'] }),
      queryClient.invalidateQueries({ queryKey: ['admin-study-requests'] }),
    ]);
  };

  const refreshAdminUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

  const getAdminScope = (user: AdminUser): AdminScope => ({
    enabled: Boolean(user.adminScope?.enabled),
    rootCardIds: user.adminScope?.rootCardIds || [],
    permissions: user.adminScope?.permissions?.length ? user.adminScope.permissions : defaultAdminPermissions,
    examSlugs: user.adminScope?.examSlugs || [],
    updatedAt: user.adminScope?.updatedAt,
  });

  const handleAdminScopeChange = async (user: AdminUser, nextScope: AdminScope) => {
    if (user.role !== 'admin') return;
    if (currentAdminUserId && user._id === currentAdminUserId) {
      toast.error('You cannot edit your own admin scope from this panel.');
      return;
    }
    await toast.promise(updateAdminUser(user._id, { role: 'admin', adminScope: nextScope }), {
      loading: 'Saving admin access...',
      success: 'Admin access updated',
      error: (error: any) => error?.response?.data?.message || 'Admin access update failed',
    });
    await refreshAdminUsers();
  };

  const toggleAdminScopeMode = async (user: AdminUser) => {
    const scope = getAdminScope(user);
    await handleAdminScopeChange(user, {
      enabled: !scope.enabled,
      rootCardIds: scope.enabled ? [] : scope.rootCardIds,
      permissions: scope.enabled ? [] : scope.permissions,
      examSlugs: scope.enabled ? [] : scope.examSlugs,
    });
  };

  const toggleAdminScopeRoot = async (user: AdminUser, cardId: string) => {
    const scope = getAdminScope(user);
    const rootIds = new Set(scope.rootCardIds);
    if (rootIds.has(cardId)) rootIds.delete(cardId);
    else rootIds.add(cardId);
    await handleAdminScopeChange(user, {
      ...scope,
      enabled: true,
      rootCardIds: Array.from(rootIds),
    });
  };

  const toggleAdminPermission = async (user: AdminUser, permission: AdminPermissionKey) => {
    const scope = getAdminScope(user);
    const permissions = new Set(scope.permissions);
    if (permissions.has(permission)) permissions.delete(permission);
    else permissions.add(permission);
    await handleAdminScopeChange(user, {
      ...scope,
      enabled: true,
      permissions: Array.from(permissions),
    });
  };

  const toggleAdminExam = async (user: AdminUser, examSlug: string) => {
    const scope = getAdminScope(user);
    const examSlugs = new Set(scope.examSlugs.map((slug) => slug.toLowerCase()));
    const normalizedSlug = examSlug.toLowerCase();
    if (examSlugs.has(normalizedSlug)) examSlugs.delete(normalizedSlug);
    else examSlugs.add(normalizedSlug);
    await handleAdminScopeChange(user, {
      ...scope,
      enabled: true,
      examSlugs: Array.from(examSlugs),
    });
  };

  const handleCreateAdminUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = newUserEmail.trim().toLowerCase();
    const password = newUserPassword.trim();
    const name = newUserName.trim();

    if (!email) {
      toast.error('Email is required');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    await toast.promise(createAdminUser({ email, password, name, role: newUserRole }), {
      loading: 'Creating account...',
      success: 'Account created',
      error: (error: any) => error?.response?.data?.message || 'Account could not be created',
    });
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRole('user');
    await refreshAdminUsers();
  };

  const handleAdminUserRoleChange = async (user: AdminUser, role: AdminUser['role']) => {
    if (user.role === role) return;
    await toast.promise(updateAdminUser(user._id, { role }), {
      loading: 'Updating role...',
      success: `${user.email} is now ${role}`,
      error: (error: any) => error?.response?.data?.message || 'Role update failed',
    });
    await refreshAdminUsers();
  };

  const handleAdminUserNameChange = async (user: AdminUser) => {
    const nextName = await openAdminPrompt({
      title: 'Update display name',
      message: user.email,
      defaultValue: user.name || '',
      placeholder: 'Display name',
    });
    if (nextName === null) return;
    const name = nextName.trim();
    if (!name) {
      toast.error('Name cannot be empty');
      return;
    }
    await toast.promise(updateAdminUser(user._id, { name }), {
      loading: 'Updating name...',
      success: 'Name updated',
      error: (error: any) => error?.response?.data?.message || 'Name update failed',
    });
    await refreshAdminUsers();
  };

  const handleAdminUserEmailChange = async (user: AdminUser) => {
    const nextEmail = await openAdminPrompt({
      title: 'Update email',
      message: user.name || user.email,
      defaultValue: user.email,
      placeholder: 'name@example.com',
      inputType: 'email',
    });
    if (nextEmail === null) return;
    const email = nextEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      toast.error('Enter a valid email address');
      return;
    }
    if (email === user.email) return;
    await toast.promise(updateAdminUser(user._id, { email }), {
      loading: 'Updating email...',
      success: 'Email updated',
      error: (error: any) => error?.response?.data?.message || 'Email update failed',
    });
    await refreshAdminUsers();
  };

  const handleAdminUserPasswordReset = async (user: AdminUser) => {
    const nextPassword = await openAdminPrompt({
      title: 'Set new password',
      message: user.email,
      placeholder: 'Minimum 8 characters',
      inputType: 'password',
      confirmLabel: 'Update',
    });
    if (nextPassword === null) return;
    if (nextPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    await toast.promise(updateAdminUser(user._id, { password: nextPassword }), {
      loading: 'Resetting password...',
      success: 'Password updated',
      error: (error: any) => error?.response?.data?.message || 'Password reset failed',
    });
    await refreshAdminUsers();
  };

  const handleAdminUserDelete = async (user: AdminUser) => {
    const confirmed = await confirmAdminAction({
      title: 'Delete account?',
      message: `${user.email} will lose profile, saved library, and access records.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;
    await toast.promise(deleteAdminUser(user._id), {
      loading: 'Deleting account...',
      success: 'Account deleted',
      error: (error: any) => error?.response?.data?.message || 'Delete failed',
    });
    await refreshAdminUsers();
  };

  const findOrCreateCard = async (
    parentId: string | null,
    name: string,
    overrides: Partial<Pick<StudyCardPayload, 'status' | 'visibility' | 'goalType' | 'iconKey' | 'tone' | 'iconUrl'>> = {},
  ) => {
    const children = await fetchAdminStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent: parentId || 'root' });
    const slug = slugify(name);
    const existing = children.find((card) => card.slug === slug || card.name.toLowerCase() === name.toLowerCase());
    const nextIconUrl = overrides.iconUrl || getCompanyLogoUrl(name);
    if (existing) {
      if (existing.status === 'archived' && overrides.status) {
        return updateAdminStudyCard(existing._id, {
          ...payloadFromCard(existing, { status: overrides.status, visibility: overrides.visibility }),
          goalType: overrides.goalType || existing.goalType || inferStudyGoalType(existing),
          ...(nextIconUrl ? { iconUrl: nextIconUrl } : {}),
        });
      }
      if (nextIconUrl && existing.iconUrl !== nextIconUrl) {
        return updateAdminStudyCard(existing._id, {
          ...payloadFromCard(existing),
          iconUrl: nextIconUrl,
        });
      }
      return existing;
    }

    return createAdminStudyCard(buildCardPayload(parentId, name, children.length + 1, overrides));
  };

  const createPath = async (parts: string[], overrides: Partial<Pick<StudyCardPayload, 'status' | 'visibility' | 'goalType' | 'iconKey' | 'tone' | 'iconUrl'>> = {}) => {
    let parentId: string | null = null;
    let currentCard: StudyCard | null = null;
    const currentPath: string[] = [];
    for (const part of parts) {
      currentPath.push(part);
      const inferredIconKey = overrides.iconKey || getKitPathIconKey(currentPath);
      const inferredTone = overrides.tone || getStudyCardVisual(inferredIconKey, undefined, part).tone;
      const inferredIconUrl = overrides.iconUrl || getCompanyLogoUrl(part);
      currentCard = await findOrCreateCard(parentId, part, {
        ...overrides,
        goalType: overrides.goalType || (parentId ? 'resource_folder' : 'exam_category'),
        iconKey: inferredIconKey,
        ...(inferredIconUrl ? { iconUrl: inferredIconUrl } : {}),
        tone: inferredTone,
      });
      parentId = currentCard._id;
    }
    if (!currentCard) throw new Error('Path is empty.');
    return currentCard;
  };

  const draftPrefixParts = expandKitPathParts([kitDraft.category, kitDraft.body, kitDraft.examName]);
  const draftPrefixLabel = draftPrefixParts.join(' / ');
  const rawDraftKitAnalysis = analyzeKitPaths(kitDraft.pathsText);
  const draftKitPaths = polishKitPaths(rawDraftKitAnalysis.paths, draftPrefixParts);
  const draftKitAnalysis = {
    ...rawDraftKitAnalysis,
    paths: draftKitPaths,
    duplicateCount: rawDraftKitAnalysis.duplicateCount + Math.max(0, rawDraftKitAnalysis.paths.length - draftKitPaths.length),
    maxDepth: draftKitPaths.reduce((max, path) => Math.max(max, path.length), 0),
    nodeCount: getKitPathNodeCount(draftKitPaths),
  };
  const draftKitTree = buildKitTree(draftKitPaths);
  const kitDraftVisual = getStudyCardVisual(kitDraft.iconKey, kitDraft.tone, kitDraft.examName || kitDraft.name);
  const KitDraftIcon = kitDraftVisual.icon;
  const draftRootConflict = draftPrefixLabel
    ? activeCards.find((card) => normalizeKey(getCardPathLabel(card)) === normalizeKey(draftPrefixLabel))
    : null;
  const kitReadyChecks = [
    { label: 'Name', ok: Boolean(kitDraft.name.trim()) },
    { label: 'Root', ok: Boolean(kitDraft.examName.trim()) },
    { label: 'Branches', ok: draftKitPaths.length > 0 },
    { label: 'Clicks', ok: draftKitAnalysis.maxDepth <= kitMaxStudentPathDepth },
    { label: 'Clean', ok: draftKitAnalysis.duplicateCount === 0 },
  ];
  const kitIssueCount = kitReadyChecks.filter((item) => !item.ok).length;
  const persistKitTemplates = (templates: ExamKitTemplate[]) => {
    const sortedTemplates = [...templates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    setKitTemplates(sortedTemplates);
    saveKitTemplatesToStorage(sortedTemplates);
  };

  const handleResetKitDraft = () => {
    setKitDraft(createBlankKitDraft());
    setKitPathLine('');
    setKitBranchClipboard(null);
    setEditingKitPathKey('');
    setEditingKitPathValue('');
    setKitPathMenu(null);
    setKitTemplateMenu(null);
    setKitIconPickerOpen(false);
  };

  const handleAddKitPathLine = () => {
    const nextPath = kitPathLine.split('/').map((part) => part.trim()).filter(Boolean);
    if (!nextPath.length) {
      toast.error('Add a folder path');
      return;
    }

    const polishedNextPath = compactKitPathForStudentClicks(nextPath, draftPrefixParts);
    const nextKey = normalizeKey(polishedNextPath.join(' / '));
    if (draftKitPaths.some((path) => normalizeKey(path.join(' / ')) === nextKey)) {
      toast.error('This path is already added');
      return;
    }

    setKitDraft((current) => ({
      ...current,
      pathsText: serializeKitPaths(polishKitPaths([...draftKitPaths, polishedNextPath], draftPrefixParts)),
    }));
    setKitPathLine('');
  };

  const handleRemoveKitPath = (targetPath: string[]) => {
    const targetKey = normalizeKey(targetPath.join(' / '));
    const nextPaths = draftKitPaths.filter((path) => normalizeKey(path.join(' / ')) !== targetKey);
    setKitDraft((current) => ({ ...current, pathsText: serializeKitPaths(polishKitPaths(nextPaths, draftPrefixParts)) }));
  };

  const getKitBranchPaths = (targetPath: string[]) => {
    const branchPaths = draftKitPaths.filter((path) => isKitPathPrefix(targetPath, path));
    return branchPaths.length ? branchPaths : [targetPath];
  };

  const copyOrCutKitBranch = (path: string[], action: KitBranchClipboard['action']) => {
    setKitBranchClipboard({ action, path });
    setKitPathMenu(null);
    toast.success(action === 'copy' ? 'Branch copied' : 'Branch cut');
  };

  const pasteKitBranch = (targetPath: string[] = []) => {
    if (!kitBranchClipboard) {
      toast.error('Copy or cut a branch first');
      return;
    }

    const sourcePath = kitBranchClipboard.path;
    if (kitBranchClipboard.action === 'cut' && isKitPathPrefix(sourcePath, targetPath)) {
      toast.error('A branch cannot be moved inside itself');
      return;
    }

    const sourcePaths = getKitBranchPaths(sourcePath);
    const sourceKeys = new Set(sourcePaths.map((path) => normalizeKey(path.join(' / '))));
    const remainingPaths = kitBranchClipboard.action === 'cut'
      ? draftKitPaths.filter((path) => !sourceKeys.has(normalizeKey(path.join(' / '))))
      : draftKitPaths;
    const sourceRoot = sourcePath[sourcePath.length - 1] || 'Branch';
    let nextRoot = sourceRoot;
    let copyIndex = 1;

    const makeProposedPaths = (rootName: string) => sourcePaths.map((path) => [
      ...targetPath,
      ...sourcePath.slice(0, -1),
      rootName,
      ...path.slice(sourcePath.length),
    ].map(compactKitNamePart).filter(Boolean));

    let proposedPaths = makeProposedPaths(nextRoot);
    while (proposedPaths.some((path) => remainingPaths.some((existingPath) => normalizeKey(existingPath.join(' / ')) === normalizeKey(path.join(' / '))))) {
      nextRoot = `${sourceRoot} Copy${copyIndex > 1 ? ` ${copyIndex}` : ''}`;
      copyIndex += 1;
      proposedPaths = makeProposedPaths(nextRoot);
    }

    setKitDraft((current) => ({
      ...current,
      pathsText: serializeKitPaths(polishKitPaths([...remainingPaths, ...proposedPaths], draftPrefixParts)),
    }));
    if (kitBranchClipboard.action === 'cut') setKitBranchClipboard(null);
    setKitPathMenu(null);
    toast.success(kitBranchClipboard.action === 'copy' ? 'Branch pasted' : 'Branch moved');
  };

  const updateKitPath = (targetPath: string[], nextValue: string) => {
    const nextPath = nextValue.split('/').map((part) => part.trim()).filter(Boolean);
    if (!nextPath.length) {
      toast.error('Folder path cannot be empty');
      return;
    }
    const targetKey = normalizeKey(targetPath.join(' / '));
    const nextPaths = draftKitPaths.map((path) => (
      normalizeKey(path.join(' / ')) === targetKey ? nextPath : path
    ));
    setKitDraft((current) => ({ ...current, pathsText: serializeKitPaths(polishKitPaths(nextPaths, draftPrefixParts)) }));
  };

  const duplicateKitPath = (targetPath: string[]) => {
    const baseName = targetPath[targetPath.length - 1] || 'Folder';
    let nextPath = [...targetPath.slice(0, -1), `${baseName} Copy`];
    let copyIndex = 2;
    while (draftKitPaths.some((path) => normalizeKey(path.join(' / ')) === normalizeKey(nextPath.join(' / ')))) {
      nextPath = [...targetPath.slice(0, -1), `${baseName} Copy ${copyIndex}`];
      copyIndex += 1;
    }
    setKitDraft((current) => ({ ...current, pathsText: serializeKitPaths(polishKitPaths([...draftKitPaths, nextPath], draftPrefixParts)) }));
    setEditingKitPathKey(normalizeKey(nextPath.join(' / ')));
    setEditingKitPathValue(nextPath.join(' / '));
  };

  const addChildToKitPath = (targetPath: string[]) => {
    let childName = 'New folder';
    let nextPath = [...targetPath, childName];
    let copyIndex = 2;
    while (draftKitPaths.some((path) => normalizeKey(path.join(' / ')) === normalizeKey(nextPath.join(' / ')))) {
      childName = `New folder ${copyIndex}`;
      nextPath = [...targetPath, childName];
      copyIndex += 1;
    }
    setKitDraft((current) => ({ ...current, pathsText: serializeKitPaths(polishKitPaths([...draftKitPaths, nextPath], draftPrefixParts)) }));
    setEditingKitPathKey(normalizeKey(nextPath.join(' / ')));
    setEditingKitPathValue(nextPath.join(' / '));
  };

  const startEditKitPath = (path: string[]) => {
    setEditingKitPathKey(normalizeKey(path.join(' / ')));
    setEditingKitPathValue(path.join(' / '));
    setKitPathMenu(null);
  };

  const commitEditingKitPath = () => {
    const targetPath = draftKitPaths.find((path) => normalizeKey(path.join(' / ')) === editingKitPathKey);
    if (targetPath) updateKitPath(targetPath, editingKitPathValue);
    setEditingKitPathKey('');
    setEditingKitPathValue('');
  };

  const sortKitDraftPaths = () => {
    setKitDraft((current) => ({ ...current, pathsText: serializeKitPaths(polishKitPaths(draftKitPaths, draftPrefixParts)) }));
  };

  const cleanKitDraft = () => {
    if (!draftKitPaths.length) {
      toast.error('Add folder branches first');
      return;
    }

    setKitDraft((current) => ({
      ...current,
      name: compactKitNamePart(current.name),
      category: compactKitNamePart(current.category),
      body: compactKitNamePart(current.body),
      examName: compactKitNamePart(current.examName),
      description: compactKitNamePart(current.description),
      pathsText: serializeKitPaths(polishKitPaths(draftKitPaths, draftPrefixParts)),
    }));
    toast.success('Kit polished');
  };

  const polishKitBranch = (targetPath: string[]) => {
    const targetKey = normalizeKey(targetPath.join(' / '));
    const nextPaths = draftKitPaths.map((path) => (
      normalizeKey(path.join(' / ')) === targetKey ? path.map(compactKitNamePart).filter(Boolean) : path
    ));
    setKitDraft((current) => ({ ...current, pathsText: serializeKitPaths(polishKitPaths(nextPaths, draftPrefixParts)) }));
    setKitPathMenu(null);
    toast.success('Branch polished');
  };

  const handleKitRootPathChange = (value: string) => {
    const parts = splitKitRootPath(value);
    setKitDraft((current) => ({
      ...current,
      category: parts.length > 1 ? parts[0] : '',
      body: parts.length > 2 ? parts[1] : '',
      examName: parts.length > 2 ? parts.slice(2).join(' / ') : parts[parts.length - 1] || '',
    }));
  };

  const applyAiSuggestionToDraft = (suggestion: AdminKitAiSuggestion, draftId = '') => {
    const nextCategory = compactKitNamePart(suggestion.category || '');
    const nextBody = compactKitNamePart(suggestion.body || '');
    const nextExamName = compactKitNamePart(suggestion.examName || kitAiExamName.trim());
    const nextRootParts = expandKitPathParts([nextCategory, nextBody, nextExamName]);
    const nextPaths = polishKitPaths(suggestion.paths || [], nextRootParts);
    setEditingKitPathKey('');
    setEditingKitPathValue('');
    setKitPathMenu(null);
    setKitTemplateMenu(null);
    setKitIconPickerOpen(false);
    setKitBulkEditorOpen(false);
    setKitDraft({
      id: draftId,
      name: compactKitNamePart(suggestion.title || `${suggestion.examName} Kit`),
      category: nextCategory,
      body: nextBody,
      examName: nextExamName,
      description: compactKitNamePart(suggestion.description || suggestion.summary),
      goalType: kitDraft.goalType || 'exam',
      iconKey: kitDraft.iconKey || 'exam',
      tone: kitDraft.tone || 'indigo',
      pathsText: serializeKitPaths(nextPaths),
    });
  };

  const handleRunKitAiResearch = async (
    depth: 'standard' | 'deep' = kitAiDepth,
    template?: KitAiTemplateInput
  ) => {
    const examName = (template?.examName || kitAiExamName || kitDraft.examName).trim();
    if (!examName) {
      toast.error('Add an exam name');
      return;
    }

    const templateKey = template?.id || '';
    setKitAiDepth(depth);
    setKitAiLoading(true);
    if (templateKey) setImprovingTemplateKey(templateKey);
    try {
      const suggestion = await toast.promise(researchAdminKitWithAi({
        examName,
        depth,
        instruction: template
          ? [
            'Improve this existing kit. Preserve every existing folder branch and align names to premium student-facing exam library standards.',
            'Suggest missing useful folders, but keep current uploaded/content structure safe. Compact long branches into shorter equivalent paths when it improves navigation.',
            `Return relative folder paths only. Do not repeat the root exam/family name. Keep paths within ${kitMaxStudentPathDepth} segments after the exam root so PDFs are reachable in 2-3 clicks. Prefer "Previous Year Papers" instead of "PYQ".`,
            kitAiInstruction,
          ].filter(Boolean).join(' ')
          : [
            `Return relative folder paths only. Do not repeat the root exam/family name. Keep paths within ${kitMaxStudentPathDepth} segments after the exam root so PDFs are reachable in 2-3 clicks. Prefer "Previous Year Papers" instead of "PYQ".`,
            kitAiInstruction,
          ].filter(Boolean).join(' '),
        existingTemplate: template ? {
          name: template.name,
          category: template.category,
          body: template.body,
          examName: template.examName,
          description: template.description,
          paths: template.paths,
        } : undefined,
      }), {
        loading: template ? 'Improving kit...' : 'Generating kit draft...',
        success: template ? 'Improved draft ready' : 'Kit draft ready',
        error: 'Kit research failed',
      });
      setKitAiSuggestion(suggestion);
      setKitAiExamName(suggestion.examName || examName);
      applyAiSuggestionToDraft(suggestion, template?.source === 'saved' ? template.id : '');
    } finally {
      setKitAiLoading(false);
      setImprovingTemplateKey('');
    }
  };

  const handleEditKitTemplate = (template: ExamKitTemplate, copyAsNew = false) => {
    setKitAiExamName(template.examName || template.name);
    const templateRootParts = expandKitPathParts([template.category, template.body, template.examName]);
    setEditingKitPathKey('');
    setEditingKitPathValue('');
    setKitPathMenu(null);
    setKitTemplateMenu(null);
    setKitIconPickerOpen(false);
    setKitBulkEditorOpen(false);
    setKitDraft({
      id: copyAsNew ? '' : template.id,
      name: template.name,
      category: template.category,
      body: template.body,
      examName: template.examName,
      description: template.description,
      goalType: template.goalType || 'exam',
      iconKey: template.iconKey || 'exam',
      tone: template.tone || 'indigo',
      pathsText: serializeKitPaths(polishKitPaths(template.paths, templateRootParts)),
    });
  };

  const handleSaveKitTemplate = () => {
    const name = compactKitNamePart(kitDraft.name.trim());
    const examName = compactKitNamePart(kitDraft.examName.trim());
    if (!name) {
      toast.error('Add a kit name');
      return;
    }
    if (!examName) {
      toast.error('Add an exam folder name');
      return;
    }
    if (!draftKitPaths.length) {
      toast.error('Add at least one folder path');
      return;
    }
    if (kitTemplates.some((item) => item.id !== kitDraft.id && normalizeKey(item.name) === normalizeKey(name))) {
      toast.error('A kit with this name is already saved');
      return;
    }

    const now = new Date().toISOString();
    const template: ExamKitTemplate = {
      id: kitDraft.id || createKitId(),
      name,
      category: compactKitNamePart(kitDraft.category.trim()),
      body: compactKitNamePart(kitDraft.body.trim()),
      examName,
      description: compactKitNamePart(kitDraft.description.trim()),
      goalType: kitDraft.goalType,
      iconKey: kitDraft.iconKey,
      tone: kitDraft.tone,
      paths: polishKitPaths(draftKitPaths, draftPrefixParts),
      updatedAt: now,
    };

    const nextTemplates = kitTemplates.some((item) => item.id === template.id)
      ? kitTemplates.map((item) => (item.id === template.id ? template : item))
      : [template, ...kitTemplates];

    persistKitTemplates(nextTemplates);
    toast.success(kitDraft.id ? 'Kit updated' : 'Kit saved');
  };

  const getTemplateFromDraft = (): ExamKitTemplate | null => {
    const name = compactKitNamePart(kitDraft.name.trim() || kitDraft.examName.trim());
    const examName = compactKitNamePart(kitDraft.examName.trim());
    if (!name || !examName || !draftKitPaths.length) {
      toast.error('Kit name, exam folder, and path are required');
      return null;
    }

    return {
      id: kitDraft.id || 'draft-kit-preview',
      name,
      category: compactKitNamePart(kitDraft.category.trim()),
      body: compactKitNamePart(kitDraft.body.trim()),
      examName,
      description: compactKitNamePart(kitDraft.description.trim()),
      goalType: kitDraft.goalType,
      iconKey: kitDraft.iconKey,
      tone: kitDraft.tone,
      paths: polishKitPaths(draftKitPaths, draftPrefixParts),
      updatedAt: new Date().toISOString(),
    };
  };

  const improveCurrentKitDraft = async () => {
    const template = getTemplateFromDraft();
    if (!template) return;
    await handleRunKitAiResearch('deep', { ...template, source: 'draft', sourceCardId: '' });
  };

  const handleBuildDraftKit = async () => {
    const template = getTemplateFromDraft();
    if (!template) return;
    await handleBuildTemplate(template);
  };

  const handleDeleteKitTemplate = async (template: ExamKitTemplate) => {
    const confirmed = await confirmAdminAction({
      title: 'Delete kit template?',
      message: template.name,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;
    persistKitTemplates(kitTemplates.filter((item) => item.id !== template.id));
    if (kitDraft.id === template.id) handleResetKitDraft();
    toast.success('Kit deleted');
  };

  const handleBuildTemplate = async (template: ExamKitTemplate) => {
    if (buildingTemplateKey) return;
    const confirmed = await confirmAdminAction({
      title: 'Create folder kit?',
      message: `${template.name} will be created as a draft library structure.`,
      confirmLabel: 'Create',
    });
    if (!confirmed) return;

    setBuildingTemplateKey(template.id);
    try {
      const examCard = await toast.promise((async () => {
        const prefix = expandKitPathParts([template.category, template.body, template.examName]);
        if (!prefix.length) throw new Error('Template prefix is empty.');
        let parentId: string | null = null;
        let createdExamCard: StudyCard | null = null;
        for (const [index, part] of prefix.entries()) {
          const isExamRoot = index === prefix.length - 1;
          const prefixGoalType: StudyGoalType = isExamRoot
            ? template.goalType || 'exam'
            : index === 0
              ? 'exam_category'
              : 'exam_family';
          createdExamCard = await findOrCreateCard(parentId, part, {
            status: 'draft',
            visibility: 'public',
            goalType: prefixGoalType,
            ...(isExamRoot ? { iconKey: template.iconKey || 'exam', tone: template.tone || 'indigo' } : {}),
          });
          parentId = createdExamCard._id;
        }
        if (!createdExamCard) throw new Error('Template prefix is empty.');
        const templatePaths = polishKitPaths(template.paths, prefix);
        for (const templatePath of templatePaths) {
          await createPath([...prefix, ...templatePath], { status: 'draft', visibility: 'public' });
        }
        return createdExamCard;
      })(), {
        loading: 'Creating exam folders...',
        success: 'Exam kit created',
        error: 'Exam kit failed',
      });

      await refreshAdminData();
      openCardInManager(examCard._id);
    } finally {
      setBuildingTemplateKey('');
    }
  };

  const restoreCardTree = async (card: StudyCard) => {
    const cardsToRestore = [card, ...getDescendantCards(card._id)];
    await toast.promise(Promise.all(cardsToRestore.map((item) => updateAdminStudyCard(item._id, payloadFromCard(item, { status: 'published' })))), {
      loading: 'Restoring folder tree...',
      success: 'Folder restored',
      error: 'Restore failed',
    });
    await refreshAdminData();
  };

  const permanentlyDeleteCard = async (card: StudyCard) => {
    const totalNested = getDescendantCards(card._id).length;
    const confirmed = await confirmAdminAction({
      title: 'Permanently delete folder?',
      message: `"${card.name}" and ${totalNested.toLocaleString('en-IN')} nested folders cannot be restored.`,
      confirmLabel: 'Delete forever',
      tone: 'danger',
    });
    if (!confirmed) return;
    await toast.promise(deleteAdminStudyCard(card._id), {
      loading: 'Permanently deleting...',
      success: 'Folder permanently deleted',
      error: 'Permanent delete failed',
    });
    await refreshAdminData();
  };

  const publishCardForStudents = async (card: StudyCard) => {
    await toast.promise(updateAdminStudyCardPublication(card._id, { action: 'publish', cascade: true }), {
      loading: 'Publishing folder...',
      success: 'Folder visible to students',
      error: (error: any) => error?.response?.data?.message || 'Publish failed',
    });
    await refreshAdminData();
  };

  const draftCardForStudents = async (card: StudyCard) => {
    await toast.promise(updateAdminStudyCardPublication(card._id, { action: 'unpublish', cascade: true }), {
      loading: 'Hiding folder...',
      success: 'Folder hidden from students',
      error: (error: any) => error?.response?.data?.message || 'Unpublish failed',
    });
    await refreshAdminData();
  };

  const updateRequestStatus = async (
    request: StudyResourceRequest,
    status: StudyResourceRequest['status']
  ) => {
    if (request.status === status) return;
    await toast.promise(updateAdminStudyRequest(request._id, { status }), {
      loading: 'Updating request...',
      success: 'Request updated',
      error: 'Request update failed',
    });
    await queryClient.invalidateQueries({ queryKey: ['admin-study-requests'] });
  };

  const renderDashboard = () => (
    <div className="admin-home-explorer min-h-[calc(100dvh-8rem)] space-y-6 px-3 pb-10 sm:px-4 lg:px-6">
      <section className="admin-review-section border-b border-white/10 pb-6">
        <h2 className="text-2xl font-black tracking-tight text-white">Home</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {canViewLibrary && (
            <button type="button" onClick={() => setPanel('library')} className="admin-home-command">
              <BookOpenOutlineIcon className="h-5 w-5" aria-hidden="true" />
              Open Library
            </button>
          )}
          {canManageKits && (
            <button type="button" onClick={() => setPanel('kits')} className="admin-home-command">
              <Squares2X2OutlineIcon className="h-5 w-5" aria-hidden="true" />
              Build Kit
            </button>
          )}
          {canManageReview && (
            <button type="button" onClick={() => setPanel('review')} className="admin-home-command">
              <ClipboardDocumentListIcon className="h-5 w-5" aria-hidden="true" />
              Review
            </button>
          )}
          {!isScopedAdmin && (
            <>
              <button type="button" onClick={() => void handlePrepareNcertBooks()} disabled={isPreparingNcert} className="admin-home-command">
                <FolderPlusIcon className="h-5 w-5" aria-hidden="true" />
                {isPreparingNcert ? 'Preparing...' : 'Prepare NCERT'}
              </button>
              <button type="button" onClick={() => void handleMirrorNcertBooks()} disabled={isMirroringNcert} className="admin-home-command">
                <ArrowTopRightOnSquareIcon className="h-5 w-5" aria-hidden="true" />
                {isMirroringNcert ? 'Mirroring...' : 'Mirror NCERT'}
              </button>
            </>
          )}
        </div>
        {isScopedAdmin && (
          <p className="mt-3 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-[#bff4ff]">
            Scoped dashboard: only assigned library branches and granted actions are visible.
          </p>
        )}
      </section>

      <section className="admin-review-section border-b border-white/10 pb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-black tracking-tight text-white">Recent PDF routes</h2>
          <button type="button" onClick={() => setPanel('library')} className={secondaryButtonClassName}>
            Open Library
          </button>
        </div>

        <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
          {freshestPdfFolders.length ? freshestPdfFolders.map((card) => {
            const visual = getStudyCardVisual(card.iconKey, card.tone, card.name);
            const CardIcon = visual.icon;
            return (
              <article key={card._id} className="admin-review-row grid gap-3 px-2 py-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/15">
                  {visual.iconUrl ? (
                    <img src={visual.iconUrl} alt="" className="h-7 w-7 object-contain" />
                  ) : (
                    <CardIcon className="h-6 w-6 text-[#9cdcfe]" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-black text-white">{card.name}</h3>
                  <p className="mt-1 truncate text-sm font-semibold text-[#a8a8a8]">{getCardPathLabel(card)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPanel('library');
                    setSearchParams({ panel: 'library', card: card._id });
                  }}
                  className={secondaryButtonClassName}
                >
                  Open
                </button>
              </article>
            );
          }) : (
            <p className="px-2 py-4 text-sm font-semibold text-[#a8a8a8]">No PDF routes yet</p>
          )}
        </div>
      </section>

      <section className="admin-review-section border-b border-white/10 pb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-black tracking-tight text-white">Needs content</h2>
          {canManageReview && (
            <button type="button" onClick={() => setPanel('review')} className={secondaryButtonClassName}>
              Review
            </button>
          )}
        </div>

        <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
          {needsContentCards.length ? needsContentCards.slice(0, 8).map((card) => {
            const visual = getStudyCardVisual(card.iconKey, card.tone, card.name);
            const CardIcon = visual.icon;
            return (
              <article key={card._id} className="admin-review-row grid gap-3 px-2 py-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-400/10">
                  {visual.iconUrl ? (
                    <img src={visual.iconUrl} alt="" className="h-7 w-7 object-contain" />
                  ) : (
                    <CardIcon className="h-6 w-6 text-[#ffd88a]" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-black text-white">{card.name}</h3>
                  <p className="mt-1 truncate text-sm font-semibold text-[#a8a8a8]">{getCardPathLabel(card)}</p>
                </div>
                <button type="button" onClick={() => openCardInManager(card._id)} className={secondaryButtonClassName}>
                  Manage
                </button>
              </article>
            );
          }) : (
            <p className="px-2 py-4 text-sm font-semibold text-[#8fe3b0]">No missing content</p>
          )}
        </div>
      </section>

      <section className="admin-review-section">
        <h2 className="text-2xl font-black tracking-tight text-white">Library roots</h2>
        <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
          {rootCards.length ? rootCards.slice(0, 8).map((card) => {
            const visual = getStudyCardVisual(card.iconKey, card.tone, card.name);
            const CardIcon = visual.icon;
            return (
              <article key={card._id} className="admin-review-row grid gap-3 px-2 py-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/15">
                  {visual.iconUrl ? (
                    <img src={visual.iconUrl} alt="" className="h-7 w-7 object-contain" />
                  ) : (
                    <CardIcon className="h-6 w-6 text-[#9cdcfe]" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="min-w-0 truncate text-base font-black text-white">{card.name}</h3>
                    <StatusBadge tone={card.status === 'published' ? 'emerald' : 'amber'}>{card.status}</StatusBadge>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-[#a8a8a8]">{getCardPathLabel(card)}</p>
                </div>
                <button type="button" onClick={() => openCardInManager(card._id)} className={secondaryButtonClassName}>
                  Open
                </button>
              </article>
            );
          }) : (
            <p className="px-2 py-4 text-sm font-semibold text-[#a8a8a8]">No library roots</p>
          )}
        </div>
      </section>
    </div>
  );

  const renderKitTreeNodes = (nodes: KitTreeNode[], depth = 0) => (
    <div className={depth ? 'mt-1 space-y-1 border-l border-white/10 pl-3' : 'space-y-1'}>
      {nodes.map((node) => (
        <div key={node.key}>
          <div className="flex min-h-9 items-center gap-2 border-b border-white/10 px-1.5 text-sm font-black text-[#f3f3f3]">
            <img src={ASSETS.icons.study.folder} alt="" className="h-5 w-5 shrink-0 object-contain" />
            <span className="min-w-0 flex-1 truncate">{node.name}</span>
            {node.children.length > 0 && (
              <span className="px-2 py-0.5 text-[10px] text-[#9cdcfe]">
                {node.children.length}
              </span>
            )}
          </div>
          {node.children.length > 0 && renderKitTreeNodes(node.children, depth + 1)}
        </div>
      ))}
    </div>
  );

  const renderBuilder = () => (
    <div className="admin-kits-explorer min-h-[calc(100dvh-8rem)] space-y-5 px-3 pb-10 sm:px-4 lg:px-6">
      <section className="hidden">
        {[
          ['Saved', kitTemplates.length],
          ['Existing', libraryKitTemplates.length],
          ['Draft', draftKitAnalysis.nodeCount],
          ['Ready', displayedKitTemplates.filter((template) => template.paths.length > 0).length],
        ].map(([label, value]) => (
          <div key={label} className={`${adminMetricClassName} flex items-center justify-between gap-3`}>
            <span className="text-[11px] font-black uppercase tracking-wide text-[#8f8f8f]">{label}</span>
            <span className="text-base font-black text-white">{Number(value).toLocaleString('en-IN')}</span>
          </div>
        ))}
      </section>

      <section className="border-b border-white/10 pb-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="min-w-0">
            <div className="grid gap-2 md:grid-cols-2">
              <input value={kitDraft.name} onChange={(event) => setKitDraft({ ...kitDraft, name: event.target.value })} className={inputClassName} placeholder="Kit name" />
              <input value={draftPrefixLabel} onChange={(event) => handleKitRootPathChange(event.target.value)} className={inputClassName} placeholder="Root path" />
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
              <input
                value={kitAiExamName}
                onChange={(event) => setKitAiExamName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleRunKitAiResearch('deep');
                  }
                }}
                className={inputClassName}
                placeholder="Generate exam kit, e.g. UPSC CSE"
              />
              <button type="button" onClick={() => void handleRunKitAiResearch('deep')} disabled={isKitAiLoading} className={primaryButtonClassName}>
                <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                {isKitAiLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button type="button" onClick={handleResetKitDraft} className={secondaryButtonClassName}>New</button>
            <button type="button" onClick={handleSaveKitTemplate} className={secondaryButtonClassName}>
              <AcademicCapIcon className="h-4 w-4" aria-hidden="true" />
              {kitDraft.id ? 'Update kit' : 'Save kit'}
            </button>
            <button type="button" onClick={() => void handleBuildDraftKit()} disabled={Boolean(buildingTemplateKey) || kitIssueCount > 0} className={primaryButtonClassName}>
              <FolderPlusIcon className="h-4 w-4" aria-hidden="true" />
              Create draft
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSaveKitTemplate();
          }}
          className="min-w-0 border-b border-white/10 pb-5 xl:border-b-0"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-2xl font-black text-white">{kitDraft.name || kitDraft.examName || 'New kit'}</h3>
              {draftPrefixLabel && (
                <p className="mt-1 truncate text-sm font-black text-[#bdefff]">
                  {draftPrefixLabel}
                </p>
              )}
            </div>
            <div className="hidden flex-wrap gap-2">
              <button type="button" onClick={handleResetKitDraft} className={secondaryButtonClassName}>New</button>
              <button type="submit" className={secondaryButtonClassName}>
                <AcademicCapIcon className="h-4 w-4" aria-hidden="true" />
                {kitDraft.id ? 'Update kit' : 'Save kit'}
              </button>
              <button type="button" onClick={() => void handleBuildDraftKit()} disabled={Boolean(buildingTemplateKey) || kitIssueCount > 0} className={primaryButtonClassName}>
                <FolderPlusIcon className="h-4 w-4" aria-hidden="true" />
                Create draft
              </button>
            </div>
          </div>

          {draftRootConflict && (
            <div className="mb-4 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-1.5 text-xs font-black text-[#bdefff]">Existing path</div>
          )}

          <div className="grid gap-3">
            <div className="hidden">
              <label className="hidden">
                <span className="sr-only">Kit name</span>
                <input value={kitDraft.name} onChange={(event) => setKitDraft({ ...kitDraft, name: event.target.value })} className={inputClassName} placeholder="UPSC CSE Kit" />
              </label>
              <label className="hidden">
                <span className="sr-only">Root path</span>
                <input value={draftPrefixLabel} onChange={(event) => handleKitRootPathChange(event.target.value)} className={inputClassName} placeholder="Central Govt Exams / UPSC / UPSC CSE" />
              </label>
              <label className="block">
                <span className="sr-only">Root role</span>
                <select
                  value={kitDraft.goalType}
                  onChange={(event) => setKitDraft({ ...kitDraft, goalType: event.target.value as StudyGoalType })}
                  className={inputClassName}
                >
                  {studyGoalTypeOptions
                    .filter((option) => option.key !== 'library_root' && option.key !== 'resource_folder')
                    .map((option) => (
                      <option key={option.key} value={option.key}>{option.label}</option>
                    ))}
                </select>
              </label>
              <label className="block">
                <span className="sr-only">Note</span>
                <input value={kitDraft.description} onChange={(event) => setKitDraft({ ...kitDraft, description: event.target.value })} className={inputClassName} placeholder="Short internal note" />
              </label>
            </div>

            <div className="hidden">
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055]">
                  {kitDraftVisual.iconUrl ? (
                    <img src={kitDraftVisual.iconUrl} alt="" className="h-9 w-9 object-contain" />
                  ) : (
                    <KitDraftIcon className="h-8 w-8 text-[#9cdcfe]" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">{studyIconOptions.find((option) => option.key === kitDraft.iconKey)?.label || 'Exam'}</p>
                </div>
              </div>
              <button type="button" onClick={() => setKitIconPickerOpen((current) => !current)} className={`${secondaryButtonClassName} mt-3 w-full`}>
                <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                Choose icon
              </button>
              {isKitIconPickerOpen && (
                <div className="study-scrollbar absolute right-0 top-[calc(100%+0.5rem)] z-30 grid max-h-72 w-[min(22rem,calc(100vw-2rem))] grid-cols-3 gap-2 overflow-auto rounded-[1.25rem] border border-white/10 bg-[#111411] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
                  {studyIconOptions.map((option) => {
                    const OptionIcon = option.icon;
                    const isSelected = option.key === kitDraft.iconKey;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => {
                          setKitDraft((current) => ({ ...current, iconKey: option.key, tone: option.tone }));
                          setKitIconPickerOpen(false);
                        }}
                        className={[
                          'flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center transition',
                          isSelected ? 'border-cyan-200/40 bg-cyan-300/[0.12] text-white' : 'border-white/10 bg-white/[0.045] text-[#d6d6d6] hover:bg-white/[0.075]',
                        ].join(' ')}
                      >
                        {option.iconUrl ? (
                          <img src={option.iconUrl} alt="" className="h-8 w-8 object-contain" />
                        ) : (
                          <OptionIcon className="h-7 w-7 text-[#9cdcfe]" aria-hidden="true" />
                        )}
                        <span className="line-clamp-1 text-[10px] font-black">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <span className="sr-only">Add branch</span>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input
                  value={kitPathLine}
                  onChange={(event) => setKitPathLine(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddKitPathLine();
                    }
                  }}
                  className={inputClassName}
                  placeholder="Add folder / subfolder path"
                />
                <button type="button" onClick={handleAddKitPathLine} className={secondaryButtonClassName}>
                  <FolderPlusIcon className="h-4 w-4" aria-hidden="true" />
                  Add
                </button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-xs font-black text-[#d6d6d6]">
                  {draftKitPaths.length.toLocaleString('en-IN')} branches
                </span>
                <div className="hidden flex-wrap gap-2">
                  <button type="button" onClick={sortKitDraftPaths} className={secondaryButtonClassName}>Sort</button>
                  <button type="button" onClick={() => pasteKitBranch()} disabled={!kitBranchClipboard} className={secondaryButtonClassName}>
                    <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
                    Paste root
                  </button>
                  <button type="button" onClick={() => void improveCurrentKitDraft()} disabled={isKitAiLoading || !draftKitPaths.length} className={secondaryButtonClassName}>
                    <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                    AI compact
                  </button>
                  <button type="button" onClick={() => setKitBulkEditorOpen((current) => !current)} className={secondaryButtonClassName}>
                    {isKitBulkEditorOpen ? 'Cards' : 'Bulk'}
                  </button>
                </div>
              </div>

              {kitBranchClipboard && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.08] px-3 py-2 text-xs font-black text-[#bdefff]">
                  <span className="min-w-0 truncate">
                    {kitBranchClipboard.action === 'copy' ? 'Copied' : 'Cut'}: {kitBranchClipboard.path.join(' / ')}
                  </span>
                  <button type="button" onClick={() => setKitBranchClipboard(null)} className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] text-[#d6d6d6] hover:bg-white/[0.10]">
                    Clear
                  </button>
                </div>
              )}

              {isKitBulkEditorOpen ? (
                <textarea
                  value={kitDraft.pathsText}
                  onChange={(event) => setKitDraft({ ...kitDraft, pathsText: event.target.value })}
                  onBlur={sortKitDraftPaths}
                  className={`${inputClassName} min-h-56 resize-y leading-6`}
                  placeholder={'Previous Year Papers / Prelims / Paper 1\nStudy Material / History / Modern India\nMock Tests / Mains / GS Paper I'}
                />
              ) : (
                <div className="study-scrollbar max-h-[34rem] overflow-auto border-y border-white/10">
                  {draftKitPaths.length ? (
                    <div className="divide-y divide-white/10">
                      {draftKitPaths.map((path) => {
                        const pathKey = normalizeKey(path.join(' / '));
                        const pathLabel = path.join(' / ');
                        const visual = getStudyCardVisual(getKitPathIconKey(path), undefined, path[path.length - 1] || pathLabel);
                        const PathIcon = visual.icon;
                        const isEditing = editingKitPathKey === pathKey;
                        return (
                          <article
                            key={pathKey}
                            onContextMenu={(event) => {
                              event.preventDefault();
                              setKitTemplateMenu(null);
                              setKitPathMenu({ x: event.clientX, y: event.clientY, path });
                            }}
                            onDoubleClick={() => startEditKitPath(path)}
                            className="admin-kit-row group relative grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-2 py-2 transition hover:bg-white/[0.045]"
                          >
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/15">
                              {visual.iconUrl ? (
                                <img src={visual.iconUrl} alt="" className="h-7 w-7 object-contain" />
                              ) : (
                                <PathIcon className="h-6 w-6 text-[#9cdcfe]" aria-hidden="true" />
                              )}
                            </span>
                            <div className="min-w-0">
                              {isEditing ? (
                                <input
                                  value={editingKitPathValue}
                                  onChange={(event) => setEditingKitPathValue(event.target.value)}
                                  onBlur={commitEditingKitPath}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault();
                                      commitEditingKitPath();
                                    }
                                    if (event.key === 'Escape') {
                                      setEditingKitPathKey('');
                                      setEditingKitPathValue('');
                                    }
                                  }}
                                  className={`${inputClassName} py-2`}
                                  autoFocus
                                />
                              ) : (
                                <>
                                  <h4 className="truncate text-sm font-black leading-snug text-white">{path[path.length - 1]}</h4>
                                  <p className="mt-0.5 truncate text-[11px] font-bold text-[#a8a8a8]">{path.slice(0, -1).join(' / ') || 'Root folder'}</p>
                                </>
                              )}
                            </div>
                            {!isEditing && (
                              <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                                <button type="button" onClick={() => startEditKitPath(path)} className="rounded-xl p-2 text-[#d6d6d6] hover:bg-white/[0.08]" title="Edit branch">
                                  <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <button type="button" onClick={() => handleRemoveKitPath(path)} className="rounded-xl p-2 text-[#ffabb8] hover:bg-rose-400/10" title="Delete branch">
                                  <TrashIcon className="h-4 w-4" aria-hidden="true" />
                                </button>
                              </div>
                            )}
                            <p className="sr-only">{pathLabel}</p>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex min-h-32 flex-col items-center justify-center border-y border-dashed border-white/10 p-5 text-center">
                      <FolderPlusIcon className="h-11 w-11 text-[#9a9a9a]" aria-hidden="true" />
                      <h4 className="mt-3 text-lg font-black text-white">No branches</h4>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>

        <aside className="admin-kits-rail xl:sticky xl:top-24 xl:self-start">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-black text-white">Structure</h3>
            </div>
            <span className={[
              'hidden rounded-full border px-3 py-1 text-[11px] font-black',
              kitIssueCount ? 'border-amber-300/20 bg-amber-400/10 text-[#ffd88a]' : 'border-emerald-300/20 bg-emerald-400/10 text-[#95e6b3]',
            ].join(' ')}>
              {kitIssueCount ? `${kitIssueCount} fix` : 'Ready'}
            </span>
          </div>

          <div className="hidden">
            {[
              ['Paths', draftKitPaths.length],
              ['Nodes', draftKitAnalysis.nodeCount],
              ['Clicks', draftKitAnalysis.maxDepth],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/15 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#8f8f8f]">{label}</p>
                <p className="text-sm font-black text-white">{Number(value).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>

          {kitIssueCount > 0 && (
            <div className="hidden">
              {kitReadyChecks.filter((check) => !check.ok).map((check) => (
                <span key={check.label} className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black text-[#ffd88a]">
                  {check.label}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4">
            {draftPrefixLabel && (
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="truncate text-[11px] font-black text-[#d6d6d6]">{draftPrefixLabel}</span>
              </div>
            )}
            <div className="study-scrollbar max-h-[26rem] overflow-auto pr-1">
              {draftKitTree.length ? renderKitTreeNodes(draftKitTree) : (
                <p className="border-y border-dashed border-white/10 py-4 text-sm font-semibold text-[#8f8f8f]">No branches</p>
              )}
            </div>
          </div>

          {draftKitPaths.length > 0 && (
            <div className="hidden">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-black uppercase tracking-wide text-[#9a9a9a]">Compact paths</p>
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-2 py-1 text-[10px] font-black text-[#d6d6d6]">
                  {draftKitPaths.length.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="study-scrollbar max-h-[18rem] space-y-2 overflow-auto pr-1">
                {draftKitPaths.map((path, index) => (
                  <div key={path.join(' / ')} className="group flex items-center gap-2 rounded-2xl border border-white/10 bg-black/15 px-3 py-2 transition hover:border-cyan-200/20 hover:bg-white/[0.055]">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-[10px] font-black text-[#9cdcfe]">
                      {index + 1}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-xs font-black text-[#d6d6d6]" title={path.join(' / ')}>
                      {path.join(' / ')}
                    </p>
                    <button type="button" onClick={() => startEditKitPath(path)} className="hidden shrink-0 text-[11px] font-black text-[#9cdcfe] hover:text-white group-hover:inline">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleRemoveKitPath(path)} className="shrink-0 text-[11px] font-black text-[#ffabb8] hover:text-white">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>

      <section className="border-t border-white/10 pt-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <label className="relative block">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#9a9a9a]" aria-hidden="true" />
            <input
              value={kitSearchQuery}
              onChange={(event) => setKitSearchQuery(event.target.value)}
              placeholder="Search kits or folders"
              className={`${inputClassName} pl-9`}
            />
          </label>
          <select value={kitSourceFilter} onChange={(event) => setKitSourceFilter(event.target.value as typeof kitSourceFilter)} className={inputClassName}>
            <option value="all">All kits</option>
            <option value="saved">Saved kits</option>
            <option value="library">Existing folders</option>
          </select>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {filteredKitTemplates.map((template) => {
          const fallbackStyle = inferCardStyle();
          const visual = getStudyCardVisual(template.iconKey || fallbackStyle.iconKey, template.tone || fallbackStyle.tone, template.examName || template.name);
          const TemplateIcon = visual.icon;
          const isBuilding = buildingTemplateKey === template.id;
          const isImproving = improvingTemplateKey === template.id;
          const isLibraryTemplate = template.source === 'library';
          const templateRootParts = expandKitPathParts([template.category, template.body, template.examName]);
          const templatePaths = polishKitPaths(template.paths, templateRootParts);
          return (
            <article
              key={template.id}
              onContextMenu={(event) => {
                event.preventDefault();
                setKitPathMenu(null);
                setKitTemplateMenu({ x: event.clientX, y: event.clientY, templateId: template.id });
              }}
              className="admin-kit-tile group relative overflow-hidden rounded-[1.35rem] border border-white/10 p-3 transition hover:-translate-y-0.5 hover:border-cyan-200/20"
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${toneBarClassName[visual.tone]}`} />
              <div className="flex items-start gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                  {visual.iconUrl ? (
                    <img src={visual.iconUrl} alt="" className="h-9 w-9 object-contain" />
                  ) : (
                    <TemplateIcon className="h-8 w-8 text-[#9cdcfe]" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 truncate text-base font-black text-white">{template.name}</h3>
                    <span className={[
                      'shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide',
                      isLibraryTemplate ? 'border-cyan-300/20 bg-cyan-300/[0.08] text-[#9cdcfe]' : 'border-emerald-300/20 bg-emerald-400/10 text-[#95e6b3]',
                    ].join(' ')}>
                      {isLibraryTemplate ? 'Existing' : 'Saved'}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs font-bold text-[#a8a8a8]">{templateRootParts.join(' / ') || template.examName}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {templatePaths.slice(0, 4).map((path) => (
                  <p key={path.join(' / ')} className="truncate text-xs font-bold text-[#d6d6d6]">
                    {path.join(' / ')}
                  </p>
                ))}
                {templatePaths.length > 4 && <p className="px-1 text-xs font-semibold text-[#8f8f8f]">+{templatePaths.length - 4} more</p>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {isLibraryTemplate ? (
                  <button type="button" onClick={() => template.sourceCardId && openCardInManager(template.sourceCardId)} className={secondaryButtonClassName}>
                    Open
                  </button>
                ) : (
                  <button type="button" onClick={() => void handleBuildTemplate(template)} disabled={Boolean(buildingTemplateKey)} className={primaryButtonClassName}>
                    <FolderPlusIcon className="h-4 w-4" aria-hidden="true" />
                    {isBuilding ? 'Creating...' : 'Create'}
                  </button>
                )}
                <button type="button" onClick={() => handleEditKitTemplate(template, isLibraryTemplate)} className={secondaryButtonClassName}>
                  <DocumentDuplicateIcon className="h-4 w-4" aria-hidden="true" />
                  {isLibraryTemplate ? 'Use' : 'Edit'}
                </button>
                <button type="button" onClick={() => void handleRunKitAiResearch('deep', template)} disabled={isKitAiLoading || Boolean(improvingTemplateKey)} className={`${secondaryButtonClassName} hidden`}>
                  <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                  {isImproving ? 'Improving...' : 'Improve'}
                </button>
                {!isLibraryTemplate && (
                  <button type="button" onClick={() => handleDeleteKitTemplate(template)} className={secondaryButtonClassName}>
                    <TrashIcon className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {!filteredKitTemplates.length && (
          <div className={`${adminEmptyStateClassName} sm:col-span-2 xl:col-span-3`}>
            <AcademicCapIcon className="mx-auto h-10 w-10 text-[#9a9a9a]" aria-hidden="true" />
            <h3 className="mt-3 text-lg font-black text-white">{displayedKitTemplates.length ? 'No kits match' : 'No folder kits'}</h3>
          </div>
        )}
      </section>

      {kitPathMenu && (
        <>
          <button type="button" aria-label="Close kit path menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setKitPathMenu(null)} />
          <div
            className="fixed z-50 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#111411] p-1.5 shadow-[0_24px_70px_rgba(0,0,0,0.58)]"
            style={{
              left: Math.max(8, Math.min(kitPathMenu.x, window.innerWidth - 236)),
              top: Math.max(8, Math.min(kitPathMenu.y, window.innerHeight - 230)),
            }}
          >
            {[
              {
                label: 'Edit branch',
                icon: PencilSquareIcon,
                action: () => startEditKitPath(kitPathMenu.path),
              },
              {
                label: 'Copy branch',
                icon: ClipboardDocumentIcon,
                action: () => copyOrCutKitBranch(kitPathMenu.path, 'copy'),
              },
              {
                label: 'Cut branch',
                icon: ScissorsIcon,
                action: () => copyOrCutKitBranch(kitPathMenu.path, 'cut'),
              },
              {
                label: 'Paste inside',
                icon: DocumentDuplicateIcon,
                action: () => pasteKitBranch(kitPathMenu.path),
                disabled: !kitBranchClipboard || (kitBranchClipboard.action === 'cut' && isKitPathPrefix(kitBranchClipboard.path, kitPathMenu.path)),
              },
              {
                label: 'Add child',
                icon: FolderPlusIcon,
                action: () => {
                  addChildToKitPath(kitPathMenu.path);
                  setKitPathMenu(null);
                },
              },
              {
                label: 'Polish branch',
                icon: CheckCircleIcon,
                action: () => polishKitBranch(kitPathMenu.path),
              },
              {
                label: 'AI compact kit',
                icon: SparklesIcon,
                action: () => {
                  setKitPathMenu(null);
                  void improveCurrentKitDraft();
                },
                disabled: isKitAiLoading || !draftKitPaths.length,
              },
              {
                label: 'Duplicate',
                icon: DocumentDuplicateIcon,
                action: () => {
                  duplicateKitPath(kitPathMenu.path);
                  setKitPathMenu(null);
                },
              },
              {
                label: 'Delete',
                icon: TrashIcon,
                action: () => {
                  handleRemoveKitPath(kitPathMenu.path);
                  setKitPathMenu(null);
                },
                danger: true,
              },
            ].map((item) => {
              const MenuIcon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  disabled={'disabled' in item && Boolean(item.disabled)}
                  className={[
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50',
                    item.danger ? 'text-[#ffabb8] hover:bg-rose-400/10' : 'text-[#e8e8e8] hover:bg-white/[0.075]',
                  ].join(' ')}
                >
                  <MenuIcon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      {kitTemplateMenu && selectedKitMenuTemplate && (
        <>
          <button type="button" aria-label="Close kit menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setKitTemplateMenu(null)} />
          <div
            className="fixed z-50 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#111411] p-1.5 shadow-[0_24px_70px_rgba(0,0,0,0.58)]"
            style={{
              left: Math.max(8, Math.min(kitTemplateMenu.x, window.innerWidth - 252)),
              top: Math.max(8, Math.min(kitTemplateMenu.y, window.innerHeight - 260)),
            }}
          >
            <div className="border-b border-white/10 px-3 py-2">
              <p className="truncate text-xs font-black text-white">{selectedKitMenuTemplate.name}</p>
              <p className="truncate text-[10px] font-bold text-[#8f8f8f]">
                {selectedKitMenuTemplate.source === 'library' ? 'Existing library kit' : 'Saved template'}
              </p>
            </div>
            {[
              selectedKitMenuTemplate.source === 'library'
                ? {
                  label: 'Open folder',
                  icon: FolderPlusIcon,
                  action: () => {
                    if (selectedKitMenuTemplate.sourceCardId) openCardInManager(selectedKitMenuTemplate.sourceCardId);
                    setKitTemplateMenu(null);
                  },
                }
                : {
                  label: 'Create draft',
                  icon: FolderPlusIcon,
                  action: () => {
                    setKitTemplateMenu(null);
                    void handleBuildTemplate(selectedKitMenuTemplate);
                  },
                },
              {
                label: selectedKitMenuTemplate.source === 'library' ? 'Use as kit' : 'Edit kit',
                icon: PencilSquareIcon,
                action: () => {
                  handleEditKitTemplate(selectedKitMenuTemplate, selectedKitMenuTemplate.source === 'library');
                  setKitTemplateMenu(null);
                },
              },
              {
                label: 'Improve with AI',
                icon: SparklesIcon,
                action: () => {
                  setKitTemplateMenu(null);
                  void handleRunKitAiResearch('deep', selectedKitMenuTemplate);
                },
              },
              selectedKitMenuTemplate.source === 'saved'
                ? {
                  label: 'Delete kit',
                  icon: TrashIcon,
                  action: () => {
                    setKitTemplateMenu(null);
                    void handleDeleteKitTemplate(selectedKitMenuTemplate);
                  },
                  danger: true,
                }
                : null,
            ].filter(Boolean).map((item) => {
              const menuItem = item as {
                label: string;
                icon: typeof FolderPlusIcon;
                action: () => void;
                danger?: boolean;
              };
              const MenuIcon = menuItem.icon;
              return (
                <button
                  key={menuItem.label}
                  type="button"
                  onClick={menuItem.action}
                  disabled={isKitAiLoading && menuItem.label === 'Improve with AI'}
                  className={[
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50',
                    menuItem.danger ? 'text-[#ffabb8] hover:bg-rose-400/10' : 'text-[#e8e8e8] hover:bg-white/[0.075]',
                  ].join(' ')}
                >
                  <MenuIcon className="h-4 w-4" aria-hidden="true" />
                  {menuItem.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );

  const renderRequests = () => (
    <section className="admin-review-section border-b border-white/10 pb-6">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,28rem)] lg:items-center">
        <h2 className="text-2xl font-black tracking-tight text-white">Student Requests</h2>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="relative block">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#9a9a9a]" aria-hidden="true" />
            <input
              value={requestQuery}
              onChange={(event) => setRequestQuery(event.target.value)}
              placeholder="Search requests"
              className={`${inputClassName} pl-9`}
            />
          </label>
          <select
            value={requestStatusFilter}
            onChange={(event) => setRequestStatusFilter(event.target.value as typeof requestStatusFilter)}
            className={inputClassName}
          >
            {requestStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
        {isLoadingRequests ? (
          <p className="px-2 py-4 text-sm font-semibold text-[#a8a8a8]">Loading requests...</p>
        ) : filteredContentRequests.length ? filteredContentRequests.map((request) => (
          <article key={request._id} className="admin-review-row grid gap-3 px-2 py-3 lg:grid-cols-[auto_minmax(0,1fr)_13rem] lg:items-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/15 text-[#9cdcfe]">
              <ClipboardDocumentListIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="min-w-0 truncate text-base font-black text-white">{request.title}</h3>
                <StatusBadge tone={requestStatusTone[request.status]}>{request.status}</StatusBadge>
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-[#a8a8a8]">
                {getRequestWorkspaceLabel(request)}{request.subject ? ` / ${request.subject}` : ''}
              </p>
              {request.message && (
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-[#d8d8d8]">{request.message}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-black text-[#a8a8a8]">
                {request.resourceType && <span>{request.resourceType}</span>}
                <span>{getRequestRequesterLabel(request)}</span>
                <span>{formatAdminDate(request.createdAt)}</span>
                <span>{formatCount(request.voteCount || 0, 'vote')}</span>
                {request.sourceUrl && (
                  <a href={request.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex max-w-[14rem] items-center gap-1 text-[#9cdcfe] hover:text-white">
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">Source</span>
                  </a>
                )}
              </div>
            </div>
            <select
              value={request.status}
              onChange={(event) => void updateRequestStatus(request, event.target.value as StudyResourceRequest['status'])}
              className={inputClassName}
              aria-label={`Status for ${request.title}`}
            >
              {requestStatusOptions.filter((option) => option.value !== 'all').map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </article>
        )) : (
          <p className="px-2 py-4 text-sm font-semibold text-[#a8a8a8]">No requests</p>
        )}
      </div>
    </section>
  );

  const renderPreview = () => (
    <section className="admin-review-section border-b border-white/10 pb-6">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,28rem)] lg:items-center">
        <h2 className="text-2xl font-black tracking-tight text-white">Student Visibility</h2>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="relative block">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#9a9a9a]" aria-hidden="true" />
            <input value={previewQuery} onChange={(event) => setPreviewQuery(event.target.value)} placeholder="Search folders" className={`${inputClassName} pl-9`} />
          </label>
          <select value={previewFilter} onChange={(event) => setPreviewFilter(event.target.value as typeof previewFilter)} className={inputClassName}>
            <option value="all">All active</option>
            <option value="visible">Student visible</option>
            <option value="draft">Draft</option>
            <option value="hidden">Hidden/private</option>
          </select>
        </div>
      </div>

      <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
        {isLoadingCards ? (
          <p className="px-2 py-4 text-sm font-semibold text-[#a8a8a8]">Loading folders...</p>
        ) : filteredPreviewCards.length ? filteredPreviewCards.map((card) => {
          const visible = card.status === 'published' && card.visibility === 'public';
          const visual = getStudyCardVisual(card.iconKey, card.tone, card.name);
          const CardIcon = visual.icon;

          return (
            <article key={card._id} className="admin-review-row grid gap-3 px-2 py-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/15">
                {visual.iconUrl ? (
                  <img src={visual.iconUrl} alt="" className="h-7 w-7 object-contain" />
                ) : (
                  <CardIcon className="h-6 w-6 text-[#9cdcfe]" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="min-w-0 truncate text-base font-black text-white">{card.name}</h3>
                  <StatusBadge tone={visible ? 'emerald' : card.status === 'draft' ? 'amber' : 'rose'}>
                    {visible ? 'visible' : card.status}
                  </StatusBadge>
                  <StatusBadge tone={card.visibility === 'public' ? 'cyan' : 'slate'}>{card.visibility}</StatusBadge>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-[#a8a8a8]">{getCardPathLabel(card)}</p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button type="button" onClick={() => openCardInManager(card._id)} className={secondaryButtonClassName}>
                  Manage
                </button>
                {visible ? (
                  <button type="button" onClick={() => void draftCardForStudents(card)} className={secondaryButtonClassName}>
                    Unpublish
                  </button>
                ) : (
                  <button type="button" onClick={() => void publishCardForStudents(card)} className={secondaryButtonClassName}>
                    Publish
                  </button>
                )}
              </div>
            </article>
          );
        }) : (
          <p className="px-2 py-4 text-sm font-semibold text-[#a8a8a8]">No folders</p>
        )}
      </div>
    </section>
  );

  const renderAccess = () => (
    <div className="admin-users-explorer min-h-[calc(100dvh-8rem)] space-y-6 px-3 pb-10 sm:px-4 lg:px-6">
      <form
        onSubmit={(event) => void handleCreateAdminUser(event)}
        className="admin-review-section border-b border-white/10 pb-6"
      >
        <div className="grid gap-3 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-center">
          <h2 className="text-2xl font-black tracking-tight text-white">Create account</h2>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_10rem_auto] md:items-center">
            <input
              value={newUserName}
              onChange={(event) => setNewUserName(event.target.value)}
              className={inputClassName}
              placeholder="Name"
              maxLength={120}
            />
            <input
              value={newUserEmail}
              onChange={(event) => setNewUserEmail(event.target.value)}
              className={inputClassName}
              placeholder="Email"
              type="email"
              maxLength={254}
            />
            <input
              value={newUserPassword}
              onChange={(event) => setNewUserPassword(event.target.value)}
              className={inputClassName}
              placeholder="Password"
              type="password"
              minLength={8}
              autoComplete="new-password"
            />
            <select value={newUserRole} onChange={(event) => setNewUserRole(event.target.value as AdminUser['role'])} className={inputClassName}>
              <option value="user">Student</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" className={primaryButtonClassName}>
              Create
            </button>
          </div>
        </div>
      </form>

      <section className="admin-review-section">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,30rem)] lg:items-center">
          <h2 className="text-2xl font-black tracking-tight text-white">Users</h2>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
            <label className="relative block">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#9a9a9a]" aria-hidden="true" />
              <input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="Search users" className={`${inputClassName} pl-9`} />
            </label>
            <select value={userRoleFilter} onChange={(event) => setUserRoleFilter(event.target.value as typeof userRoleFilter)} className={inputClassName}>
              <option value="all">All roles</option>
              {roleSummaries.map((summary) => (
                <option key={summary.role} value={summary.role}>{summary.role}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
          {isLoadingUsers ? (
            <p className="px-2 py-4 text-sm font-semibold text-[#a8a8a8]">Loading users...</p>
          ) : filteredUsers.length ? filteredUsers.map((user: AdminUser) => {
            const initials = (user.name || user.email).slice(0, 2).toUpperCase();
            const authLabel = user.authProvider === 'google' || user.googleLinked ? 'Google' : 'Password';
            const scope = getAdminScope(user);
            const isCurrentAdminAccount = Boolean(currentAdminUserId && user._id === currentAdminUserId);
            const selectedRootIds = new Set(scope.rootCardIds);
            const selectedPermissionKeys = new Set(scope.permissions);
            const selectedExamSlugs = new Set(scope.examSlugs.map((slug) => slug.toLowerCase()));

            return (
              <article key={user._id} className="admin-review-row grid gap-3 px-2 py-3 md:grid-cols-[auto_minmax(0,1fr)_10rem_auto] md:items-center">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/15 text-sm font-black text-[#9cdcfe]">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
                </span>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="min-w-0 truncate text-base font-black text-white">{user.name || 'Unnamed user'}</h3>
                    <StatusBadge tone={user.role === 'admin' ? 'rose' : 'cyan'}>{user.role === 'admin' ? 'Admin' : 'Student'}</StatusBadge>
                    <StatusBadge tone={authLabel === 'Google' ? 'emerald' : 'slate'}>{authLabel}</StatusBadge>
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-[#a8a8a8]">{user.email}</p>
                </div>
                <select
                  value={user.role}
                  onChange={(event) => void handleAdminUserRoleChange(user, event.target.value as AdminUser['role'])}
                  className={inputClassName}
                  aria-label={`Role for ${user.email}`}
                >
                  <option value="user">Student</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <button type="button" onClick={() => void handleAdminUserNameChange(user)} className="admin-icon-action" title="Update name" aria-label={`Update name for ${user.email}`}>
                    <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => void handleAdminUserEmailChange(user)} className="admin-icon-action" title="Update email" aria-label={`Update email for ${user.email}`}>
                    <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => void handleAdminUserPasswordReset(user)} className="admin-icon-action" title="Reset password" aria-label={`Reset password for ${user.email}`}>
                    <ShieldCheckIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => void handleAdminUserDelete(user)} className="admin-icon-action text-[#ffabb8]" title="Delete account" aria-label={`Delete ${user.email}`}>
                    <TrashIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {user.role === 'admin' && (
                  <div className="md:col-span-4">
                    <div className="p-0">
                      <div className="flex flex-wrap items-start justify-between gap-3 pb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={[
                            'rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wide',
                            scope.enabled
                              ? 'border-amber-200/25 bg-amber-300/15 text-[#ffe1a8]'
                              : 'border-cyan-200/20 bg-cyan-300/10 text-[#bff4ff]',
                          ].join(' ')}>
                            {scope.enabled ? 'Restricted scope' : 'Full access'}
                          </span>
                          {isCurrentAdminAccount ? (
                            <button
                              type="button"
                              disabled
                              className={`${secondaryButtonClassName} cursor-not-allowed opacity-60`}
                            >
                              Your own scope
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void toggleAdminScopeMode(user)}
                              className={scope.enabled ? secondaryButtonClassName : primaryButtonClassName}
                            >
                              {scope.enabled ? 'Use full access' : 'Enable scope editor'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="p-0">
                          <div className="flex items-center justify-between gap-2" />
                          {scope.enabled ? (
                            <AdminScopeFolderTree
                              user={user}
                              selectedRootIds={selectedRootIds}
                              cards={adminScopeAssignableCards}
                              childrenByParentId={allChildrenByParentId}
                              getCardPathLabel={getCardPathLabel}
                              onToggleRoot={toggleAdminScopeRoot}
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          }) : (
            <p className="px-2 py-4 text-sm font-semibold text-[#a8a8a8]">No users</p>
          )}
        </div>
      </section>
    </div>
  );

  const renderRecycle = () => (
    <section className="admin-review-section">
      <h2 className="text-2xl font-black tracking-tight text-white">Recycle Bin</h2>

      <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
        {archivedCards.length ? archivedCards.map((card) => {
          const visual = getStudyCardVisual(card.iconKey, card.tone, card.name);
          const CardIcon = visual.icon;

          return (
            <article key={card._id} className="admin-review-row grid gap-3 px-2 py-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-300/20 bg-rose-400/10">
                {visual.iconUrl ? (
                  <img src={visual.iconUrl} alt="" className="h-7 w-7 object-contain opacity-80" />
                ) : (
                  <CardIcon className="h-6 w-6 text-[#ffabb8]" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="min-w-0 truncate text-base font-black text-white">{card.name}</h3>
                  <StatusBadge tone="rose">archived</StatusBadge>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-[#a8a8a8]">{getCardPathLabel(card)}</p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button type="button" onClick={() => void restoreCardTree(card)} className={secondaryButtonClassName}>
                  Restore
                </button>
                <button type="button" onClick={() => void permanentlyDeleteCard(card)} className={`${secondaryButtonClassName} text-[#ffabb8]`}>
                  <TrashIcon className="h-4 w-4" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </article>
          );
        }) : (
          <p className="px-2 py-4 text-sm font-semibold text-[#a8a8a8]">Recycle bin is empty</p>
        )}
      </div>
    </section>
  );

  const renderReview = () => (
    <div className="admin-review-explorer min-h-[calc(100dvh-8rem)] space-y-6 px-3 pb-10 sm:px-4 lg:px-6">
      {renderRequests()}
      {renderPreview()}
      {renderRecycle()}
    </div>
  );

  const currentPanelItem = panelItems.find((item) => item.key === activePanel) || panelItems[1];
  const CurrentHeaderIcon = currentPanelItem.activeIcon || currentPanelItem.icon;

  return (
    <div
      className="admin-premium-shell min-h-screen bg-[rgb(var(--study-bg))] text-[rgb(var(--study-text))]"
      aria-keyshortcuts="Alt+1 Alt+2 Alt+3 Alt+4 Alt+5 / Backspace ArrowLeft ArrowRight ArrowUp ArrowDown Home End Escape"
    >
      <a href="#admin-main-content" className="study-skip-link admin-skip-link">
        Skip to admin content
      </a>
      <aside
        className={[
          'study-sidebar-surface admin-sidebar-surface fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white py-4 transition-[width,padding] duration-200 lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-950',
          isSidebarCollapsed ? 'w-20 px-2' : 'w-64 px-3',
        ].join(' ')}
      >
        <div className={['mb-5 flex items-center gap-2', isSidebarCollapsed ? 'justify-center' : 'justify-between px-2'].join(' ')}>
          <Link
            to="/admin?panel=dashboard"
            aria-label="Study Hub Admin home"
            className="study-logo-link flex items-center gap-3"
            title="Study Hub Admin"
          >
            <StudyHubLogo compact={isSidebarCollapsed} />
          </Link>
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="study-control-surface hidden h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:-translate-y-0.5 hover:text-slate-950 lg:inline-flex dark:text-slate-300 dark:hover:text-white"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className={['study-sidebar-chip mb-4 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900', isSidebarCollapsed ? 'px-2 py-2 text-center' : 'px-3 py-2'].join(' ')}>
          <p className="truncate text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-cyan-100">
            {isSidebarCollapsed ? 'AS' : 'Admin Studio'}
          </p>
        </div>

        <nav className="space-y-1">
          {panelItems.map((item, index) => {
            const isActive = activePanel === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setPanel(item.key)}
                aria-current={isActive ? 'page' : undefined}
                aria-keyshortcuts={`Alt+${index + 1}`}
                title={`${item.label} (Alt+${index + 1})`}
                className={[
                  'group flex w-full items-center rounded-xl py-2 text-sm font-semibold transition duration-200',
                  isSidebarCollapsed ? 'justify-center px-2' : 'gap-2.5 px-2.5',
                  isActive
                    ? 'study-nav-active -translate-y-0.5'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white',
                ].join(' ')}
              >
                <RaisedAdminNavIcon icon={item.icon} activeIcon={item.activeIcon} isActive={isActive} />
                {!isSidebarCollapsed && <span className="study-nav-label">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="study-sidebar-chip mt-auto space-y-1.5 rounded-2xl border border-slate-200 p-2 dark:border-slate-800">
          <div className={['flex items-center text-sm text-slate-600 dark:text-slate-400', isSidebarCollapsed ? 'justify-center' : 'justify-between'].join(' ')}>
            {!isSidebarCollapsed && <span className="font-semibold">Theme</span>}
            <ThemeToggleButton />
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className={[
              'flex w-full items-center rounded-xl py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-400/10',
              isSidebarCollapsed ? 'justify-center px-2' : 'gap-2.5 px-2.5',
            ].join(' ')}
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
            {!isSidebarCollapsed && 'Logout'}
          </button>
        </div>
      </aside>

      <div className={['transition-[padding] duration-200', isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'].join(' ')}>
        <header className="study-topbar admin-mobile-topbar sticky top-0 z-20 px-3 pt-[env(safe-area-inset-top)] text-slate-950 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-200 dark:text-white lg:border-b lg:border-white/10 lg:bg-[#101210]/88 lg:px-8 lg:py-4 lg:shadow-[0_14px_42px_rgba(0,0,0,0.22)] lg:backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-x-0 bottom-[-2.5rem] h-11 bg-gradient-to-b from-[#eef3f8]/68 via-[#eef3f8]/24 to-transparent backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black_0%,rgba(0,0,0,0.7)_42%,transparent_100%)] dark:from-[#050814]/72 dark:via-[#050814]/28 lg:hidden" />
          <div className="relative mx-auto grid h-14 w-full max-w-md grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2 lg:flex lg:h-auto lg:max-w-[96rem] lg:gap-3">
            <span className="study-control-surface flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm lg:hidden">
              <StudyHubLogo compact />
            </span>

            <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950/[0.055] text-slate-700 shadow-sm ring-1 ring-slate-950/[0.06] dark:bg-white/[0.07] dark:text-cyan-100 dark:ring-white/[0.08] lg:hidden">
                <CurrentHeaderIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 lg:hidden">
                  Admin Studio
                </p>
                <h1 className="truncate text-[15px] font-black tracking-tight text-slate-950 dark:text-white lg:text-3xl">{currentPanelItem.label}</h1>
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-2 text-[11px] font-black text-[#c9d1cd] lg:flex">
              {hasAdminSyncError ? (
                <span className="rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-1.5 text-[#ffabb8]">sync error</span>
              ) : activePanel === 'dashboard' || activePanel === 'kits' || activePanel === 'review' || activePanel === 'users' ? null : (
                <>
                  <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5">{activeCards.length} folders</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5">{totalFiles} PDFs</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5">{contentRequests.length} requests</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5">{users.length} users</span>
                </>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
              <span className="admin-mobile-theme-button study-control-surface flex h-10 w-10 items-center justify-center rounded-2xl">
                <ThemeToggleButton />
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="study-control-surface flex h-10 w-10 items-center justify-center rounded-2xl text-rose-600 transition hover:-translate-y-0.5 hover:text-rose-700 active:scale-95 dark:text-rose-200 dark:hover:text-rose-100"
                aria-label="Logout"
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <main
          id="admin-main-content"
          tabIndex={-1}
          className={[
            'mx-auto pb-28 pt-4 outline-none sm:pt-6 lg:pb-10',
            activePanel === 'dashboard' || activePanel === 'library' || activePanel === 'kits' || activePanel === 'review' || activePanel === 'users'
              ? 'max-w-none px-0 sm:px-0 lg:px-0'
              : 'max-w-[100rem] px-0 sm:px-6 lg:px-8',
          ].join(' ')}
        >
          {activePanel === 'dashboard' ? renderDashboard() : null}
          {activePanel === 'library' ? (
            <div key={activePanel} className="translate-y-0 opacity-100 transition-all duration-300 ease-out">
              <Suspense fallback={libraryPanelFallback}>
                <LibraryExplorer />
              </Suspense>
            </div>
          ) : null}
          {activePanel === 'kits' ? renderBuilder() : null}
          {activePanel === 'review' ? renderReview() : null}
          {activePanel === 'users' ? renderAccess() : null}
        </main>
      </div>

      <nav className="study-bottom-nav admin-mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 w-full max-w-full overflow-hidden border-t border-slate-200/80 bg-white/[0.97] px-1 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1.5 shadow-[0_-10px_34px_rgba(15,23,42,0.10)] backdrop-blur-2xl lg:hidden dark:border-white/10 dark:bg-slate-950/[0.97] dark:shadow-[0_-18px_45px_rgba(0,0,0,0.45)]">
        <div className="mx-auto grid h-[62px] w-full max-w-md grid-cols-5">
          {panelItems.map((item, index) => {
            const isActive = activePanel === item.key;
            const Icon = isActive ? item.activeIcon : item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setPanel(item.key)}
                aria-current={isActive ? 'page' : undefined}
                aria-keyshortcuts={`Alt+${index + 1}`}
                title={`${item.label} (Alt+${index + 1})`}
                className={[
                  'relative flex h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-bold transition-colors duration-150',
                  isActive
                    ? 'text-slate-950 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
                ].join(' ')}
              >
                <span className={[
                  'relative flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150',
                  isActive ? 'text-cyan-700 dark:text-cyan-300' : 'text-inherit',
                ].join(' ')}>
                  <span
                    key={`${item.key}-${isActive ? 'active' : 'idle'}`}
                    className={[
                      'relative flex h-6 w-6 items-center justify-center transition-transform duration-150',
                      isActive ? 'scale-[1.16]' : '',
                    ].join(' ')}
                  >
                    <Icon
                      className={['transition-colors duration-150', isActive ? 'h-[25px] w-[25px]' : 'h-[22px] w-[22px]'].join(' ')}
                      aria-hidden="true"
                    />
                  </span>
                </span>
                <span className={['max-w-full truncate leading-none transition-[color,transform,font-weight] duration-150', isActive ? '-translate-y-0.5 text-[11px] font-black' : ''].join(' ')}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {adminPromptDialog && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/58 px-4 py-6 backdrop-blur-xl">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Cancel dialog"
            onClick={() => closeAdminPrompt(null)}
          />
          <form
            className="relative w-full max-w-md overflow-hidden rounded-[1.6rem] border border-white/[0.12] bg-[#121412]/96 p-4 shadow-[0_32px_90px_rgba(0,0,0,0.66),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              closeAdminPrompt(adminPromptValue);
            }}
            role="dialog"
            aria-modal="true"
            aria-label={adminPromptDialog.title}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.42),transparent)]" />
            <p className="text-lg font-black text-white">{adminPromptDialog.title}</p>
            {adminPromptDialog.message && (
              <p className="mt-1 break-words text-sm font-semibold leading-6 text-[#b9b9b9]">{adminPromptDialog.message}</p>
            )}
            <input
              autoFocus
              value={adminPromptValue}
              onChange={(event) => setAdminPromptValue(event.target.value)}
              type={adminPromptDialog.inputType}
              placeholder={adminPromptDialog.placeholder}
              className={`${inputClassName} mt-4`}
              autoComplete={adminPromptDialog.inputType === 'password' ? 'new-password' : 'off'}
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => closeAdminPrompt(null)}
                className={secondaryButtonClassName}
              >
                {adminPromptDialog.cancelLabel}
              </button>
              <button type="submit" className={primaryButtonClassName}>
                {adminPromptDialog.confirmLabel}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
