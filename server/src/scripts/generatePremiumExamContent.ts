import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import type { PremiumContentKind, PremiumExamFamily, PremiumPromptLanguage, PremiumPromptTopic } from './aiContentPromptSystem';
import {
  buildPremiumBulkPromptPlan,
  buildPremiumExamContentPrompt,
  listPremiumPromptTopics,
} from './aiContentPromptSystem';

const args = process.argv.slice(2);

const hasFlag = (flag: string) => args.includes(flag);

const readArg = (name: string) => {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();

  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1]?.trim();
  return '';
};

const splitArg = (name: string) => readArg(name)
  .split('|')
  .map((item) => item.trim())
  .filter(Boolean);

const slugify = (value: string, fallback = 'premium-content') => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '');

  return slug || fallback;
};

const parseWords = (): [number, number] | undefined => {
  const raw = readArg('words');
  if (!raw) return undefined;

  const [minRaw, maxRaw] = raw.split('-').map((part) => Number(part.trim()));
  if (!Number.isFinite(minRaw) || !Number.isFinite(maxRaw) || minRaw <= 0 || maxRaw < minRaw) {
    throw new Error('Invalid --words value. Use format like --words=1200-1800.');
  }

  return [minRaw, maxRaw];
};

const customTopicFromArgs = (): PremiumPromptTopic | null => {
  const exam = readArg('exam');
  const subject = readArg('subject');
  const topic = readArg('topic');

  if (!exam && !subject && !topic) return null;
  if (!exam || !subject || !topic) {
    throw new Error('Custom prompt needs --exam, --subject and --topic.');
  }

  const kind = (readArg('kind') || 'notes') as PremiumContentKind;
  const examFamily = (readArg('family') || 'other') as PremiumExamFamily;
  const language = (readArg('language') || 'hinglish') as PremiumPromptLanguage;
  const syllabusFocus = splitArg('syllabus');
  const mustCover = splitArg('cover');
  const tableIdeas = splitArg('tables');
  const pyqSignals = splitArg('pyq');
  const practiceMix = splitArg('practice');
  const factsToVerify = splitArg('verify');

  return {
    id: `custom-${slugify(exam)}-${slugify(subject)}-${slugify(topic)}`,
    examFamily,
    exam,
    stage: readArg('stage') || undefined,
    paper: readArg('paper') || undefined,
    subject,
    topic,
    kind,
    audience: readArg('audience') || `${exam} aspirants`,
    level: (readArg('level') || 'intermediate') as PremiumPromptTopic['level'],
    language,
    targetWords: parseWords() || [1200, 1800],
    syllabusFocus: syllabusFocus.length ? syllabusFocus : [`${subject}: ${topic}`],
    mustCover: mustCover.length ? mustCover : [
      'concept clarity',
      'syllabus mapping',
      'exam fact bank',
      'PYQ pattern and traps',
      'practice and revision plan',
    ],
    tableIdeas: tableIdeas.length ? tableIdeas : [
      'high-yield fact table',
      'comparison table',
      'trap scanner table',
      'revision table',
    ],
    pyqSignals: pyqSignals.length ? pyqSignals : ['PYQ themes and examiner intent'],
    practiceMix: practiceMix.length ? practiceMix : ['objective drills', 'short-answer prompts', 'revision flashcards'],
    factsToVerify: factsToVerify.length ? factsToVerify : ['latest official syllabus and notification'],
    tags: splitArg('tags').length ? splitArg('tags') : [slugify(exam), slugify(subject), slugify(topic)],
  };
};

const writeOutput = async (filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
};

const run = async () => {
  if (hasFlag('--help')) {
    console.log([
      'Premium content generator',
      '',
      'Examples:',
      '  npm run generate-premium-content -- --list',
      '  npm run generate-premium-content -- --id=upsc-polity-fundamental-rights --dry-run',
      '  npm run generate-premium-content -- --id=gate-cse-data-structures --apply',
      '  npm run generate-premium-content -- --exam="SSC CGL" --subject="Quant" --topic="Percentage" --dry-run',
    ].join('\n'));
    return;
  }

  if (hasFlag('--list')) {
    const plan = buildPremiumBulkPromptPlan({
      examFamily: (readArg('family') || undefined) as PremiumExamFamily | undefined,
      exam: readArg('exam') || undefined,
      subject: readArg('subject') || undefined,
      kind: (readArg('kind') || undefined) as PremiumContentKind | undefined,
    });
    console.log(plan);
    return;
  }

  const customTopic = customTopicFromArgs();
  const id = readArg('id');

  if (!customTopic && !id) {
    const topics = listPremiumPromptTopics().slice(0, 12).map((topic) => `- ${topic.id} (${topic.exam} / ${topic.subject})`);
    throw new Error(`Use --id=<prompt-id> or custom --exam --subject --topic.\n\nAvailable examples:\n${topics.join('\n')}`);
  }

  const prompt = buildPremiumExamContentPrompt(customTopic || id, {
    language: (readArg('language') || undefined) as PremiumPromptLanguage | undefined,
    targetWords: parseWords(),
    currentAffairsWindow: readArg('current-window') || undefined,
    officialSourceHint: readArg('source-hint') || undefined,
    extraInstructions: splitArg('extra'),
  });

  if (hasFlag('--dry-run') || !hasFlag('--apply')) {
    console.log(prompt);
    return;
  }

  const { generateTextWithFallback } = await import('../utils/aiFallback');
  const generated = await generateTextWithFallback(prompt);
  const outputId = customTopic?.id || id;
  const outArg = readArg('out');
  const outputPath = outArg
    ? path.resolve(process.cwd(), outArg)
    : path.resolve(process.cwd(), 'generated', 'premium-content', `${slugify(outputId)}.md`);

  await writeOutput(outputPath, generated);
  console.log(`Premium content generated: ${outputPath}`);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
