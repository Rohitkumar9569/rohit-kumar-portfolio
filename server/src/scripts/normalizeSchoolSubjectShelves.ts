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

const targetShelfKeys = new Set([
  'ncert books',
  'ncert solutions',
  'syllabus',
  'study material',
  'study materials',
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
  'study material',
  'study materials',
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
  'fine art',
  'physical education',
];

const stats = {
  classCardsChecked: 0,
  shelvesChecked: 0,
  subjectFoldersCreated: 0,
  subjectFoldersRestored: 0,
  subjectFoldersStyled: 0,
  filesMoved: 0,
  duplicateFilesRemoved: 0,
  wrappersArchived: 0,
  leafFoldersFlattened: 0,
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

const isClassCard = (card: CardDoc) =>
  /^class\s+(?:[1-9]|1[0-2])$/i.test(String(card.name || '').trim()) ||
  normalizeKey(card.goalType || '') === 'class';

const isTargetShelf = (card: CardDoc) => targetShelfKeys.has(normalizeKey(card.name || card.slug || ''));

const isGenericWrapper = (card: CardDoc) => genericWrapperKeys.has(normalizeKey(card.name || card.slug || ''));

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
  if (key.includes('computer') || key.includes('informatics') || key === 'ip') return 'coding';
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
    'fine art': 'Fine Art',
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

const cleanContainerSubject = (name = '') => {
  const cleaned = name
    .replace(/\bNCERT\b/gi, '')
    .replace(/\bClass\s+\d{1,2}\b/gi, '')
    .replace(/\bComplete\s+Books?\b/gi, '')
    .replace(/\bBooks?\b/gi, '')
    .replace(/\bSyllabus\b/gi, '')
    .replace(/\bStudy\s+Materials?\b/gi, '')
    .replace(/\s+-\s*$/g, '')
    .trim();
  if (!cleaned || genericWrapperKeys.has(normalizeKey(cleaned))) return '';
  return exactSubjectLabel(cleaned) || inferSubjectFromText(cleaned) || titleCase(cleaned);
};

const inferSubject = (file: FileDoc, containerName = '') => {
  const fromContainer = cleanContainerSubject(containerName);
  if (fromContainer) return fromContainer;

  const fromSubject = exactSubjectLabel(file.subject || '') || inferSubjectFromText(file.subject || '');
  if (fromSubject) return fromSubject;

  const combined = [
    file.paper,
    file.topic,
    file.name,
    file.sourceName,
  ].filter(Boolean).join(' ');
  const fromText = inferSubjectFromText(combined);
  if (fromText) return fromText;

  return 'General';
};

const findActiveChildren = (workspaceId: Types.ObjectId, parentId: Types.ObjectId) =>
  StudyCard.find({ workspaceId, parentId, status: { $ne: 'archived' } }).sort({ order: 1, name: 1 });

const ensureSubjectCard = async (workspaceId: Types.ObjectId, shelf: CardDoc, subjectName: string) => {
  const name = subjectName || 'General';
  const slug = slugify(name);
  const active = await StudyCard.findOne({ workspaceId, parentId: shelf._id, slug, status: { $ne: 'archived' } });

  if (active) {
    const updates = {
      iconKey: getSubjectIcon(name),
      tone: getSubjectTone(name),
      goalType: 'subject',
      order: getSubjectOrder(name),
      visibility: 'public',
    };
    const activeAny = active as any;
    const changed = Object.entries(updates).some(([key, value]) => String(activeAny[key] ?? '') !== String(value));
    if (changed) {
      stats.subjectFoldersStyled += 1;
      if (shouldApply) {
        Object.assign(active, updates);
        await active.save();
      }
    }
    return active;
  }

  const archived = await StudyCard.findOne({ workspaceId, parentId: shelf._id, slug });
  if (archived) {
    stats.subjectFoldersRestored += 1;
    if (shouldApply) {
      archived.name = name;
      archived.iconKey = getSubjectIcon(name);
      archived.tone = getSubjectTone(name);
      archived.goalType = 'subject';
      archived.order = getSubjectOrder(name);
      archived.status = 'published';
      archived.visibility = 'public';
      await archived.save();
    }
    return archived;
  }

  stats.subjectFoldersCreated += 1;
  if (!shouldApply) return null;

  return StudyCard.create({
    workspaceId,
    parentId: shelf._id,
    name,
    slug,
    iconKey: getSubjectIcon(name),
    goalType: 'subject',
    tone: getSubjectTone(name),
    order: getSubjectOrder(name),
    status: 'published',
    visibility: 'public',
    files: [],
  });
};

const moveFilesToSubject = async (
  workspaceId: Types.ObjectId,
  shelf: CardDoc,
  source: CardDoc,
  files: FileDoc[],
  containerName = source.name
) => {
  const active = files.filter((file) => (file.status || 'published') !== 'archived');
  if (!active.length) return;

  const bySubject = new Map<string, FileDoc[]>();
  for (const file of active) {
    const subject = inferSubject(file, containerName);
    const current = bySubject.get(subject) || [];
    current.push(file);
    bySubject.set(subject, current);
  }

  for (const [subject, subjectFiles] of bySubject) {
    const target = await ensureSubjectCard(workspaceId, shelf, subject);
    if (!target || String(target._id) === String(source._id)) continue;

    if (!shouldApply) {
      stats.filesMoved += subjectFiles.length;
      continue;
    }

    const sourceDoc = await StudyCard.findById(source._id);
    const targetDoc = await StudyCard.findById(target._id);
    if (!sourceDoc || !targetDoc) continue;

    const moveKeys = new Set(subjectFiles.map(fileIdentity));
    const targetKeys = new Set((targetDoc.files || []).map((file: FileDoc) => fileIdentity(file)));
    let appended = 0;
    let duplicates = 0;

    for (const file of subjectFiles) {
      const identity = fileIdentity(file);
      if (targetKeys.has(identity)) {
        duplicates += 1;
        continue;
      }
      const payload = sanitizeFilePayload(file);
      payload.subject = subject;
      targetDoc.files.push(payload);
      targetKeys.add(identity);
      appended += 1;
    }

    sourceDoc.files = (sourceDoc.files || []).filter((file: FileDoc) => (
      (file.status || 'published') === 'archived' || !moveKeys.has(fileIdentity(file))
    ));

    await targetDoc.save();
    await sourceDoc.save();
    stats.filesMoved += appended;
    stats.duplicateFilesRemoved += duplicates;
  }
};

const archiveIfEmpty = async (workspaceId: Types.ObjectId, card: CardDoc) => {
  const fileCount = activeFiles(card).length;
  const childCount = await StudyCard.countDocuments({ workspaceId, parentId: card._id, status: { $ne: 'archived' } });
  if (fileCount || childCount) return false;

  stats.wrappersArchived += 1;
  if (shouldApply) {
    const fresh = await StudyCard.findById(card._id);
    if (fresh) {
      fresh.status = 'archived';
      await fresh.save();
    }
  }
  return true;
};

const moveOrMergeSubjectFolder = async (workspaceId: Types.ObjectId, source: CardDoc, shelf: CardDoc) => {
  const subject = cleanContainerSubject(source.name) || inferSubjectFromText(source.name) || source.name;
  const target = await ensureSubjectCard(workspaceId, shelf, subject);
  if (!target || String(target._id) === String(source._id)) return;

  await moveFilesToSubject(workspaceId, shelf, source, activeFiles(source), subject);

  const children = await findActiveChildren(workspaceId, source._id);
  for (const child of children) {
    if (isGenericWrapper(child)) {
      await moveFilesToSubject(workspaceId, shelf, child, activeFiles(child), subject);
      await archiveIfEmpty(workspaceId, child);
      continue;
    }

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
      }
    }
  }

  if (shouldApply) {
    const fresh = await StudyCard.findById(source._id);
    if (fresh) {
      fresh.status = 'archived';
      await fresh.save();
    }
  }
};

const flattenSubjectLeafFolders = async (workspaceId: Types.ObjectId, shelf: CardDoc, subjectCard: CardDoc) => {
  const children = await findActiveChildren(workspaceId, subjectCard._id);
  for (const child of children) {
    const childFiles = activeFiles(child);
    const grandChildCount = await StudyCard.countDocuments({
      workspaceId,
      parentId: child._id,
      status: { $ne: 'archived' },
    });

    if (childFiles.length && (isGenericWrapper(child) || grandChildCount === 0)) {
      await moveFilesToSubject(workspaceId, shelf, child, childFiles, subjectCard.name);
      stats.leafFoldersFlattened += 1;
      await archiveIfEmpty(workspaceId, child);
    }

    if (isGenericWrapper(child) && !childFiles.length) {
      await archiveIfEmpty(workspaceId, child);
    }
  }
};

const normalizeShelf = async (workspaceId: Types.ObjectId, shelf: CardDoc) => {
  stats.shelvesChecked += 1;

  await moveFilesToSubject(workspaceId, shelf, shelf, activeFiles(shelf));

  const children = await findActiveChildren(workspaceId, shelf._id);
  for (const child of children) {
    if (isGenericWrapper(child)) {
      await moveFilesToSubject(workspaceId, shelf, child, activeFiles(child));
      const grandChildren = await findActiveChildren(workspaceId, child._id);
      for (const grandChild of grandChildren) {
        await moveOrMergeSubjectFolder(workspaceId, grandChild, shelf);
      }
      await archiveIfEmpty(workspaceId, child);
      continue;
    }

    const subject = cleanContainerSubject(child.name) || inferSubjectFromText(child.name);
    if (subject) {
      const target = await ensureSubjectCard(workspaceId, shelf, subject);
      if (target && String(target._id) === String(child._id)) {
        await flattenSubjectLeafFolders(workspaceId, shelf, child);
      } else {
        await moveOrMergeSubjectFolder(workspaceId, child, shelf);
      }
    }
  }
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });

  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
  if (!workspace) throw new Error('Study Hub workspace not found.');
  const workspaceId = workspace._id as Types.ObjectId;

  console.log(`${shouldApply ? 'Applying' : 'Dry run'} school subject shelf normalization.`);
  if (!shouldApply) console.log('Use --apply to move files into subject folders.');

  const classCards = await StudyCard.find({
    workspaceId,
    status: { $ne: 'archived' },
    $or: [
      { goalType: 'class' },
      { name: /^class\s+(?:[1-9]|1[0-2])$/i },
    ],
  }).sort({ order: 1, name: 1 });

  for (const classCard of classCards) {
    if (!isClassCard(classCard)) continue;
    stats.classCardsChecked += 1;

    const shelves = (await findActiveChildren(workspaceId, classCard._id as Types.ObjectId)).filter(isTargetShelf);
    for (const shelf of shelves) {
      await normalizeShelf(workspaceId, shelf);
    }
  }

  console.log([
    `Class folders checked: ${stats.classCardsChecked}.`,
    `Shelves normalized: ${stats.shelvesChecked}.`,
    `Subject folders created: ${stats.subjectFoldersCreated}. Restored: ${stats.subjectFoldersRestored}. Styled: ${stats.subjectFoldersStyled}.`,
    `Files moved into subject folders: ${stats.filesMoved}. Duplicate source files removed: ${stats.duplicateFilesRemoved}.`,
    `Leaf file folders flattened: ${stats.leafFoldersFlattened}. Empty wrappers archived: ${stats.wrappersArchived}.`,
  ].join('\n'));

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('School subject shelf normalization failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exit(1);
});
