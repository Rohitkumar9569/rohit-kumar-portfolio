/**
 * seedUnifiedPremiumCatalog.ts
 * Builds ONE premium place with full SSC + Railway exam trees.
 * Usage: npx ts-node src/scripts/seedUnifiedPremiumCatalog.ts [--apply]
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import StudyCard, { type StudyCardGoalType, type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';
import {
  COACHING_BRANDS,
  FAMILY_CHILD_EXAMS,
  UNIFIED_PREMIUM_FAMILIES,
  resolveCoachingBrand,
} from './premiumCoachingSources';

const MONGO_URI = process.env.MONGO_URI;
const ROOT_WORKSPACE_SLUG = 'study-hub';
const shouldApply = process.argv.includes('--apply');
const PUBLIC_ROOT = path.resolve(__dirname, '../../public');

type CardDoc = any;

const slugify = (value: string, fallback = 'item') => {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-+$/g, '');
  return slug || fallback;
};

const toneForFamily = (tone: string): StudyCardTone => {
  const allowed: StudyCardTone[] = ['blue', 'violet', 'emerald', 'amber', 'rose', 'cyan', 'indigo', 'slate'];
  return (allowed.includes(tone as StudyCardTone) ? tone : 'violet') as StudyCardTone;
};

async function ensureRootWorkspace() {
  return Workspace.findOneAndUpdate(
    { slug: ROOT_WORKSPACE_SLUG },
    {
      $set: {
        name: 'Study Hub', shortName: 'Study Hub', slug: ROOT_WORKSPACE_SLUG, type: 'exam', category: 'platform',
        description: 'All premium study content in one place — UPSC, SSC, Railway, GATE, JEE, NEET and more.',
        visibility: 'public', status: 'active', accentColor: '#7c3aed', priority: 1, readiness: 95,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function ensureCard(params: {
  workspaceId: mongoose.Types.ObjectId; parentId: mongoose.Types.ObjectId | null;
  name: string; slug: string; goalType: StudyCardGoalType; iconKey: string; tone: StudyCardTone; order: number;
}): Promise<CardDoc> {
  const existing = await StudyCard.findOne({ workspaceId: params.workspaceId, parentId: params.parentId, slug: params.slug });
  if (existing) {
    if (shouldApply) {
      existing.name = params.name; existing.goalType = params.goalType; existing.iconKey = params.iconKey;
      existing.tone = params.tone; existing.order = params.order; existing.status = 'published'; existing.visibility = 'public';
      await existing.save();
    }
    return existing;
  }
  if (!shouldApply) {
    return { _id: new mongoose.Types.ObjectId(), ...params, files: [], status: 'published', visibility: 'public' } as CardDoc;
  }
  return StudyCard.create({
    workspaceId: params.workspaceId, parentId: params.parentId, name: params.name, slug: params.slug,
    goalType: params.goalType, iconKey: params.iconKey, tone: params.tone, order: params.order,
    status: 'published', visibility: 'public', files: [],
  });
}

async function walkPdfs(dir: string, relBase: string): Promise<Array<{ relPath: string; name: string; folder: string }>> {
  const out: Array<{ relPath: string; name: string; folder: string }> = [];
  let entries: string[] = [];
  try { entries = await fs.readdir(dir); } catch { return out; }
  for (const entry of entries) {
    const abs = path.join(dir, entry);
    const rel = path.join(relBase, entry).replace(/\\/g, '/');
    try {
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) out.push(...(await walkPdfs(abs, rel)));
      else if (entry.toLowerCase().endsWith('.pdf')) out.push({ relPath: `/static/${rel}`, name: entry, folder: relBase });
    } catch { /* skip */ }
  }
  return out;
}

async function scanPublicPdfs() {
  const results: Array<{ relPath: string; name: string; folder: string }> = [];
  for (const folder of ['gate-organized', 'state-psc-premium', 'exam-premium-packs', 'remaining-premium-packs', 'placement-premium', 'auto-enriched-leaves']) {
    try { results.push(...(await walkPdfs(path.join(PUBLIC_ROOT, folder), folder))); } catch { /* */ }
  }
  return results;
}

function guessFamilyKey(fileName: string, folder: string): string | null {
  const key = `${folder} ${fileName}`.toLowerCase();
  if (key.includes('upsc') || key.includes('cse')) return 'upsc';
  if (key.includes('gate')) return 'gate';
  if (key.includes('ssc') || key.includes('cgl') || key.includes('chsl') || key.includes('mts') || key.includes('cpo') || key.includes('steno') || key.includes('jht') || key.includes('selection-post') || key.includes('selection post')) return 'ssc';
  if (key.includes('railway') || key.includes('rrb') || key.includes('ntpc') || key.includes('group-d') || key.includes('group d') || key.includes('alp') || key.includes('rpf') || key.includes('dmrc') || key.includes('metro')) return 'railway';
  if (key.includes('bank') || key.includes('ibps') || key.includes('sbi')) return 'banking';
  if (key.includes('jee')) return 'jee';
  if (key.includes('neet')) return 'neet';
  if (key.includes('cbse') || key.includes('ncert')) return 'cbse';
  if (key.includes('psc') || key.includes('pcs') || key.includes('wbcs') || key.includes('uppsc')) return 'state-psc';
  if (key.includes('nda') || key.includes('cds') || key.includes('afcat') || key.includes('ssb') || key.includes('agniveer')) return 'defence';
  if (folder.includes('gate')) return 'gate';
  if (folder.includes('state-psc')) return 'state-psc';
  return null;
}

function guessChildExamKey(fileName: string, folder: string, familyKey: string): string | null {
  const key = `${folder} ${fileName}`.toLowerCase();
  const child = FAMILY_CHILD_EXAMS[familyKey];
  if (!child) return null;
  for (const exam of child.exams) {
    const tokens = [exam.key, exam.name, ...(exam.aliases || [])].join(' ').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((t) => t.length > 2);
    if (tokens.some((t) => key.includes(t))) return exam.key;
  }
  if (familyKey === 'ssc') {
    if (key.includes('cgl')) return 'ssc-cgl';
    if (key.includes('chsl')) return 'ssc-chsl';
    if (key.includes('mts')) return 'ssc-mts';
    if (key.includes('gd')) return 'ssc-gd';
    if (key.includes('cpo') || key.includes('si delhi') || key.includes('capf')) return 'ssc-cpo';
    if (key.includes('je') && key.includes('ssc')) return 'ssc-je';
    if (key.includes('steno')) return 'ssc-steno';
    if (key.includes('jht') || key.includes('hindi translator')) return 'ssc-jht';
    if (key.includes('selection')) return 'ssc-selection-post';
  }
  if (familyKey === 'railway') {
    if (key.includes('ntpc')) return 'rrb-ntpc';
    if (key.includes('group d') || key.includes('group-d') || key.includes('level 1')) return 'rrb-group-d';
    if (key.includes('alp') || key.includes('loco')) return 'rrb-alp';
    if (key.includes('rrb') && key.includes('je')) return 'rrb-je';
    if (key.includes('rpf') && (key.includes('si') || key.includes('sub'))) return 'rpf-si';
    if (key.includes('rpf')) return 'rpf-constable';
    if (key.includes('apprentice')) return 'rrc-apprentice';
    if (key.includes('metro') || key.includes('dmrc')) return 'metro-rail';
  }
  return null;
}

function guessResourceFolder(fileName: string, defaultFolders: string[]): string {
  const key = fileName.toLowerCase();
  if (key.includes('syllabus') || key.includes('pattern')) return 'Syllabus';
  if (key.includes('pyq') || key.includes('previous') || key.includes('paper')) return 'Previous Year Papers';
  if (key.includes('mock') || key.includes('test')) return 'Mock Tests';
  if (key.includes('answer') || key.includes('key')) return 'Answer Keys';
  if (key.includes('current') || key.includes('affairs') || key.includes('ga') || key.includes('gk')) return defaultFolders.find((f) => /awareness|gk|ga/i.test(f)) || 'Notes';
  if (key.includes('quant') || key.includes('math')) return defaultFolders.find((f) => /quant|math/i.test(f)) || 'Notes';
  if (key.includes('reason')) return defaultFolders.find((f) => /reason/i.test(f)) || 'Notes';
  if (key.includes('english')) return defaultFolders.find((f) => /english/i.test(f)) || 'Notes';
  if (key.includes('science')) return defaultFolders.find((f) => /science/i.test(f)) || 'Notes';
  if (key.includes('technical') || key.includes('engineering')) return defaultFolders.find((f) => /technical/i.test(f)) || 'Notes';
  return 'Notes';
}

function guessSource(fileName: string, folder: string) {
  const key = `${folder} ${fileName}`.toLowerCase();
  const brand = resolveCoachingBrand(key, 'platform');
  if (brand && brand.id !== 'study-hub') return { sourceType: 'faculty', sourceName: brand.label };
  if (key.includes('ncert')) return { sourceType: 'ncert', sourceName: 'NCERT' };
  if (key.includes('official') || key.includes('upsc') || key.includes('cbse') || key.includes('ssc.nic') || key.includes('rrbcdg')) return { sourceType: 'official', sourceName: 'Official' };
  return { sourceType: 'platform', sourceName: 'Study Hub Premium' };
}

async function ensureFolderTree(params: {
  workspaceId: mongoose.Types.ObjectId; parentId: mongoose.Types.ObjectId;
  folders: string[]; tone: StudyCardTone; startOrder?: number;
}): Promise<Map<string, CardDoc>> {
  const folderMap = new Map<string, CardDoc>();
  const start = params.startOrder ?? 1;
  for (const [fIndex, folderName] of params.folders.entries()) {
    const folderCard = await ensureCard({
      workspaceId: params.workspaceId, parentId: params.parentId, name: folderName, slug: slugify(folderName),
      goalType: 'resource_folder', iconKey: 'folder', tone: params.tone, order: start + fIndex,
    });
    folderMap.set(folderName, folderCard);
  }
  return folderMap;
}

async function attachPdfsToFolders(params: {
  folderMap: Map<string, CardDoc>;
  pdfs: Array<{ relPath: string; name: string; folder: string }>;
  defaultFolders: string[];
}): Promise<number> {
  let attached = 0;
  for (const pdf of params.pdfs) {
    const folderName = guessResourceFolder(pdf.name, params.defaultFolders);
    const folderCard = params.folderMap.get(folderName) || params.folderMap.get('Notes');
    if (!folderCard) continue;
    const { sourceType, sourceName } = guessSource(pdf.name, pdf.folder);
    const title = pdf.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();
    if (shouldApply && folderCard.files) {
      const already = (folderCard.files as any[]).some((f) => f.url === pdf.relPath || f.name === title);
      if (!already) {
        folderCard.files.push({
          name: title.slice(0, 140), url: pdf.relPath, mimeType: 'application/pdf',
          resourceType: folderName.toLowerCase().includes('paper') ? 'pyq' : 'notes',
          sourceType, sourceName, status: 'published', visibility: 'public', uploadedAt: new Date(),
        });
        await folderCard.save();
        attached += 1;
      }
    } else if (!shouldApply) attached += 1;
  }
  return attached;
}

async function run() {
  if (!MONGO_URI && shouldApply) throw new Error('MONGO_URI is required for --apply');
  console.log(`\n=== Unified Premium Catalog (${shouldApply ? 'APPLY' : 'DRY-RUN'}) ===\n`);
  if (MONGO_URI) await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });

  const workspace = MONGO_URI ? await ensureRootWorkspace() : { _id: new mongoose.Types.ObjectId() };
  const workspaceId = workspace._id as mongoose.Types.ObjectId;

  const categoryCard = await ensureCard({
    workspaceId, parentId: null, name: 'All Premium Exams', slug: 'all-premium-exams',
    goalType: 'exam_category', iconKey: 'heading', tone: 'violet', order: 1,
  });

  let familiesCreated = 0, examsCreated = 0, foldersCreated = 0, filesAttached = 0;
  const pdfs = await scanPublicPdfs();
  console.log(`Scanned PDFs: ${pdfs.length}`);

  for (const [index, family] of UNIFIED_PREMIUM_FAMILIES.entries()) {
    const familyTone = toneForFamily(family.tone);
    const familyCard = await ensureCard({
      workspaceId, parentId: categoryCard._id, name: family.name, slug: slugify(family.key),
      goalType: 'exam_family', iconKey: family.icon, tone: familyTone, order: index + 1,
    });
    familiesCreated += 1;

    const childPack = FAMILY_CHILD_EXAMS[family.key];
    const familyPdfs = pdfs.filter((p) => guessFamilyKey(p.name, p.folder) === family.key);

    if (childPack) {
      console.log(`  ${family.name}: ${childPack.exams.length} exams`);
      for (const [eIndex, exam] of childPack.exams.entries()) {
        const examCard = await ensureCard({
          workspaceId, parentId: familyCard._id, name: exam.name, slug: slugify(exam.key),
          goalType: 'exam', iconKey: exam.icon, tone: familyTone, order: eIndex + 1,
        });
        examsCreated += 1;

        const folders = exam.folders || childPack.defaultFolders;
        const folderMap = await ensureFolderTree({ workspaceId, parentId: examCard._id, folders, tone: familyTone });
        foldersCreated += folders.length;

        const examPdfs = familyPdfs.filter((p) => guessChildExamKey(p.name, p.folder, family.key) === exam.key);
        filesAttached += await attachPdfsToFolders({ folderMap, pdfs: examPdfs, defaultFolders: folders });

        const coachingParent = await ensureCard({
          workspaceId, parentId: examCard._id, name: 'Coaching Notes', slug: 'coaching-notes',
          goalType: 'resource_folder', iconKey: 'folder', tone: 'violet', order: folders.length + 1,
        });
        foldersCreated += 1;

        for (const [bIndex, brandId] of (family.coachingIds || []).entries()) {
          const brand = COACHING_BRANDS.find((b) => b.id === brandId);
          if (!brand || brand.id === 'study-hub') continue;
          await ensureCard({
            workspaceId, parentId: coachingParent._id, name: brand.label, slug: slugify(brand.id),
            goalType: 'resource_folder', iconKey: 'folder', tone: toneForFamily(brand.tone), order: bIndex + 1,
          });
          foldersCreated += 1;
        }
      }

      const unassigned = familyPdfs.filter((p) => !guessChildExamKey(p.name, p.folder, family.key));
      if (unassigned.length) {
        const generalMap = await ensureFolderTree({
          workspaceId, parentId: familyCard._id,
          folders: ['General Notes', 'Syllabus', 'Previous Year Papers'],
          tone: familyTone, startOrder: childPack.exams.length + 1,
        });
        foldersCreated += 3;
        filesAttached += await attachPdfsToFolders({ folderMap: generalMap, pdfs: unassigned, defaultFolders: childPack.defaultFolders });
      }
    } else {
      const folderMap = await ensureFolderTree({ workspaceId, parentId: familyCard._id, folders: [...family.folders], tone: familyTone });
      foldersCreated += family.folders.length;
      filesAttached += await attachPdfsToFolders({ folderMap, pdfs: familyPdfs, defaultFolders: [...family.folders] });

      const coachingParent = await ensureCard({
        workspaceId, parentId: familyCard._id, name: 'Coaching Notes', slug: 'coaching-notes',
        goalType: 'resource_folder', iconKey: 'folder', tone: 'violet', order: family.folders.length + 1,
      });
      foldersCreated += 1;

      for (const [bIndex, brandId] of (family.coachingIds || []).entries()) {
        const brand = COACHING_BRANDS.find((b) => b.id === brandId);
        if (!brand || brand.id === 'study-hub') continue;
        await ensureCard({
          workspaceId, parentId: coachingParent._id, name: brand.label, slug: slugify(brand.id),
          goalType: 'resource_folder', iconKey: 'folder', tone: toneForFamily(brand.tone), order: bIndex + 1,
        });
        foldersCreated += 1;
      }
    }
  }

  console.log(`\nFamilies: ${familiesCreated}`);
  console.log(`Exams:    ${examsCreated}  (SSC ${FAMILY_CHILD_EXAMS.ssc.exams.length} + Railway ${FAMILY_CHILD_EXAMS.railway.exams.length})`);
  console.log(`Folders:  ${foldersCreated}`);
  console.log(`PDF links: ${filesAttached}`);
  console.log(`Mode: ${shouldApply ? 'applied' : 'dry-run (pass --apply to write)'}\n`);
  if (MONGO_URI) await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
