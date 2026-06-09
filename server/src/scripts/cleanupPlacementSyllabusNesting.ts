import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard, { type IStudyCard, type IStudyCardFile } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const ROOT_WORKSPACE_SLUG = 'study-hub';
const MONGO_URI = process.env.MONGO_URI;
const shouldApply = process.argv.includes('--apply');

type CardDoc = mongoose.Document<unknown, unknown, IStudyCard> & IStudyCard;

const targetPath = [
  'Placement / Private',
  'Common Preparation',
  'DSA & Placement Prep',
  'Syllabus',
];

const activeFilter = (workspaceId: Types.ObjectId) => ({
  workspaceId,
  status: { $ne: 'archived' },
});

const getActiveChildren = (workspaceId: Types.ObjectId, parentId: Types.ObjectId) =>
  StudyCard.find({ ...activeFilter(workspaceId), parentId }).sort({ order: 1, name: 1 });

const findChildByName = async (workspaceId: Types.ObjectId, parentId: Types.ObjectId | null, name: string) =>
  StudyCard.findOne({ ...activeFilter(workspaceId), parentId, name });

const resolveTargetShelf = async (workspaceId: Types.ObjectId) => {
  let current = await findChildByName(workspaceId, null, targetPath[0]);

  for (const name of targetPath.slice(1)) {
    if (!current) return null;
    current = await findChildByName(workspaceId, current._id, name);
  }

  return current;
};

const collectDescendants = async (workspaceId: Types.ObjectId, parentId: Types.ObjectId) => {
  const result: CardDoc[] = [];
  const stack = await getActiveChildren(workspaceId, parentId);

  while (stack.length) {
    const card = stack.shift();
    if (!card) continue;

    result.push(card);
    const children = await getActiveChildren(workspaceId, card._id);
    stack.push(...children);
  }

  return result;
};

const activeFiles = (card: CardDoc) =>
  (card.files || []).filter((file) => file.status !== 'archived');

const fileKey = (file: IStudyCardFile) =>
  `${(file.url || '').trim().toLowerCase()}::${(file.name || '').trim().toLowerCase()}`;

const mergeFilesIntoTarget = async (target: CardDoc, descendants: CardDoc[]) => {
  const existingKeys = new Set(activeFiles(target).map(fileKey));
  const filesToMove: IStudyCardFile[] = [];

  for (const card of descendants) {
    for (const file of activeFiles(card)) {
      const key = fileKey(file);
      if (!key || existingKeys.has(key)) continue;

      existingKeys.add(key);
      const fileWithToObject = file as IStudyCardFile & { toObject?: () => IStudyCardFile };
      filesToMove.push(fileWithToObject.toObject ? fileWithToObject.toObject() : { ...file });
    }
  }

  if (shouldApply && filesToMove.length) {
    target.files.push(...filesToMove);
    await target.save();
  }

  return filesToMove.length;
};

const archiveDescendants = async (descendants: CardDoc[]) => {
  let archived = 0;

  for (const card of [...descendants].reverse()) {
    const isSyllabusWrapper = /syllabus/i.test(card.name);
    if (!isSyllabusWrapper) continue;

    if (shouldApply) {
      card.status = 'archived';
      card.visibility = 'private';
      await card.save();
    }

    archived += 1;
  }

  return archived;
};

const main = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not configured');

  console.log(`[cleanup-placement-syllabus] ${shouldApply ? 'apply mode' : 'dry run only; use --apply to write changes'}`);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });

  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
  if (!workspace?._id) throw new Error(`Workspace not found: ${ROOT_WORKSPACE_SLUG}`);

  const workspaceId = workspace._id as Types.ObjectId;
  const target = await resolveTargetShelf(workspaceId);
  if (!target) throw new Error(`Target shelf not found: ${targetPath.join(' / ')}`);

  const descendants = await collectDescendants(workspaceId, target._id);
  const movableFileCount = descendants.reduce((count, card) => count + activeFiles(card).length, 0);
  const moved = await mergeFilesIntoTarget(target, descendants);
  const archived = await archiveDescendants(descendants);

  console.log(`Target: ${targetPath.join(' / ')}`);
  console.log(`Descendants scanned: ${descendants.length}. Active files found: ${movableFileCount}.`);
  console.log(`${shouldApply ? 'Moved' : 'Would move'} files: ${moved}.`);
  console.log(`${shouldApply ? 'Archived' : 'Would archive'} nested syllabus wrappers: ${archived}.`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
  });
