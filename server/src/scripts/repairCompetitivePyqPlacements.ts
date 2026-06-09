import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard, { type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const ROOT_WORKSPACE_SLUG = 'study-hub';
const MONGO_URI = process.env.MONGO_URI;
const shouldApply = process.argv.includes('--apply');

type CardDoc = any;

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

const activeFiles = (card: CardDoc) =>
  (card.files || []).filter((file: any) => (file.status || 'published') !== 'archived');

const getFileKey = (file: any) => `${String(file.url || '').trim()}|${normalizeNameKey(file.name || '')}`;

const sanitizeFilePayload = (file: any) => {
  const payload = typeof file.toObject === 'function' ? file.toObject() : { ...file };
  delete payload._id;
  return payload;
};

const getPaperTargetName = (name: string) => {
  const key = normalizeNameKey(name);
  if (key.startsWith('paper i for year') || key === 'paper i') return 'Paper I';
  if (key.startsWith('paper iii noting and drafting precis writing')) {
    return 'Paper III - Noting and Drafting, Precis Writing';
  }
  if (key.includes('paper ii') && key.includes('categories i viii and xi')) {
    return 'Paper II (Procedure and Practice, Categories I, Viii and Xi)';
  }
  if (key.includes('paper ii') && /\bcategory iii\b/.test(key)) {
    return 'Paper II (Procedure and Practice, Categories III)';
  }
  if (key.includes('paper ii') && /\bcategory ii\b/.test(key)) {
    return 'Paper II (Procedure and Practice, Categories II)';
  }
  if (key.includes('paper ii') && /\bcategory x\b/.test(key)) {
    return 'Paper II (Procedure and Practice, Categories X)';
  }
  return '';
};

const getPaperOrder = (name: string) => {
  const key = normalizeNameKey(name);
  if (key === 'paper i') return 40;
  if (key.includes('categories i viii and xi')) return 52;
  if (key.includes('categories ii')) return 54;
  if (key.includes('categories iii')) return 56;
  if (key.includes('categories x')) return 58;
  if (key.startsWith('paper iii')) return 90;
  return 80;
};

const ensureCard = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId,
  name: string,
  options: { iconKey?: string; tone?: StudyCardTone; order?: number } = {}
): Promise<CardDoc> => {
  const slug = slugify(name);
  let card = await StudyCard.findOne({
    workspaceId,
    parentId,
    slug,
  });

  if (card) {
    if (card.status === 'archived' || card.visibility !== 'public') {
      card.status = 'published';
      card.visibility = 'public';
    }
    card.name = name;
    card.iconKey = options.iconKey || card.iconKey || 'pyq';
    card.tone = options.tone || card.tone || 'violet';
    card.goalType = 'resource_folder';
    card.order = options.order ?? card.order ?? 80;
    if (shouldApply) await card.save();
    return card;
  }

  if (!shouldApply) {
    return {
      _id: new Types.ObjectId(),
      workspaceId,
      parentId,
      name,
      slug,
      files: [] as any[],
    };
  }

  return StudyCard.create({
    workspaceId,
    parentId,
    name,
    slug,
    iconKey: options.iconKey || 'pyq',
    tone: options.tone || 'violet',
    goalType: 'resource_folder',
    order: options.order ?? 80,
    status: 'published',
    visibility: 'public',
    files: [],
  });
};

const archiveIfEmpty = async (workspaceId: Types.ObjectId, card: CardDoc) => {
  const childCount = await StudyCard.countDocuments({
    workspaceId,
    parentId: card._id,
    status: { $ne: 'archived' },
  });
  if (childCount || activeFiles(card).length) return false;
  if (shouldApply) {
    card.status = 'archived';
    card.visibility = 'private';
    await card.save();
  }
  return true;
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');
  console.log(`${shouldApply ? 'Applying' : 'Dry run'} Competitive Exams misplaced PYQ repair.`);

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean<{ _id: Types.ObjectId }>();
  if (!workspace) throw new Error('Study Hub workspace not found.');

  const workspaceId = workspace._id;
  const competitive = await StudyCard.findOne({
    workspaceId,
    parentId: null,
    name: 'Competitive Exams',
    status: { $ne: 'archived' },
  });
  if (!competitive) throw new Error('Competitive Exams root not found.');

  const steno = await StudyCard.findOne({
    workspaceId,
    parentId: competitive._id,
    name: 'UPSC SO Steno LDCE',
    status: { $ne: 'archived' },
  });
  if (!steno) throw new Error('UPSC SO Steno LDCE folder not found.');

  const misplaced = await StudyCard.find({
    workspaceId,
    parentId: competitive._id,
    status: { $ne: 'archived' },
    name: /^Paper/i,
  }).sort({ order: 1, name: 1 });

  let movedFiles = 0;
  let duplicateFiles = 0;
  let targetFoldersCreated = 0;
  let archivedFolders = 0;
  const moves: string[] = [];

  for (const sourcePaper of misplaced) {
    const targetName = getPaperTargetName(sourcePaper.name);
    if (!targetName) continue;

    const targetBefore = await StudyCard.findOne({
      workspaceId,
      parentId: steno._id,
      slug: slugify(targetName),
    }).select('_id').lean();

    const targetPaper = await ensureCard(workspaceId, steno._id as Types.ObjectId, targetName, {
      iconKey: 'pyq',
      tone: 'violet',
      order: getPaperOrder(targetName),
    });
    if (!targetBefore) targetFoldersCreated += 1;

    const sourcePyq = await StudyCard.findOne({
      workspaceId,
      parentId: sourcePaper._id,
      name: 'Previous Year Papers',
      status: { $ne: 'archived' },
    });
    if (!sourcePyq) continue;

    const targetPyq = await ensureCard(workspaceId, targetPaper._id as Types.ObjectId, 'Previous Year Papers', {
      iconKey: 'pyq',
      tone: 'violet',
      order: 20,
    });

    const targetKeys = new Set(activeFiles(targetPyq).map(getFileKey));
    const nextSourceFiles: any[] = [];
    for (const file of sourcePyq.files || []) {
      if ((file.status || 'published') === 'archived') {
        nextSourceFiles.push(file);
        continue;
      }
      const key = getFileKey(file);
      if (targetKeys.has(key)) {
        duplicateFiles += 1;
      } else {
        targetPyq.files.push(sanitizeFilePayload(file));
        targetKeys.add(key);
        movedFiles += 1;
      }
    }

    moves.push(`${sourcePaper.name} -> UPSC SO Steno LDCE / ${targetName} / Previous Year Papers`);

    if (shouldApply) {
      sourcePyq.files = nextSourceFiles;
      await targetPyq.save();
      await sourcePyq.save();
    }

    if (await archiveIfEmpty(workspaceId, sourcePyq)) archivedFolders += 1;
    if (await archiveIfEmpty(workspaceId, sourcePaper)) archivedFolders += 1;
  }

  console.log(`Misplaced paper folders found: ${misplaced.length}.`);
  console.log(`${shouldApply ? 'Moved' : 'Would move'} files: ${movedFiles}. Duplicates skipped: ${duplicateFiles}.`);
  console.log(`${shouldApply ? 'Created/restored' : 'Would create/restore'} target paper folders: ${targetFoldersCreated}.`);
  console.log(`${shouldApply ? 'Archived' : 'Would archive'} old empty wrapper folders: ${archivedFolders}.`);
  if (moves.length) {
    console.log('Moves:');
    moves.slice(0, 24).forEach((move) => console.log(`- ${move}`));
  }
};

run()
  .catch((error) => {
    console.error('Competitive Exams misplaced PYQ repair failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
