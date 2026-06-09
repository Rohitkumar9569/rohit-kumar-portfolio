import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import StudyCard from '../models/StudyCard';
import Workspace from '../models/Workspace';

const MONGO_URI = process.env.MONGO_URI;
const ROOT_WORKSPACE_SLUG = 'study-hub';

const names = [
  'Entrance Exams',
  'Study Abroad',
  'Foreign Language',
  'University Exams',
  'JEE (Main + Advanced)',
  'NEET',
  'MAT',
  'Management',
  'Law',
  'Professional Certifications',
  'Common Entrances',
  'CBSE',
  'UPSC CSE',
  'Social Science',
  'Geography',
];

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');

  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
  if (!workspace?._id) throw new Error('Study Hub workspace not found.');

  const allCards = await StudyCard.find({ workspaceId: workspace._id })
    .select('_id parentId name slug status visibility')
    .lean();
  const byId = new Map(allCards.map((card: any) => [String(card._id), card]));
  const wanted = allCards.filter((card: any) => names.includes(card.name));
  const roots = allCards.filter((card: any) => !card.parentId);

  console.log('ROOT DOCUMENTS');
  for (const card of roots as any[]) {
    console.log([
      String(card._id),
      `name=${card.name}`,
      `slug=${card.slug}`,
      `status=${card.status}`,
      `visibility=${card.visibility}`,
    ].join(' | '));
  }

  console.log('MATCHED DOCUMENTS');

  const pathFor = (card: any) => {
    const parts: string[] = [];
    const seen = new Set<string>();
    let current = card;

    while (current) {
      const currentId = String(current._id);
      if (seen.has(currentId)) {
        parts.unshift('[cycle]');
        break;
      }

      seen.add(currentId);
      parts.unshift(`${current.name}[${current.status}]`);
      current = current.parentId ? byId.get(String(current.parentId)) : null;
    }

    return parts.join(' / ');
  };

  for (const card of wanted as any[]) {
    console.log([
      String(card._id),
      `workspace=${card.workspaceId ? String(card.workspaceId) : 'none'}`,
      `parent=${card.parentId ? String(card.parentId) : 'root'}`,
      `name=${card.name}`,
      `slug=${card.slug}`,
      `status=${card.status}`,
      `visibility=${card.visibility}`,
      `path=${pathFor(card)}`,
    ].join(' | '));
  }
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
  });
