import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import StudyCard from '../models/StudyCard';
import Workspace from '../models/Workspace';
import { detailedUniversitySpecs } from './studyHubUniversitySpecs';

const MONGO_URI = process.env.MONGO_URI;
const ROOT_WORKSPACE_SLUG = 'study-hub';
const REQUIRED_SHELVES = ['Syllabus', 'Previous Year Papers', 'Study Material'];
const REQUIRED_SHELF_KEYS = new Set(REQUIRED_SHELVES.map((shelf) => shelf.toLowerCase()));
const RESOURCE_CONTAINER_KEYS = new Set([
  ...REQUIRED_SHELVES.map((shelf) => shelf.toLowerCase()),
  'official sources',
  'mock tests',
  'answer keys',
  'strategy',
  'updates',
  'admissions',
  'examination',
  'about university',
]);

type CardSnapshot = {
  _id: any;
  parentId?: any | null;
  name: string;
  slug: string;
  goalType?: string;
  status: string;
  visibility: string;
  files?: any[];
};

const slugify = (value = '', fallback = 'item') => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '');
  return slug || fallback;
};

const normalizeKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const pathKey = (parts: string[]) => parts.map(normalizeKey).join(' / ');
const parseBranch = (branch: string) => branch.split('/').map((part) => part.trim()).filter(Boolean);
const parentKey = (parentId?: any | null) => parentId ? String(parentId) : 'root';
const getFileCount = (card?: CardSnapshot | null) =>
  (card?.files || []).filter((file: any) => file?.status !== 'archived').length;

const hasBroadGroupingLabel = (parts: string[]) =>
  parts.some((part) => {
    const key = normalizeKey(part);
    return (
      /\b(subject wise|department wise|program wise|specialty wise|ug pg|all programs|all colleges|btech mca mba|btech diploma mba|btech bca bba|btech bpharm mba)\b/.test(key) ||
      /\b(ba bsc bcom|mba med|bams bhms bums)\b/.test(key)
    );
  });

const isResourceContainer = (name = '') => RESOURCE_CONTAINER_KEYS.has(normalizeKey(name));
const isRequiredShelf = (name = '') => REQUIRED_SHELF_KEYS.has(normalizeKey(name));

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
  if (!workspace?._id) throw new Error('Study Hub workspace not found.');

  const cards = await StudyCard.find({
    workspaceId: workspace._id,
    status: { $ne: 'archived' },
    visibility: 'public',
  }).select('_id parentId name slug goalType status visibility files').lean<CardSnapshot[]>();

  const cardsById = new Map(cards.map((card) => [String(card._id), card]));
  const childrenByParent = new Map<string, CardSnapshot[]>();
  for (const card of cards) {
    const siblings = childrenByParent.get(parentKey(card.parentId)) || [];
    siblings.push(card);
    childrenByParent.set(parentKey(card.parentId), siblings);
  }

  const findPath = (parts: string[]) => {
    let current: CardSnapshot | undefined;
    let pid: any | null = null;
    for (const part of parts) {
      const slug = slugify(part);
      current = (childrenByParent.get(parentKey(pid)) || []).find((child) => child.slug === slug);
      if (!current) return null;
      pid = current._id;
    }
    return current || null;
  };

  const getPathParts = (card: CardSnapshot) => {
    const parts: string[] = [];
    let current: CardSnapshot | undefined = card;
    const seen = new Set<string>();
    while (current) {
      const id = String(current._id);
      if (seen.has(id)) break;
      seen.add(id);
      parts.unshift(current.name);
      current = current.parentId ? cardsById.get(String(current.parentId)) : undefined;
    }
    return parts;
  };

  const isUnderUniversityExams = (card: CardSnapshot) => normalizeKey(getPathParts(card)[0] || '') === 'university exams';

  const expectedFullPaths = new Set<string>();
  const expectedCourseShelves = new Map<string, Set<string>>();
  const expectedCoursesBySpec = new Map<string, Set<string>>();
  const configuredBroadGroups: string[] = [];

  for (const spec of detailedUniversitySpecs) {
    const rootParts = [spec.category, spec.family, spec.exam];
    expectedFullPaths.add(pathKey(rootParts));
    const specKey = rootParts.join(' / ');

    for (const branch of spec.branches) {
      const branchParts = parseBranch(branch);
      if (!branchParts.length) continue;
      const fullParts = [...rootParts, ...branchParts];
      expectedFullPaths.add(pathKey(fullParts));

      if (hasBroadGroupingLabel(branchParts) && configuredBroadGroups.length < 80) {
        configuredBroadGroups.push(fullParts.join(' / '));
      }

      const last = branchParts[branchParts.length - 1];
      if (!isRequiredShelf(last)) continue;
      const courseParts = branchParts.slice(0, -1);
      if (!courseParts.length || isResourceContainer(courseParts[0])) continue;

      const courseFullParts = [...rootParts, ...courseParts];
      const courseFullKey = pathKey(courseFullParts);
      const shelves = expectedCourseShelves.get(courseFullKey) || new Set<string>();
      shelves.add(normalizeKey(last));
      expectedCourseShelves.set(courseFullKey, shelves);

      const specCourses = expectedCoursesBySpec.get(specKey) || new Set<string>();
      specCourses.add(courseFullParts.join(' / '));
      expectedCoursesBySpec.set(specKey, specCourses);
    }
  }

  const missingRoots: string[] = [];
  const missingExpectedPaths: string[] = [];
  const missingCourseShelves: string[] = [];
  const incompleteConfiguredCourses: string[] = [];

  for (const spec of detailedUniversitySpecs) {
    const rootParts = [spec.category, spec.family, spec.exam];
    const root = findPath(rootParts);
    if (!root) {
      missingRoots.push(rootParts.join(' / '));
      continue;
    }

    for (const branch of spec.branches) {
      const branchParts = parseBranch(branch);
      if (!branchParts.length) continue;
      const fullParts = [...rootParts, ...branchParts];
      if (!findPath(fullParts) && missingExpectedPaths.length < 160) {
        missingExpectedPaths.push(fullParts.join(' / '));
      }
    }
  }

  for (const [courseKey, shelves] of expectedCourseShelves.entries()) {
    const courseParts = courseKey.split(' / ');
    const missingInSpec = REQUIRED_SHELVES
      .map(normalizeKey)
      .filter((shelfKey) => !shelves.has(shelfKey));
    if (missingInSpec.length) {
      incompleteConfiguredCourses.push(`${courseParts.join(' / ')} -> missing in spec: ${missingInSpec.join(', ')}`);
    }

    const course = findPath(courseParts);
    if (!course) {
      missingCourseShelves.push(`${courseParts.join(' / ')} -> course folder missing`);
      continue;
    }

    for (const shelf of REQUIRED_SHELVES) {
      const shelfCard = findPath([...courseParts, shelf]);
      if (!shelfCard) missingCourseShelves.push(`${courseParts.join(' / ')} / ${shelf}`);
    }
  }

  const redundantEmptyShelves: string[] = [];
  const resourceFirstShelves: string[] = [];

  for (const card of cards) {
    if (!isUnderUniversityExams(card) || !isRequiredShelf(card.name)) continue;

    const parts = getPathParts(card);
    const childCount = (childrenByParent.get(String(card._id)) || []).length;
    const fileCount = getFileCount(card);
    const isExpected = expectedFullPaths.has(pathKey(parts));
    const parent = card.parentId ? cardsById.get(String(card.parentId)) : null;
    const siblingNames = parent ? (childrenByParent.get(String(parent._id)) || []).map((sibling) => sibling.name) : [];
    const parentHasCourseLikeChildren = siblingNames.some((name) => !isResourceContainer(name));

    if (!isExpected && childCount === 0 && fileCount === 0 && redundantEmptyShelves.length < 160) {
      redundantEmptyShelves.push(parts.join(' / '));
    }

    if (parentHasCourseLikeChildren && parts.length <= 4 && (childCount > 0 || fileCount > 0) && resourceFirstShelves.length < 80) {
      resourceFirstShelves.push(`${parts.join(' / ')} (${childCount} children, ${fileCount} files)`);
    }
  }

  const specSummary = Array.from(expectedCoursesBySpec.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([specName, courses]) => `${specName}: ${courses.size} course/program node(s)`);

  const lines = [
    'University/College structure dry-run audit complete. No DB writes were made.',
    `Configured university/exam kits: ${detailedUniversitySpecs.length}.`,
    `Active StudyCard folders scanned: ${cards.length}.`,
    `Configured course/program nodes with resource shelves: ${expectedCourseShelves.size}.`,
    `Missing roots: ${missingRoots.length}. Missing expected branch paths: ${missingExpectedPaths.length}.`,
    `Missing course-level core shelves in DB: ${missingCourseShelves.length}.`,
    `Courses configured without all 3 core shelves: ${incompleteConfiguredCourses.length}.`,
    `Empty redundant university shelf archive candidates: ${redundantEmptyShelves.length}.`,
    `Resource-first shelf candidates needing manual move review: ${resourceFirstShelves.length}.`,
    `Broad grouping labels needing online/course-specific split review: ${configuredBroadGroups.length}.`,
    '',
    'Course/program node summary:',
    ...specSummary.slice(0, 80).map((line) => `- ${line}`),
    '',
    missingRoots.length ? `Missing roots:\n- ${missingRoots.slice(0, 40).join('\n- ')}` : 'Missing roots: none.',
    '',
    missingExpectedPaths.length ? `Missing expected paths sample:\n- ${missingExpectedPaths.slice(0, 60).join('\n- ')}` : 'Missing expected paths: none.',
    '',
    missingCourseShelves.length ? `Missing course-level shelves sample:\n- ${missingCourseShelves.slice(0, 80).join('\n- ')}` : 'Missing course-level shelves: none.',
    '',
    incompleteConfiguredCourses.length ? `Configured course spec gaps sample:\n- ${incompleteConfiguredCourses.slice(0, 80).join('\n- ')}` : 'Configured course spec gaps: none.',
    '',
    redundantEmptyShelves.length ? `Would archive empty redundant shelves sample:\n- ${redundantEmptyShelves.slice(0, 80).join('\n- ')}` : 'Would archive empty redundant shelves: none.',
    '',
    resourceFirstShelves.length ? `Resource-first move review sample:\n- ${resourceFirstShelves.slice(0, 40).join('\n- ')}` : 'Resource-first move review: none.',
    '',
    configuredBroadGroups.length ? `Broad grouping split review sample:\n- ${configuredBroadGroups.slice(0, 60).join('\n- ')}` : 'Broad grouping split review: none.',
  ];

  console.log(lines.join('\n'));
};

run()
  .catch((error) => {
    console.error('University/college structure dry-run audit failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
