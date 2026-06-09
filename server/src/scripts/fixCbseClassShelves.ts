import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard, { type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const MONGO_URI = process.env.MONGO_URI;
const ROOT_WORKSPACE_SLUG = 'study-hub';
const shouldApply = process.argv.includes('--apply');
const verifyOnly = process.argv.includes('--verify');

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

const classNamePattern = /^class\s+(?:[1-9]|1[0-2])$/i;

const slugify = (value: string, fallback = 'item') => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '');
  return slug || fallback;
};

const getFileCount = (card: any) =>
  Array.isArray(card.files)
    ? card.files.filter((file: any) => file?.status !== 'archived').length
    : 0;

const findActiveChild = (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId,
  slug: string
) => StudyCard.findOne({ workspaceId, parentId, slug, status: { $ne: 'archived' } });

const findAnyChild = (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId,
  slug: string
) => StudyCard.findOne({ workspaceId, parentId, slug });

const ensureCommonResources = async (workspaceId: Types.ObjectId, boardRoot: any) => {
  const slug = 'common-resources';
  const existing = await findAnyChild(workspaceId, boardRoot._id, slug);
  if (existing) {
    if (existing.status === 'archived' && shouldApply) {
      existing.status = 'published';
      existing.visibility = 'public';
      await existing.save();
    }
    return existing;
  }

  if (!shouldApply) {
    return {
      _id: new Types.ObjectId(),
      name: 'Common Resources',
      slug,
    };
  }

  return StudyCard.create({
    workspaceId,
    parentId: boardRoot._id,
    name: 'Common Resources',
    slug,
    iconKey: 'folder',
    goalType: 'resource_folder',
    tone: 'slate',
    order: 40,
    status: 'published',
    visibility: 'public',
    files: [],
  });
};

const ensureClassShelf = async (
  workspaceId: Types.ObjectId,
  classCard: any,
  branch: EssentialBranch
) => {
  const active = await findActiveChild(workspaceId, classCard._id, branch.slug);
  if (active) return { created: false, restored: false };

  const archived = await findAnyChild(workspaceId, classCard._id, branch.slug);
  if (archived) {
    if (shouldApply) {
      archived.name = branch.name;
      archived.iconKey = branch.iconKey;
      archived.goalType = 'resource_folder';
      archived.tone = branch.tone;
      archived.order = branch.order;
      archived.status = 'published';
      archived.visibility = 'public';
      await archived.save();
    }
    return { created: false, restored: true };
  }

  if (shouldApply) {
    await StudyCard.create({
      workspaceId,
      parentId: classCard._id,
      name: branch.name,
      slug: branch.slug,
      iconKey: branch.iconKey,
      goalType: 'resource_folder',
      tone: branch.tone,
      order: branch.order,
      status: 'published',
      visibility: 'public',
      files: [],
    });
  }

  return { created: true, restored: false };
};

const handleRootShelf = async (
  workspaceId: Types.ObjectId,
  boardRoot: any,
  shelf: any
) => {
  const childCount = await StudyCard.countDocuments({
    workspaceId,
    parentId: shelf._id,
    status: { $ne: 'archived' },
  });
  const fileCount = getFileCount(shelf);

  if (!childCount && !fileCount) {
    if (shouldApply) {
      shelf.status = 'archived';
      await shelf.save();
    }
    return { archived: 1, moved: 0, skipped: 0 };
  }

  const commonResources = await ensureCommonResources(workspaceId, boardRoot);
  const collision = await findActiveChild(workspaceId, commonResources._id, shelf.slug);

  if (!collision && shouldApply) {
    shelf.parentId = commonResources._id;
    shelf.order = shelf.order || 0;
    await shelf.save();
    return { archived: 0, moved: 1, skipped: 0 };
  }

  if (!collision && !shouldApply) return { archived: 0, moved: 1, skipped: 0 };
  return { archived: 0, moved: 0, skipped: 1 };
};

const getSchoolBoardRoots = async (workspaceId: Types.ObjectId) => {
  const roots = await StudyCard.find({
    workspaceId,
    status: { $ne: 'archived' },
    $or: [
      { slug: 'cbse' },
      { slug: 'icse-isc' },
      { slug: 'cisce' },
      { name: /^CBSE$/i },
      { name: /^Central Board of Secondary Education$/i },
      { name: /^ICSE\s*\/\s*ISC$/i },
      { name: /^ICSE\s+ISC$/i },
      { name: /^CISCE$/i },
    ],
  });
  return Array.from(new Map(roots.map((root) => [root._id.toString(), root])).values());
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
  if (!workspace) throw new Error('Study Hub workspace not found.');

  const workspaceId = workspace._id as Types.ObjectId;
  const boardRoots = await getSchoolBoardRoots(workspaceId);

  let classFolders = 0;
  let createdShelves = 0;
  let restoredShelves = 0;
  let archivedRootShelves = 0;
  let movedRootShelves = 0;
  let skippedRootShelves = 0;
  let activeRootShelvesAfter = 0;
  let missingClassShelvesAfter = 0;

  console.log(`${verifyOnly ? 'Verifying' : shouldApply ? 'Applying' : 'Dry run'} school-board class shelf cleanup.`);
  console.log(`School-board roots found: ${boardRoots.length}.`);

  for (const boardRoot of boardRoots) {
    const classes = await StudyCard.find({
      workspaceId,
      parentId: boardRoot._id,
      status: { $ne: 'archived' },
      name: classNamePattern,
    }).sort({ order: 1, name: 1 });
    classFolders += classes.length;

    for (const classCard of classes) {
      if (shouldApply && classCard.goalType !== 'class') {
        classCard.goalType = 'class';
        classCard.slug = classCard.slug || slugify(classCard.name);
        await classCard.save();
      }

      for (const branch of essentialBranches) {
        const result = await ensureClassShelf(workspaceId, classCard, branch);
        if (result.created) createdShelves += 1;
        if (result.restored) restoredShelves += 1;
      }
    }

    const rootShelves = await StudyCard.find({
      workspaceId,
      parentId: boardRoot._id,
      status: { $ne: 'archived' },
      slug: { $in: essentialBranches.map((branch) => branch.slug) },
    });

    for (const shelf of rootShelves) {
      const result = await handleRootShelf(workspaceId, boardRoot, shelf);
      archivedRootShelves += result.archived;
      movedRootShelves += result.moved;
      skippedRootShelves += result.skipped;
    }

    activeRootShelvesAfter += await StudyCard.countDocuments({
      workspaceId,
      parentId: boardRoot._id,
      status: { $ne: 'archived' },
      slug: { $in: essentialBranches.map((branch) => branch.slug) },
    });

    const refreshedClasses = await StudyCard.find({
      workspaceId,
      parentId: boardRoot._id,
      status: { $ne: 'archived' },
      name: classNamePattern,
    }).select('_id').lean();

    for (const classCard of refreshedClasses as any[]) {
      const classShelfCount = await StudyCard.countDocuments({
        workspaceId,
        parentId: classCard._id,
        status: { $ne: 'archived' },
        slug: { $in: essentialBranches.map((branch) => branch.slug) },
      });
      missingClassShelvesAfter += Math.max(0, essentialBranches.length - classShelfCount);
    }
  }

  console.log(`Class folders checked: ${classFolders}.`);
  console.log(`Class shelves created: ${createdShelves}. Restored: ${restoredShelves}.`);
  console.log(`Root shelves archived: ${archivedRootShelves}. Moved to Common Resources: ${movedRootShelves}. Skipped: ${skippedRootShelves}.`);
  console.log(`Active root-level school-board core shelves after check: ${activeRootShelvesAfter}.`);
  console.log(`Missing class-level core shelves after check: ${missingClassShelvesAfter}.`);
};

run()
  .catch((error) => {
    console.error('School-board class shelf cleanup failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
