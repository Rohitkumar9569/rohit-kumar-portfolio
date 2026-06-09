import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard, { type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const MONGO_URI = process.env.MONGO_URI;
const ROOT_WORKSPACE_SLUG = 'study-hub';
const shouldApply = process.argv.includes('--apply');

type EssentialBranch = {
  name: string;
  slug: string;
  iconKey: string;
  tone: StudyCardTone;
  order: number;
};

const essentialBranches: EssentialBranch[] = [
  { name: 'Syllabus', slug: 'syllabus', iconKey: 'syllabus', tone: 'cyan', order: 10 },
  { name: 'Previous Year Papers', slug: 'previous-year-papers', iconKey: 'pyq', tone: 'violet', order: 20 },
  { name: 'Study Material', slug: 'study-material', iconKey: 'material', tone: 'emerald', order: 30 },
];

const batch = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
  if (!workspace) throw new Error('Study Hub workspace not found.');

  const workspaceId = workspace._id as Types.ObjectId;
  const parentCards = await StudyCard.find({
    workspaceId,
    status: { $ne: 'archived' },
    goalType: { $in: ['exam', 'class'] },
  }).select('_id name goalType').lean();

  const parentIds = parentCards.map((card: any) => card._id as Types.ObjectId);
  const essentialSlugs = essentialBranches.map((branch) => branch.slug);
  const existingChildren = parentIds.length
    ? await StudyCard.find({
      workspaceId,
      parentId: { $in: parentIds },
      status: { $ne: 'archived' },
      slug: { $in: essentialSlugs },
    }).select('parentId slug').lean()
    : [];

  const existingByParent = new Map<string, Set<string>>();
  for (const child of existingChildren as any[]) {
    const parentKey = String(child.parentId);
    const slugs = existingByParent.get(parentKey) || new Set<string>();
    slugs.add(child.slug);
    existingByParent.set(parentKey, slugs);
  }

  const missing = parentCards.flatMap((parent: any) => {
    const existing = existingByParent.get(String(parent._id)) || new Set<string>();
    return essentialBranches
      .filter((branch) => !existing.has(branch.slug))
      .map((branch) => ({ parent, branch }));
  });

  console.log(`${shouldApply ? 'Applying' : 'Dry run'} essential Study Hub branches.`);
  console.log(`Parents checked: ${parentCards.length}. Missing folders: ${missing.length}.`);

  if (!shouldApply || missing.length === 0) return;

  let processed = 0;
  for (const chunk of batch(missing, 500)) {
    await StudyCard.bulkWrite(
      chunk.map(({ parent, branch }) => ({
        updateOne: {
          filter: {
            workspaceId,
            parentId: parent._id,
            slug: branch.slug,
          },
          update: {
            $set: {
              workspaceId,
              parentId: parent._id,
              name: branch.name,
              slug: branch.slug,
              iconKey: branch.iconKey,
              goalType: 'resource_folder',
              tone: branch.tone,
              order: branch.order,
              status: 'published',
              visibility: 'public',
            },
            $setOnInsert: {
              files: [],
            },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );
    processed += chunk.length;
    console.log(`Progress ${processed}/${missing.length}`);
  }

  console.log(`Essential branches ensured. Upserted/verified: ${missing.length}.`);
};

run()
  .catch((error) => {
    console.error('Essential Study Hub branch ensure failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
