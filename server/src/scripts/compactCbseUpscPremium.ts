import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard, { type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const MONGO_URI = process.env.MONGO_URI;
const ROOT_WORKSPACE_SLUG = 'study-hub';
const shouldApply = process.argv.includes('--apply');

type CardDoc = any;
type FileDoc = any;

const stats = {
  duplicateFilesRemoved: 0,
  filesLiftedFromWrappers: 0,
  singletonFilesFlattened: 0,
  foldersArchived: 0,
  filesMovedIntoCanonicalPapers: 0,
  cardsRenamed: 0,
  styleUpdates: 0,
  orderUpdates: 0,
  cardsSaved: 0,
};

const normalizeKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const activeFiles = (card: CardDoc) =>
  (card.files || []).filter((file: FileDoc) => (file.status || 'published') !== 'archived');

const inactiveFiles = (card: CardDoc) =>
  (card.files || []).filter((file: FileDoc) => (file.status || 'published') === 'archived');

const fileIdentity = (file: FileDoc) => {
  const url = String(file.url || '').trim().toLowerCase();
  if (url) return `url:${url}`;
  return [
    'meta',
    normalizeKey(file.name || ''),
    file.year || '',
    normalizeKey(file.subject || ''),
    normalizeKey(file.paper || ''),
  ].join('|');
};

const sanitizeFile = (file: FileDoc) => {
  const payload = typeof file.toObject === 'function' ? file.toObject() : { ...file };
  delete payload._id;
  return payload;
};

const resourceTypeRank = new Map<string, number>([
  ['book', 10],
  ['syllabus', 20],
  ['pyq', 30],
  ['sample_paper', 40],
  ['answer_key', 50],
  ['material', 60],
  ['notes', 70],
  ['practice', 80],
]);

const fileOrder = (file: FileDoc) => [
  String(resourceTypeRank.get(String(file.resourceType || '').toLowerCase()) ?? 90).padStart(3, '0'),
  String(file.year ? 3000 - Number(file.year) : 9999).padStart(4, '0'),
  normalizeKey(file.subject || ''),
  normalizeKey(file.paper || ''),
  normalizeKey(file.stage || ''),
  normalizeKey(file.name || ''),
].join('|');

const sortCardFiles = (card: CardDoc) => {
  const before = (card.files || []).map(fileIdentity).join('\n');
  card.files = [...activeFiles(card).sort((a: FileDoc, b: FileDoc) => fileOrder(a).localeCompare(fileOrder(b))), ...inactiveFiles(card)];
  return before !== (card.files || []).map(fileIdentity).join('\n');
};

const resourceShelfKeys = new Set([
  'answer key',
  'answer keys',
  'books',
  'book',
  'formula sheets',
  'important questions',
  'ncert books',
  'ncert solutions',
  'notes',
  'practice questions',
  'previous year paper',
  'previous year papers',
  'pyq',
  'pyqs',
  'revision notes',
  'sample paper',
  'sample papers',
  'study material',
  'study materials',
  'syllabus',
]);

const isResourceShelf = (name = '') => resourceShelfKeys.has(normalizeKey(name));

const preservedClassResourceShelves = new Set([
  'answer keys',
  'board pattern',
  'ncert books',
  'previous year papers',
  'sample papers',
  'syllabus',
]);

const isPreservedClassResourceShelf = (name = '') => preservedClassResourceShelves.has(normalizeKey(name));

const styleFor = (name: string, parentName = ''): { iconKey: string; tone: StudyCardTone; goalType?: string; rank: number } => {
  const key = normalizeKey(name);
  const parentKey = normalizeKey(parentName);
  const classMatch = key.match(/^class\s+(\d{1,2})$/);

  if (key === 'cbse') return { iconKey: 'cbse', tone: 'emerald', goalType: 'board', rank: 20 };
  if (key === 'upsc cse') return { iconKey: 'upsc-cse', tone: 'blue', goalType: 'exam', rank: 10 };
  if (classMatch) return { iconKey: 'class', tone: 'emerald', goalType: 'class', rank: 100 + Number(classMatch[1]) };
  if (key === 'prelims') return { iconKey: 'pyq', tone: 'violet', rank: 10 };
  if (key === 'mains') return { iconKey: 'paper', tone: 'blue', rank: 20 };
  if (key.includes('essay')) return { iconKey: 'notes', tone: 'rose', rank: 25 };
  if (key.includes('optional')) return { iconKey: 'book', tone: 'indigo', rank: 35 };
  if (key.includes('gs paper')) return { iconKey: 'paper', tone: 'blue', rank: 30 };
  if (key.includes('csat')) return { iconKey: 'aptitude', tone: 'violet', rank: 15 };
  if (key === 'syllabus') return { iconKey: 'syllabus', tone: 'amber', rank: 10 };
  if (key.includes('ncert') && key.includes('book')) return { iconKey: 'book', tone: 'emerald', rank: 20 };
  if (key.includes('solution')) return { iconKey: 'book-solution', tone: 'emerald', rank: 30 };
  if (key.includes('study material')) return { iconKey: 'material', tone: 'blue', rank: 40 };
  if (key.includes('notes')) return { iconKey: 'notes', tone: 'blue', rank: 50 };
  if (key.includes('previous') || key === 'pyq' || key === 'pyqs') return { iconKey: 'pyq', tone: 'violet', rank: 60 };
  if (key.includes('sample')) return { iconKey: 'sample-paper', tone: 'violet', rank: 70 };
  if (key.includes('practice') || key.includes('important')) return { iconKey: 'practice', tone: 'amber', rank: 80 };
  if (key.includes('answer')) return { iconKey: 'answer-key', tone: 'cyan', rank: 90 };
  if (key.includes('formula')) return { iconKey: 'formula', tone: 'amber', rank: 95 };
  if (parentKey.includes('cbse') || /^class\s+\d{1,2}$/.test(parentKey)) return { iconKey: 'subject', tone: 'slate', goalType: 'subject', rank: 500 };
  return { iconKey: 'folder', tone: 'blue', rank: 500 };
};

const buildChildrenMap = (cards: CardDoc[]) => {
  const childrenByParent = new Map<string, CardDoc[]>();
  for (const card of cards.filter((item) => item.status !== 'archived')) {
    const key = String(card.parentId || 'root');
    const siblings = childrenByParent.get(key) || [];
    siblings.push(card);
    childrenByParent.set(key, siblings);
  }
  return childrenByParent;
};

const findPath = (childrenByParent: Map<string, CardDoc[]>, parts: string[]) => {
  let parentKey = 'root';
  let current: CardDoc | null = null;
  for (const part of parts) {
    current = (childrenByParent.get(parentKey) || []).find((child) => normalizeKey(child.name) === normalizeKey(part)) || null;
    if (!current) return null;
    parentKey = String(current._id);
  }
  return current;
};

const collectSubtree = (childrenByParent: Map<string, CardDoc[]>, root: CardDoc) => {
  const result: CardDoc[] = [];
  const queue = [root];
  while (queue.length) {
    const current = queue.shift()!;
    if (current.status === 'archived') continue;
    result.push(current);
    queue.push(...(childrenByParent.get(String(current._id)) || []));
  }
  return result;
};

const summarize = (childrenByParent: Map<string, CardDoc[]>, root: CardDoc) => {
  const cards = collectSubtree(childrenByParent, root);
  return {
    folders: cards.length,
    files: cards.reduce((sum, card) => sum + activeFiles(card).length, 0),
    emptyLeaves: cards.filter((card) => activeFiles(card).length === 0 && !(childrenByParent.get(String(card._id)) || []).length).length,
  };
};

const dirtyCards = new Set<CardDoc>();
const markDirty = (card: CardDoc) => dirtyCards.add(card);

const archiveCard = (card: CardDoc) => {
  if (card.status === 'archived') return;
  card.status = 'archived';
  card.visibility = 'private';
  markDirty(card);
  stats.foldersArchived += 1;
};

const dedupeAndSortFiles = (cards: CardDoc[]) => {
  for (const card of cards) {
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
    if (removed || sorted) markDirty(card);
    stats.duplicateFilesRemoved += removed;
  }
};

const moveFiles = (source: CardDoc, target: CardDoc, filesToMove: FileDoc[]) => {
  const moveKeys = new Set(filesToMove.map(fileIdentity));
  const targetKeys = new Set(activeFiles(target).map(fileIdentity));
  let moved = 0;
  for (const file of filesToMove) {
    const key = fileIdentity(file);
    if (targetKeys.has(key)) continue;
    target.files = target.files || [];
    target.files.push(sanitizeFile(file));
    targetKeys.add(key);
    moved += 1;
  }
  source.files = (source.files || []).filter((file: FileDoc) => (
    (file.status || 'published') === 'archived' || !moveKeys.has(fileIdentity(file))
  ));
  sortCardFiles(source);
  sortCardFiles(target);
  markDirty(source);
  markDirty(target);
  return moved;
};

const collectBranch = (childrenByParent: Map<string, CardDoc[]>, root: CardDoc) => {
  const branch: CardDoc[] = [];
  const queue = [root];
  while (queue.length) {
    const current = queue.shift()!;
    if (current.status === 'archived') continue;
    branch.push(current);
    queue.push(...(childrenByParent.get(String(current._id)) || []));
  }
  return branch;
};

const moveBranchFiles = (branchRoot: CardDoc, target: CardDoc, childrenByParent: Map<string, CardDoc[]>) => {
  let moved = 0;
  for (const branchCard of collectBranch(childrenByParent, branchRoot)) {
    if (String(branchCard._id) === String(target._id)) continue;
    const files = activeFiles(branchCard);
    if (files.length) moved += moveFiles(branchCard, target, files);
  }
  return moved;
};

const archiveBranch = (branchRoot: CardDoc, childrenByParent: Map<string, CardDoc[]>) => {
  for (const branchCard of collectBranch(childrenByParent, branchRoot).reverse()) {
    archiveCard(branchCard);
  }
};

const renameCard = (card: CardDoc, nextName: string) => {
  if (card.name === nextName) return;
  card.name = nextName;
  markDirty(card);
  stats.cardsRenamed += 1;
};

const simplifySubjectKey = (value = '') =>
  normalizeKey(value)
    .replace(/\b(class|cbse|ncert|book|books|textbook|textbooks|solution|solutions)\b/g, ' ')
    .replace(/\b(sample|papers?|answer|keys?|previous|year|pyq|practice|questions?)\b/g, ' ')
    .replace(/\b(part|volume|vol|chapter|paper)\s+\d+\b/g, ' ')
    .replace(/\b\d{4}\b/g, ' ')
    .replace(/\b\d{1,2}\b/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const subjectAlias = (value = '') => {
  const key = simplifySubjectKey(value);
  if (key === 'maths') return 'mathematics';
  if (key === 'sst' || key === 'social studies') return 'social science';
  if (key === 'accountancy accounts') return 'accountancy';
  return key;
};

const subjectKeyForCard = (card: CardDoc) => subjectAlias(card.name);

const findSubjectTarget = (subjects: CardDoc[], hints: string[]) => {
  const subjectEntries = subjects.map((subject) => ({
    card: subject,
    key: subjectKeyForCard(subject),
  })).filter((entry) => entry.key);

  const cleanedHints = Array.from(new Set(hints.map(subjectAlias).filter((hint) => hint.length >= 4)));
  for (const hint of cleanedHints) {
    const exact = subjectEntries.find((entry) => entry.key === hint);
    if (exact) return exact.card;
  }

  for (const hint of cleanedHints) {
    const matches = subjectEntries.filter((entry) => (
      entry.key.includes(hint) ||
      hint.includes(entry.key)
    ));
    if (matches.length === 1) return matches[0].card;
    if (hint === 'mathematics') {
      const standard = matches.find((entry) => entry.key.includes('standard'));
      if (standard) return standard.card;
      const mathematics = matches.find((entry) => entry.key === 'mathematics');
      if (mathematics) return mathematics.card;
    }
  }

  return null;
};

const fileSubjectHints = (file: FileDoc) => [
  file.subject,
  file.paper,
  file.stage,
  file.name,
].filter(Boolean).map(String);

const mergeClassResourceShelvesIntoSubjects = (cards: CardDoc[], root: CardDoc) => {
  let childrenByParent = buildChildrenMap(cards);
  const classCards = collectSubtree(childrenByParent, root).filter((card) => /^class\s+\d{1,2}$/.test(normalizeKey(card.name)));

  for (const classCard of classCards) {
    const children = childrenByParent.get(String(classCard._id)) || [];
    const subjects = children.filter((child) => !isResourceShelf(child.name));
    const shelves = children.filter((child) => isResourceShelf(child.name) && !isPreservedClassResourceShelf(child.name));
    if (!subjects.length || !shelves.length) continue;

    for (const shelf of shelves) {
      for (const file of [...activeFiles(shelf)]) {
        const target = findSubjectTarget(subjects, fileSubjectHints(file));
        stats.filesLiftedFromWrappers += moveFiles(shelf, target || classCard, [file]);
      }

      childrenByParent = buildChildrenMap(cards);
      for (const shelfChild of childrenByParent.get(String(shelf._id)) || []) {
        const branchFiles = collectBranch(childrenByParent, shelfChild).flatMap((branchCard) => activeFiles(branchCard));
        const target = findSubjectTarget(subjects, [
          shelfChild.name,
          ...branchFiles.flatMap(fileSubjectHints),
        ]);
        if (!target) continue;

        stats.filesLiftedFromWrappers += moveBranchFiles(shelfChild, target, childrenByParent);
        archiveBranch(shelfChild, childrenByParent);
        childrenByParent = buildChildrenMap(cards);
      }

      const remainingChildren = childrenByParent.get(String(shelf._id)) || [];
      if (!activeFiles(shelf).length && !remainingChildren.length) {
        archiveCard(shelf);
        childrenByParent = buildChildrenMap(cards);
      }
    }
  }
};

const flattenPreservedClassResourceShelves = (cards: CardDoc[], root: CardDoc) => {
  let childrenByParent = buildChildrenMap(cards);
  const classCards = collectSubtree(childrenByParent, root).filter((card) => /^class\s+\d{1,2}$/.test(normalizeKey(card.name)));

  for (const classCard of classCards) {
    const shelves = (childrenByParent.get(String(classCard._id)) || []).filter((child) => isPreservedClassResourceShelf(child.name));
    for (const shelf of shelves) {
      for (const child of [...(childrenByParent.get(String(shelf._id)) || [])]) {
        stats.filesLiftedFromWrappers += moveBranchFiles(child, shelf, childrenByParent);
        archiveBranch(child, childrenByParent);
        childrenByParent = buildChildrenMap(cards);
      }
    }
  }
};

const getClassShelfTargetForFile = (file: FileDoc, shelvesByKey: Map<string, CardDoc>) => {
  const resourceType = normalizeKey(file.resourceType || '');
  const sourceType = normalizeKey(file.sourceType || '');
  const sourceName = normalizeKey(file.sourceName || '');
  const name = normalizeKey(file.name || '');
  const paper = normalizeKey(file.paper || '');

  if (sourceType === 'ncert' || sourceName.includes('ncert') || (resourceType === 'book' && name.includes('ncert'))) {
    return shelvesByKey.get('ncert books') || null;
  }
  if (resourceType === 'sample paper' || resourceType === 'sample_paper' || paper === 'sample paper' || name.includes('sample paper')) {
    return shelvesByKey.get('sample papers') || null;
  }
  if (resourceType === 'answer key' || resourceType === 'answer_key' || paper === 'marking scheme' || name.includes('marking scheme') || name.includes('answer key')) {
    return shelvesByKey.get('answer keys') || null;
  }

  return null;
};

const reclaimClassOfficialFilesIntoShelves = (cards: CardDoc[], root: CardDoc) => {
  let childrenByParent = buildChildrenMap(cards);
  const classCards = collectSubtree(childrenByParent, root).filter((card) => /^class\s+\d{1,2}$/.test(normalizeKey(card.name)));

  for (const classCard of classCards) {
    const directChildren = childrenByParent.get(String(classCard._id)) || [];
    const shelvesByKey = new Map(
      directChildren
        .filter((child) => isPreservedClassResourceShelf(child.name))
        .map((child) => [normalizeKey(child.name), child])
    );
    if (!shelvesByKey.size) continue;

    const preservedShelfIds = new Set<CardDoc>();
    for (const shelf of shelvesByKey.values()) {
      collectBranch(childrenByParent, shelf).forEach((card) => preservedShelfIds.add(card));
    }

    const sourceCards = collectBranch(childrenByParent, classCard).filter((card) => !preservedShelfIds.has(card));
    for (const sourceCard of sourceCards) {
      for (const file of [...activeFiles(sourceCard)]) {
        const target = getClassShelfTargetForFile(file, shelvesByKey);
        if (!target || String(target._id) === String(sourceCard._id)) continue;
        stats.filesLiftedFromWrappers += moveFiles(sourceCard, target, [file]);
      }
    }

    childrenByParent = buildChildrenMap(cards);
  }
};

const liftFilesFromResourceWrappers = (cards: CardDoc[], root: CardDoc) => {
  let childrenByParent = buildChildrenMap(cards);
  const subtree = collectSubtree(childrenByParent, root);

  for (const card of subtree) {
    if (/^class\s+\d{1,2}$/.test(normalizeKey(card.name))) continue;
    if (String(card._id) === String(root._id) || isResourceShelf(card.name)) continue;
    const children = childrenByParent.get(String(card._id)) || [];
    if (!children.length || !children.every((child) => isResourceShelf(child.name))) continue;

    let moved = 0;
    for (const child of children) {
      moved += moveBranchFiles(child, card, childrenByParent);
      archiveBranch(child, childrenByParent);
    }
    stats.filesLiftedFromWrappers += moved;
    childrenByParent = buildChildrenMap(cards);
  }
};

const isPaperTwoText = (value = '') => {
  const key = normalizeKey(value);
  return key.includes('csat') || /\bpaper\s*(ii|2)\b/.test(key);
};

const isPaperOneText = (value = '') => {
  const key = normalizeKey(value);
  return /\bpaper\s*(i|1)\b/.test(key) || key.includes('gs paper');
};

const choosePrelimsFileTarget = (file: FileDoc, sourceName: string, gsTarget: CardDoc, csatTarget: CardDoc) => {
  const fileText = normalizeKey([file.paper, file.name, file.subject, file.stage].filter(Boolean).join(' '));
  const sourceText = normalizeKey(sourceName);
  if (isPaperTwoText(fileText || sourceText)) return csatTarget;
  if (isPaperOneText(fileText || sourceText)) return gsTarget;
  return gsTarget;
};

const mergeUpscPrelimsPaperDuplicates = (cards: CardDoc[], root: CardDoc) => {
  if (normalizeKey(root.name) !== 'upsc cse') return;

  let childrenByParent = buildChildrenMap(cards);
  const prelims = (childrenByParent.get(String(root._id)) || []).find((child) => normalizeKey(child.name) === 'prelims');
  if (!prelims) return;

  const prelimsChildren = childrenByParent.get(String(prelims._id)) || [];
  const gsTarget = prelimsChildren.find((child) => ['gs paper 1', 'gs paper i'].includes(normalizeKey(child.name))) ||
    prelimsChildren.find((child) => normalizeKey(child.name).includes('gs paper') && !isPaperTwoText(child.name));
  const csatTarget = prelimsChildren.find((child) => normalizeKey(child.name) === 'csat paper ii') ||
    prelimsChildren.find((child) => normalizeKey(child.name).includes('csat')) ||
    prelimsChildren.find((child) => isPaperTwoText(child.name) && !normalizeKey(child.name).includes('paper i paper ii'));

  if (!gsTarget || !csatTarget) return;

  renameCard(gsTarget, 'GS Paper I');
  renameCard(csatTarget, 'CSAT Paper II');

  const canonicalIds = new Set([String(gsTarget._id), String(csatTarget._id)]);
  for (const child of prelimsChildren) {
    if (canonicalIds.has(String(child._id))) continue;

    childrenByParent = buildChildrenMap(cards);
    for (const branchCard of collectBranch(childrenByParent, child)) {
      for (const file of [...activeFiles(branchCard)]) {
        const target = choosePrelimsFileTarget(file, child.name, gsTarget, csatTarget);
        stats.filesMovedIntoCanonicalPapers += moveFiles(branchCard, target, [file]);
      }
    }
    archiveBranch(child, childrenByParent);
  }

  if (sortCardFiles(gsTarget)) markDirty(gsTarget);
  if (sortCardFiles(csatTarget)) markDirty(csatTarget);
};

const flattenSingleFileGroupsInsideShelves = (cards: CardDoc[], root: CardDoc) => {
  let childrenByParent = buildChildrenMap(cards);
  const subtree = collectSubtree(childrenByParent, root);
  for (const shelf of subtree.filter((card) => isResourceShelf(card.name))) {
    const children = childrenByParent.get(String(shelf._id)) || [];
    for (const child of children) {
      if ((childrenByParent.get(String(child._id)) || []).length) continue;
      const files = activeFiles(child);
      if (files.length !== 1) continue;
      stats.singletonFilesFlattened += moveFiles(child, shelf, files);
      archiveCard(child);
      childrenByParent = buildChildrenMap(cards);
    }
  }
};

const archiveEmptyBranches = (cards: CardDoc[], root: CardDoc) => {
  const childrenByParent = buildChildrenMap(cards);
  const subtree = collectSubtree(childrenByParent, root).sort((a, b) => {
    const aDepth = String(a.parentId || '').length;
    const bDepth = String(b.parentId || '').length;
    return bDepth - aDepth;
  });

  const hasFilesInSubtree = (card: CardDoc): boolean => {
    if (activeFiles(card).length) return true;
    return (childrenByParent.get(String(card._id)) || []).some(hasFilesInSubtree);
  };

  for (const card of subtree) {
    if (String(card._id) === String(root._id)) continue;
    if (!hasFilesInSubtree(card)) archiveCard(card);
  }
};

const styleAndOrder = (cards: CardDoc[], root: CardDoc) => {
  let childrenByParent = buildChildrenMap(cards);
  for (const card of collectSubtree(childrenByParent, root)) {
    const parent = card.parentId ? cards.find((item) => String(item._id) === String(card.parentId)) : null;
    const style = styleFor(card.name, parent?.name || '');
    const goalType = style.goalType || card.goalType || 'resource_folder';
    if (card.iconKey !== style.iconKey || card.tone !== style.tone || card.goalType !== goalType || card.visibility !== 'public') {
      card.iconKey = style.iconKey;
      card.tone = style.tone;
      card.goalType = goalType;
      card.visibility = 'public';
      markDirty(card);
      stats.styleUpdates += 1;
    }
  }

  childrenByParent = buildChildrenMap(cards);
  const subtreeIds = new Set(collectSubtree(childrenByParent, root).map((card) => String(card._id)));
  const parentKeys = new Set(Array.from(subtreeIds).map((id) => String(cards.find((card) => String(card._id) === id)?.parentId || 'root')));

  for (const parentKey of parentKeys) {
    if (parentKey === 'root') continue;
    const siblings = (childrenByParent.get(parentKey) || []).filter((card) => subtreeIds.has(String(card._id)));
    siblings.sort((a, b) => {
      const parent = cards.find((item) => String(item._id) === parentKey);
      const aStyle = styleFor(a.name, parent?.name || '');
      const bStyle = styleFor(b.name, parent?.name || '');
      return aStyle.rank - bStyle.rank || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
    siblings.forEach((sibling, index) => {
      const nextOrder = (index + 1) * 10;
      if (sibling.order === nextOrder) return;
      sibling.order = nextOrder;
      markDirty(sibling);
      stats.orderUpdates += 1;
    });
  }
};

const compactTarget = (cards: CardDoc[], label: string, root: CardDoc) => {
  let childrenByParent = buildChildrenMap(cards);
  const before = summarize(childrenByParent, root);

  dedupeAndSortFiles(collectSubtree(childrenByParent, root));
  flattenPreservedClassResourceShelves(cards, root);
  reclaimClassOfficialFilesIntoShelves(cards, root);
  mergeClassResourceShelvesIntoSubjects(cards, root);
  liftFilesFromResourceWrappers(cards, root);
  mergeUpscPrelimsPaperDuplicates(cards, root);
  flattenSingleFileGroupsInsideShelves(cards, root);
  archiveEmptyBranches(cards, root);
  styleAndOrder(cards, root);

  childrenByParent = buildChildrenMap(cards);
  const after = summarize(childrenByParent, root);
  console.log(`${label}: ${before.folders} -> ${after.folders} folders, ${before.files} -> ${after.files} files, empty leaves ${after.emptyLeaves}.`);
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');

  console.log(`${shouldApply ? 'Applying' : 'Dry run'} CBSE + UPSC CSE premium compaction.`);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });

  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean<{ _id: Types.ObjectId }>();
  if (!workspace) throw new Error('Study Hub workspace not found.');

  const cards = await StudyCard.find({ workspaceId: workspace._id, status: { $ne: 'archived' } });
  const childrenByParent = buildChildrenMap(cards);
  const targets = [
    { label: 'CBSE', root: findPath(childrenByParent, ['School Boards', 'CBSE']) },
    { label: 'UPSC CSE', root: findPath(childrenByParent, ['Competitive Exams', 'UPSC CSE']) },
  ];

  for (const target of targets) {
    if (!target.root) {
      console.log(`${target.label}: missing.`);
      continue;
    }
    compactTarget(cards, target.label, target.root);
  }

  if (shouldApply) {
    for (const card of dirtyCards) {
      await card.save();
      stats.cardsSaved += 1;
    }
  }

  console.log(`Duplicate file entries removed: ${stats.duplicateFilesRemoved}.`);
  console.log(`Files lifted from wrapper folders: ${stats.filesLiftedFromWrappers}.`);
  console.log(`Files moved into canonical papers: ${stats.filesMovedIntoCanonicalPapers}.`);
  console.log(`Single-file groups flattened: ${stats.singletonFilesFlattened}.`);
  console.log(`Folders archived: ${stats.foldersArchived}.`);
  console.log(`Cards renamed: ${stats.cardsRenamed}.`);
  console.log(`Style updates: ${stats.styleUpdates}. Order updates: ${stats.orderUpdates}.`);
  console.log(`${shouldApply ? 'Saved' : 'Would save'} cards: ${dirtyCards.size}.`);
};

run()
  .catch((error) => {
    console.error('CBSE + UPSC premium compaction failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
