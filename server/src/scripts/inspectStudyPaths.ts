import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import StudyCard from '../models/StudyCard';
import Workspace from '../models/Workspace';

const normalize = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const formatChildren = (children: Array<{ name: string }>) =>
  children.slice(0, 12).map((child) => child.name).join(' | ') || 'none';

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not defined.');

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await Workspace.findOne({ slug: 'study-hub' }).select('_id').lean();
  if (!workspace) throw new Error('Study Hub workspace not found.');

  const getChildren = (parentId: unknown) =>
    StudyCard.find({
      workspaceId: workspace._id,
      parentId,
      status: { $ne: 'archived' },
    })
      .sort({ order: 1, name: 1 })
      .select('name slug goalType files parentId')
      .lean();

  const findPath = async (parts: string[]) => {
    let parentId: unknown = null;
    let lastCard: any = null;

    for (const part of parts) {
      const children = await getChildren(parentId);
      const hit = children.find((child) => normalize(child.name) === normalize(part));
      if (!hit) {
        console.log(`MISS ${parts.join(' / ')} at "${part}"`);
        console.log(`  available: ${formatChildren(children)}`);
        return;
      }
      lastCard = hit;
      parentId = hit._id;
    }

    const children = await getChildren(parentId);
    console.log(`PATH ${parts.join(' / ')}`);
    console.log(`  url: /app/workspace/study-hub?card=${lastCard?._id}`);
    console.log(`  children: ${formatChildren(children)}`);
    console.log(`  files: ${(lastCard?.files || []).length}`);
  };

  const roots = await getChildren(null);
  console.log(`ROOTS ${formatChildren(roots)}`);

  await findPath(['School Boards', 'CBSE', 'Class 12', 'Geography']);
  await findPath(['School Boards', 'CBSE', 'Class 10']);
  await findPath(['School Boards', 'CBSE', 'Class 10', 'Study Material']);
  await findPath(['School Boards', 'CBSE', 'Class 10', 'Social Science']);
  await findPath(['School Boards', 'CBSE', 'Class 10', 'Social Science', 'Geography']);
  await findPath(['Competitive Exams', 'UPSC CSE']);
  await findPath(['Competitive Exams', 'UPSC CSE', 'Mains']);
  await findPath(['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper I']);
  await findPath(['Competitive Exams', 'UPSC CSE', 'Mains', 'GS Paper I', 'Geography']);
  await findPath(['Entrance Exams', 'JEE (Main + Advanced)', 'Physics']);
  await findPath(['Entrance Exams', 'NEET', 'NEET UG', 'Biology']);
  await findPath(['Entrance Exams', 'GATE']);
  await findPath(['Entrance Exams', 'Management']);
  await findPath(['Entrance Exams', 'Management', 'MAT']);
  await findPath(['Entrance Exams', 'Law']);
  await findPath(['Entrance Exams', 'Law', 'CLAT']);
  await findPath(['Entrance Exams', 'Professional Certifications']);
  await findPath(['Entrance Exams', 'Professional Certifications', 'CA Foundation']);
  await findPath(['State Exams']);
  await findPath(['State Exams', 'UPPSC PCS']);
  await findPath(['University Exams']);
  await findPath(['University Exams', 'Common Entrances']);
  await findPath(['University Exams', 'Common Entrances', 'CUET UG']);
  await findPath(['University Exams', 'Engineering Universities', 'Delhi Technical Universities and IPU']);
  await findPath(['University Exams', 'Engineering Universities', 'Delhi Technical Universities and IPU', 'BTech']);
  await findPath(['Study Abroad']);
  await findPath(['Study Abroad', 'GRE']);
  await findPath(['Foreign Language']);
  await findPath(['Foreign Language', 'English Tests']);
  await findPath(['Placement / Private']);
  await findPath(['Placement / Private', 'Service Based IT']);
  await findPath(['Placement / Private', 'Common Preparation', 'DSA & Placement Prep']);
  await findPath(['Placement / Private', 'Service Based IT', 'TCS']);
};

run()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
