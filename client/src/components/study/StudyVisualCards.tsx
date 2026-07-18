import { lazy, Suspense, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  BanknotesIcon,
  BeakerIcon,
  BookOpenIcon,
  BookmarkIcon,
  BriefcaseIcon,
  BuildingLibraryIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  ClipboardDocumentCheckIcon,
  CommandLineIcon,
  DocumentTextIcon,
  EyeIcon,
  FolderOpenIcon,
  GlobeAltIcon,
  MapIcon,
  NewspaperIcon,
  PaperAirplaneIcon,
  PlayIcon,
  QuestionMarkCircleIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Squares2X2Icon,
  TrophyIcon,
  WrenchScrewdriverIcon,
  UserCircleIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import ASSETS from '../../assets';
import type { StudyWorkspace } from '../../studyHubApi';
import type { LocalLibraryItem } from '../../utils/studyLibrary';
import {
  getStudyPdfDisplayUrl,
  getStudyPdfReaderHref,
  isStudyBookPackageUrl,
  isStudyPdfUrl,
  isStudyReadableDocumentUrl,
  warmStudyReadableDocument,
} from '../../utils/studyPdfReader';
import SaveLibraryItemButton from './SaveLibraryItemButton';

export type StudyIcon = ComponentType<SVGProps<SVGSVGElement>>;

const StudyPdfReaderFrame = lazy(() => import('./StudyPdfReaderFrame'));

export type StudyTone =
  | 'blue'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'indigo'
  | 'slate';

interface VisualMeta {
  icon: StudyIcon;
  tone: StudyTone;
  iconUrl?: string;
}

export interface StudyIconOption {
  key: string;
  label: string;
  icon: StudyIcon;
  tone: StudyTone;
  iconUrl?: string;
}

const toneClasses: Record<StudyTone, { badge: string; circle: string; bar: string; preview: string; glow: string }> = {
  blue: {
    badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/80 dark:bg-sky-400/12 dark:text-sky-200 dark:ring-sky-300/20',
    circle: 'bg-sky-600 text-white shadow-sky-900/20 dark:bg-sky-400 dark:text-slate-950',
    bar: 'bg-sky-500 dark:bg-sky-300',
    preview: 'bg-[radial-gradient(circle_at_18%_12%,rgba(56,189,248,0.30),transparent_38%),linear-gradient(135deg,rgba(240,249,255,0.96),rgba(224,242,254,0.78),rgba(255,255,255,0.94))] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(56,189,248,0.26),transparent_40%),linear-gradient(135deg,rgba(8,47,73,0.94),rgba(15,23,42,0.98))]',
    glow: 'bg-sky-300/35 dark:bg-sky-400/20',
  },
  violet: {
    badge: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/80 dark:bg-violet-400/12 dark:text-violet-200 dark:ring-violet-300/20',
    circle: 'bg-violet-600 text-white shadow-violet-900/20 dark:bg-violet-300 dark:text-slate-950',
    bar: 'bg-violet-500 dark:bg-violet-300',
    preview: 'bg-[radial-gradient(circle_at_18%_12%,rgba(167,139,250,0.30),transparent_38%),linear-gradient(135deg,rgba(245,243,255,0.96),rgba(237,233,254,0.76),rgba(255,255,255,0.94))] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(167,139,250,0.24),transparent_40%),linear-gradient(135deg,rgba(46,16,101,0.78),rgba(15,23,42,0.98))]',
    glow: 'bg-violet-300/35 dark:bg-violet-400/18',
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-400/12 dark:text-emerald-200 dark:ring-emerald-300/20',
    circle: 'bg-emerald-600 text-white shadow-emerald-900/20 dark:bg-emerald-300 dark:text-slate-950',
    bar: 'bg-emerald-500 dark:bg-emerald-300',
    preview: 'bg-[radial-gradient(circle_at_18%_12%,rgba(52,211,153,0.30),transparent_38%),linear-gradient(135deg,rgba(236,253,245,0.96),rgba(209,250,229,0.76),rgba(255,255,255,0.94))] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(52,211,153,0.22),transparent_40%),linear-gradient(135deg,rgba(6,78,59,0.72),rgba(15,23,42,0.98))]',
    glow: 'bg-emerald-300/35 dark:bg-emerald-400/18',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80 dark:bg-amber-300/12 dark:text-amber-100 dark:ring-amber-200/20',
    circle: 'bg-amber-500 text-slate-950 shadow-amber-900/20 dark:bg-amber-200 dark:text-slate-950',
    bar: 'bg-amber-500 dark:bg-amber-200',
    preview: 'bg-[radial-gradient(circle_at_18%_12%,rgba(251,191,36,0.34),transparent_38%),linear-gradient(135deg,rgba(255,251,235,0.96),rgba(254,243,199,0.74),rgba(255,255,255,0.94))] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(251,191,36,0.22),transparent_40%),linear-gradient(135deg,rgba(120,53,15,0.58),rgba(15,23,42,0.98))]',
    glow: 'bg-amber-300/40 dark:bg-amber-300/16',
  },
  rose: {
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-400/12 dark:text-rose-200 dark:ring-rose-300/20',
    circle: 'bg-rose-600 text-white shadow-rose-900/20 dark:bg-rose-300 dark:text-slate-950',
    bar: 'bg-rose-500 dark:bg-rose-300',
    preview: 'bg-[radial-gradient(circle_at_18%_12%,rgba(251,113,133,0.30),transparent_38%),linear-gradient(135deg,rgba(255,241,242,0.96),rgba(254,226,226,0.74),rgba(255,255,255,0.94))] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(251,113,133,0.22),transparent_40%),linear-gradient(135deg,rgba(136,19,55,0.60),rgba(15,23,42,0.98))]',
    glow: 'bg-rose-300/35 dark:bg-rose-400/18',
  },
  cyan: {
    badge: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200/80 dark:bg-cyan-300/12 dark:text-cyan-100 dark:ring-cyan-200/20',
    circle: 'bg-cyan-500 text-slate-950 shadow-cyan-900/20 dark:bg-cyan-200 dark:text-slate-950',
    bar: 'bg-cyan-500 dark:bg-cyan-200',
    preview: 'bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.32),transparent_38%),linear-gradient(135deg,rgba(236,254,255,0.96),rgba(207,250,254,0.76),rgba(255,255,255,0.94))] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.25),transparent_40%),linear-gradient(135deg,rgba(8,51,68,0.86),rgba(15,23,42,0.98))]',
    glow: 'bg-cyan-300/40 dark:bg-cyan-300/18',
  },
  indigo: {
    badge: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/80 dark:bg-indigo-400/12 dark:text-indigo-200 dark:ring-indigo-300/20',
    circle: 'bg-indigo-600 text-white shadow-indigo-900/20 dark:bg-indigo-300 dark:text-slate-950',
    bar: 'bg-indigo-500 dark:bg-indigo-300',
    preview: 'bg-[radial-gradient(circle_at_18%_12%,rgba(129,140,248,0.30),transparent_38%),linear-gradient(135deg,rgba(238,242,255,0.96),rgba(224,231,255,0.76),rgba(255,255,255,0.94))] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(129,140,248,0.22),transparent_40%),linear-gradient(135deg,rgba(49,46,129,0.70),rgba(15,23,42,0.98))]',
    glow: 'bg-indigo-300/35 dark:bg-indigo-400/18',
  },
  slate: {
    badge: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200/90 dark:bg-white/10 dark:text-slate-200 dark:ring-white/15',
    circle: 'bg-slate-700 text-white shadow-slate-950/20 dark:bg-slate-200 dark:text-slate-950',
    bar: 'bg-slate-500 dark:bg-slate-300',
    preview: 'bg-[radial-gradient(circle_at_18%_12%,rgba(148,163,184,0.28),transparent_38%),linear-gradient(135deg,rgba(248,250,252,0.96),rgba(226,232,240,0.74),rgba(255,255,255,0.94))] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(148,163,184,0.16),transparent_40%),linear-gradient(135deg,rgba(30,41,59,0.92),rgba(15,23,42,0.98))]',
    glow: 'bg-slate-300/35 dark:bg-slate-300/12',
  },
};

const studyIconAsset = (name: string) => ASSETS.icons.study[name as keyof typeof ASSETS.icons.study] ?? ASSETS.icons.study.folder;
const assetLookupKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
const iconGroupAsset = (group: Record<string, string>, key: string, fallback = studyIconAsset('folder')) => group[key] || fallback;
const categoryIconAsset = (name: string, fallback = studyIconAsset('exam')) =>
  iconGroupAsset(ASSETS.icons.categories as Record<string, string>, `ic_${assetLookupKey(name)}`, fallback);
const examIconAsset = (name: string, fallback = studyIconAsset('exam')) =>
  iconGroupAsset(ASSETS.icons.exams as Record<string, string>, `ic_${assetLookupKey(name)}`, fallback);
const entranceIconAsset = (name: string, fallback = studyIconAsset('exam')) =>
  iconGroupAsset(ASSETS.icons.entrance as Record<string, string>, `ic_${assetLookupKey(name)}`, fallback);
const educationIconAsset = (name: string, fallback = studyIconAsset('book')) =>
  iconGroupAsset(ASSETS.icons.education as Record<string, string>, `ic_${assetLookupKey(name)}`, fallback);
const languageIconAsset = (name: string, fallback = studyIconAsset('english')) =>
  iconGroupAsset(ASSETS.icons.language as Record<string, string>, `ic_${assetLookupKey(name)}`, fallback);
const tabIconAsset = (name: string, fallback = studyIconAsset('folder')) =>
  iconGroupAsset(ASSETS.icons.tabs as Record<string, string>, `ic_${assetLookupKey(name)}`, fallback);
const registeredIconAsset = (name: string, fallback = '') => ASSETS.getIconAsset(name, fallback);

const resourceVisuals: Record<string, VisualMeta> = {
  pyq: { icon: DocumentTextIcon, tone: 'violet', iconUrl: studyIconAsset('pyq') },
  notes: { icon: BookOpenIcon, tone: 'blue', iconUrl: studyIconAsset('notebook') },
  material: { icon: FolderOpenIcon, tone: 'emerald', iconUrl: studyIconAsset('study-material') },
  book: { icon: BookOpenIcon, tone: 'emerald', iconUrl: studyIconAsset('book') },
  syllabus: { icon: BookmarkIcon, tone: 'amber', iconUrl: studyIconAsset('syllabus') },
  qa: { icon: QuestionMarkCircleIcon, tone: 'rose', iconUrl: studyIconAsset('qa') },
  practice: { icon: ClipboardDocumentCheckIcon, tone: 'indigo', iconUrl: studyIconAsset('quiz') },
  update: { icon: NewspaperIcon, tone: 'amber', iconUrl: studyIconAsset('clock') },
  answer_key: { icon: ClipboardDocumentCheckIcon, tone: 'cyan', iconUrl: studyIconAsset('clipboard-check') },
  sample_paper: { icon: DocumentTextIcon, tone: 'violet', iconUrl: studyIconAsset('pyq') },
  assignment: { icon: ClipboardDocumentCheckIcon, tone: 'cyan', iconUrl: studyIconAsset('clipboard-check') },
  video: { icon: PlayIcon, tone: 'rose', iconUrl: studyIconAsset('video-lecture') },
  live: { icon: SparklesIcon, tone: 'rose', iconUrl: studyIconAsset('live-class') },
};

const workspaceVisuals: Record<string, VisualMeta> = {
  central: { icon: BuildingLibraryIcon, tone: 'blue', iconUrl: studyIconAsset('exam') },
  government: { icon: BuildingLibraryIcon, tone: 'blue', iconUrl: studyIconAsset('exam') },
  state: { icon: MapIcon, tone: 'emerald', iconUrl: studyIconAsset('folder') },
  entrance: { icon: AcademicCapIcon, tone: 'violet', iconUrl: studyIconAsset('exam') },
  teaching: { icon: BookOpenIcon, tone: 'amber', iconUrl: studyIconAsset('book') },
  school: { icon: BookOpenIcon, tone: 'emerald', iconUrl: studyIconAsset('book') },
  college: { icon: BuildingOffice2Icon, tone: 'cyan', iconUrl: studyIconAsset('student-profile') },
  university: { icon: BuildingOffice2Icon, tone: 'cyan', iconUrl: studyIconAsset('student-profile') },
  placement: { icon: BriefcaseIcon, tone: 'rose', iconUrl: studyIconAsset('certificate') },
  abroad: { icon: GlobeAltIcon, tone: 'cyan', iconUrl: studyIconAsset('student-profile') },
  language: { icon: GlobeAltIcon, tone: 'rose', iconUrl: studyIconAsset('english') },
  scholarship: { icon: TrophyIcon, tone: 'amber', iconUrl: studyIconAsset('certificate') },
  exam: { icon: ShieldCheckIcon, tone: 'blue', iconUrl: studyIconAsset('exam') },
  personal: { icon: UserCircleIcon, tone: 'slate', iconUrl: studyIconAsset('student-profile') },
};

const phaseVisuals: Record<string, VisualMeta> = {
  overview: { icon: Squares2X2Icon, tone: 'slate', iconUrl: tabIconAsset('overview') },
  foundation: { icon: BookOpenIcon, tone: 'emerald', iconUrl: studyIconAsset('book') },
  prelims: { icon: ClipboardDocumentCheckIcon, tone: 'violet', iconUrl: studyIconAsset('pyq') },
  mains: { icon: DocumentTextIcon, tone: 'blue', iconUrl: studyIconAsset('pyq') },
  interview: { icon: UserCircleIcon, tone: 'rose', iconUrl: tabIconAsset('interview') },
  written: { icon: DocumentTextIcon, tone: 'blue', iconUrl: studyIconAsset('pyq') },
  ssb: { icon: ShieldCheckIcon, tone: 'indigo', iconUrl: examIconAsset('ssb') },
  'tier-1': { icon: ClipboardDocumentCheckIcon, tone: 'violet', iconUrl: studyIconAsset('pyq') },
  'tier-2': { icon: ChartBarIcon, tone: 'blue', iconUrl: studyIconAsset('chart') },
  typing: { icon: CommandLineIcon, tone: 'cyan', iconUrl: studyIconAsset('coding') },
  physics: { icon: BeakerIcon, tone: 'blue', iconUrl: studyIconAsset('science') },
  chemistry: { icon: BeakerIcon, tone: 'amber', iconUrl: studyIconAsset('science') },
  biology: { icon: SparklesIcon, tone: 'emerald', iconUrl: studyIconAsset('science') },
  maths: { icon: ChartBarIcon, tone: 'violet', iconUrl: studyIconAsset('aptitude') },
  domain: { icon: AcademicCapIcon, tone: 'blue', iconUrl: studyIconAsset('exam') },
  language: { icon: BookOpenIcon, tone: 'rose', iconUrl: studyIconAsset('english') },
  'general-test': { icon: ClipboardDocumentCheckIcon, tone: 'indigo', iconUrl: studyIconAsset('quiz') },
  books: { icon: BookOpenIcon, tone: 'emerald', iconUrl: studyIconAsset('book') },
  'sample-papers': { icon: DocumentTextIcon, tone: 'violet', iconUrl: studyIconAsset('pyq') },
  revision: { icon: CheckBadgeIcon, tone: 'blue', iconUrl: studyIconAsset('target') },
  aptitude: { icon: ChartBarIcon, tone: 'violet', iconUrl: studyIconAsset('aptitude') },
  coding: { icon: CommandLineIcon, tone: 'cyan', iconUrl: studyIconAsset('coding') },
  technical: { icon: BuildingOffice2Icon, tone: 'blue', iconUrl: examIconAsset('gear') },
  hr: { icon: UserCircleIcon, tone: 'rose', iconUrl: studyIconAsset('qa') },
  essay: { icon: DocumentTextIcon, tone: 'rose', iconUrl: studyIconAsset('notebook') },
  optional: { icon: BookmarkIcon, tone: 'indigo', iconUrl: studyIconAsset('bookmark') },
  'current-affairs': { icon: NewspaperIcon, tone: 'amber', iconUrl: studyIconAsset('clock') },
  'answer-keys': { icon: ClipboardDocumentCheckIcon, tone: 'cyan', iconUrl: tabIconAsset('answer-key') },
};

const cardIconVisuals: Record<string, VisualMeta> = {
  heading: { icon: Squares2X2Icon, tone: 'indigo', iconUrl: studyIconAsset('study-material') },
  section: { icon: Squares2X2Icon, tone: 'indigo', iconUrl: studyIconAsset('folder') },
  folder: { icon: FolderOpenIcon, tone: 'blue', iconUrl: studyIconAsset('folder') },
  government: { icon: BuildingLibraryIcon, tone: 'blue', iconUrl: studyIconAsset('exam') },
  competitive: { icon: BuildingLibraryIcon, tone: 'blue', iconUrl: categoryIconAsset('competitive') },
  entrance: { icon: AcademicCapIcon, tone: 'violet', iconUrl: categoryIconAsset('entrance') },
  university: { icon: BuildingOffice2Icon, tone: 'cyan', iconUrl: categoryIconAsset('university') },
  abroad: { icon: GlobeAltIcon, tone: 'cyan', iconUrl: categoryIconAsset('abroad') },
  scholarship: { icon: TrophyIcon, tone: 'amber', iconUrl: categoryIconAsset('olympiad') },
  exam: { icon: ShieldCheckIcon, tone: 'blue', iconUrl: studyIconAsset('exam') },
  school: { icon: BookOpenIcon, tone: 'emerald', iconUrl: categoryIconAsset('school') },
  'school-board': { icon: BookOpenIcon, tone: 'emerald', iconUrl: categoryIconAsset('school') },
  'state-exam': { icon: MapIcon, tone: 'amber', iconUrl: categoryIconAsset('state-exam') },
  board: { icon: BookOpenIcon, tone: 'emerald', iconUrl: educationIconAsset('cbse') },
  class: { icon: BookOpenIcon, tone: 'emerald', iconUrl: educationIconAsset('senior-sec') },
  college: { icon: BuildingOffice2Icon, tone: 'cyan', iconUrl: categoryIconAsset('university') },
  placement: { icon: BriefcaseIcon, tone: 'rose', iconUrl: categoryIconAsset('placement') },
  company: { icon: BriefcaseIcon, tone: 'rose', iconUrl: categoryIconAsset('placement') },
  career: { icon: BriefcaseIcon, tone: 'rose', iconUrl: categoryIconAsset('placement') },
  banking: { icon: BanknotesIcon, tone: 'emerald', iconUrl: examIconAsset('bank') },
  railway: { icon: MapIcon, tone: 'amber', iconUrl: examIconAsset('railway') },
  defence: { icon: ShieldCheckIcon, tone: 'indigo', iconUrl: examIconAsset('shield') },
  upsc: { icon: BuildingLibraryIcon, tone: 'blue', iconUrl: examIconAsset('upsc-cse') },
  ssc: { icon: ChartBarIcon, tone: 'violet', iconUrl: examIconAsset('ssc-cgl') },
  gate: { icon: AcademicCapIcon, tone: 'cyan', iconUrl: entranceIconAsset('gate') },
  jee: { icon: BeakerIcon, tone: 'rose', iconUrl: educationIconAsset('iit') },
  neet: { icon: SparklesIcon, tone: 'emerald', iconUrl: entranceIconAsset('neet') },
  cat: { icon: ChartBarIcon, tone: 'indigo', iconUrl: studyIconAsset('chart') },
  clat: { icon: ScaleIcon, tone: 'amber', iconUrl: educationIconAsset('nlu') },
  cuet: { icon: AcademicCapIcon, tone: 'cyan', iconUrl: categoryIconAsset('university') },
  'cuet-ug': { icon: AcademicCapIcon, tone: 'cyan', iconUrl: categoryIconAsset('university') },
  'cuet-pg': { icon: AcademicCapIcon, tone: 'cyan', iconUrl: categoryIconAsset('university') },
  'iit-jam': { icon: AcademicCapIcon, tone: 'cyan', iconUrl: entranceIconAsset('iit-jam') },
  ignou: { icon: BuildingOffice2Icon, tone: 'cyan', iconUrl: educationIconAsset('ignou') },
  iit: { icon: AcademicCapIcon, tone: 'cyan', iconUrl: educationIconAsset('iit') },
  iim: { icon: ChartBarIcon, tone: 'indigo', iconUrl: educationIconAsset('iim') },
  nlu: { icon: ScaleIcon, tone: 'amber', iconUrl: educationIconAsset('nlu') },
  tet: { icon: AcademicCapIcon, tone: 'emerald', iconUrl: entranceIconAsset('teacher') },
  'ugc-net': { icon: AcademicCapIcon, tone: 'blue', iconUrl: studyIconAsset('student-profile') },
  'csir-net': { icon: BeakerIcon, tone: 'cyan', iconUrl: examIconAsset('bio-research') },
  ielts: { icon: GlobeAltIcon, tone: 'cyan', iconUrl: languageIconAsset('ielts') },
  gre: { icon: GlobeAltIcon, tone: 'indigo', iconUrl: languageIconAsset('toefl-gre') },
  gmat: { icon: ChartBarIcon, tone: 'violet', iconUrl: studyIconAsset('chart') },
  toefl: { icon: GlobeAltIcon, tone: 'cyan', iconUrl: languageIconAsset('toefl-gre') },
  sat: { icon: AcademicCapIcon, tone: 'rose', iconUrl: studyIconAsset('exam') },
  visa: { icon: PaperAirplaneIcon, tone: 'cyan', iconUrl: studyIconAsset('certificate') },
  'upsc-cse': { icon: BuildingLibraryIcon, tone: 'blue', iconUrl: examIconAsset('upsc-cse') },
  nda: { icon: ShieldCheckIcon, tone: 'indigo', iconUrl: examIconAsset('nda') },
  cds: { icon: ShieldCheckIcon, tone: 'indigo', iconUrl: examIconAsset('cds') },
  shield: { icon: ShieldCheckIcon, tone: 'indigo', iconUrl: examIconAsset('shield') },
  gear: { icon: WrenchScrewdriverIcon, tone: 'cyan', iconUrl: examIconAsset('gear') },
  forest: { icon: SparklesIcon, tone: 'emerald', iconUrl: examIconAsset('forest') },
  'ssc-cgl': { icon: ChartBarIcon, tone: 'violet', iconUrl: examIconAsset('ssc-cgl') },
  'ssc-chsl': { icon: DocumentTextIcon, tone: 'violet', iconUrl: examIconAsset('ssc-chsl') },
  'ssc-gd': { icon: ShieldCheckIcon, tone: 'indigo', iconUrl: examIconAsset('ssc-gd') },
  police: { icon: ShieldCheckIcon, tone: 'indigo', iconUrl: examIconAsset('police') },
  sbi: { icon: BanknotesIcon, tone: 'emerald', iconUrl: examIconAsset('sbi') },
  bank: { icon: BanknotesIcon, tone: 'emerald', iconUrl: examIconAsset('bank') },
  rbi: { icon: BanknotesIcon, tone: 'emerald', iconUrl: examIconAsset('rbi') },
  nabard: { icon: BanknotesIcon, tone: 'emerald', iconUrl: examIconAsset('nabard') },
  sebi: { icon: ChartBarIcon, tone: 'emerald', iconUrl: examIconAsset('sebi') },
  epfo: { icon: BanknotesIcon, tone: 'emerald', iconUrl: examIconAsset('epfo') },
  'rrb-ntpc': { icon: MapIcon, tone: 'amber', iconUrl: examIconAsset('rrb-ntpc') },
  metro: { icon: MapIcon, tone: 'amber', iconUrl: examIconAsset('metro') },
  wrench: { icon: WrenchScrewdriverIcon, tone: 'cyan', iconUrl: examIconAsset('wrench') },
  'coast-guard': { icon: ShieldCheckIcon, tone: 'indigo', iconUrl: examIconAsset('coast-guard') },
  'ib-acio': { icon: QuestionMarkCircleIcon, tone: 'indigo', iconUrl: examIconAsset('ib-acio') },
  ssb: { icon: UserCircleIcon, tone: 'rose', iconUrl: examIconAsset('ssb') },
  teacher: { icon: AcademicCapIcon, tone: 'emerald', iconUrl: entranceIconAsset('teacher') },
  judiciary: { icon: ScaleIcon, tone: 'amber', iconUrl: examIconAsset('judiciary') },
  isro: { icon: SparklesIcon, tone: 'blue', iconUrl: examIconAsset('isro') },
  research: { icon: BeakerIcon, tone: 'blue', iconUrl: examIconAsset('research') },
  nuclear: { icon: BeakerIcon, tone: 'blue', iconUrl: examIconAsset('nuclear') },
  oil: { icon: WrenchScrewdriverIcon, tone: 'cyan', iconUrl: examIconAsset('oil') },
  bhel: { icon: BuildingOffice2Icon, tone: 'cyan', iconUrl: examIconAsset('bhel') },
  bel: { icon: BuildingOffice2Icon, tone: 'cyan', iconUrl: examIconAsset('bel') },
  power: { icon: WrenchScrewdriverIcon, tone: 'cyan', iconUrl: examIconAsset('power') },
  postal: { icon: DocumentTextIcon, tone: 'blue', iconUrl: examIconAsset('postal') },
  fci: { icon: BuildingLibraryIcon, tone: 'amber', iconUrl: examIconAsset('fci') },
  medical: { icon: BeakerIcon, tone: 'emerald', iconUrl: examIconAsset('medical') },
  gpat: { icon: BeakerIcon, tone: 'emerald', iconUrl: entranceIconAsset('gpat') },
  ayush: { icon: SparklesIcon, tone: 'emerald', iconUrl: entranceIconAsset('ayush') },
  'bio-research': { icon: BeakerIcon, tone: 'emerald', iconUrl: examIconAsset('bio-research') },
  nift: { icon: SparklesIcon, tone: 'rose', iconUrl: entranceIconAsset('nift') },
  'ca-final': { icon: ChartBarIcon, tone: 'emerald', iconUrl: entranceIconAsset('ca-final') },
  management: { icon: ChartBarIcon, tone: 'indigo', iconUrl: educationIconAsset('iim') },
  professional: { icon: CheckBadgeIcon, tone: 'emerald', iconUrl: studyIconAsset('certificate') },
  book: { icon: BookOpenIcon, tone: 'emerald', iconUrl: studyIconAsset('book') },
  books: { icon: BookOpenIcon, tone: 'emerald', iconUrl: studyIconAsset('book') },
  textbook: { icon: BookOpenIcon, tone: 'emerald', iconUrl: studyIconAsset('book') },
  notes: { icon: BookOpenIcon, tone: 'blue', iconUrl: studyIconAsset('notebook') },
  pyq: { icon: DocumentTextIcon, tone: 'violet', iconUrl: studyIconAsset('pyq') },
  paper: { icon: DocumentTextIcon, tone: 'violet', iconUrl: studyIconAsset('pyq') },
  papers: { icon: DocumentTextIcon, tone: 'violet', iconUrl: studyIconAsset('pyq') },
  'question-paper': { icon: DocumentTextIcon, tone: 'violet', iconUrl: studyIconAsset('pyq') },
  'previous-year-papers': { icon: DocumentTextIcon, tone: 'violet', iconUrl: studyIconAsset('pyq') },
  'board-paper': { icon: DocumentTextIcon, tone: 'violet', iconUrl: studyIconAsset('pyq') },
  syllabus: { icon: BookmarkIcon, tone: 'amber', iconUrl: studyIconAsset('syllabus') },
  qa: { icon: QuestionMarkCircleIcon, tone: 'rose', iconUrl: studyIconAsset('qa') },
  practice: { icon: ClipboardDocumentCheckIcon, tone: 'indigo', iconUrl: studyIconAsset('quiz') },
  test: { icon: ClipboardDocumentCheckIcon, tone: 'indigo', iconUrl: studyIconAsset('quiz') },
  quiz: { icon: ClipboardDocumentCheckIcon, tone: 'indigo', iconUrl: studyIconAsset('quiz') },
  mock: { icon: ClipboardDocumentCheckIcon, tone: 'indigo', iconUrl: studyIconAsset('mock-test') },
  'mock-tests': { icon: ClipboardDocumentCheckIcon, tone: 'indigo', iconUrl: studyIconAsset('mock-test') },
  dpp: { icon: ClipboardDocumentCheckIcon, tone: 'indigo', iconUrl: studyIconAsset('quiz') },
  update: { icon: NewspaperIcon, tone: 'amber', iconUrl: studyIconAsset('clock') },
  updates: { icon: NewspaperIcon, tone: 'amber', iconUrl: studyIconAsset('clock') },
  notification: { icon: NewspaperIcon, tone: 'amber', iconUrl: studyIconAsset('clock') },
  calendar: { icon: CalendarDaysIcon, tone: 'violet', iconUrl: studyIconAsset('clock') },
  'answer-key': { icon: ClipboardDocumentCheckIcon, tone: 'cyan', iconUrl: studyIconAsset('clipboard-check') },
  'answer-keys': { icon: ClipboardDocumentCheckIcon, tone: 'cyan', iconUrl: studyIconAsset('clipboard-check') },
  worksheet: { icon: ClipboardDocumentCheckIcon, tone: 'cyan', iconUrl: studyIconAsset('clipboard') },
  practical: { icon: BeakerIcon, tone: 'cyan', iconUrl: studyIconAsset('science') },
  project: { icon: ClipboardDocumentCheckIcon, tone: 'cyan', iconUrl: studyIconAsset('clipboard-check') },
  formula: { icon: ChartBarIcon, tone: 'violet', iconUrl: studyIconAsset('formula') },
  mindmap: { icon: MapIcon, tone: 'cyan', iconUrl: studyIconAsset('brain') },
  'mind-map': { icon: MapIcon, tone: 'cyan', iconUrl: studyIconAsset('brain') },
  concept: { icon: LightBulbIcon, tone: 'amber', iconUrl: studyIconAsset('brain') },
  revision: { icon: CheckBadgeIcon, tone: 'blue', iconUrl: studyIconAsset('target') },
  'class-notes': { icon: BookOpenIcon, tone: 'blue', iconUrl: studyIconAsset('notebook') },
  sample: { icon: DocumentTextIcon, tone: 'violet', iconUrl: studyIconAsset('pyq') },
  'sample-paper': { icon: DocumentTextIcon, tone: 'violet', iconUrl: studyIconAsset('pyq') },
  ncert: { icon: BookOpenIcon, tone: 'emerald', iconUrl: educationIconAsset('cbse') },
  cbse: { icon: BookOpenIcon, tone: 'emerald', iconUrl: educationIconAsset('cbse') },
  icse: { icon: BookOpenIcon, tone: 'cyan', iconUrl: educationIconAsset('icse') },
  isc: { icon: BookOpenIcon, tone: 'cyan', iconUrl: educationIconAsset('icse') },
  'state-board': { icon: MapIcon, tone: 'emerald', iconUrl: educationIconAsset('state-board') },
  english: { icon: BookOpenIcon, tone: 'cyan', iconUrl: studyIconAsset('english') },
  hindi: { icon: BookOpenIcon, tone: 'rose', iconUrl: studyIconAsset('book') },
  sanskrit: { icon: BookOpenIcon, tone: 'amber', iconUrl: studyIconAsset('book') },
  language: { icon: GlobeAltIcon, tone: 'rose', iconUrl: studyIconAsset('english') },
  reasoning: { icon: LightBulbIcon, tone: 'amber', iconUrl: studyIconAsset('brain') },
  knowledge: { icon: BookOpenIcon, tone: 'rose', iconUrl: studyIconAsset('brain') },
  'general-knowledge': { icon: BookOpenIcon, tone: 'rose', iconUrl: studyIconAsset('brain') },
  'current-affairs': { icon: NewspaperIcon, tone: 'amber', iconUrl: studyIconAsset('clock') },
  history: { icon: BuildingLibraryIcon, tone: 'amber', iconUrl: studyIconAsset('book') },
  geography: { icon: MapIcon, tone: 'emerald', iconUrl: studyIconAsset('brain') },
  polity: { icon: BuildingLibraryIcon, tone: 'blue', iconUrl: studyIconAsset('exam') },
  'political-science': { icon: BuildingLibraryIcon, tone: 'blue', iconUrl: studyIconAsset('exam') },
  economics: { icon: BanknotesIcon, tone: 'emerald', iconUrl: studyIconAsset('chart') },
  economy: { icon: BanknotesIcon, tone: 'emerald', iconUrl: studyIconAsset('chart') },
  commerce: { icon: BanknotesIcon, tone: 'emerald', iconUrl: studyIconAsset('chart') },
  accountancy: { icon: BanknotesIcon, tone: 'emerald', iconUrl: studyIconAsset('chart') },
  'business-studies': { icon: BriefcaseIcon, tone: 'rose', iconUrl: studyIconAsset('certificate') },
  psychology: { icon: LightBulbIcon, tone: 'violet', iconUrl: studyIconAsset('brain') },
  sociology: { icon: UserCircleIcon, tone: 'rose', iconUrl: studyIconAsset('student-profile') },
  environment: { icon: SparklesIcon, tone: 'emerald', iconUrl: studyIconAsset('science') },
  'art-culture': { icon: SparklesIcon, tone: 'amber', iconUrl: studyIconAsset('sparkles') },
  law: { icon: ScaleIcon, tone: 'amber', iconUrl: studyIconAsset('book') },
  design: { icon: SparklesIcon, tone: 'rose', iconUrl: entranceIconAsset('design') },
  architecture: { icon: BuildingOffice2Icon, tone: 'cyan', iconUrl: entranceIconAsset('architecture') },
  engineering: { icon: WrenchScrewdriverIcon, tone: 'cyan', iconUrl: examIconAsset('gear') },
  'computer-science': { icon: CommandLineIcon, tone: 'cyan', iconUrl: studyIconAsset('coding') },
  it: { icon: CommandLineIcon, tone: 'cyan', iconUrl: studyIconAsset('coding') },
  material: { icon: FolderOpenIcon, tone: 'emerald', iconUrl: studyIconAsset('study-material') },
  'study-material': { icon: FolderOpenIcon, tone: 'emerald', iconUrl: studyIconAsset('study-material') },
  solution: { icon: BookOpenIcon, tone: 'rose', iconUrl: studyIconAsset('book-solution') },
  'book-solution': { icon: BookOpenIcon, tone: 'rose', iconUrl: studyIconAsset('book-solution') },
  'ncert-solutions': { icon: BookOpenIcon, tone: 'rose', iconUrl: studyIconAsset('book-solution') },
  'board-pattern': { icon: Squares2X2Icon, tone: 'amber', iconUrl: studyIconAsset('syllabus') },
  video: { icon: PlayIcon, tone: 'rose', iconUrl: studyIconAsset('video-lecture') },
  'video-lecture': { icon: PlayIcon, tone: 'rose', iconUrl: studyIconAsset('video-lecture') },
  live: { icon: SparklesIcon, tone: 'rose', iconUrl: studyIconAsset('live-class') },
  'live-class': { icon: SparklesIcon, tone: 'rose', iconUrl: studyIconAsset('live-class') },
  certificate: { icon: CheckBadgeIcon, tone: 'amber', iconUrl: studyIconAsset('certificate') },
  profile: { icon: UserCircleIcon, tone: 'blue', iconUrl: studyIconAsset('student-profile') },
  student: { icon: UserCircleIcon, tone: 'blue', iconUrl: studyIconAsset('student-profile') },
  map: { icon: MapIcon, tone: 'cyan', iconUrl: studyIconAsset('brain') },
  physics: { icon: BeakerIcon, tone: 'blue', iconUrl: studyIconAsset('science') },
  chemistry: { icon: BeakerIcon, tone: 'amber', iconUrl: studyIconAsset('science') },
  biology: { icon: SparklesIcon, tone: 'emerald', iconUrl: studyIconAsset('science') },
  science: { icon: BeakerIcon, tone: 'blue', iconUrl: studyIconAsset('science') },
  maths: { icon: ChartBarIcon, tone: 'violet', iconUrl: studyIconAsset('aptitude') },
  aptitude: { icon: ChartBarIcon, tone: 'violet', iconUrl: studyIconAsset('aptitude') },
  coding: { icon: CommandLineIcon, tone: 'cyan', iconUrl: studyIconAsset('coding') },
  dsa: { icon: CommandLineIcon, tone: 'cyan', iconUrl: studyIconAsset('coding') },
  technical: { icon: CommandLineIcon, tone: 'cyan', iconUrl: studyIconAsset('coding') },
  resume: { icon: DocumentTextIcon, tone: 'blue', iconUrl: studyIconAsset('certificate') },
  hr: { icon: UserCircleIcon, tone: 'rose', iconUrl: studyIconAsset('qa') },
  strategy: { icon: LightBulbIcon, tone: 'amber', iconUrl: studyIconAsset('target') },
  target: { icon: LightBulbIcon, tone: 'amber', iconUrl: studyIconAsset('target') },
  'study-plan': { icon: CalendarDaysIcon, tone: 'violet', iconUrl: studyIconAsset('target') },
  roadmap: { icon: CalendarDaysIcon, tone: 'amber', iconUrl: studyIconAsset('target') },
  verified: { icon: CheckBadgeIcon, tone: 'cyan', iconUrl: ASSETS.icons.badges.ic_verified },
  official: { icon: ShieldCheckIcon, tone: 'blue', iconUrl: ASSETS.icons.badges.ic_verified },
  interview: { icon: UserCircleIcon, tone: 'rose', iconUrl: studyIconAsset('qa') },
  tools: { icon: WrenchScrewdriverIcon, tone: 'slate', iconUrl: studyIconAsset('target') },
  download: { icon: ArrowDownTrayIcon, tone: 'emerald', iconUrl: studyIconAsset('pyq') },
  'important-question': { icon: QuestionMarkCircleIcon, tone: 'amber', iconUrl: studyIconAsset('qa') },
  'important-questions': { icon: QuestionMarkCircleIcon, tone: 'amber', iconUrl: studyIconAsset('qa') },
  'marking-scheme': { icon: ClipboardDocumentCheckIcon, tone: 'slate', iconUrl: studyIconAsset('clipboard-check') },
  'marking-schemes': { icon: ClipboardDocumentCheckIcon, tone: 'slate', iconUrl: studyIconAsset('clipboard-check') },
};

Object.entries(cardIconVisuals).forEach(([key, visual]) => {
  const iconUrl = registeredIconAsset(key);
  if (iconUrl) cardIconVisuals[key] = { ...visual, iconUrl };
});

Object.entries(resourceVisuals).forEach(([key, visual]) => {
  const iconUrl = registeredIconAsset(key);
  if (iconUrl) resourceVisuals[key] = { ...visual, iconUrl };
});

Object.entries(phaseVisuals).forEach(([key, visual]) => {
  const iconUrl = registeredIconAsset(key);
  if (iconUrl) phaseVisuals[key] = { ...visual, iconUrl };
});

const normalizeIconLookupKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const slugIconKey = (value = '') => normalizeIconLookupKey(value).replace(/\s+/g, '-');

const iconAliasEntries = (names: string[], iconKey: string) =>
  Object.fromEntries(names.map((name) => [slugIconKey(name), iconKey]));

const iconAliases: Record<string, string> = {
  answer: 'answer-key',
  'answer-keys': 'answer-key',
  'answer-key': 'answer-key',
  'board-papers': 'board-paper',
  'business-study': 'business-studies',
  'business-studies': 'business-studies',
  'central-government-exams': 'government',
  'central-govt-exams': 'government',
  'class-notes': 'notes',
  'coding-practice': 'coding',
  'competitive-exams': 'competitive',
  'current-affair': 'current-affairs',
  'current-affairs': 'current-affairs',
  'entrance-exams': 'entrance',
  'exam-strategy': 'strategy',
  'foreign-language': 'language',
  'english-tests': 'ielts',
  'ielts-academic': 'ielts',
  'ielts-general-training': 'ielts',
  'ielts-gt': 'ielts',
  'general-awareness': 'general-knowledge',
  'government-jobs': 'government',
  'indian-economy': 'economics',
  'indian-polity': 'polity',
  'information-technology': 'it',
  'mock-test': 'mock',
  'mock-tests': 'mock',
  'olympiad': 'scholarship',
  'olympiads': 'scholarship',
  'olympiads-and-scholarships': 'scholarship',
  'placement-and-career': 'placement',
  'placement-and-private': 'placement',
  'placement-private': 'placement',
  'service-based-it': 'placement',
  'product-based': 'placement',
  'common-preparation': 'coding',
  'dsa-placement-prep': 'coding',
  'previous-year-paper': 'pyq',
  'previous-year-papers': 'pyq',
  'question-papers': 'question-paper',
  'sample-papers': 'sample-paper',
  'school-boards': 'school-board',
  'school-exams': 'school-board',
  'state-boards': 'state-board',
  'state-exams': 'state-exam',
  'study-abroad': 'abroad',
  'study-material': 'material',
  'topper-strategy': 'strategy',
  'toppers-notes': 'notes',
  'university-exams': 'university',
  ...iconAliasEntries(['competitive-exams-icon'], 'competitive'),
  ...iconAliasEntries([
    'upsc-main',
    'upsc-cse',
  ], 'upsc'),
  ...iconAliasEntries(['upsc-nda', 'upsc-cds', 'upsc-capf'], 'defence'),
  ...iconAliasEntries(['upsc-ies', 'ies-ese', 'ssc-je', 'rrb-je', 'dmrc-je'], 'engineering'),
  ...iconAliasEntries(['upsc-ifos', 'icar-ars'], 'environment'),
  ...iconAliasEntries(['upsc-geo'], 'geography'),
  ...iconAliasEntries(['upsc-interview', 'ssb-interview', 'ssb-pi'], 'interview'),
  ...iconAliasEntries(['ssc-main', 'ssc-cgl', 'ssc-chsl', 'ssc-mts', 'ssc-selection'], 'ssc'),
  ...iconAliasEntries(['ssc-gd'], 'defence'),
  ...iconAliasEntries(['ssc-cpo', 'rpf-si', 'rpf-constable'], 'defence'),
  ...iconAliasEntries(['ssc-steno'], 'notes'),
  ...iconAliasEntries(['ssc-jht'], 'hindi'),
  ...iconAliasEntries([
    'banking-main',
    'sbi-po',
    'sbi-clerk',
    'ibps-po',
    'ibps-clerk',
    'ibps-rrb',
    'ibps-so',
    'rbi-grade-b',
    'rbi-assistant',
    'nabard',
    'sebi',
    'sidbi',
    'nhb',
    'pfrda',
    'exim-bank',
    'irdai',
    'gic',
    'ecgc',
  ], 'banking'),
  ...iconAliasEntries(['lic-aao', 'lic-ado', 'lic-assistant', 'niacl', 'nicl', 'new-india', 'oriental', 'united-india'], 'banking'),
  ...iconAliasEntries([
    'railway-main',
    'rrb-ntpc',
    'rrb-alp',
    'rpsf',
    'dmrc',
    'bmrcl',
    'cmrl',
    'hmrl',
    'kolkata-metro',
    'mumbai-metro',
    'pune-metro',
    'jaipur-metro',
    'lucknow-metro',
    'kochi-metro',
    'rites',
    'ircon',
  ], 'railway'),
  ...iconAliasEntries(['rrb-group-d', 'rrc-apprentice'], 'engineering'),
  ...iconAliasEntries(['railway-medical'], 'medical'),
  ...iconAliasEntries([
    'defence-main',
    'agniveer-army',
    'agniveer-navy',
    'agniveer-af',
    'afcat',
    'indian-navy',
    'navy-inet',
    'indian-army',
    'army-tgc',
    'army-ncc',
    'coast-guard',
    'coast-guard-navik',
    'bsf',
    'crpf',
    'cisf',
    'itbp',
    'ssb-force',
    'assam-rifles',
  ], 'defence'),
  ...iconAliasEntries(['army-tes'], 'science'),
  ...iconAliasEntries(['army-jag'], 'law'),
  ...iconAliasEntries(['ib-acio'], 'qa'),
  ...iconAliasEntries(['ssb-oir'], 'aptitude'),
  ...iconAliasEntries(['ssb-ppdt', 'ssb-tat'], 'mindmap'),
  ...iconAliasEntries(['ssb-wat'], 'notes'),
  ...iconAliasEntries(['ssb-srt'], 'practice'),
  ...iconAliasEntries(['ssb-gto'], 'practice'),
  ...iconAliasEntries(['judiciary-main', 'civil-judge', 'djs', 'up-pcsj', 'bihar-js', 'hjs', 'aibe', 'aor', 'bare-acts', 'case-laws'], 'law'),
  ...iconAliasEntries([
    'science-main',
    'drdo-rac',
    'drdo-ceptam',
    'barc-oces',
    'barc-dgfs',
    'csir-scientist',
    'csir-net',
    'imd',
    'isro',
    'isro-scientist',
  ], 'science'),
  ...iconAliasEntries(['icar-jrf'], 'environment'),
  ...iconAliasEntries(['icmr'], 'medical'),
  ...iconAliasEntries(['iss'], 'maths'),
  ...iconAliasEntries(['cdac', 'nielit'], 'computer-science'),
  ...iconAliasEntries([
    'engineering-main',
    'ongc',
    'iocl',
    'bpcl',
    'hpcl',
    'gail',
    'ntpc',
    'powergrid',
    'bhel',
    'bel',
    'hal',
    'sail',
    'nlc',
    'nhpc',
    'npcil',
    'eil',
    'wapcos',
    'coal-india',
    'aai',
  ], 'engineering'),
  ...iconAliasEntries(['school-main'], 'school-board'),
  ...iconAliasEntries([
    'up-board',
    'bihar-board',
    'mp-board',
    'rajasthan-board',
    'maharashtra-board',
    'tn-board',
    'karnataka-puc',
    'ap-board',
    'ts-board',
    'wb-board',
    'gujarat-board',
    'haryana-board',
    'punjab-board',
    'kerala-board',
  ], 'state-board'),
  ...iconAliasEntries([
    'state-exam',
    'state-exams',
    'state-civil-services',
    'state-specific-exams',
    'uppsc',
    'uppsc-pcs',
    'bpsc',
    'bpsc-pcs',
    'mppsc',
    'mppsc-state-service',
    'rpsc-ras',
    'mpsc',
    'mpsc-rajyaseva',
    'tnpsc',
    'tnpsc-group-1',
    'kpsc-kas',
    'appsc-tspsc',
    'wbpsc',
    'gpsc',
    'upsssc-pet',
    'upsssc-lekhpal',
    'rsmssb-patwari',
    'bssc-cgl',
  ], 'state-exam'),
  ...iconAliasEntries(['class-primary', 'class-middle', 'class-secondary', 'class-sr-sec'], 'class'),
  ...iconAliasEntries(['subject-math', 'olympiad-math', 'imo-intl', 'sof-imo', 'step-math'], 'maths'),
  ...iconAliasEntries(['subject-science', 'olympiad-physics', 'nsep', 'ipho', 'sof-nso', 'nsejs', 'isro'], 'science'),
  ...iconAliasEntries(['subject-physics'], 'physics'),
  ...iconAliasEntries(['subject-chemistry', 'olympiad-chem', 'nsec', 'icho'], 'chemistry'),
  ...iconAliasEntries(['subject-biology', 'olympiad-bio', 'nseb', 'ibo'], 'biology'),
  ...iconAliasEntries(['subject-sst', 'sof-igko', 'sof-isso'], 'geography'),
  ...iconAliasEntries(['subject-history'], 'history'),
  ...iconAliasEntries(['subject-geo'], 'geography'),
  ...iconAliasEntries(['subject-civics'], 'polity'),
  ...iconAliasEntries(['subject-english', 'sof-ieo'], 'english'),
  ...iconAliasEntries(['subject-hindi'], 'hindi'),
  ...iconAliasEntries(['subject-sanskrit'], 'sanskrit'),
  ...iconAliasEntries(['subject-comp-sci', 'olympiad-info', 'ioi', 'sof-nco'], 'computer-science'),
  ...iconAliasEntries(['subject-acc'], 'accountancy'),
  ...iconAliasEntries(['subject-bst'], 'business-studies'),
  ...iconAliasEntries(['subject-eco'], 'economics'),
  ...iconAliasEntries(['subject-evs'], 'environment'),
  ...iconAliasEntries(['olympiad-astro', 'nsea', 'iao'], 'science'),
  ...iconAliasEntries([
    'olympiad-main',
    'nmms',
    'inspire',
    'inspire-dbt',
    'pm-yashasvi',
    'maulana-azad',
    'sc-fellowship',
    'st-fellowship',
    'obc-fellowship',
    'minority-scholar',
    'aicte-pragati',
    'aicte-saksham',
    'anthe',
    'tallentex',
    'fiitjee-big-bang',
    'reso-start',
  ], 'scholarship'),
  ...iconAliasEntries(['english-tests', 'ielts-academic', 'ielts-general-training', 'ielts-gt'], 'ielts'),
  ...iconAliasEntries(['language-main', 'pte', 'duolingo-test', 'goethe', 'testdaf', 'dsh', 'telc-deutsch', 'delf', 'dalf', 'tcf', 'tef-canada', 'jlpt-n5', 'jlpt-n4', 'jlpt-n3', 'jlpt-n2', 'jlpt-n1', 'bjt', 'topik-1', 'topik-2', 'hsk-1', 'hsk-2', 'hsk-3', 'hsk-4', 'hsk-5', 'hsk-6', 'dele', 'siele', 'torfl', 'cils', 'celpe-bras', 'arabic-test'], 'language'),
  ...iconAliasEntries(['oet', 'mcat-usa', 'ucat', 'bmat', 'gamsat', 'isat', 'usmle'], 'medical'),
  ...iconAliasEntries(['abroad-main', 'act', 'usa-guide', 'uk-guide', 'canada-guide', 'australia-guide', 'germany-guide', 'singapore-guide', 'japan-guide', 'new-zealand-guide', 'commonwealth'], 'abroad'),
  ...iconAliasEntries(['lsat-usa', 'lnat'], 'law'),
  ...iconAliasEntries(['fulbright', 'chevening', 'daad', 'gates-cambridge', 'rhodes', 'australia-awards'], 'scholarship'),
  ...iconAliasEntries(['sop-writing', 'lor-guide'], 'notes'),
  ...iconAliasEntries(['visa-guide'], 'visa'),
  ...iconAliasEntries(['university-select'], 'abroad'),
  ...iconAliasEntries(['teaching-main', 'ctet', 'stet', 'dsssb', 'kvs', 'nvs', 'super-tet', 'reet', 'htet', 'uptet'], 'tet'),
  ...iconAliasEntries(['police-main', 'police-constable', 'police-si', 'delhi-police', 'state-police'], 'defence'),
  ...iconAliasEntries(['medical-main', 'neet-pg', 'ini-cet', 'fmge', 'aiims-norcet', 'gpat', 'nursing'], 'medical'),
  ...iconAliasEntries(['law-entrance-main', 'ailet', 'lsat-india', 'slat', 'mh-cet-law'], 'law'),
  ...iconAliasEntries(['design-main', 'nid-dat', 'nift', 'uceed', 'ceed'], 'design'),
  ...iconAliasEntries(['architecture-main', 'nata', 'jee-b-arch', 'jee-b-planning'], 'architecture'),
  ...iconAliasEntries(['agriculture-main', 'icar-aieea', 'icar-aieea-ug', 'icar-aieea-pg', 'veterinary'], 'environment'),
  ...iconAliasEntries(['university-pg-main', 'jest', 'tifr-gs'], 'university'),
  ...iconAliasEntries(['cuet-ug', 'cuet-pg'], 'cuet'),
  ...iconAliasEntries(['iit-jam', 'iit_jam'], 'iit-jam'),
  ...iconAliasEntries(['du', 'delhi-university', 'bhu', 'gkv', 'gkdu', 'gurukula-kangri', 'gurukul-kangri', 'aktu', 'vtu', 'anna-university', 'mumbai-university'], 'university'),
  ...iconAliasEntries(['ignou'], 'ignou'),
  ...iconAliasEntries(['iit-programs', 'iit'], 'iit'),
  ...iconAliasEntries(['iim-programs', 'iim'], 'iim'),
  ...iconAliasEntries(['nlu-programs', 'nlu'], 'nlu'),
  ...iconAliasEntries(['service-based-it', 'tcs', 'infosys', 'wipro', 'cognizant', 'accenture'], 'placement'),
  ...iconAliasEntries(['product-based', 'amazon', 'microsoft', 'google', 'flipkart', 'meesho', 'swiggy', 'zomato', 'razorpay', 'phonepe'], 'placement'),
  ...iconAliasEntries(['common-preparation', 'dsa-placement-prep', 'dsa-and-placement-prep'], 'coding'),
  ...iconAliasEntries(['upsc_cse', 'upsc-cse'], 'upsc-cse'),
  ...iconAliasEntries(['nda', 'upsc-nda'], 'nda'),
  ...iconAliasEntries(['cds', 'upsc-cds'], 'cds'),
  ...iconAliasEntries(['shield', 'upsc-capf'], 'shield'),
  ...iconAliasEntries(['ssc-cgl'], 'ssc-cgl'),
  ...iconAliasEntries(['ssc-chsl'], 'ssc-chsl'),
  ...iconAliasEntries(['ssc-gd'], 'ssc-gd'),
  ...iconAliasEntries(['gear', 'upsc-ies', 'ies-ese', 'ssc-je', 'rrb-je', 'dmrc-je'], 'gear'),
  ...iconAliasEntries(['wrench', 'rrb-group-d', 'rrc-apprentice'], 'wrench'),
  ...iconAliasEntries(['oil'], 'oil'),
  ...iconAliasEntries(['bhel'], 'bhel'),
  ...iconAliasEntries(['forest', 'upsc-ifos', 'icar-ars'], 'forest'),
  ...iconAliasEntries(['police', 'ssc-cpo', 'rpf-si', 'rpf-constable'], 'police'),
  ...iconAliasEntries(['sbi', 'sbi-po', 'sbi-clerk'], 'sbi'),
  ...iconAliasEntries(['bank', 'ibps-po', 'ibps-clerk', 'ibps-rrb', 'ibps-so'], 'bank'),
  ...iconAliasEntries(['rbi', 'rbi-grade-b', 'rbi-assistant'], 'rbi'),
  ...iconAliasEntries(['nabard'], 'nabard'),
  ...iconAliasEntries(['sebi'], 'sebi'),
  ...iconAliasEntries(['epfo'], 'epfo'),
  ...iconAliasEntries(['rrb_ntpc', 'rrb-ntpc', 'rrb-alp'], 'rrb-ntpc'),
  ...iconAliasEntries(['metro', 'dmrc', 'bmrcl', 'cmrl', 'hmrl', 'kolkata-metro', 'mumbai-metro', 'pune-metro', 'jaipur-metro', 'lucknow-metro', 'kochi-metro'], 'metro'),
  ...iconAliasEntries(['coast_guard', 'coast-guard', 'coast-guard-navik'], 'coast-guard'),
  ...iconAliasEntries(['ib_acio', 'ib-acio'], 'ib-acio'),
  ...iconAliasEntries(['ssb', 'ssb-interview', 'ssb-pi'], 'ssb'),
  ...iconAliasEntries(['teacher', 'teaching-main', 'ctet', 'stet', 'dsssb', 'kvs', 'nvs', 'super-tet', 'reet', 'htet', 'uptet'], 'teacher'),
  ...iconAliasEntries(['judiciary', 'judiciary-main', 'civil-judge', 'djs', 'up-pcsj', 'bihar-js', 'hjs', 'aibe', 'aor', 'bare-acts', 'case-laws'], 'judiciary'),
  ...iconAliasEntries(['isro'], 'isro'),
  ...iconAliasEntries(['research', 'drdo-rac', 'drdo-ceptam'], 'research'),
  ...iconAliasEntries(['nuclear', 'barc-oces', 'barc-dgfs', 'jee-main', 'jee-advanced', 'iit-jee'], 'nuclear'),
  ...iconAliasEntries(['bitsat', 'state-engineering-entrances', 'mht-cet', 'wbjee', 'kcet', 'comedk-uget'], 'gear'),
  ...iconAliasEntries(['gate-cse', 'gate-ece', 'gate-ee', 'gate-me', 'gate-ce', 'gate-da'], 'gate'),
  ...iconAliasEntries(['neet-ug', 'fmge'], 'neet'),
  ...iconAliasEntries(['neet-pg', 'ini-cet', 'aiims-norcet', 'nursing-entrance'], 'medical'),
  ...iconAliasEntries(['gpat'], 'gpat'),
  ...iconAliasEntries(['aiapget', 'ayush'], 'ayush'),
  ...iconAliasEntries(['veterinary', 'veterinary-entrance', 'bio-research', 'bio_research'], 'bio-research'),
  ...iconAliasEntries(['cat', 'xat', 'snap', 'nmat', 'cmat', 'mat', 'iift', 'mah-mba-cet'], 'management'),
  ...iconAliasEntries(['clat', 'ailet', 'lsat-india', 'slat', 'mh-cet-law'], 'judiciary'),
  ...iconAliasEntries(['nid-dat', 'uceed', 'ceed'], 'design'),
  ...iconAliasEntries(['nift'], 'nift'),
  ...iconAliasEntries(['nata', 'jee-b-arch', 'jee-b-planning'], 'architecture'),
  ...iconAliasEntries(['icar-aieea', 'state-agriculture-entrances'], 'nabard'),
  ...iconAliasEntries(['csir-net'], 'research'),
  ...iconAliasEntries(['ca-final', 'ca_final'], 'ca-final'),
  ...iconAliasEntries(['ca-foundation', 'ca-intermediate'], 'accountancy'),
  ...iconAliasEntries(['cs-executive-professional', 'company-secretary'], 'professional'),
  ...iconAliasEntries(['postal'], 'postal'),
  ...iconAliasEntries(['fci'], 'fci'),
};

const iconMatchers: Array<[RegExp, string]> = [
  [/\b(upsc|ias|ips|ifs|civil services|cse|capf)\b/, 'upsc'],
  [/\b(nda|cds|afcat|agniveer|ssb|navy|army|air force|coast guard|defence|defense)\b/, 'defence'],
  [/\b(ssc|cgl|chsl|mts|cpo)\b/, 'ssc'],
  [/\b(bank|banking|ibps|sbi po|sbi clerk|rbi|nabard|sebi|lic)\b/, 'banking'],
  [/\b(railway|rrb|ntpc|group d|alp|rpf|metro)\b/, 'railway'],
  [/\b(gate)\b/, 'gate'],
  [/\b(jee|iit jee|engineering entrance)\b/, 'jee'],
  [/\b(neet|medical entrance|mbbs)\b/, 'neet'],
  [/\b(cat|xat|mat|cmat|management)\b/, 'cat'],
  [/\b(clat|law|nlu)\b/, 'clat'],
  [/\b(cuet)\b/, 'cuet'],
  [/\b(ugc net|net jrf|jrf)\b/, 'ugc-net'],
  [/\b(csir net|research)\b/, 'csir-net'],
  [/\b(ctet|tet|teacher)\b/, 'tet'],
  [/\b(police|constable|sub inspector|si exam)\b/, 'defence'],
  [/\b(nursing|pharmacy|gpat|norcet|fmge|ini cet|neet pg|paramedical)\b/, 'medical'],
  [/\b(nift|nid|uceed|ceed|design)\b/, 'design'],
  [/\b(nata|architecture|b arch|b planning)\b/, 'architecture'],
  [/\b(agriculture|veterinary|icar aieea)\b/, 'environment'],
  [/\b(gre)\b/, 'gre'],
  [/\b(gmat)\b/, 'gmat'],
  [/\b(ielts)\b/, 'ielts'],
  [/\b(toefl)\b/, 'toefl'],
  [/\b(sat)\b/, 'sat'],
  [/\b(study abroad|abroad|foreign university|visa|sop)\b/, 'abroad'],
  [/\b(olympiad|scholarship|ntse|kvpy|imo|nso|ieo|nsep|nsec|nseb)\b/, 'scholarship'],
  [/\b(company|placement|private|career|tcs|infosys|wipro|cognizant|accenture|capgemini|hcltech|tech mahindra|ibm|deloitte|amazon|microsoft|google|adobe|oracle|zoho|flipkart|phonepe|razorpay|paytm|goldman sachs|jp morgan|morgan stanley|barclays|hsbc)\b/, 'placement'],
  [/\b(university|college|iit|nit|iim|aiims|du|bhu|ignou)\b/, 'university'],
  [/\b(cbse|ncert)\b/, 'cbse'],
  [/\b(icse|isc)\b/, 'icse'],
  [/\b(state civil|state service|state exam|public service commission|uppsc|bpsc|mppsc|rpsc|mpsc|tnpsc|kpsc|wbpsc|gpsc|upsssc|rsmssb|bssc)\b/, 'state-exam'],
  [/\b(state board|up board|bseb|mp board|rbse|msbshse|tnbse|kseeb|pseb|hbse)\b/, 'state-board'],
  [/\b(class|grade)\s*(1|2|3|4|5|6|7|8|9|10|11|12)\b/, 'class'],
  [/\b(previous year|pyq|question paper|board paper|paper)\b/, 'pyq'],
  [/\b(sample paper|model paper)\b/, 'sample-paper'],
  [/\b(answer key|marking scheme|solution key)\b/, 'answer-key'],
  [/\b(syllabus|curriculum)\b/, 'syllabus'],
  [/\b(mock|test series|quiz|practice test)\b/, 'mock'],
  [/\b(worksheet|assignment|project)\b/, 'worksheet'],
  [/\b(practical|lab manual)\b/, 'practical'],
  [/\b(book|textbook|ncert)\b/, 'book'],
  [/\b(solution|solutions)\b/, 'solution'],
  [/\b(notes|revision|summary)\b/, 'notes'],
  [/\b(current affairs|news|updates|notification|alert)\b/, 'current-affairs'],
  [/\b(strategy|study plan|planner|roadmap|topper)\b/, 'strategy'],
  [/\b(interview|hr|gd|group discussion)\b/, 'interview'],
  [/\b(resume|cv)\b/, 'resume'],
  [/\b(dsa|coding|programming|data structure|algorithm)\b/, 'coding'],
  [/\b(technical|dbms|operating system|os|computer network|cn|oops|cloud)\b/, 'technical'],
  [/\b(physics)\b/, 'physics'],
  [/\b(chemistry)\b/, 'chemistry'],
  [/\b(biology|botany|zoology)\b/, 'biology'],
  [/\b(math|maths|mathematics|quantitative)\b/, 'maths'],
  [/\b(reasoning|logical reasoning)\b/, 'reasoning'],
  [/\b(aptitude|csat)\b/, 'aptitude'],
  [/\b(history|ancient|medieval|modern india|world history)\b/, 'history'],
  [/\b(geography)\b/, 'geography'],
  [/\b(polity|political science|governance|constitution)\b/, 'polity'],
  [/\b(economics|economy)\b/, 'economics'],
  [/\b(accountancy|accounts)\b/, 'accountancy'],
  [/\b(business studies|commerce)\b/, 'commerce'],
  [/\b(environment|ecology)\b/, 'environment'],
  [/\b(art culture|art and culture|fine arts|design)\b/, 'art-culture'],
  [/\b(english)\b/, 'english'],
  [/\b(hindi)\b/, 'hindi'],
  [/\b(sanskrit)\b/, 'sanskrit'],
  [/\b(language|verbal)\b/, 'language'],
];

const genericStudyIconKeys = new Set(['', 'folder', 'section', 'heading']);

const registeredIconToneRules: Array<[RegExp, StudyTone]> = [
  [/\b(physics|chemistry|biology|science|biotech|statistics|formula|lab|practical)\b/, 'blue'],
  [/\b(economics|economy|commerce|accountancy|finance|bank|marketing|management|tax|audit|placement)\b/, 'emerald'],
  [/\b(history|art|culture|music|dance|painting|portfolio)\b/, 'amber'],
  [/\b(geography|environment|ecology|agriculture|evs|abroad)\b/, 'emerald'],
  [/\b(polity|political|law|constitution|justice|governance|civics)\b/, 'amber'],
  [/\b(computer|informatics|coding|programming|algorithm|database|network|cyber|data|machine|ai|gate|engineering)\b/, 'cyan'],
  [/\b(english|hindi|sanskrit|language|essay|journalism|media)\b/, 'rose'],
  [/\b(medical|anatomy|physiology|pharmacy|nursing|dental|veterinary)\b/, 'emerald'],
  [/\b(pyq|paper|mock|question|answer|syllabus|exam|class|certificate)\b/, 'violet'],
  [/\b(notes|book|ncert|study-material|resource|download|bookmark|resume)\b/, 'slate'],
];

const inferRegisteredIconTone = (key = ''): StudyTone => {
  const lookupKey = normalizeIconLookupKey(key);
  const match = registeredIconToneRules.find(([pattern]) => pattern.test(lookupKey));
  return match ? match[1] : 'blue';
};

const resolveStudyVisualByKey = (key = ''): VisualMeta | undefined => {
  if (!key) return undefined;

  const registeredIconUrl = registeredIconAsset(key);
  const base = cardIconVisuals[key] || resourceVisuals[key] || phaseVisuals[key];

  if (base) {
    return {
      ...base,
      iconUrl: registeredIconUrl || base.iconUrl,
    };
  }

  if (registeredIconUrl) {
    return {
      icon: FolderOpenIcon,
      tone: inferRegisteredIconTone(key),
      iconUrl: registeredIconUrl,
    };
  }

  return undefined;
};

const hasStudyVisualKey = (key = '') => Boolean(resolveStudyVisualByKey(key));

export const inferStudyIconKey = (value = '', fallback = 'folder') => {
  const lookupKey = normalizeIconLookupKey(value);
  const slugKey = slugIconKey(value);
  const directKey = iconAliases[slugKey] || slugKey;
  if (hasStudyVisualKey(directKey)) return directKey;

  const match = iconMatchers.find(([pattern]) => pattern.test(lookupKey));
  return match ? match[1] : fallback;
};

export const studyIconOptions: StudyIconOption[] = [
  { key: 'heading', label: 'Collection', ...cardIconVisuals.heading },
  { key: 'folder', label: 'Folder', ...cardIconVisuals.folder },
  { key: 'competitive', label: 'Competitive exams', ...cardIconVisuals.competitive },
  { key: 'government', label: 'Government jobs', ...cardIconVisuals.government },
  { key: 'entrance', label: 'Entrance exams', ...cardIconVisuals.entrance },
  { key: 'school-board', label: 'School boards', ...cardIconVisuals['school-board'] },
  { key: 'state-exam', label: 'State exams', ...cardIconVisuals['state-exam'] },
  { key: 'university', label: 'University exams', ...cardIconVisuals.university },
  { key: 'abroad', label: 'Study abroad', ...cardIconVisuals.abroad },
  { key: 'scholarship', label: 'Scholarships', ...cardIconVisuals.scholarship },
  { key: 'placement', label: 'Placement', ...cardIconVisuals.placement },
  { key: 'company', label: 'Company', ...cardIconVisuals.company },
  { key: 'upsc', label: 'UPSC', ...cardIconVisuals.upsc },
  { key: 'ssc', label: 'SSC', ...cardIconVisuals.ssc },
  { key: 'banking', label: 'Banking', ...cardIconVisuals.banking },
  { key: 'railway', label: 'Railway', ...cardIconVisuals.railway },
  { key: 'defence', label: 'Defence', ...cardIconVisuals.defence },
  { key: 'gate', label: 'GATE', ...cardIconVisuals.gate },
  { key: 'upsc-cse', label: 'UPSC CSE', ...cardIconVisuals['upsc-cse'] },
  { key: 'nda', label: 'NDA', ...cardIconVisuals.nda },
  { key: 'cds', label: 'CDS', ...cardIconVisuals.cds },
  { key: 'ssc-cgl', label: 'SSC CGL', ...cardIconVisuals['ssc-cgl'] },
  { key: 'ssc-chsl', label: 'SSC CHSL', ...cardIconVisuals['ssc-chsl'] },
  { key: 'ssc-gd', label: 'SSC GD', ...cardIconVisuals['ssc-gd'] },
  { key: 'sbi', label: 'SBI', ...cardIconVisuals.sbi },
  { key: 'bank', label: 'Bank', ...cardIconVisuals.bank },
  { key: 'rbi', label: 'RBI', ...cardIconVisuals.rbi },
  { key: 'nabard', label: 'NABARD', ...cardIconVisuals.nabard },
  { key: 'sebi', label: 'SEBI', ...cardIconVisuals.sebi },
  { key: 'rrb-ntpc', label: 'RRB NTPC', ...cardIconVisuals['rrb-ntpc'] },
  { key: 'metro', label: 'Metro', ...cardIconVisuals.metro },
  { key: 'police', label: 'Police', ...cardIconVisuals.police },
  { key: 'teacher', label: 'Teacher', ...cardIconVisuals.teacher },
  { key: 'judiciary', label: 'Judiciary', ...cardIconVisuals.judiciary },
  { key: 'isro', label: 'ISRO', ...cardIconVisuals.isro },
  { key: 'research', label: 'Research', ...cardIconVisuals.research },
  { key: 'nuclear', label: 'Nuclear', ...cardIconVisuals.nuclear },
  { key: 'gpat', label: 'GPAT', ...cardIconVisuals.gpat },
  { key: 'ayush', label: 'AYUSH', ...cardIconVisuals.ayush },
  { key: 'bio-research', label: 'Bio research', ...cardIconVisuals['bio-research'] },
  { key: 'nift', label: 'NIFT', ...cardIconVisuals.nift },
  { key: 'ca-final', label: 'CA final', ...cardIconVisuals['ca-final'] },
  { key: 'management', label: 'Management', ...cardIconVisuals.management },
  { key: 'professional', label: 'Professional', ...cardIconVisuals.professional },
  { key: 'postal', label: 'Postal', ...cardIconVisuals.postal },
  { key: 'fci', label: 'FCI', ...cardIconVisuals.fci },
  { key: 'jee', label: 'JEE', ...cardIconVisuals.jee },
  { key: 'neet', label: 'NEET', ...cardIconVisuals.neet },
  { key: 'cat', label: 'CAT / MBA', ...cardIconVisuals.cat },
  { key: 'clat', label: 'Law / CLAT', ...cardIconVisuals.clat },
  { key: 'cbse', label: 'CBSE / NCERT', ...cardIconVisuals.cbse },
  { key: 'icse', label: 'ICSE / ISC', ...cardIconVisuals.icse },
  { key: 'state-board', label: 'State board', ...cardIconVisuals['state-board'] },
  { key: 'class', label: 'Class', ...cardIconVisuals.class },
  { key: 'pyq', label: 'PYQ papers', ...cardIconVisuals.pyq },
  { key: 'notes', label: 'Notes', ...cardIconVisuals.notes },
  { key: 'book', label: 'Books', ...cardIconVisuals.book },
  { key: 'material', label: 'Study material', ...cardIconVisuals.material },
  { key: 'syllabus', label: 'Syllabus', ...cardIconVisuals.syllabus },
  { key: 'answer-key', label: 'Answer key', ...cardIconVisuals['answer-key'] },
  { key: 'sample-paper', label: 'Sample paper', ...cardIconVisuals['sample-paper'] },
  { key: 'worksheet', label: 'Worksheet', ...cardIconVisuals.worksheet },
  { key: 'practical', label: 'Practical', ...cardIconVisuals.practical },
  { key: 'mock', label: 'Mock test', ...cardIconVisuals.mock },
  { key: 'practice', label: 'Tests / quiz', ...cardIconVisuals.practice },
  { key: 'aptitude', label: 'Aptitude', ...cardIconVisuals.aptitude },
  { key: 'reasoning', label: 'Reasoning', ...cardIconVisuals.reasoning },
  { key: 'knowledge', label: 'General knowledge', ...cardIconVisuals.knowledge },
  { key: 'current-affairs', label: 'Current affairs', ...cardIconVisuals['current-affairs'] },
  { key: 'strategy', label: 'Strategy', ...cardIconVisuals.strategy },
  { key: 'history', label: 'History', ...cardIconVisuals.history },
  { key: 'geography', label: 'Geography', ...cardIconVisuals.geography },
  { key: 'polity', label: 'Polity', ...cardIconVisuals.polity },
  { key: 'economics', label: 'Economics', ...cardIconVisuals.economics },
  { key: 'commerce', label: 'Commerce', ...cardIconVisuals.commerce },
  { key: 'accountancy', label: 'Accountancy', ...cardIconVisuals.accountancy },
  { key: 'computer-science', label: 'Computer science', ...cardIconVisuals['computer-science'] },
  { key: 'english', label: 'English', ...cardIconVisuals.english },
  { key: 'hindi', label: 'Hindi', ...cardIconVisuals.hindi },
  { key: 'language', label: 'Language', ...cardIconVisuals.language },
  { key: 'formula', label: 'Formula', ...cardIconVisuals.formula },
  { key: 'science', label: 'Science', ...cardIconVisuals.science },
  { key: 'coding', label: 'Coding', ...cardIconVisuals.coding },
  { key: 'dsa', label: 'DSA', ...cardIconVisuals.dsa },
  { key: 'resume', label: 'Resume', ...cardIconVisuals.resume },
  { key: 'video', label: 'Video lecture', ...cardIconVisuals.video },
  { key: 'live', label: 'Live class', ...cardIconVisuals.live },
  { key: 'solution', label: 'Book solution', ...cardIconVisuals.solution },
  { key: 'certificate', label: 'Certificate', ...cardIconVisuals.certificate },
  { key: 'profile', label: 'Student profile', ...cardIconVisuals.profile },
  { key: 'qa', label: 'Q&A / support', ...cardIconVisuals.qa },
  { key: 'revision', label: 'Revision', ...cardIconVisuals.revision },
  { key: 'exam', label: 'Exam', ...cardIconVisuals.exam },
];

const gridColumns = {
  two: 'grid-cols-[repeat(auto-fit,minmax(280px,320px))]',
  three: 'grid-cols-[repeat(auto-fit,minmax(280px,320px))]',
  four: 'grid-cols-[repeat(auto-fit,minmax(260px,320px))]',
  auto: 'grid-cols-[repeat(auto-fit,minmax(260px,320px))]',
};

export const getResourceVisual = (type?: string): VisualMeta => {
  const normalizedKey = type ? slugIconKey(type) : '';
  const aliasedKey = normalizedKey ? iconAliases[normalizedKey] || normalizedKey : '';
  return (aliasedKey && resolveStudyVisualByKey(aliasedKey)) || cardIconVisuals.folder;
};

export const getWorkspaceVisual = (
  workspace: Pick<StudyWorkspace, 'type' | 'category'>
): VisualMeta => {
  return (
    (workspace.category && workspaceVisuals[workspace.category]) ||
    workspaceVisuals[workspace.type] ||
    workspaceVisuals.exam
  );
};

export const getPhaseVisual = (phaseKey?: string): VisualMeta => {
  const normalizedKey = phaseKey ? slugIconKey(phaseKey) : '';
  const aliasedKey = normalizedKey ? iconAliases[normalizedKey] || normalizedKey : '';
  return (aliasedKey && resolveStudyVisualByKey(aliasedKey)) || { icon: Squares2X2Icon, tone: 'slate' };
};

export const getStudyCardVisual = (iconKey?: string, tone?: StudyTone, fallbackName?: string): VisualMeta => {
  const normalizedKey = iconKey ? slugIconKey(iconKey) : '';
  const aliasedIconKey = normalizedKey ? iconAliases[normalizedKey] || normalizedKey : '';
  const inferredNameKey = fallbackName ? inferStudyIconKey(fallbackName, '') : '';
  const visualKey =
    (!aliasedIconKey || genericStudyIconKeys.has(aliasedIconKey)) && inferredNameKey
      ? inferredNameKey
      : aliasedIconKey || inferredNameKey || 'folder';
  const base = resolveStudyVisualByKey(visualKey) || cardIconVisuals.folder;
  return {
    icon: base.icon,
    tone: tone && toneClasses[tone] ? tone : base.tone,
    iconUrl: base.iconUrl,
  };
};

export const getToneBadgeClass = (tone: StudyTone) => toneClasses[tone].badge;

export const getToneCircleClass = (tone: StudyTone) => toneClasses[tone].circle;

export const StudyTileGrid = ({
  children,
  columns = 'three',
  className = '',
}: {
  children: ReactNode;
  columns?: keyof typeof gridColumns;
  className?: string;
}) => (
  <div
    className={[
      'grid w-full max-w-full min-w-0 justify-start gap-4 overflow-x-hidden',
      gridColumns[columns],
      className,
    ].join(' ')}
  >
    {children}
  </div>
);

export type StudyTileMetaInput = {
  sourceName?: string;
  sourceType?: string;
  year?: number;
  stage?: string;
  paper?: string;
};

interface TileContentProps extends StudyTileMetaInput {
  icon: StudyIcon;
  tone: StudyTone;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  iconUrl?: string;
  meta?: string;
  badge?: string;
  variant?: 'default' | 'book';
  active?: boolean;
  compact?: boolean;
  libraryItem?: LocalLibraryItem;
}

export type StudyTileMetaChip = {
  label: string;
  variant: 'official' | 'neutral';
};

const normalizeTileMeta = (value = '') => value.trim().replace(/\s+/g, ' ');

const normalizeTileMetaKey = (value = '') =>
  normalizeTileMeta(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const formatTileMetaLabel = (value = '') =>
  normalizeTileMeta(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());

const getOfficialChipLabel = (sourceName = '') => {
  const sourceKey = normalizeTileMetaKey(sourceName);
  if (sourceKey.includes('upsc')) return 'UPSC Official';
  if (sourceKey.includes('cbse')) return 'CBSE Official';
  if (sourceKey.includes('ncert')) return 'NCERT Official';
  return 'Official';
};

const isOfficialTileSource = (sourceType = '', sourceName = '') => {
  const sourceKey = normalizeTileMetaKey(`${sourceType} ${sourceName}`);
  return ['official', 'upsc', 'cbse', 'ncert'].some((keyword) => sourceKey.includes(keyword));
};

const getTileMetaChips = ({ sourceName, sourceType, year, stage, paper }: StudyTileMetaInput): StudyTileMetaChip[] => {
  const chips: StudyTileMetaChip[] = [];
  const paperKey = normalizeTileMetaKey(paper || '');
  const stageLabel = formatTileMetaLabel(stage || '');

  if (isOfficialTileSource(sourceType, sourceName)) {
    chips.push({ label: getOfficialChipLabel(sourceName), variant: 'official' });
  }

  if (typeof year === 'number' && Number.isFinite(year)) {
    chips.push({ label: String(year), variant: 'neutral' });
  }

  if (stageLabel) {
    chips.push({ label: stageLabel, variant: 'neutral' });
  } else if (paperKey.includes('syllabus')) {
    chips.push({ label: 'Syllabus', variant: 'neutral' });
  }

  const seen = new Set<string>();
  return chips.filter((chip) => {
    const key = normalizeTileMetaKey(chip.label);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 3);
};

export const getStudyTileMetaChips = (input: StudyTileMetaInput) => getTileMetaChips(input);

export const StudyTileMetaChipRow = ({
  chips,
  active = false,
  className = '',
}: {
  chips: StudyTileMetaChip[];
  active?: boolean;
  className?: string;
}) => {
  if (chips.length === 0) return null;

  return (
    <div className={['flex min-w-0 flex-wrap items-center gap-1.5', className].join(' ')}>
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={[
            'inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]',
            chip.variant === 'official'
              ? active
                ? 'border-white/25 bg-white/15 text-white dark:border-slate-950/20 dark:bg-slate-950/10 dark:text-slate-950'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200'
              : active
                ? 'border-white/20 bg-white/10 text-white/90 dark:border-slate-950/15 dark:bg-slate-950/10 dark:text-slate-950/80'
                : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300',
          ].join(' ')}
        >
          {chip.variant === 'official' && <CheckBadgeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
          <span className="truncate">{chip.label}</span>
        </span>
      ))}
    </div>
  );
};

const TilePreview = ({
  icon: Icon,
  tone,
  thumbnailUrl,
  iconUrl,
  active,
  compact,
  badge,
  variant = 'default',
}: Pick<TileContentProps, 'icon' | 'tone' | 'thumbnailUrl' | 'iconUrl' | 'active' | 'compact' | 'badge' | 'variant'>) => {
  const [previewFailed, setPreviewFailed] = useState(false);
  const showThumbnail = Boolean(thumbnailUrl && !previewFailed && !active);
  const heightClass = variant === 'book' ? 'h-44 sm:h-52' : compact ? 'h-24 sm:h-28' : 'h-28 sm:h-32';
  const accentClass = active ? 'text-white dark:text-slate-950' : 'text-slate-700 dark:text-slate-200';
  const previewToneClass = active
    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
    : toneClasses[tone].preview;
  const glowClass = toneClasses[tone].glow;

  if (showThumbnail) {
    return (
      <div
        className={[
          'study-card-preview relative w-full overflow-hidden border-b border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-950',
          heightClass,
        ].join(' ')}
      >
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          className="h-full w-full bg-white object-cover object-top dark:bg-slate-900"
          onError={() => setPreviewFailed(true)}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/55 via-slate-950/14 to-transparent" />
        <span className={`absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg border border-white/50 shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur ${iconUrl ? 'bg-white/90 text-slate-950 dark:bg-slate-950/[0.85]' : toneClasses[tone].badge}`}>
          {iconUrl ? (
            <img src={iconUrl} alt="" loading="lazy" className="h-6 w-6 object-contain" />
          ) : (
            <Icon className="h-5 w-5" aria-hidden="true" />
          )}
        </span>
        {badge && (
          <span className="absolute left-14 top-3 max-w-[calc(100%-6.5rem)] truncate rounded-lg border border-white/70 bg-white/90 px-2 py-1 text-[10px] font-black uppercase tracking-normal text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur dark:border-white/15 dark:bg-slate-950/80 dark:text-slate-200 sm:max-w-[8rem] sm:px-2.5 sm:tracking-wide">
            {badge}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={[
        'study-card-preview relative flex w-full items-center justify-center overflow-hidden border-b border-slate-200 dark:border-white/10',
        heightClass,
        previewToneClass,
      ].join(' ')}
    >
      <div className={`pointer-events-none absolute -left-8 top-4 h-24 w-24 rounded-full blur-3xl ${glowClass}`} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.44),rgba(255,255,255,0.06))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.075),rgba(255,255,255,0.018))]" />
      <div className="pointer-events-none absolute inset-x-8 bottom-3 h-px bg-white/60 dark:bg-white/10" />
      <div className="pointer-events-none absolute inset-x-14 top-3 h-px bg-white/70 dark:bg-white/12" />
      {iconUrl ? (
        <img
          src={iconUrl}
          alt=""
          loading="lazy"
          className={[
            'study-icon-asset relative z-10 h-auto w-[74%] max-w-[9.4rem] object-contain drop-shadow-[0_22px_34px_rgba(15,23,42,0.22)] sm:w-[72%] lg:w-[70%]',
            compact ? 'max-w-[7.25rem]' : 'max-w-[9rem]',
          ].join(' ')}
        />
      ) : (
        <Icon
          className={[
            'relative z-10 h-auto w-[70%] max-w-[8.6rem] drop-shadow-[0_20px_32px_rgba(15,23,42,0.18)]',
            compact ? 'max-w-[7.25rem]' : 'max-w-[9rem]',
            accentClass,
          ].join(' ')}
          aria-hidden="true"
        />
      )}
      {badge && (
        <span className="absolute left-2 top-2 max-w-[calc(100%-3.5rem)] truncate rounded-lg border border-white/70 bg-white/90 px-2 py-1 text-[10px] font-black uppercase tracking-normal text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.14)] backdrop-blur dark:border-white/15 dark:bg-slate-950/80 dark:text-slate-200 sm:left-3 sm:top-3 sm:max-w-[8rem] sm:px-2.5 sm:tracking-wide">
          {badge}
        </span>
      )}
    </div>
  );
};

const TileContent = ({
  icon,
  tone,
  title,
  active,
  compact,
  thumbnailUrl,
  iconUrl,
  subtitle,
  meta,
  badge,
  variant = 'default',
  sourceName,
  sourceType,
  year,
  stage,
  paper,
}: TileContentProps) => {
  const isBookVariant = variant === 'book';
  const metaChips = isBookVariant ? [] : getTileMetaChips({ sourceName, sourceType, year, stage, paper });
  const visibleSubtitle = isBookVariant ? '' : subtitle || meta;

  return (
    <>
      <TilePreview icon={icon} tone={tone} thumbnailUrl={thumbnailUrl} iconUrl={iconUrl} active={active} compact={compact} badge={isBookVariant ? undefined : badge} variant={variant} />
      <div className={[compact ? 'min-w-0 px-3 py-2.5 sm:py-3' : 'min-w-0 px-3 py-2.5 sm:px-3.5 sm:py-3', isBookVariant ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] dark:bg-[linear-gradient(180deg,rgba(20,20,20,0.98),rgba(12,12,12,0.98))]' : active ? '' : 'study-card-body border-t border-white/70 bg-white/95 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(8,13,26,0.98))]'].join(' ')}>
        <StudyTileMetaChipRow chips={metaChips} active={active} className="mb-2" />
        <h3
          className={[
            'break-words text-left font-black leading-snug',
            isBookVariant ? 'text-[16px] tracking-normal' : compact ? 'text-sm' : 'text-[15px]',
            active ? 'text-white dark:text-slate-950' : 'text-slate-950 dark:text-white',
          ].join(' ')}
        >
          {title}
        </h3>
        {visibleSubtitle && (
          <p className="mt-1 line-clamp-1 max-w-full break-words text-left text-[11px] font-bold leading-4 text-slate-500 dark:text-slate-400">
            {visibleSubtitle}
          </p>
        )}
      </div>
    </>
  );
};

const simpleTileAccents: Record<StudyTone, { bar: string; text: string }> = {
  blue: {
    bar: 'from-sky-500 via-cyan-300 to-slate-200',
    text: 'text-slate-950 dark:text-white',
  },
  violet: {
    bar: 'from-violet-500 via-fuchsia-300 to-slate-200',
    text: 'text-slate-950 dark:text-white',
  },
  emerald: {
    bar: 'from-emerald-500 via-teal-300 to-slate-200',
    text: 'text-slate-950 dark:text-white',
  },
  amber: {
    bar: 'from-amber-500 via-orange-300 to-slate-200',
    text: 'text-slate-950 dark:text-white',
  },
  rose: {
    bar: 'from-rose-500 via-pink-300 to-slate-200',
    text: 'text-slate-950 dark:text-white',
  },
  cyan: {
    bar: 'from-cyan-500 via-sky-300 to-slate-200',
    text: 'text-slate-950 dark:text-white',
  },
  indigo: {
    bar: 'from-indigo-500 via-blue-300 to-slate-200',
    text: 'text-slate-950 dark:text-white',
  },
  slate: {
    bar: 'from-slate-600 via-slate-300 to-white',
    text: 'text-slate-950 dark:text-white',
  },
};

const SimpleFolderTileContent = ({
  icon: Icon,
  tone,
  title,
  iconUrl,
  badge,
  compact,
}: TileContentProps) => {
  const accent = simpleTileAccents[tone] || simpleTileAccents.slate;
  const contentClassName = compact
    ? 'flex flex-1 flex-col items-center justify-center px-2.5 pb-4 pt-2 text-center sm:px-3 sm:pb-3 sm:pt-2'
    : 'flex flex-1 flex-col items-center justify-start px-3 pb-4 pt-7 text-center sm:px-4 sm:pb-4 sm:pt-8';
  const stageClassName = compact
    ? 'study-card-icon-stage relative flex h-[6rem] w-full items-center justify-center transition-transform duration-200 will-change-transform sm:h-[6.25rem] lg:h-[6.45rem]'
    : 'study-card-icon-stage relative flex h-[7rem] w-full items-center justify-center transition-transform duration-200 will-change-transform sm:h-[7.4rem] lg:h-[7.75rem]';
  const imageClassName = compact
    ? 'study-icon-asset study-tile-icon-asset study-stage-icon-asset relative z-10 h-[5.25rem] w-[5.25rem] object-contain transition-transform duration-200 will-change-transform sm:h-[5.55rem] sm:w-[5.55rem] lg:h-[5.85rem] lg:w-[5.85rem]'
    : 'study-icon-asset study-tile-icon-asset study-stage-icon-asset relative z-10 h-[6.8rem] w-[6.8rem] object-contain transition-transform duration-200 will-change-transform sm:h-[7.15rem] sm:w-[7.15rem] lg:h-[7.5rem] lg:w-[7.5rem]';
  const iconClassName = compact
    ? 'relative z-10 h-[3.9rem] w-[3.9rem] text-slate-700 transition-transform duration-200 will-change-transform dark:text-slate-200 sm:h-[4.25rem] sm:w-[4.25rem] lg:h-[4.45rem] lg:w-[4.45rem]'
    : 'relative z-10 h-[5.7rem] w-[5.7rem] text-slate-700 transition-transform duration-200 will-change-transform dark:text-slate-200 sm:h-[6.05rem] sm:w-[6.05rem] lg:h-[6.35rem] lg:w-[6.35rem]';

  return (
    <>
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.bar}`} />
      {badge && (
        <span className="absolute left-2 top-2 z-20 max-w-[calc(100%-3.25rem)] truncate rounded-lg border border-white/70 bg-white/90 px-1.5 py-1 text-[9px] font-black uppercase tracking-normal text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.13)] backdrop-blur dark:border-white/15 dark:bg-slate-950/80 dark:text-slate-200 sm:left-2.5 sm:top-2.5 sm:max-w-[calc(100%-4.25rem)] sm:px-2 sm:text-[10px] sm:tracking-wide">
          {badge}
        </span>
      )}
      <div className={contentClassName}>
        <span className={stageClassName}>
          <span className="pointer-events-none absolute bottom-2 h-6 w-[64%] rounded-full bg-slate-950/10 blur-xl dark:bg-cyan-300/10" />
          {iconUrl ? (
            <img
              src={iconUrl}
              alt=""
              loading="lazy"
              className={imageClassName}
            />
          ) : (
            <Icon
              className={iconClassName}
              aria-hidden="true"
            />
          )}
        </span>
        <h3 className={`${compact ? 'mt-0 line-clamp-2 leading-tight' : 'mt-1 line-clamp-3 leading-snug'} max-w-full break-words text-center text-[13px] font-black sm:text-sm ${accent.text}`}>
          {title}
        </h3>
      </div>
    </>
  );
};

const studyTileSurfaceClassName =
  'study-card-surface group relative flex min-h-[292px] min-w-0 w-full max-w-full flex-col overflow-hidden rounded-lg border border-slate-200/90 shadow-[0_14px_34px_rgba(15,23,42,0.10)] ring-1 ring-slate-950/[0.035] focus:outline-none focus:ring-0 dark:border-white/10 dark:shadow-[0_20px_52px_rgba(0,0,0,0.46)] dark:ring-white/5 sm:min-h-[318px]';

const studyLinkTileSurfaceClassName =
  'study-card-surface group relative flex min-h-[224px] min-w-0 w-full max-w-full flex-col overflow-hidden rounded-2xl border border-white/70 bg-white p-2 shadow-[0_10px_26px_rgba(15,23,42,0.09)] ring-1 ring-slate-950/[0.035] focus:outline-none focus:ring-0 dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_16px_36px_rgba(0,0,0,0.36)] dark:ring-white/5 sm:min-h-[232px] sm:p-2.5';

const studyFloatingSaveClassName =
  'study-save-action absolute !bottom-auto !left-auto right-2 top-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/80 bg-white/85 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.18)] backdrop-blur-md aria-pressed:border-cyan-200 aria-pressed:bg-cyan-50 aria-pressed:text-cyan-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-100 dark:shadow-[0_12px_26px_rgba(0,0,0,0.34)] dark:aria-pressed:border-cyan-300/35 dark:aria-pressed:bg-cyan-400/20 dark:aria-pressed:text-cyan-100 sm:right-3 sm:top-3 sm:h-9 sm:w-9';

export const StudyLinkTile = ({
  to,
  title,
  subtitle,
  thumbnailUrl,
  iconUrl,
  meta,
  badge,
  sourceName,
  sourceType,
  year,
  stage,
  paper,
  icon,
  tone,
  variant = 'default',
  active = false,
  compact = false,
  libraryItem,
  className = '',
}: TileContentProps & { to: string; className?: string }) => (
  <article
    className={[
      studyLinkTileSurfaceClassName,
      active ? 'border-slate-950 bg-slate-950 hover:bg-slate-950 dark:border-white dark:bg-white dark:hover:bg-white' : 'bg-white/95 hover:bg-white dark:bg-[#0b1220] dark:hover:bg-[#0e1728]',
      compact ? '!min-h-0 h-40 p-2.5 sm:h-[10.25rem] sm:p-3 lg:h-[10.5rem]' : '',
      className,
    ].join(' ')}
  >
    <Link to={to} className="flex min-h-0 min-w-0 flex-1 flex-col">
      <SimpleFolderTileContent icon={icon} tone={tone} title={title} subtitle={subtitle} meta={meta} badge={badge} thumbnailUrl={thumbnailUrl} iconUrl={iconUrl} sourceName={sourceName} sourceType={sourceType} year={year} stage={stage} paper={paper} active={active} compact={compact} variant={variant} />
    </Link>
    {libraryItem && !active && (
      <SaveLibraryItemButton
        item={libraryItem}
        iconOnly
        className={studyFloatingSaveClassName}
      />
    )}
  </article>
);

export const StudyPdfPreviewDialog = ({
  open,
  onOpenChange,
  title,
  fileUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fileUrl: string;
}) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm" />
      <Dialog.Content className="fixed inset-0 z-50 overflow-hidden bg-slate-950 shadow-2xl shadow-slate-950/40 focus:outline-none lg:inset-y-3 lg:left-[19rem] lg:right-3 lg:rounded-[2rem] lg:border lg:border-white/10">
        <Dialog.Title className="sr-only">{title}</Dialog.Title>
        <Dialog.Description className="sr-only">PDF preview</Dialog.Description>
        <Suspense
          fallback={(
            <div className="flex h-full flex-col bg-slate-950 text-white">
              <div className="border-b border-white/10 px-6 py-5">
                <div className="h-7 w-64 animate-pulse rounded bg-white/10" />
                <div className="mt-2 h-3 w-28 animate-pulse rounded bg-white/10" />
              </div>
              <div className="flex flex-1 items-center justify-center p-6">
                <div className="h-[70vh] w-full max-w-3xl animate-pulse rounded-3xl bg-white/10" />
              </div>
            </div>
          )}
        >
          <StudyPdfReaderFrame title={title} fileUrl={getStudyPdfDisplayUrl(fileUrl)} downloadUrl={fileUrl} />
        </Suspense>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export const StudyAnchorTile = ({
  href,
  title,
  subtitle,
  thumbnailUrl,
  iconUrl,
  meta,
  badge,
  sourceName,
  sourceType,
  year,
  stage,
  paper,
  icon,
  tone,
  variant = 'default',
  active = false,
  compact = false,
  libraryItem,
  className = '',
}: TileContentProps & { href: string; className?: string }) => {
  const location = useLocation();
  const isPdf = isStudyPdfUrl(href);
  const isReadable = isStudyReadableDocumentUrl(href);
  const isBookPackage = isStudyBookPackageUrl(href);
  const isBookVariant = variant === 'book';
  const readerHref = getStudyPdfReaderHref(href, title, `${location.pathname}${location.search}`);
  const readableActionLabel = isBookVariant ? 'Read' : 'View';
  const warmReader = () => {
    if (isBookPackage) warmStudyReadableDocument(href);
  };
  const actionColumns = isReadable ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <article
      className={[
        studyTileSurfaceClassName,
        active
          ? 'border-slate-950 bg-slate-950 dark:border-white dark:bg-white'
          : isBookVariant
            ? 'border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.92))] shadow-[0_22px_58px_rgba(15,23,42,0.15)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(45,45,45,0.98),rgba(22,22,22,0.98))] dark:shadow-[0_26px_68px_rgba(0,0,0,0.54)]'
            : 'bg-white/95 dark:bg-[#0b1220]',
        compact ? 'min-h-[224px]' : '',
        className,
      ].join(' ')}
    >
      <TileContent icon={icon} tone={tone} title={title} subtitle={subtitle} meta={meta} badge={isBookVariant ? undefined : badge || (isBookPackage ? 'BOOK' : isPdf ? 'PDF' : 'FILE')} thumbnailUrl={thumbnailUrl} iconUrl={iconUrl} sourceName={sourceName} sourceType={sourceType} year={year} stage={stage} paper={paper} active={active} compact={compact} variant={variant} />
      {libraryItem && !active && (
        <SaveLibraryItemButton
          item={libraryItem}
          iconOnly
          className={studyFloatingSaveClassName}
        />
      )}
      <div className={['study-card-actions mt-auto grid min-w-0 gap-2 border-t px-3 pb-2 pt-2 sm:pb-3', isBookVariant ? 'border-white/60 bg-white/90 dark:border-white/10 dark:bg-[#101010]' : 'border-slate-100/80 bg-white/95 dark:border-white/10 dark:bg-[#0b1220]', actionColumns].join(' ')}>
        {isReadable && (
          <Link
            to={readerHref}
            onFocus={warmReader}
            onPointerEnter={warmReader}
            className="study-soft-action inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-cyan-200/70 bg-cyan-50 px-2 text-xs font-black text-cyan-700 shadow-[0_8px_20px_rgba(8,145,178,0.10)] dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-200 dark:hover:bg-cyan-400/20 sm:min-h-11 sm:text-sm"
          >
            <EyeIcon className="h-4 w-4" aria-hidden="true" />
            {readableActionLabel}
          </Link>
        )}
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          download
          className="study-primary-action inline-flex min-h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-gradient-to-br from-slate-950 via-slate-800 to-cyan-950 px-2 text-xs font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)] dark:from-white dark:via-slate-100 dark:to-cyan-100 dark:text-slate-950 dark:hover:from-slate-100 sm:min-h-11 sm:text-sm"
        >
          <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Download</span>
          <span className="sm:hidden">Save</span>
        </a>
      </div>
    </article>
  );
};

export const StudyButtonTile = ({
  title,
  subtitle,
  thumbnailUrl,
  iconUrl,
  meta,
  badge,
  icon,
  tone,
  active = false,
  compact = false,
  className = '',
  onClick,
}: TileContentProps & { className?: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      studyTileSurfaceClassName,
      active ? 'border-slate-950 bg-slate-950 hover:bg-slate-950 dark:border-white dark:bg-white dark:hover:bg-white' : 'bg-white hover:bg-white dark:bg-[#0b1220] dark:hover:bg-[#0e1728]',
      compact ? 'min-h-[184px]' : '',
      className,
    ].join(' ')}
  >
    <TileContent icon={icon} tone={tone} title={title} subtitle={subtitle} meta={meta} badge={badge} thumbnailUrl={thumbnailUrl} iconUrl={iconUrl} active={active} compact={compact} />
  </button>
);

export const StudyNumberRow = ({
  index,
  title,
  href,
  meta,
  rightMeta,
  badges = [],
  tone = 'blue',
  icon,
  actions,
}: {
  index: number;
  title: string;
  href?: string;
  meta?: string;
  rightMeta?: string;
  badges?: string[];
  tone?: StudyTone;
  icon?: StudyIcon;
  actions?: ReactNode;
}) => {
  const Icon = icon;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-400/40">
      <div className="flex items-start gap-3">
        <div
          className={[
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-black',
            toneClasses[tone].circle,
          ].join(' ')}
        >
          {Icon ? <Icon className="h-6 w-6" aria-hidden="true" /> : index}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            {href ? (
              <Link to={href} className="line-clamp-2 font-bold leading-snug text-slate-950 dark:text-white">
                {title}
              </Link>
            ) : (
              <h3 className="line-clamp-2 font-bold leading-snug text-slate-950 dark:text-white">{title}</h3>
            )}
            {rightMeta && (
              <span className="shrink-0 text-xs font-bold text-slate-400 dark:text-slate-500">{rightMeta}</span>
            )}
          </div>
          {badges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {badges.slice(0, 4).map((badge) => (
                <span
                  key={badge}
                  className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}
          {meta && <p className="mt-2 line-clamp-1 text-sm font-medium text-slate-500 dark:text-slate-400">{meta}</p>}
        </div>
      </div>
      {actions && <div className="mt-3 flex gap-2 pl-[60px]">{actions}</div>}
    </article>
  );
};

export const studyCategoryVisuals = {
  official: { icon: ShieldCheckIcon, tone: 'blue' as StudyTone },
  books: { icon: BookOpenIcon, tone: 'emerald' as StudyTone },
  papers: { icon: DocumentTextIcon, tone: 'violet' as StudyTone },
  offline: { icon: ArrowDownTrayIcon, tone: 'emerald' as StudyTone },
  updates: { icon: NewspaperIcon, tone: 'amber' as StudyTone },
  finance: { icon: BanknotesIcon, tone: 'emerald' as StudyTone },
  calendar: { icon: CalendarDaysIcon, tone: 'violet' as StudyTone },
};
