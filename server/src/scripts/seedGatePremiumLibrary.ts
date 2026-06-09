import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import mongoose, { Types } from 'mongoose';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import StudyCard, {
  type StudyCardGoalType,
  type StudyCardTone,
} from '../models/StudyCard';
import Workspace from '../models/Workspace';
import {
  gateCommonStudyMaterial,
  gateStudyMaterialByCode,
  gateTestPapers,
  getGatePaperBranchName,
  type GateTestPaper,
} from './studyHubEntranceSpecs';

const ROOT_WORKSPACE_SLUG = 'study-hub';
const MONGO_URI = process.env.MONGO_URI;
const SCRIPT_DIR = path.resolve(__dirname);
const OFFICIAL_INPUT_PATH = path.join(SCRIPT_DIR, 'official-materials.generated.json');
const STATIC_URL_ROOT = '/static/gate-premium';
const STATIC_FILE_ROOT = path.resolve(SCRIPT_DIR, '../../public/gate-premium');
const shouldApply = process.argv.includes('--apply');
const verifyOnly = process.argv.includes('--verify');
const CONTENT_VERSION = 'gate-premium-v1';

type CardDoc = any;
type FileDoc = any;

type OfficialMaterialEntry = {
  title: string;
  url: string;
  targetPath: string[] | string;
  sourceName: string;
  sourceUrl?: string;
  resourceType?: string;
  year?: number;
  paper?: string;
  subject?: string;
  topic?: string;
  rightsNote?: string;
  notes?: string;
};

type CardStyle = {
  iconKey: string;
  tone: StudyCardTone;
  goalType: StudyCardGoalType;
  order: number;
};

type GateOfficialKind = 'syllabus' | 'pyq' | 'answer_key';

type CanonicalOfficialEntry = {
  source: OfficialMaterialEntry;
  code: string;
  branchName: string;
  shelfName: string;
  kind: GateOfficialKind;
  variant: string;
  title: string;
  url: string;
  year?: number;
};

const stats = {
  officialPrepared: 0,
  officialAttached: 0,
  officialExisting: 0,
  officialRelocated: 0,
  premiumPacksPrepared: 0,
  premiumPacksAttached: 0,
  premiumPacksExisting: 0,
  premiumPacksRelocated: 0,
  cardsCreated: 0,
  cardsRestored: 0,
  cardsStyled: 0,
  filesSorted: 0,
  emptyArchived: 0,
};

const gateCodes = new Set([...gateTestPapers.map((paper) => paper.code), 'GA']);
const gateByCode = new Map(gateTestPapers.map((paper) => [paper.code, paper]));
const commonBranchName = 'General Aptitude and Common Resources';
const branchShelfNames = ['Overview', 'Syllabus', 'Previous Year Papers', 'Answer Keys', 'Study Material', 'Strategy'];
const commonBranchShelfNames = branchShelfNames.filter((shelf) => shelf !== 'Answer Keys');
const generatedShelfNames = new Set(['Overview', 'Study Material', 'Strategy']);
const removableEmptyShelfNames = new Set(['Mock Tests', 'Updates']);

const normalizeKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[\u2013\u2014]/g, '-')
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

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const compactName = (value = '') => value.replace(/\s+/g, ' ').trim();

const normalizePath = (targetPath: string[] | string) => (
  Array.isArray(targetPath) ? targetPath : String(targetPath).split('/')
)
  .map((part) => compactName(String(part)))
  .filter(Boolean);

const activeCardFilter = (workspaceId: Types.ObjectId) => ({
  workspaceId,
  status: { $ne: 'archived' },
});

const getFileUrl = (file: FileDoc) => String(file?.url || '').trim();

const isGateOfficialFile = (file: FileDoc) => {
  const sourceType = String(file?.sourceType || '').toLowerCase();
  if (sourceType && sourceType !== 'official') return false;

  const sourceName = String(file?.sourceName || '').toLowerCase();
  const url = String(file?.url || '').toLowerCase();
  return (
    sourceName.includes('gate') ||
    url.includes('gate2026') ||
    url.includes('gate2025') ||
    url.includes('gate.iit') ||
    url.includes('gate2026.iitg.ac.in')
  );
};

const styleForName = (name: string, depth: number, order: number): CardStyle => {
  const key = normalizeKey(name);
  if (depth === 0) return { iconKey: 'entrance', tone: 'violet', goalType: 'exam_category', order };
  if (key === 'gate') return { iconKey: 'gate', tone: 'cyan', goalType: 'exam_family', order };
  if (name === commonBranchName) return { iconKey: 'gate', tone: 'slate', goalType: 'resource_folder', order };
  if (key.startsWith('gate ')) return { iconKey: 'gate', tone: 'cyan', goalType: 'subject', order };
  if (key.includes('syllabus')) return { iconKey: 'syllabus', tone: 'cyan', goalType: 'resource_folder', order };
  if (key.includes('previous') || key.includes('paper') || key.includes('pyq')) return { iconKey: 'pyq', tone: 'violet', goalType: 'resource_folder', order };
  if (key.includes('answer')) return { iconKey: 'answer-key', tone: 'slate', goalType: 'resource_folder', order };
  if (key.includes('study') || key.includes('material') || key.includes('general aptitude')) return { iconKey: 'study-material', tone: 'blue', goalType: 'resource_folder', order };
  if (key.includes('strategy') || key.includes('plan')) return { iconKey: 'target', tone: 'amber', goalType: 'resource_folder', order };
  if (key.includes('overview')) return { iconKey: 'verified', tone: 'cyan', goalType: 'resource_folder', order };
  return { iconKey: 'folder', tone: 'slate', goalType: 'resource_folder', order };
};

const ensureCard = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  name: string,
  style: CardStyle,
) => {
  const slug = slugify(name);
  let card = await StudyCard.findOne({ workspaceId, parentId, slug });

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

  for (const [key, value] of Object.entries({ name, slug, ...style })) {
    if ((card as any)[key] !== value) {
      (card as any)[key] = value;
      changed = true;
    }
  }

  if (changed) {
    stats.cardsStyled += 1;
    if (shouldApply) await card.save();
  }

  return card;
};

const getRootWorkspace = async () =>
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
        description: 'Root card workspace for all exams, schools, boards, and official study materials.',
        template: { phases: [], facets: [], resourceTypes: [] },
      },
    },
    { new: true, upsert: true, runValidators: true },
  );

const ensurePath = async (workspaceId: Types.ObjectId, parts: string[]) => {
  let parentId: Types.ObjectId | null = null;
  let current: CardDoc | null = null;

  for (const [index, part] of parts.entries()) {
    const order = getOrderForPath(parts, index);
    current = await ensureCard(workspaceId, parentId, part, styleForName(part, index, order));
    parentId = current._id as Types.ObjectId;
  }

  return current;
};

const findPath = async (workspaceId: Types.ObjectId, parts: string[]) => {
  let parentId: Types.ObjectId | null = null;
  let current: CardDoc | null = null;
  for (const part of parts) {
    current = await StudyCard.findOne({
      ...activeCardFilter(workspaceId),
      parentId,
      slug: slugify(part),
    });
    if (!current) return null;
    parentId = current._id as Types.ObjectId;
  }
  return current;
};

const getOrderForPath = (parts: string[], index: number) => {
  const name = parts[index];
  if (index === 0) return 20;
  if (normalizeKey(name) === 'gate') return 20;
  const branchIndex = gateTestPapers.findIndex((paper) => getGatePaperBranchName(paper) === name);
  if (branchIndex >= 0) return (branchIndex + 1) * 10;
  if (name === commonBranchName) return 10000;
  const shelfIndex = branchShelfNames.indexOf(name);
  if (shelfIndex >= 0) return (shelfIndex + 1) * 10;
  return 500 + index;
};

const sortFiles = (files: FileDoc[] = []) => {
  const typeOrder = new Map<string, number>([
    ['syllabus', 10],
    ['pyq', 20],
    ['answer_key', 30],
    ['material', 40],
    ['notes', 50],
    ['practice', 60],
  ]);

  return [...files].sort((left, right) => {
    const leftKey = [
      typeOrder.get(String(left.resourceType || '').toLowerCase()) ?? 99,
      left.year ? 3000 - Number(left.year) : 9999,
      normalizeKey(left.subject || ''),
      normalizeKey(left.paper || ''),
      normalizeKey(left.name || ''),
    ].join('|');
    const rightKey = [
      typeOrder.get(String(right.resourceType || '').toLowerCase()) ?? 99,
      right.year ? 3000 - Number(right.year) : 9999,
      normalizeKey(right.subject || ''),
      normalizeKey(right.paper || ''),
      normalizeKey(right.name || ''),
    ].join('|');
    return leftKey.localeCompare(rightKey);
  });
};

const dedupeAndSortCardFiles = async (card: CardDoc) => {
  const seen = new Set<string>();
  const nextFiles: FileDoc[] = [];
  let changed = false;

  for (const file of card.files || []) {
    const url = getFileUrl(file);
    const key = url || `${normalizeKey(file.name || '')}|${file.year || ''}|${normalizeKey(file.paper || '')}`;
    if (url && seen.has(key)) {
      changed = true;
      continue;
    }
    seen.add(key);
    nextFiles.push(file);
  }

  const sorted = sortFiles(nextFiles);
  const before = (card.files || []).map((file: FileDoc) => `${getFileUrl(file)}|${file.name || ''}`).join('\n');
  const after = sorted.map((file: FileDoc) => `${getFileUrl(file)}|${file.name || ''}`).join('\n');
  if (before !== after) changed = true;

  if (!changed) return false;
  card.files = sorted;
  stats.filesSorted += 1;
  if (shouldApply) await card.save();
  return true;
};

const attachFile = async (card: CardDoc, file: FileDoc, counter: 'official' | 'premium') => {
  const incomingUrl = getFileUrl(file);
  const existing = (card.files || []).find((item: FileDoc) => getFileUrl(item) === incomingUrl);

  if (existing) {
    let changed = false;
    for (const key of ['name', 'resourceType', 'year', 'stage', 'paper', 'subject', 'topic', 'sourceType', 'sourceName', 'notes', 'mimeType', 'language']) {
      if (file[key] !== undefined && existing[key] !== file[key]) {
        existing[key] = file[key];
        changed = true;
      }
    }
    if (changed && shouldApply) await card.save();
    if (counter === 'official') stats.officialExisting += 1;
    else stats.premiumPacksExisting += 1;
    return false;
  }

  card.files = [...(card.files || []), file];
  if (counter === 'official') stats.officialAttached += 1;
  else stats.premiumPacksAttached += 1;
  if (shouldApply) await card.save();
  return true;
};

const getDecodedFilename = (url = '') => {
  try {
    return decodeURIComponent(path.basename(new URL(url).pathname));
  } catch {
    return decodeURIComponent(path.basename(url.split('?')[0] || ''));
  }
};

const codePattern = new RegExp(`(^|[^A-Z])(${[...gateCodes].map(escapeRegex).join('|')})(?=[^A-Z]|$)`, 'i');

const getGateCodeFromText = (value = '') => {
  const normalized = decodeURIComponent(value).replace(/[_-]+/g, ' ').toUpperCase();
  const match = normalized.match(codePattern);
  return match?.[2]?.toUpperCase() || '';
};

const inferGateCode = (entry: OfficialMaterialEntry | FileDoc) => {
  const filename = getDecodedFilename(entry.url);
  const fromFilename = getGateCodeFromText(filename);
  if (fromFilename) return fromFilename;

  const pathParts = 'targetPath' in entry ? normalizePath(entry.targetPath) : [];
  const branchPart = pathParts.find((part) => normalizeKey(part).startsWith('gate ')) || '';
  const branchPaper = gateTestPapers.find((paper) => normalizeKey(getGatePaperBranchName(paper)) === normalizeKey(branchPart));
  if (branchPaper) return branchPaper.code;
  if (branchPart === commonBranchName) return 'GA';

  return getGateCodeFromText(`${entry.title || entry.name || ''} ${entry.subject || ''} ${entry.paper || ''}`);
};

const inferVariant = (value = '') => {
  const decoded = decodeURIComponent(value).toUpperCase();
  const match = decoded.match(/\b(CS|CE|GG|XH)[-_ ]?((?:C)?\d)\b/);
  if (!match) return '';
  return `${match[1]}-${match[2]}`;
};

const inferOfficialKind = (entry: OfficialMaterialEntry | FileDoc): GateOfficialKind => {
  const haystack = `${entry.resourceType || ''} ${entry.title || entry.name || ''} ${entry.paper || ''} ${entry.url || ''}`.toLowerCase();
  if (haystack.includes('syllabus')) return 'syllabus';
  if (haystack.includes('answer') || haystack.includes('key')) return 'answer_key';
  return 'pyq';
};

const getShelfNameForKind = (kind: GateOfficialKind) => {
  if (kind === 'syllabus') return 'Syllabus';
  if (kind === 'answer_key') return 'Answer Keys';
  return 'Previous Year Papers';
};

const getResourceTypeForKind = (kind: GateOfficialKind) => {
  if (kind === 'answer_key') return 'answer_key';
  return kind;
};

const canonicalTitle = (branchName: string, kind: GateOfficialKind, year?: number, variant = '') => {
  const yearPart = year ? ` ${year}` : '';
  const variantPart = variant ? ` (${variant})` : '';
  if (kind === 'syllabus') return `${branchName} Official Syllabus${yearPart}`;
  if (kind === 'answer_key') return `${branchName} Answer Key${yearPart}${variantPart}`;
  return `${branchName} Question Paper${yearPart}${variantPart}`;
};

const toCanonicalOfficialEntry = (entry: OfficialMaterialEntry | FileDoc): CanonicalOfficialEntry | null => {
  if (!entry.url || !/\.pdf(?:$|\?)/i.test(entry.url)) return null;
  if (!isGateOfficialFile(entry)) return null;

  const code = inferGateCode(entry);
  if (!code || !gateCodes.has(code)) return null;
  if (code === 'GA' && !`${entry.title || entry.name || ''} ${entry.url || ''}`.toLowerCase().includes('syllabus')) return null;
  if (/\/GA_2026\.pdf$/i.test(entry.url)) return null;

  const paper = gateByCode.get(code);
  const branchName = paper ? getGatePaperBranchName(paper) : commonBranchName;
  const kind = inferOfficialKind(entry);
  const variant = inferVariant(`${getDecodedFilename(entry.url)} ${entry.title || entry.name || ''}`);
  const year = Number(entry.year) || Number(`${entry.title || entry.name || entry.url}`.match(/\b(20\d{2})\b/)?.[1]) || undefined;

  return {
    source: entry as OfficialMaterialEntry,
    code,
    branchName,
    shelfName: getShelfNameForKind(kind),
    kind,
    variant,
    title: canonicalTitle(branchName, kind, year, variant),
    url: entry.url,
    year,
  };
};

const loadOfficialEntries = async () => {
  const raw = await fs.readFile(OFFICIAL_INPUT_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as OfficialMaterialEntry[];
  const deduped = new Map<string, CanonicalOfficialEntry>();

  for (const entry of parsed) {
    const isGateEntry =
      normalizePath(entry.targetPath).some((part) => normalizeKey(part) === 'gate') ||
      `${entry.sourceName || ''} ${entry.title || ''} ${entry.url || ''}`.toLowerCase().includes('gate');
    if (!isGateEntry) continue;

    const canonical = toCanonicalOfficialEntry(entry);
    if (!canonical) continue;
    deduped.set(`${canonical.url}|${canonical.shelfName}`, canonical);
  }

  return [...deduped.values()].sort((left, right) =>
    left.branchName.localeCompare(right.branchName) ||
    left.shelfName.localeCompare(right.shelfName) ||
    (right.year || 0) - (left.year || 0) ||
    left.title.localeCompare(right.title)
  );
};

const getOfficialFilePayload = (entry: CanonicalOfficialEntry) => ({
  name: entry.title,
  url: entry.url,
  mimeType: 'application/pdf',
  resourceType: getResourceTypeForKind(entry.kind),
  status: 'published',
  visibility: 'public',
  year: entry.year,
  stage: entry.year ? `GATE ${entry.year}` : 'GATE',
  paper: entry.variant || (entry.kind === 'syllabus' ? 'Syllabus' : entry.kind === 'answer_key' ? 'Answer Key' : 'Question Paper'),
  subject: entry.branchName,
  topic: entry.shelfName,
  language: 'english',
  sourceType: 'official',
  sourceName: entry.source.sourceName || 'GATE',
  notes: [
    entry.source.notes,
    entry.source.rightsNote,
    entry.source.sourceUrl ? `Official source: ${entry.source.sourceUrl}` : '',
  ].filter(Boolean).join(' | '),
  uploadedAt: new Date(),
});

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

const writePremiumPdf = async (filePath: string, title: string, subtitle: string, content: string[]) => {
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
    y = height - 48;
  };

  const drawWrapped = (text: string, size = 10.5, font = regular, color = rgb(0.16, 0.2, 0.28), indent = 0) => {
    const maxChars = Math.max(34, Math.floor((width - margin * 2 - indent) / (size * 0.48)));
    for (const line of wrapLine(text, maxChars)) {
      if (y < 60) addPage();
      page.drawText(line, { x: margin + indent, y, size, font, color });
      y -= size + 4;
    }
  };

  page.drawRectangle({ x: 0, y: height - 98, width, height: 98, color: rgb(0.02, 0.08, 0.14) });
  page.drawText(title.slice(0, 78), { x: margin, y: height - 48, size: 17, font: bold, color: rgb(1, 1, 1) });
  page.drawText(subtitle.slice(0, 98), { x: margin, y: height - 72, size: 10, font: regular, color: rgb(0.74, 0.92, 1) });
  y = height - 124;

  drawWrapped('Study Hub Premium GATE Sheet', 11, bold, rgb(0.02, 0.46, 0.55));
  drawWrapped('Original revision material generated for structured preparation. Official syllabus and PYQs should be used as the final source of truth.', 9.5);
  y -= 8;

  for (const item of content) {
    const isHeading = item.startsWith('## ');
    const isBullet = item.startsWith('- ');
    const text = isHeading ? item.replace(/^##\s+/, '') : item;
    if (isHeading) {
      y -= 4;
      drawWrapped(text, 13, bold, rgb(0.03, 0.08, 0.16));
      y -= 2;
    } else if (isBullet) {
      drawWrapped(`- ${item.replace(/^-\s+/, '')}`, 10.2, regular, rgb(0.16, 0.2, 0.28), 10);
    } else {
      drawWrapped(text, 10.2);
    }
  }

  pdfDoc.getPages().forEach((pdfPage, index) => {
    pdfPage.drawLine({
      start: { x: margin, y: 38 },
      end: { x: width - margin, y: 38 },
      thickness: 0.6,
      color: rgb(0.82, 0.87, 0.93),
    });
    pdfPage.drawText('Study Hub Premium GATE', { x: margin, y: 22, size: 8.5, font: bold, color: rgb(0.02, 0.44, 0.58) });
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
  return bytes.length;
};

const premiumContentFor = (branchName: string, topic: string, mode: 'overview' | 'strategy' | 'topic') => {
  if (mode === 'overview') {
    return [
      '## Branch Map',
      `- Start with the official syllabus for ${branchName}. Keep one printed checklist and mark topics after PYQ practice, not after passive reading.`,
      '- GATE papers are 100 marks: General Aptitude is common, and the rest comes from the selected paper syllabus.',
      '- Use this branch folder in this order: Syllabus -> Study Material -> Previous Year Papers -> Answer Keys -> Strategy.',
      '## First Week Setup',
      '- Day 1: Read official syllabus and mark weak/strong topics.',
      '- Day 2: Solve one previous paper without pressure to understand pattern.',
      '- Day 3: Build formula/definition sheet from high-frequency topics.',
      '- Day 4-6: Finish one core topic with 30-40 mixed questions.',
      '- Day 7: Revise mistakes and update the tracker.',
      '## Quality Rule',
      '- Every note should end with one PYQ link, one common trap, and one two-line revision cue.',
    ];
  }

  if (mode === 'strategy') {
    return [
      '## 90-Day Premium Plan',
      '- Phase 1, Days 1-30: finish core concepts and make short notes topic-wise.',
      '- Phase 2, Days 31-60: solve previous papers by topic, then by year.',
      '- Phase 3, Days 61-80: full-length mocks, answer-key review, and formula sheet compression.',
      '- Phase 4, Days 81-90: revise only wrong-answer log, official syllabus checklist, and high-yield sheets.',
      '## Daily Loop',
      '- 45 minutes concept revision.',
      '- 60 minutes problem solving.',
      '- 20 minutes error log.',
      '- 10 minutes formula/definition recall.',
      '## Score Discipline',
      '- Do not chase new resources after the last month. Repeat official PYQs and repair mistakes.',
      '- Separate MCQ, MSQ, and NAT mistakes because each needs a different checking habit.',
    ];
  }

  return [
    '## Topic Snapshot',
    `- Topic: ${topic}`,
    `- Branch: ${branchName}`,
    '- Use this sheet as a starter map, then verify exact subtopics from the official syllabus PDF inside this branch.',
    '## What To Master',
    '- Definitions and standard symbols used in this topic.',
    '- Core formulae, theorem statements, diagrams, or process steps.',
    '- Boundary cases where a direct formula fails.',
    '- One solved example that shows the exam-style trick.',
    '- One PYQ where this topic appeared directly or as a mixed concept.',
    '## PYQ Lens',
    '- First solve topic-wise questions untimed to build accuracy.',
    '- Then solve mixed previous-year questions because GATE often combines two concepts.',
    '- For NAT, write units and valid range before calculation.',
    '- For MSQ, reject every uncertain option one by one instead of guessing all options together.',
    '## Mistake Scanner',
    '- Wrong sign, wrong unit, missing assumption, or using a formula outside its condition.',
    '- Reading the question as a familiar pattern without checking exact wording.',
    '- Skipping General Aptitude because it looks easy; GA marks compound quickly.',
    '## 7-Day Drill',
    '- Day 1: syllabus checklist and one-page notes.',
    '- Day 2: basic solved examples.',
    '- Day 3: medium PYQs.',
    '- Day 4: mixed PYQs.',
    '- Day 5: answer-key review and error log.',
    '- Day 6: mini mock from this topic.',
    '- Day 7: revise only mistakes and formula triggers.',
  ];
};

const getGeneratedPacks = () => {
  const packs: Array<{
    code: string;
    branchName: string;
    shelfPath: string[];
    topic: string;
    title: string;
    url: string;
    filePath: string;
    mode: 'overview' | 'strategy' | 'topic';
  }> = [];

  const branchSpecs = [
    ...gateTestPapers.map((paper) => ({ code: paper.code, branchName: getGatePaperBranchName(paper), topics: [...gateCommonStudyMaterial, ...(gateStudyMaterialByCode[paper.code] || [])] })),
    { code: 'GA', branchName: commonBranchName, topics: gateCommonStudyMaterial },
  ];

  for (const spec of branchSpecs) {
    const codeSlug = spec.code.toLowerCase();
    for (const mode of ['overview', 'strategy'] as const) {
      const topic = mode === 'overview' ? 'Branch Quick Start' : '90-Day Strategy';
      const filename = `${slugify(topic)}.pdf`;
      packs.push({
        code: spec.code,
        branchName: spec.branchName,
        shelfPath: ['Entrance Exams', 'GATE', spec.branchName, mode === 'overview' ? 'Overview' : 'Strategy'],
        topic,
        title: `${spec.branchName}: ${topic}`,
        url: `${STATIC_URL_ROOT}/${codeSlug}/${filename}`,
        filePath: path.join(STATIC_FILE_ROOT, codeSlug, filename),
        mode,
      });
    }

    for (const topicPath of spec.topics) {
      const topicParts = topicPath.split('/').map(compactName).filter(Boolean);
      const topic = topicParts.at(-1) || topicPath;
      const filename = `${slugify(topicPath)}.pdf`;
      packs.push({
        code: spec.code,
        branchName: spec.branchName,
        shelfPath: ['Entrance Exams', 'GATE', spec.branchName, 'Study Material', ...topicParts],
        topic,
        title: `${spec.branchName}: ${topic} Premium Sheet`,
        url: `${STATIC_URL_ROOT}/${codeSlug}/${filename}`,
        filePath: path.join(STATIC_FILE_ROOT, codeSlug, filename),
        mode: 'topic',
      });
    }
  }

  return packs;
};

const getGeneratedFilePayload = (pack: ReturnType<typeof getGeneratedPacks>[number]) => ({
  name: pack.title,
  url: pack.url,
  mimeType: 'application/pdf',
  resourceType: pack.mode === 'topic' ? 'notes' : 'material',
  status: 'published',
  visibility: 'public',
  stage: 'GATE',
  paper: pack.mode === 'overview' ? 'Overview' : pack.mode === 'strategy' ? 'Strategy' : 'Study Material',
  subject: pack.branchName,
  topic: pack.topic,
  language: 'hinglish',
  sourceType: 'platform',
  sourceName: 'Study Hub Premium',
  notes: `Original ${CONTENT_VERSION} generated for branch-first GATE preparation.`,
  uploadedAt: new Date(),
});

const ensureGateSkeleton = async (workspaceId: Types.ObjectId) => {
  const entrance = await ensureCard(workspaceId, null, 'Entrance Exams', styleForName('Entrance Exams', 0, 20));
  const gateRoot = await ensureCard(workspaceId, entrance._id as Types.ObjectId, 'GATE', styleForName('GATE', 1, 20));

  for (const paper of gateTestPapers) {
    const branchName = getGatePaperBranchName(paper);
    const branch = await ensureCard(
      workspaceId,
      gateRoot._id as Types.ObjectId,
      branchName,
      styleForName(branchName, 2, (gateTestPapers.indexOf(paper) + 1) * 10),
    );

    for (const [index, shelf] of branchShelfNames.entries()) {
      await ensureCard(workspaceId, branch._id as Types.ObjectId, shelf, styleForName(shelf, 3, (index + 1) * 10));
    }
  }

  const common = await ensureCard(workspaceId, gateRoot._id as Types.ObjectId, commonBranchName, styleForName(commonBranchName, 2, 10000));
  for (const [index, shelf] of commonBranchShelfNames.entries()) {
    await ensureCard(workspaceId, common._id as Types.ObjectId, shelf, styleForName(shelf, 3, (index + 1) * 10));
  }

  return gateRoot;
};

const attachOfficialEntries = async (workspaceId: Types.ObjectId, entries: CanonicalOfficialEntry[]) => {
  for (const entry of entries) {
    const shelf = await ensurePath(workspaceId, ['Entrance Exams', 'GATE', entry.branchName, entry.shelfName]);
    await attachFile(shelf, getOfficialFilePayload(entry), 'official');
    await dedupeAndSortCardFiles(shelf);
  }
};

const attachGeneratedPacks = async (workspaceId: Types.ObjectId, packs: ReturnType<typeof getGeneratedPacks>) => {
  for (const pack of packs) {
    if (shouldApply) {
      await writePremiumPdf(
        pack.filePath,
        pack.title,
        `${pack.branchName} / ${pack.topic}`,
        premiumContentFor(pack.branchName, pack.topic, pack.mode),
      );
    }

    const leaf = await ensurePath(workspaceId, pack.shelfPath);
    await attachFile(leaf, getGeneratedFilePayload(pack), 'premium');
    await dedupeAndSortCardFiles(leaf);
  }
};

const moveOfficialFileToCanonicalShelf = async (
  workspaceId: Types.ObjectId,
  sourceCard: CardDoc,
  file: FileDoc,
) => {
  const canonical = toCanonicalOfficialEntry(file);
  if (!canonical) return false;

  const target = await ensurePath(workspaceId, ['Entrance Exams', 'GATE', canonical.branchName, canonical.shelfName]);
  const targetId = String(target._id);
  if (String(sourceCard._id) === targetId) return false;

  await attachFile(target, getOfficialFilePayload(canonical), 'official');
  sourceCard.files = (sourceCard.files || []).filter((item: FileDoc) => getFileUrl(item) !== getFileUrl(file));
  stats.officialRelocated += 1;
  if (shouldApply) await sourceCard.save();
  await dedupeAndSortCardFiles(target);
  return true;
};

const moveGeneratedFileToCanonicalShelf = async (
  workspaceId: Types.ObjectId,
  sourceCard: CardDoc,
  file: FileDoc,
  pack: ReturnType<typeof getGeneratedPacks>[number],
) => {
  const target = await ensurePath(workspaceId, pack.shelfPath);
  const targetId = String(target._id);
  const sourceId = String(sourceCard._id);
  if (sourceId === targetId) return false;

  await attachFile(target, getGeneratedFilePayload(pack), 'premium');
  sourceCard.files = (sourceCard.files || []).filter((item: FileDoc) => getFileUrl(item) !== getFileUrl(file));
  stats.premiumPacksRelocated += 1;
  if (shouldApply) await sourceCard.save();
  await dedupeAndSortCardFiles(target);
  return true;
};

const getGateSubtree = async (workspaceId: Types.ObjectId, gateRoot: CardDoc) => {
  const cards = await StudyCard.find({ ...activeCardFilter(workspaceId) });
  const byParent = new Map<string, CardDoc[]>();
  for (const card of cards) {
    const children = byParent.get(String(card.parentId || 'root')) || [];
    children.push(card);
    byParent.set(String(card.parentId || 'root'), children);
  }

  const gateIds = new Set<string>();
  const queue = [gateRoot];
  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    const key = String(current._id);
    if (gateIds.has(key)) continue;
    gateIds.add(key);
    queue.push(...(byParent.get(key) || []));
  }

  return { cards: cards.filter((card) => gateIds.has(String(card._id))), byParent, gateIds };
};

const moveRawFiles = async (source: CardDoc, target: CardDoc, files: FileDoc[]) => {
  if (!files.length) return 0;
  const moveUrls = new Set(files.map(getFileUrl).filter(Boolean));
  const targetUrls = new Set((target.files || []).map(getFileUrl).filter(Boolean));
  let moved = 0;

  for (const file of files) {
    const url = getFileUrl(file);
    if (!url || targetUrls.has(url)) continue;
    const payload = typeof file.toObject === 'function' ? file.toObject() : { ...file };
    delete payload._id;
    target.files.push(payload);
    targetUrls.add(url);
    moved += 1;
  }

  if (!moved) return 0;
  source.files = (source.files || []).filter((file: FileDoc) => !moveUrls.has(getFileUrl(file)));
  if (shouldApply) {
    await target.save();
    await source.save();
  }
  await dedupeAndSortCardFiles(target);
  return moved;
};

const moveOrMergeGateCardTree = async (
  workspaceId: Types.ObjectId,
  source: CardDoc,
  targetParentId: Types.ObjectId,
) => {
  const duplicate = await StudyCard.findOne({
    ...activeCardFilter(workspaceId),
    parentId: targetParentId,
    slug: source.slug,
    _id: { $ne: source._id },
  });

  if (duplicate) {
    await moveRawFiles(source, duplicate, source.files || []);
    if ((source.files || []).length) {
      source.files = [];
      if (shouldApply) await source.save();
    }
    const children = await StudyCard.find({
      ...activeCardFilter(workspaceId),
      parentId: source._id,
    });
    for (const child of children) {
      await moveOrMergeGateCardTree(workspaceId, child, duplicate._id as Types.ObjectId);
    }
    const remainingChildren = await StudyCard.countDocuments({
      ...activeCardFilter(workspaceId),
      parentId: source._id,
    });
    if (!remainingChildren && !(source.files || []).length) {
      stats.emptyArchived += 1;
      if (shouldApply) {
        source.status = 'archived';
        source.visibility = 'private';
        await source.save();
      }
    }
    return duplicate;
  }

  if (String(source.parentId || '') !== String(targetParentId)) {
    stats.cardsStyled += 1;
    if (shouldApply) {
      source.parentId = targetParentId;
      source.status = 'published';
      source.visibility = 'public';
      await source.save();
    }
  }
  return source;
};

const relocateRootShelfWrappers = async (workspaceId: Types.ObjectId, gateRoot: CardDoc) => {
  const directChildren = await StudyCard.find({
    ...activeCardFilter(workspaceId),
    parentId: gateRoot._id,
  });
  const rootWrappers = directChildren.filter((child) => branchShelfNames.includes(child.name));

  for (const wrapper of rootWrappers) {
    const target = await ensurePath(workspaceId, ['Entrance Exams', 'GATE', commonBranchName, wrapper.name]);
    await moveRawFiles(wrapper, target, wrapper.files || []);

    const children = await StudyCard.find({
      ...activeCardFilter(workspaceId),
      parentId: wrapper._id,
    });
    for (const child of children) {
      await moveOrMergeGateCardTree(workspaceId, child, target._id as Types.ObjectId);
    }

    const remainingChildren = await StudyCard.countDocuments({
      ...activeCardFilter(workspaceId),
      parentId: wrapper._id,
    });
    if (!remainingChildren && !(wrapper.files || []).length) {
      stats.emptyArchived += 1;
      if (shouldApply) {
        wrapper.status = 'archived';
        wrapper.visibility = 'private';
        await wrapper.save();
      }
    }
  }
};

const getProtectedGateCardIds = async (workspaceId: Types.ObjectId, gateRoot: CardDoc) => {
  const protectedIds = new Set<string>([String(gateRoot._id)]);
  const branchNames = [...gateTestPapers.map(getGatePaperBranchName), commonBranchName];

  for (const branchName of branchNames) {
    const branch = await findPath(workspaceId, ['Entrance Exams', 'GATE', branchName]);
    if (!branch) continue;
    protectedIds.add(String(branch._id));
    const shelves = branchName === commonBranchName ? commonBranchShelfNames : branchShelfNames;
    for (const shelf of shelves) {
      const shelfCard = await findPath(workspaceId, ['Entrance Exams', 'GATE', branchName, shelf]);
      if (shelfCard) protectedIds.add(String(shelfCard._id));
    }
  }

  return protectedIds;
};

const archiveEmptyUnprotectedGateLeaves = async (workspaceId: Types.ObjectId, gateRoot: CardDoc) => {
  const protectedIds = await getProtectedGateCardIds(workspaceId, gateRoot);
  let archivedThisPass = 0;

  do {
    archivedThisPass = 0;
    const { cards, byParent } = await getGateSubtree(workspaceId, gateRoot);

    for (const card of cards) {
      if (protectedIds.has(String(card._id))) continue;
      const childCount = (byParent.get(String(card._id)) || []).length;
      if (childCount || (card.files || []).length) continue;

      archivedThisPass += 1;
      stats.emptyArchived += 1;
      if (shouldApply) {
        card.status = 'archived';
        card.visibility = 'private';
        await card.save();
      }
    }
  } while (archivedThisPass > 0);
};

const cleanupGateTree = async (workspaceId: Types.ObjectId) => {
  const gateRoot = await findPath(workspaceId, ['Entrance Exams', 'GATE']);
  if (!gateRoot) return;

  const { cards, gateIds } = await getGateSubtree(workspaceId, gateRoot);
  const generatedPackByUrl = new Map(getGeneratedPacks().map((pack) => [pack.url, pack]));

  for (const card of cards.filter((item) => gateIds.has(String(item._id)))) {
    for (const file of [...(card.files || [])]) {
      const generatedPack = generatedPackByUrl.get(getFileUrl(file));
      if (generatedPack) {
        await moveGeneratedFileToCanonicalShelf(workspaceId, card, file, generatedPack);
        continue;
      }

      if (isGateOfficialFile(file)) {
        await moveOfficialFileToCanonicalShelf(workspaceId, card, file);
      }
    }
    await dedupeAndSortCardFiles(card);
  }

  await relocateRootShelfWrappers(workspaceId, gateRoot);

  const refreshedCards = await StudyCard.find({ ...activeCardFilter(workspaceId), _id: { $in: [...gateIds] } });
  const childCountByParent = new Map<string, number>();
  refreshedCards.forEach((card) => {
    const key = String(card.parentId || 'root');
    childCountByParent.set(key, (childCountByParent.get(key) || 0) + 1);
  });

  for (const card of refreshedCards) {
    const isRemovableEmptyShelf = removableEmptyShelfNames.has(card.name);
    if (!isRemovableEmptyShelf) continue;
    const childCount = childCountByParent.get(String(card._id)) || 0;
    if (childCount || (card.files || []).length) continue;
    stats.emptyArchived += 1;
    if (shouldApply) {
      card.status = 'archived';
      card.visibility = 'private';
      await card.save();
    }
  }

  await archiveEmptyUnprotectedGateLeaves(workspaceId, gateRoot);
};

const summarizeBranch = async (workspaceId: Types.ObjectId, branchName: string) => {
  const branch = await findPath(workspaceId, ['Entrance Exams', 'GATE', branchName]);
  if (!branch) return null;

  const shelves = await StudyCard.find({
    ...activeCardFilter(workspaceId),
    parentId: branch._id,
  }).select('name files').lean();

  const shelfMap = new Map(shelves.map((shelf: any) => [shelf.name, shelf]));
  return {
    branch,
    missingShelves: branchShelfNames.filter((shelf) => !shelfMap.has(shelf)),
    syllabusFiles: shelfMap.get('Syllabus')?.files?.length || 0,
    pyqFiles: shelfMap.get('Previous Year Papers')?.files?.length || 0,
    answerKeyFiles: shelfMap.get('Answer Keys')?.files?.length || 0,
    studyMaterialFolders: await StudyCard.countDocuments({
      ...activeCardFilter(workspaceId),
      parentId: shelfMap.get('Study Material')?._id,
    }),
  };
};

const verifyGate = async (workspaceId: Types.ObjectId) => {
  const gateRoot = await findPath(workspaceId, ['Entrance Exams', 'GATE']);
  if (!gateRoot) {
    console.log('GATE root: missing');
    return;
  }

  const branches = await StudyCard.find({
    ...activeCardFilter(workspaceId),
    parentId: gateRoot._id,
  }).select('name files').sort({ order: 1, name: 1 }).lean();

  const branchNames = new Set(branches.map((branch: any) => branch.name));
  const requiredBranchNames = gateTestPapers.map(getGatePaperBranchName);
  const missingBranches = requiredBranchNames.filter((name) => !branchNames.has(name));
  const allowedBranchNames = new Set([...requiredBranchNames, commonBranchName]);
  const extraBranches = branches
    .map((branch: any) => branch.name)
    .filter((name: string) => !allowedBranchNames.has(name));
  const summaries = await Promise.all(requiredBranchNames.map((name) => summarizeBranch(workspaceId, name)));
  const readyBranches = summaries.filter((summary) => (
    summary &&
    summary.missingShelves.length === 0 &&
    summary.syllabusFiles > 0 &&
    summary.pyqFiles > 0 &&
    summary.answerKeyFiles > 0 &&
    summary.studyMaterialFolders > 0
  ));

  const allGateCards = await StudyCard.find({ ...activeCardFilter(workspaceId) }).select('_id parentId name files').lean();
  const childIdsByParent = new Map<string, any[]>();
  for (const card of allGateCards) {
    const list = childIdsByParent.get(String(card.parentId || 'root')) || [];
    list.push(card);
    childIdsByParent.set(String(card.parentId || 'root'), list);
  }

  let folders = 0;
  let files = 0;
  let emptyLeaves = 0;
  const emptyLeafNames: string[] = [];
  const queue = [gateRoot as any];
  const seen = new Set<string>();
  while (queue.length) {
    const current = queue.shift();
    if (!current || seen.has(String(current._id))) continue;
    seen.add(String(current._id));
    folders += 1;
    files += (current.files || []).length;
    const children = childIdsByParent.get(String(current._id)) || [];
    if (!children.length && !(current.files || []).length) {
      emptyLeaves += 1;
      if (emptyLeafNames.length < 12) emptyLeafNames.push(current.name);
    }
    queue.push(...children);
  }

  console.log(`GATE root: ${folders} folders, ${files} files, ${emptyLeaves} empty leaves`);
  console.log(`GATE branches ready: ${readyBranches.length}/${requiredBranchNames.length}`);
  console.log(`GATE branch cards under root: ${branches.length}`);
  if (missingBranches.length) console.log(`Missing branches: ${missingBranches.join(', ')}`);
  if (extraBranches.length) console.log(`Extra root branches: ${extraBranches.join(', ')}`);
  if (emptyLeafNames.length) console.log(`Sample empty leaves: ${emptyLeafNames.join(', ')}`);

  const sampleNames = ['GATE CSE', 'GATE DA', 'GATE ECE', 'GATE Electrical', 'GATE Mechanical', 'GATE Civil'];
  for (const name of sampleNames) {
    const summary = await summarizeBranch(workspaceId, name);
    if (!summary) {
      console.log(`${name}: missing`);
      continue;
    }
    console.log(
      `${name}: syllabus ${summary.syllabusFiles}, pyq ${summary.pyqFiles}, answer keys ${summary.answerKeyFiles}, study folders ${summary.studyMaterialFolders}, missing shelves ${summary.missingShelves.length}`,
    );
  }
};

const run = async () => {
  const officialEntries = await loadOfficialEntries();
  const premiumPacks = getGeneratedPacks();
  stats.officialPrepared = officialEntries.length;
  stats.premiumPacksPrepared = premiumPacks.length;

  console.log(`${verifyOnly ? 'Verifying' : shouldApply ? 'Applying' : 'Dry run'} GATE premium branch-first library seed.`);
  console.log(`Prepared official GATE files: ${officialEntries.length}. Premium generated sheets: ${premiumPacks.length}.`);
  console.log(`Official basis: GATE 2026 has ${gateTestPapers.length} test papers; branch-first shelves are syllabus, PYQ, answer keys, study material, overview, and strategy.`);

  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });

  const workspace = await getRootWorkspace();
  const workspaceId = workspace._id as Types.ObjectId;

  if (verifyOnly) {
    await verifyGate(workspaceId);
    return;
  }

  if (!shouldApply) {
    console.log('[dry-run] Use --apply to create/update GATE folders, attach official links, and generate premium PDFs.');
    return;
  }

  await ensureGateSkeleton(workspaceId);
  await attachOfficialEntries(workspaceId, officialEntries);
  await attachGeneratedPacks(workspaceId, premiumPacks);
  await cleanupGateTree(workspaceId);
  await verifyGate(workspaceId);

  console.log(
    [
      `Cards created: ${stats.cardsCreated}. Restored: ${stats.cardsRestored}. Styled: ${stats.cardsStyled}.`,
      `Official files attached: ${stats.officialAttached}. Existing/updated: ${stats.officialExisting}. Relocated: ${stats.officialRelocated}.`,
      `Premium sheets attached: ${stats.premiumPacksAttached}. Existing/updated: ${stats.premiumPacksExisting}. Relocated: ${stats.premiumPacksRelocated}.`,
      `Files sorted: ${stats.filesSorted}. Empty folders archived: ${stats.emptyArchived}.`,
    ].join('\n'),
  );
};

run()
  .catch((error) => {
    console.error('GATE premium branch-first seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
