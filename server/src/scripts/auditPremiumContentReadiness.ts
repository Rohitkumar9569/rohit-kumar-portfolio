import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard from '../models/StudyCard';
import Workspace from '../models/Workspace';

const ROOT_WORKSPACE_SLUG = 'study-hub';
const MONGO_URI = process.env.MONGO_URI;

type CardSnapshot = {
  _id: Types.ObjectId;
  parentId?: Types.ObjectId | null;
  name: string;
  slug: string;
  files?: Array<{ status?: string; url?: string }>;
};

const activeFileCount = (card: CardSnapshot) =>
  (card.files || []).filter((file) => (file.status || 'published') !== 'archived').length;

const countFilePrefix = (cards: CardSnapshot[], prefix: string) =>
  cards.reduce((sum, card) => (
    sum +
    (card.files || []).filter((file) => (
      (file.status || 'published') !== 'archived' &&
      String(file.url || '').startsWith(prefix)
    )).length
  ), 0);

const main = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is required.');
  await mongoose.connect(MONGO_URI);

  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean<{ _id: Types.ObjectId }>();
  if (!workspace) throw new Error('Study Hub workspace not found.');

  const cards = await StudyCard.find({ workspaceId: workspace._id, status: { $ne: 'archived' } })
    .select('_id parentId name slug files')
    .lean<CardSnapshot[]>();
  const childrenByParent = new Map<string, number>();

  for (const card of cards) {
    const parentKey = card.parentId?.toString() || 'root';
    childrenByParent.set(parentKey, (childrenByParent.get(parentKey) || 0) + 1);
  }

  const emptyLeaves = cards.filter((card) => activeFileCount(card) === 0 && !(childrenByParent.get(card._id.toString()) || 0));
  const totalFiles = cards.reduce((sum, card) => sum + activeFileCount(card), 0);
  const stateRoot = await StudyCard.findOne({
    workspaceId: workspace._id,
    parentId: null,
    slug: 'state-exams',
    status: { $ne: 'archived' },
  }).select('_id').lean<{ _id: Types.ObjectId }>();
  const stateChildren = stateRoot
    ? await StudyCard.find({ workspaceId: workspace._id, parentId: stateRoot._id, status: { $ne: 'archived' } })
      .select('name')
      .sort({ order: 1, name: 1 })
      .lean<Array<{ name: string }>>()
    : [];

  console.log('Premium content readiness audit');
  console.log(`Active folders: ${cards.length}`);
  console.log(`Active files: ${totalFiles}`);
  console.log(`Empty leaves: ${emptyLeaves.length}`);
  console.log(`Core exam premium files: ${countFilePrefix(cards, '/static/exam-premium-packs/')}`);
  console.log(`Remaining premium files: ${countFilePrefix(cards, '/static/remaining-premium-packs/')}`);
  console.log(`State PSC premium files: ${countFilePrefix(cards, '/static/state-psc-premium/')}`);
  console.log(`Placement premium files: ${countFilePrefix(cards, '/static/placement-premium-packs/')}`);
  console.log(`Auto-enriched starter files: ${countFilePrefix(cards, '/static/auto-enriched-leaves/')}`);
  console.log(`Direct state exam cards: ${stateChildren.length}`);
  console.log(`State exam top order: ${stateChildren.slice(0, 8).map((item) => item.name).join(', ')}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
