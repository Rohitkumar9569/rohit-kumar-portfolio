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

const resourceSpecs = [
  { name: 'Syllabus', slug: 'syllabus', iconKey: 'syllabus', tone: 'cyan' as StudyCardTone, order: 10 },
  { name: 'NCERT Books', slug: 'ncert-books', iconKey: 'book', tone: 'emerald' as StudyCardTone, order: 20 },
  { name: 'NCERT Solutions', slug: 'ncert-solutions', iconKey: 'book-solution', tone: 'emerald' as StudyCardTone, order: 30 },
  { name: 'Study Material', slug: 'study-material', iconKey: 'material', tone: 'blue' as StudyCardTone, order: 40 },
  { name: 'Previous Year Papers', slug: 'previous-year-papers', iconKey: 'pyq', tone: 'violet' as StudyCardTone, order: 60 },
  { name: 'Sample Papers', slug: 'sample-papers', iconKey: 'sample-paper', tone: 'violet' as StudyCardTone, order: 70 },
];

const shelfAliases = new Map<string, string>([
  ['syllabus', 'Syllabus'],
  ['official syllabus', 'Syllabus'],
  ['class syllabus', 'Syllabus'],
  ['ncert', 'NCERT Books'],
  ['ncert book', 'NCERT Books'],
  ['ncert books', 'NCERT Books'],
  ['book', 'NCERT Books'],
  ['books', 'NCERT Books'],
  ['textbook', 'NCERT Books'],
  ['textbooks', 'NCERT Books'],
  ['ncert solution', 'NCERT Solutions'],
  ['ncert solutions', 'NCERT Solutions'],
  ['solution', 'NCERT Solutions'],
  ['solutions', 'NCERT Solutions'],
  ['study material', 'Study Material'],
  ['study materials', 'Study Material'],
  ['material', 'Study Material'],
  ['materials', 'Study Material'],
  ['notes', 'Study Material'],
  ['revision notes', 'Study Material'],
  ['pyq', 'Previous Year Papers'],
  ['pyqs', 'Previous Year Papers'],
  ['previous year paper', 'Previous Year Papers'],
  ['previous year papers', 'Previous Year Papers'],
  ['question papers', 'Previous Year Papers'],
  ['sample paper', 'Sample Papers'],
  ['sample papers', 'Sample Papers'],
]);

const genericWrapperKeys = new Set([
  '',
  'all subjects',
  'book',
  'books',
  'complete book',
  'complete books',
  'document',
  'documents',
  'file',
  'files',
  'folder',
  'folders',
  'material',
  'materials',
  'resource',
  'resources',
]);

const subjectOrder = [
  'english',
  'hindi',
  'sanskrit',
  'mathematics',
  'maths',
  'science',
  'environmental studies',
  'social science',
  'physics',
  'chemistry',
  'biology',
  'accountancy',
  'business studies',
  'economics',
  'history',
  'geography',
  'political science',
  'polity',
  'computer science',
  'informatics practices',
  'psychology',
  'sociology',
  'home science',
];

const stats = {
  cbseRoots: 0,
  classCardsChecked: 0,
  rootShelvesCreated: 0,
  rootShelvesRestored: 0,
  classFoldersCreated: 0,
  classFoldersRestored: 0,
  subjectFoldersCreated: 0,
  subjectFoldersRestored: 0,
  cardsMoved: 0,
  filesMoved: 0,
  duplicatesSkipped: 0,
  archivedOldFolders: 0,
  styled: 0,
};

const slugify = (value: string, fallback = 'item') => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '');
  return slug || fallback;
};

const normalizeKey = (value = '') =>
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
    .filter(Boolean)
    .map((part) => {
      if (/^(?:NCERT|CBSE|ICSE|ISC|EVS|IP|ICT|AI|IT)$/i.test(part)) return part.toUpperCase();
      if (/^(?:and|or|of|in|for|to|the)$/i.test(part)) return part.toLowerCase();
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/\bIi\b/g, 'II')
    .replace(/\bIii\b/g, 'III')
    .replace(/\bIv\b/g, 'IV');

const activeFiles = (card: CardDoc) =>
  (card.files || []).filter((file: FileDoc) => (file.status || 'published') !== 'archived');

const fileIdentity = (file: FileDoc) => {
  const url = String(file.url || '').trim().toLowerCase();
  if (url) return `url:${url}`;
  return [
    normalizeKey(file.name || ''),
    normalizeKey(file.subject || ''),
    normalizeKey(file.paper || ''),
    normalizeKey(file.topic || ''),
    file.year || '',
  ].join('|');
};

const sanitizeFilePayload = (file: FileDoc) => {
  const payload = typeof file.toObject === 'function' ? file.toObject() : { ...file };
  delete payload._id;
  return payload;
};

const getResourceSpec = (name: string) => {
  const alias = shelfAliases.get(normalizeKey(name));
  return resourceSpecs.find((spec) => spec.name === alias || spec.slug === slugify(name));
};

const inferResourceSpecFromFile = (file: FileDoc) => {
  const combined = normalizeKey(`${file.resourceType || ''} ${file.sourceName || ''} ${file.sourceType || ''} ${file.name || ''} ${file.paper || ''}`);
  if (combined.includes('ncert') && combined.includes('solution')) return resourceSpecs[2];
  if (combined.includes('ncert') || combined.includes('complete book') || combined.includes('book')) return resourceSpecs[1];
  if (combined.includes('syllabus')) return resourceSpecs[0];
  if (combined.includes('sample')) return resourceSpecs[5];
  if (combined.includes('pyq') || combined.includes('previous year') || combined.includes('question paper')) return resourceSpecs[4];
  return resourceSpecs[3];
};

const getClassNumber = (value = '') => {
  const match = String(value).match(/\bclass\s+(\d{1,2})\b/i);
  const number = match ? Number(match[1]) : 0;
  return number >= 1 && number <= 12 ? number : 0;
};

const getClassName = (value = '') => {
  const number = getClassNumber(value);
  return number ? `Class ${number}` : '';
};

const inferClassName = (card: CardDoc, file?: FileDoc) =>
  getClassName(card.name) ||
  getClassName(`${file?.name || ''} ${file?.paper || ''} ${file?.topic || ''}`) ||
  'Class 12';

const getClassOrder = (name = '') => {
  const number = getClassNumber(name);
  return number ? number * 10 : 500;
};

const exactSubjectLabel = (value = '') => {
  const key = normalizeKey(value);
  const labels: Record<string, string> = {
    accountancy: 'Accountancy',
    biology: 'Biology',
    biotechnology: 'Biotechnology',
    'business studies': 'Business Studies',
    chemistry: 'Chemistry',
    'computer science': 'Computer Science',
    economics: 'Economics',
    english: 'English',
    evs: 'Environmental Studies',
    'environmental studies': 'Environmental Studies',
    geography: 'Geography',
    hindi: 'Hindi',
    history: 'History',
    'home science': 'Home Science',
    'informatics practices': 'Informatics Practices',
    ip: 'Informatics Practices',
    mathematics: 'Mathematics',
    maths: 'Mathematics',
    physics: 'Physics',
    polity: 'Polity',
    'political science': 'Polity',
    psychology: 'Psychology',
    sanskrit: 'Sanskrit',
    science: 'Science',
    sociology: 'Sociology',
  };
  return labels[key] || null;
};

const inferSubjectFromText = (value = '') => {
  const key = normalizeKey(value);
  if (!key) return '';
  const exact = exactSubjectLabel(key);
  if (exact) return exact;

  if (key.includes('informatics practices')) return 'Informatics Practices';
  if (key.includes('computer science')) return 'Computer Science';
  if (key.includes('business studies')) return 'Business Studies';
  if (key.includes('home science') || key.includes('human ecology')) return 'Home Science';
  if (key.includes('environmental studies') || key.includes('world around us')) return 'Environmental Studies';
  if (key.includes('political theory') || key.includes('contemporary world politics') || key.includes('politics in india') || key.includes('india constitution') || key.includes('democratic politics')) return 'Polity';
  if (key.includes('themes in indian history') || key.includes('world history') || key.includes('india and the contemporary world') || key.includes('our past') || key.includes('history')) return 'History';
  if (key.includes('contemporary india') || key.includes('earth our habitat') || key.includes('resources and development') || key.includes('physical environment') || key.includes('geography')) return 'Geography';
  if (key.includes('understanding economic development') || key.includes('economic development') || key.includes('economics') || key.includes('economy')) return 'Economics';
  if (key.includes('accountancy') || key.includes('accounting')) return 'Accountancy';
  if (key.includes('physics')) return 'Physics';
  if (key.includes('chemistry')) return 'Chemistry';
  if (key.includes('biology')) return 'Biology';
  if (key.includes('mathematics') || key.includes('maths') || key.includes('ganita')) return 'Mathematics';
  if (key.includes('science')) return 'Science';
  if (key.includes('english') || key.includes('first flight') || key.includes('footprints') || key.includes('hornbill') || key.includes('snapshots') || key.includes('flamingo') || key.includes('vistas')) return 'English';
  if (key.includes('hindi') || key.includes('kritika') || key.includes('kshitij') || key.includes('sparsh')) return 'Hindi';
  if (key.includes('sanskrit')) return 'Sanskrit';

  return '';
};

const cleanSubjectName = (name = '') => {
  const cleaned = name
    .replace(/\bNCERT\b/gi, '')
    .replace(/\bClass\s+\d{1,2}\b/gi, '')
    .replace(/\bComplete\s+Books?\b/gi, '')
    .replace(/\bBooks?\b/gi, '')
    .replace(/\bSyllabus\b/gi, '')
    .replace(/\bStudy\s+Materials?\b/gi, '')
    .replace(/\s+-\s*$/g, '')
    .trim();
  const key = normalizeKey(cleaned);
  if (!key || genericWrapperKeys.has(key) || shelfAliases.has(key)) return '';
  return exactSubjectLabel(cleaned) || inferSubjectFromText(cleaned) || titleCase(cleaned);
};

const inferSubject = (file: FileDoc, containerName = '') => (
  cleanSubjectName(containerName) ||
  exactSubjectLabel(file.subject || '') ||
  inferSubjectFromText(file.subject || '') ||
  inferSubjectFromText(`${file.paper || ''} ${file.topic || ''} ${file.name || ''}`) ||
  'General'
);

const getSubjectOrder = (name: string) => {
  const key = normalizeKey(name);
  const index = subjectOrder.findIndex((subject) => key === subject || key.includes(subject));
  return index >= 0 ? (index + 1) * 10 : 500;
};

const getSubjectIcon = (name: string) => {
  const key = normalizeKey(name);
  if (key.includes('physics')) return 'physics';
  if (key.includes('chemistry')) return 'chemistry';
  if (key.includes('biology')) return 'biology';
  if (key.includes('math')) return 'maths';
  if (key.includes('computer') || key.includes('informatics')) return 'coding';
  if (key.includes('economics') || key.includes('accountancy') || key.includes('business')) return 'chart';
  if (key.includes('history') || key.includes('geography') || key.includes('polity') || key.includes('political')) return 'book';
  if (key.includes('science')) return 'science';
  return 'subject';
};

const getSubjectTone = (name: string): StudyCardTone => {
  const key = normalizeKey(name);
  if (key.includes('physics') || key.includes('computer') || key.includes('informatics')) return 'cyan';
  if (key.includes('chemistry')) return 'amber';
  if (key.includes('biology') || key.includes('science')) return 'emerald';
  if (key.includes('math')) return 'violet';
  if (key.includes('english') || key.includes('hindi') || key.includes('sanskrit')) return 'rose';
  if (key.includes('history') || key.includes('geography') || key.includes('polity') || key.includes('political')) return 'indigo';
  return 'blue';
};

const findChildren = (workspaceId: Types.ObjectId, parentId: Types.ObjectId | null) =>
  StudyCard.find({ workspaceId, parentId, status: { $ne: 'archived' } }).sort({ order: 1, name: 1 });

const styleCard = async (card: CardDoc, updates: Record<string, unknown>) => {
  const changed = Object.entries(updates).some(([key, value]) => String(card[key] ?? '') !== String(value));
  if (!changed) return;
  stats.styled += 1;
  if (shouldApply) {
    Object.assign(card, updates);
    await card.save();
  }
};

const ensureChild = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId,
  name: string,
  updates: Record<string, unknown>,
  counter: 'rootShelves' | 'classFolders' | 'subjectFolders'
) => {
  const slug = slugify(name);
  const active = await StudyCard.findOne({ workspaceId, parentId, slug, status: { $ne: 'archived' } });
  if (active) {
    await styleCard(active, { name, slug, visibility: 'public', status: 'published', ...updates });
    return active;
  }

  const archived = await StudyCard.findOne({ workspaceId, parentId, slug });
  if (archived) {
    stats[`${counter}Restored` as keyof typeof stats] += 1;
    if (shouldApply) {
      Object.assign(archived, { name, slug, status: 'published', visibility: 'public', ...updates });
      await archived.save();
    }
    return archived;
  }

  stats[`${counter}Created` as keyof typeof stats] += 1;
  if (!shouldApply) return null;

  return StudyCard.create({
    workspaceId,
    parentId,
    name,
    slug,
    status: 'published',
    visibility: 'public',
    files: [],
    ...updates,
  });
};

const ensureRootShelf = (workspaceId: Types.ObjectId, cbseRoot: CardDoc, spec: typeof resourceSpecs[number]) =>
  ensureChild(workspaceId, cbseRoot._id as Types.ObjectId, spec.name, {
    iconKey: spec.iconKey,
    tone: spec.tone,
    goalType: 'resource_folder',
    order: spec.order,
  }, 'rootShelves');

const ensureClassInShelf = (workspaceId: Types.ObjectId, shelf: CardDoc, className: string) =>
  ensureChild(workspaceId, shelf._id as Types.ObjectId, className, {
    iconKey: 'class',
    tone: 'emerald',
    goalType: 'class',
    order: getClassOrder(className),
  }, 'classFolders');

const ensureSubjectInClass = (workspaceId: Types.ObjectId, classCard: CardDoc, subject: string) =>
  ensureChild(workspaceId, classCard._id as Types.ObjectId, subject, {
    iconKey: getSubjectIcon(subject),
    tone: getSubjectTone(subject),
    goalType: 'subject',
    order: getSubjectOrder(subject),
  }, 'subjectFolders');

const appendFiles = async (target: CardDoc, files: FileDoc[], subject: string) => {
  if (!files.length) return { appended: 0, duplicates: 0 };
  if (!shouldApply) return { appended: files.length, duplicates: 0 };

  const targetDoc = await StudyCard.findById(target._id);
  if (!targetDoc) return { appended: 0, duplicates: 0 };
  const keys = new Set((targetDoc.files || []).map((file: FileDoc) => fileIdentity(file)));
  let appended = 0;
  let duplicates = 0;

  for (const file of files) {
    const identity = fileIdentity(file);
    if (keys.has(identity)) {
      duplicates += 1;
      continue;
    }
    const payload = sanitizeFilePayload(file);
    payload.subject = subject;
    targetDoc.files.push(payload);
    keys.add(identity);
    appended += 1;
  }

  await targetDoc.save();
  return { appended, duplicates };
};

const removeFiles = async (source: CardDoc, files: FileDoc[]) => {
  if (!files.length || !shouldApply) return;
  const sourceDoc = await StudyCard.findById(source._id);
  if (!sourceDoc) return;
  const keys = new Set(files.map(fileIdentity));
  sourceDoc.files = (sourceDoc.files || []).filter((file: FileDoc) => (
    (file.status || 'published') === 'archived' || !keys.has(fileIdentity(file))
  ));
  await sourceDoc.save();
};

const archiveIfEmpty = async (workspaceId: Types.ObjectId, card: CardDoc) => {
  const fresh = await StudyCard.findById(card._id);
  if (!fresh) return false;
  const fileCount = activeFiles(fresh).length;
  const childCount = await StudyCard.countDocuments({ workspaceId, parentId: fresh._id, status: { $ne: 'archived' } });
  if (fileCount || childCount) return false;
  stats.archivedOldFolders += 1;
  if (shouldApply) {
    fresh.status = 'archived';
    fresh.visibility = 'private';
    await fresh.save();
  }
  return true;
};

const moveFilesIntoResourcePath = async (
  workspaceId: Types.ObjectId,
  cbseRoot: CardDoc,
  source: CardDoc,
  files: FileDoc[],
  className: string,
  resourceSpec: typeof resourceSpecs[number],
  containerName = source.name
) => {
  const active = files.filter((file) => (file.status || 'published') !== 'archived');
  if (!active.length) return;

  const rootShelf = await ensureRootShelf(workspaceId, cbseRoot, resourceSpec);
  if (!rootShelf) {
    stats.filesMoved += active.length;
    return;
  }
  const classInShelf = await ensureClassInShelf(workspaceId, rootShelf, className);
  if (!classInShelf) {
    stats.filesMoved += active.length;
    return;
  }

  const bySubject = new Map<string, FileDoc[]>();
  for (const file of active) {
    const subject = inferSubject(file, containerName);
    const current = bySubject.get(subject) || [];
    current.push(file);
    bySubject.set(subject, current);
  }

  for (const [subject, subjectFiles] of bySubject) {
    const subjectCard = await ensureSubjectInClass(workspaceId, classInShelf, subject);
    if (!subjectCard) {
      stats.filesMoved += subjectFiles.length;
      continue;
    }
    const result = await appendFiles(subjectCard, subjectFiles, subject);
    stats.filesMoved += result.appended;
    stats.duplicatesSkipped += result.duplicates;
  }

  await removeFiles(source, active);
};

const mergeOrMoveCard = async (workspaceId: Types.ObjectId, source: CardDoc, targetParent: CardDoc, name: string) => {
  const target = await ensureSubjectInClass(workspaceId, targetParent, name);
  if (!target) {
    stats.cardsMoved += 1;
    return;
  }
  if (String(target._id) === String(source._id)) return;

  const targetCollision = await StudyCard.findOne({
    workspaceId,
    parentId: targetParent._id,
    slug: source.slug,
    _id: { $ne: source._id },
    status: { $ne: 'archived' },
  });

  if (!targetCollision && normalizeKey(target.name) === normalizeKey(source.name)) {
    if (shouldApply) {
      source.parentId = targetParent._id;
      source.goalType = 'subject';
      source.iconKey = getSubjectIcon(name);
      source.tone = getSubjectTone(name);
      source.order = getSubjectOrder(name);
      await source.save();
    }
    stats.cardsMoved += 1;
    return;
  }

  const result = await appendFiles(target, activeFiles(source), name);
  stats.filesMoved += result.appended;
  stats.duplicatesSkipped += result.duplicates;

  const children = await findChildren(workspaceId, source._id as Types.ObjectId);
  for (const child of children) {
    if (shouldApply) {
      const collision = await StudyCard.findOne({
        workspaceId,
        parentId: target._id,
        slug: child.slug,
        status: { $ne: 'archived' },
      });
      if (!collision) {
        child.parentId = target._id;
        await child.save();
        stats.cardsMoved += 1;
      }
    } else {
      stats.cardsMoved += 1;
    }
  }

  await removeFiles(source, activeFiles(source));
  await archiveIfEmpty(workspaceId, source);
};

const normalizeRootShelf = async (workspaceId: Types.ObjectId, cbseRoot: CardDoc, rootShelf: CardDoc, resourceSpec: typeof resourceSpecs[number]) => {
  await moveFilesIntoResourcePath(workspaceId, cbseRoot, rootShelf, activeFiles(rootShelf), 'Class 12', resourceSpec, rootShelf.name);

  const children = await findChildren(workspaceId, rootShelf._id as Types.ObjectId);
  for (const child of children) {
    const childClass = getClassName(child.name);
    if (childClass) {
      const classInShelf = await ensureClassInShelf(workspaceId, rootShelf, childClass);
      if (!classInShelf || String(classInShelf._id) === String(child._id)) {
        await normalizeClassInRootShelf(workspaceId, cbseRoot, rootShelf, child, resourceSpec);
      } else {
        await moveFilesIntoResourcePath(workspaceId, cbseRoot, child, activeFiles(child), childClass, resourceSpec, child.name);
        const subjectChildren = await findChildren(workspaceId, child._id as Types.ObjectId);
        for (const subjectChild of subjectChildren) {
          const subject = cleanSubjectName(subjectChild.name) || inferSubjectFromText(subjectChild.name) || subjectChild.name;
          await mergeOrMoveCard(workspaceId, subjectChild, classInShelf, subject);
        }
        await archiveIfEmpty(workspaceId, child);
      }
      continue;
    }

    const inferredClass = inferClassName(rootShelf, activeFiles(child)[0]);
    const classInShelf = await ensureClassInShelf(workspaceId, rootShelf, inferredClass);
    if (!classInShelf) continue;
    if (genericWrapperKeys.has(normalizeKey(child.name))) {
      await moveFilesIntoResourcePath(workspaceId, cbseRoot, child, activeFiles(child), inferredClass, resourceSpec, child.name);
      const grandChildren = await findChildren(workspaceId, child._id as Types.ObjectId);
      for (const grandChild of grandChildren) {
        const subject = cleanSubjectName(grandChild.name) || inferSubjectFromText(grandChild.name) || grandChild.name;
        await mergeOrMoveCard(workspaceId, grandChild, classInShelf, subject);
      }
      await archiveIfEmpty(workspaceId, child);
    } else {
      const subject = cleanSubjectName(child.name) || inferSubjectFromText(child.name) || child.name;
      await mergeOrMoveCard(workspaceId, child, classInShelf, subject);
    }
  }
};

const normalizeClassInRootShelf = async (
  workspaceId: Types.ObjectId,
  cbseRoot: CardDoc,
  rootShelf: CardDoc,
  classCard: CardDoc,
  resourceSpec: typeof resourceSpecs[number]
) => {
  await moveFilesIntoResourcePath(workspaceId, cbseRoot, classCard, activeFiles(classCard), classCard.name, resourceSpec, classCard.name);
  const children = await findChildren(workspaceId, classCard._id as Types.ObjectId);
  for (const child of children) {
    if (genericWrapperKeys.has(normalizeKey(child.name))) {
      await moveFilesIntoResourcePath(workspaceId, cbseRoot, child, activeFiles(child), classCard.name, resourceSpec, child.name);
      await archiveIfEmpty(workspaceId, child);
      continue;
    }

    const subject = cleanSubjectName(child.name) || inferSubjectFromText(child.name) || child.name;
    await mergeOrMoveCard(workspaceId, child, classCard, subject);
  }
};

const migrateClassCard = async (workspaceId: Types.ObjectId, cbseRoot: CardDoc, classCard: CardDoc) => {
  const className = getClassName(classCard.name);
  if (!className) return;
  stats.classCardsChecked += 1;

  await moveFilesIntoResourcePath(workspaceId, cbseRoot, classCard, activeFiles(classCard), className, resourceSpecs[3], classCard.name);

  const children = await findChildren(workspaceId, classCard._id as Types.ObjectId);
  for (const child of children) {
    const resourceSpec = getResourceSpec(child.name);
    if (resourceSpec) {
      await moveFilesIntoResourcePath(workspaceId, cbseRoot, child, activeFiles(child), className, resourceSpec, child.name);
      const rootShelf = await ensureRootShelf(workspaceId, cbseRoot, resourceSpec);
      const classInShelf = rootShelf ? await ensureClassInShelf(workspaceId, rootShelf, className) : null;
      const subjectChildren = await findChildren(workspaceId, child._id as Types.ObjectId);
      for (const subjectChild of subjectChildren) {
        if (!classInShelf) continue;
        const subject = cleanSubjectName(subjectChild.name) || inferSubjectFromText(subjectChild.name) || subjectChild.name;
        await mergeOrMoveCard(workspaceId, subjectChild, classInShelf, subject);
      }
      await archiveIfEmpty(workspaceId, child);
      continue;
    }

    const subject = cleanSubjectName(child.name) || inferSubjectFromText(child.name) || child.name;
    const subjectResourceChildren = (await findChildren(workspaceId, child._id as Types.ObjectId));
    if (subjectResourceChildren.length) {
      for (const subjectResource of subjectResourceChildren) {
        const spec = getResourceSpec(subjectResource.name) || inferResourceSpecFromFile(activeFiles(subjectResource)[0] || {});
        const rootShelf = await ensureRootShelf(workspaceId, cbseRoot, spec);
        const classInShelf = rootShelf ? await ensureClassInShelf(workspaceId, rootShelf, className) : null;
        if (classInShelf) await mergeOrMoveCard(workspaceId, subjectResource, classInShelf, subject);
      }
      await moveFilesIntoResourcePath(workspaceId, cbseRoot, child, activeFiles(child), className, resourceSpecs[3], subject);
      await archiveIfEmpty(workspaceId, child);
    } else {
      await moveFilesIntoResourcePath(workspaceId, cbseRoot, child, activeFiles(child), className, resourceSpecs[3], subject);
      await archiveIfEmpty(workspaceId, child);
    }
  }

  await archiveIfEmpty(workspaceId, classCard);
};

const normalizeCbseRoot = async (workspaceId: Types.ObjectId, cbseRoot: CardDoc) => {
  stats.cbseRoots += 1;
  for (const spec of resourceSpecs) {
    await ensureRootShelf(workspaceId, cbseRoot, spec);
  }

  let children = await findChildren(workspaceId, cbseRoot._id as Types.ObjectId);
  for (const child of children) {
    const rootSpec = getResourceSpec(child.name);
    if (rootSpec) {
      await normalizeRootShelf(workspaceId, cbseRoot, child, rootSpec);
    }
  }

  children = await findChildren(workspaceId, cbseRoot._id as Types.ObjectId);
  for (const child of children) {
    if (getClassName(child.name)) {
      await migrateClassCard(workspaceId, cbseRoot, child);
    }
  }

  children = await findChildren(workspaceId, cbseRoot._id as Types.ObjectId);
  for (const child of children) {
    const rootSpec = getResourceSpec(child.name);
    if (rootSpec) {
      await normalizeRootShelf(workspaceId, cbseRoot, child, rootSpec);
    }
  }
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });

  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
  if (!workspace) throw new Error('Study Hub workspace not found.');
  const workspaceId = workspace._id as Types.ObjectId;

  console.log(`${shouldApply ? 'Applying' : 'Dry run'} CBSE resource-first normalization.`);
  if (!shouldApply) console.log('Use --apply to write CBSE > shelf > class > subject > file structure.');

  const cbseRoots = await StudyCard.find({
    workspaceId,
    status: { $ne: 'archived' },
    $or: [
      { slug: 'cbse' },
      { name: /^CBSE$/i },
      { name: /^Central Board of Secondary Education$/i },
    ],
  });

  for (const cbseRoot of cbseRoots) {
    await normalizeCbseRoot(workspaceId, cbseRoot);
  }

  console.log([
    `CBSE roots checked: ${stats.cbseRoots}. Class folders migrated: ${stats.classCardsChecked}.`,
    `Root shelves created: ${stats.rootShelvesCreated}. Restored: ${stats.rootShelvesRestored}.`,
    `Class folders created under shelves: ${stats.classFoldersCreated}. Restored: ${stats.classFoldersRestored}.`,
    `Subject folders created: ${stats.subjectFoldersCreated}. Restored: ${stats.subjectFoldersRestored}. Styled: ${stats.styled}.`,
    `Cards moved/merged: ${stats.cardsMoved}. Files moved: ${stats.filesMoved}. Duplicates skipped: ${stats.duplicatesSkipped}.`,
    `Old empty folders archived: ${stats.archivedOldFolders}.`,
  ].join('\n'));

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('CBSE resource-first normalization failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exit(1);
});
