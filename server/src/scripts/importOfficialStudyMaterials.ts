import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import mongoose, { Types } from 'mongoose';
import StudyCard, { type StudyCardStatus, type StudyCardVisibility } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const SCRIPT_DIR = path.resolve(__dirname);
const ROOT_WORKSPACE_SLUG = 'study-hub';
const DEFAULT_INPUT_PATH = path.join(SCRIPT_DIR, 'official-materials.json');
const EXAMPLE_INPUT_PATH = path.join(SCRIPT_DIR, 'official-materials.example.json');
const MONGO_URI = process.env.MONGO_URI;

type StudyLanguage = 'hinglish' | 'english' | 'hindi' | 'mixed';
type SourceType = 'official' | 'ncert' | 'standard_book' | 'faculty' | 'creator' | 'community' | 'platform';

type OfficialMaterialEntry = {
  title: string;
  url: string;
  targetPath: string[] | string;
  sourceName: string;
  sourceUrl?: string;
  sourceType?: SourceType;
  resourceType?: string;
  status?: StudyCardStatus;
  visibility?: StudyCardVisibility;
  language?: StudyLanguage;
  year?: number;
  stage?: string;
  paper?: string;
  subject?: string;
  topic?: string;
  sizeBytes?: number;
  mimeType?: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  thumbnailUrl?: string;
  mirrorAllowed?: boolean;
  licenseUrl?: string;
  rightsNote?: string;
  notes?: string;
};

type Options = {
  apply: boolean;
  inputPath: string;
  progressEvery: number;
  quiet: boolean;
  sourceName?: string;
  pathContains?: string;
};

type CardCache = Map<string, any>;
type FileUrlCache = Map<string, Set<string>>;

const parseArgs = (): Options => {
  const args = process.argv.slice(2);
  const inputArg = args.find((arg) => arg.startsWith('--input='));
  const sourceArg = args.find((arg) => arg.startsWith('--source='));
  const pathContainsArg = args.find((arg) => arg.startsWith('--path-contains='));
  const progressArg = args.find((arg) => arg.startsWith('--progressEvery='));
  const progressEvery = progressArg ? Number(progressArg.split('=').slice(1).join('=')) : 100;
  return {
    apply: args.includes('--apply'),
    progressEvery: Number.isInteger(progressEvery) && progressEvery > 0 ? progressEvery : 100,
    quiet: args.includes('--quiet'),
    inputPath: inputArg ? path.resolve(inputArg.split('=').slice(1).join('=')) : DEFAULT_INPUT_PATH,
    sourceName: sourceArg ? sourceArg.split('=').slice(1).join('=').trim().toLowerCase() : undefined,
    pathContains: pathContainsArg ? pathContainsArg.split('=').slice(1).join('=').trim().toLowerCase() : undefined,
  };
};

const slugify = (value: string, fallback = 'item') => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug.slice(0, 90).replace(/-+$/g, '') || fallback;
};

const normalizePath = (targetPath: string[] | string) => {
  const parts = Array.isArray(targetPath) ? targetPath : targetPath.split('/');
  return parts
    .map((part) => String(part).trim().replace(/\s+/g, ' '))
    .map((part) => (part.length > 140 ? part.slice(0, 140).trim().replace(/[-,;:\s]+$/g, '') : part))
    .filter(Boolean);
};

const hasPlaceholder = (value: string) => /<[^>]+>/.test(value);

const inferIconKey = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('ncert') || lower.includes('book')) return 'book';
  if (lower.includes('sample') || lower.includes('practice')) return 'practice';
  if (lower.includes('syllabus')) return 'syllabus';
  if (lower.includes('paper') || lower.includes('pyq')) return 'pyq';
  if (lower.includes('physics')) return 'physics';
  if (lower.includes('chemistry')) return 'chemistry';
  if (lower.includes('biology')) return 'biology';
  if (lower.includes('math')) return 'maths';
  return 'folder';
};

const inferTone = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('ncert') || lower.includes('book')) return 'emerald';
  if (lower.includes('paper') || lower.includes('pyq')) return 'violet';
  if (lower.includes('syllabus')) return 'cyan';
  if (lower.includes('sample') || lower.includes('practice')) return 'amber';
  return 'blue';
};

const getGoalTypeForDepth = (depth: number) => {
  if (depth === 0) return 'exam_category';
  if (depth === 1) return 'exam_family';
  if (depth === 2) return 'exam';
  if (depth === 3) return 'subject';
  return 'resource_folder';
};

const loadEntries = async (inputPath: string): Promise<OfficialMaterialEntry[]> => {
  const resolvedInputPath = await fs.access(inputPath)
    .then(() => inputPath)
    .catch(() => EXAMPLE_INPUT_PATH);
  const raw = await fs.readFile(resolvedInputPath, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Official materials manifest must be a JSON array.');
  }
  return parsed as OfficialMaterialEntry[];
};

const isValidEntry = (entry: OfficialMaterialEntry) => {
  const targetPath = normalizePath(entry.targetPath);
  return Boolean(
    entry.title?.trim() &&
    entry.url?.trim() &&
    !hasPlaceholder(entry.url) &&
    !targetPath.some(hasPlaceholder) &&
    targetPath.length
  );
};

const getRootWorkspace = async () => Workspace.findOneAndUpdate(
  { slug: ROOT_WORKSPACE_SLUG },
  {
    $set: {
      name: 'Study Hub',
      shortName: 'Study Hub',
      slug: ROOT_WORKSPACE_SLUG,
      type: 'personal',
      category: 'platform',
      visibility: 'public',
      status: 'active',
      readiness: 100,
      priority: 1000,
      description: 'Root card workspace for all exams, schools, boards, and official study materials.',
      template: {
        phases: [],
        facets: [],
        resourceTypes: [],
      },
    },
  },
  { new: true, upsert: true, runValidators: true }
);

const getCardId = (card: any) => card?._id?.toString?.() || String(card?._id || '');

const getParentIdKey = (parentId?: Types.ObjectId | string | null) => parentId?.toString?.() || 'root';

const getPathCacheKey = (parentId: Types.ObjectId | string | null | undefined, slug: string) =>
  `${getParentIdKey(parentId)}::${slug}`;

const getFilePayload = (entry: OfficialMaterialEntry) => {
  const shouldUseMirror = Boolean(entry.cloudinaryUrl && entry.mirrorAllowed);
  const fileUrl = shouldUseMirror ? entry.cloudinaryUrl as string : entry.url;
  const status = entry.status || 'published';
  const visibility = entry.visibility || 'public';
  const notes = [
    entry.notes,
    entry.rightsNote,
    entry.licenseUrl ? `License/source terms: ${entry.licenseUrl}` : '',
    entry.sourceUrl ? `Official source: ${entry.sourceUrl}` : '',
    entry.cloudinaryUrl && !entry.mirrorAllowed ? 'Cloudinary mirror ignored because mirrorAllowed is not true.' : '',
  ].filter(Boolean).join(' | ');

  return {
    fileUrl,
    file: {
      name: entry.title.trim(),
      url: fileUrl,
      thumbnailUrl: entry.thumbnailUrl,
      sizeBytes: entry.sizeBytes,
      mimeType: entry.mimeType || 'application/pdf',
      publicId: shouldUseMirror ? entry.cloudinaryPublicId : undefined,
      resourceType: entry.resourceType || 'book',
      status,
      visibility,
      year: entry.year,
      stage: entry.stage,
      paper: entry.paper,
      subject: entry.subject,
      topic: entry.topic,
      language: entry.language || 'english',
      sourceType: entry.sourceType || 'official',
      sourceName: entry.sourceName,
      notes,
      uploadedAt: new Date(),
    },
  };
};

const preloadCardCaches = async (workspaceId: Types.ObjectId) => {
  const pathCache: CardCache = new Map();
  const fileUrlCache: FileUrlCache = new Map();
  const cards = await StudyCard.find({ workspaceId, status: { $ne: 'archived' } })
    .select('_id parentId slug')
    .lean();

  cards.forEach((card: any) => {
    pathCache.set(getPathCacheKey(card.parentId, card.slug), card);
  });

  return { pathCache, fileUrlCache };
};

const getCachedFileUrls = async (cardId: Types.ObjectId, fileUrlCache?: FileUrlCache) => {
  if (!fileUrlCache) return undefined;
  const cardIdKey = cardId.toString();
  const cached = fileUrlCache.get(cardIdKey);
  if (cached) return cached;

  const card = await StudyCard.findById(cardId).select('files.url').lean();
  const urls = new Set<string>(((card as any)?.files || []).map((file: any) => file.url).filter(Boolean));
  fileUrlCache.set(cardIdKey, urls);
  return urls;
};

const upsertPath = async (
  workspaceId: Types.ObjectId,
  pathParts: string[],
  apply: boolean,
  pathCache: CardCache,
  fileUrlCache?: FileUrlCache,
  initialEntry?: OfficialMaterialEntry
) => {
  let parentId: Types.ObjectId | null = null;
  let card: any = null;
  let fileAttachedOnCreate = false;

  for (let index = 0; index < pathParts.length; index += 1) {
    const name = pathParts[index];
    const slug = slugify(name);
    const cacheKey = getPathCacheKey(parentId, slug);
    const cached = pathCache.get(cacheKey);
    if (cached) {
      card = cached;
      parentId = cached._id;
      continue;
    }

    if (!apply) {
      parentId = new Types.ObjectId();
      card = { _id: parentId, name, parentId, slug };
      pathCache.set(cacheKey, card);
      continue;
    }

    const isLeaf = index === pathParts.length - 1;
    const initialFilePayload = isLeaf && initialEntry ? getFilePayload(initialEntry) : undefined;
    let createdWithInitialFile = false;

    try {
      card = await StudyCard.create({
        workspaceId,
        parentId,
        name,
        slug,
        iconKey: inferIconKey(name),
        tone: inferTone(name),
        goalType: getGoalTypeForDepth(index),
        order: index * 10,
        status: 'published',
        visibility: 'public',
        files: initialFilePayload ? [initialFilePayload.file] : [],
      });
      createdWithInitialFile = Boolean(initialFilePayload);
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      card = await StudyCard.findOneAndUpdate(
        { workspaceId, parentId, slug },
        {
          $set: {
            workspaceId,
            parentId,
            name,
            slug,
            iconKey: inferIconKey(name),
            tone: inferTone(name),
            goalType: getGoalTypeForDepth(index),
            order: index * 10,
            status: 'published',
            visibility: 'public',
          },
          $setOnInsert: {
            files: initialFilePayload ? [initialFilePayload.file] : [],
          },
        },
        { new: true, upsert: true, runValidators: true }
      );
    }

    pathCache.set(cacheKey, card);
    if (createdWithInitialFile) {
      fileUrlCache?.set(getCardId(card), new Set<string>(initialFilePayload ? [initialFilePayload.fileUrl] : []));
    }
    fileAttachedOnCreate = createdWithInitialFile;
    parentId = card._id;
  }

  return { card, fileAttachedOnCreate };
};

const addFile = async (cardId: Types.ObjectId, entry: OfficialMaterialEntry, apply: boolean, fileUrlCache?: FileUrlCache) => {
  const { fileUrl, file } = getFilePayload(entry);
  const cardIdKey = cardId.toString();
  const cachedUrls = await getCachedFileUrls(cardId, fileUrlCache);
  if (cachedUrls?.has(fileUrl)) return false;
  if (!apply) return false;

  const result = await StudyCard.updateOne(
    {
      _id: cardId,
      'files.url': { $ne: fileUrl },
    },
    {
      $push: {
        files: file,
      },
    }
  );

  if (result.modifiedCount > 0) {
    if (cachedUrls) cachedUrls.add(fileUrl);
    else fileUrlCache?.set(cardIdKey, new Set<string>([fileUrl]));
  }

  return result.modifiedCount > 0;
};

const run = async () => {
  const options = parseArgs();
  const loadedEntries = await loadEntries(options.inputPath);
  let entries = options.sourceName
    ? loadedEntries.filter((entry) => entry.sourceName?.trim().toLowerCase() === options.sourceName)
    : loadedEntries;
  if (options.pathContains) {
    entries = entries.filter((entry) => normalizePath(entry.targetPath).join(' / ').toLowerCase().includes(options.pathContains || ''));
  }
  if (!entries.length) throw new Error('Official materials manifest is empty.');

  console.log(`${options.apply ? 'Applying' : 'Dry run'} official materials import.`);
  if (options.sourceName) console.log(`Filtered source: ${options.sourceName}. Entries: ${entries.length}/${loadedEntries.length}.`);
  if (options.pathContains) console.log(`Filtered target path contains: ${options.pathContains}. Entries: ${entries.length}/${loadedEntries.length}.`);
  if (!options.apply) console.log('Use --apply to write folders and file entries.');

  if (!options.apply) {
    let validCount = 0;
    entries.forEach((entry) => {
      if (!isValidEntry(entry)) {
        console.warn(`Skipping invalid entry: ${entry.title || entry.url || 'untitled'}`);
        return;
      }
      validCount += 1;
      const route = normalizePath(entry.targetPath).join(' / ');
      const storage = entry.cloudinaryUrl && entry.mirrorAllowed ? 'Cloudinary mirror' : 'official URL';
      console.log(`Would attach: ${entry.title} -> ${route} (${storage})`);
      if (entry.cloudinaryUrl && !entry.mirrorAllowed) {
        console.warn(`Mirror blocked until mirrorAllowed=true: ${entry.title}`);
      }
    });
    console.log(`Dry run complete. Valid entries: ${validCount}. Entries: ${entries.length}.`);
    return;
  }

  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });

  const workspace = await getRootWorkspace();
  let attached = 0;
  let existing = 0;
  let processed = 0;
  let skipped = 0;
  const { pathCache, fileUrlCache } = await preloadCardCaches(workspace._id as Types.ObjectId);

  for (const entry of entries) {
    const targetPath = normalizePath(entry.targetPath);
    if (!isValidEntry(entry)) {
      skipped += 1;
      console.warn(`Skipping invalid entry: ${entry.title || entry.url || 'untitled'}`);
      continue;
    }

    const { card, fileAttachedOnCreate } = await upsertPath(
      workspace._id as Types.ObjectId,
      targetPath,
      options.apply,
      pathCache,
      fileUrlCache,
      entry
    );
    const changed = fileAttachedOnCreate || await addFile(card._id, entry, options.apply, fileUrlCache);
    attached += changed ? 1 : 0;
    existing += changed ? 0 : 1;
    processed += 1;

    if (options.quiet) {
      if (processed % options.progressEvery === 0) {
        console.log(`Progress ${processed}/${entries.length}. Attached: ${attached}. Exists: ${existing}. Skipped: ${skipped}.`);
      }
    } else {
      console.log(`${options.apply ? (changed ? 'Attached' : 'Exists') : 'Would attach'}: ${entry.title} -> ${targetPath.join(' / ')}`);
    }
  }

  console.log(`Done. Attached: ${attached}. Exists: ${existing}. Skipped: ${skipped}. Entries: ${entries.length}.`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Official materials import failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
