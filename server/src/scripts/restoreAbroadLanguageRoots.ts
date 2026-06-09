import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard, { type StudyCardGoalType, type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const MONGO_URI = process.env.MONGO_URI;
const ROOT_WORKSPACE_SLUG = 'study-hub';

type NodeSpec = {
  name: string;
  order?: number;
  iconKey?: string;
  tone?: StudyCardTone;
  goalType?: StudyCardGoalType;
  children?: NodeSpec[];
};

const slugify = (value: string, fallback = 'item') =>
  value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '') || fallback;

const resourceShelves: NodeSpec[] = [
  { name: 'Syllabus', iconKey: 'syllabus', tone: 'amber', goalType: 'resource_folder' },
  { name: 'Previous Year Papers', iconKey: 'pyq', tone: 'violet', goalType: 'resource_folder' },
  { name: 'Study Material', iconKey: 'material', tone: 'emerald', goalType: 'resource_folder' },
  { name: 'Practice', iconKey: 'practice', tone: 'indigo', goalType: 'resource_folder' },
  { name: 'Updates', iconKey: 'updates', tone: 'amber', goalType: 'resource_folder' },
];

const roots: NodeSpec[] = [
  {
    name: 'Entrance Exams',
    order: 20,
    iconKey: 'entrance',
    tone: 'violet',
    goalType: 'exam_category',
    children: [
      {
        name: 'Management',
        iconKey: 'management',
        tone: 'indigo',
        goalType: 'exam_family',
        children: ['CAT', 'CMAT', 'IIFT', 'MAH MBA CET', 'MAT', 'NMAT', 'SNAP', 'XAT'].map((name) => ({
          name,
          iconKey: 'management',
          tone: 'indigo' as StudyCardTone,
          goalType: 'exam' as StudyCardGoalType,
          children: resourceShelves,
        })),
      },
      {
        name: 'Law',
        iconKey: 'law',
        tone: 'amber',
        goalType: 'exam_family',
        children: ['AILET', 'CLAT', 'LSAT India', 'MH CET Law', 'SLAT'].map((name) => ({
          name,
          iconKey: 'law',
          tone: 'amber' as StudyCardTone,
          goalType: 'exam' as StudyCardGoalType,
          children: resourceShelves,
        })),
      },
      {
        name: 'Professional Certifications',
        iconKey: 'certificate',
        tone: 'cyan',
        goalType: 'exam_family',
        children: ['CA Foundation', 'CA Intermediate', 'CA Final', 'CS Executive Professional'].map((name) => ({
          name,
          iconKey: 'certificate',
          tone: 'cyan' as StudyCardTone,
          goalType: 'exam' as StudyCardGoalType,
          children: resourceShelves,
        })),
      },
    ],
  },
  {
    name: 'University Exams',
    order: 50,
    iconKey: 'university',
    tone: 'cyan',
    goalType: 'exam_category',
    children: [
      {
        name: 'Common Entrances',
        iconKey: 'university',
        tone: 'cyan',
        goalType: 'exam_family',
        children: ['CUET UG', 'CUET PG', 'IIT JAM', 'JEST', 'TIFR GS'].map((name) => ({
          name,
          iconKey: 'university',
          tone: 'cyan' as StudyCardTone,
          goalType: 'exam' as StudyCardGoalType,
          children: [{ name: 'Overview', iconKey: 'overview', tone: 'slate' as StudyCardTone, goalType: 'resource_folder' as StudyCardGoalType }, ...resourceShelves],
        })),
      },
    ],
  },
  {
    name: 'Study Abroad',
    order: 60,
    iconKey: 'abroad',
    tone: 'cyan',
    goalType: 'exam_category',
    children: ['GRE', 'GMAT', 'SAT', 'ACT', 'MCAT', 'LSAT', 'USMLE', 'UCAT', 'LNAT', 'GAMSAT', 'TOEFL'].map((name) => ({
      name,
      iconKey: 'abroad',
      tone: 'cyan' as StudyCardTone,
      goalType: 'exam' as StudyCardGoalType,
      children: resourceShelves,
    })),
  },
  {
    name: 'Foreign Language',
    order: 70,
    iconKey: 'language',
    tone: 'rose',
    goalType: 'exam_category',
    children: [
      { name: 'English Speaking', children: resourceShelves },
      { name: 'English Tests', children: [{ name: 'IELTS', children: resourceShelves }] },
      { name: 'French', children: resourceShelves },
      { name: 'German', children: resourceShelves },
      { name: 'Japanese', children: resourceShelves },
      { name: 'Korean', children: resourceShelves },
      { name: 'Spanish', children: resourceShelves },
    ].map((node) => ({
      iconKey: node.name === 'English Speaking' || node.name === 'English Tests' ? 'english' : 'language',
      tone: node.name === 'English Speaking' || node.name === 'English Tests' ? 'cyan' as StudyCardTone : 'rose' as StudyCardTone,
      goalType: 'exam' as StudyCardGoalType,
      ...node,
    })),
  },
];

const styleFor = (node: NodeSpec, depth: number, order: number) => ({
  goalType: node.goalType || (depth === 0 ? 'exam_category' : 'exam'),
  iconKey: node.iconKey || (depth === 0 ? 'folder' : 'book'),
  tone: node.tone || 'cyan',
  order: node.order ?? order,
  status: 'published',
  visibility: 'public',
});

const ensureNode = async (workspaceId: Types.ObjectId, parentId: Types.ObjectId | null, node: NodeSpec, depth: number, order: number) => {
  const slug = slugify(node.name);
  const style = styleFor(node, depth, order);
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
  card.name = node.name;
  card.slug = slug;
  card.goalType = style.goalType;
  card.iconKey = style.iconKey;
  card.tone = style.tone;
  card.order = style.order;
  card.status = 'published';
  card.visibility = 'public';
  await card.save();

  for (const [index, child] of (node.children || []).entries()) {
    await ensureNode(workspaceId, card._id as Types.ObjectId, child, depth + 1, (index + 1) * 10);
  }
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
  if (!workspace?._id) throw new Error('Study Hub workspace not found.');

  for (const [index, root] of roots.entries()) {
    await ensureNode(workspace._id as Types.ObjectId, null, root, 0, root.order ?? (index + 6) * 10);
  }

  console.log('Remaining entrance, university, Study Abroad, and Foreign Language branches restored.');
};

run()
  .catch((error) => {
    console.error('Abroad/language root restore failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
