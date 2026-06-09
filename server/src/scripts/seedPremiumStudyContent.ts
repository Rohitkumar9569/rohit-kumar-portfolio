import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Resource from '../models/Resource';
import Workspace from '../models/Workspace';
import { premiumStudyResources } from './premiumStudyContentTemplates';

const MONGO_URI = process.env.MONGO_URI;
const shouldApply = process.argv.includes('--apply');
const verifyOnly = process.argv.includes('--verify');

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

const toPhase = (label: string, index: number) => ({
  key: slugify(label, `phase-${index + 1}`),
  label,
  order: index + 1,
});

const resourceTextIndexKeys = {
  title: 'text',
  summary: 'text',
  subject: 'text',
  topic: 'text',
  tags: 'text',
  syllabusNodes: 'text',
} as const;

const ensureResourceTextIndex = async () => {
  const indexes = await Resource.collection.indexes();
  const legacyTextIndex = indexes.find((index: any) => (
    Object.values(index.key || {}).includes('text') &&
    index.language_override !== 'textLanguage'
  ));

  if (legacyTextIndex?.name) {
    console.log(`[premium-content] Rebuilding legacy text index: ${legacyTextIndex.name}`);
    await Resource.collection.dropIndex(legacyTextIndex.name);
  }

  await Resource.collection.createIndex(resourceTextIndexKeys, {
    name: 'resource_search_text',
    default_language: 'none',
    language_override: 'textLanguage',
  });
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');

  console.log(`${verifyOnly ? 'Verifying' : shouldApply ? 'Applying' : 'Dry run'} premium Study Hub content seed.`);
  console.log(`Premium resources prepared: ${premiumStudyResources.length}.`);

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });

  if (verifyOnly) {
    const slugs = premiumStudyResources.map((seed) => seed.slug);
    const resources = await Resource.find({ slug: { $in: slugs } })
      .select('slug status content title')
      .lean();
    const foundSlugs = new Set(resources.map((item) => item.slug));
    const contentReady = resources.filter((item) => item.status === 'published' && String(item.content || '').trim().length > 500);
    const missing = slugs.filter((slug) => !foundSlugs.has(slug));

    console.log(`Premium resources found: ${resources.length}/${slugs.length}.`);
    console.log(`Published resources with rich content: ${contentReady.length}/${slugs.length}.`);
    if (missing.length) console.log(`Missing slugs: ${missing.join(', ')}`);
    return;
  }

  await ensureResourceTextIndex();

  let workspaceCount = 0;
  let resourceCount = 0;

  for (const seed of premiumStudyResources) {
    if (!shouldApply) {
      console.log(`[dry-run] ${seed.workspace.shortName} -> ${seed.title}`);
      continue;
    }

    const workspace = await Workspace.findOneAndUpdate(
      { slug: seed.workspace.slug },
      {
        $set: {
          name: seed.workspace.name,
          shortName: seed.workspace.shortName,
          slug: seed.workspace.slug,
          type: seed.workspace.type,
          category: seed.workspace.category,
          description: seed.workspace.description,
          visibility: 'public',
          status: 'active',
          accentColor: seed.workspace.accentColor,
          priority: seed.workspace.priority,
          readiness: seed.workspace.readiness,
          template: {
            phases: seed.workspace.phases.map(toPhase),
            facets: [
              { key: 'stage', label: 'Stage', values: seed.workspace.phases.map((label) => slugify(label)) },
              { key: 'subject', label: 'Subject', values: [seed.subject] },
            ],
            resourceTypes: seed.workspace.resourceTypes,
          },
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    workspaceCount += 1;

    await Resource.findOneAndUpdate(
      { slug: seed.slug },
      {
        $set: {
          title: seed.title,
          slug: seed.slug,
          summary: seed.summary,
          type: seed.type,
          status: 'published',
          visibility: 'public',
          primaryWorkspaceId: workspace._id,
          workspaceIds: [workspace._id],
          subject: seed.subject,
          topic: seed.topic,
          language: seed.language,
          sourceType: seed.sourceType,
          sourceName: seed.sourceName,
          difficulty: seed.difficulty,
          tags: seed.tags,
          facets: seed.facets,
          syllabusNodes: seed.syllabusNodes,
          content: seed.content,
          externalLinks: [],
          isFeatured: seed.isFeatured,
          updatedFor: seed.updatedFor,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    resourceCount += 1;
    console.log(`[premium-content] Upserted ${seed.slug}`);
  }

  if (shouldApply) {
    console.log(`Premium content seed complete. Workspaces touched: ${workspaceCount}. Resources upserted: ${resourceCount}.`);
  }
};

run()
  .catch((error) => {
    console.error('Premium Study Hub content seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
