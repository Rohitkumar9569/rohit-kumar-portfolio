import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard from '../models/StudyCard';
import Workspace from '../models/Workspace';

const MONGO_URI = process.env.MONGO_URI;
const ROOT_WORKSPACE_SLUG = 'study-hub';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const cleanDisplayName = (value: string) => value.replace(/^\s*\d+\s*[.)-]\s*/g, '').trim();

const inferIconKey = (name: string, currentIcon = 'folder') => {
  const lower = name.toLowerCase();
  if (lower.includes('physics')) return 'physics';
  if (lower.includes('chemistry')) return 'chemistry';
  if (lower.includes('biology')) return 'biology';
  if (lower.includes('math')) return 'maths';
  if (lower.includes('computer') || lower.includes('coding')) return 'coding';
  if (lower.includes('aptitude') || lower.includes('csat')) return 'aptitude';
  if (lower.includes('paper') || lower.includes('pyq')) return 'pyq';
  if (lower.includes('note')) return 'notes';
  if (lower.includes('book')) return 'book';
  if (lower.includes('syllabus')) return 'syllabus';
  if (lower.includes('interview')) return 'interview';
  if (lower.includes('formula')) return 'formula';
  if (lower.includes('mind')) return 'mindmap';
  return currentIcon || 'folder';
};

const unwrapRedundantGateBranchCards = async (workspaceId: Types.ObjectId) => {
  void workspaceId;
  return 0;
};

const wrapUpscPaperCards = async (workspaceId: Types.ObjectId) => {
  const upscRoot = await StudyCard.findOne({
    workspaceId,
    parentId: null,
    slug: 'upsc-cse',
  });

  if (!upscRoot) return 0;

  let pyqCard = await StudyCard.findOne({
    workspaceId,
    parentId: upscRoot._id,
    slug: 'previous-year-papers',
  });

  if (!pyqCard) {
    pyqCard = await StudyCard.create({
      workspaceId,
      parentId: upscRoot._id,
      name: 'Previous Year Papers',
      slug: 'previous-year-papers',
      iconKey: 'pyq',
      tone: 'violet',
      order: 10,
      status: 'published',
      visibility: 'public',
      files: [],
    });
  } else {
    pyqCard.iconKey = 'pyq';
    pyqCard.tone = 'violet';
    pyqCard.order = pyqCard.order || 10;
    await pyqCard.save();
  }

  const paperNamePattern = /^(prelims|gs\s*paper|essay|optional|comp\.?\s*language|language)/i;
  const directChildren = await StudyCard.find({
    workspaceId,
    parentId: upscRoot._id,
    _id: { $ne: pyqCard._id },
  }).sort({ order: 1, name: 1 });

  let moved = 0;
  for (const child of directChildren) {
    if (!paperNamePattern.test(child.name)) continue;

    const duplicate = await StudyCard.findOne({
      workspaceId,
      parentId: pyqCard._id,
      slug: child.slug,
      _id: { $ne: child._id },
    }).select('_id').lean();

    if (duplicate) continue;

    child.parentId = pyqCard._id as Types.ObjectId;
    await child.save();
    moved += 1;
  }

  return moved;
};

const run = async () => {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is not defined.');
  }

  await mongoose.connect(MONGO_URI);

  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
  if (!workspace) {
    console.log('Study Hub workspace not found. Nothing to normalize.');
    return;
  }

  const workspaceId = workspace._id as Types.ObjectId;
  const rootCards = await StudyCard.find({ workspaceId, parentId: null }).sort({ name: 1 });

  for (let index = 0; index < rootCards.length; index += 1) {
    const card = rootCards[index];
    card.iconKey = 'heading';
    card.tone = 'indigo';
    card.status = card.status || 'published';
    card.visibility = card.visibility || 'public';
    card.order = (index + 1) * 10;
    await card.save();
  }

  const allCards = await StudyCard.find({ workspaceId });
  let cleanedCards = 0;
  for (const card of allCards) {
    if (!card.parentId) continue;

    const nextName = cleanDisplayName(card.name);
    const nextSlug = slugify(nextName);
    const nextIcon = inferIconKey(nextName, card.iconKey);

    if (!nextName || !nextSlug) continue;

    const hasChanges = nextName !== card.name || nextSlug !== card.slug || nextIcon !== card.iconKey;
    if (!hasChanges) continue;

    const duplicate = await StudyCard.findOne({
      _id: { $ne: card._id },
      workspaceId,
      parentId: card.parentId,
      slug: nextSlug,
    }).select('_id').lean();

    if (duplicate) continue;

    card.name = nextName;
    card.slug = nextSlug;
    card.iconKey = nextIcon;
    await card.save();
    cleanedCards += 1;
  }

  const unwrappedGateBranches = await unwrapRedundantGateBranchCards(workspaceId);
  const wrappedUpscPapers = await wrapUpscPaperCards(workspaceId);

  console.log(
    `Normalized ${rootCards.length} root Study Hub heading(s), cleaned ${cleanedCards} nested card(s), unwrapped ${unwrappedGateBranches} GATE branch wrapper(s), and moved ${wrappedUpscPapers} UPSC paper card(s) under PYQ.`
  );
};

run()
  .catch((error) => {
    console.error('Study card normalization failed:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
