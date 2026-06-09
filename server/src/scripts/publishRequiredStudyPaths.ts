import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard, { type IStudyCardFile, type StudyCardGoalType, type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const MONGO_URI = process.env.MONGO_URI;
const ROOT_WORKSPACE_SLUG = 'study-hub';
const fromArg = process.argv.find((arg) => arg.startsWith('--from='));
const startFrom = fromArg ? Math.max(1, Number(fromArg.slice('--from='.length)) || 1) : 1;

type Style = {
  iconKey: string;
  tone: StudyCardTone;
  goalType: StudyCardGoalType;
};

type PathSpec = {
  path: string[];
  shelves?: string[];
  style?: Partial<Style>;
};

const resourceShelfStyles: Record<string, Style> = {
  Syllabus: { iconKey: 'syllabus', tone: 'amber', goalType: 'resource_folder' },
  Books: { iconKey: 'book', tone: 'indigo', goalType: 'resource_folder' },
  'NCERT Books': { iconKey: 'book', tone: 'indigo', goalType: 'resource_folder' },
  'NCERT Solutions': { iconKey: 'solution', tone: 'cyan', goalType: 'resource_folder' },
  'Study Material': { iconKey: 'material', tone: 'emerald', goalType: 'resource_folder' },
  'Revision Notes': { iconKey: 'notes', tone: 'cyan', goalType: 'resource_folder' },
  'Previous Year Papers': { iconKey: 'pyq', tone: 'violet', goalType: 'resource_folder' },
  'Sample Papers': { iconKey: 'sample-paper', tone: 'violet', goalType: 'resource_folder' },
  'Practice Questions': { iconKey: 'practice', tone: 'indigo', goalType: 'resource_folder' },
  Practice: { iconKey: 'practice', tone: 'indigo', goalType: 'resource_folder' },
  'Mock Tests': { iconKey: 'mock-test', tone: 'rose', goalType: 'resource_folder' },
  'Formula Sheets': { iconKey: 'formula', tone: 'cyan', goalType: 'resource_folder' },
  'Answer Keys': { iconKey: 'answer-key', tone: 'slate', goalType: 'resource_folder' },
  Updates: { iconKey: 'updates', tone: 'amber', goalType: 'resource_folder' },
  Overview: { iconKey: 'overview', tone: 'slate', goalType: 'resource_folder' },
};

const schoolSubjectShelves = [
  'Syllabus',
  'NCERT Books',
  'NCERT Solutions',
  'Study Material',
  'Revision Notes',
  'Previous Year Papers',
  'Sample Papers',
  'Practice Questions',
  'Answer Keys',
];

const examSubjectShelves = [
  'Syllabus',
  'Books',
  'Previous Year Papers',
  'Study Material',
  'Revision Notes',
  'Formula Sheets',
  'Practice Questions',
  'Mock Tests',
  'Answer Keys',
];

const basicExamShelves = ['Syllabus', 'Previous Year Papers', 'Study Material', 'Practice', 'Updates'];
const universityExamShelves = ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material', 'Practice', 'Updates'];

const requiredPaths: PathSpec[] = [
  { path: ['Foreign Language', 'Japanese'], style: { iconKey: 'language', tone: 'rose', goalType: 'exam' }, shelves: basicExamShelves },
  { path: ['Foreign Language', 'Korean'], style: { iconKey: 'language', tone: 'rose', goalType: 'exam' }, shelves: basicExamShelves },
  { path: ['Foreign Language', 'Spanish'], style: { iconKey: 'language', tone: 'rose', goalType: 'exam' }, shelves: basicExamShelves },
  { path: ['Placement / Private', 'Service Based IT'], style: { iconKey: 'company', tone: 'cyan', goalType: 'exam_family' }, shelves: ['Syllabus', 'Previous Year Papers', 'Study Material'] },
  { path: ['Placement / Private', 'Common Preparation', 'DSA & Placement Prep', 'Interview'], style: { iconKey: 'interview', tone: 'cyan', goalType: 'exam' }, shelves: ['Syllabus', 'Previous Year Papers', 'Study Material'] },
  { path: ['School Boards'], style: { iconKey: 'school', tone: 'emerald', goalType: 'exam_category' } },
  { path: ['School Boards', 'CBSE'], style: { iconKey: 'cbse', tone: 'emerald', goalType: 'board' } },
  { path: ['School Boards', 'CBSE', 'Class 10'], style: { iconKey: 'class-10', tone: 'cyan', goalType: 'class' }, shelves: ['Syllabus', 'NCERT Books', 'Previous Year Papers', 'Study Material', 'Revision Notes', 'Sample Papers', 'Practice Questions', 'Answer Keys'] },
  { path: ['School Boards', 'CBSE', 'Class 10', 'Social Science'], style: { iconKey: 'subject', tone: 'cyan', goalType: 'subject' } },
  { path: ['School Boards', 'CBSE', 'Class 10', 'Social Science', 'Geography'], style: { iconKey: 'geography', tone: 'emerald', goalType: 'subject' }, shelves: schoolSubjectShelves },
  { path: ['School Boards', 'CBSE', 'Class 12', 'Geography'], style: { iconKey: 'geography', tone: 'emerald', goalType: 'subject' }, shelves: schoolSubjectShelves },
  { path: ['Competitive Exams', 'UPSC CSE'], style: { iconKey: 'upsc', tone: 'indigo', goalType: 'exam' }, shelves: ['Syllabus', 'Previous Year Papers', 'Study Material'] },
  { path: ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper I', 'Geography'], style: { iconKey: 'geography', tone: 'emerald', goalType: 'subject' }, shelves: ['Syllabus', 'Books', 'Previous Year Papers', 'Study Material', 'Revision Notes', 'Practice Questions'] },
  { path: ['Entrance Exams', 'JEE (Main + Advanced)'], style: { iconKey: 'jee', tone: 'cyan', goalType: 'exam_family' }, shelves: ['Syllabus', 'Previous Year Papers', 'Study Material'] },
  { path: ['Entrance Exams', 'JEE (Main + Advanced)', 'Physics'], style: { iconKey: 'physics', tone: 'cyan', goalType: 'subject' }, shelves: examSubjectShelves },
  { path: ['Entrance Exams', 'NEET'], style: { iconKey: 'neet', tone: 'emerald', goalType: 'exam_family' }, shelves: ['Syllabus', 'Previous Year Papers', 'Study Material'] },
  { path: ['Entrance Exams', 'NEET', 'NEET UG'], style: { iconKey: 'neet', tone: 'emerald', goalType: 'exam' }, shelves: ['Syllabus', 'Previous Year Papers', 'Study Material'] },
  { path: ['Entrance Exams', 'NEET', 'NEET UG', 'Biology'], style: { iconKey: 'biology', tone: 'emerald', goalType: 'subject' }, shelves: examSubjectShelves },
  { path: ['Entrance Exams', 'Management'], style: { iconKey: 'management', tone: 'indigo', goalType: 'exam_family' }, shelves: ['Syllabus', 'Previous Year Papers', 'Study Material'] },
  { path: ['Entrance Exams', 'Management', 'MAT'], style: { iconKey: 'management', tone: 'indigo', goalType: 'exam' }, shelves: basicExamShelves },
  ...['CAT', 'CMAT', 'IIFT', 'MAH MBA CET', 'NMAT', 'SNAP', 'XAT'].map((exam) => ({
    path: ['Entrance Exams', 'Management', exam],
    style: { iconKey: 'management', tone: 'indigo' as StudyCardTone, goalType: 'exam' as StudyCardGoalType },
    shelves: basicExamShelves,
  })),
  { path: ['Entrance Exams', 'Law'], style: { iconKey: 'law', tone: 'amber', goalType: 'exam_family' }, shelves: ['Syllabus', 'Previous Year Papers', 'Study Material'] },
  { path: ['Entrance Exams', 'Law', 'CLAT'], style: { iconKey: 'law', tone: 'amber', goalType: 'exam' }, shelves: basicExamShelves },
  ...['AILET', 'LSAT India', 'MH CET Law', 'SLAT'].map((exam) => ({
    path: ['Entrance Exams', 'Law', exam],
    style: { iconKey: 'law', tone: 'amber' as StudyCardTone, goalType: 'exam' as StudyCardGoalType },
    shelves: basicExamShelves,
  })),
  { path: ['Entrance Exams', 'Professional Certifications'], style: { iconKey: 'certificate', tone: 'cyan', goalType: 'exam_family' }, shelves: ['Syllabus', 'Previous Year Papers', 'Study Material'] },
  { path: ['Entrance Exams', 'Professional Certifications', 'CA Foundation'], style: { iconKey: 'certificate', tone: 'cyan', goalType: 'exam' }, shelves: basicExamShelves },
  ...['CA Intermediate', 'CA Final', 'CS Executive Professional'].map((exam) => ({
    path: ['Entrance Exams', 'Professional Certifications', exam],
    style: { iconKey: 'certificate', tone: 'cyan' as StudyCardTone, goalType: 'exam' as StudyCardGoalType },
    shelves: basicExamShelves,
  })),
  { path: ['State Exams', 'UPPSC PCS'], style: { iconKey: 'state-exam', tone: 'amber', goalType: 'exam' }, shelves: ['Syllabus', 'Previous Year Papers', 'Study Material'] },
  { path: ['University Exams', 'Common Entrances'], style: { iconKey: 'university', tone: 'cyan', goalType: 'exam_family' }, shelves: ['Syllabus', 'Previous Year Papers', 'Study Material'] },
  { path: ['University Exams', 'Common Entrances', 'CUET UG'], style: { iconKey: 'university', tone: 'cyan', goalType: 'exam' }, shelves: universityExamShelves },
  ...['CUET PG', 'IIT JAM', 'JEST', 'TIFR GS'].map((exam) => ({
    path: ['University Exams', 'Common Entrances', exam],
    style: { iconKey: 'university', tone: 'cyan' as StudyCardTone, goalType: 'exam' as StudyCardGoalType },
    shelves: universityExamShelves,
  })),
  { path: ['Study Abroad', 'GRE'], style: { iconKey: 'abroad', tone: 'cyan', goalType: 'exam' }, shelves: basicExamShelves },
  ...['GMAT', 'SAT', 'ACT', 'MCAT', 'LSAT', 'USMLE', 'UCAT', 'LNAT', 'GAMSAT', 'TOEFL'].map((exam) => ({
    path: ['Study Abroad', exam],
    style: { iconKey: 'abroad', tone: 'cyan' as StudyCardTone, goalType: 'exam' as StudyCardGoalType },
    shelves: basicExamShelves,
  })),
  { path: ['Foreign Language', 'English Tests'], style: { iconKey: 'english', tone: 'cyan', goalType: 'exam' }, shelves: ['Syllabus', 'Previous Year Papers', 'Study Material'] },
  { path: ['Foreign Language', 'English Tests', 'IELTS'], style: { iconKey: 'english', tone: 'cyan', goalType: 'exam' }, shelves: basicExamShelves },
  { path: ['Foreign Language', 'English Speaking'], style: { iconKey: 'english', tone: 'cyan', goalType: 'exam' }, shelves: basicExamShelves },
  ...['French', 'German', 'Japanese', 'Korean', 'Spanish'].map((language) => ({
    path: ['Foreign Language', language],
    style: { iconKey: 'language', tone: 'rose' as StudyCardTone, goalType: 'exam' as StudyCardGoalType },
    shelves: basicExamShelves,
  })),
  { path: ['Placement / Private', 'Common Preparation', 'DSA & Placement Prep'], style: { iconKey: 'placement', tone: 'emerald', goalType: 'exam' }, shelves: ['Syllabus', 'Previous Year Papers', 'Study Material', 'Mock Tests', 'Strategy', 'Interview'] },
  { path: ['Placement / Private', 'Common Preparation', 'DSA & Placement Prep', 'Interview'], style: { iconKey: 'interview', tone: 'cyan', goalType: 'exam' }, shelves: ['Syllabus', 'Previous Year Papers', 'Study Material'] },
  { path: ['Placement / Private', 'Service Based IT'], style: { iconKey: 'company', tone: 'cyan', goalType: 'exam_family' }, shelves: ['Syllabus', 'Previous Year Papers', 'Study Material'] },
  { path: ['Placement / Private', 'Service Based IT', 'TCS'], style: { iconKey: 'company', tone: 'cyan', goalType: 'exam' }, shelves: ['Syllabus', 'Previous Year Papers', 'Revision Notes', 'Study Material', 'Mock Tests', 'Topic Wise Practice', 'Strategy', 'Interview', 'Interview Day Checklist', 'Full Length Tests', 'Mini Projects', 'Offer HR Negotiation'] },
];

const slugify = (value: string, fallback = 'item') =>
  value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '') || fallback;

const rootStyles: Record<string, Style> = {
  'Competitive Exams': { iconKey: 'exam', tone: 'indigo', goalType: 'exam_category' },
  'Entrance Exams': { iconKey: 'entrance', tone: 'violet', goalType: 'exam_category' },
  'School Boards': { iconKey: 'school', tone: 'emerald', goalType: 'exam_category' },
  'State Exams': { iconKey: 'state-exam', tone: 'amber', goalType: 'exam_category' },
  'University Exams': { iconKey: 'university', tone: 'cyan', goalType: 'exam_category' },
  'Placement / Private': { iconKey: 'placement', tone: 'emerald', goalType: 'exam_category' },
  'Study Abroad': { iconKey: 'abroad', tone: 'cyan', goalType: 'exam_category' },
  'Foreign Language': { iconKey: 'language', tone: 'rose', goalType: 'exam_category' },
};

const rootOrders: Record<string, number> = {
  'Competitive Exams': 10,
  'Entrance Exams': 20,
  'School Boards': 30,
  'State Exams': 40,
  'University Exams': 50,
  'Placement / Private': 60,
  'Study Abroad': 70,
  'Foreign Language': 80,
};

const defaultStyleFor = (name: string, depth: number): Style => {
  if (resourceShelfStyles[name]) return resourceShelfStyles[name];
  if (depth === 0 && rootStyles[name]) return rootStyles[name];
  if (depth === 0) return { iconKey: 'folder', tone: 'cyan', goalType: 'exam_category' };
  if (/class\s+\d+/i.test(name)) return { iconKey: 'class', tone: 'cyan', goalType: 'class' };
  if (['CBSE'].includes(name)) return { iconKey: 'cbse', tone: 'emerald', goalType: 'board' };
  return { iconKey: 'folder', tone: 'cyan', goalType: 'exam' };
};

const ensureCard = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  name: string,
  depth: number,
  order: number,
  styleOverride: Partial<Style> = {}
) => {
  const slug = slugify(name);
  const baseStyle = defaultStyleFor(name, depth);
  const style = { ...baseStyle, ...styleOverride };
  let card = await StudyCard.findOne({ workspaceId, parentId, slug });

  if (!card) {
    card = new StudyCard({
      workspaceId,
      parentId,
      slug,
      files: [],
    });
  }

  card.workspaceId = workspaceId;
  card.parentId = parentId;
  card.name = name;
  card.slug = slug;
  card.iconKey = style.iconKey;
  card.tone = style.tone;
  card.goalType = style.goalType;
  card.order = depth === 0 ? rootOrders[name] ?? order : order;
  card.status = 'published';
  card.visibility = 'public';
  await card.save();
  return card;
};

const fileKey = (file: IStudyCardFile) =>
  `${(file.url || '').trim().toLowerCase()}::${(file.name || '').trim().toLowerCase()}`;

const activeChildren = (workspaceId: Types.ObjectId, parentId: Types.ObjectId) =>
  StudyCard.find({ workspaceId, parentId, status: { $ne: 'archived' } });

const collapseSameNameChild = async (workspaceId: Types.ObjectId, parent: any) => {
  const duplicate = await StudyCard.findOne({
    workspaceId,
    parentId: parent._id,
    slug: parent.slug,
    status: { $ne: 'archived' },
  });
  if (!duplicate) return 0;

  const existingFileKeys = new Set((parent.files || []).filter((file: IStudyCardFile) => file.status !== 'archived').map(fileKey));
  const duplicateFiles = (duplicate.files || []).filter((file: IStudyCardFile) => file.status !== 'archived');
  let changed = 0;

  for (const file of duplicateFiles) {
    const key = fileKey(file);
    if (!key || existingFileKeys.has(key)) continue;
    const fileWithToObject = file as IStudyCardFile & { toObject?: () => IStudyCardFile };
    parent.files.push(fileWithToObject.toObject ? fileWithToObject.toObject() : { ...file });
    existingFileKeys.add(key);
    changed += 1;
  }

  const children = await activeChildren(workspaceId, duplicate._id as Types.ObjectId);
  for (const child of children) {
    const collision = await StudyCard.findOne({
      workspaceId,
      parentId: parent._id,
      slug: child.slug,
      status: { $ne: 'archived' },
    });
    if (collision) continue;
    child.parentId = parent._id;
    await child.save();
    changed += 1;
  }

  if (changed) await parent.save();

  const remainingChildren = await StudyCard.countDocuments({
    workspaceId,
    parentId: duplicate._id,
    status: { $ne: 'archived' },
  });
  if (remainingChildren === 0) {
    duplicate.status = 'archived';
    duplicate.visibility = 'private';
    await duplicate.save();
    changed += 1;
  }

  return changed;
};

const ensurePath = async (workspaceId: Types.ObjectId, spec: PathSpec) => {
  let parentId: Types.ObjectId | null = null;
  let current: any = null;

  for (const [index, part] of spec.path.entries()) {
    const styleOverride = index === spec.path.length - 1 ? spec.style || {} : {};
    current = await ensureCard(workspaceId, parentId, part, index, (index + 1) * 10, styleOverride);
    await collapseSameNameChild(workspaceId, current);
    parentId = current._id as Types.ObjectId;
  }

  for (const [index, shelf] of (spec.shelves || []).entries()) {
    await ensureCard(workspaceId, parentId, shelf, spec.path.length, (index + 1) * 10, resourceShelfStyles[shelf] || {});
  }
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
  if (!workspace?._id) throw new Error('Study Hub workspace not found.');

  for (const [index, spec] of requiredPaths.entries()) {
    if (index + 1 < startFrom) continue;
    console.log(`[publish-required-study-paths] ${index + 1}/${requiredPaths.length}: ${spec.path.join(' / ')}`);
    await ensurePath(workspace._id as Types.ObjectId, spec);
  }

  console.log(`Published required Study Hub paths: ${requiredPaths.length}.`);
};

run()
  .catch((error) => {
    console.error('Publish required Study Hub paths failed:', error instanceof Error ? error.stack || error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
  });
