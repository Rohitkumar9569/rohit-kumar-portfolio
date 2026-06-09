import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import mongoose, { Types } from 'mongoose';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import StudyCard from '../models/StudyCard';
import Workspace from '../models/Workspace';
import { detailedPlacementSpecs, type StudyHubPlacementSpec } from './studyHubPlacementSpecs';

const MONGO_URI = process.env.MONGO_URI;
const ROOT_WORKSPACE_SLUG = 'study-hub';
const STATIC_ROOT = '/static/placement-premium';
const CONTENT_VERSION = 'premium-format-v2';

type CardDoc = any;

type PremiumPack = {
  key: string;
  targetPath: string[];
  title: string;
  resourceType: string;
  subject: string;
  topic: string;
  content: string[];
};

const slugify = (value = '', fallback = 'item') => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || fallback;
};

const normalizeKey = (value = '') => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');

const findSibling = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  name: string,
  includeArchived = false
) =>
  StudyCard.findOne({
    workspaceId,
    parentId: parentId || null,
    slug: slugify(name),
    ...(includeArchived ? {} : { status: { $ne: 'archived' } }),
  });

const findPath = async (workspaceId: Types.ObjectId, parts: string[]) => {
  let parentId: Types.ObjectId | null = null;
  let current: CardDoc | null = null;
  for (const part of parts) {
    current = await findSibling(workspaceId, parentId, part);
    if (!current) return null;
    parentId = current._id as Types.ObjectId;
  }
  return current;
};

const getFolderIconKey = (name: string) => {
  const key = normalizeKey(name);
  if (key.includes('syllabus')) return 'syllabus';
  if (key.includes('previous') || key.includes('paper') || key.includes('pyq')) return 'pyq';
  if (key.includes('study') || key.includes('notes') || key.includes('handbook')) return 'study-material';
  if (key.includes('coding') || key.includes('dsa')) return 'coding';
  if (key.includes('interview') || key.includes('hr')) return 'qa';
  if (key.includes('resume') || key.includes('portfolio')) return 'student-profile';
  if (key.includes('mock') || key.includes('practice')) return 'mock-test';
  if (key.includes('tracker') || key.includes('checklist')) return 'clipboard-check';
  if (key.includes('strategy') || key.includes('roadmap')) return 'target';
  return 'folder';
};

const getFolderTone = (name: string) => {
  const key = normalizeKey(name);
  if (key.includes('syllabus') || key.includes('strategy')) return 'amber';
  if (key.includes('previous') || key.includes('paper') || key.includes('pyq')) return 'violet';
  if (key.includes('study') || key.includes('notes') || key.includes('handbook')) return 'blue';
  if (key.includes('coding') || key.includes('dsa')) return 'emerald';
  if (key.includes('interview') || key.includes('hr')) return 'rose';
  if (key.includes('resume') || key.includes('portfolio')) return 'cyan';
  return 'slate';
};

const ensureChildCard = async (workspaceId: Types.ObjectId, parentId: Types.ObjectId, name: string) => {
  const existing = await findSibling(workspaceId, parentId, name);
  if (existing) return existing;

  const archived = await findSibling(workspaceId, parentId, name, true);
  if (archived) {
    archived.status = 'published';
    archived.visibility = 'public';
    archived.iconKey = archived.iconKey || getFolderIconKey(name);
    archived.tone = archived.tone || getFolderTone(name);
    archived.files = archived.files || [];
    await archived.save();
    return archived;
  }

  const payload = {
    workspaceId,
    parentId,
    name,
    slug: slugify(name),
    iconKey: getFolderIconKey(name),
    goalType: 'resource_folder',
    tone: getFolderTone(name),
    order: 0,
    status: 'published',
    visibility: 'public',
    files: [],
  };

  try {
    return await StudyCard.create(payload);
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
    const duplicate = await findSibling(workspaceId, parentId, name, true);
    if (!duplicate) throw error;
    duplicate.status = 'published';
    duplicate.visibility = 'public';
    duplicate.iconKey = duplicate.iconKey || getFolderIconKey(name);
    duplicate.tone = duplicate.tone || getFolderTone(name);
    duplicate.files = duplicate.files || [];
    await duplicate.save();
    return duplicate;
  }
};

const ensureTargetPath = async (workspaceId: Types.ObjectId, root: CardDoc, parts: string[]) => {
  let current = root;
  for (const part of parts) {
    current = await ensureChildCard(workspaceId, current._id as Types.ObjectId, part);
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

const drawTextBlock = async (pdfDoc: PDFDocument, title: string, subtitle: string, content: string[]) => {
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const width = 595;
  const height = 842;
  const margin = 48;
  let page = pdfDoc.addPage([width, height]);
  let y = height - 54;

  const addPage = () => {
    page = pdfDoc.addPage([width, height]);
    y = height - 48;
  };

  const drawWrapped = (text: string, size = 10.5, font = regular, color = rgb(0.17, 0.21, 0.28), indent = 0) => {
    const maxChars = Math.max(34, Math.floor((width - margin * 2 - indent) / (size * 0.48)));
    const lines = wrapLine(text, maxChars);
    for (const line of lines) {
      if (y < 58) addPage();
      page.drawText(line, {
        x: margin + indent,
        y,
        size,
        font,
        color,
      });
      y -= size + 4;
    }
  };

  page.drawRectangle({
    x: 0,
    y: height - 96,
    width,
    height: 96,
    color: rgb(0.03, 0.08, 0.16),
  });
  page.drawText(title.slice(0, 82), {
    x: margin,
    y: height - 48,
    size: 18,
    font: bold,
    color: rgb(1, 1, 1),
  });
  page.drawText(subtitle.slice(0, 96), {
    x: margin,
    y: height - 72,
    size: 10,
    font: regular,
    color: rgb(0.78, 0.9, 1),
  });
  y = height - 126;

  drawWrapped('Study Hub Premium Placement Pack', 11, bold, rgb(0.02, 0.44, 0.58));
  drawWrapped('This is original study material for preparation. It is not a copied official or proprietary company paper.', 9.5);
  y -= 10;

  for (const item of content) {
    const isHeading = item.startsWith('## ');
    const isBullet = item.startsWith('- ');
    const text = isHeading ? item.replace(/^##\s+/, '') : item;
    if (isHeading) {
      y -= 4;
      drawWrapped(text, 13, bold, rgb(0.03, 0.08, 0.16));
      y -= 2;
    } else if (isBullet) {
      drawWrapped(`- ${item.replace(/^-\s+/, '')}`, 10.5, regular, rgb(0.17, 0.21, 0.28), 10);
    } else {
      drawWrapped(text, 10.5);
    }
  }

  pdfDoc.getPages().forEach((pdfPage, index) => {
    pdfPage.drawLine({
      start: { x: margin, y: 38 },
      end: { x: width - margin, y: 38 },
      thickness: 0.6,
      color: rgb(0.82, 0.87, 0.93),
    });
    pdfPage.drawText('Study Hub Premium', {
      x: margin,
      y: 22,
      size: 8.5,
      font: bold,
      color: rgb(0.02, 0.44, 0.58),
    });
    pdfPage.drawText(`Page ${index + 1} of ${pdfDoc.getPageCount()}`, {
      x: width - margin - 72,
      y: 22,
      size: 8.5,
      font: regular,
      color: rgb(0.36, 0.42, 0.5),
    });
  });
};

const writePdf = async (filePath: string, title: string, subtitle: string, content: string[]) => {
  const pdfDoc = await PDFDocument.create();
  await drawTextBlock(pdfDoc, title, subtitle, content);
  const bytes = await pdfDoc.save();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, bytes);
  return bytes.length;
};

const servicePractice = (company: string) => [
  '## Original PYQ Style Practice',
  `- This set is designed for ${company} style campus preparation: aptitude speed, programming logic, SQL, CS basics, communication, and HR clarity.`,
  '## Section A: Quantitative Aptitude',
  '- Q1. A candidate solves 60% of a set in 36 minutes. Estimate the total time for the full set and explain the shortcut.',
  '- Q2. A, B, and C invest in ratio 3:4:5. After 8 months A doubles investment. Find final profit ratio after 12 months.',
  '- Q3. A pipe fills a tank in 12 hours and another empties it in 18 hours. If both are open, find net time and the faster shortcut.',
  '- Q4. In a class, average marks rise from 64 to 67 when one student scoring 28 is replaced. Find the new student score for class strength 40.',
  '## Section B: Reasoning and Verbal',
  '- Q5. Five candidates sit in a row. A is left of B, C is not at an end, and D is right of E. Build two possible arrangements.',
  '- Q6. Complete the series: 3, 8, 18, 38, 78, ?. Write the pattern in one sentence.',
  '- Q7. Pick the sentence with the clearest business communication and rewrite the weakest option.',
  '- Q8. Write a 90-word email asking HR to reschedule an interview politely and professionally.',
  '## Section C: Programming Logic and Coding',
  '- Q9. Trace a loop that updates sum only when i is divisible by 3 or 5. State final output for n = 20.',
  '- Q10. Given an array, return the second highest distinct value. Include edge cases for duplicates and negative values.',
  '- Q11. Count frequency of each character in a string and print the first non-repeating character.',
  '- Q12. Write pseudocode to reverse words in a sentence without reversing the characters inside each word.',
  '## Section D: SQL and CS Fundamentals',
  '- Q13. Write a query to find departments with average salary above the company average.',
  '- Q14. Explain primary key vs unique key vs foreign key with one example table.',
  '- Q15. Explain process vs thread, normalization, indexes, HTTP status codes, and OOP inheritance with examples.',
  '- Q16. What happens when you type a URL in browser? Explain DNS, TCP, HTTP, server, and response in simple words.',
  '## Section E: HR and Communication',
  `- Q17. Tell me about yourself for a fresher role at ${company}. Keep the answer under 60 seconds.`,
  `- Q18. Why ${company}? Connect learning, role fit, adaptability, and your preparation evidence.`,
  '- Q19. Tell me about a failure. Use STAR format and end with what changed in your behavior.',
  '- Q20. Explain your best project to a non-technical interviewer in 90 seconds.',
  '## Model Hints',
  '- Q1 hint: if 60% takes 36 minutes, 100% takes 36 x 100 / 60 = 60 minutes.',
  '- Q3 hint: net work per hour = 1/12 - 1/18 = 1/36, so tank fills in 36 hours.',
  '- Q10 hint: track largest and second largest distinct values; handle fewer than two distinct values.',
  '- Q13 hint: use GROUP BY department and HAVING AVG(salary) > (SELECT AVG(salary) FROM employees).',
  '## Solution Checklist',
  '- Write assumptions before solving aptitude.',
  '- Show dry run for every coding answer.',
  '- Use STAR format for HR answers.',
  '- Keep final answer short, structured, and interview-friendly.',
  '- After the set, classify mistakes as concept gap, formula gap, reading error, time trap, or panic.',
];

const productPractice = (company: string) => [
  '## Original OA and Interview Practice',
  `- This set is designed for ${company} style product preparation: DSA depth, CS fundamentals, design thinking, project ownership, and behavioral clarity.`,
  '## Section A: DSA Pattern Practice',
  '- Q1. Return indices of two numbers adding to target. Explain hash map time and space complexity.',
  '- Q2. Merge overlapping intervals and list the sorting invariant.',
  '- Q3. Detect cycle in a linked list, then find the cycle start.',
  '- Q4. Find shortest path in an unweighted graph and explain why BFS works.',
  '- Q5. Find the longest substring without repeating characters. Explain sliding window movement.',
  '- Q6. Search an element in a rotated sorted array. Explain the binary-search decision rule.',
  '- Q7. Given daily temperatures, return days to wait for warmer temperature. Explain stack invariant.',
  '- Q8. Count islands in a grid. Explain visited marking and boundary checks.',
  '## Section B: DP and Optimization',
  '- Q9. Count ways to climb stairs with 1 or 2 steps, then optimize memory.',
  '- Q10. Find maximum subarray sum and explain why local optimum works.',
  '- Q11. Find coin change minimum coins. Define state, transition, base case, and impossible state.',
  '- Q12. Given jobs with start, end, profit, select maximum profit non-overlapping jobs. Explain sorting + DP idea.',
  '## Section C: LLD and HLD',
  '- Q13. LLD: Design a parking lot with classes, responsibilities, pricing, and edge cases.',
  '- Q14. LLD: Design a rate limiter. Compare fixed window, sliding window, and token bucket.',
  '- Q15. HLD: Design a tiny URL service. Cover APIs, storage, cache, collisions, and scaling.',
  '- Q16. HLD: Design a notification system. Cover queues, retries, idempotency, and failure handling.',
  '## Section D: CS Core and Project Depth',
  '- Q17. Explain database indexing and when an index can hurt performance.',
  '- Q18. Explain process vs thread and how context switching affects performance.',
  '- Q19. Explain HTTP status codes, cookies, JWT, and session tradeoffs.',
  `- Q20. Describe a time you handled ambiguity while preparing for ${company}. Use a real example.`,
  '## Model Hints',
  '- Q1 hint: hash map stores complement or seen values; time O(n), space O(n).',
  '- Q3 hint: Floyd cycle detection gives meeting point; reset one pointer to head to find cycle start.',
  '- Q8 hint: DFS/BFS from every unvisited land cell; each cell is visited once.',
  '- Q14 hint: mention data model, request key, time bucket, concurrency, and cleanup.',
  '## Solution Checklist',
  '- State brute force first, then optimized approach.',
  '- Confirm input constraints before coding.',
  '- Dry run one normal case and one edge case.',
  '- End with complexity and production tradeoffs.',
  '- For design rounds, define requirements before drawing components.',
];

const companySnapshotContent = (company: string, isProduct: boolean, role: string, coreTopics: string) => [
  '## Company Snapshot',
  `- Target company: ${company}.`,
  `- Best-fit fresher track: ${role}.`,
  `- Preparation focus: ${coreTopics}.`,
  '- Outcome goal: clear screening, perform confidently in interview, and explain projects like a builder.',
  '## What To Prepare First',
  isProduct
    ? '- Prioritize DSA patterns, CS fundamentals, project depth, and clean communication.'
    : '- Prioritize aptitude accuracy, programming logic, communication, CS basics, and HR clarity.',
  '- Keep one page each for formulas, coding patterns, project notes, HR stories, and mistakes.',
  '## Premium Readiness Score',
  '- Syllabus complete: 20 points.',
  '- Practice accuracy above 70 percent: 25 points.',
  '- Mock analysis done: 20 points.',
  '- Project explanation ready: 20 points.',
  '- HR stories ready: 15 points.',
];

const roundWisePlaybookContent = (company: string, isProduct: boolean) => [
  '## Round Wise Playbook',
  isProduct
    ? '- Round 1: OA with DSA. Read constraints, pick pattern, code cleanly, dry run loudly in notes.'
    : '- Round 1: aptitude and verbal. Attempt high-confidence questions first and avoid time traps.',
  isProduct
    ? '- Round 2: technical interview. Explain brute force, optimized approach, edge cases, and complexity.'
    : '- Round 2: coding or programming logic. Show trace table, edge cases, and simple readable code.',
  '- Round 3: project discussion. Use problem, users, architecture, your contribution, tradeoff, impact.',
  '- HR round: keep answers honest, short, and positive. Show learning speed and ownership.',
  `## ${company} Day Before Checklist`,
  '- Revisit resume bullets.',
  '- Revise mistake tracker.',
  '- Practice one mock intro.',
  '- Keep documents, links, and project demo ready.',
];

const dailyDrillContent = (isProduct: boolean) => [
  '## Daily Drill Sheet',
  '- 20 minutes: formula or DSA pattern revision.',
  isProduct ? '- 60 minutes: two DSA problems from different patterns.' : '- 45 minutes: quant, reasoning, verbal mixed set.',
  '- 25 minutes: CS fundamentals or SQL.',
  '- 20 minutes: project explanation or HR story practice.',
  '- 15 minutes: update mistake tracker.',
  '## Weekly Review',
  '- Pick top 5 mistakes.',
  '- Re-solve them without notes.',
  '- Convert each mistake into a rule.',
  '- Attempt one full mock under timer.',
];

const miniProjectContent = (isProduct: boolean) => [
  '## Mini Project Bank',
  isProduct
    ? '- URL shortener with rate limiting, cache, and analytics.'
    : '- Student result dashboard with authentication, filters, charts, and SQL reporting.',
  '- Expense tracker with categories, monthly summary, export, and responsive UI.',
  '- Chat notes app with search, tagging, pinning, and local/offline cache.',
  '- Placement tracker with company status, interview dates, reminders, and mistake log.',
  '## How To Explain',
  '- Problem: who needs it and why.',
  '- Architecture: frontend, backend, database, API flow.',
  '- Your contribution: exact modules you built.',
  '- Tradeoffs: what you chose and what you would improve.',
];

const resumePortfolioContent = (company: string, isProduct: boolean) => [
  '## Resume and Portfolio Kit',
  '- Keep resume to one page if you are a fresher.',
  '- First half: education, skills, projects, internships, achievements.',
  '- Project bullet formula: Built X using Y, improved Z, handled A edge case.',
  '- Add GitHub and deployed links only when they work cleanly.',
  isProduct
    ? '- Show DSA consistency, strong projects, API/backend/design depth, and ownership.'
    : '- Show communication, adaptability, core programming, SQL, and project clarity.',
  `## ${company} Resume Review`,
  '- Every skill listed must be answerable in interview.',
  '- Remove vague words like hardworking unless supported by evidence.',
  '- Prepare one story for every project bullet.',
];

const projectDeepDiveContent = (company: string) => [
  '## Project Deep Dive Script',
  '- One-line pitch: what the project does.',
  '- Users: who uses it and what problem it solves.',
  '- Architecture: major screens, API routes, database tables, auth, deployment.',
  '- Hardest bug: what failed, how you debugged, what you learned.',
  '- Tradeoff: speed vs quality, simple design vs scalable design, local cache vs server fetch.',
  `## ${company} Interview Prompts`,
  '- Why did you choose this tech stack?',
  '- How would you scale it for 10x users?',
  '- What would you change if you had one more week?',
  '- Which part did you personally build?',
];

const finalSprintContent = (isProduct: boolean) => [
  '## 7 Day Final Sprint',
  '- Day 1: revise syllabus checklist and weak topics.',
  '- Day 2: solve topic-wise practice and update mistake log.',
  isProduct ? '- Day 3: DSA mixed set plus one design question.' : '- Day 3: aptitude mixed mock plus programming logic.',
  '- Day 4: CS fundamentals and SQL.',
  '- Day 5: project deep dive and resume questions.',
  '- Day 6: full mock and post-mock analysis.',
  '- Day 7: light revision, HR stories, documents, sleep.',
  '## Do Not Do',
  '- Do not start a brand-new large topic on the final night.',
  '- Do not memorize fake answers.',
  '- Do not ignore mistakes from mocks.',
];

const offerNegotiationContent = (company: string) => [
  '## Offer and HR Negotiation Prep',
  '- Be respectful, factual, and calm.',
  '- Know your priorities: learning, location, role, compensation, joining date.',
  '- Ask questions about training, project allocation, growth, and evaluation.',
  '- If discussing compensation, use market context and your competing constraints, not pressure.',
  `## Questions To Ask ${company}`,
  '- What does success look like in the first 90 days?',
  '- What technologies will the selected candidates work on?',
  '- What is the training and mentorship process?',
  '- Are there role/location constraints I should prepare for?',
];

const essentialPlacementPacks = (
  company: string,
  isProduct: boolean,
  coreTopics: string,
  practiceContent?: string[],
  focusLine?: string
): PremiumPack[] => [
  {
    key: 'essential-syllabus',
    targetPath: ['Syllabus'],
    title: `${company} Essential Syllabus Pack`,
    resourceType: 'syllabus',
    subject: 'Syllabus',
    topic: `${company} Essentials`,
    content: [
      '## Essential Syllabus',
      `- Core preparation areas: ${coreTopics}.`,
      focusLine || (isProduct
        ? '- Must cover: DSA patterns, CS fundamentals, project depth, OOP/LLD, HLD basics, behavioral stories.'
        : '- Must cover: quant, reasoning, verbal, programming logic, CS fundamentals, communication, HR answers.'),
      '- Keep every topic in four states: learn, practice, mock, revise.',
      '## Round Mapping',
      '- Screening: resume, eligibility, and basic fit.',
      '- Assessment: aptitude/coding/technical questions based on role.',
      '- Interview: project, fundamentals, communication, and HR clarity.',
      '## Completion Rule',
      '- Do not mark a topic complete until you can solve two questions without notes and explain it in one minute.',
    ],
  },
  {
    key: 'essential-pyq',
    targetPath: ['Previous Year Papers'],
    title: `${company} Essential PYQ Practice Pack`,
    resourceType: 'pyq',
    subject: 'PYQ Practice',
    topic: `${company} Essentials`,
    content: [
      '## Original PYQ Style Set',
      '- This is original practice inspired by common placement patterns, not a copied company paper.',
      ...(practiceContent || (isProduct ? productPractice(company) : servicePractice(company))),
      '## How To Review',
      '- Mark every question as solved, guessed, skipped, or wrong.',
      '- Rewrite the idea behind every wrong question in one sentence.',
      '- Re-attempt wrong questions after 24 hours and again after 7 days.',
    ],
  },
  {
    key: 'essential-study-material',
    targetPath: ['Study Material'],
    title: `${company} Essential Study Material`,
    resourceType: 'notes',
    subject: 'Study Material',
    topic: `${company} Essentials`,
    content: [
      '## Essential Study Material',
      '- Start with the syllabus pack, then solve the PYQ practice pack, then revise from this sheet.',
      isProduct
        ? '- DSA focus: arrays, strings, hashing, binary search, recursion, trees, graphs, DP, heap, greedy.'
        : '- Aptitude focus: percentage, ratio, averages, profit loss, time work, speed distance, DI, verbal basics.',
      '- CS focus: OS process/thread/deadlock, DBMS keys/joins/indexes, CN layers/TCP/HTTP, OOP pillars.',
      '- Interview focus: project story, strengths, failure, learning speed, teamwork, relocation/shift readiness.',
      '## Last 48 Hours',
      '- Revise formulas and mistake tracker.',
      '- Re-read resume line by line.',
      '- Practice intro and project explanation twice.',
      '- Sleep properly before assessment/interview.',
    ],
  },
];

const getTrackProfile = (spec: StudyHubPlacementSpec) => {
  const isProduct = normalizeKey(spec.family) === 'product based';
  const isCommon = normalizeKey(spec.family) === 'common preparation';
  const role = isProduct ? 'SDE / Software Engineer' : 'Graduate Engineer / Analyst';
  const coreTopics = isProduct
    ? 'DSA, CS fundamentals, OOP/LLD, HLD basics, behavioral stories, resume projects'
    : isCommon
      ? 'aptitude, reasoning, verbal, DSA, CS fundamentals, resume, project interview, mock tests, communication, HR stories'
      : 'quant, reasoning, verbal, programming logic, CS fundamentals, communication, HR answers';

  return { isProduct, isCommon, role, coreTopics };
};

const premiumOpeningContent = (
  spec: StudyHubPlacementSpec,
  pack: PremiumPack
) => {
  const { isProduct, isCommon, role, coreTopics } = getTrackProfile(spec);
  const track = isCommon ? 'Placement Common Preparation' : spec.exam;

  return [
    '## Premium Study System',
    `- Track: ${track}.`,
    `- Pack type: ${pack.resourceType.toUpperCase()} / ${pack.subject}.`,
    `- Target outcome: selection-ready confidence for ${role}.`,
    `- Core preparation areas: ${coreTopics}.`,
    '- Use this pack like a mini-book: concept, table, example, practice, analysis, revision.',
    '- Every topic should produce proof: solved questions, mock score, mistake note, interview answer, or resume evidence.',
    '## Output Quality Rules',
    '- Read the concept in your own words, then solve without looking at notes.',
    '- Convert every important idea into a comparison table, checklist, or one-line rule.',
    '- Mark important traps as Common Mistake before the mock, not after losing marks.',
    '- Keep a PYQ-style log: question pattern, topic, time taken, mistake reason, retest date.',
    '- Use simple English; add Hindi/Hinglish meaning in brackets when it helps recall.',
    '## Priority Matrix',
    '| Area | Premium Standard | Proof Before Moving On |',
    isProduct
      ? '| DSA | Pattern, invariant, dry run, complexity | 2 solved problems per pattern without hints |'
      : '| Aptitude | Formula, shortcut, accuracy, time control | 25 mixed questions with 70%+ accuracy |',
    isProduct
      ? '| CS Core | OS, DBMS, CN, OOP with examples | Explain each topic in 60 seconds |'
      : '| Programming Logic | Loops, arrays, strings, SQL basics | Trace output and write simple code cleanly |',
    '| Project | Problem, architecture, your contribution, tradeoff | 2-minute story plus deep-dive answers |',
    '| Communication | Crisp intro, structured HR stories, calm tone | 5 recorded answers reviewed once |',
    '## Exam Tip',
    isProduct
      ? '- Interviewers reward clean reasoning more than memorized code. Say brute force, improve it, dry run, then discuss complexity.'
      : '- Service assessments reward speed with accuracy. Attempt high-confidence sections first and protect time for easy marks.',
    '## Common Mistake',
    isProduct
      ? '- Jumping into code without constraints creates wrong edge cases. Ask size, duplicates, sorted/unsorted, and expected output first.'
      : '- Spending too long on one aptitude question reduces total score. Set a strict skip rule and revisit only after easy wins.',
  ];
};

const syllabusBlueprintContent = (isProduct: boolean) => [
  '## Deep Syllabus Blueprint',
  '| Block | Must Cover | Practice Evidence |',
  isProduct
    ? '| DSA Patterns | arrays, strings, hashing, two pointers, binary search, recursion, trees, graphs, DP, heap, greedy | 40 pattern questions with notes |'
    : '| Quant | percentage, ratio, averages, profit-loss, time-work, speed-distance, probability, DI | formula sheet plus timed mixed set |',
  isProduct
    ? '| CS Fundamentals | OS process/thread/deadlock, DBMS joins/indexing, CN TCP/HTTP, OOP/LLD | 30 short answers plus examples |'
    : '| Reasoning + Verbal | seating, syllogism, series, coding-decoding, grammar, comprehension, business email | 3 sectional mocks |',
  '| Coding/Logic | input-output, edge cases, complexity, readable naming | dry run table for every answer |',
  '| Interview | intro, project, strengths, failure, teamwork, why company | STAR notes and 5 mock answers |',
  '## Syllabus Completion Ladder',
  '- Level 1 Learn: you understand the concept and can explain it simply.',
  '- Level 2 Practice: you can solve basic questions without hints.',
  '- Level 3 Mock: you can solve under timer with controlled accuracy.',
  '- Level 4 Revise: you can recover the idea from your mistake log after 7 days.',
];

const pyqProtocolContent = (isProduct: boolean) => [
  '## PYQ-Style Attempt Protocol',
  '- Step 1: identify topic and difficulty before solving.',
  '- Step 2: write the first approach, even if it is brute force or long method.',
  '- Step 3: optimize only after the basic idea is correct.',
  '- Step 4: dry run one normal case and one edge case.',
  '- Step 5: add answer, time, mistake type, and retest date to the log.',
  '## Pattern References',
  isProduct
    ? '- Common OA patterns: hash map lookup, interval sorting, BFS/DFS, binary search on answer, DP state transition, stack/queue simulation.'
    : '- Common placement patterns: percentage change, ratio split, time-work efficiency, seating arrangement, sentence correction, loop tracing, SQL grouping.',
  '## Answer Review Table',
  '| Mark | Meaning | Next Action |',
  '| Solved | correct under timer | revise after 7 days |',
  '| Guessed | answer came without method | solve two similar questions |',
  '| Wrong | concept or execution gap | write mistake rule and reattempt tomorrow |',
  '| Skipped | time or confidence issue | learn shortcut or move to lower difficulty |',
];

const studyMaterialDepthContent = (isProduct: boolean) => [
  '## Premium Study Material Structure',
  '- Concept note: one paragraph in your own words.',
  '- Formula/pattern note: exact rule, when to use, and when not to use.',
  '- Worked example: one solved sample with each step visible.',
  '- Interview angle: how the topic can be asked verbally.',
  '- Revision hook: one mnemonic or one-line trigger.',
  '## Memory Tricks',
  isProduct
    ? '- CODER: Constraints, Options, Dry run, Edge cases, Runtime.'
    : '- APTI: Assumption, Pattern, Time limit, Insight shortcut.',
  '- STAR for HR: Situation, Task, Action, Result.',
  '- PACT for projects: Problem, Architecture, Contribution, Tradeoff.',
  '## One-Liners For Revision',
  '- Accuracy grows from mistake analysis, not from collecting random PDFs.',
  '- A topic is ready only when you can teach it without opening notes.',
  '- A resume skill is safe only when you can answer two follow-up questions.',
];

const interviewDepthContent = (company: string, isProduct: boolean) => [
  '## Interview Answer Framework',
  '- Technical: definition, example, tradeoff, edge case, final conclusion.',
  '- Project: problem, users, architecture, your work, hard bug, impact, improvement.',
  '- HR: honest story, specific action, measurable learning, positive closing.',
  `- Why ${company}: connect role, learning, technology/service domain, and your preparation proof.`,
  '## Common Follow-Ups',
  '- Why did you choose this approach?',
  '- What failed and how did you debug it?',
  '- What would you improve with more time?',
  isProduct ? '- How would you scale this for more users?' : '- How will you learn a new technology quickly after joining?',
  '## Strong Closing Line',
  '- I prepared this topic by solving, revising mistakes, and explaining it clearly, so I can learn fast and contribute responsibly.',
];

const executionDepthContent = (isProduct: boolean) => [
  '## Execution Dashboard',
  '| Metric | Target | Review Frequency |',
  isProduct ? '| DSA Questions | 10-14 per week | every Sunday |' : '| Aptitude Sets | 5 timed sets per week | every Sunday |',
  '| CS Core Notes | 4 topics per week | twice a week |',
  '| Mock Tests | 1-2 per week | same day analysis |',
  '| Interview Practice | 5 answers per week | record and review |',
  '## Weekly Review Ritual',
  '- Pick the top 5 mistakes, rewrite the correct rule, and solve one similar question.',
  '- Remove one weak resume line or prepare one stronger project answer.',
  '- Decide the next week from evidence, not mood.',
];

const premiumClosingContent = (
  spec: StudyHubPlacementSpec,
  pack: PremiumPack
) => {
  const { isProduct } = getTrackProfile(spec);
  const company = normalizeKey(spec.family) === 'common preparation' ? 'target companies' : spec.exam;

  return [
    ...(pack.resourceType === 'syllabus' ? syllabusBlueprintContent(isProduct) : []),
    ...(pack.resourceType === 'pyq' || pack.resourceType === 'practice' ? pyqProtocolContent(isProduct) : []),
    ...(pack.resourceType === 'notes' || pack.resourceType === 'material' ? studyMaterialDepthContent(isProduct) : []),
    ...(pack.resourceType === 'qa' ? interviewDepthContent(company, isProduct) : []),
    ...executionDepthContent(isProduct),
    '## Final Self Audit',
    '| Score | Meaning | Action |',
    '| 0-40 | reading stage | finish basics and easy questions |',
    '| 41-70 | practice stage | increase timed mocks and mistake review |',
    '| 71-85 | interview-ready | polish project, HR, and weak topics |',
    '| 86-100 | selection-ready | maintain revision and avoid overloading new material |',
    '## Source Note',
    '- This is original Study Hub premium material for learning and practice. It is not copied from official or proprietary company papers.',
  ];
};

const renderPremiumPackContent = (spec: StudyHubPlacementSpec, pack: PremiumPack) => [
  ...premiumOpeningContent(spec, pack),
  ...pack.content,
  ...premiumClosingContent(spec, pack),
];

const buildPacks = (spec: StudyHubPlacementSpec): PremiumPack[] => {
  const company = spec.exam;
  const { isProduct, isCommon, role, coreTopics } = getTrackProfile(spec);

  if (isCommon) {
    return [
      {
        key: 'premium-roadmap',
        targetPath: ['Start Here', 'Premium Roadmap'],
        title: 'Premium Placement Roadmap',
        resourceType: 'material',
        subject: 'Roadmap',
        topic: 'Placement Prep',
        content: [
          '## 8 Week Roadmap',
          '- Week 1: aptitude basics, arrays, strings, resume cleanup.',
          '- Week 2: reasoning, linked list, stack, queue, SQL basics.',
          '- Week 3: trees, recursion, OOP, DBMS normalization.',
          '- Week 4: graphs, greedy, OS, CN, project explanation.',
          '- Week 5: dynamic programming basics, mock aptitude, HR stories.',
          '- Week 6: company-wise OA mocks and communication practice.',
          '- Week 7: interviews, system design basics, resume iterations.',
          '- Week 8: revision, mistake log, final mock interviews.',
        ],
      },
      ...essentialPlacementPacks(
        'Placement Common Prep',
        false,
        'aptitude, reasoning, verbal, DSA, CS fundamentals, resume, project interview, mock tests, communication, HR stories',
        [...servicePractice('service based companies'), ...productPractice('product based companies')],
        '- Must cover: aptitude, DSA, CS fundamentals, resume, mock tests, interview communication, and HR stories.'
      ),
      {
        key: 'pyq-style-practice',
        targetPath: ['Previous Year Papers', 'Topic Wise Practice'],
        title: 'Original PYQ Style Practice Bank',
        resourceType: 'pyq',
        subject: 'Practice',
        topic: 'Placement PYQ Style',
        content: [...servicePractice('service based companies'), ...productPractice('product based companies')],
      },
      {
        key: 'study-notes',
        targetPath: ['Study Material', 'Revision Notes'],
        title: 'Premium Study Notes and Cheat Sheets',
        resourceType: 'notes',
        subject: 'Study Material',
        topic: 'Revision',
        content: [
          '## Must Revise',
          '- Aptitude formulas: percentage, ratio, speed-time-distance, time-work, probability, permutation-combination.',
          '- DSA patterns: two pointers, sliding window, hashing, prefix sum, binary search, recursion, graph BFS/DFS, DP states.',
          '- CS core: process/thread, deadlock, indexing, joins, normalization, TCP/UDP, HTTP, OOP pillars.',
          '- Interview habits: clarify, think aloud, dry run, test edge cases, explain complexity.',
        ],
      },
      {
        key: 'interview-bank',
        targetPath: ['Interview', 'HR Questions'],
        title: 'Interview Question Bank',
        resourceType: 'qa',
        subject: 'Interview',
        topic: 'HR and Technical',
        content: [
          '## HR Bank',
          '- Tell me about yourself.',
          '- Why should we hire you?',
          '- Explain your best project and your exact contribution.',
          '- Tell me about a failure and what changed after it.',
          '## Technical Bank',
          '- Explain your project architecture.',
          '- Difference between stack and heap.',
          '- SQL joins with examples.',
          '- OOP concepts with code examples.',
        ],
      },
      {
        key: 'company-shortlist-matrix',
        targetPath: ['Placement Tracker', 'Company Shortlist'],
        title: 'Company Shortlist Matrix',
        resourceType: 'material',
        subject: 'Tracker',
        topic: 'Company Shortlist',
        content: [
          '## Shortlist Columns',
          '- Company, role, eligibility, expected rounds, required topics, application link, status, next action.',
          '- Priority score = role fit + location fit + skill fit + timeline fit.',
          '- Keep three buckets: dream, realistic, backup.',
          '## Weekly Ritual',
          '- Add new companies every Sunday.',
          '- Move applied companies to interview pipeline.',
          '- Review rejected/expired entries and learn the pattern.',
        ],
      },
      {
        key: 'master-application-tracker',
        targetPath: ['Placement Tracker', 'Application Tracker'],
        title: 'Master Application Tracker',
        resourceType: 'material',
        subject: 'Tracker',
        topic: 'Applications',
        content: [
          '## Tracker Fields',
          '- Company, job id, applied date, source, resume version, referral, status, interview date, result.',
          '- Add notes after every test or interview while memory is fresh.',
          '- Mark follow-up date for each active application.',
          '## Premium Rule',
          '- Never apply with a stale resume.',
          '- Keep one tailored project bullet for each company category.',
        ],
      },
      {
        key: 'resume-portfolio-kit',
        targetPath: ['Resume', 'Portfolio Checklist'],
        title: 'Resume and Portfolio Kit',
        resourceType: 'notes',
        subject: 'Resume',
        topic: 'Portfolio',
        content: resumePortfolioContent('target companies', false),
      },
      {
        key: 'mock-analysis-system',
        targetPath: ['Mock Tests'],
        title: 'Mock Analysis System',
        resourceType: 'practice',
        subject: 'Mock Tests',
        topic: 'Analysis',
        content: [
          '## After Every Mock',
          '- Split mistakes into concept gap, silly error, time trap, reading error, and panic.',
          '- Re-solve wrong questions after 24 hours and 7 days.',
          '- Track accuracy by topic, not only total score.',
          '## Improvement Loop',
          '- One weak topic, one mini lesson, ten questions, one retest.',
        ],
      },
      {
        key: 'mini-project-bank',
        targetPath: ['Study Material', 'Mini Projects'],
        title: 'Mini Project Bank',
        resourceType: 'notes',
        subject: 'Projects',
        topic: 'Portfolio Projects',
        content: miniProjectContent(false),
      },
      {
        key: 'final-revision-sprint',
        targetPath: ['Strategy', 'Interview Day Checklist'],
        title: 'Final Revision Sprint',
        resourceType: 'material',
        subject: 'Strategy',
        topic: 'Final Revision',
        content: finalSprintContent(false),
      },
      {
        key: 'offer-comparison-sheet',
        targetPath: ['Placement Tracker', 'Offer Comparison'],
        title: 'Offer Comparison Sheet',
        resourceType: 'material',
        subject: 'Offer',
        topic: 'Comparison',
        content: [
          '## Compare Offers On',
          '- Role learning, technology, location, training, compensation, joining date, bond/service agreement, growth path.',
          '- Decide with a weighted score, not only the headline package.',
          '- Ask seniors about work, support, and long-term growth before deciding.',
        ],
      },
      {
        key: 'daily-drill-sheet',
        targetPath: ['Start Here', 'Daily Drill Sheet'],
        title: 'Daily Drill Sheet',
        resourceType: 'practice',
        subject: 'Daily Practice',
        topic: 'Placement Drill',
        content: dailyDrillContent(false),
      },
    ];
  }

  return [
    {
      key: 'premium-roadmap',
      targetPath: ['Start Here', 'Premium Roadmap'],
      title: `${company} Premium Roadmap`,
      resourceType: 'material',
      subject: 'Roadmap',
      topic: `${company} Prep`,
      content: [
        '## How To Use This Pack',
        `- Target role: ${role}.`,
        `- Core topics: ${coreTopics}.`,
        '- First pass: finish syllabus and notes.',
        '- Second pass: solve practice questions and mocks.',
        '- Third pass: revise mistakes and interview stories.',
        '## 30 Day Plan',
        '- Days 1-7: syllabus, aptitude/DSA basics, resume cleanup.',
        '- Days 8-15: topic-wise practice, SQL/OS/DBMS/CN, coding drills.',
        '- Days 16-23: mock tests, company pattern problems, project explanation.',
        '- Days 24-30: interview bank, mistake tracker, final revision.',
      ],
    },
    {
      key: 'company-snapshot',
      targetPath: ['Start Here', 'Company Snapshot'],
      title: `${company} Company Snapshot`,
      resourceType: 'material',
      subject: 'Company Snapshot',
      topic: `${company} Overview`,
      content: companySnapshotContent(company, isProduct, role, coreTopics),
    },
    {
      key: 'round-wise-playbook',
      targetPath: ['Start Here', 'Round Wise Playbook'],
      title: `${company} Round Wise Playbook`,
      resourceType: 'material',
      subject: 'Round Plan',
      topic: `${company} Rounds`,
      content: roundWisePlaybookContent(company, isProduct),
    },
    {
      key: 'daily-drill-sheet',
      targetPath: ['Start Here', 'Daily Drill Sheet'],
      title: `${company} Daily Drill Sheet`,
      resourceType: 'practice',
      subject: 'Daily Practice',
      topic: `${company} Drill`,
      content: dailyDrillContent(isProduct),
    },
    ...essentialPlacementPacks(company, isProduct, coreTopics),
    {
      key: 'syllabus-roadmap',
      targetPath: ['Syllabus'],
      title: `${company} Syllabus and Round Map`,
      resourceType: 'syllabus',
      subject: 'Syllabus',
      topic: `${company} Round Map`,
      content: [
        '## Round Map',
        isProduct
          ? '- Online assessment, coding interview, CS fundamentals, system design basics, behavioral interview.'
          : '- Aptitude, reasoning, verbal, coding/programming logic, technical interview, communication or HR round.',
        '## Topic Checklist',
        `- ${coreTopics}.`,
        '- Keep one notebook for formulas, patterns, mistakes, and interview stories.',
        '- Mark each topic as Learn, Practice, Mock, Revise.',
      ],
    },
    {
      key: 'pyq-practice',
      targetPath: ['Previous Year Papers', 'Topic Wise Practice'],
      title: `${company} Original PYQ Style Practice`,
      resourceType: 'pyq',
      subject: 'PYQ Practice',
      topic: `${company} Pattern Practice`,
      content: isProduct ? productPractice(company) : servicePractice(company),
    },
    {
      key: 'study-notes',
      targetPath: ['Study Material', 'Revision Notes'],
      title: `${company} Premium Study Material`,
      resourceType: 'notes',
      subject: 'Study Material',
      topic: `${company} Revision`,
      content: [
        '## Revision Notes',
        isProduct
          ? '- DSA: revise arrays, strings, hashing, recursion, trees, graphs, DP, heaps, binary search.'
          : '- Aptitude: revise percentage, ratio, averages, time-work, speed-distance, probability, DI.',
        '- CS core: OS scheduling, deadlock, memory, DBMS normalization/indexing, SQL joins, CN layers, OOP.',
        '- Coding: always write constraints, approach, dry run, edge cases, and complexity.',
        '- Interview: keep project explanation ready in problem, design, contribution, impact format.',
        '## Cheat Sheet',
        '- Before mock: formulas + patterns.',
        '- During mock: skip stuck questions after 90 seconds.',
        '- After mock: add every error to mistake tracker.',
      ],
    },
    {
      key: 'premium-handbook',
      targetPath: ['Study Material', 'Premium Handbook'],
      title: `${company} Premium Handbook`,
      resourceType: 'notes',
      subject: 'Handbook',
      topic: `${company} Prep`,
      content: [
        '## Premium Handbook',
        `- Company: ${company}.`,
        `- Role focus: ${role}.`,
        `- Core preparation: ${coreTopics}.`,
        '- Use this pack as the single source for weekly revision.',
        '## High-Leverage Habits',
        '- Convert every wrong question into a reusable rule.',
        '- Keep project explanation under 2 minutes, then go deep only when asked.',
        '- Practice one communication answer every day.',
        '- Revise from your own mistakes more than from new random content.',
      ],
    },
    {
      key: 'mini-project-bank',
      targetPath: ['Study Material', 'Mini Projects'],
      title: `${company} Mini Project Bank`,
      resourceType: 'notes',
      subject: 'Projects',
      topic: `${company} Projects`,
      content: miniProjectContent(isProduct),
    },
    {
      key: 'interview-bank',
      targetPath: ['Interview', isProduct ? 'Technical Deep Dive' : 'Technical Q&A'],
      title: `${company} Interview Question Bank`,
      resourceType: 'qa',
      subject: 'Interview',
      topic: `${company} Q&A`,
      content: [
        '## Technical Questions',
        '- Explain your strongest project end to end.',
        '- What tradeoff did you make in your project?',
        '- Explain OOP pillars with one real code example.',
        '- Write SQL for top N records per group.',
        '- Explain deadlock and prevention.',
        isProduct ? '- Design a cache or rate limiter at a basic level.' : '- Explain programming logic for a simple array/string problem.',
        '## HR Questions',
        '- Tell me about yourself.',
        `- Why ${company}?`,
        '- Tell me about a conflict or failure.',
        '- Why should we hire you?',
        '- Are you comfortable with relocation, shifts, and learning new technology?',
      ],
    },
    {
      key: 'project-deep-dive',
      targetPath: ['Interview', 'Project Deep Dive'],
      title: `${company} Project Deep Dive`,
      resourceType: 'qa',
      subject: 'Project Interview',
      topic: `${company} Project Q&A`,
      content: projectDeepDiveContent(company),
    },
    {
      key: 'resume-portfolio-kit',
      targetPath: ['Resume', 'Portfolio Checklist'],
      title: `${company} Resume Portfolio Kit`,
      resourceType: 'notes',
      subject: 'Resume',
      topic: `${company} Resume`,
      content: resumePortfolioContent(company, isProduct),
    },
    {
      key: 'mock-test-pack',
      targetPath: ['Mock Tests', isProduct ? 'OA Mocks' : 'Full Length Tests'],
      title: `${company} Mock Test Pack`,
      resourceType: 'practice',
      subject: 'Mock Tests',
      topic: `${company} Mock`,
      content: [
        '## Mock Structure',
        isProduct
          ? '- OA Mock: 2 coding questions, 75-90 minutes, one easy/medium and one medium/hard.'
          : '- Aptitude Mock: quant, reasoning, verbal, programming logic, 60-90 minutes.',
        '- Interview Mock: project explanation, one technical deep dive, one HR story.',
        '- Review Rule: spend 2x mock duration on analysis.',
        '## Scoring Sheet',
        '- Accuracy, time taken, skipped topics, silly mistakes, weak concepts, revision date.',
      ],
    },
    {
      key: 'final-revision-sprint',
      targetPath: ['Strategy', 'Interview Day Checklist'],
      title: `${company} Final Revision Sprint`,
      resourceType: 'material',
      subject: 'Strategy',
      topic: `${company} Sprint`,
      content: finalSprintContent(isProduct),
    },
    {
      key: 'offer-hr-negotiation',
      targetPath: ['Strategy', 'Offer HR Negotiation'],
      title: `${company} Offer HR Negotiation`,
      resourceType: 'qa',
      subject: 'HR',
      topic: `${company} Offer Prep`,
      content: offerNegotiationContent(company),
    },
  ];
};

const findPremiumFile = (card: CardDoc, pack: PremiumPack, url: string) => {
  const fileNameKey = normalizeKey(`${pack.title}.pdf`);
  return (card.files || []).find((file: any) => file.url === url || normalizeKey(file.name || '') === fileNameKey);
};

const hasPremiumFile = (card: CardDoc, pack: PremiumPack, url: string) => Boolean(findPremiumFile(card, pack, url));

const isCurrentPremiumFile = (card: CardDoc, pack: PremiumPack, url: string, filePath: string) => {
  const existing = findPremiumFile(card, pack, url);
  return Boolean(existing && fs.existsSync(filePath) && String(existing.notes || '').includes(CONTENT_VERSION));
};

const ensureFileOnCard = async (
  card: CardDoc,
  pack: PremiumPack,
  url: string,
  sizeBytes: number
) => {
  const existing = findPremiumFile(card, pack, url);
  if (existing) {
    existing.name = `${pack.title}.pdf`;
    existing.url = url;
    existing.sizeBytes = sizeBytes;
    existing.mimeType = 'application/pdf';
    existing.resourceType = pack.resourceType;
    existing.status = 'published';
    existing.visibility = 'public';
    existing.subject = pack.subject;
    existing.topic = pack.topic;
    existing.language = 'hinglish';
    existing.sourceType = 'platform';
    existing.sourceName = 'Study Hub Premium';
    existing.notes = `Original premium practice material (${CONTENT_VERSION}). Not copied from official or proprietary company papers.`;
    existing.uploadedAt = existing.uploadedAt || new Date();
    await card.save();
    return 'updated';
  }

  card.files.push({
    name: `${pack.title}.pdf`,
    url,
    sizeBytes,
    mimeType: 'application/pdf',
    resourceType: pack.resourceType,
    status: 'published',
    visibility: 'public',
    subject: pack.subject,
    topic: pack.topic,
    language: 'hinglish',
    sourceType: 'platform',
    sourceName: 'Study Hub Premium',
    notes: `Original premium practice material (${CONTENT_VERSION}). Not copied from official or proprietary company papers.`,
    uploadedAt: new Date(),
  });
  await card.save();
  return 'attached';
};

const removeRedundantAncestorFiles = async (target: CardDoc, pack: PremiumPack, url: string) => {
  let removed = 0;
  let current: CardDoc | null = target;
  const fileNameKey = normalizeKey(`${pack.title}.pdf`);
  const visited = new Set<string>();

  while (current?.parentId) {
    const parentId = String(current.parentId);
    if (visited.has(parentId) || visited.size > 64) break;
    visited.add(parentId);

    const parent = await StudyCard.findById(current.parentId);
    if (!parent) break;
    const before = (parent.files || []).length;
    parent.files = (parent.files || []).filter((file: any) => (
      file.url !== url && normalizeKey(file.name || '') !== fileNameKey
    ));
    const after = (parent.files || []).length;
    if (after !== before) {
      removed += before - after;
      await parent.save();
    }
    current = parent;
  }

  return removed;
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });

  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
  if (!workspace?._id) throw new Error(`Workspace ${ROOT_WORKSPACE_SLUG} not found.`);
  const workspaceId = workspace._id as Types.ObjectId;

  let generated = 0;
  let attached = 0;
  let refreshed = 0;
  let cleaned = 0;
  let skipped = 0;
  let alreadyReady = 0;

  for (const spec of detailedPlacementSpecs) {
    const rootPath = [spec.category, spec.family, spec.exam];
    const root = await findPath(workspaceId, rootPath);
    if (!root) {
      skipped += 1;
      console.warn(`[placement-premium] missing root: ${rootPath.join(' / ')}`);
      continue;
    }

    const companySlug = slugify(spec.exam);
    const packs = buildPacks(spec);
    let specAttached = 0;
    let specGenerated = 0;

    console.log(`[placement-premium] ${spec.family} / ${spec.exam}: checking ${packs.length} packs.`);

    for (const pack of packs) {
      const target = await ensureTargetPath(workspaceId, root, pack.targetPath);

      const packSlug = slugify(pack.key);
      const relativeUrl = `${STATIC_ROOT}/${companySlug}/${packSlug}.pdf`;
      const filePath = path.resolve(process.cwd(), 'public', 'placement-premium', companySlug, `${packSlug}.pdf`);
      if (isCurrentPremiumFile(target, pack, relativeUrl, filePath)) {
        alreadyReady += 1;
        continue;
      }

      const sizeBytes = await writePdf(filePath, pack.title, `${spec.family} / ${spec.exam}`, renderPremiumPackContent(spec, pack));
      generated += 1;
      specGenerated += 1;
      const fileResult = await ensureFileOnCard(target, pack, relativeUrl, sizeBytes);
      if (fileResult === 'attached') {
        attached += 1;
        specAttached += 1;
        cleaned += await removeRedundantAncestorFiles(target, pack, relativeUrl);
      } else if (fileResult === 'updated') {
        refreshed += 1;
      }
    }

    console.log(`[placement-premium] ${spec.exam}: generated ${specGenerated}, attached ${specAttached}.`);
  }

  console.log(`Placement premium packs complete. Generated ${generated}, attached ${attached}, refreshed ${refreshed}, already ready ${alreadyReady}, cleaned ${cleaned}, skipped ${skipped}.`);
};

run()
  .catch((error) => {
    console.error('Placement premium pack seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
