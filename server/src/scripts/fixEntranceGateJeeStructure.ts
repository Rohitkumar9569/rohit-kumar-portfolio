import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard, { type StudyCardGoalType, type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';
import { gateTestPapers, getGatePaperBranchName, type GateTestPaper } from './studyHubEntranceSpecs';

const ROOT_WORKSPACE_SLUG = 'study-hub';
const MONGO_URI = process.env.MONGO_URI;
const shouldApply = process.argv.includes('--apply');

type CardDoc = any;

type CardStyle = {
  goalType?: StudyCardGoalType;
  iconKey?: string;
  tone?: StudyCardTone;
  order?: number;
};

const stats = {
  created: 0,
  moved: 0,
  merged: 0,
  renamed: 0,
  deleted: 0,
  archived: 0,
  styled: 0,
  filesMoved: 0,
};

const normalizeNameKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const compactName = (value = '') => value.replace(/\s+/g, ' ').trim();

const slugify = (value: string, fallback = 'item') => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || fallback;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const objectIdKey = (value?: Types.ObjectId | string | null) => (value ? String(value) : '');

const sameId = (left?: Types.ObjectId | string | null, right?: Types.ObjectId | string | null) =>
  objectIdKey(left) === objectIdKey(right);

const activeCardFilter = (workspaceId: Types.ObjectId) => ({
  workspaceId,
  status: { $ne: 'archived' },
});

const getChildren = (workspaceId: Types.ObjectId, parentId: Types.ObjectId | null) =>
  StudyCard.find({ ...activeCardFilter(workspaceId), parentId }).sort({ order: 1, name: 1 });

const markStyled = async (card: CardDoc, style: CardStyle = {}) => {
  let changed = false;
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined) continue;
    if (card[key] !== value) {
      card[key] = value;
      changed = true;
    }
  }
  if (card.status !== 'published') {
    card.status = 'published';
    changed = true;
  }
  if (card.visibility !== 'public') {
    card.visibility = 'public';
    changed = true;
  }
  if (!changed) return false;
  stats.styled += 1;
  if (shouldApply) await card.save();
  return true;
};

const ensureCard = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  name: string,
  style: Required<CardStyle>
) => {
  const cleanName = compactName(name);
  const slug = slugify(cleanName);
  let card: CardDoc | null = await StudyCard.findOne({ workspaceId, parentId, slug });

  if (!card) {
    stats.created += 1;
    card = new StudyCard({
      workspaceId,
      parentId,
      name: cleanName,
      slug,
      goalType: style.goalType,
      iconKey: style.iconKey,
      tone: style.tone,
      order: style.order,
      status: 'published',
      visibility: 'public',
      files: [],
    });
    if (shouldApply) await card.save();
    return card;
  }

  let changed = false;
  if (card.name !== cleanName) {
    card.name = cleanName;
    changed = true;
  }
  if (card.status === 'archived') {
    card.status = 'published';
    card.visibility = 'public';
    changed = true;
  }
  for (const [key, value] of Object.entries(style)) {
    const mutableCard = card as any;
    if (mutableCard[key] !== value) {
      mutableCard[key] = value;
      changed = true;
    }
  }
  if (changed) {
    stats.styled += 1;
    if (shouldApply) await card.save();
  }
  return card;
};

const sanitizeFilePayload = (file: any) => {
  const payload = typeof file?.toObject === 'function' ? file.toObject() : { ...file };
  delete payload.__v;
  return payload;
};

const mergeFiles = (target: CardDoc, source: CardDoc) => {
  const existingKeys = new Set(
    (target.files || []).map((file: any) => `${file.url || ''}|${normalizeNameKey(file.name || '')}`)
  );
  let moved = 0;
  for (const file of source.files || []) {
    const payload = sanitizeFilePayload(file);
    const key = `${payload.url || ''}|${normalizeNameKey(payload.name || '')}`;
    if (!payload.url && !payload.name) continue;
    if (existingKeys.has(key)) continue;
    target.files.push(payload);
    existingKeys.add(key);
    moved += 1;
  }
  if (moved) {
    source.files = [];
    stats.filesMoved += moved;
  }
  return moved;
};

const deleteOrArchiveEmpty = async (card: CardDoc) => {
  const childCount = await StudyCard.countDocuments({
    workspaceId: card.workspaceId,
    parentId: card._id,
    status: { $ne: 'archived' },
  });
  if (childCount > 0 || (card.files || []).length > 0) {
    card.status = 'archived';
    card.visibility = 'private';
    stats.archived += 1;
    if (shouldApply) await card.save();
    return;
  }
  stats.deleted += 1;
  if (shouldApply) await StudyCard.deleteOne({ _id: card._id });
};

const mergeCards = async (workspaceId: Types.ObjectId, target: CardDoc, source: CardDoc, style: CardStyle = {}) => {
  if (sameId(target._id, source._id)) return target;

  await markStyled(target, style);
  const children = await getChildren(workspaceId, source._id as Types.ObjectId);
  for (const child of children) {
    await moveOrMergeCard(workspaceId, child, target._id as Types.ObjectId, compactName(child.name), {
      goalType: child.goalType,
      iconKey: child.iconKey,
      tone: child.tone,
      order: child.order,
    });
  }

  const movedFiles = mergeFiles(target, source);
  if (movedFiles && shouldApply) await target.save();
  if (movedFiles && shouldApply) await source.save();

  stats.merged += 1;
  await deleteOrArchiveEmpty(source);
  return target;
};

async function moveOrMergeCard(
  workspaceId: Types.ObjectId,
  source: CardDoc,
  targetParentId: Types.ObjectId | null,
  nextName: string,
  style: CardStyle = {}
) {
  const cleanName = compactName(nextName);
  const nextSlug = slugify(cleanName);
  const duplicate = await StudyCard.findOne({ workspaceId, parentId: targetParentId, slug: nextSlug });

  if (duplicate && !sameId(duplicate._id, source._id)) {
    if (duplicate.status === 'archived') {
      duplicate.status = 'published';
      duplicate.visibility = 'public';
      if (shouldApply) await duplicate.save();
    }
    return mergeCards(workspaceId, duplicate, source, style);
  }

  const wasMoved = !sameId(source.parentId || null, targetParentId || null);
  const wasRenamed = source.name !== cleanName || source.slug !== nextSlug;
  source.parentId = targetParentId;
  source.name = cleanName;
  source.slug = nextSlug;
  await markStyled(source, style);

  if (wasMoved || wasRenamed) {
    if (wasMoved) stats.moved += 1;
    else stats.renamed += 1;
    if (shouldApply) await source.save();
  }
  return source;
}

const findAliasCandidates = async (
  workspaceId: Types.ObjectId,
  aliases: string[],
  excludeIds: Array<Types.ObjectId | string> = []
) => {
  const cleanAliases = Array.from(new Set(aliases.map(compactName).filter(Boolean)));
  const aliasSlugs = cleanAliases.map((alias) => slugify(alias));
  const aliasRegexes = cleanAliases.map((alias) => new RegExp(`^${escapeRegex(alias)}$`, 'i'));
  const excluded = new Set(excludeIds.map(objectIdKey));
  const cards = await StudyCard.find({
    ...activeCardFilter(workspaceId),
    $or: [
      { slug: { $in: aliasSlugs } },
      { name: { $in: aliasRegexes } },
    ],
  }).sort({ parentId: 1, order: 1, name: 1 });

  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = objectIdKey(card._id);
    if (excluded.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const chooseBestCandidate = async (workspaceId: Types.ObjectId, candidates: CardDoc[], targetParentId: Types.ObjectId | null) => {
  const direct = candidates.find((card) => sameId(card.parentId || null, targetParentId || null));
  if (direct) return direct;

  const scored = await Promise.all(
    candidates.map(async (card) => ({
      card,
      score:
        ((card.files || []).length * 20) +
        (await StudyCard.countDocuments({ workspaceId, parentId: card._id, status: { $ne: 'archived' } })) * 10 +
        (card.parentId ? 5 : 0),
    }))
  );
  scored.sort((a, b) => b.score - a.score || String(a.card.name).localeCompare(String(b.card.name)));
  return scored[0]?.card || null;
};

const ensurePrimaryCard = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  name: string,
  aliases: string[],
  style: Required<CardStyle>
) => {
  const candidates = await findAliasCandidates(workspaceId, [name, ...aliases]);
  const selected = await chooseBestCandidate(workspaceId, candidates, parentId);
  if (selected) return moveOrMergeCard(workspaceId, selected, parentId, name, style);
  return ensureCard(workspaceId, parentId, name, style);
};

const requiredExamShelves = ['Syllabus', 'Previous Year Papers', 'Study Material', 'Mock Tests', 'Answer Keys', 'Updates'];
const gateBranchShelves = ['Overview', ...requiredExamShelves, 'Strategy'];

const ensureShelves = async (workspaceId: Types.ObjectId, parent: CardDoc, shelves: string[]) => {
  for (const [index, shelf] of shelves.entries()) {
    await ensureCard(workspaceId, parent._id as Types.ObjectId, shelf, {
      goalType: 'resource_folder',
      iconKey: shelf.toLowerCase().includes('paper') ? 'pyq' : shelf.toLowerCase().includes('syllabus') ? 'syllabus' : 'folder',
      tone: shelf.toLowerCase().includes('paper') ? 'violet' : shelf.toLowerCase().includes('syllabus') ? 'cyan' : 'slate',
      order: (index + 1) * 10,
    });
  }
};

const getGateAliases = (paper: GateTestPaper) => [
  getGatePaperBranchName(paper),
  `${paper.code} ${paper.name}`,
  `GATE ${paper.code}`,
  `GATE ${paper.name}`,
  ...((paper.aliases || []) as string[]).map((alias) => `GATE ${alias}`),
];

const sortSiblings = async (workspaceId: Types.ObjectId, parentId: Types.ObjectId | null) => {
  const siblings = await getChildren(workspaceId, parentId);
  for (const [index, sibling] of siblings.entries()) {
    const nextOrder = (index + 1) * 10;
    if (sibling.order === nextOrder) continue;
    sibling.order = nextOrder;
    stats.styled += 1;
    if (shouldApply) await sibling.save();
  }
};

const isNamed = (card: CardDoc, names: string[]) => {
  const key = normalizeNameKey(card.name);
  return names.some((name) => key === normalizeNameKey(name));
};

const removeEngineeringWrappers = async (
  workspaceId: Types.ObjectId,
  entranceRoot: CardDoc,
  gateRoot: CardDoc,
  jeeRoot: CardDoc
) => {
  const engineeringCards = await findAliasCandidates(workspaceId, ['Engineering']);
  for (const engineering of engineeringCards) {
    if (sameId(engineering._id, entranceRoot._id) || sameId(engineering._id, gateRoot._id) || sameId(engineering._id, jeeRoot._id)) {
      continue;
    }

    const children = await getChildren(workspaceId, engineering._id as Types.ObjectId);
    for (const child of children) {
      if (isNamed(child, ['GATE', 'Graduate Aptitude Test in Engineering'])) {
        await moveOrMergeCard(workspaceId, child, entranceRoot._id as Types.ObjectId, 'GATE', {
          goalType: 'exam_family',
          iconKey: 'gate',
          tone: 'cyan',
          order: 20,
        });
        continue;
      }
      if (isNamed(child, ['JEE', 'IIT JEE'])) {
        await moveOrMergeCard(workspaceId, child, entranceRoot._id as Types.ObjectId, 'JEE', {
          goalType: 'exam_family',
          iconKey: 'nuclear',
          tone: 'cyan',
          order: 10,
        });
        continue;
      }
      if (isNamed(child, ['JEE Main', 'JEE Mains', 'Joint Entrance Examination Main'])) {
        await moveOrMergeCard(workspaceId, child, jeeRoot._id as Types.ObjectId, 'JEE Main', {
          goalType: 'exam',
          iconKey: 'nuclear',
          tone: 'cyan',
          order: 10,
        });
        continue;
      }
      if (isNamed(child, ['JEE Advanced', 'Joint Entrance Examination Advanced', 'IIT JEE'])) {
        await moveOrMergeCard(workspaceId, child, jeeRoot._id as Types.ObjectId, 'JEE Advanced', {
          goalType: 'exam',
          iconKey: 'nuclear',
          tone: 'cyan',
          order: 20,
        });
        continue;
      }
      await moveOrMergeCard(workspaceId, child, entranceRoot._id as Types.ObjectId, compactName(child.name), {
        goalType: child.goalType,
        iconKey: child.iconKey,
        tone: child.tone,
        order: child.order,
      });
    }

    if ((engineering.files || []).length) {
      const material = await ensureCard(workspaceId, entranceRoot._id as Types.ObjectId, 'Study Material', {
        goalType: 'resource_folder',
        iconKey: 'folder',
        tone: 'slate',
        order: 90,
      });
      const movedFiles = mergeFiles(material, engineering);
      if (movedFiles && shouldApply) await material.save();
      if (movedFiles && shouldApply) await engineering.save();
    }

    await deleteOrArchiveEmpty(engineering);
  }
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');
  if (!shouldApply) console.log('[dry-run] Use --apply to write the Entrance/GATE/JEE cleanup.');

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean<{ _id: Types.ObjectId }>();
  if (!workspace) throw new Error('Study Hub workspace not found.');

  const workspaceId = workspace._id as Types.ObjectId;
  const entranceRoot = await ensureCard(workspaceId, null, 'Entrance Exams', {
    goalType: 'exam_category',
    iconKey: 'entrance',
    tone: 'violet',
    order: 20,
  });

  const gateRoot = await ensurePrimaryCard(
    workspaceId,
    entranceRoot._id as Types.ObjectId,
    'GATE',
    ['Graduate Aptitude Test in Engineering'],
    { goalType: 'exam_family', iconKey: 'gate', tone: 'cyan', order: 20 }
  );

  const jeeRoot = await ensurePrimaryCard(
    workspaceId,
    entranceRoot._id as Types.ObjectId,
    'JEE',
    ['IIT JEE', 'Joint Entrance Examination'],
    { goalType: 'exam_family', iconKey: 'nuclear', tone: 'cyan', order: 10 }
  );

  const jeeMain = await ensurePrimaryCard(
    workspaceId,
    jeeRoot._id as Types.ObjectId,
    'JEE Main',
    ['JEE Mains', 'Joint Entrance Examination Main', 'NTA JEE', 'B.Tech Entrance'],
    { goalType: 'exam', iconKey: 'nuclear', tone: 'cyan', order: 10 }
  );
  const jeeAdvanced = await ensurePrimaryCard(
    workspaceId,
    jeeRoot._id as Types.ObjectId,
    'JEE Advanced',
    ['Joint Entrance Examination Advanced', 'IIT Entrance', 'JEE Advanced Paper 1', 'JEE Advanced Paper 2'],
    { goalType: 'exam', iconKey: 'nuclear', tone: 'cyan', order: 20 }
  );

  await ensureShelves(workspaceId, jeeMain, requiredExamShelves);
  await ensureShelves(workspaceId, jeeAdvanced, requiredExamShelves);

  for (const [index, paper] of gateTestPapers.entries()) {
    const name = getGatePaperBranchName(paper);
    const branch = await ensurePrimaryCard(workspaceId, gateRoot._id as Types.ObjectId, name, getGateAliases(paper), {
      goalType: 'subject',
      iconKey: 'gate',
      tone: 'cyan',
      order: (index + 1) * 10,
    });

    const duplicateBranches = await findAliasCandidates(workspaceId, getGateAliases(paper), [branch._id]);
    for (const duplicate of duplicateBranches) {
      await moveOrMergeCard(workspaceId, duplicate, gateRoot._id as Types.ObjectId, name, {
        goalType: 'subject',
        iconKey: 'gate',
        tone: 'cyan',
        order: (index + 1) * 10,
      });
    }

    await ensureShelves(workspaceId, branch, gateBranchShelves);
    await sortSiblings(workspaceId, branch._id as Types.ObjectId);
  }

  await removeEngineeringWrappers(workspaceId, entranceRoot, gateRoot, jeeRoot);
  await sortSiblings(workspaceId, gateRoot._id as Types.ObjectId);
  await sortSiblings(workspaceId, jeeRoot._id as Types.ObjectId);
  await sortSiblings(workspaceId, entranceRoot._id as Types.ObjectId);
  await sortSiblings(workspaceId, null);

  const rootGateCards = await StudyCard.countDocuments({
    ...activeCardFilter(workspaceId),
    parentId: null,
    name: /^GATE/i,
  });
  const activeEngineering = await StudyCard.countDocuments({
    ...activeCardFilter(workspaceId),
    slug: 'engineering',
  });
  const gateBranches = await StudyCard.countDocuments({
    ...activeCardFilter(workspaceId),
    parentId: gateRoot._id,
  });

  console.log(
    [
      `Entrance GATE/JEE cleanup ${shouldApply ? 'applied' : 'planned'}.`,
      `GATE branches under Entrance > GATE: ${gateBranches}.`,
      `Root-level GATE cards remaining: ${rootGateCards}. Active Engineering wrappers: ${activeEngineering}.`,
      `Created ${stats.created}, moved ${stats.moved}, merged ${stats.merged}, renamed ${stats.renamed}, deleted ${stats.deleted}, archived ${stats.archived}, styled ${stats.styled}, files moved ${stats.filesMoved}.`,
    ].join('\n')
  );
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
