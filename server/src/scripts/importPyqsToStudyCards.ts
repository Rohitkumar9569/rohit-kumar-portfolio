import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import '../models/Exam';
import PyqDocument from '../models/PyqDocument';
import StudyCard from '../models/StudyCard';
import '../models/Subject';
import Workspace from '../models/Workspace';

const MONGO_URI = process.env.MONGO_URI;
const ROOT_WORKSPACE_SLUG = 'study-hub';
const shouldClear = process.argv.includes('--clear');

const slugify = (value: string, fallback = 'item') => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || fallback;
};

const normalizeShortCode = (value: string) => {
  const lower = value.toLowerCase();
  if (lower.includes('computer')) return 'cse';
  if (lower.includes('data') && lower.includes('ai')) return 'da';
  if (lower.includes('data') && lower.includes('science')) return 'da';
  if (lower.includes('civil')) return 'civil';
  if (lower.includes('mechanical')) return 'me';
  if (lower.includes('electrical')) return 'ee';
  if (lower.includes('electronics')) return 'ece';
  if (lower.includes('mathematics') || lower.includes('maths')) return 'maths';
  if (lower.includes('general studies')) return 'gs';
  if (lower.includes('aptitude') || lower.includes('csat')) return 'aptitude';
  return slugify(value).slice(0, 24);
};

const getIconKey = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('physics')) return 'physics';
  if (lower.includes('chemistry')) return 'chemistry';
  if (lower.includes('biology')) return 'biology';
  if (lower.includes('math')) return 'maths';
  if (lower.includes('aptitude') || lower.includes('csat')) return 'aptitude';
  if (lower.includes('interview')) return 'interview';
  if (lower.includes('paper') || lower.includes('pyq')) return 'pyq';
  if (lower.includes('book')) return 'book';
  return 'folder';
};

const getExamCardName = (exam: any, subject: any) => {
  const examSlug = slugify(exam.slug || exam.shortName || exam.name, 'exam');
  const examShortName = String(exam.shortName || exam.name || '').toUpperCase();
  const subjectName = String(subject.name || '').trim();
  const subjectCode = normalizeShortCode(subjectName);

  if (examShortName.includes('GATE') || examSlug === 'gate') {
    return `GATE ${subjectCode.toUpperCase()}`;
  }

  if (examShortName.includes('UPSC') || examSlug === 'upsc') {
    return 'UPSC CSE';
  }

  return exam.shortName || exam.name || subjectName || examSlug;
};

type CatalogLevel = {
  name: string;
  iconKey: string;
  tone: string;
  order: number;
};

const gateBranchDisplayNames: Record<string, string> = {
  cse: 'GATE CSE',
  da: 'GATE DA',
  ece: 'GATE ECE',
  me: 'GATE Mechanical',
  ee: 'GATE Electrical',
  civil: 'GATE Civil',
  maths: 'GATE Mathematics',
};

const getExamCatalogLevels = (exam: any, subject: any): CatalogLevel[] => {
  const examSlug = slugify(exam.slug || exam.shortName || exam.name, 'exam');
  const examShortName = String(exam.shortName || exam.name || '').toUpperCase();
  const subjectName = String(subject.name || '').trim();

  if (examShortName.includes('GATE') || examSlug === 'gate') {
    const subjectCode = normalizeShortCode(subjectName);
    return [
      { name: 'Entrance Exams', iconKey: 'entrance', tone: 'violet', order: 20 },
      { name: 'GATE', iconKey: 'gate', tone: 'cyan', order: 20 },
      { name: gateBranchDisplayNames[subjectCode] || `GATE ${subjectCode.toUpperCase()}`, iconKey: 'gate', tone: 'cyan', order: 10 },
    ];
  }

  if (examSlug.includes('jee-advanced') || examShortName.includes('JEE ADVANCED')) {
    return [
      { name: 'Entrance Exams', iconKey: 'entrance', tone: 'violet', order: 20 },
      { name: 'JEE', iconKey: 'nuclear', tone: 'cyan', order: 10 },
      { name: 'JEE Advanced', iconKey: 'nuclear', tone: 'cyan', order: 20 },
    ];
  }

  if (examSlug.includes('jee-main') || examShortName.includes('JEE MAIN') || examShortName.includes('JEE MAINS')) {
    return [
      { name: 'Entrance Exams', iconKey: 'entrance', tone: 'violet', order: 20 },
      { name: 'JEE', iconKey: 'nuclear', tone: 'cyan', order: 10 },
      { name: 'JEE Main', iconKey: 'nuclear', tone: 'cyan', order: 10 },
    ];
  }

  if (examShortName.includes('UPSC') || examSlug === 'upsc') {
    return [
      { name: 'Competitive Exams', iconKey: 'competitive', tone: 'blue', order: 10 },
      { name: 'UPSC', iconKey: 'upsc', tone: 'blue', order: 10 },
      { name: 'UPSC CSE', iconKey: 'upsc', tone: 'blue', order: 10 },
    ];
  }

  return [
    {
      name: getExamCardName(exam, subject),
      iconKey: 'exam',
      tone: 'blue',
      order: 10,
    },
  ];
};

const getRootWorkspace = async () => {
  return Workspace.findOneAndUpdate(
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
        description: 'Root card workspace for all exams, schools, colleges, and files.',
        template: {
          phases: [],
          facets: [],
          resourceTypes: [],
        },
      },
    },
    { new: true, upsert: true, runValidators: true }
  );
};

const upsertCard = async ({
  workspaceId,
  parentId,
  name,
  iconKey,
  tone,
  order,
}: {
  workspaceId: Types.ObjectId;
  parentId: Types.ObjectId | null;
  name: string;
  iconKey: string;
  tone: string;
  order: number;
}) => {
  return StudyCard.findOneAndUpdate(
    {
      workspaceId,
      parentId,
      slug: slugify(name),
    },
    {
      $set: {
        workspaceId,
        parentId,
        name,
        slug: slugify(name),
        iconKey,
        tone,
        order,
        status: 'published',
        visibility: 'public',
      },
      $setOnInsert: {
        files: [],
      },
    },
    { new: true, upsert: true, runValidators: true }
  );
};

const upsertPath = async (workspaceId: Types.ObjectId, levels: CatalogLevel[]) => {
  let parentId: Types.ObjectId | null = null;
  let current: any = null;
  for (const level of levels) {
    current = await upsertCard({
      workspaceId,
      parentId,
      name: level.name,
      iconKey: level.iconKey,
      tone: level.tone,
      order: level.order,
    });
    parentId = current._id as Types.ObjectId;
  }
  return current;
};

const addFileToCard = async (cardId: Types.ObjectId, pyq: any) => {
  const fileName = pyq.title || `${pyq.year || ''} Paper`.trim();
  await StudyCard.updateOne(
    {
      _id: cardId,
      'files.url': { $ne: pyq.fileUrl },
    },
    {
      $push: {
        files: {
          name: fileName,
          url: pyq.fileUrl,
          publicId: pyq.cloudinaryPublicId,
          resourceType: 'raw',
          uploadedAt: pyq.createdAt || new Date(),
        },
      },
    }
  );
};

const run = async () => {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is not defined.');
  }

  await mongoose.connect(MONGO_URI);

  const rootWorkspace = await getRootWorkspace();
  const rootWorkspaceId = rootWorkspace._id as Types.ObjectId;
  const pyqs = await PyqDocument.find({})
    .sort({ year: -1, title: 1 })
    .populate('examId')
    .populate('subjectId')
    .lean();

  if (shouldClear) {
    await StudyCard.deleteMany({ workspaceId: rootWorkspaceId });
    console.log('Cleared existing root Study Hub cards.');
  }

  if (!pyqs.length) {
    console.log('No uploaded PYQ documents found.');
    return;
  }

  let importedFiles = 0;
  for (const pyq of pyqs as any[]) {
    const exam = pyq.examId;
    const subject = pyq.subjectId;
    if (!exam || !subject || !pyq.fileUrl) continue;

    const examCard = await upsertPath(rootWorkspaceId, getExamCatalogLevels(exam, subject));

    const subjectName = subject.name || 'Previous Year Papers';
    const subjectCard = await upsertCard({
      workspaceId: rootWorkspaceId,
      parentId: examCard._id as Types.ObjectId,
      name: subjectName,
      iconKey: getIconKey(subjectName),
      tone: 'blue',
      order: 10,
    });

    const pyqCard = await upsertCard({
      workspaceId: rootWorkspaceId,
      parentId: subjectCard._id as Types.ObjectId,
      name: 'Previous Year Papers',
      iconKey: 'pyq',
      tone: 'violet',
      order: 10,
    });

    const year = Number(pyq.year) || new Date().getFullYear();
    const yearCard = await upsertCard({
      workspaceId: rootWorkspaceId,
      parentId: pyqCard._id as Types.ObjectId,
      name: `${year}`,
      iconKey: 'paper',
      tone: 'violet',
      order: Math.max(0, 2200 - year),
    });

    await addFileToCard(yearCard._id as Types.ObjectId, pyq);
    importedFiles += 1;
  }

  console.log(`Mapped ${importedFiles} uploaded PYQ file(s) into ${ROOT_WORKSPACE_SLUG} cards.`);
};

run()
  .catch((error) => {
    console.error('PYQ import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
