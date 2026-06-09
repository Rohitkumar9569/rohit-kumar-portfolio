import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard, { type StudyCardGoalType, type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const MONGO_URI = process.env.MONGO_URI;
const ROOT_WORKSPACE_SLUG = 'study-hub';
const shouldApply = process.argv.includes('--apply');

type CardDoc = any;

type ShelfSpec = {
  name: string;
  iconKey: string;
  tone: StudyCardTone;
  order: number;
};

const stats = {
  created: 0,
  moved: 0,
  merged: 0,
  archived: 0,
  skipped: 0,
};

const resourceWrappers: Array<{ resourceName: string; aliases: string[]; iconKey: string; tone: StudyCardTone }> = [
  { resourceName: 'Syllabus', aliases: ['Syllabus', 'Official Syllabus', 'Exam Pattern'], iconKey: 'syllabus', tone: 'cyan' },
  { resourceName: 'Books', aliases: ['Books', 'Book', 'Textbooks', 'Textbook', 'NCERT Books'], iconKey: 'book', tone: 'emerald' },
  { resourceName: 'NCERT Solutions', aliases: ['NCERT Solutions', 'Solutions'], iconKey: 'book-solution', tone: 'emerald' },
  { resourceName: 'Study Material', aliases: ['Study Material', 'Notes', 'Revision Material', 'Available Official Material'], iconKey: 'material', tone: 'blue' },
  { resourceName: 'Revision Notes', aliases: ['Revision Notes', 'Short Notes', 'Class Notes'], iconKey: 'notes', tone: 'blue' },
  { resourceName: 'Previous Year Papers', aliases: ['Previous Year Papers', 'Previous Year Paper', 'Question Papers', 'PYQ', 'PYQs'], iconKey: 'pyq', tone: 'violet' },
  { resourceName: 'Sample Papers', aliases: ['Sample Papers', 'Sample Paper'], iconKey: 'sample-paper', tone: 'violet' },
  { resourceName: 'Practice Questions', aliases: ['Practice', 'Practice Questions', 'DPP', 'Worksheets'], iconKey: 'practice', tone: 'amber' },
  { resourceName: 'Mock Tests', aliases: ['Mock Tests', 'Mock Test', 'Practice Tests'], iconKey: 'mock', tone: 'indigo' },
  { resourceName: 'Answer Keys', aliases: ['Answer Keys', 'Answer Key', 'Marking Schemes'], iconKey: 'answer-key', tone: 'slate' },
  { resourceName: 'Formula Sheets', aliases: ['Formula', 'Formula Sheets'], iconKey: 'formula', tone: 'amber' },
  { resourceName: 'Updates', aliases: ['Updates', 'Notifications', 'Current Affairs'], iconKey: 'updates', tone: 'amber' },
  { resourceName: 'Strategy', aliases: ['Strategy', 'Booklist', 'Roadmap'], iconKey: 'strategy', tone: 'rose' },
  { resourceName: 'Interview', aliases: ['Interview', 'Interview Prep'], iconKey: 'interview', tone: 'rose' },
];

const wrapperByKey = new Map<string, typeof resourceWrappers[number]>();

const normalizeKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

for (const wrapper of resourceWrappers) {
  for (const alias of wrapper.aliases) wrapperByKey.set(normalizeKey(alias), wrapper);
}

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

const getOrder = (name = '') => {
  const key = normalizeKey(name);
  const ordered = [
    'overview',
    'start here',
    'syllabus',
    'books',
    'ncert books',
    'ncert solutions',
    'study material',
    'revision notes',
    'previous year papers',
    'sample papers',
    'practice questions',
    'mock tests',
    'answer keys',
    'formula sheets',
    'updates',
    'strategy',
    'interview',
    'common resources',
  ];
  const index = ordered.indexOf(key);
  return index >= 0 ? (index + 1) * 10 : 500;
};

const subjectNames = new Set(
  [
    'physics',
    'chemistry',
    'biology',
    'botany',
    'zoology',
    'mathematics',
    'maths',
    'science',
    'social science',
    'history',
    'geography',
    'political science',
    'polity and governance',
    'economics',
    'economy',
    'environment',
    'science and tech',
    'ethics and integrity',
    'english',
    'hindi',
    'sanskrit',
    'accountancy',
    'business studies',
    'computer science',
    'reasoning',
    'aptitude',
    'quantitative aptitude',
    'verbal ability',
  ].map(normalizeKey)
);

const isSubjectName = (name = '') => {
  const key = normalizeKey(name);
  return subjectNames.has(key) || Array.from(subjectNames).some((subject) => key.includes(subject));
};

const isGenericTarget = (name = '') => {
  const key = normalizeKey(name);
  if (!key) return true;
  if (/^(19|20)\d{2}$/.test(key)) return true;
  return [
    'all subjects',
    'year wise',
    'topic wise',
    'chapter wise',
    'subject wise',
    'solutions',
    'answer key',
    'answer keys',
    'notification',
    'admit card',
    'result',
  ].includes(key);
};

const inferIconKey = (name = '', fallback = 'folder') => {
  const key = normalizeKey(name);
  if (key.includes('physics')) return 'physics';
  if (key.includes('chemistry')) return 'chemistry';
  if (key.includes('biology') || key.includes('botany') || key.includes('zoology')) return 'biology';
  if (key.includes('math')) return 'maths';
  if (key.includes('geography')) return 'geography';
  if (key.includes('history')) return 'history';
  if (key.includes('polity') || key.includes('political')) return 'polity';
  if (key.includes('econom')) return 'economics';
  if (key.includes('computer') || key.includes('coding')) return 'coding';
  if (key.includes('reasoning')) return 'aptitude';
  if (key.includes('english')) return 'english';
  return fallback;
};

const inferTone = (name = '', fallback: StudyCardTone = 'cyan'): StudyCardTone => {
  const key = normalizeKey(name);
  if (key.includes('math') || key.includes('physics') || key.includes('chemistry') || key.includes('biology')) return 'blue';
  if (key.includes('geography') || key.includes('history') || key.includes('political')) return 'amber';
  if (key.includes('econom') || key.includes('account') || key.includes('business')) return 'emerald';
  if (key.includes('computer') || key.includes('coding')) return 'cyan';
  if (key.includes('english') || key.includes('hindi') || key.includes('sanskrit')) return 'rose';
  return fallback;
};

const coreSubjectShelves: ShelfSpec[] = [
  { name: 'Syllabus', iconKey: 'syllabus', tone: 'cyan', order: 10 },
  { name: 'Books', iconKey: 'book', tone: 'emerald', order: 20 },
  { name: 'Study Material', iconKey: 'material', tone: 'blue', order: 30 },
  { name: 'Revision Notes', iconKey: 'notes', tone: 'blue', order: 40 },
  { name: 'Previous Year Papers', iconKey: 'pyq', tone: 'violet', order: 50 },
  { name: 'Practice Questions', iconKey: 'practice', tone: 'amber', order: 60 },
];

const schoolSubjectShelves: ShelfSpec[] = [
  { name: 'Syllabus', iconKey: 'syllabus', tone: 'cyan', order: 10 },
  { name: 'NCERT Books', iconKey: 'book', tone: 'emerald', order: 20 },
  { name: 'NCERT Solutions', iconKey: 'book-solution', tone: 'emerald', order: 30 },
  { name: 'Study Material', iconKey: 'material', tone: 'blue', order: 40 },
  { name: 'Revision Notes', iconKey: 'notes', tone: 'blue', order: 50 },
  { name: 'Previous Year Papers', iconKey: 'pyq', tone: 'violet', order: 60 },
  { name: 'Sample Papers', iconKey: 'sample-paper', tone: 'violet', order: 70 },
  { name: 'Practice Questions', iconKey: 'practice', tone: 'amber', order: 80 },
  { name: 'Answer Keys', iconKey: 'answer-key', tone: 'slate', order: 90 },
];

const entranceSubjectShelves: ShelfSpec[] = [
  { name: 'Syllabus', iconKey: 'syllabus', tone: 'cyan', order: 10 },
  { name: 'Books', iconKey: 'book', tone: 'emerald', order: 20 },
  { name: 'Study Material', iconKey: 'material', tone: 'blue', order: 30 },
  { name: 'Revision Notes', iconKey: 'notes', tone: 'blue', order: 40 },
  { name: 'Formula Sheets', iconKey: 'formula', tone: 'amber', order: 50 },
  { name: 'Previous Year Papers', iconKey: 'pyq', tone: 'violet', order: 60 },
  { name: 'Practice Questions', iconKey: 'practice', tone: 'amber', order: 70 },
  { name: 'Mock Tests', iconKey: 'mock', tone: 'indigo', order: 80 },
  { name: 'Answer Keys', iconKey: 'answer-key', tone: 'slate', order: 90 },
];

const getChildren = (workspaceId: Types.ObjectId, parentId: Types.ObjectId | null) =>
  StudyCard.find({ workspaceId, parentId, status: { $ne: 'archived' } }).sort({ order: 1, name: 1 });

const findChild = async (workspaceId: Types.ObjectId, parentId: Types.ObjectId | null, name: string) => {
  const slug = slugify(name);
  return StudyCard.findOne({
    workspaceId,
    parentId,
    status: { $ne: 'archived' },
    $or: [{ slug }, { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }],
  });
};

const findAnyChild = async (workspaceId: Types.ObjectId, parentId: Types.ObjectId | null, name: string) => {
  const slug = slugify(name);
  return StudyCard.findOne({
    workspaceId,
    parentId,
    $or: [{ slug }, { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }],
  });
};

const ensureChild = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  name: string,
  goalType: StudyCardGoalType,
  iconKey = inferIconKey(name),
  tone = inferTone(name),
  order = getOrder(name)
) => {
  const existing = await findChild(workspaceId, parentId, name) || await findAnyChild(workspaceId, parentId, name);
  if (existing) {
    if (shouldApply) {
      let changed = false;
      if (existing.name !== name) {
        existing.name = name;
        changed = true;
      }
      if (!existing.goalType || existing.goalType === 'resource_folder') {
        existing.goalType = goalType;
        changed = true;
      }
      if (existing.visibility !== 'public') {
        existing.visibility = 'public';
        changed = true;
      }
      if (existing.status !== 'published') {
        existing.status = 'published';
        changed = true;
      }
      if (existing.iconKey !== iconKey) {
        existing.iconKey = iconKey;
        changed = true;
      }
      if (existing.tone !== tone) {
        existing.tone = tone;
        changed = true;
      }
      if (changed) await existing.save();
    }
    return existing;
  }

  stats.created += 1;
  if (!shouldApply) {
    return {
      _id: new Types.ObjectId(),
      name,
      slug: slugify(name),
      files: [],
    } as CardDoc;
  }

  return StudyCard.create({
    workspaceId,
    parentId,
    name,
    slug: slugify(name),
    goalType,
    iconKey,
    tone,
    order,
    status: 'published',
    visibility: 'public',
    files: [],
  });
};

const getPath = async (workspaceId: Types.ObjectId, parts: string[], createMissing = false) => {
  let parentId: Types.ObjectId | null = null;
  let current: CardDoc | null = null;

  for (const [index, part] of parts.entries()) {
    current = await findChild(workspaceId, parentId, part);
    if (!current) {
      if (!createMissing || index === 0) return null;
      const isFinal = index === parts.length - 1;
      current = await ensureChild(
        workspaceId,
        parentId,
        part,
        isFinal && isSubjectName(part) ? 'subject' : 'resource_folder',
        inferIconKey(part),
        inferTone(part),
        200 + index * 10
      );
    }
    parentId = current._id as Types.ObjectId;
  }

  return current;
};

const mergeIntoExisting = async (workspaceId: Types.ObjectId, source: CardDoc, target: CardDoc) => {
  if (String(source._id) === String(target._id)) return;

  const targetFileKeys = new Set((target.files || []).map((file: any) => file.url || file.name).filter(Boolean));
  const newFiles = (source.files || []).filter((file: any) => {
    const key = file.url || file.name;
    return key && !targetFileKeys.has(key);
  });

  if (shouldApply && newFiles.length) {
    target.files = [...(target.files || []), ...newFiles];
    await target.save();
  }

  const children = await getChildren(workspaceId, source._id as Types.ObjectId);
  for (const child of children) {
    const collision = await findChild(workspaceId, target._id as Types.ObjectId, child.name);
    if (collision) {
      await mergeIntoExisting(workspaceId, child, collision);
    } else if (shouldApply) {
      child.parentId = target._id;
      await child.save();
      stats.moved += 1;
    } else {
      stats.moved += 1;
    }
  }

  stats.merged += 1;
  if (shouldApply) {
    source.status = 'archived';
    source.visibility = 'private';
    await source.save();
  }
};

const moveOrMergeCard = async (
  workspaceId: Types.ObjectId,
  source: CardDoc,
  targetParentId: Types.ObjectId,
  targetName: string,
  options: { goalType: StudyCardGoalType; iconKey: string; tone: StudyCardTone; order: number }
) => {
  const targetSlug = slugify(targetName);
  const existing = await StudyCard.findOne({
    workspaceId,
    parentId: targetParentId,
    slug: targetSlug,
    status: { $ne: 'archived' },
  });

  if (existing && String(existing._id) !== String(source._id)) {
    await mergeIntoExisting(workspaceId, source, existing);
    return;
  }

  stats.moved += 1;
  if (shouldApply) {
    source.parentId = targetParentId;
    source.name = targetName;
    source.slug = targetSlug;
    source.goalType = options.goalType;
    source.iconKey = options.iconKey;
    source.tone = options.tone;
    source.order = options.order;
    source.status = 'published';
    source.visibility = 'public';
    await source.save();
  }
};

const archiveIfEmpty = async (workspaceId: Types.ObjectId, card: CardDoc) => {
  const childCount = await StudyCard.countDocuments({
    workspaceId,
    parentId: card._id,
    status: { $ne: 'archived' },
  });
  if (childCount || (card.files || []).length) return false;

  stats.archived += 1;
  if (shouldApply) {
    card.status = 'archived';
    card.visibility = 'private';
    await card.save();
  }
  return true;
};

const organizeResourceWrappersAtPath = async (workspaceId: Types.ObjectId, rootPath: string[]) => {
  const root = await getPath(workspaceId, rootPath);
  if (!root) {
    stats.skipped += 1;
    return;
  }

  const directChildren = await getChildren(workspaceId, root._id as Types.ObjectId);
  const wrappers = directChildren
    .map((child) => ({ child, def: wrapperByKey.get(normalizeKey(child.name)) }))
    .filter((entry): entry is { child: CardDoc; def: typeof resourceWrappers[number] } => Boolean(entry.def));

  for (const { child: wrapper, def } of wrappers) {
    const wrapperChildren = await getChildren(workspaceId, wrapper._id as Types.ObjectId);
    for (const child of wrapperChildren) {
      if (isGenericTarget(child.name)) continue;

      const target = await ensureChild(
        workspaceId,
        root._id as Types.ObjectId,
        child.name,
        isSubjectName(child.name) ? 'subject' : 'resource_folder',
        inferIconKey(child.name),
        inferTone(child.name),
        200
      );

      await moveOrMergeCard(workspaceId, child, target._id as Types.ObjectId, def.resourceName, {
        goalType: 'resource_folder',
        iconKey: def.iconKey,
        tone: def.tone,
        order: getOrder(def.resourceName),
      });
    }
  }

  for (const { child: wrapper } of wrappers) {
    await archiveIfEmpty(workspaceId, wrapper);
  }
};

const ensureShelves = async (workspaceId: Types.ObjectId, pathParts: string[], shelves: ShelfSpec[]) => {
  const target = await getPath(workspaceId, pathParts, true);
  if (!target) {
    stats.skipped += 1;
    return;
  }

  if (shouldApply && target.goalType !== 'subject' && isSubjectName(target.name)) {
    target.goalType = 'subject';
    target.iconKey = inferIconKey(target.name, target.iconKey);
    target.tone = inferTone(target.name, target.tone);
    await target.save();
  }

  for (const shelf of shelves) {
    await ensureChild(
      workspaceId,
      target._id as Types.ObjectId,
      shelf.name,
      'resource_folder',
      shelf.iconKey,
      shelf.tone,
      shelf.order
    );
  }
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
  if (!workspace) throw new Error('Study Hub workspace not found.');

  const workspaceId = workspace._id as Types.ObjectId;
  console.log(`${shouldApply ? 'Applying' : 'Dry run'} subject-first resource shelf cleanup.`);

  const nestedRoots = [
    ['Competitive Exams', 'UPSC CSE', 'Mains'],
    ['Competitive Exams', 'UPSC CSE', 'Prelims'],
    ['Entrance Exams', 'JEE (Main + Advanced)'],
    ['Entrance Exams', 'NEET', 'NEET UG'],
    ['School Boards', 'CBSE', 'Class 10', 'Social Science'],
  ];

  for (const rootPath of nestedRoots) {
    await organizeResourceWrappersAtPath(workspaceId, rootPath);
  }

  const schoolTargets = [
    ['School Boards', 'CBSE', 'Class 10', 'Social Science', 'History'],
    ['School Boards', 'CBSE', 'Class 10', 'Social Science', 'Geography'],
    ['School Boards', 'CBSE', 'Class 10', 'Social Science', 'Political Science'],
    ['School Boards', 'CBSE', 'Class 10', 'Social Science', 'Economics'],
  ];

  const entranceTargets = [
    ['Entrance Exams', 'JEE (Main + Advanced)', 'Physics'],
    ['Entrance Exams', 'JEE (Main + Advanced)', 'Chemistry'],
    ['Entrance Exams', 'JEE (Main + Advanced)', 'Maths'],
    ['Entrance Exams', 'NEET', 'NEET UG', 'Physics'],
    ['Entrance Exams', 'NEET', 'NEET UG', 'Chemistry'],
    ['Entrance Exams', 'NEET', 'NEET UG', 'Biology'],
  ];

  const upscTargets = [
    ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper I', 'History'],
    ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper I', 'Geography'],
    ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper I', 'Indian Society'],
    ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper I', 'Art and Culture'],
    ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper II', 'Polity and Governance'],
    ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper II', 'International Relations'],
    ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper II', 'Social Justice'],
    ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper III', 'Economy'],
    ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper III', 'Environment'],
    ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper III', 'Science and Tech'],
    ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper IV Ethics', 'Ethics and Integrity'],
  ];

  for (const pathParts of schoolTargets) await ensureShelves(workspaceId, pathParts, schoolSubjectShelves);
  for (const pathParts of entranceTargets) await ensureShelves(workspaceId, pathParts, entranceSubjectShelves);
  for (const pathParts of upscTargets) await ensureShelves(workspaceId, pathParts, coreSubjectShelves);

  console.log(
    `Subject shelf cleanup complete. Created ${stats.created}, moved ${stats.moved}, merged ${stats.merged}, archived ${stats.archived}, skipped ${stats.skipped}.`
  );
};

run()
  .catch((error) => {
    console.error('Subject shelf cleanup failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
