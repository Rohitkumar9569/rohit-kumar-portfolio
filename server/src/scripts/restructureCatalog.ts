import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard, { type StudyCardGoalType, type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const ROOT_WORKSPACE_SLUG = 'study-hub';
const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
const shouldApply = process.argv.includes('--apply');
const verifyOnly = process.argv.includes('--verify');

type CardDoc = any;
type ShelfType = 'DEFAULT' | 'MATERIAL' | 'PYQ' | 'PRACTICE' | 'SYLLABUS' | 'ANSWER_KEY';

type NodeSpec = {
  name: string;
  aliases?: string[];
  type?: ShelfType;
  goalType?: StudyCardGoalType;
  iconKey?: string;
  tone?: StudyCardTone;
  children?: NodeSpec[];
};

type CardStyle = {
  goalType: StudyCardGoalType;
  iconKey: string;
  tone: StudyCardTone;
  order: number;
};

const stats = {
  created: 0,
  restored: 0,
  styled: 0,
  moved: 0,
  renamed: 0,
  merged: 0,
  archived: 0,
  filesMoved: 0,
  childrenMoved: 0,
  skipped: 0,
};

const plannedLogs: string[] = [];
const MAX_PLANNED_LOGS = 80;

const note = (message: string) => {
  if (shouldApply) return;
  if (plannedLogs.length < MAX_PLANNED_LOGS) plannedLogs.push(message);
};

const logStep = (message: string) => {
  console.log(`[restructure-catalog] ${message}`);
};

const compactName = (value = '') => value.replace(/\s+/g, ' ').trim();

const normalizeNameKey = (value = '') =>
  compactName(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const slugify = (value: string, fallback = 'folder') => {
  const slug = compactName(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '');
  return slug || fallback;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const objectIdKey = (value?: Types.ObjectId | string | null) => (value ? String(value) : '');
const sameId = (left?: Types.ObjectId | string | null, right?: Types.ObjectId | string | null) =>
  objectIdKey(left) === objectIdKey(right);

const activeFilter = (workspaceId: Types.ObjectId) => ({
  workspaceId,
  status: { $ne: 'archived' },
});

const cardCache = new Map<string, CardDoc>();

const cacheKey = (parentId: Types.ObjectId | string | null | undefined, slug: string) =>
  `${parentId ? String(parentId) : 'root'}::${slug}`;

const isActive = (card: CardDoc | null | undefined) => Boolean(card && card.status !== 'archived');

const cacheCard = (card: CardDoc) => {
  if (!card?.slug) return;
  cardCache.set(cacheKey(card.parentId || null, card.slug), card);
};

const removeCachedCard = (card: CardDoc) => {
  if (!card?.slug) return;
  cardCache.delete(cacheKey(card.parentId || null, card.slug));
};

const primeCardCache = async (workspaceId: Types.ObjectId) => {
  cardCache.clear();
  const cards = await StudyCard.find({ workspaceId }).select(
    'workspaceId parentId name slug iconKey tone goalType order visibility status iconUrl files'
  );
  cards.forEach(cacheCard);
  logStep(`cached ${cards.length} StudyCard folders`);
};

const years = (from: number, to: number, type: ShelfType = 'PYQ'): NodeSpec[] => {
  const list: NodeSpec[] = [];
  for (let year = from; year >= to; year -= 1) {
    list.push({ name: String(year), type, iconKey: 'pyq', tone: 'violet' });
  }
  return list;
};

const attempts = (prefix: string, fromYear: number, toYear: number): NodeSpec[] => {
  const list: NodeSpec[] = [];
  for (let year = fromYear; year >= toYear; year -= 1) {
    list.push({ name: `${prefix} I ${year}`, type: 'PYQ', iconKey: 'pyq', tone: 'violet' });
    list.push({ name: `${prefix} II ${year}`, type: 'PYQ', iconKey: 'pyq', tone: 'violet' });
  }
  return list;
};

const n = (name: string, children: NodeSpec[] = [], options: Omit<NodeSpec, 'name' | 'children'> = {}): NodeSpec => ({
  name,
  ...options,
  ...(children.length ? { children } : {}),
});

const PREMIUM_STRUCTURE: NodeSpec[] = [
  n('Competitive Exams', [
    n('UPSC CSE', [
      n('Prelims', [
        n('GS Paper 1', [], {
          type: 'MATERIAL',
          aliases: ['General Studies Paper 1', 'GS Paper I', 'General Studies'],
          iconKey: 'material',
          tone: 'emerald',
        }),
        n('CSAT', [], { type: 'PRACTICE', aliases: ['Aptitude', 'Civil Services Aptitude Test'], iconKey: 'aptitude', tone: 'amber' }),
        n('Previous Year Papers', years(2025, 2013), { type: 'PYQ', aliases: ['PYQ', 'PYQs', 'Previous Year Questions'], iconKey: 'pyq', tone: 'violet' }),
        n('Mock Tests', [], { type: 'PRACTICE', iconKey: 'mock', tone: 'amber' }),
      ]),
      n('Mains', [
        n('GS Paper I', [], { type: 'MATERIAL', aliases: ['GS Paper 1'], iconKey: 'material', tone: 'emerald' }),
        n('GS Paper II', [], { type: 'MATERIAL', aliases: ['GS Paper 2'], iconKey: 'material', tone: 'emerald' }),
        n('GS Paper III', [], { type: 'MATERIAL', aliases: ['GS Paper 3'], iconKey: 'material', tone: 'emerald' }),
        n('GS Paper IV Ethics', [], { type: 'MATERIAL', aliases: ['GS Paper IV', 'Ethics', 'GS Paper 4'], iconKey: 'material', tone: 'emerald' }),
        n('Essay', [], { type: 'PRACTICE', iconKey: 'notes', tone: 'amber' }),
        n('Optional Subject', [
          n('Public Administration', [], { type: 'MATERIAL' }),
          n('Sociology', [], { type: 'MATERIAL' }),
          n('Geography', [], { type: 'MATERIAL' }),
          n('History', [], { type: 'MATERIAL' }),
          n('Political Science & IR', [], { type: 'MATERIAL', aliases: ['Political Science and IR', 'PSIR'] }),
          n('Anthropology', [], { type: 'MATERIAL' }),
        ], { aliases: ['Optional', 'Optional Subjects'], iconKey: 'book', tone: 'emerald' }),
        n('Previous Year Papers', years(2024, 2015), { type: 'PYQ', aliases: ['PYQ', 'PYQs'], iconKey: 'pyq', tone: 'violet' }),
        n('Mock Tests', [], { type: 'PRACTICE', iconKey: 'mock', tone: 'amber' }),
        n('Answer Writing Practice', [], { type: 'PRACTICE', aliases: ['Answer Writing', 'Mains Answer Writing'], iconKey: 'qa', tone: 'amber' }),
      ]),
      n('Interview (Personality Test)', [
        n('DAF Guidance', [], { type: 'MATERIAL', aliases: ['DAF Guide', 'DAF'], iconKey: 'interview', tone: 'cyan' }),
        n('Mock Interviews', [], { type: 'PRACTICE', aliases: ['Mock Interview'], iconKey: 'interview', tone: 'amber' }),
        n('Current Affairs', [], { type: 'MATERIAL', iconKey: 'current-affairs', tone: 'cyan' }),
      ], { aliases: ['Interview (PT)', 'Interview', 'Personality Test'], iconKey: 'interview', tone: 'cyan' }),
      n('Common Resources', [
        n('Official Syllabus', [], { type: 'SYLLABUS', aliases: ['Syllabus'], iconKey: 'syllabus', tone: 'cyan' }),
        n('NCERT Books', [], { type: 'MATERIAL', aliases: ['NCERT'], iconKey: 'book', tone: 'emerald' }),
        n('Standard Books List', [], { type: 'MATERIAL', aliases: ['Booklist', 'Books List'], iconKey: 'book', tone: 'emerald' }),
        n('Current Affairs', [], { type: 'MATERIAL', iconKey: 'current-affairs', tone: 'cyan' }),
        n('Answer Writing Guide', [], { type: 'MATERIAL', aliases: ['Answer Writing'], iconKey: 'qa', tone: 'emerald' }),
      ], { iconKey: 'folder', tone: 'slate' }),
    ], {
      aliases: ['UPSC Civil Services', 'Civil Services Examination', 'IAS', 'IAS Exam', 'UPSC CSE Exam'],
      goalType: 'exam',
      iconKey: 'upsc-cse',
      tone: 'indigo',
    }),
    n('UPSC CAPF', [
      n('Paper I (GS & Essay)', [], { type: 'MATERIAL', aliases: ['Paper I', 'Paper 1', 'GS & Essay'], iconKey: 'material', tone: 'emerald' }),
      n('Paper II (CPO)', [], { type: 'MATERIAL', aliases: ['Paper II', 'Paper 2', 'CPO'], iconKey: 'material', tone: 'emerald' }),
      n('Previous Year Papers', years(2024, 2017), { type: 'PYQ', iconKey: 'pyq', tone: 'violet' }),
      n('Syllabus', [], { type: 'SYLLABUS', iconKey: 'syllabus', tone: 'cyan' }),
      n('Mock Tests', [], { type: 'PRACTICE', iconKey: 'mock', tone: 'amber' }),
    ], { aliases: ['UPSC CAPF AC', 'CAPF AC'], goalType: 'exam', iconKey: 'shield', tone: 'indigo' }),
    n('CDS', [
      n('Mathematics', [], { type: 'MATERIAL', aliases: ['Maths'], iconKey: 'maths', tone: 'emerald' }),
      n('English', [], { type: 'MATERIAL', iconKey: 'english', tone: 'emerald' }),
      n('General Knowledge', [], { type: 'MATERIAL', aliases: ['GK'], iconKey: 'book', tone: 'emerald' }),
      n('Previous Year Papers', attempts('CDS', 2024, 2021), { type: 'PYQ', iconKey: 'pyq', tone: 'violet' }),
      n('Syllabus', [], { type: 'SYLLABUS', iconKey: 'syllabus', tone: 'cyan' }),
      n('Mock Tests', [], { type: 'PRACTICE', iconKey: 'mock', tone: 'amber' }),
    ], { aliases: ['Combined Defence Services', 'UPSC CDS'], goalType: 'exam', iconKey: 'cds', tone: 'indigo' }),
    n('NDA', [
      n('Mathematics', [], { type: 'MATERIAL', aliases: ['Maths'], iconKey: 'maths', tone: 'emerald' }),
      n('General Ability Test', [
        n('English', [], { type: 'MATERIAL', iconKey: 'english', tone: 'emerald' }),
        n('Physics', [], { type: 'MATERIAL', iconKey: 'physics', tone: 'emerald' }),
        n('Chemistry', [], { type: 'MATERIAL', iconKey: 'chemistry', tone: 'emerald' }),
        n('History & Polity', [], { type: 'MATERIAL', aliases: ['History and Polity'], iconKey: 'history', tone: 'emerald' }),
        n('Geography', [], { type: 'MATERIAL', iconKey: 'geography', tone: 'emerald' }),
        n('Current Events', [], { type: 'MATERIAL', aliases: ['Current Affairs'], iconKey: 'current-affairs', tone: 'cyan' }),
      ], { aliases: ['GAT'], iconKey: 'book', tone: 'emerald' }),
      n('Previous Year Papers', attempts('NDA', 2024, 2022), { type: 'PYQ', iconKey: 'pyq', tone: 'violet' }),
      n('Syllabus', [], { type: 'SYLLABUS', iconKey: 'syllabus', tone: 'cyan' }),
    ], { aliases: ['UPSC NDA', 'National Defence Academy'], goalType: 'exam', iconKey: 'nda', tone: 'indigo' }),
    n('SSC CGL', [
      n('Tier 1', [
        n('Quantitative Aptitude', [
          n('Speed Calculation', [
            n('Tables 2 to 50', [], { type: 'MATERIAL', iconKey: 'aptitude', tone: 'emerald' }),
            n('Squares Cubes Triplets', [], { type: 'MATERIAL', iconKey: 'formula', tone: 'cyan' }),
            n('Fractions and Shortcuts', [], { type: 'MATERIAL', iconKey: 'formula', tone: 'cyan' }),
            n('Daily Drill', [], { type: 'MATERIAL', iconKey: 'practice', tone: 'rose' }),
          ], { type: 'MATERIAL', iconKey: 'clock', tone: 'cyan' }),
          n('Formula Recall', [], { type: 'MATERIAL', iconKey: 'formula', tone: 'cyan' }),
        ], { type: 'MATERIAL', iconKey: 'aptitude', tone: 'emerald' }),
        n('English Language', [
          n('Grammar Vocabulary Recall', [], { type: 'MATERIAL', iconKey: 'english', tone: 'emerald' }),
        ], { type: 'MATERIAL', iconKey: 'english', tone: 'emerald' }),
        n('General Intelligence', [
          n('Pattern Speed Practice', [], { type: 'MATERIAL', aliases: ['Reasoning speed'], iconKey: 'aptitude', tone: 'emerald' }),
        ], { type: 'MATERIAL', aliases: ['Reasoning'], iconKey: 'aptitude', tone: 'emerald' }),
        n('General Awareness', [
          n('Map and Static GK', [], { type: 'MATERIAL', aliases: ['Maps', 'Atlas'], iconKey: 'geography', tone: 'emerald' }),
          n('Static GK Timeline', [], { type: 'MATERIAL', aliases: ['History timeline', 'Polity articles'], iconKey: 'history', tone: 'cyan' }),
        ], { type: 'MATERIAL', aliases: ['GK'], iconKey: 'book', tone: 'emerald' }),
      ]),
      n('Tier 2', [
        n('Maths (Paper 1)', [], { type: 'MATERIAL', aliases: ['Mathematics Paper 1'], iconKey: 'maths', tone: 'emerald' }),
        n('English (Paper 2)', [], { type: 'MATERIAL', iconKey: 'english', tone: 'emerald' }),
        n('Statistics (Paper 3)', [], { type: 'MATERIAL', iconKey: 'chart', tone: 'emerald' }),
      ]),
      n('Previous Year Papers', years(2024, 2018), { type: 'PYQ', iconKey: 'pyq', tone: 'violet' }),
      n('Syllabus', [], { type: 'SYLLABUS', iconKey: 'syllabus', tone: 'cyan' }),
      n('Mock Tests', [], { type: 'PRACTICE', iconKey: 'mock', tone: 'amber' }),
    ], { aliases: ['CGL', 'Staff Selection Commission CGL'], goalType: 'exam', iconKey: 'ssc-cgl', tone: 'rose' }),
    n('SSC CHSL', [
      n('Tier 1', [], { type: 'MATERIAL' }),
      n('Tier 2', [], { type: 'MATERIAL' }),
      n('Previous Year Papers', years(2024, 2020), { type: 'PYQ', iconKey: 'pyq', tone: 'violet' }),
      n('Syllabus', [], { type: 'SYLLABUS', iconKey: 'syllabus', tone: 'cyan' }),
    ], { aliases: ['CHSL', 'Staff Selection Commission CHSL'], goalType: 'exam', iconKey: 'ssc-chsl', tone: 'rose' }),
    n('Banking (IBPS/SBI)', [
      n('IBPS PO', [
        n('Prelims', [], { type: 'MATERIAL' }),
        n('Mains', [], { type: 'MATERIAL' }),
        n('Previous Year Papers', [], { type: 'PYQ', iconKey: 'pyq', tone: 'violet' }),
      ], { goalType: 'exam', iconKey: 'bank', tone: 'cyan' }),
      n('IBPS Clerk', [
        n('Prelims', [], { type: 'MATERIAL' }),
        n('Mains', [], { type: 'MATERIAL' }),
        n('Previous Year Papers', [], { type: 'PYQ', iconKey: 'pyq', tone: 'violet' }),
      ], { goalType: 'exam', iconKey: 'bank', tone: 'cyan' }),
      n('SBI PO', [
        n('Prelims', [], { type: 'MATERIAL' }),
        n('Mains', [], { type: 'MATERIAL' }),
        n('Previous Year Papers', [], { type: 'PYQ', iconKey: 'pyq', tone: 'violet' }),
      ], { goalType: 'exam', iconKey: 'sbi', tone: 'cyan' }),
      n('Common Topics', [
        n('Quantitative Aptitude', [], { type: 'MATERIAL', iconKey: 'aptitude', tone: 'emerald' }),
        n('Reasoning', [], { type: 'MATERIAL', iconKey: 'aptitude', tone: 'emerald' }),
        n('English', [], { type: 'MATERIAL', iconKey: 'english', tone: 'emerald' }),
        n('Banking Awareness', [], { type: 'MATERIAL', iconKey: 'bank', tone: 'emerald' }),
        n('Computer', [], { type: 'MATERIAL', iconKey: 'computer-science', tone: 'emerald' }),
      ]),
    ], { aliases: ['Banking', 'Bank Exams', 'IBPS SBI', 'IBPS/SBI'], goalType: 'exam_family', iconKey: 'banking', tone: 'cyan' }),
    n('Railway (RRB)', [
      n('RRB NTPC', [
        n('CBT 1', [], { type: 'MATERIAL' }),
        n('CBT 2', [], { type: 'MATERIAL' }),
        n('Previous Year Papers', [], { type: 'PYQ', iconKey: 'pyq', tone: 'violet' }),
      ], { goalType: 'exam', iconKey: 'rrb-ntpc', tone: 'amber' }),
      n('RRB Group D', [
        n('Study Material', [], { type: 'MATERIAL', iconKey: 'material', tone: 'emerald' }),
        n('Previous Year Papers', [], { type: 'PYQ', iconKey: 'pyq', tone: 'violet' }),
      ], { goalType: 'exam', iconKey: 'wrench', tone: 'amber' }),
      n('Common Topics', [
        n('General Awareness', [], { type: 'MATERIAL' }),
        n('Maths', [], { type: 'MATERIAL', iconKey: 'maths', tone: 'emerald' }),
        n('Reasoning', [], { type: 'MATERIAL', iconKey: 'aptitude', tone: 'emerald' }),
        n('General Science', [], { type: 'MATERIAL', iconKey: 'science', tone: 'emerald' }),
      ]),
    ], { aliases: ['Railway', 'Railways', 'RRB', 'Railway Exams'], goalType: 'exam_family', iconKey: 'railway', tone: 'amber' }),
    n('Engineering Services & PSU', [
      n('IES ESE', [
        n('Paper I', [], { type: 'MATERIAL' }),
        n('Paper II', [], { type: 'MATERIAL' }),
        n('Previous Year Papers', [], { type: 'PYQ', iconKey: 'pyq', tone: 'violet' }),
      ], { aliases: ['Engineering Services Examination', 'UPSC ESE'], goalType: 'exam', iconKey: 'gear', tone: 'slate' }),
    ], { aliases: ['Engineering Services', 'PSU Exams'], goalType: 'exam_family', iconKey: 'gear', tone: 'slate' }),
    n('Defence', [
      n('CISF AC LDCE', [
        n('Study Material', [], { type: 'MATERIAL' }),
        n('Previous Year Papers', [], { type: 'PYQ', iconKey: 'pyq', tone: 'violet' }),
      ], { aliases: ['CISF AC'], goalType: 'exam', iconKey: 'shield', tone: 'indigo' }),
    ], { goalType: 'exam_family', iconKey: 'shield', tone: 'indigo' }),
  ], { aliases: ['Central Government Exams', 'Central Govt Exams'], goalType: 'exam_category', iconKey: 'competitive', tone: 'indigo' }),
  n('Entrance Exams', [
    n('JEE (Main + Advanced)', [
      n('Physics', [], { type: 'MATERIAL', iconKey: 'physics', tone: 'emerald' }),
      n('Chemistry', [], { type: 'MATERIAL', iconKey: 'chemistry', tone: 'emerald' }),
      n('Maths', [], { type: 'MATERIAL', aliases: ['Mathematics'], iconKey: 'maths', tone: 'emerald' }),
      n('Previous Year Papers', [], { type: 'PYQ', aliases: ['PYQ', 'Chapter-wise PYQs'], iconKey: 'pyq', tone: 'violet' }),
      n('Syllabus', [], { type: 'SYLLABUS', iconKey: 'syllabus', tone: 'cyan' }),
      n('Mock Tests', [], { type: 'PRACTICE', iconKey: 'mock', tone: 'amber' }),
    ], { aliases: ['JEE', 'IIT JEE', 'JEE Main', 'JEE Advanced', 'Joint Entrance Examination'], goalType: 'exam', iconKey: 'nuclear', tone: 'cyan' }),
    n('NEET', [
      n('Physics', [], { type: 'MATERIAL', iconKey: 'physics', tone: 'emerald' }),
      n('Chemistry', [], { type: 'MATERIAL', iconKey: 'chemistry', tone: 'emerald' }),
      n('Biology', [], { type: 'MATERIAL', iconKey: 'biology', tone: 'emerald' }),
      n('Previous Year Papers', [], { type: 'PYQ', iconKey: 'pyq', tone: 'violet' }),
      n('Syllabus', [], { type: 'SYLLABUS', iconKey: 'syllabus', tone: 'cyan' }),
      n('Mock Tests', [], { type: 'PRACTICE', iconKey: 'mock', tone: 'amber' }),
    ], { aliases: ['NEET UG', 'National Eligibility cum Entrance Test', 'NTA NEET'], goalType: 'exam', iconKey: 'neet', tone: 'emerald' }),
    n('GATE CSE', [
      n('Subject-wise Material', [
        n('Engineering Mathematics', [], { type: 'MATERIAL' }),
        n('Discrete Mathematics', [], { type: 'MATERIAL' }),
        n('Data Structures & Algorithms', [], { type: 'MATERIAL', aliases: ['Data Structures Algorithms', 'DSA'] }),
        n('Operating System', [], { type: 'MATERIAL', aliases: ['Operating Systems'] }),
        n('DBMS', [], { type: 'MATERIAL', aliases: ['Database Management'] }),
        n('Computer Networks', [], { type: 'MATERIAL' }),
        n('Theory of Computation', [], { type: 'MATERIAL' }),
        n('Compiler Design', [], { type: 'MATERIAL' }),
        n('Digital Logic', [], { type: 'MATERIAL' }),
        n('Computer Architecture', [], { type: 'MATERIAL' }),
      ], { aliases: ['Study Material', 'Subject Material'], iconKey: 'material', tone: 'emerald' }),
      n('Previous Year Papers', [], { type: 'PYQ', aliases: ['PYQ', 'GATE CS PYQ'], iconKey: 'pyq', tone: 'violet' }),
      n('Syllabus', [], { type: 'SYLLABUS', iconKey: 'syllabus', tone: 'cyan' }),
      n('Mock Tests', [], { type: 'PRACTICE', iconKey: 'mock', tone: 'amber' }),
    ], {
      aliases: ['GATE CS', 'GATE Computer Science', 'GATE Computer Science and Information Technology', 'GATE CSE/IT'],
      goalType: 'exam',
      iconKey: 'gate',
      tone: 'cyan',
    }),
  ], { goalType: 'exam_category', iconKey: 'entrance', tone: 'violet' }),
  n('State Exams', [
    n('UPPSC PCS', [
      n('Prelims', [
        n('GS Paper 1', [], { type: 'MATERIAL', aliases: ['GS Paper I'], iconKey: 'material', tone: 'emerald' }),
        n('CSAT', [], { type: 'PRACTICE', iconKey: 'aptitude', tone: 'amber' }),
        n('Previous Year Papers', years(2024, 2017), { type: 'PYQ', iconKey: 'pyq', tone: 'violet' }),
      ]),
      n('Mains', [
        n('General Hindi', [], { type: 'MATERIAL', iconKey: 'hindi', tone: 'emerald' }),
        n('Essay', [], { type: 'PRACTICE', iconKey: 'notes', tone: 'amber' }),
        n('GS Paper I', [], { type: 'MATERIAL' }),
        n('GS Paper II', [], { type: 'MATERIAL' }),
        n('GS Paper III', [], { type: 'MATERIAL' }),
        n('GS Paper IV', [], { type: 'MATERIAL' }),
        n('Optional Subject', [], { type: 'MATERIAL', aliases: ['Optional'] }),
        n('Previous Year Papers', [], { type: 'PYQ', iconKey: 'pyq', tone: 'violet' }),
      ]),
      n('Interview', [], { type: 'MATERIAL', iconKey: 'interview', tone: 'cyan' }),
      n('Common Resources', [
        n('Official Syllabus', [], { type: 'SYLLABUS', aliases: ['Syllabus'], iconKey: 'syllabus', tone: 'cyan' }),
        n('UP Special GK', [], { type: 'MATERIAL', iconKey: 'book', tone: 'emerald' }),
        n('Current Affairs', [], { type: 'MATERIAL', iconKey: 'current-affairs', tone: 'cyan' }),
      ]),
    ], { aliases: ['UPPSC', 'UPPCS', 'UP PCS', 'Uttar Pradesh PCS'], goalType: 'exam', iconKey: 'state-exam', tone: 'amber' }),
  ], { goalType: 'exam_category', iconKey: 'state-exam', tone: 'amber' }),
];

const CONTENT_MIGRATION_MAP: Array<[string[], string[]]> = [
  [['Competitive Exams', 'UPSC', 'UPSC CSE'], ['Competitive Exams', 'UPSC CSE']],
  [['Competitive Exams', 'UPSC', 'UPSC CSE', 'Study Material'], ['Competitive Exams', 'UPSC CSE', 'Common Resources']],
  [['Competitive Exams', 'UPSC', 'UPSC CSE', 'Common Resources'], ['Competitive Exams', 'UPSC CSE', 'Common Resources']],
  [['Competitive Exams', 'UPSC', 'UPSC CSE', 'Mains', 'GS Paper I'], ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper I']],
  [['Competitive Exams', 'UPSC', 'UPSC CSE', 'Mains', 'GS Paper II'], ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper II']],
  [['Competitive Exams', 'UPSC', 'UPSC CSE', 'Mains', 'GS Paper III'], ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper III']],
  [['Competitive Exams', 'UPSC', 'UPSC CSE', 'Mains', 'GS Paper IV Ethics'], ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper IV Ethics']],
  [['Competitive Exams', 'UPSC', 'UPSC CSE', 'Mains', 'Essay'], ['Competitive Exams', 'UPSC CSE', 'Mains', 'Essay']],
  [['Competitive Exams', 'UPSC', 'UPSC CSE', 'Mains', 'Optional'], ['Competitive Exams', 'UPSC CSE', 'Mains', 'Optional Subject']],
  [['Competitive Exams', 'UPSC', 'UPSC CSE', 'Answer Writing'], ['Competitive Exams', 'UPSC CSE', 'Common Resources', 'Answer Writing Guide']],
  [['Competitive Exams', 'UPSC', 'UPSC CSE', 'DAF Guide'], ['Competitive Exams', 'UPSC CSE', 'Interview (Personality Test)', 'DAF Guidance']],
  [['Competitive Exams', 'UPSC', 'UPSC CSE', 'Expected Questions'], ['Competitive Exams', 'UPSC CSE', 'Mains', 'Mock Tests']],
  [['Competitive Exams', 'UPSC', 'UPSC CSE', 'Foundation'], ['Competitive Exams', 'UPSC CSE', 'Common Resources']],
  [['Competitive Exams', 'UPSC', 'UPSC CSE', 'CSAT'], ['Competitive Exams', 'UPSC CSE', 'Prelims', 'CSAT']],
  [['Competitive Exams', 'UPSC', 'CDS'], ['Competitive Exams', 'CDS']],
  [['Competitive Exams', 'UPSC', 'NDA'], ['Competitive Exams', 'NDA']],
  [['Competitive Exams', 'UPSC', 'UPSC CAPF'], ['Competitive Exams', 'UPSC CAPF']],
  [['Competitive Exams', 'UPSC', 'UPSC CAPF AC'], ['Competitive Exams', 'UPSC CAPF']],
  [['Competitive Exams', 'UPSC', 'IES ESE'], ['Competitive Exams', 'Engineering Services & PSU', 'IES ESE']],
  [['Competitive Exams', 'UPSC', 'IFoS'], ['Competitive Exams', 'UPSC CSE', 'Common Resources', 'UPSC IFoS']],
  [['Competitive Exams', 'UPSC', 'CISF AC LDCE'], ['Competitive Exams', 'Defence', 'CISF AC LDCE']],
  [['Entrance Exams', 'JEE'], ['Entrance Exams', 'JEE (Main + Advanced)']],
  [['Entrance Exams', 'IIT JEE'], ['Entrance Exams', 'JEE (Main + Advanced)']],
  [['Entrance Exams', 'JEE Main'], ['Entrance Exams', 'JEE (Main + Advanced)']],
  [['Entrance Exams', 'JEE Advanced'], ['Entrance Exams', 'JEE (Main + Advanced)']],
  [['Entrance Exams', 'NEET UG'], ['Entrance Exams', 'NEET']],
  [['Entrance Exams', 'GATE', 'GATE CSE'], ['Entrance Exams', 'GATE CSE']],
  [['Entrance Exams', 'GATE', 'GATE CS'], ['Entrance Exams', 'GATE CSE']],
  [['State Exams', 'UPPSC', 'UPPSC PCS'], ['State Exams', 'UPPSC PCS']],
  [['State Exams', 'UP PCS'], ['State Exams', 'UPPSC PCS']],
  [['State Exams', 'UPPCS'], ['State Exams', 'UPPSC PCS']],
];

const REDUNDANT_HANDLERS: Array<{ names: string[]; target?: string[]; unwrap?: boolean }> = [
  { names: ['UPSC'], unwrap: true },
  { names: ['Other UPSC Exams'], unwrap: true },
  { names: ['Other Central Services'], unwrap: true },
  { names: ['Foundation'], target: ['Competitive Exams', 'UPSC CSE', 'Common Resources'] },
  { names: ['Study Material'], target: ['Competitive Exams', 'UPSC CSE', 'Common Resources'] },
  { names: ['Expected Questions'], target: ['Competitive Exams', 'UPSC CSE', 'Mains', 'Mock Tests'] },
  { names: ['IES ESE'], target: ['Competitive Exams', 'Engineering Services & PSU', 'IES ESE'] },
  { names: ['IFoS'], target: ['Competitive Exams', 'UPSC CSE', 'Common Resources', 'UPSC IFoS'] },
  { names: ['CISF AC LDCE'], target: ['Competitive Exams', 'Defence', 'CISF AC LDCE'] },
];

const typeIconTone = (type: ShelfType | undefined): Pick<CardStyle, 'iconKey' | 'tone'> => {
  switch (type) {
    case 'MATERIAL':
      return { iconKey: 'material', tone: 'emerald' };
    case 'PYQ':
      return { iconKey: 'pyq', tone: 'violet' };
    case 'PRACTICE':
      return { iconKey: 'mock', tone: 'amber' };
    case 'SYLLABUS':
      return { iconKey: 'syllabus', tone: 'cyan' };
    case 'ANSWER_KEY':
      return { iconKey: 'answer-key', tone: 'rose' };
    default:
      return { iconKey: 'folder', tone: 'slate' };
  }
};

const styleForName = (name: string, depth: number, index: number, node?: NodeSpec): CardStyle => {
  const key = normalizeNameKey(name);
  const typed = typeIconTone(node?.type);
  const goalType: StudyCardGoalType =
    node?.goalType ||
    (depth === 0 ? 'exam_category' : depth === 1 ? 'exam' : key.includes('paper') || key.includes('subject') ? 'subject' : 'resource_folder');

  let iconKey = node?.iconKey || typed.iconKey;
  let tone = node?.tone || typed.tone;

  if (!node?.iconKey) {
    if (key.includes('previous year') || key === 'pyq') iconKey = 'pyq';
    else if (key.includes('syllabus')) iconKey = 'syllabus';
    else if (key.includes('mock') || key.includes('practice')) iconKey = 'mock';
    else if (key.includes('current affairs')) iconKey = 'current-affairs';
    else if (key.includes('math')) iconKey = 'maths';
    else if (key.includes('english')) iconKey = 'english';
    else if (key.includes('physics')) iconKey = 'physics';
    else if (key.includes('chemistry')) iconKey = 'chemistry';
    else if (key.includes('biology')) iconKey = 'biology';
  }

  return {
    goalType,
    iconKey,
    tone,
    order: (index + 1) * 10,
  };
};

const findChildByAliases = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  names: string[],
  includeArchived = false
) => {
  const cleanNames = Array.from(new Set(names.map(compactName).filter(Boolean)));
  const slugs = cleanNames.map((name) => slugify(name));

  for (const slug of slugs) {
    const cached = cardCache.get(cacheKey(parentId, slug));
    if (cached && (includeArchived || isActive(cached))) return cached;
  }

  const regexes = cleanNames.map((name) => new RegExp(`^${escapeRegex(name)}$`, 'i'));
  const card = await StudyCard.findOne({
    workspaceId,
    parentId: parentId || null,
    ...(includeArchived ? {} : { status: { $ne: 'archived' } }),
    $or: [{ slug: { $in: slugs } }, { name: { $in: regexes } }],
  });
  if (card) cacheCard(card);
  return card;
};

const findGlobalCandidates = async (workspaceId: Types.ObjectId, names: string[]) => {
  const cleanNames = Array.from(new Set(names.map(compactName).filter(Boolean)));
  const slugs = cleanNames.map((name) => slugify(name));
  const regexes = cleanNames.map((name) => new RegExp(`^${escapeRegex(name)}$`, 'i'));
  const candidates = await StudyCard.find({
    workspaceId,
    $or: [{ slug: { $in: slugs } }, { name: { $in: regexes } }],
  }).sort({ status: 1, parentId: 1, order: 1, name: 1 });
  candidates.forEach(cacheCard);
  return Array.from(new Map(candidates.map((card) => [String(card._id), card])).values());
};

const getChildren = (workspaceId: Types.ObjectId, parentId: Types.ObjectId | string) =>
  StudyCard.find({ ...activeFilter(workspaceId), parentId }).sort({ order: 1, name: 1 });

const getChildCount = async (workspaceId: Types.ObjectId, parentId: Types.ObjectId | string) =>
  StudyCard.countDocuments({ ...activeFilter(workspaceId), parentId });

const getDescendantIds = async (workspaceId: Types.ObjectId, rootId: Types.ObjectId | string) => {
  const ids: string[] = [];
  const queue = [objectIdKey(rootId)];
  const seen = new Set<string>();

  while (queue.length) {
    const currentId = queue.shift();
    if (!currentId || seen.has(currentId)) continue;
    seen.add(currentId);
    const children = await StudyCard.find({ ...activeFilter(workspaceId), parentId: currentId }).select('_id');
    for (const child of children) {
      const childId = objectIdKey(child._id as Types.ObjectId);
      ids.push(childId);
      queue.push(childId);
    }
  }

  return ids;
};

const findDescendantsByAliases = async (
  workspaceId: Types.ObjectId,
  rootId: Types.ObjectId | string,
  names: string[]
) => {
  const descendantIds = await getDescendantIds(workspaceId, rootId);
  if (!descendantIds.length) return [];

  const cleanNames = Array.from(new Set(names.map(compactName).filter(Boolean)));
  const slugs = cleanNames.map((name) => slugify(name));
  const regexes = cleanNames.map((name) => new RegExp(`^${escapeRegex(name)}$`, 'i'));
  const cards = await StudyCard.find({
    ...activeFilter(workspaceId),
    _id: { $in: descendantIds },
    $or: [{ slug: { $in: slugs } }, { name: { $in: regexes } }],
  }).sort({ parentId: 1, order: 1, name: 1 });
  cards.forEach(cacheCard);
  return cards;
};

const chooseBestCandidate = async (
  workspaceId: Types.ObjectId,
  candidates: CardDoc[],
  targetParentId: Types.ObjectId | null
) => {
  const direct = candidates.find((card) => sameId(card.parentId || null, targetParentId || null) && isActive(card));
  if (direct) return direct;

  const active = candidates.filter(isActive);
  const pool = active.length ? active : candidates;
  const scored = await Promise.all(
    pool.map(async (card) => ({
      card,
      score:
        (sameId(card.parentId || null, targetParentId || null) ? 1000 : 0) +
        (isActive(card) ? 500 : 0) +
        ((card.files || []).length * 25) +
        ((await getChildCount(workspaceId, card._id)) * 15) +
        (card.parentId ? 5 : 0),
    }))
  );
  scored.sort((a, b) => b.score - a.score || compactName(a.card.name).localeCompare(compactName(b.card.name)));
  return scored[0]?.card || null;
};

const saveCard = async (card: CardDoc) => {
  if (shouldApply) await card.save();
};

const ensureCard = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  name: string,
  style: CardStyle,
  aliases: string[] = []
) => {
  const cleanName = compactName(name);
  const nextSlug = slugify(cleanName);
  let card = await findChildByAliases(workspaceId, parentId, [cleanName, ...aliases], true);

  if (!card) {
    card = new StudyCard({
      workspaceId,
      parentId,
      name: cleanName,
      slug: nextSlug,
      iconKey: style.iconKey,
      goalType: style.goalType,
      tone: style.tone,
      order: style.order,
      status: 'published',
      visibility: 'public',
      files: [],
    });
    stats.created += 1;
    note(`create ${cleanName}`);
    await saveCard(card);
    cacheCard(card);
    return card;
  }

  const wasArchived = card.status === 'archived';
  const changed =
    card.name !== cleanName ||
    card.slug !== nextSlug ||
    !sameId(card.parentId || null, parentId || null) ||
    card.iconKey !== style.iconKey ||
    card.goalType !== style.goalType ||
    card.tone !== style.tone ||
    card.order !== style.order ||
    card.status !== 'published' ||
    card.visibility !== 'public';

  if (changed) {
    removeCachedCard(card);
    card.set({
      parentId,
      name: cleanName,
      slug: nextSlug,
      iconKey: style.iconKey,
      goalType: style.goalType,
      tone: style.tone,
      order: style.order,
      status: 'published',
      visibility: 'public',
    });
    await saveCard(card);
    cacheCard(card);
    if (wasArchived) stats.restored += 1;
    else stats.styled += 1;
    note(`${wasArchived ? 'restore' : 'style'} ${cleanName}`);
  }

  return card;
};

const archiveCard = async (card: CardDoc) => {
  if (!isActive(card)) return;
  removeCachedCard(card);
  card.status = 'archived';
  card.visibility = 'private';
  await saveCard(card);
  cacheCard(card);
  stats.archived += 1;
  note(`archive ${compactName(card.name)}`);
};

const sanitizeFilePayload = (file: any) => {
  const payload = typeof file?.toObject === 'function' ? file.toObject() : { ...file };
  delete payload.__v;
  return payload;
};

const mergeFiles = (target: CardDoc, source: CardDoc) => {
  const existingKeys = new Set(
    (target.files || []).map((file: any) => `${file.url || ''}|${normalizeNameKey(file.name || '')}`)
  );
  let moved = 0;
  for (const file of source.files || []) {
    const payload = sanitizeFilePayload(file);
    if (!payload.url && !payload.name) continue;
    const key = `${payload.url || ''}|${normalizeNameKey(payload.name || '')}`;
    if (existingKeys.has(key)) continue;
    target.files.push(payload);
    existingKeys.add(key);
    moved += 1;
  }
  if (moved) {
    source.files = [];
    stats.filesMoved += moved;
  }
  return moved;
};

const isDescendantOf = async (workspaceId: Types.ObjectId, possibleChildId: Types.ObjectId | string, possibleParentId: Types.ObjectId | string) => {
  let currentId = objectIdKey(possibleChildId);
  const parentKey = objectIdKey(possibleParentId);
  const seen = new Set<string>();
  while (currentId) {
    if (currentId === parentKey) return true;
    if (seen.has(currentId)) return false;
    seen.add(currentId);
    const card = await StudyCard.findOne({ workspaceId, _id: currentId }).select('_id parentId').lean();
    currentId = objectIdKey((card as any)?.parentId || null);
  }
  return false;
};

const mergeCardInto = async (workspaceId: Types.ObjectId, target: CardDoc, source: CardDoc, style?: Partial<CardStyle>) => {
  if (sameId(target._id, source._id)) return target;

  const movedFiles = mergeFiles(target, source);
  if (style) {
    target.iconKey = style.iconKey || target.iconKey;
    target.tone = style.tone || target.tone;
    target.goalType = style.goalType || target.goalType;
    target.order = style.order ?? target.order;
  }
  target.status = 'published';
  target.visibility = 'public';
  await saveCard(target);
  if (movedFiles) await saveCard(source);

  const children = await getChildren(workspaceId, source._id);
  for (const child of children) {
    await moveOrMergeCard(workspaceId, child, target._id as Types.ObjectId, compactName(child.name), {
      goalType: child.goalType || 'resource_folder',
      iconKey: child.iconKey || 'folder',
      tone: child.tone || 'slate',
      order: child.order || 0,
    });
  }

  await archiveCard(source);
  stats.merged += 1;
  return target;
};

async function moveOrMergeCard(
  workspaceId: Types.ObjectId,
  source: CardDoc,
  targetParentId: Types.ObjectId | null,
  targetName: string,
  style: CardStyle
) {
  if (!source || (targetParentId && sameId(source._id, targetParentId))) {
    stats.skipped += 1;
    return source;
  }
  if (targetParentId && await isDescendantOf(workspaceId, targetParentId, source._id)) {
    stats.skipped += 1;
    note(`skip cycle-prone move ${compactName(source.name)} -> ${targetName}`);
    return source;
  }

  const cleanName = compactName(targetName);
  const nextSlug = slugify(cleanName);
  const duplicate = await findChildByAliases(workspaceId, targetParentId, [cleanName], true);

  if (duplicate && !sameId(duplicate._id, source._id)) {
    return mergeCardInto(workspaceId, duplicate, source, style);
  }

  const wasArchived = source.status === 'archived';
  const wasMoved = !sameId(source.parentId || null, targetParentId || null);
  const wasRenamed = source.name !== cleanName || source.slug !== nextSlug;
  const changed =
    wasArchived ||
    wasMoved ||
    wasRenamed ||
    source.iconKey !== style.iconKey ||
    source.tone !== style.tone ||
    source.goalType !== style.goalType ||
    source.order !== style.order ||
    source.visibility !== 'public';

  if (changed) {
    removeCachedCard(source);
    source.set({
      parentId: targetParentId,
      name: cleanName,
      slug: nextSlug,
      iconKey: style.iconKey,
      goalType: style.goalType,
      tone: style.tone,
      order: style.order,
      status: 'published',
      visibility: 'public',
    });
    await saveCard(source);
    cacheCard(source);
    if (wasArchived) stats.restored += 1;
    if (wasMoved) stats.moved += 1;
    else if (wasRenamed) stats.renamed += 1;
    else stats.styled += 1;
    note(`${wasMoved ? 'move' : wasRenamed ? 'rename' : 'style'} ${cleanName}`);
  }

  return source;
}

const ensurePrimaryCard = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  node: NodeSpec,
  depth: number,
  index: number
) => {
  const style = styleForName(node.name, depth, index, node);
  const direct = await findChildByAliases(workspaceId, parentId, [node.name, ...(node.aliases || [])], true);
  if (direct) return moveOrMergeCard(workspaceId, direct, parentId, node.name, style);

  const candidates = await findGlobalCandidates(workspaceId, [node.name, ...(node.aliases || [])]);
  const selected = await chooseBestCandidate(workspaceId, candidates, parentId);
  if (selected) return moveOrMergeCard(workspaceId, selected, parentId, node.name, style);

  return ensureCard(workspaceId, parentId, node.name, style, node.aliases || []);
};

const ensureTree = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  node: NodeSpec,
  depth: number,
  index: number
) => {
  const useGlobalAdoption = depth <= 1;
  const card = useGlobalAdoption
    ? await ensurePrimaryCard(workspaceId, parentId, node, depth, index)
    : await ensureCard(workspaceId, parentId, node.name, styleForName(node.name, depth, index, node), node.aliases || []);

  for (const [childIndex, child] of (node.children || []).entries()) {
    await ensureTree(workspaceId, card._id as Types.ObjectId, child, depth + 1, childIndex);
  }

  return card;
};

const ensurePath = async (workspaceId: Types.ObjectId, parts: string[]) => {
  let parentId: Types.ObjectId | null = null;
  let current: CardDoc | null = null;
  for (const [index, part] of parts.entries()) {
    current = await ensureCard(workspaceId, parentId, part, styleForName(part, index, index), []);
    parentId = current._id as Types.ObjectId;
  }
  if (!current) throw new Error(`Cannot ensure empty path: ${parts.join(' > ')}`);
  return current;
};

const findPath = async (workspaceId: Types.ObjectId, rawParts: string[]) => {
  const parts = rawParts.filter((part) => normalizeNameKey(part) !== 'catalog');
  let parentId: Types.ObjectId | null = null;
  let current: CardDoc | null = null;

  for (const part of parts) {
    current = await findChildByAliases(workspaceId, parentId, [part], false);
    if (!current) return null;
    parentId = current._id as Types.ObjectId;
  }

  return current;
};

const movePathToPath = async (workspaceId: Types.ObjectId, oldParts: string[], newParts: string[]) => {
  const source = await findPath(workspaceId, oldParts);
  if (!source) return false;

  const target = await ensurePath(workspaceId, newParts);
  if (sameId(source._id, target._id)) return false;

  const targetParentPath = newParts.slice(0, -1);
  const targetParent = targetParentPath.length ? await ensurePath(workspaceId, targetParentPath) : null;
  await moveOrMergeCard(
    workspaceId,
    source,
    targetParent ? targetParent._id as Types.ObjectId : null,
    newParts[newParts.length - 1],
    {
      goalType: target.goalType || styleForName(newParts[newParts.length - 1], newParts.length - 1, 0).goalType,
      iconKey: target.iconKey || styleForName(newParts[newParts.length - 1], newParts.length - 1, 0).iconKey,
      tone: target.tone || styleForName(newParts[newParts.length - 1], newParts.length - 1, 0).tone,
      order: target.order || styleForName(newParts[newParts.length - 1], newParts.length - 1, 0).order,
    }
  );
  return true;
};

const isUnderPath = async (workspaceId: Types.ObjectId, card: CardDoc, pathParts: string[]) => {
  const ancestor = await findPath(workspaceId, pathParts);
  if (!ancestor) return false;
  return sameId(card._id, ancestor._id) || isDescendantOf(workspaceId, card._id, ancestor._id);
};

const unwrapCard = async (workspaceId: Types.ObjectId, card: CardDoc) => {
  const targetParentId = card.parentId || null;
  const children = await getChildren(workspaceId, card._id);
  for (const child of children) {
    await moveOrMergeCard(workspaceId, child, targetParentId, compactName(child.name), {
      goalType: child.goalType || 'resource_folder',
      iconKey: child.iconKey || 'folder',
      tone: child.tone || 'slate',
      order: child.order || 0,
    });
    stats.childrenMoved += 1;
  }

  if ((card.files || []).length) {
    const commonResources = await ensurePath(workspaceId, ['Competitive Exams', 'UPSC CSE', 'Common Resources']);
    mergeFiles(commonResources, card);
    await saveCard(commonResources);
    await saveCard(card);
  }

  const remainingChildren = await getChildCount(workspaceId, card._id);
  if (remainingChildren === 0 && !(card.files || []).length) await archiveCard(card);
};

const cleanupRedundantFolders = async (workspaceId: Types.ObjectId) => {
  for (const handler of REDUNDANT_HANDLERS) {
    let candidates: CardDoc[] = [];
    const isUpscSubtreeCleanup = handler.names.some((name) =>
      ['Foundation', 'Study Material', 'Expected Questions'].includes(name)
    );

    if (isUpscSubtreeCleanup) {
      const upscRoot = await findPath(workspaceId, ['Competitive Exams', 'UPSC CSE']);
      candidates = upscRoot ? await findDescendantsByAliases(workspaceId, upscRoot._id, handler.names) : [];
    } else {
      candidates = await findGlobalCandidates(workspaceId, handler.names);
    }

    for (const candidate of candidates.filter(isActive)) {
      const nameKey = normalizeNameKey(candidate.name);

      if (nameKey === 'study material') {
        const underRailwayGroupD = await isUnderPath(workspaceId, candidate, ['Competitive Exams', 'Railway (RRB)', 'RRB Group D']);
        const underDefenceCisf = await isUnderPath(workspaceId, candidate, ['Competitive Exams', 'Defence', 'CISF AC LDCE']);
        if (underRailwayGroupD || underDefenceCisf) continue;
      }

      if (handler.target) {
        const target = await ensurePath(workspaceId, handler.target);
        if (sameId(candidate._id, target._id)) continue;
        const targetParent = handler.target.length > 1 ? await ensurePath(workspaceId, handler.target.slice(0, -1)) : null;
        await moveOrMergeCard(
          workspaceId,
          candidate,
          targetParent ? targetParent._id as Types.ObjectId : null,
          handler.target[handler.target.length - 1],
          {
            goalType: target.goalType || 'resource_folder',
            iconKey: target.iconKey || 'folder',
            tone: target.tone || 'slate',
            order: target.order || 0,
          }
        );
      } else if (handler.unwrap) {
        await unwrapCard(workspaceId, candidate);
      }
    }
  }

  const nestedCommon = await findGlobalCandidates(workspaceId, ['Common Resources']);
  for (const card of nestedCommon.filter(isActive)) {
    const parent = card.parentId ? await StudyCard.findById(card.parentId) : null;
    if (parent && normalizeNameKey(parent.name) === 'common resources') {
      await mergeCardInto(workspaceId, parent, card, {
        goalType: parent.goalType || 'resource_folder',
        iconKey: parent.iconKey || 'folder',
        tone: parent.tone || 'slate',
        order: parent.order || 0,
      });
    }
  }
};

const analyzeCurrentStructure = async (workspaceId: Types.ObjectId) => {
  const cards = await StudyCard.find({ ...activeFilter(workspaceId) }).select('_id parentId name files status visibility').lean();
  const cardById = new Map(cards.map((card: any) => [String(card._id), card]));
  const topLevel = cards.filter((card: any) => !card.parentId).length;
  const totalFiles = cards.reduce((sum: number, card: any) => sum + ((card.files || []).length || 0), 0);
  let orphanFolders = 0;
  let maxDepth = 0;
  let deepFolders = 0;

  for (const card of cards as any[]) {
    let depth = 1;
    let parentId = objectIdKey(card.parentId || null);
    const seen = new Set<string>();
    while (parentId) {
      if (seen.has(parentId)) break;
      seen.add(parentId);
      const parent = cardById.get(parentId);
      if (!parent) {
        orphanFolders += 1;
        break;
      }
      depth += 1;
      parentId = objectIdKey(parent.parentId || null);
    }
    maxDepth = Math.max(maxDepth, depth);
    if (depth > 5) deepFolders += 1;
  }

  const topNames = cards
    .filter((card: any) => !card.parentId)
    .map((card: any) => card.name)
    .sort((a: string, b: string) => a.localeCompare(b));

  console.log('Current Study Hub schema and catalog summary:');
  console.log('- Model: StudyCard folders in Workspace "study-hub"; parent-child nesting uses parentId.');
  console.log('- Content attachment: files are embedded on StudyCard.files; Resource documents are workspace-linked, not folder-linked.');
  console.log('- Admin routes: server/src/routes/study.ts exposes /admin/cards CRUD and file move/copy/upload endpoints.');
  console.log(`- Active folders: ${cards.length}; top-level folders: ${topLevel}; embedded files: ${totalFiles}.`);
  console.log(`- Max active depth: ${maxDepth}; folders deeper than 5 levels: ${deepFolders}; orphan folder references: ${orphanFolders}.`);
  console.log(`- Top-level shelves: ${topNames.join(', ') || 'none'}.`);
};

const processPremiumStructure = async (workspaceId: Types.ObjectId) => {
  for (const [categoryIndex, category] of PREMIUM_STRUCTURE.entries()) {
    logStep(`processing category: ${category.name}`);
    const categoryCard = await ensureTree(workspaceId, null, category, 0, categoryIndex);
    for (const [examIndex, exam] of (category.children || []).entries()) {
      logStep(`processing exam/family: ${category.name} > ${exam.name}`);
      await ensureTree(workspaceId, categoryCard._id as Types.ObjectId, exam, 1, examIndex);
    }
  }
};

const migrateKnownContent = async (workspaceId: Types.ObjectId) => {
  let migrated = 0;
  for (const [oldPath, newPath] of CONTENT_MIGRATION_MAP) {
    if (await movePathToPath(workspaceId, oldPath, newPath)) migrated += 1;
  }
  logStep(`known legacy path migrations ${shouldApply ? 'applied' : 'planned'}: ${migrated}`);
};

const collectPathNames = (node: NodeSpec, prefix: string[] = []): string[][] => {
  const current = [...prefix, node.name];
  return [current, ...(node.children || []).flatMap((child) => collectPathNames(child, current))];
};

const verifyStructure = async (workspaceId: Types.ObjectId) => {
  const requiredPaths = PREMIUM_STRUCTURE.flatMap((node) => collectPathNames(node));
  let missing = 0;
  for (const pathParts of requiredPaths) {
    const exists = await findPath(workspaceId, pathParts);
    if (!exists) {
      missing += 1;
      if (missing <= 20) console.log(`Missing required path: ${pathParts.join(' > ')}`);
    }
  }

  const prelimPyq = await findPath(workspaceId, ['Competitive Exams', 'UPSC CSE', 'Prelims', 'Previous Year Papers']);
  const prelimYears = prelimPyq ? await getChildren(workspaceId, prelimPyq._id) : [];
  const prelimYearNames = new Set(prelimYears.map((card: CardDoc) => card.name));
  const missingPrelimYears = years(2025, 2013).map((item) => item.name).filter((year) => !prelimYearNames.has(year));

  const legacyUpscCse = await findPath(workspaceId, ['Competitive Exams', 'UPSC', 'UPSC CSE']);
  const activeUpscWrappers = await StudyCard.countDocuments({
    ...activeFilter(workspaceId),
    name: /^UPSC$/i,
  });

  const cards = await StudyCard.find({ ...activeFilter(workspaceId) }).select('_id parentId name files').lean();
  const cardIds = new Set(cards.map((card: any) => String(card._id)));
  const orphanCount = cards.filter((card: any) => card.parentId && !cardIds.has(String(card.parentId))).length;
  const totalFiles = cards.reduce((sum: number, card: any) => sum + ((card.files || []).length || 0), 0);

  console.log('Verification summary:');
  console.log(`- Required premium paths missing: ${missing}.`);
  console.log(`- UPSC Prelims PYQ year folders missing from 2013-2025: ${missingPrelimYears.length}${missingPrelimYears.length ? ` (${missingPrelimYears.join(', ')})` : ''}.`);
  console.log(`- Legacy Competitive Exams > UPSC > UPSC CSE path active: ${legacyUpscCse ? 'yes' : 'no'}. Active UPSC wrapper folders: ${activeUpscWrappers}.`);
  console.log(`- Active folders after check: ${cards.length}; embedded files preserved in active tree: ${totalFiles}; orphan references: ${orphanCount}.`);
};

const printStats = () => {
  console.log(
    [
      `Catalog restructure ${shouldApply ? 'applied' : 'planned'}${verifyOnly ? ' (verify only)' : ''}.`,
      `Created ${stats.created}, restored ${stats.restored}, styled ${stats.styled}, moved ${stats.moved}, renamed ${stats.renamed}, merged ${stats.merged}, archived ${stats.archived}.`,
      `Files moved ${stats.filesMoved}, children moved ${stats.childrenMoved}, skipped ${stats.skipped}.`,
    ].join('\n')
  );

  if (!shouldApply) {
    console.log('Dry run only. Re-run with --apply to write the premium catalog structure.');
    if (plannedLogs.length) {
      console.log('Sample planned changes:');
      plannedLogs.forEach((line) => console.log(`- ${line}`));
      if (plannedLogs.length === MAX_PLANNED_LOGS) console.log('- ...');
    }
  }
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI or DATABASE_URL is not defined.');
  if (!shouldApply) logStep('dry run mode; pass --apply to write changes');

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean<{ _id: Types.ObjectId }>();
  if (!workspace) throw new Error('Study Hub workspace not found.');

  const workspaceId = workspace._id as Types.ObjectId;
  await primeCardCache(workspaceId);
  await analyzeCurrentStructure(workspaceId);

  if (verifyOnly) {
    await verifyStructure(workspaceId);
    printStats();
    return;
  }

  await processPremiumStructure(workspaceId);
  await migrateKnownContent(workspaceId);
  await cleanupRedundantFolders(workspaceId);
  await verifyStructure(workspaceId);
  printStats();
};

run()
  .catch((error) => {
    console.error('Study Hub catalog restructure failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
