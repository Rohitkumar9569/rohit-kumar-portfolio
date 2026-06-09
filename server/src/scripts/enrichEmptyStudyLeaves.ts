import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import mongoose, { Types } from 'mongoose';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import StudyCard from '../models/StudyCard';
import Workspace from '../models/Workspace';

const ROOT_WORKSPACE_SLUG = 'study-hub';
const MONGO_URI = process.env.MONGO_URI;
const SCRIPT_DIR = path.resolve(__dirname);
const STATIC_URL_ROOT = '/static/auto-enriched-leaves';
const STATIC_FILE_ROOT = path.resolve(SCRIPT_DIR, '../../public/auto-enriched-leaves');
const shouldApply = process.argv.includes('--apply');
const sampleLimitArg = process.argv.find((arg) => arg.startsWith('--sample-limit='));
const sampleLimit = Math.max(0, Math.min(40, Number(sampleLimitArg?.split('=').pop()) || 12));
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Math.max(1, Number(limitArg.split('=').pop()) || 1) : 0;

type CardSnapshot = {
  _id: Types.ObjectId;
  parentId?: Types.ObjectId | null;
  name: string;
  slug: string;
  files?: Array<{ status?: string; url?: string }>;
};

const stats = {
  leavesFound: 0,
  leavesSelected: 0,
  pdfsWritten: 0,
  filesAttached: 0,
  filesExisting: 0,
  skipped: 0,
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

const compactTitle = (value: string, max = 150) => {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 3).trim()}...`;
};

const activeFileCount = (card: CardSnapshot) =>
  (card.files || []).filter((file) => (file.status || 'published') !== 'archived').length;

const resourceTypeForPath = (parts: string[]) => {
  const key = normalizeKey(parts.join(' '));
  if (/\bprevious\b|\bpyq\b|\bpapers?\b|\bquestion papers?\b/.test(key)) return 'pyq';
  if (/\bpractice\b|\bmock\b|\btest\b|\bquestions?\b/.test(key)) return 'practice';
  if (/\bbook\b|\bncert\b|\btextbook\b/.test(key)) return 'book';
  if (/\bsyllabus\b|\bpattern\b/.test(key)) return 'syllabus';
  if (/\banswer\b|\bsolution\b/.test(key)) return 'solution';
  if (/\bstrategy\b|\bplanner\b|\broadmap\b/.test(key)) return 'strategy';
  if (/\bcurrent affairs\b|\bupdates?\b|\bnotification\b/.test(key)) return 'current_affairs';
  if (/\bnotes?\b|\bstudy material\b|\bmaterial\b/.test(key)) return 'notes';
  return 'material';
};

const labelForResourceType = (resourceType: string) => {
  const labels: Record<string, string> = {
    pyq: 'PYQ',
    practice: 'Practice',
    book: 'Book',
    syllabus: 'Syllabus',
    solution: 'Solutions',
    strategy: 'Strategy',
    current_affairs: 'Current Affairs',
    notes: 'Notes',
    material: 'Material',
  };
  return labels[resourceType] || 'Material';
};

const inferExamName = (parts: string[]) => {
  const withoutRoot = parts.slice(1, -1).filter(Boolean);
  if (!withoutRoot.length) return parts[0] || 'Study Hub';
  const resourceWords = new Set([
    'overview',
    'syllabus',
    'previous year papers',
    'study material',
    'revision notes',
    'practice questions',
    'mock tests',
    'sample papers',
    'answer keys',
    'strategy',
    'state gk',
    'current affairs',
    'books',
    'textbooks',
    'ncert books',
  ]);
  const meaningful = withoutRoot.filter((part) => !resourceWords.has(normalizeKey(part)));
  return (meaningful[meaningful.length - 1] || withoutRoot[0] || parts[0] || 'Study Hub').trim();
};

const buildPack = (card: CardSnapshot, parts: string[]) => {
  const resourceType = resourceTypeForPath(parts);
  const exam = inferExamName(parts);
  const leaf = parts[parts.length - 1] || card.name;
  const root = parts[0] || 'Study Hub';
  const pathLabel = parts.join(' / ');
  const title = compactTitle(`${exam} ${labelForResourceType(resourceType)} Premium Starter Pack`);
  const id = `${slugify(parts.join('-'))}-${card._id.toString().slice(-8)}`;
  const url = `${STATIC_URL_ROOT}/${slugify(root)}/${id}.pdf`;
  const filePath = path.join(STATIC_FILE_ROOT, slugify(root), `${id}.pdf`);

  return {
    title,
    exam,
    leaf,
    root,
    pathLabel,
    resourceType,
    url,
    filePath,
    subject: parts.length > 3 ? parts[parts.length - 2] : exam,
  };
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

const writeStarterPdf = async (pack: ReturnType<typeof buildPack>) => {
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const width = 595;
  const height = 842;
  const margin = 44;
  const page = pdfDoc.addPage([width, height]);

  page.drawRectangle({ x: 0, y: height - 118, width, height: 118, color: rgb(0.03, 0.06, 0.11) });
  page.drawText(compactTitle(pack.title, 74), { x: margin, y: height - 46, size: 17, font: bold, color: rgb(1, 1, 1) });
  page.drawText(compactTitle(pack.pathLabel, 94), {
    x: margin,
    y: height - 74,
    size: 9.5,
    font: regular,
    color: rgb(0.72, 0.9, 1),
  });

  let y = height - 146;
  const section = (heading: string, lines: string[]) => {
    page.drawText(heading, { x: margin, y, size: 13.2, font: bold, color: rgb(0.02, 0.11, 0.2) });
    y -= 24;
    for (const line of lines) {
      for (const wrapped of wrapLine(line, 92)) {
        page.drawText(wrapped, { x: margin + 12, y, size: 10.5, font: regular, color: rgb(0.15, 0.2, 0.3) });
        y -= 16;
      }
      y -= 4;
    }
    y -= 10;
  };

  section('How to use this shelf', [
    `Start with ${pack.leaf}. Mark the official syllabus, latest notice, and repeated PYQ patterns before adding extra material.`,
    'Use this starter pack as a clean checklist. Replace or extend it with official PDFs whenever a more specific source is available.',
  ]);

  section('Premium study flow', [
    '1. Read: scan the source once and underline only exam-relevant lines.',
    '2. Reduce: convert the topic into one-page notes, formula lists, dates, cases, or examples.',
    '3. Practice: solve previous questions or short drills immediately after revision.',
    '4. Review: keep a small error log and revisit it every third day.',
  ]);

  section('Quality checklist', [
    `Exam: ${pack.exam}`,
    `Resource type: ${labelForResourceType(pack.resourceType)}`,
    'Keep official sources first, then standard books, then coaching notes or generated summaries.',
    'For search quality, keep the file title, exam name, subject, year, and stage clear.',
  ]);

  page.drawText('Study Hub Premium', { x: margin, y: 30, size: 8.5, font: bold, color: rgb(0.02, 0.35, 0.52) });
  page.drawText('Generated starter content. Official material remains the source of truth.', {
    x: margin + 104,
    y: 30,
    size: 8.5,
    font: regular,
    color: rgb(0.36, 0.42, 0.5),
  });

  await fs.mkdir(path.dirname(pack.filePath), { recursive: true });
  const bytes = await pdfDoc.save();
  await fs.writeFile(pack.filePath, bytes);
  stats.pdfsWritten += 1;
  return bytes.length;
};

const buildSnapshot = (cards: CardSnapshot[]) => {
  const cardById = new Map(cards.map((card) => [card._id.toString(), card]));
  const childrenByParent = new Map<string, CardSnapshot[]>();

  for (const card of cards) {
    const parentKey = card.parentId?.toString() || 'root';
    const siblings = childrenByParent.get(parentKey) || [];
    siblings.push(card);
    childrenByParent.set(parentKey, siblings);
  }

  const pathMemo = new Map<string, string[]>();
  const getPathParts = (card: CardSnapshot): string[] => {
    const id = card._id.toString();
    const cached = pathMemo.get(id);
    if (cached) return cached;
    const parent = card.parentId ? cardById.get(card.parentId.toString()) : null;
    const parts = parent ? [...getPathParts(parent), card.name] : [card.name];
    pathMemo.set(id, parts);
    return parts;
  };

  return { childrenByParent, getPathParts };
};

const loadEmptyLeaves = async (workspaceId: Types.ObjectId) => {
  const cards = await StudyCard.find({ workspaceId, status: { $ne: 'archived' } })
    .select('_id parentId name slug files')
    .lean<CardSnapshot[]>();
  const { childrenByParent, getPathParts } = buildSnapshot(cards);
  const leaves = cards
    .filter((card) => activeFileCount(card) === 0 && !(childrenByParent.get(card._id.toString()) || []).length)
    .map((card) => ({ card, parts: getPathParts(card) }))
    .sort((a, b) => a.parts.join(' / ').localeCompare(b.parts.join(' / ')));
  return leaves;
};

const attachStarter = async (workspaceId: Types.ObjectId, leaf: { card: CardSnapshot; parts: string[] }) => {
  const pack = buildPack(leaf.card, leaf.parts);
  const card = await StudyCard.findOne({ _id: leaf.card._id, workspaceId, status: { $ne: 'archived' } });
  if (!card) {
    stats.skipped += 1;
    return;
  }
  const activeFiles = (card.files || []).filter((file: any) => (file.status || 'published') !== 'archived');
  if (activeFiles.length) {
    stats.filesExisting += 1;
    return;
  }

  const sizeBytes = await writeStarterPdf(pack);
  card.files = [
    ...(card.files || []),
    {
      name: compactTitle(pack.title, 178),
      url: pack.url,
      sizeBytes,
      mimeType: 'application/pdf',
      resourceType: pack.resourceType,
      status: 'published',
      visibility: 'public',
      year: 2026,
      stage: pack.root,
      paper: pack.leaf,
      subject: pack.subject,
      topic: pack.leaf,
      language: 'hinglish',
      sourceType: 'platform',
      sourceName: 'Study Hub Premium',
      notes: `Auto-enriched starter resource for ${pack.pathLabel}.`,
      uploadedAt: new Date(),
    },
  ];
  await card.save();
  stats.filesAttached += 1;
};

const main = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is required.');
  await mongoose.connect(MONGO_URI);
  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean<{ _id: Types.ObjectId }>();
  if (!workspace) throw new Error('Study Hub workspace not found.');

  const leaves = await loadEmptyLeaves(workspace._id);
  stats.leavesFound = leaves.length;
  const selected = limit ? leaves.slice(0, limit) : leaves;
  stats.leavesSelected = selected.length;

  console.log(`${shouldApply ? 'Applying' : 'Dry run'} empty Study Hub leaf enrichment.`);
  console.log(`Empty leaves found: ${stats.leavesFound}. Selected: ${stats.leavesSelected}.`);
  if (selected.length && sampleLimit) {
    console.log('Sample leaves:');
    for (const item of selected.slice(0, sampleLimit)) console.log(`- ${item.parts.join(' / ')}`);
  }

  if (!shouldApply) {
    console.log('Dry run only. Re-run with --apply to attach generated starter PDFs.');
    return;
  }

  for (const leaf of selected) await attachStarter(workspace._id, leaf);

  const remaining = await loadEmptyLeaves(workspace._id);
  console.log(`Starter PDFs written: ${stats.pdfsWritten}. Files attached: ${stats.filesAttached}. Existing/skipped: ${stats.filesExisting}/${stats.skipped}.`);
  console.log(`Remaining empty leaves: ${remaining.length}.`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
