import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import mongoose, { Types } from 'mongoose';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import StudyCard, { type StudyCardGoalType, type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const ROOT_WORKSPACE_SLUG = 'study-hub';
const MONGO_URI = process.env.MONGO_URI;
const SCRIPT_DIR = path.resolve(__dirname);
const STATIC_URL_ROOT = '/static/exam-premium-packs';
const STATIC_FILE_ROOT = path.resolve(SCRIPT_DIR, '../../public/exam-premium-packs');
const shouldApply = process.argv.includes('--apply');
const verifyOnly = process.argv.includes('--verify');

type PremiumPack = {
  id: string;
  title: string;
  targetPath: string[];
  exam: 'CBSE' | 'UPSC CSE' | 'GATE';
  stage: string;
  subject: string;
  topic: string;
  resourceType: 'notes' | 'practice' | 'strategy' | 'material';
  bullets: string[];
};

const stats = {
  packsPrepared: 0,
  pdfsWritten: 0,
  cardsCreated: 0,
  cardsRestored: 0,
  cardsUpdated: 0,
  filesAttached: 0,
  filesExisting: 0,
  duplicateFoldersMerged: 0,
  duplicateFilesRemoved: 0,
};

const normalizeKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const slugify = (value = '', fallback = 'item') => {
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

const activeFilter = (workspaceId: Types.ObjectId) => ({
  workspaceId,
  status: { $ne: 'archived' },
});

const styleForName = (name: string, depth: number, order: number): {
  iconKey: string;
  tone: StudyCardTone;
  goalType: StudyCardGoalType;
  order: number;
} => {
  const key = normalizeKey(name);
  if (depth === 0) return { iconKey: key.includes('school') ? 'school-board' : 'exam', tone: key.includes('school') ? 'emerald' : 'blue', goalType: 'exam_category', order };
  if (key === 'cbse') return { iconKey: 'cbse', tone: 'emerald', goalType: 'board', order };
  if (key === 'upsc cse') return { iconKey: 'upsc-cse', tone: 'blue', goalType: 'exam', order };
  if (key === 'gate') return { iconKey: 'gate', tone: 'cyan', goalType: 'exam_family', order };
  if (/^class\s+\d{1,2}$/.test(key)) return { iconKey: 'class', tone: 'emerald', goalType: 'class', order };
  if (key.includes('syllabus')) return { iconKey: 'syllabus', tone: 'amber', goalType: 'resource_folder', order };
  if (key.includes('ncert') || key.includes('book')) return { iconKey: 'book', tone: 'emerald', goalType: 'resource_folder', order };
  if (key.includes('previous') || key.includes('paper') || key.includes('pyq') || key.includes('prelims') || key.includes('mains')) return { iconKey: 'pyq', tone: 'violet', goalType: 'resource_folder', order };
  if (key.includes('answer')) return { iconKey: 'answer-key', tone: 'slate', goalType: 'resource_folder', order };
  if (key.includes('strategy') || key.includes('planner')) return { iconKey: 'target', tone: 'amber', goalType: 'resource_folder', order };
  if (key.includes('practice') || key.includes('question')) return { iconKey: 'practice', tone: 'rose', goalType: 'resource_folder', order };
  if (key.includes('revision') || key.includes('material') || key.includes('current affairs')) return { iconKey: 'material', tone: 'blue', goalType: 'resource_folder', order };
  return { iconKey: 'subject', tone: 'slate', goalType: depth >= 3 ? 'subject' : 'resource_folder', order };
};

const orderForPart = (parts: string[], index: number) => {
  const name = normalizeKey(parts[index]);
  const classMatch = name.match(/^class\s+(\d{1,2})$/);
  if (classMatch) return 100 + Number(classMatch[1]) * 10;
  const shelfOrder = new Map<string, number>([
    ['overview', 5],
    ['syllabus', 10],
    ['ncert books', 20],
    ['study material', 30],
    ['revision notes', 40],
    ['practice questions', 50],
    ['previous year papers', 60],
    ['sample papers', 70],
    ['answer keys', 80],
    ['strategy', 90],
    ['prelims', 10],
    ['mains', 20],
    ['current affairs', 30],
  ]);
  return shelfOrder.get(name) || (index + 1) * 100;
};

const getWorkspace = async () =>
  Workspace.findOneAndUpdate(
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
        description: 'Root card workspace for premium official and Study Hub generated study material.',
        template: { phases: [], facets: [], resourceTypes: [] },
      },
    },
    { new: true, upsert: shouldApply, runValidators: true },
  );

const ensureCard = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  name: string,
  depth: number,
  order: number,
) => {
  const slug = slugify(name);
  let card = await StudyCard.findOne({ workspaceId, parentId, slug });
  const style = styleForName(name, depth, order);

  if (!card) {
    stats.cardsCreated += 1;
    card = new StudyCard({
      workspaceId,
      parentId,
      name,
      slug,
      ...style,
      status: 'published',
      visibility: 'public',
      files: [],
    });
    if (shouldApply) await card.save();
    return card;
  }

  let changed = false;
  if (card.status === 'archived') {
    card.status = 'published';
    card.visibility = 'public';
    stats.cardsRestored += 1;
    changed = true;
  }

  for (const [key, value] of Object.entries({ name, slug, ...style, visibility: 'public' })) {
    if ((card as any)[key] !== value) {
      (card as any)[key] = value;
      changed = true;
    }
  }

  if (changed) {
    stats.cardsUpdated += 1;
    if (shouldApply) await card.save();
  }
  return card;
};

const ensurePath = async (workspaceId: Types.ObjectId, parts: string[]) => {
  let parentId: Types.ObjectId | null = null;
  let current: any = null;
  for (const [index, part] of parts.entries()) {
    current = await ensureCard(workspaceId, parentId, part, index, orderForPart(parts, index));
    parentId = current._id as Types.ObjectId;
  }
  return current;
};

const findPath = async (workspaceId: Types.ObjectId, parts: string[]) => {
  let parentId: Types.ObjectId | null = null;
  let current: any = null;
  for (const part of parts) {
    current = await StudyCard.findOne({
      ...activeFilter(workspaceId),
      parentId,
      slug: slugify(part),
    });
    if (!current) return null;
    parentId = current._id as Types.ObjectId;
  }
  return current;
};

const wrapLine = (text: string, maxChars: number) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const writePremiumPdf = async (filePath: string, pack: PremiumPack) => {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const width = 595;
  const height = 842;
  const margin = 44;
  let page = pdfDoc.addPage([width, height]);
  let y = height - 54;

  const addPage = () => {
    page = pdfDoc.addPage([width, height]);
    y = height - 52;
  };

  const drawWrapped = (text: string, size = 10.3, font = regular, color = rgb(0.15, 0.19, 0.27), indent = 0) => {
    const maxChars = Math.max(38, Math.floor((width - margin * 2 - indent) / (size * 0.49)));
    for (const line of wrapLine(text, maxChars)) {
      if (y < 62) addPage();
      page.drawText(line, { x: margin + indent, y, size, font, color });
      y -= size + 4;
    }
  };

  page.drawRectangle({ x: 0, y: height - 104, width, height: 104, color: rgb(0.03, 0.07, 0.12) });
  page.drawText(pack.title.slice(0, 74), { x: margin, y: height - 46, size: 16.5, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`${pack.exam} / ${pack.stage} / ${pack.subject}`.slice(0, 98), {
    x: margin,
    y: height - 72,
    size: 10,
    font: regular,
    color: rgb(0.73, 0.92, 1),
  });
  y = height - 126;

  const content = [
    '## Premium Snapshot',
    `Exam: ${pack.exam}`,
    `Subject: ${pack.subject}`,
    `Topic: ${pack.topic}`,
    'Use this sheet after opening the official syllabus or NCERT/book folder. It is designed for revision, PYQ decoding, and fast practice.',
    '## How To Study',
    '- Read the official syllabus or NCERT chapter first.',
    '- Mark every bullet as Strong, Medium, or Weak.',
    '- Solve PYQ or board-style questions after this sheet.',
    '- Keep one error log and revise it before every mock.',
    '## Premium Content',
    ...pack.bullets,
    '## 7-Day Drill',
    '- Day 1: Syllabus map and one-page notes.',
    '- Day 2: Core examples and formulas.',
    '- Day 3: PYQ or board-style mixed questions.',
    '- Day 4: Weak-area repair.',
    '- Day 5: Timed mini test.',
    '- Day 6: Error-log revision.',
    '- Day 7: Final flashcard sprint.',
    '## Quality Check',
    '- Correct folder: this sheet is placed under the matching exam, class, shelf, and subject.',
    '- Source discipline: official PDFs and NCERT books remain separate from Study Hub premium notes.',
    '- Revision output: one table, one practice set, and one error log should come out of this sheet.',
  ];

  for (const item of content) {
    const isHeading = item.startsWith('## ');
    const isBullet = item.startsWith('- ');
    if (isHeading) {
      y -= 4;
      drawWrapped(item.replace(/^##\s+/, ''), 13, bold, rgb(0.02, 0.08, 0.16));
      y -= 2;
    } else if (isBullet) {
      drawWrapped(item, 10.1, regular, rgb(0.15, 0.19, 0.27), 10);
    } else {
      drawWrapped(item, 10.2);
    }
  }

  pdfDoc.getPages().forEach((pdfPage, index) => {
    pdfPage.drawLine({
      start: { x: margin, y: 38 },
      end: { x: width - margin, y: 38 },
      thickness: 0.6,
      color: rgb(0.82, 0.87, 0.93),
    });
    pdfPage.drawText('Study Hub Premium Exam Pack', { x: margin, y: 22, size: 8.5, font: bold, color: rgb(0.02, 0.44, 0.58) });
    pdfPage.drawText(`Page ${index + 1} of ${pdfDoc.getPageCount()}`, {
      x: width - margin - 72,
      y: 22,
      size: 8.5,
      font: regular,
      color: rgb(0.36, 0.42, 0.5),
    });
  });

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const bytes = await pdfDoc.save();
  await fs.writeFile(filePath, bytes);
  stats.pdfsWritten += 1;
  return bytes.length;
};

const packUrl = (pack: PremiumPack) => `${STATIC_URL_ROOT}/${slugify(pack.exam)}/${slugify(pack.id)}.pdf`;
const packFilePath = (pack: PremiumPack) => path.join(STATIC_FILE_ROOT, slugify(pack.exam), `${slugify(pack.id)}.pdf`);

const filePayload = (pack: PremiumPack, sizeBytes?: number) => ({
  name: pack.title,
  url: packUrl(pack),
  sizeBytes,
  mimeType: 'application/pdf',
  resourceType: pack.resourceType,
  status: 'published',
  visibility: 'public',
  year: 2026,
  stage: pack.stage,
  paper: pack.stage,
  subject: pack.subject,
  topic: pack.topic,
  language: 'hinglish',
  sourceType: 'platform',
  sourceName: 'Study Hub Premium',
  notes: 'Generated Study Hub premium pack. Official PDFs and NCERT books remain the source of truth.',
  uploadedAt: new Date(),
});

const attachPack = async (workspaceId: Types.ObjectId, pack: PremiumPack) => {
  const card = await ensurePath(workspaceId, pack.targetPath);
  const url = packUrl(pack);
  const existing = (card.files || []).find((file: any) => String(file.url || '') === url);
  const sizeBytes = shouldApply ? await writePremiumPdf(packFilePath(pack), pack) : undefined;
  const payload = filePayload(pack, sizeBytes);

  if (existing) {
    let changed = false;
    for (const key of ['name', 'sizeBytes', 'mimeType', 'resourceType', 'stage', 'paper', 'subject', 'topic', 'language', 'sourceType', 'sourceName', 'notes']) {
      if ((payload as any)[key] !== undefined && existing[key] !== (payload as any)[key]) {
        existing[key] = (payload as any)[key];
        changed = true;
      }
    }
    stats.filesExisting += 1;
    if (changed && shouldApply) await card.save();
    return;
  }

  stats.filesAttached += 1;
  card.files = [...(card.files || []), payload];
  if (shouldApply) await card.save();
};

const mergeDuplicateChildrenByName = async (workspaceId: Types.ObjectId, parentPath: string[]) => {
  const parent = await findPath(workspaceId, parentPath);
  if (!parent) return;
  const children = await StudyCard.find({
    ...activeFilter(workspaceId),
    parentId: parent._id,
  }).sort({ order: 1, createdAt: 1 });

  const groups = new Map<string, any[]>();
  for (const child of children) {
    const key = normalizeKey(child.name);
    groups.set(key, [...(groups.get(key) || []), child]);
  }

  for (const siblings of groups.values()) {
    if (siblings.length < 2) continue;
    const target = siblings.find((item) => item.slug === slugify(item.name)) || siblings[0];
    for (const source of siblings) {
      if (String(source._id) === String(target._id)) continue;
      const existingUrls = new Set((target.files || []).map((file: any) => String(file.url || '').toLowerCase()));
      for (const file of source.files || []) {
        const url = String(file.url || '').toLowerCase();
        if (url && existingUrls.has(url)) {
          stats.duplicateFilesRemoved += 1;
          continue;
        }
        target.files.push(file.toObject ? file.toObject() : file);
        if (url) existingUrls.add(url);
      }

      const grandchildren = await StudyCard.find({ ...activeFilter(workspaceId), parentId: source._id });
      for (const child of grandchildren) {
        child.parentId = target._id;
        if (shouldApply) await child.save();
      }

      source.files = [];
      source.status = 'archived';
      source.visibility = 'private';
      stats.duplicateFoldersMerged += 1;
      if (shouldApply) {
        await source.save();
      }
    }
    if (shouldApply) await target.save();
  }
};

const summarizeRoot = async (workspaceId: Types.ObjectId, parts: string[]) => {
  const root = await findPath(workspaceId, parts);
  if (!root) return null;
  const allCards = await StudyCard.find({ ...activeFilter(workspaceId) }).select('_id parentId name files').lean();
  const byParent = new Map<string, any[]>();
  for (const card of allCards) {
    const key = String(card.parentId || 'root');
    byParent.set(key, [...(byParent.get(key) || []), card]);
  }
  let folders = 0;
  let files = 0;
  let emptyLeaves = 0;
  const queue = [root as any];
  const seen = new Set<string>();
  while (queue.length) {
    const current = queue.shift();
    if (!current || seen.has(String(current._id))) continue;
    seen.add(String(current._id));
    folders += 1;
    const activeFiles = (current.files || []).filter((file: any) => (file.status || 'published') !== 'archived');
    files += activeFiles.length;
    const children = byParent.get(String(current._id)) || [];
    if (!children.length && !activeFiles.length) emptyLeaves += 1;
    queue.push(...children);
  }
  return { folders, files, emptyLeaves };
};

const packs: PremiumPack[] = [
  {
    id: 'cbse-10-science-life-processes-premium',
    title: 'CBSE Class 10 Science: Life Processes Premium Sheet',
    targetPath: ['School Boards', 'CBSE', 'Class 10', 'Study Material', 'Science'],
    exam: 'CBSE',
    stage: 'Class 10',
    subject: 'Science',
    topic: 'Life Processes',
    resourceType: 'notes',
    bullets: [
      '- Map nutrition, respiration, transportation, and excretion in one flow chart.',
      '- Board signal: diagrams, definitions, and process sequence are high-scoring.',
      '- Practice: write one 5-mark answer using diagram plus three labelled steps.',
    ],
  },
  {
    id: 'cbse-10-science-electricity-premium',
    title: 'CBSE Class 10 Science: Electricity Formula Sprint',
    targetPath: ['School Boards', 'CBSE', 'Class 10', 'Study Material', 'Science'],
    exam: 'CBSE',
    stage: 'Class 10',
    subject: 'Science',
    topic: 'Electricity',
    resourceType: 'notes',
    bullets: [
      '- Master V = IR, P = VI, H = I^2Rt, series, and parallel resistance.',
      '- Board signal: numerical questions test units, substitution, and final statement.',
      '- Practice: solve five mixed numericals and write units in every step.',
    ],
  },
  {
    id: 'cbse-10-maths-algebra-premium',
    title: 'CBSE Class 10 Mathematics: Algebra Premium Drill',
    targetPath: ['School Boards', 'CBSE', 'Class 10', 'Study Material', 'Mathematics'],
    exam: 'CBSE',
    stage: 'Class 10',
    subject: 'Mathematics',
    topic: 'Quadratic Equations and AP',
    resourceType: 'practice',
    bullets: [
      '- Keep factorisation, formula method, discriminant, nth term, and sum formula in one sheet.',
      '- Board signal: easy marks come from correct formula selection and clean substitution.',
      '- Practice: 10 questions split as 4 quadratic, 4 AP, 2 mixed word problems.',
    ],
  },
  {
    id: 'cbse-10-social-science-premium-map',
    title: 'CBSE Class 10 Social Science: Board Map Pack',
    targetPath: ['School Boards', 'CBSE', 'Class 10', 'Revision Notes', 'Social Science'],
    exam: 'CBSE',
    stage: 'Class 10',
    subject: 'Social Science',
    topic: 'History Civics Geography Economics',
    resourceType: 'notes',
    bullets: [
      '- History: timeline, causes, consequences, and key personalities.',
      '- Geography: map items, resources, agriculture, minerals, and industries.',
      '- Civics and Economics: definitions, examples, and diagram-ready flow points.',
    ],
  },
  {
    id: 'cbse-10-board-90-day-strategy',
    title: 'CBSE Class 10: 90-Day Board Strategy',
    targetPath: ['School Boards', 'CBSE', 'Class 10', 'Strategy'],
    exam: 'CBSE',
    stage: 'Class 10',
    subject: 'All Subjects',
    topic: 'Board Strategy',
    resourceType: 'strategy',
    bullets: [
      '- Days 1-30: NCERT reading, examples, and chapter-wise questions.',
      '- Days 31-60: sample papers, weak chapter repair, and formula sheets.',
      '- Days 61-90: timed papers, error logs, and last-week revision sheets.',
    ],
  },
  {
    id: 'cbse-11-maths-functions-trigonometry',
    title: 'CBSE Class 11 Mathematics: Functions and Trigonometry',
    targetPath: ['School Boards', 'CBSE', 'Class 11', 'Study Material', 'Mathematics'],
    exam: 'CBSE',
    stage: 'Class 11',
    subject: 'Mathematics',
    topic: 'Functions and Trigonometry',
    resourceType: 'notes',
    bullets: [
      '- Start with domain, range, composition, inverse, identities, and graph behaviour.',
      '- Premium output: one formula sheet and one graph-cue sheet.',
      '- Practice: solve concept questions before long mixed exercise questions.',
    ],
  },
  {
    id: 'cbse-11-physics-kinematics-laws',
    title: 'CBSE Class 11 Physics: Kinematics and Laws Premium Sheet',
    targetPath: ['School Boards', 'CBSE', 'Class 11', 'Study Material', 'Physics'],
    exam: 'CBSE',
    stage: 'Class 11',
    subject: 'Physics',
    topic: 'Kinematics and Laws of Motion',
    resourceType: 'notes',
    bullets: [
      '- Build vectors, motion graphs, equations of motion, friction, and free body diagrams.',
      '- Board/JEE bridge: diagram clarity decides most mechanics questions.',
      '- Practice: draw FBD before solving every numerical.',
    ],
  },
  {
    id: 'cbse-11-chemistry-mole-bonding',
    title: 'CBSE Class 11 Chemistry: Mole Concept and Bonding',
    targetPath: ['School Boards', 'CBSE', 'Class 11', 'Study Material', 'Chemistry'],
    exam: 'CBSE',
    stage: 'Class 11',
    subject: 'Chemistry',
    topic: 'Mole Concept and Chemical Bonding',
    resourceType: 'notes',
    bullets: [
      '- Mole concept: molar mass, limiting reagent, concentration, and stoichiometry.',
      '- Bonding: VSEPR, hybridisation, shapes, polarity, and exceptions.',
      '- Practice: mix one numerical set with one structure/shape set.',
    ],
  },
  {
    id: 'cbse-11-biology-cell-biomolecules',
    title: 'CBSE Class 11 Biology: Cell and Biomolecules',
    targetPath: ['School Boards', 'CBSE', 'Class 11', 'Study Material', 'Biology'],
    exam: 'CBSE',
    stage: 'Class 11',
    subject: 'Biology',
    topic: 'Cell and Biomolecules',
    resourceType: 'notes',
    bullets: [
      '- Link cell organelles with functions, diagrams, and example questions.',
      '- Biomolecules: carbohydrates, proteins, lipids, enzymes, and nucleic acids.',
      '- Practice: make diagram labels and one comparison table per subtopic.',
    ],
  },
  {
    id: 'cbse-11-accountancy-foundation',
    title: 'CBSE Class 11 Accountancy: Foundation Ledger Pack',
    targetPath: ['School Boards', 'CBSE', 'Class 11', 'Study Material', 'Accountancy'],
    exam: 'CBSE',
    stage: 'Class 11',
    subject: 'Accountancy',
    topic: 'Journal Ledger Trial Balance',
    resourceType: 'practice',
    bullets: [
      '- Sequence: source document -> journal -> ledger -> trial balance -> final accounts.',
      '- Common trap: debit/credit rule confusion and narration skipping.',
      '- Practice: create one full transaction chain from journal to trial balance.',
    ],
  },
  {
    id: 'cbse-11-foundation-strategy',
    title: 'CBSE Class 11: Foundation Strategy for Class 12 and Exams',
    targetPath: ['School Boards', 'CBSE', 'Class 11', 'Strategy'],
    exam: 'CBSE',
    stage: 'Class 11',
    subject: 'All Subjects',
    topic: 'Foundation Strategy',
    resourceType: 'strategy',
    bullets: [
      '- Treat Class 11 as concept-building year, not just school completion.',
      '- Keep NCERT examples, formula sheets, and weekly mixed practice.',
      '- Every Sunday: revise one weak chapter and one strong chapter.',
    ],
  },
  {
    id: 'cbse-12-physics-electrostatics-current',
    title: 'CBSE Class 12 Physics: Electrostatics and Current Electricity',
    targetPath: ['School Boards', 'CBSE', 'Class 12', 'Study Material', 'Physics'],
    exam: 'CBSE',
    stage: 'Class 12',
    subject: 'Physics',
    topic: 'Electrostatics and Current Electricity',
    resourceType: 'notes',
    bullets: [
      '- Formula map: field, potential, capacitance, Ohm law, Kirchhoff, and meter bridge.',
      '- Board signal: derivations plus numerical accuracy.',
      '- Practice: one derivation, one graph, and five numericals per sitting.',
    ],
  },
  {
    id: 'cbse-12-chemistry-electrochem-organic',
    title: 'CBSE Class 12 Chemistry: Electrochemistry and Organic Revision',
    targetPath: ['School Boards', 'CBSE', 'Class 12', 'Study Material', 'Chemistry'],
    exam: 'CBSE',
    stage: 'Class 12',
    subject: 'Chemistry',
    topic: 'Electrochemistry and Organic Chemistry',
    resourceType: 'notes',
    bullets: [
      '- Electrochemistry: Nernst equation, conductivity, cell potential, and numericals.',
      '- Organic: named reactions, reagents, conversions, and mechanism cues.',
      '- Practice: maintain one reagent table and one formula table.',
    ],
  },
  {
    id: 'cbse-12-maths-calculus-vector',
    title: 'CBSE Class 12 Mathematics: Calculus and Vector 3D Pack',
    targetPath: ['School Boards', 'CBSE', 'Class 12', 'Study Material', 'Mathematics'],
    exam: 'CBSE',
    stage: 'Class 12',
    subject: 'Mathematics',
    topic: 'Calculus Vector 3D',
    resourceType: 'practice',
    bullets: [
      '- Calculus: continuity, differentiability, AOD, integration, differential equations.',
      '- Vector 3D: direction ratios, lines, planes, and shortest distance.',
      '- Practice: split daily set into 60 percent calculus and 40 percent vector/3D.',
    ],
  },
  {
    id: 'cbse-12-biology-genetics-ecology',
    title: 'CBSE Class 12 Biology: Genetics Biotechnology Ecology',
    targetPath: ['School Boards', 'CBSE', 'Class 12', 'Study Material', 'Biology'],
    exam: 'CBSE',
    stage: 'Class 12',
    subject: 'Biology',
    topic: 'Genetics Biotechnology Ecology',
    resourceType: 'notes',
    bullets: [
      '- Genetics: crosses, pedigree, molecular basis, and mutation vocabulary.',
      '- Biotechnology: process flow diagrams and applications.',
      '- Ecology: definitions, pyramids, cycles, biodiversity, and conservation examples.',
    ],
  },
  {
    id: 'cbse-12-board-60-day-strategy',
    title: 'CBSE Class 12: 60-Day Board Premium Strategy',
    targetPath: ['School Boards', 'CBSE', 'Class 12', 'Strategy'],
    exam: 'CBSE',
    stage: 'Class 12',
    subject: 'All Subjects',
    topic: 'Board Strategy',
    resourceType: 'strategy',
    bullets: [
      '- Days 1-20: NCERT examples and derivations.',
      '- Days 21-40: sample papers and weak-topic repair.',
      '- Days 41-60: timed board papers, presentation practice, and final formula sheets.',
    ],
  },
  {
    id: 'upsc-prelims-gs-priority-map',
    title: 'UPSC Prelims GS Paper I: Premium Priority Map',
    targetPath: ['Competitive Exams', 'UPSC CSE', 'Prelims', 'GS Paper I'],
    exam: 'UPSC CSE',
    stage: 'Prelims',
    subject: 'General Studies',
    topic: 'Priority Map',
    resourceType: 'strategy',
    bullets: [
      '- Rank topics by PYQ frequency: polity, environment, economy, modern history, geography, science-tech.',
      '- Use official previous papers to mark recurring traps.',
      '- Revise static topics with current affairs only after base NCERT/Laxmikanth-style clarity.',
    ],
  },
  {
    id: 'upsc-prelims-polity-constitution',
    title: 'UPSC Prelims: Polity Constitution Trap Sheet',
    targetPath: ['Competitive Exams', 'UPSC CSE', 'Prelims', 'GS Paper I'],
    exam: 'UPSC CSE',
    stage: 'Prelims',
    subject: 'Polity',
    topic: 'Constitution and Institutions',
    resourceType: 'notes',
    bullets: [
      '- Focus on articles, bodies, constitutional vs statutory status, and appointment/removal.',
      '- Trap scanner: only, all, mandatory, discretionary, and exception words.',
      '- Practice: 25 statement questions with exact-word elimination.',
    ],
  },
  {
    id: 'upsc-prelims-economy-environment',
    title: 'UPSC Prelims: Economy and Environment Decoder',
    targetPath: ['Competitive Exams', 'UPSC CSE', 'Prelims', 'GS Paper I'],
    exam: 'UPSC CSE',
    stage: 'Prelims',
    subject: 'Economy and Environment',
    topic: 'PYQ Decoder',
    resourceType: 'notes',
    bullets: [
      '- Economy: inflation, banking, fiscal policy, external sector, and schemes.',
      '- Environment: conventions, protected areas, species, pollution, and climate terms.',
      '- Practice: connect every current issue to one static concept.',
    ],
  },
  {
    id: 'upsc-csat-premium-drill',
    title: 'UPSC CSAT: Quant Reasoning Comprehension Drill',
    targetPath: ['Competitive Exams', 'UPSC CSE', 'Prelims', 'CSAT Paper II'],
    exam: 'UPSC CSE',
    stage: 'Prelims',
    subject: 'CSAT',
    topic: 'Quant Reasoning Comprehension',
    resourceType: 'practice',
    bullets: [
      '- Quant: percentage, ratio, averages, time-work, speed, and basic algebra.',
      '- Reasoning: arrangements, syllogism, assumptions, and data interpretation.',
      '- Comprehension: solve with option elimination and avoid opinion-based answers.',
    ],
  },
  {
    id: 'upsc-mains-essay-framework',
    title: 'UPSC Mains Essay: Premium Framework Pack',
    targetPath: ['Competitive Exams', 'UPSC CSE', 'Mains', 'Essay'],
    exam: 'UPSC CSE',
    stage: 'Mains',
    subject: 'Essay',
    topic: 'Essay Framework',
    resourceType: 'strategy',
    bullets: [
      '- Build intro, dimension map, examples, counter-view, and conclusion before writing.',
      '- Keep 20 reusable examples from society, governance, economy, ethics, and science.',
      '- Practice: one outline every alternate day and one full essay every week.',
    ],
  },
  {
    id: 'upsc-mains-gs1-society-geography',
    title: 'UPSC Mains GS I: Society Geography History Answer Pack',
    targetPath: ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper I'],
    exam: 'UPSC CSE',
    stage: 'Mains',
    subject: 'GS Paper I',
    topic: 'Society Geography History',
    resourceType: 'notes',
    bullets: [
      '- History answers need chronology, cause-effect, and historiography-lite balance.',
      '- Society answers need examples, data cues, constitutional values, and way forward.',
      '- Geography answers need diagrams, map cues, processes, and Indian examples.',
    ],
  },
  {
    id: 'upsc-mains-gs2-governance-ir',
    title: 'UPSC Mains GS II: Polity Governance IR Pack',
    targetPath: ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper II'],
    exam: 'UPSC CSE',
    stage: 'Mains',
    subject: 'GS Paper II',
    topic: 'Polity Governance IR',
    resourceType: 'notes',
    bullets: [
      '- Polity: article, institution, judgement, issue, reform.',
      '- Governance: scheme, implementation gap, accountability, citizen-centric solution.',
      '- IR: background, current issue, India interest, challenge, way forward.',
    ],
  },
  {
    id: 'upsc-mains-gs3-economy-security',
    title: 'UPSC Mains GS III: Economy Environment Security Pack',
    targetPath: ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper III'],
    exam: 'UPSC CSE',
    stage: 'Mains',
    subject: 'GS Paper III',
    topic: 'Economy Environment Security',
    resourceType: 'notes',
    bullets: [
      '- Economy: define issue, data cue, policy angle, challenge, reform.',
      '- Environment: conservation, climate, pollution, disaster risk, and local examples.',
      '- Security: threat, vulnerability, institutional response, tech angle, way forward.',
    ],
  },
  {
    id: 'upsc-mains-gs4-ethics-case-study',
    title: 'UPSC Mains GS IV: Ethics Case Study Toolkit',
    targetPath: ['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper IV Ethics'],
    exam: 'UPSC CSE',
    stage: 'Mains',
    subject: 'GS Paper IV Ethics',
    topic: 'Ethics Case Studies',
    resourceType: 'practice',
    bullets: [
      '- Case study sequence: stakeholders, values, conflict, options, evaluation, final action.',
      '- Use simple ethical terms: integrity, empathy, accountability, fairness, public interest.',
      '- Practice: write one case solution in 250 words with a balanced action plan.',
    ],
  },
  {
    id: 'upsc-current-affairs-monthly-decoder',
    title: 'UPSC Current Affairs: Monthly GS Decoder',
    targetPath: ['Competitive Exams', 'UPSC CSE', 'Current Affairs', 'Monthly Decoder'],
    exam: 'UPSC CSE',
    stage: 'Current Affairs',
    subject: 'Current Affairs',
    topic: 'Monthly Decoder',
    resourceType: 'material',
    bullets: [
      '- Bucket every issue into polity, economy, environment, science-tech, IR, security, or society.',
      '- Attach one static syllabus point and one possible Prelims/Mains angle.',
      '- Avoid random news hoarding; revise only exam-linked issues.',
    ],
  },
  {
    id: 'gate-common-ga-quant-verbal',
    title: 'GATE General Aptitude: Quant and Verbal Premium Pack',
    targetPath: ['Entrance Exams', 'GATE', 'General Aptitude and Common Resources', 'Study Material', 'General Aptitude'],
    exam: 'GATE',
    stage: 'General Aptitude',
    subject: 'General Aptitude',
    topic: 'Quant and Verbal',
    resourceType: 'practice',
    bullets: [
      '- Quant: ratios, percentages, time-work, probability, averages, and DI.',
      '- Verbal: grammar, sentence completion, inference, and short RC.',
      '- Practice GA weekly; small marks compound into rank improvement.',
    ],
  },
  {
    id: 'gate-cse-pyq-decoder',
    title: 'GATE CSE: PYQ Pattern Decoder',
    targetPath: ['Entrance Exams', 'GATE', 'GATE CSE', 'Previous Year Papers', 'PYQ Decoder'],
    exam: 'GATE',
    stage: 'GATE CSE',
    subject: 'Computer Science',
    topic: 'PYQ Decoder',
    resourceType: 'strategy',
    bullets: [
      '- Decode repeated patterns: algorithms, OS scheduling, DBMS queries, networks, TOC, COA.',
      '- For every PYQ, write concept, trick, formula, and mistake note.',
      '- Re-solve wrong PYQs after 7 days without looking at solution.',
    ],
  },
  {
    id: 'gate-da-ml-linear-algebra',
    title: 'GATE DA: Machine Learning and Linear Algebra Sprint',
    targetPath: ['Entrance Exams', 'GATE', 'GATE DA', 'Study Material', 'Machine Learning'],
    exam: 'GATE',
    stage: 'GATE DA',
    subject: 'Data Science and AI',
    topic: 'Machine Learning and Linear Algebra',
    resourceType: 'notes',
    bullets: [
      '- Linear algebra: vectors, matrices, rank, eigenvalues, projection, and SVD intuition.',
      '- ML: loss, bias-variance, regularisation, classification, clustering, and evaluation metrics.',
      '- Practice: one math derivation and one algorithm comparison per session.',
    ],
  },
  {
    id: 'gate-ece-signals-circuits-formula',
    title: 'GATE ECE: Signals Circuits Formula Pack',
    targetPath: ['Entrance Exams', 'GATE', 'GATE ECE', 'Study Material', 'Signals and Systems'],
    exam: 'GATE',
    stage: 'GATE ECE',
    subject: 'Electronics and Communication',
    topic: 'Signals and Circuits',
    resourceType: 'notes',
    bullets: [
      '- Signals: convolution, Fourier, Laplace, Z-transform, sampling, and system properties.',
      '- Circuits: network theorems, transient response, resonance, and two-port networks.',
      '- Practice: formula recall plus mixed conceptual numericals.',
    ],
  },
  {
    id: 'gate-me-thermo-fluid-sprint',
    title: 'GATE Mechanical: Thermodynamics and Fluid Sprint',
    targetPath: ['Entrance Exams', 'GATE', 'GATE Mechanical', 'Study Material', 'Thermodynamics'],
    exam: 'GATE',
    stage: 'GATE Mechanical',
    subject: 'Mechanical Engineering',
    topic: 'Thermodynamics and Fluid Mechanics',
    resourceType: 'notes',
    bullets: [
      '- Thermodynamics: laws, cycles, properties, entropy, availability, and psychrometry.',
      '- Fluids: Bernoulli, pipe flow, dimensional analysis, boundary layer, and turbines.',
      '- Practice: formula sheet plus 25 mixed numericals weekly.',
    ],
  },
  {
    id: 'gate-civil-structures-geotech',
    title: 'GATE Civil: Structures and Geotech Premium Pack',
    targetPath: ['Entrance Exams', 'GATE', 'GATE Civil', 'Study Material', 'Structural Engineering'],
    exam: 'GATE',
    stage: 'GATE Civil',
    subject: 'Civil Engineering',
    topic: 'Structures and Geotech',
    resourceType: 'notes',
    bullets: [
      '- Structures: bending, shear, deflection, trusses, RCC basics, and stability.',
      '- Geotech: soil properties, consolidation, shear strength, foundation, and seepage.',
      '- Practice: draw assumptions before equations to avoid wrong formula use.',
    ],
  },
  {
    id: 'gate-12-week-rank-plan',
    title: 'GATE: 12-Week Premium Rank Plan',
    targetPath: ['Entrance Exams', 'GATE', 'General Aptitude and Common Resources', 'Strategy'],
    exam: 'GATE',
    stage: 'All Branches',
    subject: 'All Branches',
    topic: '12 Week Rank Plan',
    resourceType: 'strategy',
    bullets: [
      '- Weeks 1-4: syllabus completion with topic-wise PYQs.',
      '- Weeks 5-8: mixed tests, formula sheets, and weak-area repair.',
      '- Weeks 9-12: full mocks, answer-key analysis, and revision only.',
    ],
  },
];

const verifyPackPlacement = async (workspaceId: Types.ObjectId) => {
  const urls = new Set(packs.map(packUrl));
  const cards = await StudyCard.find({ ...activeFilter(workspaceId), 'files.url': { $in: [...urls] } })
    .select('name files')
    .lean();
  const placed = new Set<string>();
  for (const card of cards) {
    for (const file of card.files || []) {
      if (urls.has(String(file.url || ''))) placed.add(String(file.url || ''));
    }
  }
  const roots = [
    ['Entrance Exams', 'GATE'],
    ['Competitive Exams', 'UPSC CSE'],
    ['School Boards', 'CBSE'],
  ];
  for (const parts of roots) {
    const summary = await summarizeRoot(workspaceId, parts);
    console.log(`${parts.at(-1)}: ${summary ? `${summary.folders} folders, ${summary.files} files, ${summary.emptyLeaves} empty leaves` : 'missing'}`);
  }
  console.log(`Premium exam packs placed: ${placed.size}/${packs.length}.`);
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');
  stats.packsPrepared = packs.length;
  console.log(`${verifyOnly ? 'Verifying' : shouldApply ? 'Applying' : 'Dry run'} premium exam content packs.`);
  console.log(`Prepared premium packs: ${packs.length}.`);

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await getWorkspace();
  if (!workspace?._id) throw new Error('Study Hub workspace not found.');
  const workspaceId = workspace._id as Types.ObjectId;

  if (verifyOnly) {
    await verifyPackPlacement(workspaceId);
    return;
  }

  await mergeDuplicateChildrenByName(workspaceId, ['Competitive Exams', 'UPSC CSE', 'Prelims']);

  for (const pack of packs) {
    await attachPack(workspaceId, pack);
  }

  await verifyPackPlacement(workspaceId);
  console.log(
    [
      `Cards created: ${stats.cardsCreated}. Restored: ${stats.cardsRestored}. Updated: ${stats.cardsUpdated}.`,
      `Files attached: ${stats.filesAttached}. Existing: ${stats.filesExisting}. PDFs written: ${stats.pdfsWritten}.`,
      `Duplicate folders merged: ${stats.duplicateFoldersMerged}. Duplicate files removed: ${stats.duplicateFilesRemoved}.`,
    ].join('\n'),
  );
};

run()
  .catch((error) => {
    console.error('Premium exam content pack seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
