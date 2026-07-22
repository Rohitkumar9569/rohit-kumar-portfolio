import {
  BeakerIcon,
  BookOpenIcon,
  BookmarkIcon,
  BriefcaseIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  CodeBracketIcon,
  CommandLineIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  LightBulbIcon,
  MapIcon,
  NewspaperIcon,
  PencilSquareIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import type { StudyIcon, StudyTone } from '../components/study/StudyVisualCards';
import type { StudyWorkspace } from '../studyHubApi';

export interface StudyCardNode {
  key: string;
  title: string;
  icon: StudyIcon;
  tone: StudyTone;
  params?: {
    phase?: string;
    type?: string;
    subject?: string;
    q?: string;
  };
}

const subjectDetailTiles: StudyCardNode[] = [
  { key: 'notes', title: 'Notes', icon: BookOpenIcon, tone: 'blue', params: { type: 'notes' } },
  { key: 'dpp', title: 'DPP', icon: ClipboardDocumentCheckIcon, tone: 'violet', params: { type: 'practice', q: 'dpp' } },
  { key: 'class-notes', title: 'Class Notes', icon: PencilSquareIcon, tone: 'emerald', params: { type: 'notes', q: 'class notes' } },
  { key: 'pyq', title: 'PYQ', icon: DocumentTextIcon, tone: 'amber', params: { type: 'pyq' } },
  { key: 'formula', title: 'Formula', icon: LightBulbIcon, tone: 'rose', params: { type: 'material', q: 'formula' } },
  { key: 'mind-map', title: 'Mind Map', icon: SparklesIcon, tone: 'cyan', params: { type: 'material', q: 'mind map' } },
  { key: 'practice', title: 'Practice', icon: ClipboardDocumentCheckIcon, tone: 'indigo', params: { type: 'practice' } },
  { key: 'syllabus', title: 'Syllabus', icon: BookmarkIcon, tone: 'slate', params: { type: 'syllabus' } },
  { key: 'books', title: 'Books', icon: BookOpenIcon, tone: 'emerald', params: { type: 'book' } },
];

const paperDetailTiles: StudyCardNode[] = [
  { key: 'question-paper', title: 'Question Paper', icon: DocumentTextIcon, tone: 'violet', params: { type: 'pyq' } },
  { key: 'solutions', title: 'Solutions', icon: LightBulbIcon, tone: 'amber', params: { q: 'solution' } },
  { key: 'answer-key', title: 'Answer Key', icon: ClipboardDocumentCheckIcon, tone: 'emerald', params: { q: 'answer key' } },
  { key: 'analysis', title: 'Analysis', icon: ChartBarIcon, tone: 'blue', params: { q: 'analysis' } },
  { key: 'topic-wise', title: 'Topic Wise', icon: Squares2X2Icon, tone: 'cyan', params: { q: 'topic wise' } },
  { key: 'download', title: 'Download', icon: FolderOpenIcon, tone: 'slate', params: { type: 'pyq' } },
];

const interviewDetailTiles: StudyCardNode[] = [
  { key: 'daf-qa', title: 'DAF Q&A', icon: UserCircleIcon, tone: 'rose', params: { type: 'qa', q: 'daf' } },
  { key: 'hr-qa', title: 'HR Q&A', icon: QuestionMarkCircleIcon, tone: 'violet', params: { type: 'qa', q: 'hr' } },
  { key: 'current-affairs', title: 'Current Affairs', icon: NewspaperIcon, tone: 'amber', params: { type: 'update' } },
  { key: 'state-qa', title: 'State Q&A', icon: MapIcon, tone: 'emerald', params: { type: 'qa', q: 'state' } },
  { key: 'mock-interview', title: 'Mock Interview', icon: ClipboardDocumentCheckIcon, tone: 'blue', params: { type: 'practice', q: 'mock interview' } },
  { key: 'saved-questions', title: 'Saved Questions', icon: BookmarkIcon, tone: 'slate', params: { type: 'qa' } },
];

const workspaceSections: Record<string, StudyCardNode[]> = {
  'jee-main': [
    { key: 'physics', title: 'Physics', icon: BeakerIcon, tone: 'blue', params: { phase: 'physics', subject: 'Physics' } },
    { key: 'chemistry', title: 'Chemistry', icon: BeakerIcon, tone: 'amber', params: { phase: 'chemistry', subject: 'Chemistry' } },
    { key: 'maths', title: 'Maths', icon: ChartBarIcon, tone: 'violet', params: { phase: 'maths', subject: 'Maths' } },
    { key: 'main-pyq', title: 'Main Previous Year Paper', icon: CalendarDaysIcon, tone: 'rose', params: { type: 'pyq', q: 'main previous year' } },
    { key: 'advanced-pyq', title: 'Adv Previous Year Paper', icon: DocumentTextIcon, tone: 'cyan', params: { type: 'pyq', q: 'advanced previous year' } },
    { key: 'formula', title: 'Formula', icon: LightBulbIcon, tone: 'emerald', params: { type: 'material', q: 'formula' } },
    { key: 'mind-map', title: 'Mind Map', icon: SparklesIcon, tone: 'indigo', params: { type: 'material', q: 'mind map' } },
    { key: 'mock-test', title: 'Mock Test', icon: ClipboardDocumentCheckIcon, tone: 'violet', params: { type: 'practice', q: 'mock test' } },
    { key: 'syllabus', title: 'Syllabus', icon: BookmarkIcon, tone: 'slate', params: { type: 'syllabus' } },
  ],
  'neet-ug': [
    { key: 'physics', title: 'Physics', icon: BeakerIcon, tone: 'blue', params: { phase: 'physics', subject: 'Physics' } },
    { key: 'chemistry', title: 'Chemistry', icon: BeakerIcon, tone: 'amber', params: { phase: 'chemistry', subject: 'Chemistry' } },
    { key: 'biology', title: 'Biology', icon: SparklesIcon, tone: 'emerald', params: { phase: 'biology', subject: 'Biology' } },
    { key: 'pyq', title: 'Previous Year Paper', icon: DocumentTextIcon, tone: 'violet', params: { type: 'pyq' } },
    { key: 'dpp', title: 'DPP', icon: ClipboardDocumentCheckIcon, tone: 'rose', params: { type: 'practice', q: 'dpp' } },
    { key: 'ncert-notes', title: 'NCERT Notes', icon: BookOpenIcon, tone: 'cyan', params: { type: 'notes', q: 'ncert' } },
    { key: 'formula', title: 'Formula', icon: LightBulbIcon, tone: 'amber', params: { type: 'material', q: 'formula' } },
    { key: 'mind-map', title: 'Mind Map', icon: SparklesIcon, tone: 'indigo', params: { type: 'material', q: 'mind map' } },
    { key: 'mock-test', title: 'Mock Test', icon: ClipboardDocumentCheckIcon, tone: 'violet', params: { type: 'practice', q: 'mock test' } },
  ],
  'upsc-cse': [
    { key: 'foundation', title: 'Foundation', icon: BookOpenIcon, tone: 'emerald', params: { phase: 'foundation' } },
    { key: 'prelims', title: 'Prelims', icon: ClipboardDocumentCheckIcon, tone: 'violet', params: { phase: 'prelims' } },
    { key: 'mains', title: 'Mains', icon: DocumentTextIcon, tone: 'blue', params: { phase: 'mains' } },
    { key: 'gs1', title: 'GS1', icon: BuildingLibraryIcon, tone: 'amber', params: { phase: 'mains', subject: 'GS1' } },
    { key: 'gs2', title: 'GS2', icon: MapIcon, tone: 'cyan', params: { phase: 'mains', subject: 'GS2' } },
    { key: 'gs3', title: 'GS3', icon: ChartBarIcon, tone: 'rose', params: { phase: 'mains', subject: 'GS3' } },
    { key: 'gs4', title: 'GS4', icon: SparklesIcon, tone: 'indigo', params: { phase: 'mains', subject: 'GS4' } },
    { key: 'csat', title: 'CSAT', icon: ClipboardDocumentCheckIcon, tone: 'violet', params: { phase: 'prelims', subject: 'Aptitude' } },
    { key: 'interview', title: 'Interview', icon: UserCircleIcon, tone: 'rose', params: { phase: 'interview' } },
  ],
  'ssc-cgl': [
    { key: 'quant', title: 'Quant', icon: ChartBarIcon, tone: 'violet', params: { subject: 'Quant' } },
    { key: 'reasoning', title: 'Reasoning', icon: LightBulbIcon, tone: 'amber', params: { subject: 'Reasoning' } },
    { key: 'english', title: 'English', icon: BookOpenIcon, tone: 'cyan', params: { subject: 'English' } },
    { key: 'ga', title: 'General Awareness', icon: NewspaperIcon, tone: 'emerald', params: { subject: 'General Awareness' } },
    { key: 'tier-1-pyq', title: 'Tier 1 PYQ', icon: DocumentTextIcon, tone: 'rose', params: { phase: 'tier-1', type: 'pyq' } },
    { key: 'tier-2-pyq', title: 'Tier 2 PYQ', icon: DocumentTextIcon, tone: 'blue', params: { phase: 'tier-2', type: 'pyq' } },
    { key: 'mock-test', title: 'Mock Test', icon: ClipboardDocumentCheckIcon, tone: 'indigo', params: { type: 'practice' } },
    { key: 'formula', title: 'Formula', icon: LightBulbIcon, tone: 'amber', params: { type: 'material', q: 'formula' } },
    { key: 'syllabus', title: 'Syllabus', icon: BookmarkIcon, tone: 'slate', params: { type: 'syllabus' } },
  ],
  'cbse-class-10': [
    { key: 'books', title: 'NCERT Books', icon: BookOpenIcon, tone: 'emerald', params: { type: 'book', q: 'class 10 ncert' } },
    { key: 'science', title: 'Science', icon: BeakerIcon, tone: 'emerald', params: { subject: 'Science' } },
    { key: 'social-science', title: 'Social Science', icon: MapIcon, tone: 'amber', params: { subject: 'Social Science' } },
    { key: 'english', title: 'English', icon: BookOpenIcon, tone: 'cyan', params: { subject: 'English' } },
    { key: 'sample-paper', title: 'Sample Paper', icon: BookOpenIcon, tone: 'emerald', params: { type: 'pyq', q: 'sample paper' } },
    { key: 'pyq', title: 'Previous Year Paper', icon: DocumentTextIcon, tone: 'violet', params: { type: 'pyq' } },
    { key: 'notes', title: 'Notes', icon: FolderOpenIcon, tone: 'blue', params: { type: 'notes' } },
    { key: 'syllabus', title: 'Syllabus', icon: BookmarkIcon, tone: 'amber', params: { type: 'syllabus' } },
    { key: 'mcq-test', title: 'MCQ Test', icon: ClipboardDocumentCheckIcon, tone: 'rose', params: { type: 'practice', q: 'mcq' } },
  ],
  'cbse-class-12': [
    { key: 'books', title: 'NCERT Books', icon: BookOpenIcon, tone: 'emerald', params: { type: 'book', q: 'class 12 ncert' } },
    { key: 'physics', title: 'Physics', icon: BeakerIcon, tone: 'blue', params: { subject: 'Physics' } },
    { key: 'chemistry', title: 'Chemistry', icon: BeakerIcon, tone: 'amber', params: { subject: 'Chemistry' } },
    { key: 'maths', title: 'Maths', icon: ChartBarIcon, tone: 'violet', params: { subject: 'Maths' } },
    { key: 'biology', title: 'Biology', icon: SparklesIcon, tone: 'emerald', params: { subject: 'Biology' } },
    { key: 'sample-paper', title: 'Sample Paper', icon: BookOpenIcon, tone: 'cyan', params: { type: 'pyq', q: 'sample paper' } },
    { key: 'pyq', title: 'Previous Year Paper', icon: DocumentTextIcon, tone: 'rose', params: { type: 'pyq' } },
    { key: 'notes', title: 'Notes', icon: FolderOpenIcon, tone: 'blue', params: { type: 'notes' } },
    { key: 'syllabus', title: 'Syllabus', icon: BookmarkIcon, tone: 'amber', params: { type: 'syllabus' } },
  ],
  'ncert-books': [
    { key: 'english-books', title: 'English Books', icon: BookOpenIcon, tone: 'emerald', params: { type: 'book', q: 'ncert books english' } },
    { key: 'hindi-books', title: 'Hindi Books', icon: BookOpenIcon, tone: 'cyan', params: { type: 'book', q: 'ncert books hindi' } },
    { key: 'class-6-8', title: 'Class 6-8', icon: BookOpenIcon, tone: 'blue', params: { phase: 'class-6-8' } },
    { key: 'class-9-10', title: 'Class 9-10', icon: BookOpenIcon, tone: 'violet', params: { phase: 'class-9-10' } },
    { key: 'class-11-12', title: 'Class 11-12', icon: BookOpenIcon, tone: 'rose', params: { phase: 'class-11-12' } },
    { key: 'solutions', title: 'Solutions', icon: LightBulbIcon, tone: 'amber', params: { q: 'solution' } },
    { key: 'notes', title: 'Notes', icon: FolderOpenIcon, tone: 'blue', params: { type: 'notes' } },
  ],
  tcs: [
    { key: 'aptitude', title: 'Aptitude', icon: ChartBarIcon, tone: 'violet', params: { phase: 'aptitude' } },
    { key: 'reasoning', title: 'Reasoning', icon: LightBulbIcon, tone: 'amber', params: { subject: 'Reasoning' } },
    { key: 'verbal', title: 'Verbal', icon: BookOpenIcon, tone: 'cyan', params: { subject: 'Verbal' } },
    { key: 'coding', title: 'Coding', icon: CodeBracketIcon, tone: 'emerald', params: { phase: 'coding' } },
    { key: 'technical', title: 'Technical Q&A', icon: CommandLineIcon, tone: 'blue', params: { phase: 'technical', type: 'qa' } },
    { key: 'hr', title: 'HR Q&A', icon: UserCircleIcon, tone: 'rose', params: { phase: 'hr', type: 'qa' } },
    { key: 'previous', title: 'Previous Questions', icon: DocumentTextIcon, tone: 'violet', params: { type: 'pyq' } },
    { key: 'mock-test', title: 'Mock Test', icon: ClipboardDocumentCheckIcon, tone: 'indigo', params: { type: 'practice' } },
    { key: 'interview', title: 'Interview', icon: BriefcaseIcon, tone: 'slate', params: { type: 'qa' } },
  ],
};

const genericExamTiles: StudyCardNode[] = [
  { key: 'pyq', title: 'PYQ', icon: DocumentTextIcon, tone: 'violet', params: { type: 'pyq' } },
  { key: 'notes', title: 'Notes', icon: BookOpenIcon, tone: 'blue', params: { type: 'notes' } },
  { key: 'books', title: 'Books', icon: BookOpenIcon, tone: 'emerald', params: { type: 'book' } },
  { key: 'syllabus', title: 'Syllabus', icon: BookmarkIcon, tone: 'amber', params: { type: 'syllabus' } },
  { key: 'practice', title: 'Practice', icon: ClipboardDocumentCheckIcon, tone: 'indigo', params: { type: 'practice' } },
  { key: 'qa', title: 'Q&A', icon: QuestionMarkCircleIcon, tone: 'rose', params: { type: 'qa' } },
  { key: 'updates', title: 'Updates', icon: NewspaperIcon, tone: 'cyan', params: { type: 'update' } },
  { key: 'formula', title: 'Formula', icon: LightBulbIcon, tone: 'amber', params: { q: 'formula' } },
  { key: 'mind-map', title: 'Mind Map', icon: SparklesIcon, tone: 'emerald', params: { q: 'mind map' } },
];

export const buildWorkspaceNodeHref = (workspaceSlug: string, node: StudyCardNode) => {
  if (node.params?.type || node.params?.q) {
    return buildNodeSearchHref(workspaceSlug, undefined, node);
  }

  const params = new URLSearchParams();
  params.set('section', node.key);
  if (node.params?.phase) params.set('phase', node.params.phase);
  if (node.params?.subject) params.set('subject', node.params.subject);
  if (node.params?.type) params.set('type', node.params.type);
  if (node.params?.q) params.set('q', node.params.q);
  return `/app/workspace/${workspaceSlug}?${params.toString()}`;
};

export const buildNodeSearchHref = (
  workspaceSlug: string,
  parentNode: StudyCardNode | undefined,
  childNode: StudyCardNode
) => {
  const params = new URLSearchParams();
  params.set('workspace', workspaceSlug);
  const subject = childNode.params?.subject || parentNode?.params?.subject || parentNode?.title;
  if (subject && !['pyq', 'notes', 'books', 'syllabus', 'practice', 'qa'].includes(subject.toLowerCase())) {
    params.set('subject', subject);
  }
  const phase = childNode.params?.phase || parentNode?.params?.phase;
  if (phase) params.set('stage', phase);
  if (childNode.params?.type) params.set('type', childNode.params.type);
  const q = [parentNode?.params?.q, childNode.params?.q].filter(Boolean).join(' ');
  if (q) params.set('q', q);
  return `/app/ask?${params.toString()}`;
};

export const getWorkspaceCardNodes = (workspace: StudyWorkspace): StudyCardNode[] => {
  if (workspaceSections[workspace.slug]) return workspaceSections[workspace.slug];

  const phaseNodes = (workspace.template?.phases || []).slice(0, 6).map((phase, index) => ({
    key: phase.key,
    title: phase.label,
    icon: [BookOpenIcon, DocumentTextIcon, ClipboardDocumentCheckIcon, UserCircleIcon, ChartBarIcon, SparklesIcon][index % 6],
    tone: ['blue', 'violet', 'emerald', 'amber', 'rose', 'cyan'][index % 6] as StudyTone,
    params: { phase: phase.key },
  }));

  if (phaseNodes.length >= 6) return phaseNodes;
  return [...phaseNodes, ...genericExamTiles].slice(0, 9);
};

export const getWorkspaceDetailNodes = (node?: StudyCardNode): StudyCardNode[] => {
  if (!node) return genericExamTiles;
  if (['main-pyq', 'advanced-pyq', 'pyq', 'tier-1-pyq', 'tier-2-pyq', 'sample-paper'].includes(node.key)) {
    return paperDetailTiles;
  }
  if (['interview', 'hr', 'technical'].includes(node.key)) return interviewDetailTiles;
  return subjectDetailTiles;
};

export const getWorkspaceNodeByKey = (workspace: StudyWorkspace, key?: string) => {
  if (!key) return undefined;
  return getWorkspaceCardNodes(workspace).find((node) => node.key === key);
};

export const getDefaultPreferenceSlugs = () => ['jee-main', 'neet-ug', 'upsc-cse', 'ssc-cgl', 'cbse-class-10', 'ncert-books'];
