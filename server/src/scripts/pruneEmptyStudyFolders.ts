import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard from '../models/StudyCard';
import Workspace from '../models/Workspace';

const ROOT_WORKSPACE_SLUG = 'study-hub';
const MONGO_URI = process.env.MONGO_URI;
const shouldApply = process.argv.includes('--apply');
const keepEmptyRoots = process.argv.includes('--keep-empty-roots');
const hardDeleteArchived = process.argv.includes('--hard-delete-archived');
const sampleLimitArg = process.argv.find((arg) => arg.startsWith('--sample-limit='));
const sampleLimit = Math.max(0, Math.min(50, Number(sampleLimitArg?.split('=').pop()) || 18));

type CardSnapshot = {
  _id: Types.ObjectId;
  parentId?: Types.ObjectId | null;
  name: string;
  slug: string;
  order: number;
  status: string;
  visibility: string;
  files?: Array<{ status?: string }>;
};

const normalizeNameKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const topLevelCategoryNames = [
  'Competitive Exams',
  'Entrance Exams',
  'School Boards',
  'State Exams',
  'University Exams',
  'Study Abroad',
  'Foreign Language',
  'Placement / Private',
  'Olympiads and Scholarships',
  'Government Jobs',
  'College',
];

const protectedRootKeys = new Set(topLevelCategoryNames.map(normalizeNameKey));

const exactOrder = new Map<string, number>([
  ['competitive exams', 10],
  ['entrance exams', 20],
  ['school boards', 30],
  ['state exams', 40],
  ['university exams', 50],
  ['study abroad', 60],
  ['foreign language', 70],
  ['placement private', 80],
  ['placement and private', 80],
  ['olympiads and scholarships', 90],
  ['government jobs', 100],
  ['college', 110],
  ['overview', 5],
  ['about', 5],
  ['board pattern', 8],
  ['syllabus', 10],
  ['ncert books', 20],
  ['textbooks', 20],
  ['board textbooks', 20],
  ['books', 20],
  ['ncert solutions', 30],
  ['study material', 40],
  ['study materials', 40],
  ['revision notes', 50],
  ['notes', 50],
  ['previous year papers', 60],
  ['previous year paper', 60],
  ['pyq', 60],
  ['pyqs', 60],
  ['sample papers', 70],
  ['mock tests', 75],
  ['practice questions', 80],
  ['practice', 80],
  ['important questions', 85],
  ['ncert exemplar', 90],
  ['formula sheets', 95],
  ['answer keys', 100],
  ['answer key', 100],
  ['marking schemes', 105],
  ['updates', 110],
  ['strategy', 120],
  ['interview', 130],
  ['common resources', 10000],
]);

const branchOrderHints: Array<[RegExp, number]> = [
  [/\bsyllabus\b/, 10],
  [/\bncert\b.*\bbooks?\b|\btextbooks?\b|\bbooks?\b/, 20],
  [/\bncert\b.*\bsolutions?\b|\bsolutions?\b/, 30],
  [/\bstudy materials?\b|\bmaterials?\b/, 40],
  [/\brevision\b|\bnotes?\b/, 50],
  [/\bprevious year\b|\bpyq\b|\bpast papers?\b|\bquestion papers?\b/, 60],
  [/\bsample papers?\b/, 70],
  [/\bmock tests?\b/, 75],
  [/\bpractice\b/, 80],
  [/\bimportant questions?\b/, 85],
  [/\bexemplar\b/, 90],
  [/\bformula\b/, 95],
  [/\banswer keys?\b/, 100],
  [/\bmarking schemes?\b/, 105],
  [/\bupdates?\b|\bnotification\b/, 110],
  [/\bstrategy\b/, 120],
  [/\binterview\b/, 130],
];

const getBranchOrder = (name: string) => {
  const key = normalizeNameKey(name);
  const classMatch = key.match(/^class\s+(\d{1,2})$/);
  if (classMatch) return 100 + Number(classMatch[1]);

  const yearMatch = key.match(/^(?:year\s*)?(\d{4})$/);
  if (yearMatch) return 200 + (3000 - Number(yearMatch[1]));

  const exact = exactOrder.get(key);
  if (typeof exact === 'number') return exact;

  const hint = branchOrderHints.find(([pattern]) => pattern.test(key));
  if (hint) return hint[1];

  return 500;
};

const getCardId = (card: CardSnapshot) => card._id.toString();

const getParentKey = (parentId?: Types.ObjectId | null) => parentId?.toString() || 'root';

const getResourceFileCount = (card: CardSnapshot) =>
  (card.files || []).filter((file) => (file.status || 'published') !== 'archived').length;

const getAnyFileCount = (card: CardSnapshot) => (card.files || []).length;

const isProtectedRoot = (card: CardSnapshot) =>
  keepEmptyRoots && !card.parentId && protectedRootKeys.has(normalizeNameKey(card.name));

const getLibraryTotals = (cards: CardSnapshot[]) => {
  const childCounts = new Map<string, number>();
  for (const card of cards) {
    const parentKey = getParentKey(card.parentId);
    childCounts.set(parentKey, (childCounts.get(parentKey) || 0) + 1);
  }

  const totalFiles = cards.reduce((sum, card) => sum + getResourceFileCount(card), 0);
  const emptyLeafFolders = cards.filter((card) => (
    getResourceFileCount(card) === 0 &&
    (childCounts.get(getCardId(card)) || 0) === 0
  )).length;

  return {
    activeFolders: cards.length,
    totalFiles,
    emptyLeafFolders,
  };
};

const buildSnapshot = (cards: CardSnapshot[], countFiles = getResourceFileCount) => {
  const cardById = new Map(cards.map((card) => [getCardId(card), card]));
  const childrenByParent = new Map<string, CardSnapshot[]>();

  for (const card of cards) {
    const parentKey = getParentKey(card.parentId);
    const siblings = childrenByParent.get(parentKey) || [];
    siblings.push(card);
    childrenByParent.set(parentKey, siblings);
  }

  const pathMemo = new Map<string, string[]>();
  const cycleIds = new Set<string>();

  const getPathParts = (card: CardSnapshot, visiting = new Set<string>()): string[] => {
    const id = getCardId(card);
    const cached = pathMemo.get(id);
    if (cached) return cached;
    if (visiting.has(id)) {
      cycleIds.add(id);
      return ['Cycle Detected', card.name || id];
    }

    visiting.add(id);
    const parent = card.parentId ? cardById.get(card.parentId.toString()) : null;
    const parts = parent ? [...getPathParts(parent, visiting), card.name] : [card.name];
    visiting.delete(id);
    pathMemo.set(id, parts);
    return parts;
  };

  const subtreeFileCountMemo = new Map<string, number>();
  const getSubtreeFileCount = (card: CardSnapshot, visiting = new Set<string>()): number => {
    const id = getCardId(card);
    const cached = subtreeFileCountMemo.get(id);
    if (typeof cached === 'number') return cached;
    if (visiting.has(id)) {
      cycleIds.add(id);
      return 1;
    }

    visiting.add(id);
    const ownFiles = countFiles(card);
    const childFiles = (childrenByParent.get(id) || [])
      .reduce((sum, child) => sum + getSubtreeFileCount(child, visiting), 0);
    visiting.delete(id);

    const total = ownFiles + childFiles;
    subtreeFileCountMemo.set(id, total);
    return total;
  };

  return {
    cardById,
    childrenByParent,
    cycleIds,
    getPathParts,
    getSubtreeFileCount,
  };
};

const collectArchiveCandidates = (cards: CardSnapshot[]) => {
  const snapshot = buildSnapshot(cards);
  const candidates = cards.filter((card) => (
    !isProtectedRoot(card) &&
    snapshot.getSubtreeFileCount(card) === 0
  ));

  candidates.sort((a, b) => {
    const aPath = snapshot.getPathParts(a);
    const bPath = snapshot.getPathParts(b);
    return aPath.length - bPath.length || aPath.join(' / ').localeCompare(bPath.join(' / '));
  });

  return { candidates, snapshot };
};

const collectHardDeleteCandidates = (cards: CardSnapshot[]) => {
  const snapshot = buildSnapshot(cards, getAnyFileCount);
  const activeDescendantMemo = new Map<string, boolean>();

  const hasActiveDescendant = (card: CardSnapshot, visiting = new Set<string>()): boolean => {
    const id = getCardId(card);
    const cached = activeDescendantMemo.get(id);
    if (typeof cached === 'boolean') return cached;
    if (visiting.has(id)) return true;

    visiting.add(id);
    const result = (snapshot.childrenByParent.get(id) || []).some((child) => (
      child.status !== 'archived' || hasActiveDescendant(child, visiting)
    ));
    visiting.delete(id);
    activeDescendantMemo.set(id, result);
    return result;
  };

  const candidates = cards.filter((card) => (
    card.status === 'archived' &&
    snapshot.getSubtreeFileCount(card) === 0 &&
    !hasActiveDescendant(card)
  ));

  candidates.sort((a, b) => {
    const aPath = snapshot.getPathParts(a);
    const bPath = snapshot.getPathParts(b);
    return aPath.length - bPath.length || aPath.join(' / ').localeCompare(bPath.join(' / '));
  });

  return { candidates, snapshot };
};

const getSortOperations = (cards: CardSnapshot[]) => {
  const { childrenByParent } = buildSnapshot(cards);
  const operations: Array<{ updateOne: { filter: { _id: Types.ObjectId }; update: { $set: { order: number } } } }> = [];

  for (const siblings of childrenByParent.values()) {
    siblings.sort((a, b) =>
      getBranchOrder(a.name) - getBranchOrder(b.name) ||
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    siblings.forEach((sibling, index) => {
      const nextOrder = (index + 1) * 10;
      if (sibling.order === nextOrder) return;
      operations.push({
        updateOne: {
          filter: { _id: sibling._id },
          update: { $set: { order: nextOrder } },
        },
      });
    });
  }

  return operations;
};

const formatTotals = (label: string, cards: CardSnapshot[]) => {
  const totals = getLibraryTotals(cards);
  return `${label}: ${totals.activeFolders} folders, ${totals.totalFiles} files, ${totals.emptyLeafFolders} empty leaf folders`;
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');

  console.log(
    hardDeleteArchived
      ? `${shouldApply ? 'Applying' : 'Dry run'} permanent delete for archived empty Study Hub folders.`
      : `${shouldApply ? 'Applying' : 'Dry run'} recursive empty Study Hub folder cleanup.`
  );
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });

  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean<{ _id: Types.ObjectId }>();
  if (!workspace) throw new Error('Study Hub workspace not found.');

  if (hardDeleteArchived) {
    const cards = await StudyCard.find({ workspaceId: workspace._id })
      .select('_id parentId name slug order status visibility files.status')
      .lean<CardSnapshot[]>();
    const { candidates, snapshot } = collectHardDeleteCandidates(cards);
    const archivedCount = cards.filter((card) => card.status === 'archived').length;

    console.log(`Archived folders in workspace: ${archivedCount}.`);
    console.log(`${shouldApply ? 'Deleting' : 'Would delete'} ${candidates.length} archived empty folder(s)/branch node(s).`);
    if (sampleLimit && candidates.length) {
      console.log('Sample hard-delete folders:');
      candidates.slice(0, sampleLimit).forEach((card) => {
        console.log(`- ${snapshot.getPathParts(card).join(' / ')}`);
      });
    }

    if (shouldApply && candidates.length) {
      await StudyCard.deleteMany({
        workspaceId: workspace._id,
        _id: { $in: candidates.map((card) => card._id) },
      });
    }

    const remainingArchived = shouldApply
      ? await StudyCard.countDocuments({ workspaceId: workspace._id, status: 'archived' })
      : archivedCount;
    console.log(`Archived folders remaining${shouldApply ? '' : ' after dry-run'}: ${remainingArchived}.`);
    console.log(shouldApply ? 'Permanent archived-folder cleanup complete.' : 'Dry run only. Re-run with --apply to delete these archived folders.');
    return;
  }

  if (keepEmptyRoots) {
    console.log('Keeping empty top-level catalog categories because --keep-empty-roots was passed.');
  }

  const cards = await StudyCard.find({
    workspaceId: workspace._id,
    status: { $ne: 'archived' },
  })
    .select('_id parentId name slug order status visibility files.status')
    .lean<CardSnapshot[]>();

  const { candidates, snapshot } = collectArchiveCandidates(cards);
  const candidateIds = new Set(candidates.map(getCardId));
  const remainingCards = cards.filter((card) => !candidateIds.has(getCardId(card)));
  const sortOperations = getSortOperations(remainingCards);

  console.log(formatTotals('Before', cards));
  console.log(`${shouldApply ? 'Archiving' : 'Would archive'} ${candidates.length} empty folder(s)/branch node(s).`);
  console.log(`${shouldApply ? 'Sorting' : 'Would sort'} ${sortOperations.length} folder order value(s).`);

  if (sampleLimit && candidates.length) {
    console.log('Sample empty folders:');
    candidates.slice(0, sampleLimit).forEach((card) => {
      console.log(`- ${snapshot.getPathParts(card).join(' / ')}`);
    });
  }

  if (snapshot.cycleIds.size) {
    console.log(`Skipped/protected ${snapshot.cycleIds.size} cyclic folder reference(s); repair cycles before pruning them.`);
  }

  if (shouldApply) {
    if (candidates.length) {
      await StudyCard.updateMany(
        {
          workspaceId: workspace._id,
          _id: { $in: candidates.map((card) => card._id) },
        },
        {
          $set: {
            status: 'archived',
            visibility: 'private',
          },
        },
        { runValidators: true }
      );
    }

    if (sortOperations.length) {
      await StudyCard.bulkWrite(sortOperations, { ordered: false });
    }

    const refreshedCards = await StudyCard.find({
      workspaceId: workspace._id,
      status: { $ne: 'archived' },
    })
      .select('_id parentId name slug order status visibility files.status')
      .lean<CardSnapshot[]>();

    console.log(formatTotals('After', refreshedCards));
    console.log('Empty folder cleanup complete.');
    return;
  }

  console.log(formatTotals('After dry-run', remainingCards));
  console.log('Dry run only. Re-run with --apply to archive these empty folders.');
};

run()
  .catch((error) => {
    console.error('Empty Study Hub folder cleanup failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
