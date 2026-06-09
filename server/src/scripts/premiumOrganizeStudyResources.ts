import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard, { type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const ROOT_WORKSPACE_SLUG = 'study-hub';
const MONGO_URI = process.env.MONGO_URI;
const shouldApply = process.argv.includes('--apply');

type CardDoc = any;
type FileDoc = any;

const stats = {
  cardsChecked: 0,
  duplicateFilesRemoved: 0,
  filesMovedToParent: 0,
  filesMovedToGroup: 0,
  singletonFoldersArchived: 0,
  groupFoldersCreated: 0,
  groupFoldersRestored: 0,
  redundantFoldersArchived: 0,
  orderUpdates: 0,
};

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
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const titleCase = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => {
      if (/^(?:UPSC|CBSE|ICSE|NCERT|JEE|NEET|GATE|SSC|GS|CSAT|PYQ|PDF|DBMS|OS|CN|OOP|DSA)$/i.test(part)) {
        return part.toUpperCase();
      }
      if (/^(?:and|or|of|in|for|to|the)$/i.test(part)) return part.toLowerCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/\bIi\b/g, 'II')
    .replace(/\bIii\b/g, 'III')
    .replace(/\bIv\b/g, 'IV')
    .replace(/\bVi\b/g, 'VI')
    .replace(/\bVii\b/g, 'VII')
    .replace(/\bViii\b/g, 'VIII')
    .replace(/\bIx\b/g, 'IX')
    .replace(/\bXi\b/g, 'XI');

const activeFiles = (card: CardDoc) =>
  (card.files || []).filter((file: FileDoc) => (file.status || 'published') !== 'archived');

const inactiveFiles = (card: CardDoc) =>
  (card.files || []).filter((file: FileDoc) => (file.status || 'published') === 'archived');

const fileIdentity = (file: FileDoc) => {
  const url = String(file.url || '').trim().toLowerCase();
  if (url) return `url:${url}`;
  return [
    'meta',
    normalizeNameKey(file.name || ''),
    file.year || '',
    normalizeNameKey(file.subject || ''),
    normalizeNameKey(file.paper || ''),
  ].join('|');
};

const sanitizeFilePayload = (file: FileDoc) => {
  const payload = typeof file.toObject === 'function' ? file.toObject() : { ...file };
  delete payload._id;
  return payload;
};

const resourceShelfKeys = new Set([
  'answer keys',
  'answer key',
  'books',
  'book',
  'ncert books',
  'ncert solutions',
  'textbooks',
  'study material',
  'study materials',
  'material',
  'notes',
  'revision notes',
  'previous year papers',
  'previous year paper',
  'pyq',
  'pyqs',
  'sample papers',
  'mock tests',
  'practice questions',
  'important questions',
  'formula sheets',
  'syllabus',
  'updates',
  'strategy',
]);

const genericGroupKeys = new Set([
  '',
  'all subjects',
  'book',
  'books',
  'complete book',
  'document',
  'documents',
  'file',
  'files',
  'material',
  'misc',
  'miscellaneous',
  'paper',
  'pdf',
  'previous year papers',
  'pyq',
  'pyq practice',
  'question paper',
  'sample paper',
  'study material',
  'syllabus',
  'updates',
]);

const subjectFolderShelfKeys = new Set([
  'ncert books',
  'ncert solutions',
  'syllabus',
  'study material',
  'study materials',
]);

const isResourceShelfName = (name = '') => resourceShelfKeys.has(normalizeNameKey(name));

const shouldPreserveSingletonSubjectFolder = (shelf: CardDoc, child: CardDoc) =>
  subjectFolderShelfKeys.has(normalizeNameKey(shelf.name || shelf.slug || '')) &&
  (child.goalType === 'subject' || !genericGroupKeys.has(normalizeNameKey(child.name || child.slug || '')));

const isBookShelfName = (name = '') => {
  const key = normalizeNameKey(name);
  return key.includes('book') || key.includes('textbook') || key === 'ncert books';
};

const cleanGroupName = (value = '') => {
  const raw = value
    .replace(/[_/]+/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\bcomplete\s+book\b/gi, '')
    .replace(/\bquestion\s+paper\b/gi, '')
    .replace(/\bmarking\s+scheme\b/gi, '')
    .replace(/\bsample\s+paper\b/gi, '')
    .replace(/\bpaper\s+(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/gi, '')
    .replace(/\b(?:19|20)\d{2}\b/g, '')
    .replace(/\(\s*\d+\s*\)/g, '')
    .replace(/\b\d+(?:st|nd|rd|th)?\s+ccsme\b/gi, '')
    .replace(/\s+-\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const key = normalizeNameKey(raw);
  if (genericGroupKeys.has(key) || resourceShelfKeys.has(key)) return '';
  return titleCase(raw);
};

const inferGroupName = (file: FileDoc, shelfName: string) => {
  const subject = cleanGroupName(file.subject || '');
  if (subject) return subject;

  const name = String(file.name || '');
  const ncertMatch = name.match(/\bNCERT\s+Class\s+\d{1,2}\s+(.+?)\s+-/i);
  if (ncertMatch) return cleanGroupName(ncertMatch[1]);

  const cbseMatch = name.match(/\bCBSE\s+Class\s+\d{1,2}\s+(.+?)\s+(?:Sample|Marking|Question|Notes|Book)/i);
  if (cbseMatch) return cleanGroupName(cbseMatch[1]);

  const paper = cleanGroupName(file.paper || '');
  if (!isBookShelfName(shelfName) && paper) return paper;

  const topic = cleanGroupName(file.topic || '');
  if (topic) return topic;

  return '';
};

const exactBranchOrder = new Map<string, number>([
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

const branchOrder = (name: string) => {
  const key = normalizeNameKey(name);
  const classMatch = key.match(/^class\s+(\d{1,2})$/);
  if (classMatch) return 100 + Number(classMatch[1]);

  const yearMatch = key.match(/^(?:year\s*)?(\d{4})$/);
  if (yearMatch) return 200 + (3000 - Number(yearMatch[1]));

  const exact = exactBranchOrder.get(key);
  if (typeof exact === 'number') return exact;

  const hint = branchOrderHints.find(([pattern]) => pattern.test(key));
  if (hint) return hint[1];

  return 500;
};

const fileOrder = (file: FileDoc) => {
  const resourceTypeOrder = new Map<string, number>([
    ['book', 10],
    ['syllabus', 20],
    ['pyq', 30],
    ['sample_paper', 40],
    ['answer_key', 50],
    ['material', 60],
    ['notes', 70],
  ]);
  const typeOrder = resourceTypeOrder.get(String(file.resourceType || '').toLowerCase()) ?? 90;
  const yearOrder = file.year ? 3000 - Number(file.year) : 9999;
  return [
    typeOrder.toString().padStart(4, '0'),
    yearOrder.toString().padStart(4, '0'),
    normalizeNameKey(file.subject || ''),
    normalizeNameKey(file.paper || ''),
    normalizeNameKey(file.name || ''),
  ].join('|');
};

const sortCardFiles = (card: CardDoc) => {
  const before = (card.files || []).map((file: FileDoc) => fileIdentity(file)).join('\n');
  card.files = [...activeFiles(card).sort((a: FileDoc, b: FileDoc) => fileOrder(a).localeCompare(fileOrder(b))), ...inactiveFiles(card)];
  const after = (card.files || []).map((file: FileDoc) => fileIdentity(file)).join('\n');
  return before !== after;
};

const dedupeCardFiles = async (card: CardDoc) => {
  const seen = new Set<string>();
  const nextFiles: FileDoc[] = [];
  let removed = 0;

  for (const file of card.files || []) {
    if ((file.status || 'published') === 'archived') {
      nextFiles.push(file);
      continue;
    }
    const key = fileIdentity(file);
    if (seen.has(key)) {
      removed += 1;
      continue;
    }
    seen.add(key);
    nextFiles.push(file);
  }

  card.files = nextFiles;
  const sorted = sortCardFiles(card);
  if (shouldApply && (removed || sorted)) await card.save();
  stats.duplicateFilesRemoved += removed;
};

const getChildCount = (workspaceId: Types.ObjectId, cardId: Types.ObjectId) =>
  StudyCard.countDocuments({ workspaceId, parentId: cardId, status: { $ne: 'archived' } });

const findOrCreateChild = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId,
  name: string,
  options: { iconKey?: string; tone?: StudyCardTone; order?: number } = {}
) => {
  const slug = slugify(name);
  let card = await StudyCard.findOne({ workspaceId, parentId, slug });
  if (card) {
    if (card.status === 'archived') stats.groupFoldersRestored += 1;
    card.name = name;
    card.status = 'published';
    card.visibility = 'public';
    card.goalType = 'resource_folder';
    card.iconKey = options.iconKey || card.iconKey || 'folder';
    card.tone = options.tone || card.tone || 'blue';
    card.order = options.order ?? card.order ?? branchOrder(name);
    if (shouldApply) await card.save();
    return card;
  }

  stats.groupFoldersCreated += 1;
  if (!shouldApply) {
    return {
      _id: new Types.ObjectId(),
      workspaceId,
      parentId,
      name,
      slug,
      files: [] as FileDoc[],
      status: 'published',
      visibility: 'public',
    };
  }

  try {
    return await StudyCard.create({
      workspaceId,
      parentId,
      name,
      slug,
      iconKey: options.iconKey || 'folder',
      tone: options.tone || 'blue',
      goalType: 'resource_folder',
      order: options.order ?? branchOrder(name),
      status: 'published',
      visibility: 'public',
      files: [],
    });
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
    card = await StudyCard.findOneAndUpdate(
      { workspaceId, parentId, slug },
      {
        $set: {
          name,
          iconKey: options.iconKey || 'folder',
          tone: options.tone || 'blue',
          goalType: 'resource_folder',
          order: options.order ?? branchOrder(name),
          status: 'published',
          visibility: 'public',
        },
        $setOnInsert: { files: [] },
      },
      { new: true, upsert: true, runValidators: true }
    );
    return card;
  }
};

const moveFilesToTarget = async (source: CardDoc, target: CardDoc, filesToMove: FileDoc[]) => {
  if (String(source._id) === String(target._id)) return 0;

  const sourceDoc = shouldApply ? await StudyCard.findById(source._id) : source;
  const targetDoc = shouldApply ? await StudyCard.findById(target._id) : target;
  if (!sourceDoc || !targetDoc) return 0;

  const moveKeys = new Set(filesToMove.map(fileIdentity));
  const targetKeys = new Set(activeFiles(targetDoc).map(fileIdentity));
  let moved = 0;

  for (const file of filesToMove) {
    const key = fileIdentity(file);
    if (targetKeys.has(key)) continue;
    targetDoc.files.push(sanitizeFilePayload(file));
    targetKeys.add(key);
    moved += 1;
  }

  if (!moved && filesToMove.length === 0) return 0;

  sourceDoc.files = (sourceDoc.files || []).filter((file: FileDoc) => (
    (file.status || 'published') === 'archived' || !moveKeys.has(fileIdentity(file))
  ));
  sortCardFiles(sourceDoc);
  sortCardFiles(targetDoc);

  if (shouldApply) {
    await targetDoc.save();
    await sourceDoc.save();
  }

  return moved;
};

const archiveCardIfEmpty = async (workspaceId: Types.ObjectId, card: CardDoc) => {
  const children = await getChildCount(workspaceId, card._id as Types.ObjectId);
  if (children || activeFiles(card).length) return false;
  if (shouldApply) {
    card.status = 'archived';
    card.visibility = 'private';
    await card.save();
  }
  return true;
};

const getActiveSnapshot = async (workspaceId: Types.ObjectId) => {
  const cards = await StudyCard.find({ workspaceId, status: { $ne: 'archived' } });
  const childrenByParent = new Map<string, CardDoc[]>();
  for (const card of cards) {
    const parentKey = String(card.parentId || 'root');
    const children = childrenByParent.get(parentKey) || [];
    children.push(card);
    childrenByParent.set(parentKey, children);
  }
  return { cards, childrenByParent };
};

const flattenSingletonSubjectFolders = async (workspaceId: Types.ObjectId) => {
  const { cards, childrenByParent } = await getActiveSnapshot(workspaceId);
  const shelves = cards.filter((card) => isResourceShelfName(card.name));

  for (const shelf of shelves) {
    const children = childrenByParent.get(String(shelf._id)) || [];

    for (const child of children) {
      if (isResourceShelfName(child.name)) continue;
      if (shouldPreserveSingletonSubjectFolder(shelf, child)) continue;
      const childChildren = (childrenByParent.get(String(child._id)) || []).length;
      const files = activeFiles(child);
      if (childChildren || files.length > 1) continue;

      const moved = await moveFilesToTarget(child, shelf, files);
      stats.filesMovedToParent += moved;
      if (await archiveCardIfEmpty(workspaceId, child)) stats.singletonFoldersArchived += 1;
    }
  }
};

const groupDirectFiles = async (workspaceId: Types.ObjectId) => {
  const { cards, childrenByParent } = await getActiveSnapshot(workspaceId);
  const shelves = cards.filter((card) => isResourceShelfName(card.name));

  for (const shelf of shelves) {
    const directFiles = activeFiles(shelf);
    if (!directFiles.length) continue;

    const children = childrenByParent.get(String(shelf._id)) || [];
    const childByKey = new Map(children.map((child: CardDoc) => [normalizeNameKey(child.name), child]));

    const groups = new Map<string, { name: string; files: FileDoc[]; existingChild?: CardDoc }>();
    for (const file of directFiles) {
      const groupName = inferGroupName(file, shelf.name);
      if (!groupName) continue;
      const key = normalizeNameKey(groupName);
      const current = groups.get(key) || { name: groupName, files: [], existingChild: childByKey.get(key) };
      current.files.push(file);
      groups.set(key, current);
    }

    for (const group of groups.values()) {
      const existingChildFileCount = group.existingChild ? activeFiles(group.existingChild).length : 0;
      if (group.files.length <= 1 && existingChildFileCount === 0) continue;

      const target = group.existingChild || await findOrCreateChild(workspaceId, shelf._id as Types.ObjectId, group.name, {
        iconKey: isBookShelfName(shelf.name) ? 'book' : shelf.iconKey || 'folder',
        tone: (isBookShelfName(shelf.name) ? 'emerald' : shelf.tone || 'blue') as StudyCardTone,
        order: branchOrder(group.name),
      });
      const moved = await moveFilesToTarget(shelf, target, group.files);
      stats.filesMovedToGroup += moved;
    }
  }
};

const unwrapDuplicateNameFolders = async (workspaceId: Types.ObjectId) => {
  const { cards, childrenByParent } = await getActiveSnapshot(workspaceId);
  for (const card of cards) {
    if (activeFiles(card).length) continue;
    const children = childrenByParent.get(String(card._id)) || [];
    if (children.length !== 1) continue;
    const child = children[0];
    if (normalizeNameKey(card.name) !== normalizeNameKey(child.name)) continue;

    const movedFiles = await moveFilesToTarget(child, card, activeFiles(child));
    stats.filesMovedToParent += movedFiles;

    const grandChildren = await StudyCard.find({
      workspaceId,
      parentId: child._id,
      status: { $ne: 'archived' },
    });
    for (const grandChild of grandChildren) {
      const duplicate = await StudyCard.findOne({
        workspaceId,
        parentId: card._id,
        slug: grandChild.slug,
        _id: { $ne: grandChild._id },
      }).select('_id');
      if (duplicate) continue;
      grandChild.parentId = card._id;
      if (shouldApply) await grandChild.save();
    }

    if (await archiveCardIfEmpty(workspaceId, card)) stats.redundantFoldersArchived += 1;
    if (await archiveCardIfEmpty(workspaceId, child)) stats.redundantFoldersArchived += 1;
  }
};

const sortAllSiblings = async (workspaceId: Types.ObjectId) => {
  const { childrenByParent } = await getActiveSnapshot(workspaceId);
  const operations: any[] = [];

  for (const siblings of childrenByParent.values()) {
    siblings.sort((a: CardDoc, b: CardDoc) =>
      branchOrder(a.name) - branchOrder(b.name) ||
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
    for (const [index, sibling] of siblings.entries()) {
      const nextOrder = (index + 1) * 10;
      if (sibling.order === nextOrder) continue;
      stats.orderUpdates += 1;
      if (shouldApply) {
        operations.push({
          updateOne: {
            filter: { _id: sibling._id, workspaceId },
            update: { $set: { order: nextOrder } },
          },
        });
      }
    }
  }

  if (operations.length) await StudyCard.bulkWrite(operations, { ordered: false });
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');
  console.log(`${shouldApply ? 'Applying' : 'Dry run'} premium Study Hub resource organization.`);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });

  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean<{ _id: Types.ObjectId }>();
  if (!workspace) throw new Error('Study Hub workspace not found.');
  const workspaceId = workspace._id;

  const cards = await StudyCard.find({ workspaceId, status: { $ne: 'archived' } }).select('_id files');
  stats.cardsChecked = cards.length;
  for (const card of cards) {
    await dedupeCardFiles(card);
  }

  await flattenSingletonSubjectFolders(workspaceId);
  await groupDirectFiles(workspaceId);
  await unwrapDuplicateNameFolders(workspaceId);
  await sortAllSiblings(workspaceId);

  console.log(
    [
      `Cards checked: ${stats.cardsChecked}.`,
      `${shouldApply ? 'Removed' : 'Would remove'} duplicate file entries: ${stats.duplicateFilesRemoved}.`,
      `${shouldApply ? 'Moved' : 'Would move'} singleton files to parent shelves: ${stats.filesMovedToParent}.`,
      `${shouldApply ? 'Moved' : 'Would move'} grouped files into subject folders: ${stats.filesMovedToGroup}.`,
      `${shouldApply ? 'Created' : 'Would create'} group folders: ${stats.groupFoldersCreated}. Restored: ${stats.groupFoldersRestored}.`,
      `${shouldApply ? 'Archived' : 'Would archive'} singleton/redundant folders: ${stats.singletonFoldersArchived + stats.redundantFoldersArchived}.`,
      `${shouldApply ? 'Updated' : 'Would update'} folder order values: ${stats.orderUpdates}.`,
    ].join('\n')
  );
};

run()
  .catch((error) => {
    console.error('Premium Study Hub resource organization failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
