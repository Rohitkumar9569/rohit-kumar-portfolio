import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard, { type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const MONGO_URI = process.env.MONGO_URI;
const ROOT_WORKSPACE_SLUG = 'study-hub';
const shouldApply = process.argv.includes('--apply');
const verifyOnly = process.argv.includes('--verify');
const listExtras = process.argv.includes('--list-extras');
const classArg = process.argv.find((arg) => arg.startsWith('--class='));
const onlyClass = classArg ? Number(classArg.split('=').slice(1).join('=')) : 0;

type FolderSpec = {
  name: string;
  slug: string;
  iconKey: string;
  tone: StudyCardTone;
  order: number;
};

type ClassStats = {
  className: string;
  before: number;
  after: number;
  created: number;
  restored: number;
  renamed: number;
  merged: number;
  archived: number;
  kept: number;
  extrasAfter: number;
};

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

const normalizeKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const parseClassNumber = (name = '') => {
  const match = name.match(/^class\s+([1-9]|1[0-2])$/i);
  return match ? Number(match[1]) : 0;
};

const classQuery = onlyClass
  ? { name: new RegExp(`^Class\\s+${onlyClass}$`, 'i') }
  : { name: /^Class\s+(?:[1-9]|1[0-2])$/i };

const baseShelfSpecs: FolderSpec[] = [
  { name: 'Board Pattern', slug: 'board-pattern', iconKey: 'syllabus', tone: 'amber', order: 10 },
  { name: 'Syllabus', slug: 'syllabus', iconKey: 'syllabus', tone: 'cyan', order: 20 },
  { name: 'NCERT Books', slug: 'ncert-books', iconKey: 'book', tone: 'emerald', order: 30 },
  { name: 'NCERT Solutions', slug: 'ncert-solutions', iconKey: 'book-solution', tone: 'emerald', order: 40 },
  { name: 'Study Material', slug: 'study-material', iconKey: 'material', tone: 'blue', order: 50 },
  { name: 'Revision Notes', slug: 'revision-notes', iconKey: 'notes', tone: 'blue', order: 60 },
  { name: 'Previous Year Papers', slug: 'previous-year-papers', iconKey: 'pyq', tone: 'violet', order: 70 },
  { name: 'Sample Papers', slug: 'sample-papers', iconKey: 'sample-paper', tone: 'violet', order: 80 },
  { name: 'Practice Questions', slug: 'practice-questions', iconKey: 'practice', tone: 'amber', order: 90 },
  { name: 'Important Questions', slug: 'important-questions', iconKey: 'question-paper', tone: 'amber', order: 100 },
  { name: 'Answer Keys', slug: 'answer-keys', iconKey: 'answer-key', tone: 'slate', order: 110 },
  { name: 'Official CBSE', slug: 'official-cbse', iconKey: 'verified', tone: 'cyan', order: 120 },
];

const upperClassShelfSpecs: FolderSpec[] = [
  { name: 'NCERT Exemplar', slug: 'ncert-exemplar', iconKey: 'book-solution', tone: 'emerald', order: 130 },
  { name: 'Formula Sheets', slug: 'formula-sheets', iconKey: 'formula', tone: 'amber', order: 140 },
];

const lowerPrimarySubjects = [
  'English',
  'Hindi',
  'Mathematics',
  'English Marigold',
  'Hindi Rimjhim',
  'Worksheets',
  'Activity Sheets',
];
const upperPrimarySubjects = [
  'English',
  'Hindi',
  'Mathematics',
  'Environmental Studies',
  'General Knowledge',
  'English Marigold',
  'Hindi Rimjhim',
  'EVS Aas Paas',
  'Worksheets',
  'Activity Sheets',
];
const middleSubjects = [
  'English',
  'Hindi',
  'Sanskrit',
  'Mathematics',
  'Science',
  'Social Science',
  'Computer Science',
  'General Knowledge',
  'Art Education',
  'Health and Physical Education',
  'Worksheets',
  'Activity Sheets',
];
const class9Subjects = [
  'English Language & Literature',
  'Hindi Course A',
  'Hindi Course B',
  'Sanskrit',
  'Mathematics',
  'Science',
  'Social Science',
  'Information Technology',
  'Computer Applications',
  'Artificial Intelligence',
  'Health and Physical Education',
];
const class10Subjects = [
  'English Language & Literature',
  'Hindi Course A',
  'Hindi Course B',
  'Sanskrit',
  'Mathematics',
  'Mathematics Basic',
  'Mathematics Standard',
  'Science',
  'Social Science',
  'Information Technology',
  'Computer Applications',
  'Artificial Intelligence',
  'Health and Physical Education',
];
const seniorSubjects = [
  'Science Stream',
  'Commerce Stream',
  'Humanities Stream',
  'English Core',
  'English Elective',
  'Hindi Core',
  'Hindi Elective',
  'Sanskrit Core',
  'Mathematics',
  'Applied Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Accountancy',
  'Business Studies',
  'Economics',
  'History',
  'Political Science',
  'Geography',
  'Psychology',
  'Sociology',
  'Computer Science',
  'Informatics Practices',
  'Physical Education',
  'Home Science',
  'Entrepreneurship',
  'Legal Studies',
  'Fine Arts',
  'Painting',
];

const subjectIcon = (name: string) => {
  const key = normalizeKey(name);
  if (key.includes('math')) return 'maths';
  if (key.includes('science') && !key.includes('social')) return 'science';
  if (key.includes('social') || key.includes('history') || key.includes('political') || key.includes('geography')) return 'social-science';
  if (key.includes('physics')) return 'physics';
  if (key.includes('chemistry')) return 'chemistry';
  if (key.includes('biology')) return 'biology';
  if (key.includes('account')) return 'accountancy';
  if (key.includes('business') || key.includes('commerce') || key.includes('economics')) return 'business-studies';
  if (key.includes('computer') || key.includes('information') || key.includes('informatics') || key.includes('artificial')) return 'computer-science';
  if (key.includes('english')) return 'english';
  if (key.includes('hindi')) return 'hindi';
  if (key.includes('worksheet') || key.includes('activity')) return 'practice';
  if (key.includes('sanskrit')) return 'sanskrit';
  if (key.includes('physical') || key.includes('health')) return 'sports';
  if (key.includes('art') || key.includes('painting') || key.includes('fine')) return 'art';
  return 'subject';
};

const subjectTone = (name: string): StudyCardTone => {
  const key = normalizeKey(name);
  if (key.includes('math') || key.includes('science') || key.includes('physics') || key.includes('chemistry') || key.includes('biology')) return 'blue';
  if (key.includes('account') || key.includes('business') || key.includes('economics') || key.includes('commerce')) return 'emerald';
  if (key.includes('history') || key.includes('political') || key.includes('geography') || key.includes('humanities')) return 'amber';
  if (key.includes('computer') || key.includes('information') || key.includes('informatics') || key.includes('artificial')) return 'cyan';
  if (key.includes('english') || key.includes('hindi') || key.includes('sanskrit')) return 'rose';
  if (key.includes('worksheet') || key.includes('activity')) return 'amber';
  return 'slate';
};

const toSubjectSpecs = (subjects: string[], startOrder: number) =>
  subjects.map((name, index): FolderSpec => ({
    name,
    slug: slugify(name),
    iconKey: subjectIcon(name),
    tone: subjectTone(name),
    order: startOrder + index * 10,
  }));

const getRequiredSpecs = (classNumber: number) => {
  const shelves = classNumber >= 6
    ? [...baseShelfSpecs, ...upperClassShelfSpecs]
    : baseShelfSpecs;

  let subjects = lowerPrimarySubjects;
  if (classNumber >= 3 && classNumber <= 5) subjects = upperPrimarySubjects;
  if (classNumber >= 6 && classNumber <= 8) subjects = middleSubjects;
  if (classNumber === 9) subjects = class9Subjects;
  if (classNumber === 10) subjects = class10Subjects;
  if (classNumber >= 11) subjects = seniorSubjects;

  return [...shelves, ...toSubjectSpecs(subjects, 200)];
};

const aliasToCanonical = new Map<string, string>([
  ['pyq', 'Previous Year Papers'],
  ['previous year paper', 'Previous Year Papers'],
  ['previous year papers', 'Previous Year Papers'],
  ['study materials', 'Study Material'],
  ['material', 'Study Material'],
  ['notes', 'Revision Notes'],
  ['ncert', 'NCERT Books'],
  ['ncert book', 'NCERT Books'],
  ['ncert books', 'NCERT Books'],
  ['books', 'NCERT Books'],
  ['sample paper', 'Sample Papers'],
  ['sample papers', 'Sample Papers'],
  ['important question', 'Important Questions'],
  ['important questions', 'Important Questions'],
  ['practice', 'Practice Questions'],
  ['practice questions', 'Practice Questions'],
  ['answer key', 'Answer Keys'],
  ['answer keys', 'Answer Keys'],
  ['board pattern', 'Board Pattern'],
  ['official cbse', 'Official CBSE'],
  ['official sources', 'Official CBSE'],
  ['english language and literature', 'English Language & Literature'],
  ['english lang and lit', 'English Language & Literature'],
  ['english language literature', 'English Language & Literature'],
  ['english', 'English'],
  ['hindi a', 'Hindi Course A'],
  ['hindi course a', 'Hindi Course A'],
  ['hindi b', 'Hindi Course B'],
  ['hindi course b', 'Hindi Course B'],
  ['computer application', 'Computer Applications'],
  ['computer applications', 'Computer Applications'],
  ['foundation information technology', 'Information Technology'],
  ['ict', 'Information Technology'],
  ['information technology', 'Information Technology'],
  ['maths', 'Mathematics'],
  ['mathematics', 'Mathematics'],
  ['mathematics basic', 'Mathematics Basic'],
  ['mathematics standard', 'Mathematics Standard'],
  ['social studies', 'Social Science'],
  ['social science', 'Social Science'],
  ['environmental studies', 'Environmental Studies'],
  ['evs', 'Environmental Studies'],
  ['gk', 'General Knowledge'],
  ['general knowledge', 'General Knowledge'],
  ['health and physical education', 'Health and Physical Education'],
  ['physical education', 'Physical Education'],
  ['english core', 'English Core'],
  ['english elective', 'English Elective'],
  ['hindi core', 'Hindi Core'],
  ['hindi elective', 'Hindi Elective'],
  ['sanskrit communicative', 'Sanskrit'],
  ['sanskrit core', 'Sanskrit Core'],
  ['business studies', 'Business Studies'],
  ['business study', 'Business Studies'],
  ['accountancy', 'Accountancy'],
  ['accounts', 'Accountancy'],
  ['economics', 'Economics'],
  ['political science', 'Political Science'],
  ['computer science', 'Computer Science'],
  ['informatics practices', 'Informatics Practices'],
  ['ip', 'Informatics Practices'],
  ['home science', 'Home Science'],
  ['legal studies', 'Legal Studies'],
  ['fine arts', 'Fine Arts'],
]);

const canonicalFor = (name: string) => aliasToCanonical.get(normalizeKey(name)) || name.trim().replace(/\s+/g, ' ');

const findChildBySlug = (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId,
  slug: string
) => StudyCard.findOne({ workspaceId, parentId, slug });

const mergeCards = async (
  workspaceId: Types.ObjectId,
  source: any,
  target: any
): Promise<number> => {
  if (String(source._id) === String(target._id)) return 0;

  const sourceFiles = Array.isArray(source.files) ? source.files : [];
  const targetFiles = Array.isArray(target.files) ? target.files : [];
  const targetFileUrls = new Set(targetFiles.map((file: any) => file?.url).filter(Boolean));
  const newFiles = sourceFiles.filter((file: any) => file?.url && !targetFileUrls.has(file.url));

  if (shouldApply && newFiles.length) {
    target.files = [...targetFiles, ...newFiles];
    await target.save();
  }

  const children = await StudyCard.find({
    workspaceId,
    parentId: source._id,
    status: { $ne: 'archived' },
  });

  let merged = 1;
  for (const child of children) {
    const collision = await findChildBySlug(workspaceId, target._id, child.slug);
    if (collision && String(collision._id) !== String(child._id)) {
      merged += await mergeCards(workspaceId, child, collision);
      continue;
    }

    if (shouldApply) {
      child.parentId = target._id;
      await child.save();
    }
  }

  if (shouldApply) {
    source.status = 'archived';
    await source.save();
  }

  return merged;
};

const ensureFolder = async (
  workspaceId: Types.ObjectId,
  classCard: any,
  spec: FolderSpec
) => {
  const existing = await findChildBySlug(workspaceId, classCard._id, spec.slug);
  if (existing) {
    if (existing.status === 'archived') {
      if (shouldApply) {
        existing.name = spec.name;
        existing.iconKey = spec.iconKey;
        existing.tone = spec.tone;
        existing.order = spec.order;
        existing.goalType = 'resource_folder';
        existing.status = 'published';
        existing.visibility = 'public';
        await existing.save();
      }
      return { created: 0, restored: 1 };
    }
    return { created: 0, restored: 0 };
  }

  if (shouldApply) {
    await StudyCard.create({
      workspaceId,
      parentId: classCard._id,
      name: spec.name,
      slug: spec.slug,
      iconKey: spec.iconKey,
      goalType: 'resource_folder',
      tone: spec.tone,
      order: spec.order,
      status: 'published',
      visibility: 'public',
      files: [],
    });
  }

  return { created: 1, restored: 0 };
};

const curateClass = async (
  workspaceId: Types.ObjectId,
  classCard: any
): Promise<ClassStats> => {
  const classNumber = parseClassNumber(classCard.name);
  const requiredSpecs = getRequiredSpecs(classNumber);
  const specByName = new Map(requiredSpecs.map((spec) => [spec.name, spec]));
  const allowedSlugs = new Set(requiredSpecs.map((spec) => spec.slug));
  const childrenBefore = await StudyCard.find({
    workspaceId,
    parentId: classCard._id,
    status: { $ne: 'archived' },
  });

  const stats: ClassStats = {
    className: classCard.name,
    before: childrenBefore.length,
    after: 0,
    created: 0,
    restored: 0,
    renamed: 0,
    merged: 0,
    archived: 0,
    kept: 0,
    extrasAfter: 0,
  };

  if (shouldApply && classCard.goalType !== 'class') {
    classCard.goalType = 'class';
    await classCard.save();
  }

  for (const child of childrenBefore) {
    const canonicalName = canonicalFor(child.name);
    const spec = specByName.get(canonicalName);

    if (!spec || !allowedSlugs.has(spec.slug)) {
      if (shouldApply) {
        child.status = 'archived';
        await child.save();
      }
      stats.archived += 1;
      continue;
    }

    const target = await findChildBySlug(workspaceId, classCard._id, spec.slug);
    if (target && String(target._id) !== String(child._id)) {
      const mergedCount = await mergeCards(workspaceId, child, target);
      stats.merged += mergedCount;
      continue;
    }

    const needsRename = child.name !== spec.name || child.slug !== spec.slug;
    if (needsRename) {
      if (shouldApply) {
        child.name = spec.name;
        child.slug = spec.slug;
        child.iconKey = spec.iconKey;
        child.tone = spec.tone;
        child.order = spec.order;
        child.goalType = 'resource_folder';
        child.visibility = 'public';
        await child.save();
      }
      stats.renamed += 1;
    } else {
      stats.kept += 1;
    }
  }

  for (const spec of requiredSpecs) {
    const result = await ensureFolder(workspaceId, classCard, spec);
    stats.created += result.created;
    stats.restored += result.restored;
  }

  const childrenAfter = await StudyCard.find({
    workspaceId,
    parentId: classCard._id,
    status: { $ne: 'archived' },
  }).select('slug').lean();
  stats.after = childrenAfter.length;
  const extras = childrenAfter.filter((child: any) => !allowedSlugs.has(child.slug));
  stats.extrasAfter = extras.length;

  if (listExtras && extras.length) {
    const extraNames = await StudyCard.find({ _id: { $in: extras.map((child: any) => child._id) } })
      .select('name slug status')
      .lean();
    console.log(`${classCard.name} extras: ${extraNames.map((item: any) => `${item.name} [${item.slug}/${item.status}]`).join(', ')}`);
  }

  return stats;
};

const getCbseRoots = async (workspaceId: Types.ObjectId) =>
  StudyCard.find({
    workspaceId,
    status: { $ne: 'archived' },
    $or: [
      { slug: 'cbse' },
      { name: /^CBSE$/i },
      { name: /^Central Board of Secondary Education$/i },
    ],
  });

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');
  if (onlyClass && (onlyClass < 1 || onlyClass > 12)) throw new Error('--class must be between 1 and 12.');

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
  if (!workspace) throw new Error('Study Hub workspace not found.');

  const workspaceId = workspace._id as Types.ObjectId;
  const cbseRoots = await getCbseRoots(workspaceId);
  const allStats: ClassStats[] = [];

  console.log(`${verifyOnly ? 'Verifying' : shouldApply ? 'Applying' : 'Dry run'} CBSE premium class folder curation.`);
  console.log(`CBSE roots found: ${cbseRoots.length}.`);

  for (const cbseRoot of cbseRoots) {
    const classCards = await StudyCard.find({
      workspaceId,
      parentId: cbseRoot._id,
      status: { $ne: 'archived' },
      ...classQuery,
    }).sort({ order: 1, name: 1 });

    for (const classCard of classCards) {
      allStats.push(await curateClass(workspaceId, classCard));
    }
  }

  const totals = allStats.reduce((current, item) => ({
    before: current.before + item.before,
    after: current.after + item.after,
    created: current.created + item.created,
    restored: current.restored + item.restored,
    renamed: current.renamed + item.renamed,
    merged: current.merged + item.merged,
    archived: current.archived + item.archived,
    extrasAfter: current.extrasAfter + item.extrasAfter,
  }), {
    before: 0,
    after: 0,
    created: 0,
    restored: 0,
    renamed: 0,
    merged: 0,
    archived: 0,
    extrasAfter: 0,
  });

  for (const item of allStats) {
    console.log(`${item.className}: ${item.before} -> ${item.after} folders | created ${item.created}, restored ${item.restored}, renamed ${item.renamed}, merged ${item.merged}, archived ${item.archived}, extras after ${item.extrasAfter}`);
  }

  console.log(`Classes checked: ${allStats.length}.`);
  console.log(`Total direct folders: ${totals.before} -> ${totals.after}.`);
  console.log(`Created: ${totals.created}. Restored: ${totals.restored}. Renamed: ${totals.renamed}. Merged: ${totals.merged}. Archived: ${totals.archived}.`);
  console.log(`Unapproved direct folders after check: ${totals.extrasAfter}.`);
};

run()
  .catch((error) => {
    console.error('CBSE premium class folder curation failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
