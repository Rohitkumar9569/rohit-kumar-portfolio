import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard, { type StudyCardGoalType, type StudyCardTone, type IStudyCardFile } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const MONGO_URI = process.env.MONGO_URI;
const ROOT_WORKSPACE_SLUG = 'study-hub';
const shouldApply = process.argv.includes('--apply');
const ACADEMIC_YEAR = 2026;

type CardDoc = any;

type ShelfSpec = {
  name: string;
  slug: string;
  iconKey: string;
  tone: StudyCardTone;
  order: number;
  resourceType: string;
  sourceName: string;
  sourceType: IStudyCardFile['sourceType'];
  getUrl: (classNumber: number) => string;
  getTitle: (className: string, subject: string) => string;
  notes: string;
};

const officialUrls = {
  cbse: 'https://www.cbse.gov.in/',
  cbseAcademic: 'https://cbseacademic.nic.in/',
  cbseCurriculum: 'https://www.cbseacademic.nic.in/curriculum_2026.html',
  cbseQuestionPapers: 'https://www.cbse.gov.in/cbsenew/question-paper.html',
  cbseQuestionBank10: 'https://cbseacademic.nic.in/qbclass10.html',
  cbseQuestionBank12: 'https://cbseacademic.nic.in/qbclass12.html',
  cbseCbe: 'https://cbseacademic.nic.in/cbe/index.html',
  cbseCbeAssessment: 'https://cbseacademic.nic.in/cbe/assessment.html',
  cbseClass10Sqp: 'https://cbseacademic.nic.in/SQP_CLASSX_2025-26.html',
  cbseClass12Sqp: 'https://cbseacademic.nic.in/sqp_classxii_2025-26.html',
  cbsePublications: 'https://cbseacademic.nic.in/cbse-publication.html',
  ncertTextbooks: 'https://ncert.nic.in/textbook.php?ln=en',
};

const slugify = (value: string, fallback = 'item') => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '');
  return slug || fallback;
};

const normalizeKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const className = (classNumber: number) => `Class ${classNumber}`;

const subjectLists = {
  primary: ['English', 'Hindi', 'Mathematics', 'Environmental Studies', 'General Knowledge', 'Worksheets'],
  middle: ['English', 'Hindi', 'Sanskrit', 'Mathematics', 'Science', 'Social Science', 'Computer Science', 'Art Education', 'Health and Physical Education'],
  class9: ['English Language & Literature', 'Hindi Course A', 'Hindi Course B', 'Sanskrit', 'Mathematics', 'Science', 'Social Science', 'Information Technology', 'Artificial Intelligence', 'Health and Physical Education'],
  class10: ['English Language & Literature', 'Hindi Course A', 'Hindi Course B', 'Sanskrit', 'Mathematics', 'Science', 'Social Science', 'Information Technology', 'Computer Applications', 'Artificial Intelligence', 'Health and Physical Education'],
  senior: ['Science Stream', 'Commerce Stream', 'Humanities Stream', 'English Core', 'English Elective', 'Hindi Core', 'Hindi Elective', 'Sanskrit Core', 'Mathematics', 'Applied Mathematics', 'Physics', 'Chemistry', 'Biology', 'Accountancy', 'Business Studies', 'Economics', 'History', 'Political Science', 'Geography', 'Psychology', 'Sociology', 'Computer Science', 'Informatics Practices', 'Physical Education', 'Home Science', 'Entrepreneurship', 'Legal Studies', 'Fine Arts', 'Painting'],
};

const subjectsForClass = (classNumber: number) => {
  if (classNumber <= 5) return subjectLists.primary;
  if (classNumber <= 8) return subjectLists.middle;
  if (classNumber === 9) return subjectLists.class9;
  if (classNumber === 10) return subjectLists.class10;
  return subjectLists.senior;
};

const subjectIcon = (subject: string) => {
  const key = normalizeKey(subject);
  if (key.includes('stream')) return slugify(subject);
  if (key.includes('math')) return 'mathematics';
  if (key.includes('physics')) return 'physics';
  if (key.includes('chemistry')) return 'chemistry';
  if (key.includes('biology')) return 'biology';
  if (key.includes('science') && !key.includes('social')) return 'science';
  if (key.includes('social')) return 'social-science';
  if (key.includes('history')) return 'history';
  if (key.includes('geography')) return 'geography';
  if (key.includes('political')) return 'political-science';
  if (key.includes('economics')) return 'economics';
  if (key.includes('account')) return 'accountancy';
  if (key.includes('business')) return 'business-studies';
  if (key.includes('computer')) return 'computer-science';
  if (key.includes('informatics')) return 'informatics-practices';
  if (key.includes('information') || key.includes('artificial')) return 'information-technology';
  if (key.includes('english')) return 'english';
  if (key.includes('hindi')) return 'hindi';
  if (key.includes('sanskrit')) return 'sanskrit';
  if (key.includes('legal')) return 'legal-studies';
  if (key.includes('fine') || key.includes('painting') || key.includes('art')) return 'fine-art';
  if (key.includes('physical') || key.includes('health')) return 'physical-education';
  if (key.includes('worksheet')) return 'worksheets';
  return slugify(subject, 'subject');
};

const subjectTone = (subject: string): StudyCardTone => {
  const key = normalizeKey(subject);
  if (key.includes('math') || key.includes('science') || key.includes('physics') || key.includes('chemistry') || key.includes('biology')) return 'blue';
  if (key.includes('commerce') || key.includes('account') || key.includes('business') || key.includes('economics')) return 'emerald';
  if (key.includes('computer') || key.includes('informatics') || key.includes('information') || key.includes('artificial')) return 'cyan';
  if (key.includes('history') || key.includes('geography') || key.includes('political') || key.includes('humanities') || key.includes('legal')) return 'amber';
  if (key.includes('english') || key.includes('hindi') || key.includes('sanskrit')) return 'rose';
  return 'slate';
};

const sqpUrlForClass = (classNumber: number) => {
  if (classNumber === 10) return officialUrls.cbseClass10Sqp;
  if (classNumber === 12) return officialUrls.cbseClass12Sqp;
  return officialUrls.cbseAcademic;
};

const questionBankUrlForClass = (classNumber: number) => {
  if (classNumber === 10) return officialUrls.cbseQuestionBank10;
  if (classNumber === 12) return officialUrls.cbseQuestionBank12;
  if (classNumber >= 6 && classNumber <= 10) return officialUrls.cbseCbeAssessment;
  return officialUrls.cbseCbe;
};

const shelfSpecs: ShelfSpec[] = [
  {
    name: 'Syllabus',
    slug: 'syllabus',
    iconKey: 'syllabus',
    tone: 'cyan',
    order: 10,
    resourceType: 'syllabus',
    sourceName: 'CBSE Academic',
    sourceType: 'official',
    getUrl: () => officialUrls.cbseCurriculum,
    getTitle: (className, subject) => `${className} ${subject} Syllabus`,
    notes: 'Current CBSE curriculum portal for academic year 2025-26.',
  },
  {
    name: 'NCERT Books',
    slug: 'ncert-books',
    iconKey: 'ncert-books',
    tone: 'emerald',
    order: 20,
    resourceType: 'book',
    sourceName: 'NCERT',
    sourceType: 'ncert',
    getUrl: () => officialUrls.ncertTextbooks,
    getTitle: (className, subject) => `${className} ${subject} NCERT Books`,
    notes: 'Official NCERT textbook portal for classes I-XII.',
  },
  {
    name: 'Study Material',
    slug: 'study-material',
    iconKey: 'study-material',
    tone: 'blue',
    order: 30,
    resourceType: 'material',
    sourceName: 'CBSE Academic',
    sourceType: 'official',
    getUrl: () => officialUrls.cbseAcademic,
    getTitle: (className, subject) => `${className} ${subject} Study Material`,
    notes: 'Official CBSE Academic resource entry for subject support material.',
  },
  {
    name: 'Previous Year Papers',
    slug: 'previous-year-papers',
    iconKey: 'previous-year-papers',
    tone: 'violet',
    order: 40,
    resourceType: 'pyq',
    sourceName: 'CBSE',
    sourceType: 'official',
    getUrl: () => officialUrls.cbseQuestionPapers,
    getTitle: (className, subject) => `${className} ${subject} Previous Year Papers`,
    notes: 'Official CBSE previous years question paper portal.',
  },
  {
    name: 'Sample Papers',
    slug: 'sample-papers',
    iconKey: 'sample-papers',
    tone: 'violet',
    order: 50,
    resourceType: 'sample_paper',
    sourceName: 'CBSE Academic',
    sourceType: 'official',
    getUrl: sqpUrlForClass,
    getTitle: (className, subject) => `${className} ${subject} Sample Papers`,
    notes: 'Official sample paper and marking scheme source where available.',
  },
  {
    name: 'Practice Questions',
    slug: 'practice-questions',
    iconKey: 'practice-questions',
    tone: 'amber',
    order: 60,
    resourceType: 'practice',
    sourceName: 'CBSE Academic',
    sourceType: 'official',
    getUrl: questionBankUrlForClass,
    getTitle: (className, subject) => `${className} ${subject} Practice Questions`,
    notes: 'Official CBSE question bank and competency-based practice source.',
  },
  {
    name: 'Answer Keys',
    slug: 'answer-keys',
    iconKey: 'answer-keys',
    tone: 'slate',
    order: 70,
    resourceType: 'answer_key',
    sourceName: 'CBSE Academic',
    sourceType: 'official',
    getUrl: sqpUrlForClass,
    getTitle: (className, subject) => `${className} ${subject} Marking Scheme`,
    notes: 'Official marking scheme source where CBSE publishes it with sample papers.',
  },
  {
    name: 'Official CBSE',
    slug: 'official-cbse',
    iconKey: 'official-cbse',
    tone: 'cyan',
    order: 80,
    resourceType: 'update',
    sourceName: 'CBSE',
    sourceType: 'official',
    getUrl: () => officialUrls.cbse,
    getTitle: (className, subject) => `${className} ${subject} Official CBSE Updates`,
    notes: 'Official CBSE portal for announcements and source verification.',
  },
];

const stats = {
  cardsCreated: 0,
  cardsUpdated: 0,
  filesAttached: 0,
  filesExisting: 0,
  ncertPortalFilesRemoved: 0,
};

const ensureCard = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  input: {
    name: string;
    slug?: string;
    iconKey: string;
    tone: StudyCardTone;
    goalType: StudyCardGoalType;
    order: number;
  }
) => {
  const slug = input.slug || slugify(input.name);
  const existing = await StudyCard.findOne({ workspaceId, parentId, slug });

  if (existing) {
    const patch = {
      name: input.name,
      iconKey: input.iconKey,
      tone: input.tone,
      goalType: input.goalType,
      order: input.order,
      status: 'published',
      visibility: 'public',
    };

    if (shouldApply) {
      existing.set(patch);
      await existing.save();
    }
    stats.cardsUpdated += 1;
    return existing;
  }

  stats.cardsCreated += 1;
  if (!shouldApply) {
    return {
      _id: new Types.ObjectId(),
      workspaceId,
      parentId,
      name: input.name,
      slug,
      iconKey: input.iconKey,
      tone: input.tone,
      goalType: input.goalType,
      order: input.order,
      files: [],
    } as CardDoc;
  }

  return StudyCard.create({
    workspaceId,
    parentId,
    name: input.name,
    slug,
    iconKey: input.iconKey,
    tone: input.tone,
    goalType: input.goalType,
    order: input.order,
    status: 'published',
    visibility: 'public',
    files: [],
  });
};

const attachOfficialFile = async (card: CardDoc, shelf: ShelfSpec, classNumber: number, subject: string) => {
  const file: IStudyCardFile = {
    name: shelf.getTitle(className(classNumber), subject),
    url: shelf.getUrl(classNumber),
    mimeType: 'text/html',
    resourceType: shelf.resourceType,
    status: 'published',
    visibility: 'public',
    year: ACADEMIC_YEAR,
    stage: className(classNumber),
    paper: shelf.name,
    subject,
    language: 'english',
    sourceType: shelf.sourceType,
    sourceName: shelf.sourceName,
    notes: shelf.notes,
    uploadedAt: new Date(),
  };

  const existingFiles = card.files || [];
  const duplicate = existingFiles.some((item: IStudyCardFile) =>
    normalizeKey(item.name) === normalizeKey(file.name) ||
    (String(item.url || '').trim().toLowerCase() === file.url.toLowerCase() && normalizeKey(item.subject || '') === normalizeKey(subject))
  );

  if (duplicate) {
    stats.filesExisting += 1;
    return;
  }

  stats.filesAttached += 1;
  if (!shouldApply) return;

  const target = await StudyCard.findById(card._id);
  if (!target) return;
  const stillDuplicate = (target.files || []).some((item: IStudyCardFile) =>
    normalizeKey(item.name) === normalizeKey(file.name) ||
    (String(item.url || '').trim().toLowerCase() === file.url.toLowerCase() && normalizeKey(item.subject || '') === normalizeKey(subject))
  );
  if (stillDuplicate) {
    stats.filesExisting += 1;
    stats.filesAttached -= 1;
    return;
  }
  target.files.push(file);
  await target.save();
};

const isGeneratedNcertPortalFile = (file: IStudyCardFile) => {
  const url = String(file.url || '').trim().toLowerCase();
  const name = normalizeKey(file.name || '');
  const notes = normalizeKey(file.notes || '');

  return (
    url === officialUrls.ncertTextbooks.toLowerCase() &&
    normalizeKey(file.sourceName || '') === 'ncert' &&
    normalizeKey(file.resourceType || '') === 'book' &&
    name.includes('ncert books') &&
    /\bclass\s+\d{1,2}\b/.test(name) &&
    notes.includes('official ncert textbook portal')
  );
};

const cleanupGeneratedNcertPortalFiles = async (workspaceId: Types.ObjectId) => {
  const cards = await StudyCard.find({ workspaceId, 'files.url': officialUrls.ncertTextbooks });

  for (const card of cards) {
    const files = (card.files || []) as IStudyCardFile[];
    const remainingFiles = files.filter((file) => !isGeneratedNcertPortalFile(file));
    const removedCount = files.length - remainingFiles.length;

    if (!removedCount) continue;

    stats.ncertPortalFilesRemoved += removedCount;
    if (!shouldApply) continue;

    card.set('files', remainingFiles);
    await card.save();
  }
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');

  console.log(`${shouldApply ? 'Applying' : 'Dry run'} CBSE production enrichment.`);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });

  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
  if (!workspace) throw new Error('Study Hub workspace not found.');

  const workspaceId = workspace._id as Types.ObjectId;
  await cleanupGeneratedNcertPortalFiles(workspaceId);

  const schoolRoot = await ensureCard(workspaceId, null, {
    name: 'School Boards',
    slug: 'school-boards',
    iconKey: 'school-board',
    tone: 'emerald',
    goalType: 'exam_category',
    order: 30,
  });

  const cbseRoot = await ensureCard(workspaceId, schoolRoot._id, {
    name: 'CBSE',
    slug: 'cbse',
    iconKey: 'cbse',
    tone: 'emerald',
    goalType: 'board',
    order: 10,
  });

  for (const shelf of shelfSpecs) {
    const shelfCard = await ensureCard(workspaceId, cbseRoot._id, {
      name: shelf.name,
      slug: shelf.slug,
      iconKey: shelf.iconKey,
      tone: shelf.tone,
      goalType: 'resource_folder',
      order: shelf.order,
    });

    for (let classNumber = 1; classNumber <= 12; classNumber += 1) {
      const classCard = await ensureCard(workspaceId, shelfCard._id, {
        name: className(classNumber),
        slug: slugify(className(classNumber)),
        iconKey: `class-${classNumber}`,
        tone: classNumber >= 9 ? 'blue' : 'emerald',
        goalType: 'class',
        order: classNumber * 10,
      });

      const subjects = subjectsForClass(classNumber);
      for (const [subjectIndex, subject] of subjects.entries()) {
        const subjectCard = await ensureCard(workspaceId, classCard._id, {
          name: subject,
          slug: slugify(subject),
          iconKey: subjectIcon(subject),
          tone: subjectTone(subject),
          goalType: 'subject',
          order: 100 + subjectIndex * 10,
        });
        if (shelf.slug !== 'ncert-books') {
          await attachOfficialFile(subjectCard, shelf, classNumber, subject);
        }
      }
    }
  }

  console.log(
    `CBSE production enrichment complete. Cards created: ${stats.cardsCreated}. Cards updated/verified: ${stats.cardsUpdated}. Files attached: ${stats.filesAttached}. Existing files: ${stats.filesExisting}. NCERT portal files removed: ${stats.ncertPortalFilesRemoved}.`
  );
};

run()
  .catch((error) => {
    console.error('CBSE production enrichment failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
