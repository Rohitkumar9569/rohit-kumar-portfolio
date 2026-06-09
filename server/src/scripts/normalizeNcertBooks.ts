import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard, { type StudyCardGoalType, type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const MONGO_URI = process.env.MONGO_URI;
const ROOT_WORKSPACE_SLUG = 'study-hub';
const shouldApply = process.argv.includes('--apply');

const stats = {
  filesArchived: 0,
  filesMoved: 0,
  filesRenamed: 0,
  foldersCreated: 0,
  ncertClassesMoved: 0,
  foldersMoved: 0,
  foldersMerged: 0,
  foldersArchived: 0,
  styled: 0,
};

const slugify = (value: string, fallback = 'item') => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || fallback;
};

const normalizeKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getSubjectOrder = (name: string) => {
  const order = [
    'english',
    'hindi',
    'mathematics',
    'maths',
    'science',
    'social science',
    'physics',
    'chemistry',
    'biology',
    'history',
    'geography',
    'political science',
    'economics',
    'accountancy',
    'business studies',
    'computer science',
    'informatics practices',
    'psychology',
    'sociology',
  ];
  const key = normalizeKey(name);
  const index = order.findIndex((item) => key === item || key.includes(item));
  return index >= 0 ? (index + 1) * 10 : 500;
};

const getIconKey = (name: string) => {
  const key = normalizeKey(name);
  if (key.includes('physics')) return 'physics';
  if (key.includes('chemistry')) return 'chemistry';
  if (key.includes('biology')) return 'biology';
  if (key.includes('math')) return 'maths';
  if (key.includes('computer') || key.includes('informatics')) return 'coding';
  if (key.includes('history') || key.includes('geography') || key.includes('political') || key.includes('economics')) return 'book';
  if (/^class \d+$/.test(key)) return 'book';
  if (key.includes('ncert') || key.includes('book')) return 'book';
  return 'folder';
};

const getTone = (name: string): StudyCardTone => {
  const key = normalizeKey(name);
  if (key.includes('physics') || key.includes('computer')) return 'cyan';
  if (key.includes('chemistry')) return 'amber';
  if (key.includes('biology')) return 'emerald';
  if (key.includes('math')) return 'violet';
  if (key.includes('english') || key.includes('hindi')) return 'rose';
  if (key.includes('social') || key.includes('history') || key.includes('geography')) return 'indigo';
  if (key.includes('ncert')) return 'amber';
  return 'emerald';
};

const isPublicFile = (file: any) =>
  (file.status || 'published') === 'published' && (file.visibility || 'public') === 'public';

const isNcertFile = (file: any) => {
  const url = String(file.url || '').toLowerCase();
  const sourceName = String(file.sourceName || '').toLowerCase();
  const sourceType = String(file.sourceType || '').toLowerCase();
  return sourceName.includes('ncert') || sourceType === 'ncert' || url.includes('ncert.nic.in/textbook/pdf/');
};

const isNcertChapterFile = (file: any) => {
  if (!isNcertFile(file)) return false;
  const name = String(file.name || '');
  const urlPath = String(file.url || '').split('?')[0].toLowerCase();
  return (
    /chapter\s+\d{1,2}/i.test(name) ||
    /[a-z0-9]{5,}\d{2}\.pdf$/i.test(urlPath) ||
    /[a-z0-9]{5,}ps\.pdf$/i.test(urlPath)
  );
};

const isNcertCompleteBookFile = (file: any) => {
  if (!isNcertFile(file)) return false;
  const urlPath = String(file.url || '').split('?')[0].toLowerCase();
  const mimeType = String(file.mimeType || '').toLowerCase();
  return /[a-z0-9]{5,}dd\.zip$/i.test(urlPath) || mimeType.includes('zip');
};

const isLikelyNcertBookCard = (card: any) => {
  const key = normalizeKey(card.name);
  if (['ncert books', 'books', 'book', 'textbooks', 'textbook'].includes(key)) return false;
  if ((card.files || []).some(isNcertFile)) return true;
  return key.includes('ncert class') && key.includes('complete book');
};

const inferClassNumber = (file: any) => {
  const combined = `${file.name || ''} ${file.paper || ''} ${file.topic || ''}`;
  const match = combined.match(/\bclass\s+(\d{1,2})\b/i);
  return match ? Number(match[1]) : null;
};

const cleanBookPaperName = (file: any) => {
  const raw = String(file.paper || file.topic || file.name || '')
    .replace(/^NCERT\s+Class\s+\d{1,2}\s+/i, '')
    .replace(/\s+Complete\s+Book$/i, '')
    .replace(/\s+-\s*/g, ' - ')
    .replace(/\s*-\s+/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
  return raw || 'Book';
};

const getContainerSubjectLabel = (containerName = '') => {
  const key = normalizeKey(containerName);
  const exactSubjects: Record<string, string> = {
    accountancy: 'Accountancy',
    biology: 'Biology',
    biotechnology: 'Biotechnology',
    'business studies': 'Business Studies',
    chemistry: 'Chemistry',
    'computer science': 'Computer Science',
    economics: 'Economics',
    english: 'English',
    'fine art': 'Fine Art',
    geography: 'Geography',
    'health and physical education': 'Health and Physical Education',
    history: 'History',
    'home science': 'Home Science',
    'informatics practices': 'Informatics Practices',
    mathematics: 'Mathematics',
    physics: 'Physics',
    psychology: 'Psychology',
    sociology: 'Sociology',
  };
  if (key === 'political science') return 'Polity';
  return exactSubjects[key] || null;
};

const inferStudentSubjectLabel = (file: any, containerName = '') => {
  const containerSubject = getContainerSubjectLabel(containerName);
  if (containerSubject) return containerSubject;

  const subjectKey = normalizeKey(file.subject || '');
  const paperKey = normalizeKey(`${file.paper || ''} ${file.name || ''}`);

  if (subjectKey === 'political science') return 'Polity';
  if (subjectKey && subjectKey !== 'social science') {
    const subjectLabel = getContainerSubjectLabel(subjectKey) || String(file.subject || '').trim();
    if (subjectLabel) return subjectLabel;
  }

  if (paperKey.includes('computer science')) return 'Computer Science';
  if (paperKey.includes('informatics practices')) return 'Informatics Practices';
  if (paperKey.includes('human ecology') || paperKey.includes('home science')) return 'Home Science';
  if (paperKey.includes('democratic politics')) return 'Polity';
  if (paperKey.includes('india constitution') || paperKey.includes('political theory') || paperKey.includes('contemporary world politics') || paperKey.includes('politics in india')) return 'Polity';
  if (paperKey.includes('understanding economic development') || paperKey.includes('economic development') || paperKey.includes('economics') || paperKey.includes('economy')) return 'Economics';
  if (paperKey.includes('contemporary india') || paperKey.includes('earth our habitat') || paperKey.includes('resources and development') || paperKey.includes('geography') || paperKey.includes('physical environment')) return 'Geography';
  if (paperKey.includes('india and the contemporary world') || paperKey.includes('our past') || paperKey.includes('themes in indian history') || paperKey.includes('world history')) return 'History';
  if (paperKey.includes('science')) return 'Science';
  if (paperKey.includes('mathematics') || paperKey.includes('maths') || paperKey.includes('ganita')) return 'Mathematics';
  if (paperKey.includes('physics')) return 'Physics';
  if (paperKey.includes('chemistry')) return 'Chemistry';
  if (paperKey.includes('biology')) return 'Biology';
  if (paperKey.includes('accountancy') || paperKey.includes('accounting')) return 'Accountancy';
  if (paperKey.includes('business studies')) return 'Business Studies';
  if (paperKey.includes('psychology')) return 'Psychology';
  if (paperKey.includes('sociology')) return 'Sociology';
  if (paperKey.includes('english') || paperKey.includes('first flight') || paperKey.includes('footprints') || paperKey.includes('hornbill') || paperKey.includes('snapshots') || paperKey.includes('flamingo') || paperKey.includes('vistas')) return 'English';
  if (paperKey.includes('hindi') || paperKey.includes('kritika') || paperKey.includes('kshitij') || paperKey.includes('sparsh') || paperKey.includes('madhurima')) return 'Hindi';

  if (subjectKey === 'social science') return 'Social Science';
  if (subjectKey.includes('mathematics')) return 'Mathematics';
  if (subjectKey.includes('economics')) return 'Economics';
  if (subjectKey.includes('history')) return 'History';
  if (subjectKey.includes('geography')) return 'Geography';
  if (subjectKey.includes('english')) return 'English';
  if (subjectKey.includes('hindi')) return 'Hindi';
  if (subjectKey.includes('science')) return 'Science';

  return String(file.subject || 'Book').trim() || 'Book';
};

const getBookPaperSuffix = (subjectLabel: string, paperName: string) => {
  const subjectKey = normalizeKey(subjectLabel);
  const paperKey = normalizeKey(paperName);
  if (!paperName || paperKey === subjectKey) return '';

  const directPrefixPattern = new RegExp(`^${escapeRegExp(subjectLabel)}\\s*[-:–]?\\s*`, 'i');
  const directSuffix = paperName.replace(directPrefixPattern, '').trim();
  if (directSuffix && normalizeKey(directSuffix) !== paperKey) return directSuffix;

  return paperName;
};

const getStudentFacingBookName = (file: any, containerName = '') => {
  const classNumber = inferClassNumber(file);
  const subjectLabel = inferStudentSubjectLabel(file, containerName);
  const paperName = cleanBookPaperName(file);
  const paperSuffix = getBookPaperSuffix(subjectLabel, paperName);
  const bookLabel = paperSuffix ? `${subjectLabel} - ${paperSuffix}` : subjectLabel;
  return {
    name: classNumber ? `NCERT Class ${classNumber} ${bookLabel} Complete Book` : `NCERT ${bookLabel} Complete Book`,
    subject: subjectLabel,
    paper: paperName,
  };
};

const findPath = async (workspaceId: Types.ObjectId, parts: string[]) => {
  let parentId: Types.ObjectId | null = null;
  let card: any = null;

  for (const part of parts) {
    card = await StudyCard.findOne({
      workspaceId,
      parentId,
      slug: slugify(part),
      status: { $ne: 'archived' },
    });
    if (!card) return null;
    parentId = card._id as Types.ObjectId;
  }

  return card;
};

const getActiveChildren = (workspaceId: Types.ObjectId, parentId: Types.ObjectId) =>
  StudyCard.find({ workspaceId, parentId, status: { $ne: 'archived' } }).sort({ order: 1, name: 1 });

const collectDescendants = async (workspaceId: Types.ObjectId, rootId: Types.ObjectId) => {
  const cards: any[] = [];
  const queue = [rootId];
  const visited = new Set<string>([String(rootId)]);

  while (queue.length) {
    const parentId = queue.shift() as Types.ObjectId;
    const children = await getActiveChildren(workspaceId, parentId);
    for (const child of children) {
      const childId = String(child._id);
      if (visited.has(childId)) continue;
      visited.add(childId);
      cards.push(child);
      queue.push(child._id as Types.ObjectId);
    }
  }

  return cards;
};

const archiveChapterFiles = async (cards: any[]) => {
  for (const card of cards) {
    let changed = false;
    for (const file of card.files || []) {
      if (!isNcertChapterFile(file) || !isPublicFile(file)) continue;
      if (shouldApply) {
        file.status = 'archived';
        file.visibility = 'private';
      }
      stats.filesArchived += 1;
      changed = true;
    }
    if (changed && shouldApply) await card.save();
  }
};

const renameNcertCompleteBookFiles = async (cards: any[]) => {
  for (const card of cards) {
    let changed = false;
    for (const file of card.files || []) {
      if (!isNcertCompleteBookFile(file)) continue;
      const next = getStudentFacingBookName(file, card.name);
      const needsUpdate =
        file.name !== next.name ||
        file.subject !== next.subject ||
        file.paper !== next.paper ||
        file.status !== 'published' ||
        file.visibility !== 'public';

      if (!needsUpdate) continue;
      stats.filesRenamed += file.name !== next.name ? 1 : 0;
      changed = true;
      if (shouldApply) {
        file.name = next.name;
        file.subject = next.subject;
        file.paper = next.paper;
        file.status = 'published';
        file.visibility = 'public';
      }
    }
    if (changed && shouldApply) await card.save();
  }
};

const styleCard = async (card: any, options: { iconKey?: string; tone?: StudyCardTone; order?: number }) => {
  const next = {
    iconKey: options.iconKey || getIconKey(card.name),
    tone: options.tone || getTone(card.name),
    order: options.order ?? getSubjectOrder(card.name),
    status: card.status === 'archived' ? 'published' : card.status,
    visibility: 'public',
  };
  const changed = card.iconKey !== next.iconKey || card.tone !== next.tone || card.order !== next.order || card.visibility !== next.visibility;
  if (changed) {
    stats.styled += 1;
    if (shouldApply) {
      card.set(next);
      await card.save();
    }
  }
};

const mergeFiles = (target: any, source: any) => {
  const existing = new Set((target.files || []).map((file: any) => `${String(file.url || '').toLowerCase()}|${normalizeKey(file.name || '')}`));
  let moved = 0;
  for (const file of source.files || []) {
    const payload = file.toObject ? file.toObject() : file;
    const key = `${String(payload.url || '').toLowerCase()}|${normalizeKey(payload.name || '')}`;
    if (existing.has(key)) continue;
    target.files.push(payload);
    existing.add(key);
    moved += 1;
  }
  if (shouldApply) source.files = [];
  return moved;
};

const archiveCard = async (card: any) => {
  stats.foldersArchived += 1;
  if (!shouldApply) return;
  card.status = 'archived';
  card.visibility = 'private';
  await card.save();
};

const ensureChildCard = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId,
  name: string,
  options: { iconKey?: string; tone?: StudyCardTone; order?: number; goalType?: StudyCardGoalType } = {}
) => {
  const slug = slugify(name);
  let card = await StudyCard.findOne({
    workspaceId,
    parentId,
    slug,
    status: { $ne: 'archived' },
  });

  if (card) {
    await styleCard(card, { iconKey: options.iconKey, tone: options.tone, order: options.order });
    if (options.goalType && card.goalType !== options.goalType) {
      stats.styled += 1;
      if (shouldApply) {
        card.goalType = options.goalType;
        await card.save();
      }
    }
    return card;
  }

  card = await StudyCard.findOne({
    workspaceId,
    parentId,
    slug,
    status: 'archived',
  });

  if (card) {
    stats.styled += 1;
    if (shouldApply) {
      card.name = name;
      card.iconKey = options.iconKey || getIconKey(name);
      card.goalType = options.goalType || card.goalType || 'resource_folder';
      card.tone = options.tone || getTone(name);
      card.order = options.order ?? getSubjectOrder(name);
      card.status = 'published';
      card.visibility = 'public';
      await card.save();
    }
    return card;
  }

  stats.foldersCreated += 1;
  if (!shouldApply) return null;

  card = await StudyCard.create({
    workspaceId,
    parentId,
    name,
    slug,
    iconKey: options.iconKey || getIconKey(name),
    goalType: options.goalType || 'resource_folder',
    tone: options.tone || getTone(name),
    order: options.order ?? getSubjectOrder(name),
    status: 'published',
    visibility: 'public',
    files: [],
  });
  return card;
};

const moveOrMergeCard = async (workspaceId: Types.ObjectId, source: any, targetParentId: Types.ObjectId, targetName = source.name) => {
  const slug = slugify(targetName);
  const duplicate = await StudyCard.findOne({
    workspaceId,
    parentId: targetParentId,
    slug,
    _id: { $ne: source._id },
    status: { $ne: 'archived' },
  });

  if (duplicate) {
    mergeFiles(duplicate, source);
    const children = await getActiveChildren(workspaceId, source._id as Types.ObjectId);
    for (const child of children) {
      await moveOrMergeCard(workspaceId, child, duplicate._id as Types.ObjectId, child.name);
    }
    await styleCard(duplicate, { iconKey: getIconKey(targetName), tone: getTone(targetName), order: getSubjectOrder(targetName) });
    await archiveCard(source);
    stats.foldersMerged += 1;
    return duplicate;
  }

  const changed = String(source.parentId || '') !== String(targetParentId) || source.slug !== slug;
  if (changed) {
    stats.foldersMoved += 1;
    if (shouldApply) {
      source.parentId = targetParentId;
      source.slug = slug;
      source.name = targetName;
      source.status = source.status === 'archived' ? 'published' : source.status;
      source.visibility = 'public';
      await source.save();
    }
  }
  await styleCard(source, { iconKey: getIconKey(targetName), tone: getTone(targetName), order: getSubjectOrder(targetName) });
  return source;
};

const splitDirectNcertFilesIntoSubjectCards = async (workspaceId: Types.ObjectId, ncertShelf: any) => {
  const files = ncertShelf.files || [];
  if (!files.some(isNcertFile)) return;

  const keptFiles: any[] = [];
  let changed = false;

  for (const file of files) {
    if (!isNcertFile(file) || !isPublicFile(file)) {
      keptFiles.push(file);
      continue;
    }

    const next = getStudentFacingBookName(file, ncertShelf.name);
    const subject = next.subject || inferStudentSubjectLabel(file, ncertShelf.name);
    const subjectCard = await ensureChildCard(workspaceId, ncertShelf._id as Types.ObjectId, subject, {
      iconKey: getIconKey(subject),
      tone: getTone(subject),
      order: getSubjectOrder(subject),
      goalType: 'subject',
    });

    if (!subjectCard) {
      if (!shouldApply) {
        stats.filesMoved += 1;
        changed = true;
      } else {
        keptFiles.push(file);
      }
      continue;
    }

    const payload = file.toObject ? file.toObject() : { ...file };
    payload.name = next.name;
    payload.subject = subject;
    payload.paper = next.paper;
    payload.status = 'published';
    payload.visibility = 'public';

    const appended = appendFileIfMissing(subjectCard, payload);
    if (appended) stats.filesMoved += 1;
    changed = true;
    if (shouldApply && appended) await subjectCard.save();
  }

  if (changed && shouldApply) {
    ncertShelf.files = keptFiles;
    await ncertShelf.save();
  }
};

const placeNcertBooksInsideClassShelves = async (workspaceId: Types.ObjectId, cbseRoot: any) => {
  const classes = await getActiveChildren(workspaceId, cbseRoot._id as Types.ObjectId);
  for (const classCard of classes) {
    if (!/^Class \d+$/i.test(classCard.name)) continue;
    const classNumber = Number(classCard.name.replace(/\D/g, ''));
    await styleCard(classCard, {
      iconKey: classNumber <= 5 ? 'class-primary' : classNumber <= 9 ? 'class-middle' : 'cbse',
      tone: 'emerald',
      order: classNumber * 10,
    });

    const ncertShelf = await ensureChildCard(workspaceId, classCard._id as Types.ObjectId, 'NCERT Books', {
      iconKey: 'book',
      tone: 'amber',
      order: 20,
      goalType: 'resource_folder',
    });
    if (!ncertShelf) continue;

    await splitDirectNcertFilesIntoSubjectCards(workspaceId, ncertShelf);

    for (const legacySlug of ['books', 'book', 'textbooks', 'textbook']) {
      const legacyWrapper = await StudyCard.findOne({
        workspaceId,
        parentId: classCard._id,
        slug: legacySlug,
        status: { $ne: 'archived' },
      });
      if (!legacyWrapper || String(legacyWrapper._id) === String(ncertShelf._id)) continue;

      const subjectCards = await getActiveChildren(workspaceId, legacyWrapper._id as Types.ObjectId);
      for (const subjectCard of subjectCards) {
        await moveOrMergeCard(workspaceId, subjectCard, ncertShelf._id as Types.ObjectId, subjectCard.name);
      }

      if ((legacyWrapper.files || []).length) {
        await moveOrMergeCard(workspaceId, legacyWrapper, ncertShelf._id as Types.ObjectId, legacyWrapper.name);
        continue;
      }

      const remainingChildren = await getActiveChildren(workspaceId, legacyWrapper._id as Types.ObjectId);
      const visibleFiles = (legacyWrapper.files || []).filter(isPublicFile);
      if (!remainingChildren.length && !visibleFiles.length) await archiveCard(legacyWrapper);
    }

    const classChildren = await getActiveChildren(workspaceId, classCard._id as Types.ObjectId);
    for (const child of classChildren) {
      if (String(child._id) === String(ncertShelf._id)) continue;
      if (!isLikelyNcertBookCard(child)) continue;
      await moveOrMergeCard(workspaceId, child, ncertShelf._id as Types.ObjectId, child.name);
    }
  }
};

const getPathParts = (card: any, cardById: Map<string, any>, memo = new Map<string, string[]>()): string[] => {
  const id = String(card._id);
  const cached = memo.get(id);
  if (cached) return cached;
  const parent = card.parentId ? cardById.get(String(card.parentId)) : null;
  const parts = parent ? [...getPathParts(parent, cardById, memo), card.name] : [card.name];
  memo.set(id, parts);
  return parts;
};

const inferClassNumberFromPath = (parts: string[]) => {
  for (const part of [...parts].reverse()) {
    const match = part.match(/^Class\s+(\d{1,2})$/i);
    if (match) return Number(match[1]);
  }
  return null;
};

const appendFileIfMissing = (target: any, file: any) => {
  const payload = file.toObject ? file.toObject() : file;
  const key = `${String(payload.url || '').toLowerCase()}|${normalizeKey(payload.name || '')}`;
  const existing = new Set((target.files || []).map((item: any) => `${String(item.url || '').toLowerCase()}|${normalizeKey(item.name || '')}`));
  if (existing.has(key)) return false;
  target.files.push(payload);
  return true;
};

const moveLooseNcertFilesIntoNcertBooks = async (workspaceId: Types.ObjectId, cbseRoot: any, ncertBooksRoot?: any) => {
  const cbseCards = [cbseRoot, ...(await collectDescendants(workspaceId, cbseRoot._id as Types.ObjectId))];
  const ncertDescendantIds = ncertBooksRoot
    ? new Set([
      String(ncertBooksRoot._id),
      ...(await collectDescendants(workspaceId, ncertBooksRoot._id as Types.ObjectId)).map((card) => String(card._id)),
    ])
    : new Set<string>();
  const cardById = new Map(cbseCards.map((card) => [String(card._id), card]));
  const pathMemo = new Map<string, string[]>();

  for (const card of cbseCards) {
    if (ncertDescendantIds.has(String(card._id))) continue;
    const files = card.files || [];
    if (!files.some(isNcertFile)) continue;

    const pathParts = getPathParts(card, cardById, pathMemo);
    const alreadyInClassNcertShelf = pathParts.some((part, index) => (
      normalizeKey(part) === 'ncert books' && /^Class \d+$/i.test(pathParts[index - 1] || '')
    ));
    if (alreadyInClassNcertShelf) continue;

    const keptFiles: any[] = [];
    let changed = false;

    for (const file of files) {
      if (!isNcertFile(file)) {
        keptFiles.push(file);
        continue;
      }

      const classNumber = inferClassNumber(file) || inferClassNumberFromPath(pathParts);
      if (!classNumber) {
        keptFiles.push(file);
        continue;
      }

      const classCard = await ensureChildCard(workspaceId, cbseRoot._id as Types.ObjectId, `Class ${classNumber}`, {
        iconKey: classNumber <= 5 ? 'class-primary' : classNumber <= 9 ? 'class-middle' : 'cbse',
        tone: 'emerald',
        order: classNumber * 10,
        goalType: 'class',
      });
      if (!classCard) {
        keptFiles.push(file);
        continue;
      }

      const ncertShelf = await ensureChildCard(workspaceId, classCard._id as Types.ObjectId, 'NCERT Books', {
        iconKey: 'book',
        tone: 'amber',
        order: 20,
        goalType: 'resource_folder',
      });
      if (!ncertShelf) {
        keptFiles.push(file);
        continue;
      }

      const subject = inferStudentSubjectLabel(file, card.name);
      const subjectCard = await ensureChildCard(workspaceId, ncertShelf._id as Types.ObjectId, subject, {
        iconKey: getIconKey(subject),
        tone: getTone(subject),
        order: getSubjectOrder(subject),
        goalType: 'subject',
      });
      if (!subjectCard) {
        keptFiles.push(file);
        continue;
      }

      const appended = appendFileIfMissing(subjectCard, file);
      if (appended) stats.filesMoved += 1;
      changed = true;
      if (shouldApply && appended) await subjectCard.save();
    }

    if (changed && shouldApply) {
      card.files = keptFiles;
      await card.save();
    }
  }
};

const moveNcertClassesIntoNcertBooks = async (workspaceId: Types.ObjectId) => {
  const legacyRoots = [
    await findPath(workspaceId, ['School Boards', 'NCERT']),
    await findPath(workspaceId, ['School Boards', 'CBSE', 'NCERT']),
    await findPath(workspaceId, ['School Boards', 'CBSE', 'NCERT Books']),
  ].filter(Boolean);
  const cbseRoot = await findPath(workspaceId, ['School Boards', 'CBSE']);
  if (!cbseRoot) return legacyRoots[0] || null;

  for (const ncertRoot of legacyRoots) {
    const classCards = await getActiveChildren(workspaceId, ncertRoot._id as Types.ObjectId);
    for (const classCard of classCards) {
      if (!/^Class \d+$/i.test(classCard.name)) continue;
      const classNumber = Number(classCard.name.replace(/\D/g, ''));
      const visibleClassCard = await ensureChildCard(workspaceId, cbseRoot._id as Types.ObjectId, `Class ${classNumber}`, {
        iconKey: classNumber <= 5 ? 'class-primary' : classNumber <= 9 ? 'class-middle' : 'cbse',
        tone: 'emerald',
        order: classNumber * 10,
        goalType: 'class',
      });
      if (!visibleClassCard) continue;
      const ncertShelf = await ensureChildCard(workspaceId, visibleClassCard._id as Types.ObjectId, 'NCERT Books', {
        iconKey: 'book',
        tone: 'amber',
        order: 20,
        goalType: 'resource_folder',
      });
      if (!ncertShelf) continue;

      const subjectCards = await getActiveChildren(workspaceId, classCard._id as Types.ObjectId);
      for (const subjectCard of subjectCards) {
        await moveOrMergeCard(workspaceId, subjectCard, ncertShelf._id as Types.ObjectId, subjectCard.name);
      }
      if ((classCard.files || []).length) {
        await moveOrMergeCard(workspaceId, classCard, ncertShelf._id as Types.ObjectId, 'All Subjects');
      } else {
        const remainingClassChildren = await getActiveChildren(workspaceId, classCard._id as Types.ObjectId);
        if (!remainingClassChildren.length) await archiveCard(classCard);
      }
      stats.ncertClassesMoved += 1;
    }

    const remainingChildren = await getActiveChildren(workspaceId, ncertRoot._id as Types.ObjectId);
    const visibleFiles = (ncertRoot.files || []).filter(isPublicFile);
    if (!remainingChildren.length && !visibleFiles.length) await archiveCard(ncertRoot);
  }

  await moveLooseNcertFilesIntoNcertBooks(workspaceId, cbseRoot);

  return cbseRoot;
};

const archiveEmptyCards = async (workspaceId: Types.ObjectId, rootId: Types.ObjectId) => {
  const cards = await collectDescendants(workspaceId, rootId);
  const archivedIds = new Set<string>();
  const childrenByParent = new Map<string, any[]>();

  for (const card of cards) {
    const parentKey = String(card.parentId || '');
    const children = childrenByParent.get(parentKey) || [];
    children.push(card);
    childrenByParent.set(parentKey, children);
  }

  for (const card of [...cards].reverse()) {
    const visibleFiles = (card.files || []).filter(isPublicFile);
    if (visibleFiles.length) continue;

    const activeChildren = (childrenByParent.get(String(card._id)) || [])
      .filter((child) => !archivedIds.has(String(child._id)));
    if (activeChildren.length) continue;

    const key = normalizeKey(card.name);
    const shouldHide =
      key === 'books' ||
      key === 'book' ||
      key === 'ncert' ||
      key === 'ncert books and solutions';

    if (!shouldHide) continue;
    archivedIds.add(String(card._id));
    await archiveCard(card);
  }
};

const styleBoardClassFolders = async (workspaceId: Types.ObjectId, boardRoot: any, tone: StudyCardTone) => {
  const classes = await getActiveChildren(workspaceId, boardRoot._id as Types.ObjectId);
  for (const classCard of classes) {
    if (!/^Class \d+$/i.test(classCard.name)) continue;
    const order = Number(classCard.name.replace(/\D/g, '')) * 10;
    const changed = classCard.goalType !== 'class' || classCard.iconKey !== 'book' || classCard.tone !== tone || classCard.order !== order || classCard.visibility !== 'public';
    if (!changed) continue;
    stats.styled += 1;
    if (shouldApply) {
      classCard.goalType = 'class';
      classCard.iconKey = 'book';
      classCard.tone = tone;
      classCard.order = order;
      classCard.visibility = 'public';
      await classCard.save();
    }
  }
};

const styleSchoolBoardRoots = async (workspaceId: Types.ObjectId) => {
  const schoolBoards = await findPath(workspaceId, ['School Boards']);
  const cbse = schoolBoards ? await findPath(workspaceId, ['School Boards', 'CBSE']) : null;
  const ncertBooks = cbse ? await findPath(workspaceId, ['School Boards', 'CBSE', 'NCERT Books']) : null;
  const icse = schoolBoards ? await findPath(workspaceId, ['School Boards', 'ICSE ISC']) : null;
  const stateBoards = schoolBoards ? await findPath(workspaceId, ['School Boards', 'State Boards']) : null;

  if (schoolBoards) await styleCard(schoolBoards, { iconKey: 'book', tone: 'emerald', order: 30 });
  if (cbse) await styleCard(cbse, { iconKey: 'book', tone: 'emerald', order: 20 });
  if (ncertBooks) await styleCard(ncertBooks, { iconKey: 'book', tone: 'amber', order: 10 });
  if (icse) {
    const changed = icse.name !== 'ICSE / ISC';
    if (changed) {
      stats.styled += 1;
      if (shouldApply) {
        icse.name = 'ICSE / ISC';
        await icse.save();
      }
    }
    await styleCard(icse, { iconKey: 'book', tone: 'indigo', order: 30 });
  }
  if (stateBoards) await styleCard(stateBoards, { iconKey: 'book', tone: 'amber', order: 40 });

  for (const [root, tone] of [
    [cbse, 'emerald'],
    [icse, 'indigo'],
    [stateBoards, 'amber'],
  ] as Array<[any, StudyCardTone]>) {
    if (root) await styleBoardClassFolders(workspaceId, root, tone);
  }
};

const publishAncestorsForCompleteBooks = async (workspaceId: Types.ObjectId, ncertRoot: any) => {
  const cards = [ncertRoot, ...(await collectDescendants(workspaceId, ncertRoot._id as Types.ObjectId))];
  const cardById = new Map(cards.map((card) => [String(card._id), card]));
  const publishIds = new Set<string>();

  for (const card of cards) {
    if (!(card.files || []).some((file: any) => isNcertCompleteBookFile(file) && isPublicFile(file))) continue;
    let current: any = card;
    while (current) {
      const id = String(current._id);
      if (publishIds.has(id)) break;
      publishIds.add(id);
      current = current.parentId ? cardById.get(String(current.parentId)) : null;
    }
  }

  for (const id of publishIds) {
    const card = cardById.get(id);
    if (!card || (card.status === 'published' && card.visibility === 'public')) continue;
    stats.styled += 1;
    if (shouldApply) {
      card.status = 'published';
      card.visibility = 'public';
      await card.save();
    }
  }
};

const archiveCbseNcertChapterCopy = async (workspaceId: Types.ObjectId) => {
  const cbseRoot = await findPath(workspaceId, ['School Boards', 'CBSE']);
  if (!cbseRoot) return;
  const cards = await collectDescendants(workspaceId, cbseRoot._id as Types.ObjectId);
  await archiveChapterFiles(cards);
  await archiveEmptyCards(workspaceId, cbseRoot._id as Types.ObjectId);
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');
  console.log(`${shouldApply ? 'Applying' : 'Dry run'} NCERT book normalization.`);
  if (!shouldApply) console.log('Use --apply to hide chapter PDFs and place NCERT books inside class shelves.');

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
  if (!workspace) throw new Error('Study Hub workspace not found.');
  const workspaceId = workspace._id as Types.ObjectId;

  await styleSchoolBoardRoots(workspaceId);
  const cbseRoot = await findPath(workspaceId, ['School Boards', 'CBSE']);
  if (!cbseRoot) throw new Error('School Boards / CBSE not found.');

  let ncertRoot = await findPath(workspaceId, ['School Boards', 'CBSE', 'NCERT Books']);
  const visibleRoot = await moveNcertClassesIntoNcertBooks(workspaceId);
  ncertRoot = (visibleRoot || ncertRoot);
  if (!ncertRoot) throw new Error('School Boards / CBSE not found.');

  const ncertCardsAfterFlatten = await collectDescendants(workspaceId, ncertRoot._id as Types.ObjectId);
  await archiveChapterFiles(ncertCardsAfterFlatten);
  await placeNcertBooksInsideClassShelves(workspaceId, ncertRoot);
  const ncertCardsAfterMove = await collectDescendants(workspaceId, ncertRoot._id as Types.ObjectId);
  await renameNcertCompleteBookFiles([ncertRoot, ...ncertCardsAfterMove]);
  await archiveEmptyCards(workspaceId, ncertRoot._id as Types.ObjectId);
  await archiveCbseNcertChapterCopy(workspaceId);
  await publishAncestorsForCompleteBooks(workspaceId, ncertRoot);

  const refreshedCards = [ncertRoot, ...(await collectDescendants(workspaceId, ncertRoot._id as Types.ObjectId))];
  const publicBookCount = refreshedCards.reduce((total, card) => (
    total + (card.files || []).filter((file: any) => isNcertCompleteBookFile(file) && isPublicFile(file)).length
  ), 0);
  const publicChapterCount = refreshedCards.reduce((total, card) => (
    total + (card.files || []).filter((file: any) => isNcertChapterFile(file) && isPublicFile(file)).length
  ), 0);

  console.log(
    [
      `NCERT normalized. Complete-book packages visible: ${publicBookCount}. Front matter/chapter PDFs still visible: ${publicChapterCount}.`,
      `Archived files ${stats.filesArchived}, moved files ${stats.filesMoved}, renamed books ${stats.filesRenamed}, created folders ${stats.foldersCreated}, NCERT classes moved ${stats.ncertClassesMoved}, moved folders ${stats.foldersMoved}, merged folders ${stats.foldersMerged}, archived folders ${stats.foldersArchived}, styled ${stats.styled}.`,
    ].join('\n')
  );
};

run()
  .catch((error) => {
    console.error('NCERT normalization failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
