import dotenv from 'dotenv';
dotenv.config();

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import mongoose, { Types } from 'mongoose';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import StudyCard, { type StudyCardGoalType, type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const ROOT_WORKSPACE_SLUG = 'study-hub';
const MONGO_URI = process.env.MONGO_URI;
const SCRIPT_DIR = path.resolve(__dirname);
const STATIC_URL_ROOT = '/static/remaining-premium-packs';
const STATIC_FILE_ROOT = path.resolve(SCRIPT_DIR, '../../public/remaining-premium-packs');
const shouldApply = process.argv.includes('--apply');
const verifyOnly = process.argv.includes('--verify');
const onlyFilterRaw = process.argv
  .find((arg) => arg.startsWith('--only='))
  ?.slice('--only='.length)
  .trim();

type ResourceType = 'notes' | 'practice' | 'strategy' | 'material' | 'planner';

type PremiumPack = {
  id: string;
  title: string;
  targetPath: string[];
  exam: string;
  stage: string;
  subject: string;
  topic: string;
  resourceType: ResourceType;
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

const styleForName = (
  name: string,
  depth: number,
  order: number,
): { iconKey: string; tone: StudyCardTone; goalType: StudyCardGoalType; order: number } => {
  const key = normalizeKey(name);
  if (depth === 0) {
    if (key.includes('placement')) return { iconKey: 'placement', tone: 'cyan', goalType: 'exam_category', order };
    if (key.includes('school')) return { iconKey: 'school-board', tone: 'emerald', goalType: 'exam_category', order };
    if (key.includes('university')) return { iconKey: 'university', tone: 'indigo', goalType: 'exam_category', order };
    if (key.includes('state')) return { iconKey: 'state-exam', tone: 'amber', goalType: 'exam_category', order };
    return { iconKey: 'exam', tone: 'blue', goalType: 'exam_category', order };
  }
  if (/^class\s+\d{1,2}$/.test(key)) return { iconKey: 'class', tone: 'emerald', goalType: 'class', order };
  if (key.includes('icse') || key.includes('isc') || key.includes('board')) return { iconKey: 'school-board', tone: 'emerald', goalType: 'board', order };
  if (key.includes('jee') || key.includes('neet') || key.includes('cuet') || key.includes('cat') || key.includes('clat')) return { iconKey: 'exam', tone: 'blue', goalType: 'exam', order };
  if (key.includes('ssc') || key.includes('banking') || key.includes('railway') || key.includes('defence')) return { iconKey: 'exam', tone: 'violet', goalType: 'exam_family', order };
  if (key.includes('syllabus')) return { iconKey: 'syllabus', tone: 'amber', goalType: 'resource_folder', order };
  if (key.includes('book') || key.includes('textbook')) return { iconKey: 'book', tone: 'emerald', goalType: 'resource_folder', order };
  if (key.includes('previous') || key.includes('paper') || key.includes('pyq')) return { iconKey: 'pyq', tone: 'violet', goalType: 'resource_folder', order };
  if (key.includes('mock') || key.includes('practice')) return { iconKey: 'practice', tone: 'rose', goalType: 'resource_folder', order };
  if (key.includes('strategy') || key.includes('roadmap') || key.includes('planner')) return { iconKey: 'target', tone: 'amber', goalType: 'resource_folder', order };
  if (key.includes('resume') || key.includes('portfolio')) return { iconKey: 'student-profile', tone: 'cyan', goalType: 'resource_folder', order };
  if (key.includes('coding') || key.includes('dsa')) return { iconKey: 'coding', tone: 'emerald', goalType: 'resource_folder', order };
  if (key.includes('study') || key.includes('material') || key.includes('notes')) return { iconKey: 'material', tone: 'blue', goalType: 'resource_folder', order };
  return { iconKey: depth >= 3 ? 'subject' : 'folder', tone: 'slate', goalType: depth >= 3 ? 'subject' : 'resource_folder', order };
};

const orderForPart = (parts: string[], index: number) => {
  const key = normalizeKey(parts[index]);
  const rootOrder = new Map<string, number>([
    ['competitive exams', 10],
    ['entrance exams', 20],
    ['school boards', 30],
    ['state exams', 40],
    ['university exams', 50],
    ['placement private', 80],
    ['placement and private', 80],
  ]);
  const shelfOrder = new Map<string, number>([
    ['overview', 5],
    ['syllabus', 10],
    ['textbooks', 20],
    ['study material', 30],
    ['revision notes', 40],
    ['previous year papers', 50],
    ['mock tests', 60],
    ['practice questions', 70],
    ['answer keys', 80],
    ['strategy', 90],
    ['start here', 5],
    ['dsa', 35],
    ['coding', 40],
    ['interview', 60],
    ['resume', 70],
  ]);
  const classMatch = key.match(/^class\s+(\d{1,2})$/);
  if (classMatch) return 100 + Number(classMatch[1]);
  return rootOrder.get(key) || shelfOrder.get(key) || (index + 1) * 100;
};

const getWorkspace = async () =>
  Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id name slug').lean<{ _id: Types.ObjectId }>();

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

  const drawWrapped = (text: string, size = 10.2, font = regular, color = rgb(0.15, 0.19, 0.27), indent = 0) => {
    const maxChars = Math.max(38, Math.floor((width - margin * 2 - indent) / (size * 0.49)));
    for (const line of wrapLine(text, maxChars)) {
      if (y < 62) addPage();
      page.drawText(line, { x: margin + indent, y, size, font, color });
      y -= size + 4;
    }
  };

  page.drawRectangle({ x: 0, y: height - 108, width, height: 108, color: rgb(0.03, 0.06, 0.11) });
  page.drawText(pack.title.slice(0, 74), { x: margin, y: height - 46, size: 16.5, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`${pack.exam} / ${pack.stage} / ${pack.subject}`.slice(0, 98), {
    x: margin,
    y: height - 73,
    size: 10,
    font: regular,
    color: rgb(0.74, 0.92, 1),
  });
  y = height - 130;

  const content = [
    '## Premium Snapshot',
    `Exam: ${pack.exam}`,
    `Subject: ${pack.subject}`,
    `Topic: ${pack.topic}`,
    'This Study Hub premium pack is a guided sheet. Keep official syllabus, official notices, and standard books as the source of truth.',
    '## Study Flow',
    '- Step 1: Open the matching syllabus or textbook folder first.',
    '- Step 2: Convert this sheet into a one-page note and a short practice set.',
    '- Step 3: Solve PYQ, mock, or board-style questions from the same folder family.',
    '- Step 4: Add every mistake to one error log and revise it weekly.',
    '## Premium Content',
    ...pack.bullets,
    '## Output Checklist',
    '- One syllabus map or chapter map is complete.',
    '- One practice set is attempted in timed mode.',
    '- Wrong answers are grouped by concept, careless error, or time pressure.',
    '- Next revision date is written before closing this pack.',
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
    pdfPage.drawText('Study Hub Premium Remaining Exam Pack', {
      x: margin,
      y: 22,
      size: 8.5,
      font: bold,
      color: rgb(0.02, 0.35, 0.52),
    });
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
  notes: 'Generated Study Hub premium pack. Official syllabus, official notices, and standard books remain the source of truth.',
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

const p = (
  id: string,
  title: string,
  targetPath: string[],
  exam: string,
  stage: string,
  subject: string,
  topic: string,
  resourceType: ResourceType,
  bullets: string[],
): PremiumPack => ({ id, title, targetPath, exam, stage, subject, topic, resourceType, bullets });

const commonAptitudeBullets = [
  '- Quant: arithmetic, algebra basics, number system, time-work, ratio, and data interpretation are the first scoring layer.',
  '- Reasoning: puzzles, seating, syllogism, coding-decoding, blood relation, and series need timed mixed practice.',
  '- English: daily RC, para-jumble, grammar error log, and vocabulary revision should run together.',
];

const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, index) => start + index);

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const multiplicationTableBullets = range(2, 50).flatMap((number) => {
  const firstHalf = range(1, 10).map((multiplier) => `${number}x${multiplier}=${number * multiplier}`).join(' | ');
  const secondHalf = range(11, 20).map((multiplier) => `${number}x${multiplier}=${number * multiplier}`).join(' | ');
  return [`- Table ${number} A: ${firstHalf}`, `- Table ${number} B: ${secondHalf}`];
});

const squareBullets = chunk(
  range(1, 100).map((number) => `${number}^2=${number * number}`),
  6,
).map((line) => `- ${line.join(' | ')}`);

const cubeBullets = chunk(
  range(1, 50).map((number) => `${number}^3=${number * number * number}`),
  4,
).map((line) => `- ${line.join(' | ')}`);

const fractionBullets = chunk(
  range(2, 30).map((denominator) => {
    const percent = (100 / denominator).toFixed(2).replace(/\.00$/, '').replace(/0$/, '');
    return `1/${denominator}=${percent}%`;
  }),
  5,
).map((line) => `- ${line.join(' | ')}`);

const tripletBullets = [
  '- Basic triplets: (3,4,5), (5,12,13), (7,24,25), (8,15,17), (9,40,41).',
  '- Advanced triplets: (11,60,61), (12,35,37), (16,63,65), (20,21,29), (28,45,53).',
  '- High utility triplets: (33,56,65), (36,77,85), (39,80,89), (48,55,73), (65,72,97).',
  '- Multiples to spot: 3-4-5 gives 6-8-10, 9-12-15, 12-16-20, 15-20-25, 30-40-50.',
  '- Multiples to spot: 5-12-13 gives 10-24-26, 15-36-39, 20-48-52, 25-60-65.',
  '- Geometry use: if two sides match a triplet multiple, avoid root calculation and move straight to area/perimeter.',
  '- Mensuration use: diagonal, height, slant height, radius, and tangent questions frequently hide triplet ratios.',
];

const shortcutBullets = [
  '- Base 50 square: (50+x)^2 = (25+x) | x^2. Example: 53^2 = 28|09 = 2809.',
  '- Base 50 square: (50-x)^2 = (25-x) | x^2. Example: 47^2 = 22|09 = 2209.',
  '- Carry rule: if x^2 has three digits, carry the hundreds to the left part. Example: 67^2 = 42|289 = 4489.',
  '- Base 100 square: 97^2 = (100-2x)|x^2 where x=3, so 94|09 = 9409.',
  '- Last two digit pattern: square endings repeat through complements, so learn 1 to 25 endings strongly.',
  '- Unit digit rule: even number cube stays even, odd number cube stays odd; use last digit to remove wrong options.',
  '- Unit digit square: last digit 0,1,4,5,6,9 only. If option ends in 2,3,7,8, reject it for a square.',
  '- Digital sum: reduce calculation and option to one digit by repeatedly adding digits; use it as a fast option filter.',
  '- Divisibility by 9: digit sum divisible by 9 means number is divisible by 9.',
  '- Divisibility by 11: difference between alternate digit sums divisible by 11 means number is divisible by 11.',
  '- Pi questions: when 22/7 appears, check options with 7, 11, 22, or 154 factor before doing full multiplication.',
];

const quantFormulaRecallBullets = [
  '- Percentage: x% of y = y% of x. Use it when one side is easier, such as 18% of 50 = 50% of 18 = 9.',
  '- Successive percentage change: a% and b% gives a+b+ab/100. For decrease, use negative sign.',
  '- Profit percent = profit/CP x 100. Loss percent = loss/CP x 100. Discount percent = discount/MP x 100.',
  '- SI = PRT/100. CI for 2 years = 2r + r^2/100 percent. CI for 3 years = 3r + 3r^2/100 + r^3/10000 percent.',
  '- Ratio split: if total is T and ratio is a:b, parts are T*a/(a+b) and T*b/(a+b).',
  '- Average: new average = old average + total change / number of items.',
  '- Time-work: efficiency is work per day. If A does work in x days, A efficiency = 1/x.',
  '- Pipes and cistern: inlet positive, outlet negative. Net work = sum of individual efficiencies.',
  '- Speed: distance = speed x time. Train crossing pole = train length / speed. Train crossing platform = (train+platform length) / speed.',
  '- Boats: downstream speed = boat + stream. Upstream speed = boat - stream.',
  '- Simple interest vs compound interest for 2 years: CI - SI = P*r^2/10000.',
  '- Algebra: (a+b)^2, (a-b)^2, a^2-b^2, (a+b)^3, (a-b)^3, a^3+b^3, a^3-b^3 should be instant.',
  '- Geometry: triangle area = 1/2 bh. Equilateral triangle area = root3/4 a^2. Inradius area relation: area = r*s.',
  '- Circle: circumference = 2*pi*r, area = pi*r^2, sector area = theta/360*pi*r^2, arc length = theta/360*2*pi*r.',
  '- Mensuration: cylinder volume = pi*r^2*h, cone volume = 1/3*pi*r^2*h, sphere volume = 4/3*pi*r^3.',
  '- Trigonometry values: sin/cos/tan for 0, 30, 45, 60, 90 degrees must be recalled without writing table.',
  '- Trig identities: sin^2A + cos^2A = 1, sec^2A - tan^2A = 1, cosec^2A - cot^2A = 1.',
];

const reasoningPatternBullets = [
  '- Alphabet positions: A=1 to Z=26 and reverse positions Z=1 to A=26 should be instant.',
  '- Opposite alphabet pairs: AZ, BY, CX, DW, EV, FU, GT, HS, IR, JQ, KP, LO, MN.',
  '- Coding-decoding: check direct position, reverse position, +n/-n shift, alternate shift, and vowel/consonant treatment.',
  '- Number series: first check difference, second difference, multiplication, square/cube pattern, and alternating series.',
  '- Analogy: identify relation first: synonym, antonym, part-whole, tool-use, worker-place, animal-young, country-capital, number operation.',
  '- Direction: draw north first, update turn by turn, and mark final displacement as horizontal plus vertical components.',
  '- Blood relation: convert every statement into generation level: grandparent +2, parent +1, sibling 0, child -1.',
  '- Calendar odd days: normal year has 1 odd day, leap year has 2 odd days, 100 years has 5 odd days, 400 years has 0 odd days.',
  '- Clock angle: angle = |30H - 11M/2|. If angle exceeds 180, subtract from 360.',
  '- Syllogism: draw minimum Venn diagram and test only the conclusion, not personal meaning.',
  '- Venn diagram: all, some, no, and possibility cases should be separated; never mix definite and possible conclusion.',
  '- Dice: opposite faces never appear together. If two positions share two common faces, the remaining faces are opposite.',
  '- Cube counting: paint exposure decides category: 3 faces at corners, 2 faces on edges, 1 face on surface centers, 0 faces inside.',
  '- Mirror/water image: in mirror image left-right changes; in water image top-bottom changes.',
  '- Practice rule: 15 mixed reasoning questions daily with reason code written beside every wrong answer.',
];

const englishRecallBullets = [
  '- Subject-verb agreement: subject decides verb, not the nearest noun after with, along with, together with, or as well as.',
  '- Either/neither with singular nouns takes singular verb; either of/neither of usually takes singular verb in exam grammar.',
  '- Each, every, everyone, someone, nobody, anybody take singular verb.',
  '- Articles: use a before consonant sound, an before vowel sound, and the for specific/unique/superlative items.',
  '- Tense clue words: since/for with duration often points to perfect continuous; yesterday/ago points to simple past.',
  '- Parallelism: after than, as, not only-but also, either-or, neither-nor, keep same grammatical form.',
  '- Pronoun case: between you and me, not between you and I. After preposition, use objective case.',
  '- Modifier: place only, almost, hardly, merely, and even close to the word they modify.',
  '- Common pair: affect is usually verb, effect is usually noun.',
  '- Common pair: accept means receive, except means excluding.',
  '- Common pair: advice is noun, advise is verb.',
  '- Common pair: loose means not tight, lose means fail to keep.',
  '- Common pair: principal means head/main, principle means rule.',
  '- Idioms: spill the beans, hit the nail on the head, once in a blue moon, under the weather, by hook or crook.',
  '- One-word pattern: fear words end in phobia; rule systems end in cracy; study fields often end in logy.',
  '- Cloze test: read the full paragraph once, predict tone, then fill grammar and meaning together.',
  '- Error spotting: check verb, preposition, article, pronoun, comparison, modifier, and idiom in this order.',
  '- Daily drill: 20 vocabulary words, 10 error spotting, 5 sentence improvement, and 1 cloze passage.',
];

const mapStaticGkBullets = [
  '## India Map Recall',
  '- Neighbours: Pakistan west, China/Nepal/Bhutan north, Bangladesh/Myanmar east, Sri Lanka south across Palk Strait.',
  '- Important passes: Nathula-Sikkim, Shipki La-Himachal Pradesh, Zoji La-Ladakh/Jammu Kashmir, Bomdila-Arunachal Pradesh, Lipulekh-Uttarakhand.',
  '- Himalayan rivers: Indus-Jhelum-Chenab-Ravi-Beas-Sutlej, Ganga-Yamuna-Ghaghara-Gandak-Kosi-Son, Brahmaputra-Dibang-Lohit-Subansiri.',
  '- Peninsular rivers: Narmada and Tapi flow west; Mahanadi, Godavari, Krishna, Kaveri flow east.',
  '- Dams: Bhakra-Sutlej, Hirakud-Mahanadi, Tehri-Bhagirathi, Sardar Sarovar-Narmada, Nagarjuna Sagar-Krishna, Idukki-Periyar, Koyna-Koyna.',
  '- National parks: Jim Corbett-Uttarakhand, Kaziranga-Assam, Gir-Gujarat, Ranthambore-Rajasthan, Sundarbans-West Bengal, Periyar-Kerala.',
  '- More parks: Kanha-Madhya Pradesh, Bandipur-Karnataka, Keoladeo-Rajasthan, Hemis-Ladakh, Simlipal-Odisha.',
  '- Crops: wheat-UP Punjab Haryana, rice-West Bengal UP Punjab, cotton-Gujarat Maharashtra Telangana, tea-Assam West Bengal, coffee-Karnataka Kerala Tamil Nadu.',
  '- Minerals: coal-Jharkhand Odisha Chhattisgarh West Bengal, iron ore-Odisha Chhattisgarh Karnataka Jharkhand, petroleum-Assam Gujarat Mumbai High.',
  '- Coastal order west to south to east: Gujarat, Maharashtra, Goa, Karnataka, Kerala, Tamil Nadu, Andhra Pradesh, Odisha, West Bengal.',
  '- Seven sisters: Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Tripura; Sikkim is not one of the seven sisters.',
  '- Map drill: locate state, capital, major river, crop/mineral, national park, and bordering states in one pass.',
];

const staticGkTimelineBullets = [
  '## History Timeline',
  '- 1757 Plassey, 1764 Buxar, 1773 Regulating Act, 1857 Revolt, 1885 INC formation.',
  '- 1905 Bengal Partition, 1909 Morley-Minto, 1919 Jallianwala Bagh, 1920 Non-Cooperation, 1930 Dandi March.',
  '- 1935 Government of India Act, 1942 Quit India, 1947 Independence, 1950 Constitution came into force.',
  '## Polity Recall',
  '- Article 14 equality, 19 freedoms, 21 life and personal liberty, 32 constitutional remedies.',
  '- Article 44 uniform civil code DPSP, 51A fundamental duties, 72 President pardon, 110 money bill, 112 annual financial statement.',
  '- Article 124 Supreme Court, 148 CAG, 280 Finance Commission, 315 Public Service Commission, 324 Election Commission.',
  '- Article 352 national emergency, 356 state emergency, 368 amendment procedure.',
  '- Schedules: 1 states, 2 salaries, 3 oaths, 4 Rajya Sabha seats, 5 scheduled areas, 6 tribal areas, 7 lists.',
  '- Schedules: 8 languages, 9 land reform laws, 10 anti-defection, 11 panchayats, 12 municipalities.',
  '## Science and Economy Recall',
  '- Physics units: force-newton, pressure-pascal, energy-joule, power-watt, charge-coulomb, frequency-hertz.',
  '- Biology: mitochondria-powerhouse, ribosome-protein synthesis, chloroplast-photosynthesis, kidney-nephron, blood clotting-platelets.',
  '- Chemistry: pH below 7 acidic, pH above 7 basic; common salt-NaCl, baking soda-NaHCO3, washing soda-Na2CO3.',
  '- Economy: GDP domestic production, CPI retail inflation, repo RBI lends to banks, reverse repo banks lend to RBI.',
  '- Daily drill: revise 10 dates, 10 articles, 10 map facts, 10 science facts, and 5 economy terms.',
];

const packs: PremiumPack[] = [
  p('jee-physics-mechanics-premium', 'JEE Physics Mechanics Premium Drill', ['Entrance Exams', 'JEE (Main + Advanced)', 'Study Material', 'Physics'], 'JEE', 'Main + Advanced', 'Physics', 'Mechanics', 'notes', [
    '- Build one formula grid for kinematics, NLM, work-energy, circular motion, COM, and rotation.',
    '- For every problem, mark the system, constraint, force diagram, and conservation law before calculation.',
    '- Advanced signal: combine energy, momentum, and geometry instead of memorising isolated formulas.',
  ]),
  p('jee-maths-calculus-coordinate-premium', 'JEE Mathematics Calculus and Coordinate Premium Sheet', ['Entrance Exams', 'JEE (Main + Advanced)', 'Study Material', 'Mathematics'], 'JEE', 'Main + Advanced', 'Mathematics', 'Calculus and Coordinate Geometry', 'notes', [
    '- Calculus map: limits, continuity, differentiation, AOD, integration, area, and differential equations.',
    '- Coordinate map: straight line, circle, parabola, ellipse, hyperbola, tangent, normal, and locus.',
    '- Practice in blocks of 12 questions: 4 concept, 4 mixed, 4 timed exam-level questions.',
  ]),
  p('jee-chemistry-reaction-map-premium', 'JEE Chemistry Reaction Map Premium Sheet', ['Entrance Exams', 'JEE (Main + Advanced)', 'Study Material', 'Chemistry'], 'JEE', 'Main + Advanced', 'Chemistry', 'Organic, Physical, and Inorganic Link Map', 'notes', [
    '- Organic: write reagent, substrate, product, mechanism clue, and exception in one table.',
    '- Physical: keep unit checks for mole concept, thermodynamics, equilibrium, electrochemistry, and kinetics.',
    '- Inorganic: NCERT line revision plus periodic trends and coordination chemistry short tests.',
  ]),
  p('neet-biology-human-physiology-premium', 'NEET Biology Human Physiology Premium Sheet', ['Entrance Exams', 'NEET', 'NEET UG', 'Study Material', 'Biology'], 'NEET UG', 'Medical Entrance', 'Biology', 'Human Physiology', 'notes', [
    '- NCERT-first chapters: digestion, breathing, circulation, excretion, neural control, chemical coordination.',
    '- Diagram signal: label flow, hormone-source-action, organ function, and disorder in one-page tables.',
    '- Practice: solve assertion-reason and statement-based questions after every NCERT read.',
  ]),
  p('neet-physics-electro-mechanics-premium', 'NEET Physics Mechanics to Electrostatics Premium Drill', ['Entrance Exams', 'NEET', 'NEET UG', 'Study Material', 'Physics'], 'NEET UG', 'Medical Entrance', 'Physics', 'Mechanics and Electrostatics', 'practice', [
    '- Focus on formula recognition, unit discipline, and fast substitution before lengthy derivations.',
    '- Keep one sheet for graphs: kinematics, work-energy, electrostatics potential, and current electricity.',
    '- Attempt 45 mixed questions in 75 minutes and tag errors as formula, concept, or calculation.',
  ]),
  p('neet-chemistry-ncert-premium', 'NEET Chemistry NCERT Line-to-Question Premium Sheet', ['Entrance Exams', 'NEET', 'NEET UG', 'Study Material', 'Chemistry'], 'NEET UG', 'Medical Entrance', 'Chemistry', 'NCERT to MCQ Conversion', 'notes', [
    '- Physical chemistry: formula, unit, condition, and exception must be revised together.',
    '- Organic chemistry: reactions should be grouped by functional group and reagent family.',
    '- Inorganic chemistry: highlight NCERT tables, trends, and named compounds for direct recall.',
  ]),
  p('cuet-ug-general-test-premium', 'CUET UG General Test Premium Pack', ['Entrance Exams', 'CUET', 'CUET UG', 'Study Material', 'General Test'], 'CUET UG', 'Undergraduate Entrance', 'General Test', 'Quant, Reasoning, and GK', 'practice', [
    ...commonAptitudeBullets,
    '- Run 30-minute mini mocks with a strict skip rule: leave time traps early and return later.',
  ]),
  p('cuet-ug-domain-combo-premium', 'CUET UG Domain Subject Combination Guide', ['Entrance Exams', 'CUET', 'CUET UG', 'Strategy', 'Subject Combination Guide'], 'CUET UG', 'Undergraduate Entrance', 'Domain Subjects', 'University Preference Strategy', 'strategy', [
    '- Match target university course requirements with domain subjects before final practice planning.',
    '- Keep separate folders for syllabus, PYQ, notes, and mock analysis for every selected domain.',
    '- Rank colleges by eligibility, cutoff trend, language preference, and backup subject combination.',
  ]),
  p('cuet-pg-domain-premium', 'CUET PG Domain Revision Premium Pack', ['Entrance Exams', 'CUET', 'CUET PG', 'Study Material', 'Domain Subject-wise'], 'CUET PG', 'Postgraduate Entrance', 'Domain Subject', 'PG Revision Planning', 'planner', [
    '- Divide revision into basics, standard theories, methods, PYQ patterns, and mock repair.',
    '- Convert previous papers into topic frequency and difficulty notes.',
    '- Keep one list of definitions, one list of thinkers/formulas, and one list of recurring traps.',
  ]),
  p('bitsat-speed-revision-premium', 'BITSAT Speed Revision Premium Pack', ['Entrance Exams', 'BITSAT', 'Study Material', 'Speed Revision'], 'BITSAT', 'Engineering Entrance', 'PCM and English', 'Speed, Accuracy, and Section Balance', 'practice', [
    '- BITSAT needs fast first-pass scoring: formulas, NCERT chemistry, short English, and logical reasoning.',
    '- Use 20-question bursts with timer: 8 PCM, 4 English, 4 reasoning, 4 error-review questions.',
    '- Bonus question strategy works only after accuracy is stable in the normal paper.',
  ]),
  p('clat-legal-reasoning-premium', 'CLAT Legal Reasoning Premium Sheet', ['Entrance Exams', 'Law', 'CLAT', 'Study Material', 'Legal Reasoning'], 'CLAT', 'Law Entrance', 'Legal Reasoning', 'Principle-Fact Application', 'notes', [
    '- Read principle, facts, exception, and conclusion separately before answering.',
    '- Avoid outside legal knowledge unless the question explicitly allows it.',
    '- Maintain a trap log for assumption, morality, chronology, and exception-based errors.',
  ]),
  p('cat-qa-dilr-varc-premium', 'CAT QA DILR VARC Premium Planner', ['Entrance Exams', 'Management', 'CAT', 'Study Material', 'QA DILR VARC'], 'CAT', 'MBA Entrance', 'QA DILR VARC', 'Section-wise Prep System', 'planner', [
    '- VARC: daily reading, para summary, odd sentence, and RC error classification.',
    '- DILR: solve fewer sets but review every missed inference and table construction choice.',
    '- QA: arithmetic and algebra should become high-accuracy zones before advanced topics.',
  ]),
  p('design-architecture-aptitude-premium', 'Design and Architecture Aptitude Premium Pack', ['Entrance Exams', 'Design & Architecture', 'Study Material', 'Aptitude and Visualization'], 'Design and Architecture', 'Entrance', 'Aptitude', 'Visualization, Drawing, and Design Thinking', 'practice', [
    '- Build visual memory drills: perspective, proportion, shadows, textures, and object transformation.',
    '- For design tests, explain user, need, constraint, sketch, and improvement in one flow.',
    '- For architecture aptitude, combine geometry, spatial reasoning, and building awareness practice.',
  ]),
  p('agriculture-veterinary-biology-premium', 'Agriculture and Veterinary Biology Premium Sheet', ['Entrance Exams', 'Agriculture & Veterinary', 'Study Material', 'Biology'], 'Agriculture and Veterinary', 'Entrance', 'Biology', 'Botany, Zoology, and Agriculture Basics', 'notes', [
    '- Biology revision should connect NCERT concepts with plant physiology, genetics, ecology, and animal systems.',
    '- Agriculture basics: crop, soil, irrigation, pest, and extension terms should be tabulated.',
    '- Practice statement-based MCQs because small wording changes decide accuracy.',
  ]),
  p('professional-ca-foundation-accounts-premium', 'CA Foundation Accounting Premium Starter', ['Entrance Exams', 'Professional Certifications', 'CA Foundation', 'Study Material', 'Accounting'], 'CA Foundation', 'Professional Certification', 'Accounting', 'Concept and Entry Discipline', 'notes', [
    '- Master accounting equation, journal, ledger, trial balance, depreciation, bills, and final accounts.',
    '- Keep format discipline: narration, date, debit-credit side, and working note should be clean.',
    '- Practice mixed adjustments because final accounts mistakes often come from missed conditions.',
  ]),
  p('ssc-cgl-quant-premium', 'SSC CGL Fast Calculation Master Sheet', ['Competitive Exams', 'SSC', 'SSC CGL', 'Study Material', 'Quantitative Aptitude'], 'SSC CGL', 'Tier Prep', 'Quantitative Aptitude', 'Speed Arithmetic and Advanced Maths', 'practice', [
    ...commonAptitudeBullets,
    '- SSC quant needs fixed recall first: tables, squares, cubes, fractions, triplets, unit digit, and digital sum.',
    '- Target speed: common calculation values should be recognised in 1 to 2 seconds before full solution begins.',
    '- Question type order: number system, percentage, ratio, SI-CI, profit-loss, time-work, geometry, trigonometry, DI.',
    '- Fast attempt rule: identify formula, reduce options using unit digit or digital sum, then calculate only what remains.',
  ]),
  p('ssc-cgl-tables-2-50', 'SSC CGL Tables 2 to 50 Speed Sheet', ['Competitive Exams', 'SSC', 'SSC CGL', 'Study Material', 'Quantitative Aptitude', 'Speed Calculation', 'Tables 2 to 50'], 'SSC CGL', 'Tier Prep', 'Quantitative Aptitude', 'Tables 2 to 50', 'practice', [
    '- Memorise tables from 2 to 50 up to 20 multiples. SSC simplification, DI, ratio, percentage, and geometry become faster.',
    '- First target: 2 to 30 should be instant. Second target: 31 to 50 should be recognised through split multiplication.',
    '- Drill method: read one row aloud, cover it, write it once, then use it in 10 random products.',
    ...multiplicationTableBullets,
  ]),
  p('ssc-cgl-squares-cubes-triplets', 'SSC CGL Squares Cubes Triplets Sheet', ['Competitive Exams', 'SSC', 'SSC CGL', 'Study Material', 'Quantitative Aptitude', 'Speed Calculation', 'Squares Cubes Triplets'], 'SSC CGL', 'Tier Prep', 'Quantitative Aptitude', 'Squares Cubes and Triplets', 'practice', [
    '- Squares 1 to 50 should be memorised. Squares 51 to 100 should be solved through base 50 and base 100 methods.',
    '- Cubes 1 to 30 must be instant. Cubes 31 to 50 are useful for CI, number system, and option elimination.',
    '- Triplets save time in geometry, mensuration, trigonometry, height-distance, and coordinate-style questions.',
    '## Squares 1 to 100',
    ...squareBullets,
    '## Cubes 1 to 50',
    ...cubeBullets,
    '## Pythagorean Triplets',
    ...tripletBullets,
  ]),
  p('ssc-cgl-fractions-shortcuts', 'SSC CGL Fractions Unit Digit Shortcut Sheet', ['Competitive Exams', 'SSC', 'SSC CGL', 'Study Material', 'Quantitative Aptitude', 'Speed Calculation', 'Fractions and Shortcuts'], 'SSC CGL', 'Tier Prep', 'Quantitative Aptitude', 'Fractions Unit Digit Digital Sum', 'practice', [
    '- Percentage to fraction recall makes profit-loss, SI-CI, ratio, mixture, DI, and discount questions much faster.',
    '- Use unit digit and last two digit checks before long multiplication when options are available.',
    '- Use digital sum as a filter, not as a proof, because different numbers can share the same digital sum.',
    '## Percentage to Fraction Chart',
    ...fractionBullets,
    '## Speed Rules',
    ...shortcutBullets,
  ]),
  p('ssc-cgl-daily-calculation-drill', 'SSC CGL Daily Calculation Drill Planner', ['Competitive Exams', 'SSC', 'SSC CGL', 'Study Material', 'Quantitative Aptitude', 'Speed Calculation', 'Daily Drill'], 'SSC CGL', 'Tier Prep', 'Quantitative Aptitude', 'Daily Speed Routine', 'planner', [
    '- Morning 15 minutes: write tables 2 to 30, squares 1 to 50, cubes 1 to 30, and fractions 1/2 to 1/30 in rotation.',
    '- Random products: solve 30 products daily, such as 17x13, 28^2, 43x19, 37^2, and 24^3 without calculator.',
    '- PYQ burst: solve 20 SSC CGL quant questions in 15 minutes. Mark every slow calculation separately.',
    '- Error log: label mistakes as formula recall, value recall, arithmetic slip, option filtering, or reading error.',
    '- Weekly test: one day tables, one day squares, one day cubes, one day fractions, one day triplets, one day mixed PYQ.',
    '- Exam approach: if a question takes more than 45 seconds without progress, skip and return after easy marks are secured.',
    '- Revision loop: 7 days continuous recall is better than one long sitting. Keep the same notebook and repeat the same sheet.',
  ]),
  p('ssc-cgl-formula-recall', 'SSC CGL Quant Formula Recall Sheet', ['Competitive Exams', 'SSC', 'SSC CGL', 'Study Material', 'Quantitative Aptitude', 'Formula Recall'], 'SSC CGL', 'Tier Prep', 'Quantitative Aptitude', 'Arithmetic Geometry Mensuration Trigonometry', 'practice', [
    '- Keep this sheet as the final 20-minute formula recall loop before timed quant practice.',
    '- Do not only read formulas. Convert every formula into one mental example so recall becomes active.',
    ...quantFormulaRecallBullets,
    '- Practice rule: after every mock, add the missing formula to this recall list and revise it next morning.',
  ]),
  p('ssc-cgl-reasoning-pattern-speed', 'SSC CGL Reasoning Pattern Speed Sheet', ['Competitive Exams', 'SSC', 'SSC CGL', 'Study Material', 'Reasoning', 'Pattern Speed Practice'], 'SSC CGL', 'Tier Prep', 'Reasoning', 'Analogy Series Coding Calendar Clock Venn', 'practice', [
    '- Reasoning speed comes from pattern recognition. First name the pattern, then solve.',
    '- Treat every wrong answer as one of four mistakes: wrong pattern, missed condition, careless direction, or slow diagram.',
    ...reasoningPatternBullets,
    '- Timed routine: 5 analogy, 5 series, 5 coding-decoding, 5 direction/blood relation, and 5 mixed visual questions daily.',
  ]),
  p('ssc-cgl-english-grammar-vocab-recall', 'SSC CGL English Grammar Vocabulary Recall Sheet', ['Competitive Exams', 'SSC', 'SSC CGL', 'Study Material', 'English', 'Grammar Vocabulary Recall'], 'SSC CGL', 'Tier Prep', 'English', 'Grammar Vocabulary Cloze Error Spotting', 'practice', [
    '- English should be revised through error patterns, not random reading only.',
    '- Maintain one notebook for grammar triggers, confusing words, idioms, one-word substitutions, and cloze errors.',
    ...englishRecallBullets,
    '- Revision loop: old vocabulary in the morning, grammar error log in the evening, and one cloze passage at night.',
  ]),
  p('ssc-cgl-map-static-gk', 'SSC CGL Map and Static GK Atlas', ['Competitive Exams', 'SSC', 'SSC CGL', 'Study Material', 'General Awareness', 'Map and Static GK'], 'SSC CGL', 'Tier Prep', 'General Awareness', 'India Map Rivers Dams Parks Crops Minerals', 'notes', [
    '- Map-based static GK should be visual. Read state, river, dam, park, crop, and mineral together.',
    '- Use this sheet like an atlas warm-up before history, geography, and current affairs revision.',
    ...mapStaticGkBullets,
    '- Daily drill: choose 3 states and recall capital, bordering states, river, national park, crop/mineral, and one current fact.',
  ]),
  p('ssc-cgl-static-gk-timeline', 'SSC CGL Static GK Timeline Recall Sheet', ['Competitive Exams', 'SSC', 'SSC CGL', 'Study Material', 'General Awareness', 'Static GK Timeline'], 'SSC CGL', 'Tier Prep', 'General Awareness', 'History Polity Science Economy Recall', 'notes', [
    '- Static GK becomes fast when dates, articles, schedules, science facts, and economy terms are revised in small loops.',
    '- Do not overload. Learn repeatable high-frequency facts first, then add PYQ-based extras.',
    ...staticGkTimelineBullets,
    '- Weekly routine: Sunday ko one full revision of dates, articles, schedules, science terms, and map facts.',
  ]),
  p('ssc-cgl-gs-english-premium', 'SSC CGL GS and English Premium Sheet', ['Competitive Exams', 'SSC', 'SSC CGL', 'Study Material', 'General Awareness and English'], 'SSC CGL', 'Tier Prep', 'GS and English', 'Static GK, Current, Grammar, Vocabulary', 'notes', [
    '- GS: split static GK, polity, history, geography, economy, science, and current affairs.',
    '- English: maintain error log for subject-verb, tense, preposition, articles, voice, narration, and vocabulary.',
    '- Revise in short loops because SSC rewards repeat exposure more than one long reading.',
  ]),
  p('banking-po-reasoning-di-premium', 'Banking PO Reasoning and DI Premium Drill', ['Competitive Exams', 'Banking', 'IBPS PO', 'Study Material', 'Reasoning and Data Interpretation'], 'IBPS PO', 'Banking', 'Reasoning and DI', 'Puzzles, Seating, and Data Sets', 'practice', [
    '- Start every puzzle with variables, fixed clues, flexible clues, and contradiction checks.',
    '- DI should be solved with approximation, ratio, percentage, and table-cleaning shortcuts.',
    '- Review skipped questions to decide whether the issue was concept, reading, or time allocation.',
  ]),
  p('banking-clerk-speed-premium', 'Banking Clerk Speed Accuracy Premium Pack', ['Competitive Exams', 'Banking', 'IBPS Clerk', 'Strategy', 'Speed and Accuracy'], 'IBPS Clerk', 'Banking', 'Speed Strategy', 'Prelims Scoring System', 'strategy', [
    '- Prelims selection depends on low-error scoring in easy and moderate questions.',
    '- Build 10-minute section bursts for simplification, inequality, syllogism, cloze test, and puzzle warmups.',
    '- Keep daily speed score, accuracy score, and attempted question count visible in one tracker.',
  ]),
  p('railway-rrb-ntpc-premium', 'RRB NTPC GS Reasoning Quant Premium Pack', ['Competitive Exams', 'Railway', 'RRB NTPC', 'Study Material', 'GS Reasoning Quant'], 'RRB NTPC', 'Railway', 'GS Reasoning Quant', 'Railway Exam Core Prep', 'notes', [
    '- GS: history, polity, geography, economy, science, and railway awareness need short revision cards.',
    '- Reasoning: series, analogy, coding, statement, Venn, calendar, and clock should be timed.',
    '- Quant: arithmetic basics with speed calculation are more valuable than overloading topics.',
  ]),
  p('nda-maths-gat-premium', 'NDA Maths and GAT Premium Pack', ['Competitive Exams', 'NDA', 'Study Material', 'Maths and GAT'], 'NDA', 'Defence', 'Maths and GAT', 'Defence Entry Prep', 'planner', [
    '- Maths: algebra, trigonometry, coordinate geometry, calculus basics, vector, statistics, and probability.',
    '- GAT: English, history, geography, polity, science, current affairs, and defence awareness.',
    '- Weekly routine: 3 maths drills, 2 GAT revisions, 1 full mock, and 1 mistake-log repair session.',
  ]),
  p('cds-english-gk-premium', 'CDS English GK Premium Sheet', ['Competitive Exams', 'CDS', 'Study Material', 'English and General Knowledge'], 'CDS', 'Defence', 'English and GK', 'Officer Entry Prep', 'notes', [
    '- English: RC, sentence improvement, ordering, spotting errors, synonyms, antonyms, and fill blanks.',
    '- GK: history, polity, geography, economy, science, environment, and current affairs.',
    '- Defence prep should include exam practice plus interview awareness and communication clarity.',
  ]),
  p('capf-polity-security-premium', 'CAPF Polity Security Premium Sheet', ['Competitive Exams', 'UPSC CAPF', 'Study Material', 'Polity and Security'], 'UPSC CAPF', 'Assistant Commandant', 'Polity and Security', 'Internal Security and Governance', 'notes', [
    '- Polity basics: Constitution, Parliament, federalism, rights, duties, DPSP, judiciary, and emergency.',
    '- Security map: border, disaster, cyber, terrorism, insurgency, policing, and force roles.',
    '- Essay and report writing need facts, structure, examples, and balanced conclusion.',
  ]),
  p('teaching-ctet-paper-1-premium', 'CTET Paper I Pedagogy Premium Pack', ['Competitive Exams', 'Teaching', 'CTET', 'Study Material', 'Paper I Pedagogy'], 'CTET', 'Teaching Eligibility', 'Pedagogy', 'Child Development and EVS-Maths-Language Pedagogy', 'notes', [
    '- CDP: development, learning, inclusive education, motivation, intelligence, and assessment are core.',
    '- Pedagogy answers should connect concept, child behaviour, classroom method, and assessment.',
    '- Use examples from primary classroom situations for every theory point.',
  ]),
  p('judiciary-bare-act-premium', 'Judiciary Bare Act Reading Premium Sheet', ['Competitive Exams', 'Judiciary', 'Study Material', 'Bare Acts and Case Law'], 'Judiciary', 'State Judicial Services', 'Law', 'Bare Act Reading System', 'strategy', [
    '- Read definitions, exceptions, illustrations, explanations, and provisos separately.',
    '- Create issue-wise cards for CPC, CrPC, IPC/BNS transition, Evidence, Constitution, and Contract.',
    '- PYQ review should tag sections, issue, fact pattern, and common trap.',
  ]),
  p('state-uppsc-gs-premium', 'UPPSC PCS GS Premium Pack', ['State Exams', 'UPPSC PCS', 'Study Material', 'General Studies'], 'UPPSC PCS', 'State PSC', 'General Studies', 'UP Specific GS and Static Core', 'notes', [
    '- Combine national GS with Uttar Pradesh geography, history, culture, economy, schemes, and current affairs.',
    '- Keep separate tables for rivers, regions, industries, agriculture, personalities, and GI tags.',
    '- Practice answer writing with state examples in intro, body, and conclusion.',
  ]),
  p('state-bpsc-gs-premium', 'BPSC CCE Bihar GS Premium Pack', ['State Exams', 'BPSC PCS', 'State GK', 'Bihar Special GS'], 'BPSC CCE', 'State PSC', 'Bihar GS', 'Bihar History, Polity, Economy, and Geography', 'notes', [
    '- Bihar history, movements, geography, rivers, agriculture, industries, and schemes should be one state file.',
    '- Static GS should be revised with Bihar examples wherever possible.',
    '- Previous papers help identify recurring factual and conceptual zones.',
  ]),
  p('state-jpsc-gs-premium', 'JPSC Jharkhand GS Premium Pack', ['State Exams', 'JPSC', 'State GK', 'Jharkhand Special GS'], 'JPSC', 'State PSC', 'Jharkhand GS', 'Jharkhand History, Geography, Economy, and Tribal Culture', 'notes', [
    '- Prepare Jharkhand maps, minerals, industries, tribes, movements, personalities, and schemes together.',
    '- Link Indian polity and economy with state administration examples.',
    '- Maintain a local current affairs sheet by district, scheme, and sector.',
  ]),
  p('state-specific-current-affairs-premium', 'State Exams Current Affairs Premium System', ['State Exams', 'UPPSC PCS', 'Current Affairs', 'Uttar Pradesh Current Affairs'], 'State Exams', 'State Specific', 'Current Affairs', 'Monthly State Current Affairs System', 'planner', [
    '- Split current affairs into government schemes, appointments, awards, reports, geography, economy, and culture.',
    '- Convert state budget and economic survey data into short fact tables.',
    '- Use local examples in mains answers and interview speaking points.',
  ]),
  p('university-cuet-ug-general-premium', 'University CUET UG General Test Premium Pack', ['University Exams', 'Common Entrances', 'CUET UG', 'Study Material', 'General Test'], 'CUET UG', 'University Entrance', 'General Test', 'University Admission Aptitude', 'practice', [
    ...commonAptitudeBullets,
    '- Keep college preference, subject eligibility, and score target visible while choosing mock intensity.',
  ]),
  p('university-cuet-pg-domain-premium', 'University CUET PG Domain Premium Pack', ['University Exams', 'Common Entrances', 'CUET PG', 'Study Material', 'Domain Subject-wise'], 'CUET PG', 'University Entrance', 'Domain Subject', 'PG Admission Domain Prep', 'planner', [
    '- Make one subject blueprint: units, PYQ frequency, key theorists/formulas, and weak units.',
    '- Study in 90-minute blocks: 45 concept, 25 PYQ, 15 recall, 5 error log.',
    '- Mock review should decide what to revise, what to leave, and what to memorise.',
  ]),
  p('du-ba-bcom-bsc-premium', 'Delhi University Semester Prep Premium Pack', ['University Exams', 'Delhi University', 'BA BCom BSc', 'Study Material', 'Semester Strategy'], 'Delhi University', 'Semester Exams', 'BA BCom BSc', 'Semester Prep and Internal Assessment', 'strategy', [
    '- Split each paper into unit notes, tutorial questions, previous papers, and internal assessment tasks.',
    '- Make answer templates for definitions, theory explanation, comparison, criticism, and examples.',
    '- Revise previous year questions after unit completion, not only in the final week.',
  ]),
  p('bhu-entrance-semester-premium', 'BHU Entrance and Semester Premium Pack', ['University Exams', 'BHU', 'Study Material', 'Entrance and Semester Prep'], 'BHU', 'University Exams', 'Entrance and Semester', 'BHU Study System', 'planner', [
    '- Keep entrance prep, course syllabus, and previous papers in separate folders for clarity.',
    '- For semester exams, convert unit-wise syllabus into short answer and long answer prompts.',
    '- Use revision sheets for dates, theories, formulas, definitions, and case examples.',
  ]),
  p('ignou-assignment-exam-premium', 'IGNOU Assignment and Term End Exam Premium Pack', ['University Exams', 'IGNOU', 'Study Material', 'Assignments and TEE'], 'IGNOU', 'Open University', 'Assignments and TEE', 'Assignment Writing and Exam Prep', 'strategy', [
    '- Assignment answers need direct question alignment, course language, examples, and clean references.',
    '- TEE prep should use blocks, units, previous questions, and summary notes.',
    '- Keep one tracker for assignment status, hall ticket, date sheet, and exam revision.',
  ]),
  p('iit-nit-first-year-premium', 'IIT NIT IIIT First Year Common Premium Pack', ['University Exams', 'IITs / NITs / IIITs', 'BTech', 'First Year Common', 'Study Material'], 'IIT NIT IIIT', 'BTech', 'First Year Common', 'Engineering First Year Foundation', 'notes', [
    '- First year core: engineering maths, physics, chemistry, programming, engineering graphics, and basic electrical.',
    '- Build lab-record, assignment, quiz, and end-sem prep as separate workflows.',
    '- Do not wait for end-sem: revise tutorial sheets weekly and mark standard problem types.',
  ]),
  p('engineering-university-cse-premium', 'Engineering University CSE Semester Premium Pack', ['University Exams', 'Engineering Universities', 'BTech', 'Computer Science and Engineering', 'Study Material'], 'Engineering University', 'BTech', 'Computer Science', 'Semester CSE Core', 'notes', [
    '- Core map: programming, DSA, discrete maths, OOP, DBMS, OS, CN, TOC, compiler, and software engineering.',
    '- Pair university notes with coding practice and previous papers for each unit.',
    '- Keep viva questions, lab programs, and theory answers in separate quick folders.',
  ]),
  p('law-university-bare-act-premium', 'Law University Bare Act and Case Law Premium Pack', ['University Exams', 'Law Universities', 'LLB', 'Study Material', 'Bare Acts and Case Law'], 'Law University', 'LLB', 'Law', 'Bare Acts, Cases, and Exam Answers', 'notes', [
    '- For each topic, record section, ingredient, exception, case name, and exam-ready paragraph.',
    '- Moot and exam preparation should share research notes but keep different final outputs.',
    '- Previous papers reveal which doctrines need long-answer templates.',
  ]),
  p('medical-university-mbbs-premium', 'Medical University MBBS Revision Premium Pack', ['University Exams', 'Medical Universities', 'MBBS', 'Study Material', 'Revision System'], 'Medical University', 'MBBS', 'Medical Sciences', 'University Exam Revision', 'planner', [
    '- Prepare topic by topic: definition, classification, etiology, pathology, clinical features, investigation, management.',
    '- Diagrams, flowcharts, tables, and key differentials improve presentation and recall.',
    '- Practical/viva prep needs specimens, instruments, cases, and common examiner questions.',
  ]),
  p('icse-class-10-core-premium', 'ICSE Class 10 Core Subjects Premium Pack', ['School Boards', 'ICSE / ISC', 'Class 10', 'Study Material', 'Core Subjects'], 'ICSE', 'Class 10', 'Core Subjects', 'Board Prep System', 'planner', [
    '- Keep English language, literature, mathematics, science, social studies, and second language in separate folders.',
    '- Literature answers need theme, character, context, quotation memory, and structured explanation.',
    '- Maths and science need formula sheet plus specimen/sample paper timing.',
  ]),
  p('isc-class-12-commerce-premium', 'ISC Class 12 Commerce Premium Pack', ['School Boards', 'ICSE / ISC', 'Class 12', 'Study Material', 'Commerce'], 'ISC', 'Class 12', 'Commerce', 'Accounts, Commerce, Economics, Maths', 'notes', [
    '- Accounts: format, working notes, adjustments, and ledger discipline decide marks.',
    '- Commerce and economics: definitions, diagrams, examples, and case-based answers should be prepared.',
    '- Sample paper review should classify mistakes by concept, format, and time pressure.',
  ]),
  p('state-board-class-10-premium', 'State Board Class 10 Maths Science Premium Pack', ['School Boards', 'State Boards', 'Class 10', 'Study Material', 'Mathematics and Science'], 'State Boards', 'Class 10', 'Mathematics and Science', 'Board Exam Foundation', 'notes', [
    '- Keep board textbook, syllabus, model paper, and chapter notes separated by subject.',
    '- Maths: formulas, solved examples, theorem steps, and repeated paper patterns.',
    '- Science: diagrams, definitions, numericals, experiments, and short-answer keywords.',
  ]),
  p('state-board-class-12-premium', 'State Board Class 12 Stream-wise Premium Pack', ['School Boards', 'State Boards', 'Class 12', 'Study Material', 'Stream-wise Revision'], 'State Boards', 'Class 12', 'Science Commerce Arts', 'Board Exam Stream Planner', 'planner', [
    '- Science: Physics, Chemistry, Maths/Biology folders should each have formula, notes, PYQ, and practical lists.',
    '- Commerce: Accountancy formats, economics diagrams, and business studies case terms need weekly revision.',
    '- Arts: history, polity, geography, and economics need timeline, map, answer framework, and fact file.',
  ]),
  p('olympiad-maths-science-premium', 'Olympiad Maths Science Premium Drill', ['School Boards', 'Olympiads', 'Study Material', 'Maths and Science'], 'Olympiads', 'School Competitive', 'Maths and Science', 'Concept and Puzzle Practice', 'practice', [
    '- Olympiad prep needs concept depth, pattern recognition, and multi-step reasoning beyond textbook examples.',
    '- Keep topic-wise levels: foundation, challenge, mixed, and timed mock.',
    '- Review wrong answers to identify hidden assumptions and careless reading.',
  ]),
  p('scholarship-ntse-foundation-premium', 'Scholarship Exam Foundation Premium Pack', ['School Boards', 'Scholarships', 'Study Material', 'MAT SAT Foundation'], 'Scholarships', 'School Competitive', 'MAT and SAT', 'Scholarship Exam Foundation', 'practice', [
    '- MAT: series, analogy, coding, classification, figure logic, and puzzles need speed drills.',
    '- SAT: class-wise maths, science, social science, and current GK should be revised topic-wise.',
    '- Keep a mock tracker for accuracy, attempt rate, and recurring question pattern.',
  ]),
  p('placement-common-dsa-premium', 'Placement Common DSA Premium Sheet', ['Placement / Private', 'Common Preparation', 'Study Material', 'DSA Sheets'], 'Placement', 'Common Preparation', 'DSA', 'Pattern-based Coding Prep', 'practice', [
    '- Start with arrays, strings, hashing, two pointers, binary search, stack, queue, linked list, trees, graphs, and DP.',
    '- For every solved problem, save pattern, state definition, edge case, and final complexity.',
    '- Weekly review should revisit unsolved, repeated mistakes, and interview explanation quality.',
  ]),
  p('placement-system-design-premium', 'Placement System Design Premium Starter', ['Placement / Private', 'Common Preparation', 'Study Material', 'System Design Notes'], 'Placement', 'Common Preparation', 'System Design', 'HLD and LLD Starter', 'notes', [
    '- HLD: requirements, API, data model, scale estimate, storage, cache, queue, and failure handling.',
    '- LLD: classes, responsibilities, relationships, patterns, and extensibility.',
    '- Use one design template and practise explaining tradeoffs in simple language.',
  ]),
  p('placement-resume-portfolio-premium', 'Placement Resume Portfolio Premium Checklist', ['Placement / Private', 'Common Preparation', 'Resume', 'Portfolio Checklist'], 'Placement', 'Common Preparation', 'Resume and Portfolio', 'ATS and Project Story', 'strategy', [
    '- Resume bullets should show action, technology, impact, and measurable signal.',
    '- Portfolio must show live links, problem statement, tech stack, screenshots, and what you built personally.',
    '- Interview proof comes from project depth, clean code explanation, and tradeoff clarity.',
  ]),
  p('service-it-aptitude-premium', 'Service Based IT Aptitude Premium Pack', ['Placement / Private', 'Service Based IT', 'Study Material', 'Quantitative Aptitude'], 'Service Based IT', 'Campus Placement', 'Aptitude', 'Quant, Reasoning, Verbal', 'practice', [
    ...commonAptitudeBullets,
    '- Company rounds often mix aptitude, communication, programming logic, and HR screening.',
  ]),
  p('product-dsa-oa-premium', 'Product Based OA DSA Premium Pack', ['Placement / Private', 'Product Based', 'Study Material', 'DSA Patterns'], 'Product Based', 'Campus Placement', 'DSA', 'Online Assessment and Interview Patterns', 'practice', [
    '- OA prep: arrays, strings, hashing, binary search, greedy, graph BFS/DFS, and DP basics.',
    '- Interview prep: explain brute force, optimize step by step, and test edge cases verbally.',
    '- Keep company-tagged problems separate from core patterns to avoid shallow memorisation.',
  ]),
  p('jee-main-quickstart-premium', 'JEE Main Quick Start Premium Pack', ['Entrance Exams', 'JEE', 'Study Material', 'PCM Quick Start'], 'JEE Main', 'Engineering Entrance', 'PCM', 'Quick Start for Legacy JEE Folder', 'planner', [
    '- Physics, chemistry, and mathematics should each have formula, NCERT/standard reference, PYQ, and mock-analysis notes.',
    '- Start with high-frequency JEE Main chapters, then connect them with advanced-level mixed practice.',
    '- Keep old JEE and JEE Main + Advanced folders consistent so no student lands on an empty card.',
  ]),
  p('medical-paramedical-nursing-premium', 'Medical Paramedical Nursing Premium Pack', ['Entrance Exams', 'Medical & Paramedical', 'Nursing Entrance', 'Study Material', 'Biology and Aptitude'], 'Medical and Paramedical', 'Entrance', 'Biology and Aptitude', 'Nursing and Paramedical Core Prep', 'notes', [
    '- Biology revision should prioritise human physiology, cell biology, genetics, microbiology basics, and health awareness.',
    '- Aptitude sections need arithmetic, reasoning, English, and basic general awareness timed practice.',
    '- Keep eligibility, application dates, and college preference notes separate from study material.',
  ]),
  p('state-engineering-pcm-premium', 'State Engineering Entrances PCM Premium Pack', ['Entrance Exams', 'State Engineering Entrances', 'Study Material', 'PCM'], 'State Engineering Entrances', 'Engineering Entrance', 'PCM', 'State-Level Engineering Prep', 'practice', [
    '- Align preparation with JEE-level fundamentals but adjust for state-board syllabus emphasis.',
    '- Physics and mathematics need formula fluency; chemistry needs NCERT line revision plus reaction recall.',
    '- Use state previous papers to identify repeated chapter clusters and speed expectations.',
  ]),
  p('teaching-research-ugc-net-paper1-premium', 'UGC NET Paper I Premium Pack', ['Entrance Exams', 'Teaching Research', 'UGC NET', 'Study Material', 'Paper I'], 'UGC NET', 'Teaching Research', 'Paper I', 'Teaching and Research Aptitude', 'notes', [
    '- Paper I core: teaching aptitude, research aptitude, communication, reasoning, DI, ICT, people-development-environment, and higher education.',
    '- Make formula and definition cards for research methods, sampling, statistics basics, and logical reasoning.',
    '- Solve unit-wise previous questions before full mocks so weak units are visible.',
  ]),
  p('engineering-services-aptitude-premium', 'Engineering Services and PSU Aptitude Premium Pack', ['Competitive Exams', 'Engineering Services & PSU', 'Study Material', 'Engineering Aptitude'], 'Engineering Services and PSU', 'Technical Competitive', 'Engineering Aptitude', 'ESE, PSU, and Technical Aptitude Core', 'planner', [
    '- Keep general aptitude, engineering mathematics, technical core, and current technical affairs in separate folders.',
    '- Technical revision should combine formula sheet, standard examples, PYQ, and mock-test repair.',
    '- For PSU routes, maintain company eligibility, discipline requirement, and interview notes separately.',
  ]),
  p('upsc-other-exams-common-gs-premium', 'UPSC Other Exams Common GS Premium Pack', ['Competitive Exams', 'UPSC', 'Other UPSC Exams', 'Study Material', 'Common GS'], 'UPSC Other Exams', 'Central Services', 'Common GS', 'Shared GS for Non-CSE UPSC Exams', 'notes', [
    '- Keep non-CSE UPSC exams separate from UPSC CSE while sharing polity, economy, history, geography, science, and current affairs basics.',
    '- Add exam-specific paper patterns for CAPF, CMS, IES/ISS, Geo-Scientist, and departmental exams.',
    '- Use official notification and syllabus folder first, then attach this pack as revision guidance.',
  ]),
  p('police-si-constable-premium', 'Police SI Constable Premium Pack', ['Competitive Exams', 'Police', 'Study Material', 'Law GK Aptitude'], 'Police Exams', 'Government Jobs', 'Law GK Aptitude', 'Police Recruitment Core Prep', 'notes', [
    '- Core areas: state GK, Indian polity, basic law, reasoning, arithmetic, current affairs, and physical-test awareness.',
    '- Build state-specific notes for police organisation, local geography, schemes, and public safety terms.',
    '- Keep written-test prep and physical-test checklist in separate folders.',
  ]),
  p('postal-services-premium', 'Postal Services Exam Premium Pack', ['Competitive Exams', 'Postal Services', 'Study Material', 'Aptitude and Department Awareness'], 'Postal Services', 'Government Jobs', 'Aptitude and Department Awareness', 'Postal Recruitment Prep', 'notes', [
    '- Prepare arithmetic, reasoning, English/Hindi, computer basics, and postal department awareness.',
    '- Department awareness should include services, terminology, digital initiatives, and customer-facing workflows.',
    '- Use short timed drills because many postal exams reward accuracy in basic questions.',
  ]),
  p('science-research-csir-net-premium', 'Science Research CSIR NET Premium Pack', ['Competitive Exams', 'Science & Research', 'CSIR NET', 'Study Material', 'Research Aptitude'], 'CSIR NET', 'Science and Research', 'Research Aptitude', 'Research Exam Study System', 'planner', [
    '- Split preparation into subject core, mathematical tools, experimental methods, previous papers, and mock analysis.',
    '- Part A aptitude needs reasoning, numerical ability, graph interpretation, and scientific reasoning.',
    '- Keep fellowship eligibility, subject syllabus, and lab/research interest notes in separate folders.',
  ]),
  p('sbi-po-premium', 'SBI PO Quant Reasoning English Premium Pack', ['Competitive Exams', 'Banking', 'SBI PO', 'Study Material', 'Quant Reasoning English'], 'SBI PO', 'Banking', 'Quant Reasoning English', 'PO Prelims and Mains Prep', 'practice', [
    ...commonAptitudeBullets,
    '- Mains prep should add banking awareness, descriptive writing, and high-level DI-reasoning sets.',
  ]),
  p('sbi-clerk-premium', 'SBI Clerk Speed Premium Pack', ['Competitive Exams', 'Banking', 'SBI Clerk', 'Study Material', 'Speed and Accuracy'], 'SBI Clerk', 'Banking', 'Speed and Accuracy', 'Clerk Prelims and Mains Prep', 'practice', [
    '- Build high-speed basics: simplification, number series, inequality, syllogism, cloze, and RC.',
    '- Accuracy comes from avoiding over-attempting hard puzzles in the first pass.',
    '- Keep daily sectional scores to detect whether speed or concept is the blocker.',
  ]),
  p('rbi-grade-b-premium', 'RBI Grade B Finance ESI Premium Pack', ['Competitive Exams', 'Banking', 'RBI Grade B', 'Study Material', 'Finance ESI Management'], 'RBI Grade B', 'Banking', 'Finance ESI Management', 'Officer Exam Core Prep', 'notes', [
    '- ESI: growth, inflation, poverty, social sector, sustainable development, and government schemes.',
    '- Finance: banking, RBI functions, markets, monetary policy, financial inclusion, and regulation basics.',
    '- Management: leadership, motivation, communication, ethics, HR, and organisational behaviour.',
  ]),
  p('rbi-assistant-premium', 'RBI Assistant Premium Pack', ['Competitive Exams', 'Banking', 'RBI Assistant', 'Study Material', 'Prelims and Mains'], 'RBI Assistant', 'Banking', 'Prelims and Mains', 'Assistant Exam Prep', 'practice', [
    '- Prelims: quant, reasoning, and English speed with strict accuracy tracking.',
    '- Mains: add computer knowledge and general awareness with banking focus.',
    '- Keep easy-question capture rate above 90 percent before increasing difficulty.',
  ]),
  p('nabard-grade-a-premium', 'NABARD Grade A Agriculture ESI Premium Pack', ['Competitive Exams', 'Banking', 'NABARD Grade A', 'Study Material', 'Agriculture ESI'], 'NABARD Grade A', 'Banking', 'Agriculture ESI', 'Rural Development and Agriculture', 'notes', [
    '- Agriculture: soil, irrigation, crops, animal husbandry, agri-economy, and rural development schemes.',
    '- ESI: rural economy, inclusion, poverty, employment, inflation, and government initiatives.',
    '- Descriptive answers should include data, scheme examples, and rural-sector context.',
  ]),
  p('sebi-grade-a-premium', 'SEBI Grade A Finance Securities Premium Pack', ['Competitive Exams', 'Banking', 'SEBI Grade A', 'Study Material', 'Finance Securities Market'], 'SEBI Grade A', 'Regulatory Exams', 'Finance and Securities Market', 'Capital Market Prep', 'notes', [
    '- Core areas: securities market, financial management, costing, companies act basics, economics, and current finance.',
    '- Maintain glossary cards for market instruments, intermediaries, regulations, and investor protection terms.',
    '- Practice descriptive answers with examples from market regulation and corporate governance.',
  ]),
  p('ibps-rrb-po-premium', 'IBPS RRB PO Rural Banking Premium Pack', ['Competitive Exams', 'Banking', 'IBPS RRB PO', 'Study Material', 'Rural Banking'], 'IBPS RRB PO', 'Banking', 'Rural Banking', 'Regional Rural Bank Officer Prep', 'notes', [
    '- Add rural banking, priority sector, agriculture credit, self-help groups, and local language awareness to standard banking prep.',
    '- Reasoning and quant should be practised in sectional bursts with high accuracy.',
    '- Interview prep needs rural economy examples and banking product clarity.',
  ]),
  p('ibps-rrb-clerk-premium', 'IBPS RRB Clerk Speed Premium Pack', ['Competitive Exams', 'Banking', 'IBPS RRB Clerk', 'Study Material', 'Speed and Banking Awareness'], 'IBPS RRB Clerk', 'Banking', 'Speed and Banking Awareness', 'RRB Office Assistant Prep', 'practice', [
    '- Prelims depends on quant and reasoning speed without over-solving hard sets.',
    '- Mains adds computer knowledge, general awareness, banking awareness, and language clarity.',
    '- Local banking examples improve both written prep and interview confidence.',
  ]),
  p('ibps-so-premium', 'IBPS SO Professional Knowledge Premium Pack', ['Competitive Exams', 'Banking', 'IBPS SO', 'Study Material', 'Professional Knowledge'], 'IBPS SO', 'Banking', 'Professional Knowledge', 'Specialist Officer Prep', 'notes', [
    '- Keep professional knowledge separate by role: IT, HR, marketing, law, agriculture, and rajbhasha.',
    '- Standard banking sections still need quant, reasoning, English, and banking awareness revision.',
    '- Interview preparation should connect qualification, domain depth, and banking use case.',
  ]),
  p('lic-aao-premium', 'LIC AAO Insurance Awareness Premium Pack', ['Competitive Exams', 'Banking', 'LIC AAO', 'Study Material', 'Insurance Awareness'], 'LIC AAO', 'Insurance', 'Insurance Awareness', 'Insurance Officer Prep', 'notes', [
    '- Insurance awareness: principles, terms, products, regulation, claim process, and financial inclusion.',
    '- Add reasoning, quant, English, GA, and computer basics to the insurance core.',
    '- Descriptive writing should be concise, structured, and policy-aware.',
  ]),
  p('iims-mba-case-quant-premium', 'IIMs MBA Case Quant Premium Pack', ['University Exams', 'IIMs', 'MBA', 'Study Material', 'Case Quant Communication'], 'IIMs', 'MBA', 'Case Quant Communication', 'MBA Classroom and Interview Prep', 'strategy', [
    '- Case prep should separate facts, assumptions, options, recommendation, risks, and implementation.',
    '- Quant and analytics notes help in pre-term, summer placements, and finance/marketing cases.',
    '- Communication practice should convert project, internship, and leadership stories into crisp STAR notes.',
  ]),
  p('iits-semester-research-premium', 'IITs Semester Research Premium Pack', ['University Exams', 'IITs', 'BTech MTech PhD', 'Study Material', 'Semester and Research'], 'IITs', 'University Exams', 'Semester and Research', 'Coursework, Labs, and Research Prep', 'planner', [
    '- Coursework folders should separate lecture notes, assignments, tutorials, lab files, and previous papers.',
    '- Research prep needs paper notes, methods, datasets, experiments, and advisor discussion points.',
    '- End-sem prep should start from assignment mistakes and tutorial question patterns.',
  ]),
  p('agricultural-universities-premium', 'Agricultural Universities Premium Pack', ['University Exams', 'Agricultural Universities', 'BSc Agriculture', 'Study Material', 'Agronomy Soil Horticulture'], 'Agricultural Universities', 'BSc Agriculture', 'Agronomy Soil Horticulture', 'Agriculture University Core', 'notes', [
    '- Core subjects: agronomy, soil science, horticulture, plant breeding, plant pathology, entomology, and extension.',
    '- Keep crop calendars, soil properties, pest-disease tables, and practical records in separate notes.',
    '- Previous papers help prioritise definitions, classifications, diagrams, and applied questions.',
  ]),
  p('open-universities-premium', 'Open Universities Study Planner Premium Pack', ['University Exams', 'Open Universities', 'Study Material', 'Assignments and Term End Exams'], 'Open Universities', 'Distance Education', 'Assignments and TEE', 'Distance Learning Study System', 'planner', [
    '- Build a tracker for enrollment, assignment submission, study blocks, exam form, hall ticket, and date sheet.',
    '- Assignment answers should follow course units and include examples without copying large passages.',
    '- TEE prep should prioritise unit summaries and previous question repetition.',
  ]),
  p('university-entrance-tests-premium', 'University Entrance Tests Premium Pack', ['University Exams', 'University Entrance Tests', 'Study Material', 'Aptitude and Domain'], 'University Entrance Tests', 'University Entrance', 'Aptitude and Domain', 'Common Admission Prep', 'practice', [
    '- Separate aptitude, English, reasoning, and domain subject folders for every university route.',
    '- Use official syllabus and previous paper first; this pack is for study planning and revision.',
    '- Keep eligibility, application, admit card, result, and preference notes away from study notes.',
  ]),
  p('mppsc-state-gs-premium', 'MPPSC State GS Premium Pack', ['State Exams', 'MPPSC State Service', 'State GK', 'Madhya Pradesh Special GS'], 'MPPSC', 'State PSC', 'Madhya Pradesh GS', 'State Civil Services Prep', 'notes', [
    '- Prepare Madhya Pradesh geography, history, culture, economy, schemes, and administrative structure separately.',
    '- Link national GS topics with state examples for mains answer enrichment.',
    '- Keep monthly state current affairs and budget highlights in one revision file.',
  ]),
  p('rpsc-state-gs-premium', 'RPSC Rajasthan GS Premium Pack', ['State Exams', 'RPSC RAS', 'State GK', 'Rajasthan Special GS'], 'RPSC', 'State PSC', 'Rajasthan GS', 'State Civil Services Prep', 'notes', [
    '- Rajasthan history, art-culture, geography, polity, economy, and schemes should be mapped topic-wise.',
    '- Use district examples, folk traditions, and local geography in mains answers.',
    '- PYQ analysis should mark repeated themes and factual traps.',
  ]),
  p('mpsc-state-gs-premium', 'MPSC Maharashtra GS Premium Pack', ['State Exams', 'MPSC Rajyaseva', 'State GK', 'Maharashtra Special GS'], 'MPSC', 'State PSC', 'Maharashtra GS', 'State Civil Services Prep', 'notes', [
    '- Maharashtra geography, economy, social reform movements, polity, and schemes need a dedicated fact file.',
    '- Add map practice and district-wise current affairs to static state notes.',
    '- Mains answers should connect constitutional concepts with Maharashtra administration examples.',
  ]),
  p('fci-central-services-premium', 'FCI Central Services Premium Pack', ['Competitive Exams', 'Other Central Services', 'FCI', 'Study Material', 'Aptitude and GA'], 'FCI', 'Central Services', 'Aptitude and GA', 'Food Corporation Exam Prep', 'practice', [
    '- Prepare quant, reasoning, English, general awareness, computer basics, and role-specific technical basics.',
    '- Food sector awareness should include procurement, storage, distribution, food security, and public distribution terms.',
    '- Use timed section drills to improve speed before full-paper mocks.',
  ]),
  p('epfo-apfc-premium', 'EPFO APFC Labour Social Security Premium Pack', ['Competitive Exams', 'Banking', 'EPFO APFC', 'Study Material', 'Labour Social Security'], 'EPFO APFC', 'Central Services', 'Labour and Social Security', 'EPFO Officer Prep', 'notes', [
    '- Core: labour laws, social security, Indian economy, polity, accounting basics, industrial relations, and current affairs.',
    '- Keep scheme, act, section, institution, and keyword notes in separate tables.',
    '- Interview prep should connect administration, welfare, compliance, and public service examples.',
  ]),
  p('esic-sso-premium', 'ESIC SSO Social Security Premium Pack', ['Competitive Exams', 'Banking', 'ESIC SSO', 'Study Material', 'Social Security and Aptitude'], 'ESIC SSO', 'Central Services', 'Social Security and Aptitude', 'ESIC Officer Prep', 'notes', [
    '- Add social security, labour welfare, insurance basics, government schemes, and organisation awareness to standard aptitude.',
    '- Computer and office workflow basics should be revised in short notes.',
    '- Descriptive and interview prep should use service-delivery examples.',
  ]),
  p('lic-ado-premium', 'LIC ADO Insurance Sales Premium Pack', ['Competitive Exams', 'Banking', 'LIC ADO', 'Study Material', 'Insurance and Sales Aptitude'], 'LIC ADO', 'Insurance', 'Insurance and Sales Aptitude', 'Development Officer Prep', 'notes', [
    '- Prepare insurance products, customer needs, sales process, regulation basics, and financial awareness.',
    '- Aptitude practice should include quant, reasoning, English, and general awareness.',
    '- Interview stories should show communication, target ownership, and ethical sales behaviour.',
  ]),
  p('afcat-premium', 'AFCAT Defence Aptitude Premium Pack', ['Competitive Exams', 'Defence', 'AFCAT', 'Study Material', 'Aptitude and Defence Awareness'], 'AFCAT', 'Defence', 'Aptitude and Defence Awareness', 'Air Force Officer Prep', 'practice', [
    '- Core: verbal ability, numerical ability, reasoning, military aptitude, and general awareness.',
    '- Defence awareness should include ranks, commands, aircraft basics, exercises, and current defence news.',
    '- Practice OIR-style reasoning and speed calculation in short daily sets.',
  ]),
  p('agniveer-air-force-premium', 'Agniveer Air Force Premium Pack', ['Competitive Exams', 'Defence', 'Agniveer Air Force', 'Study Material', 'Science Maths English GK'], 'Agniveer Air Force', 'Defence', 'Science Maths English GK', 'Air Force Entry Prep', 'notes', [
    '- Science stream prep should separate physics, mathematics, English, and reasoning/GK.',
    '- Formula sheets and unit conversion drills improve scoring in technical questions.',
    '- Keep physical standards and document checklist away from study notes but visible.',
  ]),
  p('agniveer-army-premium', 'Agniveer Army Premium Pack', ['Competitive Exams', 'Defence', 'Agniveer Army', 'Study Material', 'GK Maths Reasoning'], 'Agniveer Army', 'Defence', 'GK Maths Reasoning', 'Army Entry Prep', 'practice', [
    '- Prepare arithmetic, reasoning, general knowledge, science basics, and defence awareness.',
    '- Daily physical-test routine and written-test prep should be tracked separately.',
    '- Use short mock tests to build accuracy in basic but fast questions.',
  ]),
  p('agniveer-navy-premium', 'Agniveer Navy Premium Pack', ['Competitive Exams', 'Defence', 'Agniveer Navy', 'Study Material', 'Science Maths GK'], 'Agniveer Navy', 'Defence', 'Science Maths GK', 'Navy Entry Prep', 'notes', [
    '- Core subjects: mathematics, science, English, and general awareness with naval terminology.',
    '- Keep formula notes, current defence awareness, and vocabulary revision in separate folders.',
    '- Practice timed mixed papers because selection pressure is speed plus basics.',
  ]),
  p('coast-guard-navik-premium', 'Coast Guard Navik Premium Pack', ['Competitive Exams', 'Defence', 'Coast Guard Navik', 'Study Material', 'Maths Science GK'], 'Coast Guard Navik', 'Defence', 'Maths Science GK', 'Coast Guard Entry Prep', 'practice', [
    '- Prepare maths, science, reasoning, English, and maritime/general awareness.',
    '- Keep physical-test checklist and document checklist separate from study material.',
    '- Timed section drills should target easy-question accuracy first.',
  ]),
  p('ib-acio-premium', 'IB ACIO GS Reasoning Premium Pack', ['Competitive Exams', 'Defence', 'IB ACIO', 'Study Material', 'GS Reasoning English'], 'IB ACIO', 'Central Security', 'GS Reasoning English', 'Intelligence Bureau Exam Prep', 'notes', [
    '- Core: current affairs, history, polity, geography, economy, science, reasoning, quant, and English.',
    '- Security awareness should stay factual and exam-oriented, not speculative.',
    '- Descriptive writing needs crisp structure, balanced points, and examples.',
  ]),
  p('ssb-interview-premium', 'SSB Interview Premium Pack', ['Competitive Exams', 'Defence', 'SSB Interview', 'Interview', 'Officer Like Qualities'], 'SSB Interview', 'Defence', 'Interview', 'OLQ and Communication Prep', 'strategy', [
    '- Prepare self-description, life events, leadership examples, current awareness, and service motivation.',
    '- Practise narration, group discussion, lecturette, and personal interview answers without memorised scripts.',
    '- Keep fitness, documents, and travel checklist separate from interview notes.',
  ]),
  p('aibe-law-premium', 'AIBE Bare Act Premium Pack', ['Competitive Exams', 'Judiciary', 'AIBE', 'Study Material', 'Bare Acts'], 'AIBE', 'Law Exam', 'Bare Acts', 'All India Bar Exam Prep', 'notes', [
    '- Focus on bare act navigation, legal principles, professional ethics, constitutional basics, and procedural law.',
    '- Make quick indexes for important sections, definitions, exceptions, and landmark principles.',
    '- Practice previous papers in open-book style to improve search speed and legal comprehension.',
  ]),
  p('delhi-judicial-service-premium', 'Delhi Judicial Service Premium Pack', ['Competitive Exams', 'Judiciary', 'Delhi Judicial Service', 'Study Material', 'Law and Judgment Writing'], 'Delhi Judicial Service', 'Judiciary', 'Law and Judgment Writing', 'Judicial Services Prep', 'notes', [
    '- Core law: CPC, CrPC/BNSS transition, IPC/BNS transition, Evidence, Constitution, Contract, Torts, and local acts.',
    '- Judgment writing needs facts, issues, law, analysis, and order in disciplined format.',
    '- PYQ review should tag repeated sections and problem-style patterns.',
  ]),
  p('up-pcsj-premium', 'UP PCS-J Premium Pack', ['Competitive Exams', 'Judiciary', 'UP PCS-J', 'Study Material', 'Law and Local Acts'], 'UP PCS-J', 'Judiciary', 'Law and Local Acts', 'UP Judicial Services Prep', 'notes', [
    '- Prepare major laws with section notes, illustrations, exceptions, and short-answer templates.',
    '- Add Uttar Pradesh local acts and language paper practice in separate folders.',
    '- Mains answers should include issue framing, section reference, case principle, and conclusion.',
  ]),
  p('up-police-constable-premium', 'UP Police Constable Premium Pack', ['Competitive Exams', 'Police', 'UP Police Constable', 'Study Material', 'UP GK Reasoning Maths'], 'UP Police Constable', 'Police Exams', 'UP GK Reasoning Maths', 'Constable Exam Prep', 'practice', [
    '- Prepare UP GK, history, geography, polity basics, current affairs, reasoning, maths, and Hindi.',
    '- Keep physical-test checklist separate from written-test study notes.',
    '- Use short daily mocks to improve basic-question speed and accuracy.',
  ]),
  p('up-police-si-premium', 'UP Police SI Premium Pack', ['Competitive Exams', 'Police', 'UP Police SI', 'Study Material', 'Law GK Aptitude'], 'UP Police SI', 'Police Exams', 'Law GK Aptitude', 'Sub Inspector Exam Prep', 'notes', [
    '- Core: law basics, constitution, general Hindi, numerical ability, reasoning, UP GK, and current affairs.',
    '- Law notes should define offence, power, procedure, and public-order context simply.',
    '- Mock review should separate legal concept mistakes from speed mistakes.',
  ]),
  p('delhi-police-si-premium', 'Delhi Police SI Premium Pack', ['Competitive Exams', 'Police', 'Delhi Police SI', 'Study Material', 'SSC Pattern Prep'], 'Delhi Police SI', 'Police Exams', 'SSC Pattern Prep', 'SI Exam Prep', 'practice', [
    '- Prepare quant, reasoning, English, general awareness, and police/current affairs basics.',
    '- SSC-style sectional drills help maintain speed and reduce careless mistakes.',
    '- Keep PET/PST checklist and medical standards in a separate tracker.',
  ]),
  p('bihar-police-premium', 'Bihar Police Premium Pack', ['Competitive Exams', 'Police', 'Bihar Police', 'Study Material', 'Bihar GK Aptitude'], 'Bihar Police', 'Police Exams', 'Bihar GK Aptitude', 'Police Recruitment Prep', 'notes', [
    '- Bihar GK should cover geography, history, culture, economy, schemes, personalities, and current affairs.',
    '- Add arithmetic, reasoning, Hindi/English basics, and science-general awareness practice.',
    '- Use state-specific examples in interview or document-verification preparation.',
  ]),
  p('india-post-gds-premium', 'India Post GDS Premium Pack', ['Competitive Exams', 'Postal Services', 'India Post GDS', 'Study Material', 'Postal Awareness'], 'India Post GDS', 'Postal Services', 'Postal Awareness', 'GDS Recruitment Prep', 'notes', [
    '- Prepare postal services, digital products, branch office workflow, customer service, and basic computer awareness.',
    '- Keep document, eligibility, merit, and application tracker outside study notes.',
    '- Short factual revision cards work better than long theory notes for this folder.',
  ]),
  p('ssc-chsl-premium', 'SSC CHSL Speed Premium Pack', ['Competitive Exams', 'SSC', 'SSC CHSL', 'Study Material', 'Speed and Accuracy'], 'SSC CHSL', 'SSC', 'Speed and Accuracy', 'CHSL Tier Prep', 'practice', [
    '- Focus on arithmetic basics, reasoning patterns, English grammar, vocabulary, and general awareness repeats.',
    '- CHSL scoring improves with short section bursts and careful easy-question capture.',
    '- Keep typing/skill-test awareness separate from written-test notes.',
  ]),
  p('ssc-cpo-premium', 'SSC CPO Premium Pack', ['Competitive Exams', 'SSC', 'SSC CPO', 'Study Material', 'Quant Reasoning GS English'], 'SSC CPO', 'SSC', 'Quant Reasoning GS English', 'Sub Inspector Exam Prep', 'practice', [
    '- Prepare SSC-style quant, reasoning, English, and general awareness with extra policing/current affairs notes.',
    '- PET/PST standards and document checklist should stay in a separate tracker.',
    '- Mock review should identify skipped topics, not just final score.',
  ]),
  p('ssc-gd-premium', 'SSC GD Constable Premium Pack', ['Competitive Exams', 'SSC', 'SSC GD Constable', 'Study Material', 'GK Reasoning Maths Hindi English'], 'SSC GD Constable', 'SSC', 'GK Reasoning Maths Hindi English', 'Constable Exam Prep', 'practice', [
    '- Build basics in general intelligence, elementary mathematics, general awareness, and language.',
    '- Use fast daily drills because question difficulty is moderate but time discipline matters.',
    '- Keep physical-test preparation and written-test preparation tracked separately.',
  ]),
  p('ssc-je-premium', 'SSC JE Technical Premium Pack', ['Competitive Exams', 'SSC', 'SSC JE', 'Study Material', 'Technical and General'], 'SSC JE', 'SSC', 'Technical and General', 'Junior Engineer Prep', 'notes', [
    '- Separate civil, electrical, and mechanical technical notes from general awareness and reasoning.',
    '- Technical revision should include formula sheets, standard numericals, and previous paper themes.',
    '- Mock review should tag mistakes by formula, concept, unit, and time pressure.',
  ]),
  p('ssc-mts-premium', 'SSC MTS Premium Pack', ['Competitive Exams', 'SSC', 'SSC MTS', 'Study Material', 'Basic Aptitude and GK'], 'SSC MTS', 'SSC', 'Basic Aptitude and GK', 'MTS Exam Prep', 'practice', [
    '- Prepare numerical ability, reasoning, English/Hindi language basics, and general awareness.',
    '- Easy-question accuracy is the main scoring lever; avoid spending too long on one puzzle.',
    '- Revise static GK and current affairs in small daily sets.',
  ]),
  p('ssc-stenographer-premium', 'SSC Stenographer Premium Pack', ['Competitive Exams', 'SSC', 'SSC Stenographer', 'Study Material', 'Written and Skill Test'], 'SSC Stenographer', 'SSC', 'Written and Skill Test', 'Steno Exam Prep', 'strategy', [
    '- Written prep covers reasoning, general awareness, and English language.',
    '- Skill-test prep needs regular dictation, transcription accuracy, and speed tracking.',
    '- Keep shorthand practice logs separate from written mock analysis.',
  ]),
  p('rrb-group-d-premium', 'RRB Group D Premium Pack', ['Competitive Exams', 'Railway', 'RRB Group D', 'Study Material', 'Maths Reasoning Science GK'], 'RRB Group D', 'Railway', 'Maths Reasoning Science GK', 'Railway Group D Prep', 'practice', [
    '- Core areas: mathematics, general intelligence, general science, and general awareness/current affairs.',
    '- General science should be revised from class 9-10 level basics with diagrams and formulas.',
    '- Use short timed mocks to improve basic-question speed.',
  ]),
  p('rrb-alp-premium', 'RRB ALP Premium Pack', ['Competitive Exams', 'Railway', 'RRB ALP', 'Study Material', 'Technical and Aptitude'], 'RRB ALP', 'Railway', 'Technical and Aptitude', 'Assistant Loco Pilot Prep', 'notes', [
    '- Prepare mathematics, reasoning, general science, general awareness, and trade/technical basics.',
    '- Technical notes should include safety, electrical/mechanical basics, tools, and standard trade questions.',
    '- Stage-wise prep should keep CBT 1, CBT 2, and aptitude-test notes separate.',
  ]),
  p('rrb-je-premium', 'RRB JE Technical Premium Pack', ['Competitive Exams', 'Railway', 'RRB JE', 'Study Material', 'Technical and General'], 'RRB JE', 'Railway', 'Technical and General', 'Junior Engineer Prep', 'notes', [
    '- Technical revision should be branch-wise: civil, electrical, mechanical, electronics, or computer science.',
    '- General sections need maths, reasoning, science, GK, computer basics, and environment awareness.',
    '- Keep formula, standard problems, and previous paper themes in one revision loop.',
  ]),
  p('rpf-constable-si-premium', 'RPF Constable SI Premium Pack', ['Competitive Exams', 'Railway', 'RPF Constable SI', 'Study Material', 'Railway Police Prep'], 'RPF Constable SI', 'Railway', 'Railway Police Prep', 'RPF Written and Physical Prep', 'practice', [
    '- Written areas: general awareness, arithmetic, and reasoning with railway and security awareness.',
    '- Physical standards and event practice should be tracked separately.',
    '- Maintain a daily GK and current affairs revision streak.',
  ]),
  p('metro-rail-premium', 'Metro Rail Exams Premium Pack', ['Competitive Exams', 'Railway', 'Metro Rail Exams', 'Study Material', 'Technical Aptitude'], 'Metro Rail Exams', 'Railway', 'Technical Aptitude', 'Metro Recruitment Prep', 'notes', [
    '- Prepare technical branch basics, general aptitude, reasoning, computer basics, and safety awareness.',
    '- Metro operations terms, signalling basics, customer service, and safety rules are useful awareness areas.',
    '- Use company-specific notification folders for eligibility and post-wise pattern.',
  ]),
  p('barc-science-premium', 'BARC Science Research Premium Pack', ['Competitive Exams', 'Science & Research', 'BARC', 'Study Material', 'Technical Core'], 'BARC', 'Science and Research', 'Technical Core', 'Research and Technical Officer Prep', 'notes', [
    '- Keep branch-wise technical notes, engineering maths/science tools, previous questions, and interview notes separate.',
    '- Research aptitude should include basics of experiments, safety, measurement, and data interpretation.',
    '- Interview stories should show project depth and technical clarity.',
  ]),
  p('drdo-scientist-premium', 'DRDO Scientist Premium Pack', ['Competitive Exams', 'Science & Research', 'DRDO', 'Study Material', 'Technical and Research'], 'DRDO', 'Science and Research', 'Technical and Research', 'Defence Research Prep', 'planner', [
    '- Technical prep should align with branch syllabus and project experience.',
    '- Research notes should include methods, design tradeoffs, testing, reliability, and defence application awareness.',
    '- Keep interview presentation points concise and evidence-based.',
  ]),
  p('isro-scientist-premium', 'ISRO Scientist Premium Pack', ['Competitive Exams', 'Science & Research', 'ISRO Scientist', 'Study Material', 'Technical Core'], 'ISRO Scientist', 'Science and Research', 'Technical Core', 'Space Research Technical Prep', 'notes', [
    '- Prepare branch-wise fundamentals with high accuracy in standard technical problems.',
    '- Add space mission awareness, reliability thinking, and engineering tradeoff notes.',
    '- Review past technical questions for recurring formulas and conceptual traps.',
  ]),
  p('direct-psu-premium', 'Direct Recruitment PSU Premium Pack', ['Competitive Exams', 'Engineering Services & PSU', 'Direct Recruitment PSU', 'Study Material', 'Technical Aptitude'], 'Direct Recruitment PSU', 'PSU', 'Technical Aptitude', 'PSU Direct Recruitment Prep', 'strategy', [
    '- Keep company notification, discipline eligibility, technical syllabus, aptitude, and interview notes separate.',
    '- Technical revision should focus on standard branch fundamentals and high-frequency interview areas.',
    '- Prepare HR stories around project, internship, safety, teamwork, and public-sector motivation.',
  ]),
  p('gate-based-psu-premium', 'GATE Based PSU Recruitment Premium Pack', ['Competitive Exams', 'Engineering Services & PSU', 'GATE Based PSU Recruitment', 'Study Material', 'Interview and Shortlisting'], 'GATE Based PSU Recruitment', 'PSU', 'Interview and Shortlisting', 'PSU Post-GATE Prep', 'strategy', [
    '- Keep PSU shortlisting, branch preference, company profile, and interview prep outside the GATE study folder.',
    '- Technical interview notes should convert GATE topics into explainable fundamentals.',
    '- HR prep should connect role, location flexibility, public-sector motivation, and safety responsibility.',
  ]),
  p('teaching-ugc-net-competitive-premium', 'Teaching UGC NET Premium Pack', ['Competitive Exams', 'Teaching', 'UGC NET', 'Study Material', 'Paper I and Domain'], 'UGC NET', 'Teaching', 'Paper I and Domain', 'NET JRF Prep', 'planner', [
    '- Paper I needs teaching aptitude, research, communication, reasoning, DI, ICT, environment, and higher education.',
    '- Domain prep should be unit-wise with previous question frequency and definition/formula/theory cards.',
    '- Mock review should separate Paper I weakness from subject-domain weakness.',
  ]),
  p('kvs-teacher-premium', 'KVS Teacher Premium Pack', ['Competitive Exams', 'Teaching', 'KVS Teacher', 'Study Material', 'Pedagogy Subject GK'], 'KVS Teacher', 'Teaching', 'Pedagogy Subject GK', 'School Teacher Recruitment Prep', 'notes', [
    '- Prepare pedagogy, subject knowledge, general awareness, reasoning, computer literacy, and language competence.',
    '- Classroom examples should connect child behaviour, method, assessment, and inclusive education.',
    '- Keep demo lesson and interview notes separate from written-test prep.',
  ]),
  p('nvs-teacher-premium', 'NVS Teacher Premium Pack', ['Competitive Exams', 'Teaching', 'NVS Teacher', 'Study Material', 'Pedagogy Subject GK'], 'NVS Teacher', 'Teaching', 'Pedagogy Subject GK', 'Residential School Teacher Prep', 'notes', [
    '- Add residential school context, pedagogy, subject depth, general awareness, reasoning, and language clarity.',
    '- Prepare examples for classroom management, activity-based learning, and inclusive support.',
    '- Written-test and interview preparation should run in parallel after syllabus mapping.',
  ]),
  p('dsssb-teacher-premium', 'DSSSB Teacher Premium Pack', ['Competitive Exams', 'Teaching', 'DSSSB Teacher', 'Study Material', 'Teaching Aptitude Subject'], 'DSSSB Teacher', 'Teaching', 'Teaching Aptitude Subject', 'Delhi Teacher Recruitment Prep', 'practice', [
    '- Prepare teaching methodology, subject content, Hindi/English, reasoning, arithmetic, and Delhi/current awareness.',
    '- PYQ-based topic frequency is useful because DSSSB often repeats pattern families.',
    '- Keep subject-specific notes and general section notes in separate folders.',
  ]),
  p('reet-teacher-premium', 'REET Premium Pack', ['Competitive Exams', 'Teaching', 'REET', 'Study Material', 'Pedagogy Rajasthan GK'], 'REET', 'Teaching', 'Pedagogy Rajasthan GK', 'Rajasthan Teacher Eligibility Prep', 'notes', [
    '- Prepare child development, pedagogy, language, mathematics/EVS or subject content, and Rajasthan GK.',
    '- Pedagogy notes should include classroom examples and assessment terms.',
    '- State-specific current affairs and culture facts should be revised weekly.',
  ]),
  p('uptet-super-tet-premium', 'UPTET Super TET Premium Pack', ['Competitive Exams', 'Teaching', 'UPTET', 'Study Material', 'Pedagogy UP GK'], 'UPTET', 'Teaching', 'Pedagogy UP GK', 'UP Teacher Eligibility Prep', 'practice', [
    '- Prepare CDP, pedagogy, language, maths, EVS, subject content, and Uttar Pradesh GK/current affairs.',
    '- Super TET needs deeper subject and state-awareness revision after eligibility basics.',
    '- Keep one mistake log for pedagogy terms and one for factual state questions.',
  ]),
  p('bihar-stet-premium', 'Bihar STET Premium Pack', ['Competitive Exams', 'Teaching', 'Bihar STET', 'Study Material', 'Subject and Pedagogy'], 'Bihar STET', 'Teaching', 'Subject and Pedagogy', 'Bihar Teacher Eligibility Prep', 'notes', [
    '- Subject depth should be revised by syllabus unit, not random chapter order.',
    '- Add Bihar GK/current affairs and pedagogy examples where the pattern requires it.',
    '- Practice previous papers to identify repeated subject and teaching-method themes.',
  ]),
  p('htet-premium', 'HTET Premium Pack', ['Competitive Exams', 'Teaching', 'HTET', 'Study Material', 'Pedagogy Haryana GK'], 'HTET', 'Teaching', 'Pedagogy Haryana GK', 'Haryana Teacher Eligibility Prep', 'practice', [
    '- Prepare child development, pedagogy, language, subject content, and Haryana GK/current affairs.',
    '- Keep level-wise notes for PRT, TGT, and PGT preparation.',
    '- Short mocks should track accuracy by pedagogy, language, and subject content.',
  ]),
  p('delhi-police-constable-premium', 'Delhi Police Constable Premium Pack', ['Competitive Exams', 'Police', 'Delhi Police Constable', 'Study Material', 'SSC Pattern Basics'], 'Delhi Police Constable', 'Police Exams', 'SSC Pattern Basics', 'Constable Exam Prep', 'practice', [
    '- Prepare reasoning, general awareness, numerical ability, computer basics, and language basics.',
    '- Delhi and policing awareness should be short factual revision, not long theory.',
    '- Keep PET/PST checklist and written mock analysis separate.',
  ]),
  p('mp-police-premium', 'MP Police Premium Pack', ['Competitive Exams', 'Police', 'MP Police', 'Study Material', 'MP GK Aptitude'], 'MP Police', 'Police Exams', 'MP GK Aptitude', 'State Police Prep', 'notes', [
    '- MP GK should cover geography, history, culture, economy, schemes, and current affairs.',
    '- Aptitude includes maths, reasoning, Hindi/English basics, and science-general awareness.',
    '- Practice in short timed blocks to improve easy-question capture.',
  ]),
  p('rajasthan-police-premium', 'Rajasthan Police Premium Pack', ['Competitive Exams', 'Police', 'Rajasthan Police', 'Study Material', 'Rajasthan GK Aptitude'], 'Rajasthan Police', 'Police Exams', 'Rajasthan GK Aptitude', 'State Police Prep', 'notes', [
    '- Rajasthan GK needs history, art-culture, geography, polity, schemes, and current affairs.',
    '- Written prep should combine reasoning, maths, language, and state facts.',
    '- Keep physical-test and document checklist as a separate action sheet.',
  ]),
  p('india-post-postman-mts-premium', 'India Post Postman MTS Premium Pack', ['Competitive Exams', 'Postal Services', 'India Post Postman MTS', 'Study Material', 'Postal Aptitude'], 'India Post Postman MTS', 'Postal Services', 'Postal Aptitude', 'Postal Exam Prep', 'practice', [
    '- Prepare postal awareness, general knowledge, maths, reasoning, English/Hindi, and computer basics.',
    '- Postal workflow and customer service terms should be revised as short factual cards.',
    '- Use daily mini tests because the paper rewards basic accuracy.',
  ]),
];

const packMatchesOnlyFilter = (pack: PremiumPack) => {
  if (!onlyFilterRaw) return true;
  const needle = normalizeKey(onlyFilterRaw);
  const haystack = normalizeKey([
    pack.id,
    pack.title,
    pack.exam,
    pack.stage,
    pack.subject,
    pack.topic,
    ...pack.targetPath,
  ].join(' '));
  return haystack.includes(needle);
};

const selectedPacks = packs.filter(packMatchesOnlyFilter);

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

const verifyPlacements = async (workspaceId: Types.ObjectId, packsToVerify: PremiumPack[] = packs) => {
  let present = 0;
  for (const pack of packsToVerify) {
    const card = await findPath(workspaceId, pack.targetPath);
    const url = packUrl(pack);
    if (card && (card.files || []).some((file: any) => String(file.url || '') === url && (file.status || 'published') !== 'archived')) {
      present += 1;
    }
  }
  return present;
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await getWorkspace();
  if (!workspace) throw new Error('Study Hub workspace not found.');

  console.log(`${verifyOnly ? 'Verifying' : shouldApply ? 'Applying' : 'Dry run'} remaining premium content packs.`);
  console.log(`Prepared packs: ${selectedPacks.length}/${packs.length}${onlyFilterRaw ? ` for --only=${onlyFilterRaw}` : ''}.`);

  if (!verifyOnly) {
    for (const pack of selectedPacks) {
      stats.packsPrepared += 1;
      await attachPack(workspace._id, pack);
    }
  }

  if (!onlyFilterRaw) {
    const roots = [
      ['State Exams'],
      ['University Exams'],
      ['Competitive Exams'],
      ['Entrance Exams'],
      ['School Boards'],
      ['Placement / Private'],
    ];
    for (const parts of roots) {
      const summary = await summarizeRoot(workspace._id, parts);
      if (summary) console.log(`${parts.join(' / ')}: ${summary.folders} folders, ${summary.files} files, ${summary.emptyLeaves} empty leaves`);
    }
  }

  const present = await verifyPlacements(workspace._id, selectedPacks);
  console.log(`Remaining premium packs placed: ${present}/${selectedPacks.length}`);
  console.log(JSON.stringify(stats, null, 2));
};

run()
  .catch((error) => {
    console.error('Remaining premium content pack seeding failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
