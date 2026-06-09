import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import mongoose, { Types } from 'mongoose';
import StudyCard, {
  type StudyCardGoalType,
  type StudyCardStatus,
  type StudyCardTone,
  type StudyCardVisibility,
} from '../models/StudyCard';
import Workspace from '../models/Workspace';

const SCRIPT_DIR = path.resolve(__dirname);
const ROOT_WORKSPACE_SLUG = 'study-hub';
const NCERT_INPUT_PATH = path.join(SCRIPT_DIR, 'ncert-official.generated.json');
const OFFICIAL_INPUT_PATH = path.join(SCRIPT_DIR, 'official-materials.generated.json');
const MONGO_URI = process.env.MONGO_URI;
const shouldApply = process.argv.includes('--apply');
const verifyOnly = process.argv.includes('--verify');
const groupArg = process.argv.find((arg) => arg.startsWith('--group='));
const requestedGroup = groupArg ? groupArg.split('=').slice(1).join('=').trim().toLowerCase() : '';

type StudyLanguage = 'hinglish' | 'english' | 'hindi' | 'mixed';
type SourceType = 'official' | 'ncert' | 'standard_book' | 'faculty' | 'creator' | 'community' | 'platform';

type OfficialMaterialEntry = {
  title: string;
  url: string;
  targetPath: string[] | string;
  sourceName: string;
  sourceUrl?: string;
  sourceType?: SourceType;
  resourceType?: string;
  status?: StudyCardStatus;
  visibility?: StudyCardVisibility;
  language?: StudyLanguage;
  year?: number;
  stage?: string;
  paper?: string;
  subject?: string;
  topic?: string;
  sizeBytes?: number;
  mimeType?: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  thumbnailUrl?: string;
  mirrorAllowed?: boolean;
  licenseUrl?: string;
  rightsNote?: string;
  notes?: string;
};

type CanonicalEntry = OfficialMaterialEntry & {
  targetPath: string[];
  group: 'ncert-books' | 'cbse-academic' | 'upsc-pyq';
};

type CardStyle = {
  iconKey: string;
  tone: StudyCardTone;
  goalType: StudyCardGoalType;
  order: number;
};

type Summary = {
  folders: number;
  files: number;
  emptyLeaves: number;
};

const stats = {
  entriesPrepared: 0,
  ncertBooks: 0,
  cbseAcademic: 0,
  upscPyqs: 0,
  cardsCreated: 0,
  cardsUpdated: 0,
  filesAttached: 0,
  filesExisting: 0,
  filesSkipped: 0,
  filesSorted: 0,
};

const normalizeKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const slugify = (value: string, fallback = 'item') => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '');
  return slug || fallback;
};

const normalizePath = (targetPath: string[] | string) => {
  const parts = Array.isArray(targetPath) ? targetPath : targetPath.split('/');
  return parts
    .map((part) => String(part).trim().replace(/\s+/g, ' '))
    .filter(Boolean);
};

const titleCase = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => {
      if (/^(AI|IT|IP|CSAT|GS|EVS|NCERT|CBSE|UPSC)$/i.test(word)) return word.toUpperCase();
      if (/^(I|II|III|IV|V|VI)$/i.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

const subjectAliases = new Map<string, string>([
  ['maths', 'Mathematics'],
  ['math', 'Mathematics'],
  ['computer application', 'Computer Applications'],
  ['social studies', 'Social Science'],
  ['sst', 'Social Science'],
  ['oriya', 'Odia'],
  ['kashimiri', 'Kashmiri'],
  ['gs paper iv', 'GS Paper IV Ethics'],
  ['general studies paper iv', 'GS Paper IV Ethics'],
]);

const cleanSubjectName = (value = 'General') => {
  const cleaned = value
    .replace(/\s*\(?compulsory\)?\s*/gi, ' ')
    .replace(/\s+paper\s+(?:i|ii|1|2)\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\)+$/g, '')
    .trim();
  const key = normalizeKey(cleaned);
  return subjectAliases.get(key) || titleCase(cleaned || value);
};

const parseClassNumber = (value = '') => {
  const match = value.match(/^Class\s+([1-9]|1[0-2])$/i);
  return match ? Number(match[1]) : 0;
};

const getClassPart = (parts: string[]) => parts.find((part) => parseClassNumber(part));

const getCbseClassShelfPath = (parts: string[], shelfName: string) => {
  const classPart = getClassPart(parts);
  return classPart ? ['School Boards', 'CBSE', classPart, shelfName] : null;
};

const isResourceShelfName = (value = '') => {
  const key = normalizeKey(value);
  return [
    'answer keys',
    'board pattern',
    'current affairs',
    'essay',
    'mains',
    'ncert books',
    'ncert foundation',
    'prelims',
    'previous year papers',
    'sample papers',
    'strategy',
    'study material',
    'syllabus',
  ].includes(key);
};

const shelfOrder = new Map<string, number>([
  ['board pattern', 10],
  ['syllabus', 20],
  ['ncert books', 30],
  ['ncert foundation', 35],
  ['ncert solutions', 40],
  ['study material', 50],
  ['revision notes', 60],
  ['previous year papers', 70],
  ['sample papers', 80],
  ['practice questions', 90],
  ['important questions', 100],
  ['answer keys', 110],
  ['official cbse', 120],
]);

const upscOrder = new Map<string, number>([
  ['syllabus', 10],
  ['prelims', 20],
  ['mains', 30],
  ['ncert foundation', 40],
  ['current affairs', 50],
  ['strategy', 60],
  ['gs paper i', 10],
  ['csat paper ii', 20],
  ['essay', 10],
  ['gs paper ii', 30],
  ['gs paper iii', 40],
  ['gs paper iv ethics', 50],
  ['optional subject', 60],
  ['optional literature', 70],
  ['compulsory language', 80],
]);

const styleForPath = (parts: string[], index: number): CardStyle => {
  const name = parts[index];
  const key = normalizeKey(name);
  const parentKey = normalizeKey(parts[index - 1] || '');
  const classNumber = parseClassNumber(name);

  if (index === 0) {
    return {
      iconKey: key.includes('school') ? 'school-board' : 'exam',
      tone: key.includes('school') ? 'emerald' : 'blue',
      goalType: 'exam_category',
      order: key.includes('competitive') ? 10 : 30,
    };
  }

  if (key === 'cbse') return { iconKey: 'cbse', tone: 'emerald', goalType: 'board', order: 10 };
  if (key === 'upsc cse') return { iconKey: 'upsc-cse', tone: 'blue', goalType: 'exam', order: 10 };
  if (classNumber) return { iconKey: 'class', tone: 'emerald', goalType: 'class', order: 100 + classNumber * 10 };

  if (key.includes('ncert') || key.includes('book')) {
    return { iconKey: 'book', tone: 'emerald', goalType: 'resource_folder', order: shelfOrder.get(key) || 30 };
  }
  if (key.includes('sample')) return { iconKey: 'sample-paper', tone: 'violet', goalType: 'resource_folder', order: 80 };
  if (key.includes('answer') || key.includes('marking')) return { iconKey: 'answer-key', tone: 'slate', goalType: 'resource_folder', order: 110 };
  if (key.includes('paper') || key.includes('pyq') || key === 'prelims') {
    return { iconKey: 'pyq', tone: key === 'prelims' ? 'violet' : 'blue', goalType: 'resource_folder', order: upscOrder.get(key) || 70 };
  }
  if (key === 'mains') return { iconKey: 'paper', tone: 'blue', goalType: 'resource_folder', order: 30 };
  if (key === 'essay') return { iconKey: 'notes', tone: 'rose', goalType: 'resource_folder', order: 10 };
  if (key.includes('optional')) return { iconKey: 'book', tone: 'indigo', goalType: 'resource_folder', order: upscOrder.get(key) || 60 };
  if (key.includes('language')) return { iconKey: 'language', tone: 'rose', goalType: 'resource_folder', order: 80 };
  if (key.includes('syllabus')) return { iconKey: 'syllabus', tone: 'amber', goalType: 'resource_folder', order: shelfOrder.get(key) || 20 };
  if (key.includes('material') || key.includes('current affairs') || key.includes('strategy')) {
    return { iconKey: 'material', tone: 'blue', goalType: 'resource_folder', order: upscOrder.get(key) || shelfOrder.get(key) || 50 };
  }

  const isCbseSubject = parseClassNumber(parts[index - 1] || '') > 0 || parentKey === 'ncert books' || parentKey === 'sample papers' || parentKey === 'answer keys';
  if (isCbseSubject) return { iconKey: 'subject', tone: 'slate', goalType: 'subject', order: 220 + index * 10 };
  if (!isResourceShelfName(name)) return { iconKey: 'subject', tone: 'slate', goalType: 'subject', order: 220 + index * 10 };

  return { iconKey: 'folder', tone: 'blue', goalType: 'resource_folder', order: 500 + index * 10 };
};

const loadJsonArray = async <T>(inputPath: string): Promise<T[]> => {
  const raw = await fs.readFile(inputPath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`${inputPath} must contain a JSON array.`);
  return parsed as T[];
};

const getRootWorkspace = async () => Workspace.findOneAndUpdate(
  { slug: ROOT_WORKSPACE_SLUG },
  {
    $set: {
      name: 'Study Hub',
      shortName: 'Study Hub',
      slug: ROOT_WORKSPACE_SLUG,
      type: 'personal',
      category: 'platform',
      visibility: 'public',
      status: 'active',
      readiness: 100,
      priority: 1000,
      description: 'Premium organized workspace for exams, school boards, PYQs, official books, and study material.',
      template: {
        phases: [],
        facets: [],
        resourceTypes: ['book', 'pyq', 'sample_paper', 'answer_key', 'syllabus', 'material'],
      },
    },
  },
  { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
);

const getWorkspaceForMode = async () => {
  if (shouldApply) return getRootWorkspace();
  return Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
};

const getCanonicalCbseAcademicEntry = (entry: OfficialMaterialEntry): CanonicalEntry | null => {
  if (normalizeKey(entry.sourceName) !== 'cbse academic') return null;
  const parts = normalizePath(entry.targetPath);
  if (normalizeKey(parts[0]) !== 'school boards' || normalizeKey(parts[1]) !== 'cbse') return null;

  const rawShelfKey = normalizeKey(parts[3]);
  const shelfName = rawShelfKey === 'marking schemes' || rawShelfKey === 'marking scheme' ? 'Answer Keys' : parts[3];
  const canonicalParts = getCbseClassShelfPath(parts, shelfName);
  if (!canonicalParts) return null;

  return {
    ...entry,
    targetPath: canonicalParts,
    group: 'cbse-academic',
    sourceType: 'official',
    resourceType: normalizeKey(canonicalParts[3]) === 'answer keys' ? 'answer_key' : entry.resourceType || 'sample_paper',
    status: 'published',
    visibility: 'public',
  };
};

const getCanonicalNcertEntry = (entry: OfficialMaterialEntry): CanonicalEntry | null => {
  if (normalizeKey(entry.sourceName) !== 'ncert') return null;
  const parts = normalizePath(entry.targetPath);
  if (normalizeKey(parts[0]) !== 'school boards' || normalizeKey(parts[1]) !== 'cbse') return null;
  const canonicalParts = getCbseClassShelfPath(parts, 'NCERT Books');
  if (!canonicalParts) return null;

  return {
    ...entry,
    targetPath: canonicalParts,
    group: 'ncert-books',
    sourceType: 'ncert',
    resourceType: 'book',
    status: 'published',
    visibility: 'public',
  };
};

const isPaperTwoText = (value = '') => {
  const key = normalizeKey(value);
  return key.includes('csat') || /\bpaper\s*(ii|2)\b/.test(key);
};

const detectGsPaper = (value = '') => {
  const key = normalizeKey(value);
  if (/\b(gs|general studies)\s*paper\s*(iv|4)\b/.test(key)) return 'GS Paper IV Ethics';
  if (/\b(gs|general studies)\s*paper\s*(iii|3)\b/.test(key)) return 'GS Paper III';
  if (/\b(gs|general studies)\s*paper\s*(ii|2)\b/.test(key)) return 'GS Paper II';
  if (/\b(gs|general studies)\s*paper\s*(i|1)\b/.test(key)) return 'GS Paper I';
  return '';
};

const getCanonicalUpscPath = (entry: OfficialMaterialEntry): string[] | null => {
  if (normalizeKey(entry.sourceName) !== 'upsc') return null;
  const originalParts = normalizePath(entry.targetPath);
  const cseIndex = originalParts.findIndex((part) => normalizeKey(part) === 'upsc cse');
  if (cseIndex < 0 || normalizeKey(entry.resourceType || '') !== 'pyq') return null;

  const afterCse = originalParts.slice(cseIndex + 1);
  const combined = [
    entry.title,
    entry.stage,
    entry.paper,
    entry.subject,
    ...afterCse,
  ].filter(Boolean).join(' ');
  const combinedKey = normalizeKey(combined);

  if (combinedKey.includes('prelims')) {
    const paper = isPaperTwoText(combined) ? 'CSAT Paper II' : 'GS Paper I';
    return ['Competitive Exams', 'UPSC CSE', 'Prelims', paper];
  }

  if (!combinedKey.includes('mains')) return null;

  const pathKey = normalizeKey(afterCse.join(' '));
  if (pathKey.includes('compulsory language')) {
    const language = cleanSubjectName(afterCse[afterCse.length - 1] || entry.subject || 'Language');
    return ['Competitive Exams', 'UPSC CSE', 'Mains', 'Compulsory Language', language];
  }

  if (pathKey.includes('optional subject')) {
    const subject = cleanSubjectName(afterCse[afterCse.length - 1] || entry.subject || 'Optional Subject');
    const bucket = normalizeKey(subject).includes('literature') ? 'Optional Literature' : 'Optional Subject';
    return ['Competitive Exams', 'UPSC CSE', 'Mains', bucket, subject];
  }

  if (combinedKey.includes('essay')) return ['Competitive Exams', 'UPSC CSE', 'Mains', 'Essay'];

  const gsPaper = detectGsPaper(combined);
  if (gsPaper) return ['Competitive Exams', 'UPSC CSE', 'Mains', gsPaper];

  return ['Competitive Exams', 'UPSC CSE', 'Mains', cleanSubjectName(entry.subject || entry.paper || 'Other Papers')];
};

const getCanonicalUpscEntry = (entry: OfficialMaterialEntry): CanonicalEntry | null => {
  const targetPath = getCanonicalUpscPath(entry);
  if (!targetPath) return null;

  return {
    ...entry,
    targetPath,
    group: 'upsc-pyq',
    sourceType: 'official',
    resourceType: 'pyq',
    status: 'published',
    visibility: 'public',
  };
};

const dedupeEntries = (entries: CanonicalEntry[]) => {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.url.trim().toLowerCase()}::${entry.targetPath.map(normalizeKey).join('/')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const matchesRequestedGroup = (entry: CanonicalEntry) => {
  if (!requestedGroup || requestedGroup === 'all') return true;
  if (requestedGroup === 'cbse') return entry.group === 'ncert-books' || entry.group === 'cbse-academic';
  if (requestedGroup === 'ncert') return entry.group === 'ncert-books';
  if (requestedGroup === 'upsc') return entry.group === 'upsc-pyq';
  return entry.group === requestedGroup;
};

const updatePreparedStats = (entries: CanonicalEntry[]) => {
  stats.entriesPrepared = entries.length;
  stats.ncertBooks = entries.filter((entry) => entry.group === 'ncert-books').length;
  stats.cbseAcademic = entries.filter((entry) => entry.group === 'cbse-academic').length;
  stats.upscPyqs = entries.filter((entry) => entry.group === 'upsc-pyq').length;
};

const buildCanonicalEntries = async () => {
  const ncertEntries = await loadJsonArray<OfficialMaterialEntry>(NCERT_INPUT_PATH);
  const officialEntries = await loadJsonArray<OfficialMaterialEntry>(OFFICIAL_INPUT_PATH);
  return dedupeEntries([
    ...ncertEntries.map(getCanonicalNcertEntry).filter((entry): entry is CanonicalEntry => Boolean(entry)),
    ...officialEntries.map(getCanonicalCbseAcademicEntry).filter((entry): entry is CanonicalEntry => Boolean(entry)),
    ...officialEntries.map(getCanonicalUpscEntry).filter((entry): entry is CanonicalEntry => Boolean(entry)),
  ]);
};

const updateExistingCardStyle = async (card: any, style: CardStyle) => {
  const updates: Record<string, unknown> = {};
  if (card.iconKey !== style.iconKey) updates.iconKey = style.iconKey;
  if (card.tone !== style.tone) updates.tone = style.tone;
  if (card.goalType !== style.goalType) updates.goalType = style.goalType;
  if (card.order !== style.order) updates.order = style.order;
  if (card.status !== 'published') updates.status = 'published';
  if (card.visibility !== 'public') updates.visibility = 'public';

  if (!Object.keys(updates).length) return card;
  if (!shouldApply) {
    stats.cardsUpdated += 1;
    return card;
  }

  const updated = await StudyCard.findByIdAndUpdate(card._id, { $set: updates }, { new: true, runValidators: true });
  stats.cardsUpdated += 1;
  return updated || card;
};

const upsertPath = async (workspaceId: Types.ObjectId, parts: string[]) => {
  let parentId: Types.ObjectId | null = null;
  let card: any = null;

  for (let index = 0; index < parts.length; index += 1) {
    const name = parts[index];
    const slug = slugify(name);
    const style = styleForPath(parts, index);
    const existing = await StudyCard.findOne({ workspaceId, parentId, slug });

    if (existing) {
      card = await updateExistingCardStyle(existing, style);
      parentId = card._id as Types.ObjectId;
      continue;
    }

    if (!shouldApply) {
      stats.cardsCreated += 1;
      parentId = new Types.ObjectId();
      card = { _id: parentId, name, parentId, slug };
      continue;
    }

    card = await StudyCard.create({
      workspaceId,
      parentId,
      name,
      slug,
      iconKey: style.iconKey,
      tone: style.tone,
      goalType: style.goalType,
      order: style.order,
      status: 'published',
      visibility: 'public',
      files: [],
    });
    stats.cardsCreated += 1;
    parentId = card._id as Types.ObjectId;
  }

  return card;
};

const getFilePayload = (entry: CanonicalEntry) => {
  const shouldUseMirror = Boolean(entry.cloudinaryUrl && entry.mirrorAllowed);
  const url = shouldUseMirror ? entry.cloudinaryUrl as string : entry.url.trim();
  const notes = [
    entry.notes,
    entry.rightsNote,
    entry.licenseUrl ? `License/source terms: ${entry.licenseUrl}` : '',
    entry.sourceUrl ? `Official source: ${entry.sourceUrl}` : '',
  ].filter(Boolean).join(' | ');

  return {
    name: entry.title.trim(),
    url,
    thumbnailUrl: entry.thumbnailUrl,
    sizeBytes: entry.sizeBytes,
    mimeType: entry.mimeType || 'application/pdf',
    publicId: shouldUseMirror ? entry.cloudinaryPublicId : undefined,
    resourceType: entry.resourceType || 'material',
    status: entry.status || 'published',
    visibility: entry.visibility || 'public',
    year: entry.year,
    stage: entry.stage,
    paper: entry.paper,
    subject: entry.subject,
    topic: entry.topic,
    language: entry.language || 'english',
    sourceType: entry.sourceType || 'official',
    sourceName: entry.sourceName,
    notes,
    uploadedAt: new Date(),
  };
};

const addFile = async (cardId: Types.ObjectId, entry: CanonicalEntry, touchedCardIds: Set<string>) => {
  const file = getFilePayload(entry);
  if (!file.name || !file.url) {
    stats.filesSkipped += 1;
    return;
  }

  const existing = await StudyCard.exists({ _id: cardId, 'files.url': file.url });
  if (existing) {
    stats.filesExisting += 1;
    touchedCardIds.add(cardId.toString());
    return;
  }

  if (!shouldApply) {
    stats.filesAttached += 1;
    touchedCardIds.add(cardId.toString());
    return;
  }

  const result = await StudyCard.updateOne(
    { _id: cardId, 'files.url': { $ne: file.url } },
    { $push: { files: file } }
  );

  if (result.modifiedCount > 0) {
    stats.filesAttached += 1;
    touchedCardIds.add(cardId.toString());
  } else {
    stats.filesExisting += 1;
  }
};

const fileTypeRank = new Map<string, number>([
  ['book', 10],
  ['syllabus', 20],
  ['pyq', 30],
  ['sample_paper', 40],
  ['answer_key', 50],
  ['material', 60],
]);

const fileOrder = (file: any) => [
  String(fileTypeRank.get(String(file.resourceType || '').toLowerCase()) ?? 90).padStart(3, '0'),
  String(file.year ? 3000 - Number(file.year) : 9999).padStart(4, '0'),
  normalizeKey(file.subject || ''),
  normalizeKey(file.paper || ''),
  normalizeKey(file.name || ''),
].join('|');

const sortTouchedFiles = async (cardIds: Set<string>) => {
  if (!shouldApply || !cardIds.size) return;

  for (const cardId of cardIds) {
    const card = await StudyCard.findById(cardId) as any;
    if (!card) continue;

    const before = (card.files || []).map((file: any) => `${file.url}|${file.name}`).join('\n');
    const active = (card.files || []).filter((file: any) => (file.status || 'published') !== 'archived');
    const archived = (card.files || []).filter((file: any) => (file.status || 'published') === 'archived');
    const seen = new Set<string>();
    const deduped = active.filter((file: any) => {
      const key = String(file.url || '').trim().toLowerCase() || `${normalizeKey(file.name)}|${file.year || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    card.files = [...deduped.sort((a: any, b: any) => fileOrder(a).localeCompare(fileOrder(b))), ...archived];
    const after = card.files.map((file: any) => `${file.url}|${file.name}`).join('\n');
    if (before !== after) {
      await card.save();
      stats.filesSorted += 1;
    }
  }
};

const buildChildrenMap = (cards: any[]) => {
  const childrenByParent = new Map<string, any[]>();
  for (const card of cards) {
    const parentKey = card.parentId?.toString?.() || 'root';
    const siblings = childrenByParent.get(parentKey) || [];
    siblings.push(card);
    childrenByParent.set(parentKey, siblings);
  }
  return childrenByParent;
};

const findPath = (childrenByParent: Map<string, any[]>, parts: string[]) => {
  let parentKey = 'root';
  let current: any = null;
  for (const part of parts) {
    current = (childrenByParent.get(parentKey) || []).find((child) => normalizeKey(child.name) === normalizeKey(part)) || null;
    if (!current) return null;
    parentKey = current._id.toString();
  }
  return current;
};

const collectSubtree = (childrenByParent: Map<string, any[]>, root: any) => {
  const result: any[] = [];
  const queue = [root];
  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    result.push(current);
    queue.push(...(childrenByParent.get(current._id.toString()) || []));
  }
  return result;
};

const summarizeRoot = (childrenByParent: Map<string, any[]>, root: any): Summary => {
  const subtree = collectSubtree(childrenByParent, root);
  return {
    folders: subtree.length,
    files: subtree.reduce((sum, card) => sum + (card.files || []).filter((file: any) => (file.status || 'published') !== 'archived').length, 0),
    emptyLeaves: subtree.filter((card) => !(card.files || []).length && !(childrenByParent.get(card._id.toString()) || []).length).length,
  };
};

const printSummary = async (workspaceId: Types.ObjectId) => {
  const cards = await StudyCard.find({ workspaceId, status: { $ne: 'archived' } })
    .select('_id parentId name files order')
    .lean();
  const childrenByParent = buildChildrenMap(cards);
  const targets = [
    { label: 'CBSE', parts: ['School Boards', 'CBSE'] },
    { label: 'UPSC CSE', parts: ['Competitive Exams', 'UPSC CSE'] },
    { label: 'CBSE Class 10 NCERT Books', parts: ['School Boards', 'CBSE', 'Class 10', 'NCERT Books'] },
    { label: 'CBSE Class 12 NCERT Books', parts: ['School Boards', 'CBSE', 'Class 12', 'NCERT Books'] },
    { label: 'UPSC Prelims GS Paper I', parts: ['Competitive Exams', 'UPSC CSE', 'Prelims', 'GS Paper I'] },
    { label: 'UPSC Prelims CSAT Paper II', parts: ['Competitive Exams', 'UPSC CSE', 'Prelims', 'CSAT Paper II'] },
    { label: 'UPSC Mains GS Paper I', parts: ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper I'] },
  ];

  for (const target of targets) {
    const root = findPath(childrenByParent, target.parts);
    if (!root) {
      console.log(`${target.label}: missing`);
      continue;
    }
    const summary = summarizeRoot(childrenByParent, root);
    console.log(`${target.label}: ${summary.folders} folders, ${summary.files} files, ${summary.emptyLeaves} empty leaves`);
  }
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');
  const allEntries = await buildCanonicalEntries();
  const entries = allEntries.filter(matchesRequestedGroup);
  updatePreparedStats(entries);

  console.log(`${verifyOnly ? 'Verifying' : shouldApply ? 'Applying' : 'Dry run'} CBSE + UPSC premium library seed.`);
  console.log(`Prepared entries: ${stats.entriesPrepared} (${stats.ncertBooks} NCERT books, ${stats.cbseAcademic} CBSE academic, ${stats.upscPyqs} UPSC PYQ).`);
  if (requestedGroup) console.log(`Filtered group: ${requestedGroup}.`);

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await getWorkspaceForMode();
  if (!workspace) {
    throw new Error(`Workspace ${ROOT_WORKSPACE_SLUG} not found. Run with --apply only when you want to create it.`);
  }
  const workspaceId = workspace._id as Types.ObjectId;

  if (verifyOnly) {
    await printSummary(workspaceId);
    return;
  }

  const touchedCardIds = new Set<string>();
  for (const entry of entries) {
    const card = await upsertPath(workspaceId, entry.targetPath);
    if (!card?._id) {
      stats.filesSkipped += 1;
      continue;
    }
    await addFile(card._id as Types.ObjectId, entry, touchedCardIds);
  }

  await sortTouchedFiles(touchedCardIds);

  console.log(`Cards created: ${stats.cardsCreated}. Cards updated: ${stats.cardsUpdated}.`);
  console.log(`Files attached: ${stats.filesAttached}. Existing: ${stats.filesExisting}. Skipped: ${stats.filesSkipped}. Sorted cards: ${stats.filesSorted}.`);
  await printSummary(workspaceId);
};

run()
  .catch((error) => {
    console.error('CBSE + UPSC premium library seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
