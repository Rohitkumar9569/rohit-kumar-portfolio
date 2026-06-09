import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard, { type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const ROOT_WORKSPACE_SLUG = 'study-hub';
const MONGO_URI = process.env.MONGO_URI;
const shouldApply = process.argv.includes('--apply');
const skipSubjects = process.argv.includes('--skip-subjects');
const schoolOnly = process.argv.includes('--school-only');
const schoolCleanup = process.argv.includes('--school-cleanup');

type CardSnapshot = {
  _id: Types.ObjectId;
  parentId?: Types.ObjectId | null;
  name: string;
  slug: string;
  iconKey: string;
  tone: StudyCardTone;
  goalType?: string;
  order: number;
  status: string;
  visibility: string;
};

type RequiredShelf = {
  name: string;
  aliases: string[];
  iconKey: string;
  tone: StudyCardTone;
  order: number;
};

const requiredShelves: RequiredShelf[] = [
  {
    name: 'Syllabus',
    aliases: ['Syllabus', 'Official Syllabus', 'Board Syllabus', 'Exam Syllabus', 'Class Syllabus'],
    iconKey: 'syllabus',
    tone: 'amber',
    order: 10,
  },
  {
    name: 'Previous Year Papers',
    aliases: [
      'PYQ',
      'PYQs',
      'Previous Year Paper',
      'Previous Year Papers',
      'Previous Year Question Paper',
      'Previous Year Question Papers',
      'Past Papers',
      'Question Papers',
    ],
    iconKey: 'pyq',
    tone: 'violet',
    order: 20,
  },
  {
    name: 'Study Material',
    aliases: ['Study Material', 'Study Materials', 'Materials', 'Learning Material', 'Notes & Study Material'],
    iconKey: 'material',
    tone: 'emerald',
    order: 30,
  },
];

const stats = {
  candidates: 0,
  existing: 0,
  created: 0,
  renamed: 0,
  restored: 0,
  styled: 0,
  missing: 0,
  skippedResourceDescendants: 0,
};

const logStep = (message: string) => {
  console.log(`[required-shelves] ${message}`);
};

const isDuplicateKeyError = (error: unknown) =>
  Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: number }).code === 11000);

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

const normalizeNameKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const requiredShelfNameKeys = new Set(
  requiredShelves.flatMap((shelf) => [shelf.name, ...shelf.aliases].map(normalizeNameKey))
);
const requiredShelfSlugs = new Set(
  requiredShelves.flatMap((shelf) => [shelf.name, ...shelf.aliases].map((name) => slugify(name)))
);

const resourceContainerMatchers = [
  /\bsyllabus\b/,
  /\bpyq\b/,
  /\bprevious year\b/,
  /\bpast papers?\b/,
  /\bquestion papers?\b/,
  /\bstudy materials?\b/,
  /\blearning materials?\b/,
  /\bmaterials?\b/,
  /\bncert\b/,
  /\btextbooks?\b/,
  /\bbooks?\b/,
  /\bnotes?\b/,
  /\brevision\b/,
  /\bsample papers?\b/,
  /\bmock tests?\b/,
  /\bpractice\b/,
  /\banswer keys?\b/,
  /\bmarking schemes?\b/,
  /\bupdates?\b/,
  /\bstrategy\b/,
];

const classNamePattern = /^class\s+(?:[1-9]|1[0-2])$/i;

const isResourceContainerName = (name = '') => {
  const key = normalizeNameKey(name);
  return resourceContainerMatchers.some((pattern) => pattern.test(key));
};

const getParentKey = (parentId: Types.ObjectId | null | undefined) => parentId?.toString() || 'root';

const pushChild = (childrenByParent: Map<string, CardSnapshot[]>, card: CardSnapshot) => {
  const key = getParentKey(card.parentId || null);
  const siblings = childrenByParent.get(key) || [];
  siblings.push(card);
  childrenByParent.set(key, siblings);
};

const getPathParts = (card: CardSnapshot, cardsById: Map<string, CardSnapshot>) => {
  const parts: string[] = [];
  let current: CardSnapshot | undefined = card;
  while (current) {
    parts.unshift(current.name);
    current = current.parentId ? cardsById.get(current.parentId.toString()) : undefined;
  }
  return parts;
};

const getSchoolPathKeys = (card: CardSnapshot, cardsById: Map<string, CardSnapshot>) => {
  const keys = getPathParts(card, cardsById).map(normalizeNameKey);
  const schoolIndex = keys.indexOf('school boards');
  return schoolIndex >= 0 ? keys.slice(schoolIndex) : [];
};

const isInsideSchoolBoards = (card: CardSnapshot, cardsById: Map<string, CardSnapshot>) =>
  getSchoolPathKeys(card, cardsById).length > 0;

const isClassCardName = (name = '') => classNamePattern.test(name.trim());

const isSchoolBoardClassCard = (card: CardSnapshot, cardsById: Map<string, CardSnapshot>) => {
  if (!isClassCardName(card.name)) return false;

  const schoolPathKeys = getSchoolPathKeys(card, cardsById);
  if (!schoolPathKeys.length || schoolPathKeys.includes('common resources')) return false;

  const familyKey = schoolPathKeys[1] || '';
  if ((familyKey === 'cbse' || familyKey === 'icse isc') && schoolPathKeys.length === 3) return true;
  if (familyKey === 'state boards' && schoolPathKeys.length === 4) return true;
  return false;
};

const isRequiredShelfCard = (card: CardSnapshot) =>
  requiredShelfNameKeys.has(normalizeNameKey(card.name)) || requiredShelfSlugs.has(card.slug);

const isCleanupResourceShelfCard = (card: CardSnapshot) =>
  isRequiredShelfCard(card) || (card.goalType === 'resource_folder' && isResourceContainerName(card.name));

const isSchoolBoardContainerParent = (parent: CardSnapshot, cardsById: Map<string, CardSnapshot>) => {
  const schoolPathKeys = getSchoolPathKeys(parent, cardsById);
  if (!schoolPathKeys.length) return false;
  if (schoolPathKeys.includes('common resources')) return false;
  if (schoolPathKeys.includes('olympiads') || schoolPathKeys.includes('scholarships')) return false;
  if (parent.goalType === 'class' || isClassCardName(parent.name)) return false;

  const familyKey = schoolPathKeys[1] || '';
  if (schoolPathKeys.length === 1) return true;
  if ((familyKey === 'cbse' || familyKey === 'icse isc') && schoolPathKeys.length === 2) return true;
  if (familyKey === 'state boards' && (schoolPathKeys.length === 2 || schoolPathKeys.length === 3)) return true;
  return false;
};

const hasResourceAncestor = (card: CardSnapshot, cardsById: Map<string, CardSnapshot>) => {
  let current = card.parentId ? cardsById.get(card.parentId.toString()) : undefined;
  while (current) {
    if (isResourceContainerName(current.name)) return true;
    current = current.parentId ? cardsById.get(current.parentId.toString()) : undefined;
  }
  return false;
};

const hasClassChildren = (card: CardSnapshot, childrenByParent: Map<string, CardSnapshot[]>) =>
  (childrenByParent.get(card._id.toString()) || []).some((child) => (
    child.status !== 'archived' && classNamePattern.test(child.name)
  ));

const isCandidateCard = (
  card: CardSnapshot,
  cardsById: Map<string, CardSnapshot>,
  childrenByParent: Map<string, CardSnapshot[]>
) => {
  if (card.status === 'archived' || card.visibility !== 'public') return false;
  if (isResourceContainerName(card.name)) return false;
  if (card.goalType === 'board' && hasClassChildren(card, childrenByParent)) return false;
  if (hasResourceAncestor(card, cardsById)) {
    stats.skippedResourceDescendants += 1;
    return false;
  }

  if (isInsideSchoolBoards(card, cardsById)) return isSchoolBoardClassCard(card, cardsById);
  if (card.goalType === 'exam' || card.goalType === 'board' || card.goalType === 'class') return true;
  return !skipSubjects && card.goalType === 'subject';
};

const getActiveChildren = (card: CardSnapshot, childrenByParent: Map<string, CardSnapshot[]>) =>
  (childrenByParent.get(card._id.toString()) || []).filter((child) => child.status !== 'archived');

const getActiveChildCount = (card: CardSnapshot, childrenByParent: Map<string, CardSnapshot[]>) =>
  getActiveChildren(card, childrenByParent).length;

const getActiveFileCount = async (card: CardSnapshot) => {
  const doc = await StudyCard.findById(card._id)
    .select('files.status')
    .lean<{ files?: Array<{ status?: string }> } | null>();
  return Array.isArray(doc?.files) ? doc.files.filter((file) => file?.status !== 'archived').length : 0;
};

const cleanupMisplacedSchoolBoardShelves = async (
  cards: CardSnapshot[],
  cardsById: Map<string, CardSnapshot>,
  childrenByParent: Map<string, CardSnapshot[]>
) => {
  const misplaced = cards.filter((card) => {
    if (card.status === 'archived' || !isCleanupResourceShelfCard(card)) return false;
    const parent = card.parentId ? cardsById.get(card.parentId.toString()) : undefined;
    return Boolean(parent && isSchoolBoardContainerParent(parent, cardsById));
  });

  let archived = 0;
  let wouldArchive = 0;
  let needsReview = 0;
  const reviewSamples: string[] = [];

  for (const card of misplaced) {
    const activeChildCount = getActiveChildCount(card, childrenByParent);
    const activeFileCount = await getActiveFileCount(card);
    const path = getPathParts(card, cardsById).join(' / ');

    if (activeChildCount || activeFileCount) {
      needsReview += 1;
      if (reviewSamples.length < 8) {
        reviewSamples.push(`${path} (${activeChildCount} child folders, ${activeFileCount} files)`);
      }
      continue;
    }

    if (shouldApply) {
      await StudyCard.updateOne(
        { _id: card._id },
        { $set: { status: 'archived', visibility: 'private' } },
        { runValidators: true }
      );
      card.status = 'archived';
      card.visibility = 'private';
      archived += 1;
    } else {
      wouldArchive += 1;
    }
  }

  logStep(
    [
      `misplaced school-board root shelves: ${misplaced.length}`,
      shouldApply ? `archived empty: ${archived}` : `would archive empty: ${wouldArchive}`,
      `needs review: ${needsReview}`,
    ].join('; ')
  );
  if (reviewSamples.length) {
    logStep(`non-empty misplaced shelves left untouched:\n- ${reviewSamples.join('\n- ')}`);
  }
};

const cleanupMisplacedSchoolClassFolders = async (
  cards: CardSnapshot[],
  cardsById: Map<string, CardSnapshot>,
  childrenByParent: Map<string, CardSnapshot[]>
) => {
  const misplacedClasses = cards.filter((card) => {
    if (card.status === 'archived' || !isClassCardName(card.name)) return false;
    const parent = card.parentId ? cardsById.get(card.parentId.toString()) : undefined;
    if (!parent) return false;

    const parentPathKeys = getSchoolPathKeys(parent, cardsById);
    if (!parentPathKeys.length || parentPathKeys.includes('common resources')) return false;
    if (parentPathKeys.length === 1) return true;
    return parentPathKeys.length === 2 && parentPathKeys[1] === 'state boards';
  });

  let archivedClasses = 0;
  let archivedChildShelves = 0;
  let wouldArchiveClasses = 0;
  let wouldArchiveChildShelves = 0;
  let needsReview = 0;
  const reviewSamples: string[] = [];

  for (const classCard of misplacedClasses) {
    const activeChildren = getActiveChildren(classCard, childrenByParent);
    const activeFileCount = await getActiveFileCount(classCard);
    const path = getPathParts(classCard, cardsById).join(' / ');

    let canArchive = activeFileCount === 0;
    const generatedChildShelves: CardSnapshot[] = [];

    for (const child of activeChildren) {
      const childActiveChildren = getActiveChildCount(child, childrenByParent);
      const childActiveFiles = await getActiveFileCount(child);
      if (!isCleanupResourceShelfCard(child) || childActiveChildren || childActiveFiles) {
        canArchive = false;
        break;
      }
      generatedChildShelves.push(child);
    }

    if (!canArchive) {
      needsReview += 1;
      if (reviewSamples.length < 8) {
        reviewSamples.push(`${path} (${activeChildren.length} child folders, ${activeFileCount} files)`);
      }
      continue;
    }

    const archiveTargets = [classCard, ...generatedChildShelves];
    if (shouldApply) {
      await StudyCard.updateMany(
        { _id: { $in: archiveTargets.map((target) => target._id) } },
        { $set: { status: 'archived', visibility: 'private' } },
        { runValidators: true }
      );
      archiveTargets.forEach((target) => {
        target.status = 'archived';
        target.visibility = 'private';
      });
      archivedClasses += 1;
      archivedChildShelves += generatedChildShelves.length;
    } else {
      wouldArchiveClasses += 1;
      wouldArchiveChildShelves += generatedChildShelves.length;
    }
  }

  logStep(
    [
      `misplaced school class folders: ${misplacedClasses.length}`,
      shouldApply
        ? `archived classes: ${archivedClasses}; archived child shelves: ${archivedChildShelves}`
        : `would archive classes: ${wouldArchiveClasses}; would archive child shelves: ${wouldArchiveChildShelves}`,
      `needs review: ${needsReview}`,
    ].join('; ')
  );
  if (reviewSamples.length) {
    logStep(`non-empty misplaced classes left untouched:\n- ${reviewSamples.join('\n- ')}`);
  }
};

const findShelfSibling = (
  parent: CardSnapshot,
  shelf: RequiredShelf,
  childrenByParent: Map<string, CardSnapshot[]>
) => {
  const aliasKeys = new Set(shelf.aliases.map(normalizeNameKey));
  const aliasSlugs = new Set(shelf.aliases.map((alias) => slugify(alias)));
  const siblings = childrenByParent.get(parent._id.toString()) || [];
  const canonicalSlug = slugify(shelf.name);
  const canonical = siblings.find((child) => child.slug === canonicalSlug);
  const alias = siblings.find((child) => aliasKeys.has(normalizeNameKey(child.name)) || aliasSlugs.has(child.slug));
  return canonical || alias || null;
};

const ensureShelf = async (
  workspaceId: Types.ObjectId,
  parent: CardSnapshot,
  shelf: RequiredShelf,
  childrenByParent: Map<string, CardSnapshot[]>
) => {
  const existing = findShelfSibling(parent, shelf, childrenByParent);
  const canonicalSlug = slugify(shelf.name);

  if (!existing) {
    stats.missing += 1;
    if (!shouldApply) return;

    const duplicate = await StudyCard.findOne({
      workspaceId,
      parentId: parent._id,
      slug: canonicalSlug,
    }).lean<CardSnapshot>();
    if (duplicate) {
      await StudyCard.updateOne(
        { _id: duplicate._id },
        {
          $set: {
            name: shelf.name,
            iconKey: shelf.iconKey,
            tone: shelf.tone,
            goalType: 'resource_folder',
            order: shelf.order,
            status: 'published',
            visibility: 'public',
          },
        },
        { runValidators: true }
      );
      duplicate.name = shelf.name;
      duplicate.iconKey = shelf.iconKey;
      duplicate.tone = shelf.tone;
      duplicate.goalType = 'resource_folder';
      duplicate.order = shelf.order;
      duplicate.status = 'published';
      duplicate.visibility = 'public';
      pushChild(childrenByParent, duplicate);
      stats.styled += 1;
      return;
    }

    let created;
    try {
      created = await StudyCard.create({
        workspaceId,
        parentId: parent._id,
        name: shelf.name,
        slug: canonicalSlug,
        iconKey: shelf.iconKey,
        tone: shelf.tone,
        goalType: 'resource_folder',
        order: shelf.order,
        status: 'published',
        visibility: 'public',
        files: [],
      });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      created = await StudyCard.findOneAndUpdate(
        { workspaceId, parentId: parent._id, slug: canonicalSlug },
        {
          $set: {
            name: shelf.name,
            iconKey: shelf.iconKey,
            tone: shelf.tone,
            goalType: 'resource_folder',
            order: shelf.order,
            status: 'published',
            visibility: 'public',
          },
          $setOnInsert: { files: [] },
        },
        { new: true, upsert: true, runValidators: true }
      );
      stats.styled += 1;
    }
    const createdSnapshot = created.toObject() as CardSnapshot;
    pushChild(childrenByParent, createdSnapshot);
    stats.created += 1;
    return;
  }

  stats.existing += 1;
  const nextStatus = existing.status === 'archived' ? 'published' : existing.status;
  const shouldRename = existing.name !== shelf.name || existing.slug !== canonicalSlug;
  const shouldRestore = existing.status === 'archived' || existing.visibility !== 'public';
  const shouldStyle =
    existing.iconKey !== shelf.iconKey ||
    existing.tone !== shelf.tone ||
    existing.order !== shelf.order ||
    existing.goalType !== 'resource_folder';

  if (!shouldApply || (!shouldRename && !shouldRestore && !shouldStyle)) return;

  await StudyCard.updateOne(
    { _id: existing._id },
    {
      $set: {
        name: shelf.name,
        slug: canonicalSlug,
        iconKey: shelf.iconKey,
        tone: shelf.tone,
        goalType: 'resource_folder',
        order: shelf.order,
        status: nextStatus,
        visibility: 'public',
      },
    },
    { runValidators: true }
  );

  existing.name = shelf.name;
  existing.slug = canonicalSlug;
  existing.iconKey = shelf.iconKey;
  existing.tone = shelf.tone;
  existing.goalType = 'resource_folder';
  existing.order = shelf.order;
  existing.status = nextStatus;
  existing.visibility = 'public';

  if (shouldRename) stats.renamed += 1;
  if (shouldRestore) stats.restored += 1;
  if (shouldStyle) stats.styled += 1;
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');
  if (!shouldApply) {
    logStep('dry run only; use --apply to write missing shelves');
  }

  logStep('connecting to database');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean<{ _id: Types.ObjectId }>();
  if (!workspace) throw new Error('Study Hub workspace not found.');

  const cards = await StudyCard.find({ workspaceId: workspace._id })
    .select('_id parentId name slug iconKey tone goalType order status visibility')
    .lean<CardSnapshot[]>();
  const cardsById = new Map(cards.map((card) => [card._id.toString(), card]));
  const childrenByParent = new Map<string, CardSnapshot[]>();
  cards.forEach((card) => pushChild(childrenByParent, card));

  if (schoolCleanup) {
    await cleanupMisplacedSchoolClassFolders(cards, cardsById, childrenByParent);
    await cleanupMisplacedSchoolBoardShelves(cards, cardsById, childrenByParent);
  }

  const candidates = cards.filter((card) => {
    if (schoolOnly && !isInsideSchoolBoards(card, cardsById)) return false;
    return isCandidateCard(card, cardsById, childrenByParent);
  });
  stats.candidates = candidates.length;
  const candidateLabel = schoolOnly
    ? 'school-board class'
    : `exam/class/board${skipSubjects ? '' : '/subject'}`;
  logStep(`checking ${candidates.length.toLocaleString('en-IN')} ${candidateLabel} folders`);

  const sampleMissing: string[] = [];
  for (const [index, candidate] of candidates.entries()) {
    for (const shelf of requiredShelves) {
      const beforeMissing = stats.missing;
      await ensureShelf(workspace._id, candidate, shelf, childrenByParent);
      if (stats.missing > beforeMissing && sampleMissing.length < 12) {
        sampleMissing.push(`${getPathParts(candidate, cardsById).join(' / ')} / ${shelf.name}`);
      }
    }
    if ((index + 1) % 500 === 0 || index === candidates.length - 1) {
      logStep(`checked ${index + 1}/${candidates.length}`);
    }
  }

  console.log(
    [
      shouldApply ? 'Required shelf backfill complete.' : 'Required shelf dry audit complete.',
      `Candidates: ${stats.candidates}. Existing shelves: ${stats.existing}. Missing shelves: ${stats.missing}.`,
      `Created ${stats.created}, renamed ${stats.renamed}, restored ${stats.restored}, styled ${stats.styled}.`,
      `Skipped resource descendants: ${stats.skippedResourceDescendants}.`,
      sampleMissing.length ? `Sample missing:\n- ${sampleMissing.join('\n- ')}` : 'No missing sample paths.',
    ].join('\n')
  );
};

run()
  .catch((error) => {
    console.error('Required shelf backfill failed:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
