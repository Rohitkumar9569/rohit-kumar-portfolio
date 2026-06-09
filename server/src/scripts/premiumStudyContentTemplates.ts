import type { ResourceLanguage, ResourceType, SourceType } from '../models/Resource';
import type { WorkspaceType } from '../models/Workspace';
import { PREMIUM_AI_CONTENT_SYSTEM_PROMPT } from './aiContentPromptSystem';

export const PREMIUM_STUDY_CONTENT_SYSTEM_PROMPT = PREMIUM_AI_CONTENT_SYSTEM_PROMPT;

type WorkspaceSeed = {
  slug: string;
  name: string;
  shortName: string;
  type: WorkspaceType;
  category: string;
  description: string;
  accentColor: string;
  priority: number;
  readiness: number;
  phases: string[];
  resourceTypes: ResourceType[];
};

type PremiumTableRow = [string, string, string];
type PremiumPracticeQuestion = [string, string, string];

type PremiumContentInput = {
  title: string;
  exam: string;
  subject: string;
  examTip: string;
  whyItMatters: string;
  syllabusMap: PremiumTableRow[];
  highYield: PremiumTableRow[];
  pyqDecoder: PremiumTableRow[];
  examFacts?: PremiumTableRow[];
  practiceQuestions?: PremiumPracticeQuestion[];
  memoryHook: string;
  commonMistakes: string[];
  revisionDrill: string[];
  oneLiners: string[];
};

export type PremiumStudyResourceSeed = {
  workspace: WorkspaceSeed;
  title: string;
  slug: string;
  summary: string;
  type: ResourceType;
  subject: string;
  topic: string;
  language: ResourceLanguage;
  sourceType: SourceType;
  sourceName: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  facets: Record<string, string>;
  syllabusNodes: string[];
  isFeatured: boolean;
  updatedFor: string;
  content: string;
};

const makeTable = (headers: [string, string, string], rows: PremiumTableRow[]) => [
  `| ${headers.join(' | ')} |`,
  '| --- | --- | --- |',
  ...rows.map((row) => `| ${row.join(' | ')} |`),
].join('\n');

const makePremiumContent = (input: PremiumContentInput) => `# ${input.title}

## Premium Snapshot
**Exam fit:** ${input.exam}  
**Subject:** ${input.subject}  
**Why it matters:** ${input.whyItMatters}

> Exam Tip: ${input.examTip}

## Premium Coverage Card
${makeTable(['Need', 'What This Pack Gives', 'How To Use It'], [
  ['Concept clarity', 'Definitions, chronology, process, article, formula, or core theory in exam language', 'Use it for answer openings and MCQ elimination'],
  ['Fact precision', 'Tables, examples, data cues, cases, diagrams, and official keywords where relevant', 'Revise it as flashcards before mocks'],
  ['PYQ readiness', 'Repeated examiner patterns, traps, and practice directions', 'Solve PYQ-theme questions after reading each table'],
])}

## Topic Blueprint
This pack is designed like a coaching-class handout: first map the syllabus, then revise the high-yield facts, then decode PYQ patterns, then practice answer/application style. Read it in that order so the topic does not become random notes.

${makeTable(['Layer', 'What You Build', 'Premium Output'], [
  ['Concept Layer', 'Definitions, chronology, formula, article, process, or core theory', 'Clear answer opening and MCQ base'],
  ['Fact Layer', 'Tables, features, numbers, examples, diagrams, cases, or keywords', 'Fast recall under exam pressure'],
  ['Application Layer', 'PYQ signal, current linkage, tricky comparison, and answer framework', 'Better score in mixed and analytical questions'],
])}

## Syllabus Map
${makeTable(['Area', 'What To Cover', 'Exam Output'], input.syllabusMap)}

## Exam Fact Bank
${makeTable(['Fact Zone', 'Premium Detail', 'Recall Trigger'], input.examFacts?.length ? input.examFacts : input.highYield)}

## High-Yield Notes
${makeTable(['Topic', 'Must-Know Point', 'How To Revise'], input.highYield)}

## Comparison / Timeline Builder
${makeTable(['Angle', 'Premium Comparison Cue', 'Exam Use'], [
  ['Chronology', 'Arrange causes, events, reforms, missions, acts, steps, or concepts in a clean sequence', 'Helps in year/event MCQs and structured answers'],
  ['Comparison', 'Compare old vs new, feature vs limitation, institution vs institution, or theory vs practice', 'Turns static notes into analytical answers'],
  ['Application', 'Attach one example, case, map cue, diagram cue, scheme, report, or numerical fact where stable', 'Adds premium value without making the answer bulky'],
])}

## PYQ Decoder
${makeTable(['PYQ Signal', 'What Examiner Tests', 'Preparation Move'], input.pyqDecoder)}

> PYQ Use: Full paper ratne ki jagah PYQ signal samjho. Examiner repeatedly tests the same skill: matching, comparison, application, cause-effect, or judgement.

## PYQ Reference Signals
${makeTable(['Question Style', 'Premium Signal', 'Response Strategy'], [
  ['Prelims statement', 'One keyword, exception, chronology, location, article, formula, or official term decides the answer', 'Mark exact words; avoid overgeneralization'],
  ['Mains analytical', 'Question asks cause-effect, compare, critically examine, discuss, or suggest way forward', 'Use definition -> table body -> example -> balanced conclusion'],
  ['Current linkage', 'Static topic is tested through a recent scheme, judgment, report, mission, or policy', 'Use stable facts and verify latest official status'],
])}

## Prelims Trap Scanner
${makeTable(['Trap Type', 'Common Mistake', 'Premium Fix'], input.commonMistakes.slice(0, 4).map((mistake, index) => [
  `Trap ${index + 1}`,
  mistake,
  'Before marking, check exact wording, chronology, exception, and official term.',
]))}

## Model Answer / Application Framework
${makeTable(['Part', 'Premium Structure', 'What To Avoid'], [
  ['Opening', 'Define the topic in one clean line and locate it in syllabus context', 'Long generic introduction'],
  ['Body', 'Use table points, examples, article/formula/data, and PYQ pattern language', 'Only story-style explanation without exam keywords'],
  ['Value Add', 'Add comparison, current linkage, diagram cue, case, map, or one statistic where relevant', 'Unverified current data or overclaiming'],
  ['Conclusion', 'Close with balanced judgement, way forward, or revision takeaway', 'Abrupt ending or repetition'],
])}

## Micro Practice
${makeTable(['Question', 'Expected Answer Direction', 'Explanation Cue'], input.practiceQuestions?.length ? input.practiceQuestions : [
  ['Prelims-style', 'Identify the correct pair/statement from the high-yield table.', 'Check exact term and exception.'],
  ['Mains-style', 'Write a balanced 150-word answer using definition, table, example, and conclusion.', 'Use the model framework above.'],
  ['Revision-style', 'Make five flashcards from this topic.', 'One card should cover a common mistake.'],
])}

## MCQ Practice Pattern
${makeTable(['MCQ Pattern', 'How It Usually Tricks You', 'Premium Fix'], [
  ['Pair matching', 'Correct concept but wrong location/year/source/detail', 'Revise fact bank in table format'],
  ['Statement analysis', 'Extreme words like always, only, never, all, completely', 'Check exception and official wording'],
  ['Application item', 'Concept is known but applied to unfamiliar example', 'Write one real example for every concept'],
])}

## Mini Practice Set
1. Write a 50-word definition or concept note for this topic.
2. Make one three-column table from the high-yield notes.
3. Solve a PYQ-theme question connected to the decoder table.
4. Create five flashcards from the one-liners.
5. Mark one common mistake you personally make and revise it twice.

## Memory Hook / Mnemonic
${input.memoryHook}

## Common Mistakes
${input.commonMistakes.map((mistake) => `> Common Mistake: ${mistake}`).join('\n\n')}

## 7-Day Revision Drill
${input.revisionDrill.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## One-Liners For Fast Revision
${input.oneLiners.map((item) => `- ${item}`).join('\n')}

## Last 24-Hour Revision Sheet
${makeTable(['Slot', 'Task', 'Output'], [
  ['20 minutes', 'Revise syllabus map and fact bank', 'One-page active recall'],
  ['20 minutes', 'Revise PYQ decoder and traps', 'Wrong-answer prevention'],
  ['20 minutes', 'Write one mini answer or solve 10 MCQs', 'Exam-mode activation'],
])}

## Premium Quality Checklist
- Syllabus point mapped.
- PYQ signal identified.
- One table prepared.
- One mistake removed.
- One answer/application framework practiced.
- Latest official notification or current data verified where the topic can change.

## How To Use This Pack
- First read the syllabus map, then solve PYQ themes before reading long notes.
- Make a one-page sheet from the high-yield table.
- Verify latest notification, eligibility, paper pattern, and official syllabus from the exam authority before final revision.
`;

const workspaces = {
  upsc: {
    slug: 'upsc-cse',
    name: 'UPSC Civil Services',
    shortName: 'UPSC CSE',
    type: 'exam',
    category: 'central',
    description: 'Premium GS, CSAT, PYQ, syllabus, NCERT bridge, and answer-writing resources.',
    accentColor: '#2563eb',
    priority: 100,
    readiness: 82,
    phases: ['Foundation', 'Prelims', 'Mains', 'Interview'],
    resourceTypes: ['pyq', 'notes', 'book', 'syllabus', 'qa', 'practice', 'update'],
  },
  ssc: {
    slug: 'ssc-cgl',
    name: 'SSC Combined Graduate Level',
    shortName: 'SSC CGL',
    type: 'exam',
    category: 'central',
    description: 'Premium Tier 1, Tier 2, quant, reasoning, English, GA, and PYQ practice resources.',
    accentColor: '#7c3aed',
    priority: 88,
    readiness: 74,
    phases: ['Tier 1', 'Tier 2', 'Practice'],
    resourceTypes: ['pyq', 'notes', 'syllabus', 'practice', 'update'],
  },
  jee: {
    slug: 'jee-main',
    name: 'Joint Entrance Examination Main',
    shortName: 'JEE Main',
    type: 'exam',
    category: 'entrance',
    description: 'Premium Physics, Chemistry, Mathematics, PYQ, formula, and mock practice resources.',
    accentColor: '#0891b2',
    priority: 86,
    readiness: 72,
    phases: ['Physics', 'Chemistry', 'Maths', 'PYQ Practice'],
    resourceTypes: ['pyq', 'notes', 'book', 'syllabus', 'practice', 'update'],
  },
  neet: {
    slug: 'neet-ug',
    name: 'National Eligibility cum Entrance Test UG',
    shortName: 'NEET UG',
    type: 'exam',
    category: 'entrance',
    description: 'Premium NCERT-first Biology, Physics, Chemistry, PYQ, and revision resources.',
    accentColor: '#16a34a',
    priority: 84,
    readiness: 72,
    phases: ['Biology', 'Physics', 'Chemistry', 'Revision'],
    resourceTypes: ['pyq', 'notes', 'book', 'syllabus', 'practice', 'update'],
  },
  cuet: {
    slug: 'cuet-ug',
    name: 'Common University Entrance Test UG',
    shortName: 'CUET UG',
    type: 'exam',
    category: 'entrance',
    description: 'Premium general test, language, domain subject, PYQ, and university preference resources.',
    accentColor: '#9333ea',
    priority: 76,
    readiness: 66,
    phases: ['General Test', 'Language', 'Domain'],
    resourceTypes: ['pyq', 'notes', 'syllabus', 'practice', 'update'],
  },
  clat: {
    slug: 'clat',
    name: 'Common Law Admission Test',
    shortName: 'CLAT',
    type: 'exam',
    category: 'law',
    description: 'Premium legal reasoning, current affairs, English, logic, quant, and PYQ resources.',
    accentColor: '#be123c',
    priority: 74,
    readiness: 64,
    phases: ['Legal Reasoning', 'Current Affairs', 'Logic', 'Mocks'],
    resourceTypes: ['pyq', 'notes', 'syllabus', 'practice', 'update'],
  },
  cat: {
    slug: 'cat',
    name: 'Common Admission Test',
    shortName: 'CAT',
    type: 'exam',
    category: 'management',
    description: 'Premium VARC, DILR, QA, PYQ, mock analysis, and MBA admission resources.',
    accentColor: '#ea580c',
    priority: 72,
    readiness: 64,
    phases: ['VARC', 'DILR', 'QA', 'Mocks'],
    resourceTypes: ['pyq', 'notes', 'practice', 'update'],
  },
  cbse10: {
    slug: 'cbse-class-10',
    name: 'CBSE Class 10',
    shortName: 'Class 10',
    type: 'school',
    category: 'school',
    description: 'Premium NCERT, sample papers, syllabus, board PYQ, and revision resources.',
    accentColor: '#059669',
    priority: 70,
    readiness: 68,
    phases: ['Books', 'Sample Papers', 'Revision'],
    resourceTypes: ['book', 'notes', 'pyq', 'syllabus', 'practice'],
  },
  gate: {
    slug: 'gate-cse',
    name: 'GATE Computer Science',
    shortName: 'GATE CSE',
    type: 'exam',
    category: 'engineering',
    description: 'Premium CS subjects, aptitude, PYQ, formula sheets, and revision resources.',
    accentColor: '#4f46e5',
    priority: 70,
    readiness: 66,
    phases: ['Foundation', 'PYQ Practice', 'Revision'],
    resourceTypes: ['pyq', 'notes', 'book', 'syllabus', 'practice'],
  },
  ctet: {
    slug: 'ctet',
    name: 'Central Teacher Eligibility Test',
    shortName: 'CTET',
    type: 'exam',
    category: 'teaching',
    description: 'Premium pedagogy, subject notes, syllabus, PYQ, and practice resources.',
    accentColor: '#0d9488',
    priority: 68,
    readiness: 62,
    phases: ['Paper 1', 'Paper 2', 'Pedagogy'],
    resourceTypes: ['pyq', 'notes', 'syllabus', 'practice', 'update'],
  },
  bpsc: {
    slug: 'bpsc',
    name: 'Bihar Public Service Commission',
    shortName: 'BPSC',
    type: 'exam',
    category: 'state',
    description: 'Premium prelims, mains, Bihar special, PYQ, syllabus, and answer-writing resources.',
    accentColor: '#ca8a04',
    priority: 66,
    readiness: 62,
    phases: ['Prelims', 'Mains', 'Interview'],
    resourceTypes: ['pyq', 'notes', 'book', 'syllabus', 'qa', 'practice', 'update'],
  },
} satisfies Record<string, WorkspaceSeed>;

const resource = (
  workspace: WorkspaceSeed,
  seed: Omit<PremiumStudyResourceSeed, 'workspace' | 'language' | 'sourceType' | 'sourceName' | 'updatedFor' | 'content'> & {
    contentInput: PremiumContentInput;
  }
): PremiumStudyResourceSeed => ({
  workspace,
  language: 'english',
  sourceType: 'platform',
  sourceName: 'Study Hub Premium',
  updatedFor: 'Premium starter',
  ...seed,
  content: makePremiumContent(seed.contentInput),
});

export const premiumStudyResources: PremiumStudyResourceSeed[] = [
  resource(workspaces.upsc, {
    title: 'UPSC History Premium Notes: Indus Valley Civilization',
    slug: 'upsc-history-indus-valley-premium-notes',
    summary: 'Premium IVC notes with site table, town planning, economy, PYQ decoder, memory hook, and revision drill.',
    type: 'notes',
    subject: 'History',
    topic: 'Indus Valley Civilization',
    difficulty: 'intermediate',
    tags: ['upsc', 'history', 'ancient-india', 'ivc', 'premium-notes'],
    facets: { stage: 'foundation', paper: 'gs1' },
    syllabusNodes: ['ancient-india', 'indus-valley-civilization', 'art-and-culture'],
    isFeatured: true,
    contentInput: {
      title: 'UPSC History Premium Notes: Indus Valley Civilization',
      exam: 'UPSC CSE Prelims and GS1 Mains',
      subject: 'Ancient History',
      whyItMatters: 'IVC appears in site-feature matching, town planning, culture, economy, and archaeology-based prelims questions.',
      examTip: 'Har site ko feature ke saath yaad karo: Lothal-dockyard, Kalibangan-fire altars, Dholavira-water management, Mohenjo-daro-Great Bath.',
      syllabusMap: [
        ['Chronology', 'Early, Mature, and Late Harappan phases', 'Timeline-based MCQs'],
        ['Sites', 'Harappa, Mohenjo-daro, Lothal, Kalibangan, Dholavira, Rakhigarhi', 'Site-feature matching'],
        ['Culture', 'Seals, script, religion, crafts, urban planning', 'Prelims fact + Mains analysis'],
      ],
      highYield: [
        ['Town Planning', 'Grid pattern, drainage, baked bricks, citadel-lower town division', 'Make a feature checklist'],
        ['Economy', 'Trade links, standardized weights, seals, craft production', 'Connect economy with urbanization'],
        ['Decline', 'Climate stress, river shifts, trade decline, regionalization', 'Avoid single-cause answers'],
      ],
      pyqDecoder: [
        ['Site-feature pair', 'Accuracy of factual memory', 'Revise table before every mock'],
        ['Art/culture item', 'Whether seals, beads, pottery, or script are understood', 'Make visual notes'],
        ['Decline theory', 'Balanced historical reasoning', 'Write multi-causal explanation'],
      ],
      memoryHook: '**Lo-Ka-Dho-Ha-Mo**: Lothal dock, Kalibangan fire altar, Dholavira water, Harappa granary, Mohenjo-daro bath.',
      commonMistakes: [
        'IVC script ko fully deciphered mat likhna; it is still undeciphered.',
        'Harappan decline ko sirf Aryan invasion se explain mat karo; current exam answers prefer multi-causal explanation.',
      ],
      revisionDrill: [
        'Make a 10-site table with location and special feature.',
        'Revise town planning in 8 bullet points.',
        'Solve 20 ancient history MCQs focused on archaeology.',
        'Write a 150-word answer on urban character of Harappan civilization.',
        'Revise decline theories and their evidence.',
        'Compare IVC with Vedic society in one table.',
        'Do a final one-page flash revision.',
      ],
      oneLiners: [
        'IVC is an urban bronze-age civilization with strong civic planning.',
        'Great Bath is linked with Mohenjo-daro.',
        'Dholavira is high-yield for water management and city layout.',
        'Lothal is high-yield for maritime trade and dockyard discussion.',
      ],
    },
  }),
  resource(workspaces.upsc, {
    title: 'UPSC Polity Premium Notes: Fundamental Rights',
    slug: 'upsc-polity-fundamental-rights-premium-notes',
    summary: 'Fundamental Rights mapped to articles, writs, limitations, landmark themes, and PYQ-style revision.',
    type: 'notes',
    subject: 'Polity',
    topic: 'Fundamental Rights',
    difficulty: 'intermediate',
    tags: ['upsc', 'polity', 'constitution', 'fundamental-rights'],
    facets: { stage: 'prelims', paper: 'gs2' },
    syllabusNodes: ['constitution', 'fundamental-rights', 'judiciary'],
    isFeatured: true,
    contentInput: {
      title: 'UPSC Polity Premium Notes: Fundamental Rights',
      exam: 'UPSC CSE Prelims and GS2 Mains',
      subject: 'Indian Polity',
      whyItMatters: 'Fundamental Rights connect directly with constitutional morality, judiciary, governance, and rights-based current affairs.',
      examTip: 'Articles ko theme-wise yaad karo: equality, freedom, exploitation, religion, culture, remedy.',
      syllabusMap: [
        ['Articles 12-35', 'Meaning, scope, restrictions, remedies', 'Article-based MCQs'],
        ['Writs', 'Habeas Corpus, Mandamus, Prohibition, Certiorari, Quo Warranto', 'Court remedy questions'],
        ['Rights vs DPSP', 'Harmony, conflict, basic structure', 'GS2 analytical answers'],
      ],
      highYield: [
        ['Article 14', 'Equality before law and equal protection of laws', 'Use in governance examples'],
        ['Article 19', 'Six freedoms with reasonable restrictions', 'Revise restriction grounds'],
        ['Article 32', 'Right to constitutional remedies', 'Link with Supreme Court role'],
      ],
      pyqDecoder: [
        ['Article comparison', 'Fine difference between rights and restrictions', 'Make article flashcards'],
        ['Writ jurisdiction', 'Which court and which remedy', 'Practice scenario MCQs'],
        ['Basic structure', 'Constitutional balance', 'Prepare mains keywords'],
      ],
      memoryHook: '**E-F-E-R-C-R**: Equality, Freedom, Exploitation, Religion, Culture, Remedy.',
      commonMistakes: [
        'Article 32 and 226 ko same mat treat karo; High Court jurisdiction under Article 226 is wider.',
        'Fundamental Rights absolute nahi hote; reasonable restrictions important hain.',
      ],
      revisionDrill: [
        'Revise Articles 12 to 35 in sequence.',
        'Create a writs table with meaning and example.',
        'Solve 25 polity MCQs on rights.',
        'Write a 150-word answer on rights and reasonable restrictions.',
        'Link one current issue with Article 14 or 19.',
        'Revise rights-DPSP balance.',
        'Do a final article-only recall test.',
      ],
      oneLiners: [
        'Article 32 is itself a Fundamental Right.',
        'Article 14 combines formal equality and substantive fairness.',
        'Article 19 freedoms are subject to reasonable restrictions.',
        'Article 21 has expanded through judicial interpretation.',
      ],
    },
  }),
  resource(workspaces.upsc, {
    title: 'GS3 Economy Notes: Inclusive Growth',
    slug: 'upsc-gs3-inclusive-growth-notes',
    summary: 'Premium GS3 inclusive growth notes with syllabus bridge, data angles, PYQ decoder, and answer framework.',
    type: 'notes',
    subject: 'Economy',
    topic: 'Inclusive Growth',
    difficulty: 'advanced',
    tags: ['upsc', 'gs3', 'economy', 'inclusive-growth'],
    facets: { stage: 'mains', paper: 'gs3' },
    syllabusNodes: ['inclusive-growth-and-issues-arising-from-it', 'economic-development', 'poverty'],
    isFeatured: true,
    contentInput: {
      title: 'GS3 Economy Notes: Inclusive Growth',
      exam: 'UPSC CSE GS3 Mains',
      subject: 'Economy',
      whyItMatters: 'Inclusive growth is a bridge topic across poverty, employment, financial inclusion, social sector, and governance delivery.',
      examTip: 'Answer me growth + distribution + access + capability + sustainability ka balanced frame use karo.',
      syllabusMap: [
        ['Growth Quality', 'Jobs, wages, productivity, regional balance', 'Analytical mains answers'],
        ['Inclusion Channels', 'Financial inclusion, education, health, skilling, digital access', 'Scheme linkage'],
        ['Issues', 'Inequality, informal sector, gender gap, rural distress', 'Cause-effect-solution format'],
      ],
      highYield: [
        ['Financial Inclusion', 'Banking access is only first step; usage and credit quality matter', 'Use example of DBT and UPI carefully'],
        ['Employment', 'Inclusive growth needs productive jobs, not only GDP growth', 'Link with MSME and skills'],
        ['Human Capital', 'Health and education convert growth into capabilities', 'Use HDI-style thinking'],
      ],
      pyqDecoder: [
        ['Inclusive growth definition', 'Conceptual clarity', 'Start with 2-line definition'],
        ['Growth vs inequality', 'Balanced judgement', 'Use both market and state role'],
        ['Scheme evaluation', 'Outcome-based analysis', 'Write limitations + reforms'],
      ],
      memoryHook: '**G-A-C-E-S**: Growth, Access, Capability, Employment, Sustainability.',
      commonMistakes: [
        'Inclusive growth ko sirf poverty reduction mat banao; employment, access, gender, region sab include karo.',
        'Schemes list karne ke bajay outcome aur leakages explain karo.',
      ],
      revisionDrill: [
        'Write a 50-word definition of inclusive growth.',
        'Make one table: drivers, barriers, solutions.',
        'Revise financial inclusion and DBT examples.',
        'Prepare one answer on jobless growth.',
        'Add two current data placeholders from latest official reports before exam.',
        'Solve previous GS3 economy questions theme-wise.',
        'Practice a 250-word answer with conclusion.',
      ],
      oneLiners: [
        'Inclusive growth asks who benefits from growth.',
        'Employment is the strongest transmission channel for inclusion.',
        'Financial access without meaningful usage is incomplete inclusion.',
        'Human capital converts welfare delivery into long-term productivity.',
      ],
    },
  }),
  resource(workspaces.ssc, {
    title: 'SSC CGL Quant Premium Notes: Arithmetic Core',
    slug: 'ssc-cgl-quant-arithmetic-premium-notes',
    summary: 'Arithmetic premium pack for percentage, ratio, profit-loss, time-work, speed, and DI practice.',
    type: 'notes',
    subject: 'Quantitative Aptitude',
    topic: 'Arithmetic',
    difficulty: 'intermediate',
    tags: ['ssc', 'cgl', 'quant', 'arithmetic', 'premium-notes'],
    facets: { stage: 'tier-1', paper: 'quant' },
    syllabusNodes: ['percentage', 'ratio', 'profit-loss', 'time-and-work', 'speed-time-distance'],
    isFeatured: true,
    contentInput: {
      title: 'SSC CGL Quant Premium Notes: Arithmetic Core',
      exam: 'SSC CGL Tier 1 and Tier 2',
      subject: 'Quantitative Aptitude',
      whyItMatters: 'Arithmetic dominates speed-based SSC practice and directly improves DI, simplification, and word problems.',
      examTip: 'Formula ratne se pehle percentage-ratio conversion table automate karo.',
      syllabusMap: [
        ['Percentages', 'Fraction-percent conversion, change, comparison', 'Fast calculation MCQs'],
        ['Ratio-Proportion', 'Mixture, partnership, average linkage', 'Word problem decoding'],
        ['Work-Speed', 'Time-work, pipes, trains, boats', 'Multi-step practice'],
      ],
      highYield: [
        ['Percentage', 'Base value identify karo; increase/decrease me denominator trap hota hai', 'Daily 30 quick conversions'],
        ['Profit-Loss', 'CP, SP, MP, discount chain ko table me solve karo', 'Use single variable method'],
        ['Time-Work', 'LCM efficiency method is fastest for many questions', 'Practice worker-day conversions'],
      ],
      pyqDecoder: [
        ['Repeated arithmetic pattern', 'Same concept with new numbers', 'Maintain error notebook'],
        ['DI arithmetic', 'Percentage + ratio under time pressure', 'Practice approximation'],
        ['Tier 2 length', 'Calculation stamina', 'Use sectional timed sets'],
      ],
      memoryHook: '**P-R-A-W-S**: Percentage, Ratio, Average, Work, Speed.',
      commonMistakes: [
        'Successive percentage change ko simple addition mat karo.',
        'Average question me total items change ho rahe hain ya value change ho rahi hai, pehle identify karo.',
      ],
      revisionDrill: [
        'Revise fraction-percent table till 1/30.',
        'Solve 50 percentage and ratio questions.',
        'Do 2 DI sets with approximation.',
        'Solve time-work using LCM method.',
        'Solve speed-distance mixed set.',
        'Review wrong questions only.',
        'Take one 25-question timed arithmetic test.',
      ],
      oneLiners: [
        'Arithmetic speed comes from pattern recognition.',
        'Ratio is often a hidden percentage question.',
        'LCM method reduces time-work calculation load.',
        'Approximation matters in DI but exactness matters in final answer.',
      ],
    },
  }),
  resource(workspaces.ssc, {
    title: 'SSC CGL General Awareness Premium Notes: Static GK Scanner',
    slug: 'ssc-cgl-general-awareness-premium-scanner',
    summary: 'Static GK scanner for history, polity, geography, science, awards, sports, and revision priority.',
    type: 'notes',
    subject: 'General Awareness',
    topic: 'Static GK',
    difficulty: 'beginner',
    tags: ['ssc', 'general-awareness', 'static-gk', 'revision'],
    facets: { stage: 'tier-1', paper: 'general-awareness' },
    syllabusNodes: ['history', 'polity', 'geography', 'science', 'static-gk'],
    isFeatured: false,
    contentInput: {
      title: 'SSC CGL General Awareness Premium Notes: Static GK Scanner',
      exam: 'SSC CGL Tier 1 and Tier 2',
      subject: 'General Awareness',
      whyItMatters: 'GA can save time because many questions are direct recall if revision is spaced properly.',
      examTip: 'GA ko random mat padho; high-repeat themes ko scanner format me revise karo.',
      syllabusMap: [
        ['History', 'Modern, ancient basics, medieval culture', 'Direct factual MCQs'],
        ['Polity', 'Constitution articles, bodies, amendments basics', 'Static + current linkage'],
        ['Science', 'Everyday physics, chemistry, biology', 'Conceptual one-liners'],
      ],
      highYield: [
        ['Modern History', 'Congress sessions, movements, acts, personalities', 'Timeline sheet'],
        ['Polity', 'Schedules, articles, constitutional bodies', 'Flashcards'],
        ['Science', 'Units, diseases, vitamins, discoveries', 'One-liner notebook'],
      ],
      pyqDecoder: [
        ['Direct fact', 'Memory accuracy', 'Use spaced repetition'],
        ['Pair matching', 'Association recall', 'Create table-based notes'],
        ['Current-static link', 'Basic awareness', 'Read monthly recap selectively'],
      ],
      memoryHook: '**H-P-G-S-C**: History, Polity, Geography, Science, Current linkage.',
      commonMistakes: [
        'Current affairs ke chakkar me static GK ignore mat karo.',
        'Random PDFs collect karna preparation nahi hai; repeat revision is the real work.',
      ],
      revisionDrill: [
        'Revise one history timeline.',
        'Do polity articles flashcards.',
        'Read geography rivers/mountains table.',
        'Practice science one-liners.',
        'Solve 100 mixed GA MCQs.',
        'Mark 30 weak facts.',
        'Repeat only weak facts.',
      ],
      oneLiners: [
        'SSC GA rewards repeated revision.',
        'Table notes beat long prose for factual recall.',
        'Science basics are scoring when examples are clear.',
        'Polity articles should be revised with function, not only number.',
      ],
    },
  }),
  resource(workspaces.jee, {
    title: 'JEE Main Physics Premium Notes: Mechanics High-Yield',
    slug: 'jee-main-physics-mechanics-premium-notes',
    summary: 'Mechanics premium pack with concepts, formula traps, PYQ patterns, and 7-day revision drill.',
    type: 'notes',
    subject: 'Physics',
    topic: 'Mechanics',
    difficulty: 'advanced',
    tags: ['jee-main', 'physics', 'mechanics', 'formula', 'premium-notes'],
    facets: { stage: 'physics', paper: 'paper-1' },
    syllabusNodes: ['kinematics', 'laws-of-motion', 'work-energy-power', 'rotation', 'gravitation'],
    isFeatured: true,
    contentInput: {
      title: 'JEE Main Physics Premium Notes: Mechanics High-Yield',
      exam: 'JEE Main Paper 1',
      subject: 'Physics',
      whyItMatters: 'Mechanics builds the language for forces, motion, energy, rotation, and later physics chapters.',
      examTip: 'Diagram banao, sign convention fix karo, phir formula lagao. Blind formula use se errors aate hain.',
      syllabusMap: [
        ['Kinematics', 'Graphs, relative motion, projectile', 'Concept + calculation questions'],
        ['NLM and WPE', 'FBD, friction, work-energy theorem', 'Multi-concept MCQs'],
        ['Rotation', 'Torque, angular momentum, MOI, rolling', 'High-difficulty scoring zone'],
      ],
      highYield: [
        ['Free Body Diagram', 'All forces, directions, constraints clearly mark karo', 'Draw FBD in every NLM question'],
        ['Energy Method', 'Conservative vs non-conservative forces identify karo', 'Use when acceleration varies'],
        ['Rotation', 'Linear-angular analogies are powerful', 'Make formula pair table'],
      ],
      pyqDecoder: [
        ['Graph question', 'Slope/area interpretation', 'Practice x-t, v-t, a-t graphs'],
        ['Friction question', 'Limiting/static/kinetic distinction', 'Check whether motion starts'],
        ['Rolling question', 'Energy + rotation combined', 'Revise rolling constraints'],
      ],
      memoryHook: '**D-F-E-R**: Diagram, Forces, Energy, Rotation.',
      commonMistakes: [
        'Friction direction guess mat karo; relative motion tendency se decide karo.',
        'Projectile me horizontal acceleration zero hota hai only when air resistance ignored.',
      ],
      revisionDrill: [
        'Revise kinematics formulas and graphs.',
        'Solve 25 NLM FBD questions.',
        'Practice friction and pulley systems.',
        'Solve 20 work-energy questions.',
        'Revise rotation formula analogies.',
        'Solve 15 previous mechanics PYQs.',
        'Take a mixed mechanics timed test.',
      ],
      oneLiners: [
        'FBD is the grammar of mechanics.',
        'Area under v-t graph gives displacement.',
        'Work-energy is best when forces vary or path details are less important.',
        'Angular momentum conservation needs external torque check.',
      ],
    },
  }),
  resource(workspaces.jee, {
    title: 'JEE Main Chemistry Premium Notes: Mole Concept',
    slug: 'jee-main-chemistry-mole-concept-premium-notes',
    summary: 'Mole concept pack with stoichiometry, limiting reagent, concentration terms, PYQ patterns, and mistakes.',
    type: 'notes',
    subject: 'Chemistry',
    topic: 'Mole Concept',
    difficulty: 'intermediate',
    tags: ['jee-main', 'chemistry', 'mole-concept', 'stoichiometry'],
    facets: { stage: 'chemistry', paper: 'paper-1' },
    syllabusNodes: ['some-basic-concepts-of-chemistry', 'stoichiometry', 'concentration-terms'],
    isFeatured: false,
    contentInput: {
      title: 'JEE Main Chemistry Premium Notes: Mole Concept',
      exam: 'JEE Main Paper 1',
      subject: 'Chemistry',
      whyItMatters: 'Mole concept is the calculation base for physical chemistry and many inorganic/organic quantitative questions.',
      examTip: 'Unit conversion ko stepwise likho; mole, mass, particles, volume interchange ko automatic banao.',
      syllabusMap: [
        ['Mole Basics', 'Moles, molar mass, Avogadro number', 'Direct conversions'],
        ['Stoichiometry', 'Balanced equation, limiting reagent, yield', 'Reaction calculation'],
        ['Solutions', 'Molarity, molality, normality basics', 'Concentration problems'],
      ],
      highYield: [
        ['Balanced Equation', 'Coefficients give mole ratio, not mass ratio', 'Convert mass to mole first'],
        ['Limiting Reagent', 'Compare available mole/coefficient ratio', 'Use table method'],
        ['Concentration', 'Volume in litres for molarity', 'Write units every step'],
      ],
      pyqDecoder: [
        ['Mole conversion', 'Basic numeric accuracy', 'Practice mental molar masses'],
        ['Limiting reagent', 'Process clarity', 'Use ratio table'],
        ['Mixture solution', 'Formula + unit discipline', 'Revise concentration definitions'],
      ],
      memoryHook: '**M-B-L-C**: Mole, Balance, Limiting reagent, Concentration.',
      commonMistakes: [
        'Equation balance kiye bina stoichiometry start mat karo.',
        'Molarity me ml ko litre me convert karna bhoolna common trap hai.',
      ],
      revisionDrill: [
        'Revise mole conversion formulas.',
        'Practice 20 molar mass questions.',
        'Solve 25 stoichiometry questions.',
        'Do limiting reagent table method.',
        'Revise molarity and molality difference.',
        'Solve previous JEE-style numericals.',
        'Take a 30-minute mixed quiz.',
      ],
      oneLiners: [
        'Balanced equation coefficients represent mole ratio.',
        'Limiting reagent decides maximum product.',
        'Molarity depends on volume of solution.',
        'Percentage purity questions need actual reacting mass.',
      ],
    },
  }),
  resource(workspaces.neet, {
    title: 'NEET Biology Premium Notes: Human Physiology NCERT Map',
    slug: 'neet-biology-human-physiology-premium-notes',
    summary: 'NCERT-first human physiology pack with systems table, PYQ decoder, mnemonics, and revision sequence.',
    type: 'notes',
    subject: 'Biology',
    topic: 'Human Physiology',
    difficulty: 'intermediate',
    tags: ['neet', 'biology', 'ncert', 'human-physiology'],
    facets: { stage: 'biology', paper: 'biology' },
    syllabusNodes: ['digestion', 'breathing', 'body-fluids', 'excretion', 'neural-control'],
    isFeatured: true,
    contentInput: {
      title: 'NEET Biology Premium Notes: Human Physiology NCERT Map',
      exam: 'NEET UG',
      subject: 'Biology',
      whyItMatters: 'Human physiology is NCERT-heavy and rewards diagram labels, hormone functions, pathways, and disease associations.',
      examTip: 'NCERT line + diagram + table method follow karo; physiology me flowcharts fastest revision dete hain.',
      syllabusMap: [
        ['Digestion', 'Enzymes, glands, absorption, disorders', 'Direct NCERT questions'],
        ['Breathing and Circulation', 'Transport, respiratory volumes, cardiac cycle', 'Concept + fact mix'],
        ['Control Systems', 'Neural and endocrine coordination', 'Hormone-function matching'],
      ],
      highYield: [
        ['Enzymes', 'Substrate, site, product, optimum condition', 'Make enzyme table'],
        ['Cardiac Cycle', 'SA node, AV node, systole, diastole sequence', 'Draw flowchart'],
        ['Hormones', 'Source gland, hormone, target, function', 'Revise as table'],
      ],
      pyqDecoder: [
        ['NCERT line', 'Exact reading memory', 'Highlight only exam-worthy lines'],
        ['Diagram label', 'Visual recall', 'Redraw diagrams weekly'],
        ['Disease/function match', 'Association memory', 'Use flashcards'],
      ],
      memoryHook: '**D-B-C-E-N**: Digestion, Breathing, Circulation, Excretion, Neural-endocrine.',
      commonMistakes: [
        'NCERT examples ko skip mat karo; NEET often asks direct details.',
        'Hormone source aur target organ mix karna common error hai.',
      ],
      revisionDrill: [
        'Read NCERT human physiology summary.',
        'Make enzyme and hormone tables.',
        'Redraw heart and nephron diagrams.',
        'Solve 80 chapter-wise MCQs.',
        'Review wrong NCERT lines.',
        'Do one mixed physiology test.',
        'Repeat diagrams without looking.',
      ],
      oneLiners: [
        'Biology scoring comes from NCERT accuracy.',
        'Hormone tables are high-return revision tools.',
        'Diagram labels must be actively redrawn.',
        'Physiology questions often combine process order and function.',
      ],
    },
  }),
  resource(workspaces.cuet, {
    title: 'CUET UG Premium Notes: General Test Master Plan',
    slug: 'cuet-ug-general-test-premium-plan',
    summary: 'CUET General Test plan covering reasoning, quant, GK, current affairs, PYQ patterns, and daily practice.',
    type: 'notes',
    subject: 'General Test',
    topic: 'CUET General Test',
    difficulty: 'beginner',
    tags: ['cuet', 'general-test', 'reasoning', 'quant', 'gk'],
    facets: { stage: 'general-test', paper: 'general-test' },
    syllabusNodes: ['logical-reasoning', 'quantitative-aptitude', 'general-knowledge', 'current-affairs'],
    isFeatured: true,
    contentInput: {
      title: 'CUET UG Premium Notes: General Test Master Plan',
      exam: 'CUET UG',
      subject: 'General Test',
      whyItMatters: 'General Test can improve university options when practiced with speed, accuracy, and broad awareness.',
      examTip: 'Reasoning and quant ko daily timed sets me karo; GK ko weekly revision cycle me rakho.',
      syllabusMap: [
        ['Reasoning', 'Series, coding, analogy, direction, blood relation', 'Speed MCQs'],
        ['Quant', 'Arithmetic basics, DI, simplification', 'Calculation accuracy'],
        ['GK/CA', 'Static GK, current affairs, awareness', 'Recall questions'],
      ],
      highYield: [
        ['Reasoning', 'Pattern finding is faster than formula thinking', 'Do 30 daily mixed questions'],
        ['Quant', 'Percentage, ratio, average are core', 'Revise conversion table'],
        ['GK', 'Static + current both matter', 'Use compact monthly notes'],
      ],
      pyqDecoder: [
        ['Easy-moderate reasoning', 'Speed and accuracy', 'Timed practice'],
        ['Arithmetic word problem', 'Basic application', 'Underline data'],
        ['GK recall', 'Revision breadth', 'Use flashcards'],
      ],
      memoryHook: '**R-Q-G-C**: Reasoning, Quant, GK, Current affairs.',
      commonMistakes: [
        'Domain subjects ke chakkar me General Test ko last week tak postpone mat karo.',
        'Untimed practice se score estimate wrong hota hai; timer use karo.',
      ],
      revisionDrill: [
        'Solve 30 reasoning questions.',
        'Revise percentage and ratio.',
        'Read 30 GK one-liners.',
        'Do one DI set.',
        'Take a 40-question mixed test.',
        'Review wrong answers by topic.',
        'Repeat only weak zones.',
      ],
      oneLiners: [
        'CUET GT is practice-heavy.',
        'Reasoning improves fastest with daily sets.',
        'Arithmetic basics unlock quant and DI.',
        'GK needs spaced revision, not one-night reading.',
      ],
    },
  }),
  resource(workspaces.clat, {
    title: 'CLAT Premium Notes: Legal Reasoning Starter',
    slug: 'clat-legal-reasoning-premium-notes',
    summary: 'Legal reasoning pack with principle-fact method, current law awareness, PYQ decoder, and mistakes.',
    type: 'notes',
    subject: 'Legal Reasoning',
    topic: 'Principle-Fact Application',
    difficulty: 'intermediate',
    tags: ['clat', 'legal-reasoning', 'law', 'nlu'],
    facets: { stage: 'legal-reasoning', paper: 'ug' },
    syllabusNodes: ['legal-reasoning', 'current-legal-affairs', 'principle-fact'],
    isFeatured: false,
    contentInput: {
      title: 'CLAT Premium Notes: Legal Reasoning Starter',
      exam: 'CLAT UG',
      subject: 'Legal Reasoning',
      whyItMatters: 'Legal reasoning tests disciplined reading, not prior law degree knowledge.',
      examTip: 'Principle ko supreme rule treat karo; personal morality ya outside law add mat karo.',
      syllabusMap: [
        ['Principle', 'Rule statement, exception, condition', 'Application MCQs'],
        ['Facts', 'Relevant facts vs distractors', 'Reading accuracy'],
        ['Legal Awareness', 'Current legal themes and constitutional basics', 'Passage comfort'],
      ],
      highYield: [
        ['Rule Words', 'May, shall, only if, unless change answer', 'Underline keywords'],
        ['Exception', 'Most traps hide in exception clauses', 'Circle exception'],
        ['Facts', 'Answer only from given facts', 'Avoid outside assumptions'],
      ],
      pyqDecoder: [
        ['Principle-fact caselet', 'Application discipline', 'Use rule-fact-conclusion'],
        ['Long passage', 'Reading stamina', 'Summarize each paragraph'],
        ['Legal current passage', 'Awareness + logic', 'Read legal news summaries'],
      ],
      memoryHook: '**P-F-C**: Principle, Facts, Conclusion.',
      commonMistakes: [
        'Real life legal knowledge impose mat karo if passage gives a different rule.',
        'Emotionally appealing answer legal reasoning me wrong ho sakta hai.',
      ],
      revisionDrill: [
        'Solve 3 principle-fact sets.',
        'Read one constitutional law explainer.',
        'Practice passage annotation.',
        'Review wrong answers by trap type.',
        'Do one timed legal section.',
        'Make exception keyword notes.',
        'Repeat the hardest set.',
      ],
      oneLiners: [
        'CLAT legal reasoning is rule application.',
        'Exceptions decide close answers.',
        'Outside assumptions are dangerous.',
        'Passage discipline beats random law memorization.',
      ],
    },
  }),
  resource(workspaces.cat, {
    title: 'CAT Premium Plan: VARC DILR QA 30-Day Starter',
    slug: 'cat-varc-dilr-qa-premium-plan',
    summary: 'CAT starter plan with section strategy, PYQ decoder, mock analysis, and 30-day study rhythm.',
    type: 'practice',
    subject: 'MBA Entrance',
    topic: '30-Day Starter Plan',
    difficulty: 'intermediate',
    tags: ['cat', 'varc', 'dilr', 'qa', 'mock-analysis'],
    facets: { stage: 'mocks', paper: 'all-sections' },
    syllabusNodes: ['varc', 'dilr', 'quantitative-aptitude', 'mock-analysis'],
    isFeatured: false,
    contentInput: {
      title: 'CAT Premium Plan: VARC DILR QA 30-Day Starter',
      exam: 'CAT',
      subject: 'MBA Entrance Preparation',
      whyItMatters: 'CAT rewards section-wise strategy, selection judgement, and mock analysis more than raw syllabus completion.',
      examTip: 'Mock score tabhi improve hota hai jab analysis attempt se zyada time leta hai.',
      syllabusMap: [
        ['VARC', 'RC, para summary, odd sentence, para jumble', 'Reading + elimination'],
        ['DILR', 'Sets, arrangements, games, charts, reasoning data', 'Set selection'],
        ['QA', 'Arithmetic, algebra, geometry, numbers', 'Accuracy and topic strength'],
      ],
      highYield: [
        ['VARC', 'Main idea and tone matter more than line hunting', 'Read 2 RCs daily'],
        ['DILR', 'Pick solvable sets first', 'Practice set scanning'],
        ['QA', 'Arithmetic and algebra carry strong starter value', 'Build formula notebook'],
      ],
      pyqDecoder: [
        ['RC dense passage', 'Comprehension under time', 'Summarize in one line'],
        ['DILR unfamiliar set', 'Adaptability', 'Skip-select-solve'],
        ['QA mixed difficulty', 'Question selection', 'Do easy wins first'],
      ],
      memoryHook: '**R-S-A**: Read, Select, Analyze.',
      commonMistakes: [
        'Har DILR set solve karne ki zid score gira sakti hai.',
        'Mock ke baad sirf percentile dekhna analysis nahi hota.',
      ],
      revisionDrill: [
        'Day block 1: RC daily and arithmetic basics.',
        'Day block 2: DILR set selection practice.',
        'Day block 3: QA topic tests.',
        'Day block 4: Sectional mock.',
        'Day block 5: Full mock.',
        'Day block 6: Error log repair.',
        'Day block 7: Repeat weakest section.',
      ],
      oneLiners: [
        'CAT is a selection exam, not just a knowledge exam.',
        'DILR set choice can decide the section.',
        'VARC improves through reading and option elimination.',
        'QA accuracy beats reckless attempts.',
      ],
    },
  }),
  resource(workspaces.cbse10, {
    title: 'CBSE Class 10 Science Premium Revision Pack',
    slug: 'cbse-class-10-science-premium-revision-pack',
    summary: 'Science revision pack with NCERT map, diagrams, numericals, board answer tips, and sample-paper drill.',
    type: 'notes',
    subject: 'Science',
    topic: 'Board Revision',
    difficulty: 'beginner',
    tags: ['cbse', 'class-10', 'science', 'ncert', 'sample-paper'],
    facets: { stage: 'revision', class: '10' },
    syllabusNodes: ['chemical-reactions', 'life-processes', 'electricity', 'light', 'environment'],
    isFeatured: true,
    contentInput: {
      title: 'CBSE Class 10 Science Premium Revision Pack',
      exam: 'CBSE Class 10 Board',
      subject: 'Science',
      whyItMatters: 'Science score improves when NCERT diagrams, definitions, activities, reactions, and numericals are revised together.',
      examTip: 'Answer me heading, formula/reaction, diagram, and conclusion ka clean format use karo.',
      syllabusMap: [
        ['Chemistry', 'Reactions, acids-bases, metals, carbon compounds', 'Balanced equations'],
        ['Biology', 'Life processes, control, reproduction, heredity, environment', 'Diagrams and definitions'],
        ['Physics', 'Light, electricity, magnetic effects, energy', 'Formula numericals'],
      ],
      highYield: [
        ['Diagrams', 'Label neatly and use pencil', 'Practice ray diagrams and biology diagrams'],
        ['Numericals', 'Given, formula, substitution, answer with unit', 'Use standard format'],
        ['Reactions', 'Balance equations and mention conditions', 'Make reaction sheet'],
      ],
      pyqDecoder: [
        ['NCERT activity', 'Concept understanding', 'Revise activity conclusions'],
        ['Diagram question', 'Presentation clarity', 'Practice labels'],
        ['Numerical', 'Formula application', 'Write units'],
      ],
      memoryHook: '**D-F-U-R**: Diagram, Formula, Unit, Reaction.',
      commonMistakes: [
        'Final answer me unit chhodna marks cut kar sakta hai.',
        'Ray diagram arrows and labels unclear honge to answer weak lagega.',
      ],
      revisionDrill: [
        'Revise all formulas and units.',
        'Practice 10 ray diagrams.',
        'Balance 25 chemical equations.',
        'Revise biology diagrams.',
        'Solve one sample paper section-wise.',
        'Review presentation mistakes.',
        'Take one full timed paper.',
      ],
      oneLiners: [
        'NCERT diagrams are board-score assets.',
        'Units are part of the answer in physics.',
        'Balanced reactions show chemistry discipline.',
        'Sample papers train presentation and timing.',
      ],
    },
  }),
  resource(workspaces.gate, {
    title: 'GATE CSE Premium Notes: Data Structures',
    slug: 'gate-cse-data-structures-premium-notes',
    summary: 'Data structures premium pack with arrays, stacks, queues, trees, graphs, complexity, and PYQ decoder.',
    type: 'notes',
    subject: 'Computer Science',
    topic: 'Data Structures',
    difficulty: 'advanced',
    tags: ['gate', 'cse', 'data-structures', 'algorithms', 'pyq'],
    facets: { stage: 'foundation', paper: 'cse' },
    syllabusNodes: ['arrays', 'linked-list', 'stack', 'queue', 'tree', 'graph', 'complexity'],
    isFeatured: true,
    contentInput: {
      title: 'GATE CSE Premium Notes: Data Structures',
      exam: 'GATE CSE',
      subject: 'Computer Science',
      whyItMatters: 'Data structures connect directly with algorithms, OS, DBMS indexing, and programming logic questions.',
      examTip: 'Every DS ko operations + complexity + edge cases ke table me revise karo.',
      syllabusMap: [
        ['Linear DS', 'Array, linked list, stack, queue', 'Operation complexity MCQs'],
        ['Trees', 'BST, heap, traversal, balanced tree basics', 'Trace and output questions'],
        ['Graphs', 'Traversal, shortest path basics, MST basics', 'Algorithm linkage'],
      ],
      highYield: [
        ['Stack', 'LIFO, recursion, expression evaluation', 'Trace push-pop'],
        ['Tree Traversal', 'Preorder, inorder, postorder, level order', 'Practice reconstruction'],
        ['Graph Traversal', 'BFS uses queue, DFS uses stack/recursion', 'Trace visited order'],
      ],
      pyqDecoder: [
        ['Complexity table', 'Operation cost', 'Memorize with reason'],
        ['Traversal output', 'Step simulation', 'Write states'],
        ['Heap/BST property', 'Invariant checking', 'Draw after each operation'],
      ],
      memoryHook: '**O-C-I-T**: Operations, Complexity, Invariants, Trace.',
      commonMistakes: [
        'Average and worst-case complexity mix mat karo.',
        'Traversal order guess mat karo; exact recursive rule apply karo.',
      ],
      revisionDrill: [
        'Revise operations and complexity table.',
        'Trace stack and queue questions.',
        'Practice tree traversal reconstruction.',
        'Solve heap insertion/deletion.',
        'Trace BFS and DFS.',
        'Solve 25 GATE-style DS PYQs.',
        'Write one-page formula sheet.',
      ],
      oneLiners: [
        'DS questions reward exact tracing.',
        'Complexity must be tied to implementation.',
        'Tree traversal is deterministic when rules are followed.',
        'BFS queue and DFS stack is a must-remember pair.',
      ],
    },
  }),
  resource(workspaces.ctet, {
    title: 'CTET Premium Notes: Child Development and Pedagogy',
    slug: 'ctet-child-development-pedagogy-premium-notes',
    summary: 'Pedagogy notes with theories, classroom application, inclusive education, PYQ decoder, and mistakes.',
    type: 'notes',
    subject: 'Pedagogy',
    topic: 'Child Development',
    difficulty: 'intermediate',
    tags: ['ctet', 'pedagogy', 'child-development', 'teaching'],
    facets: { stage: 'paper-1', paper: 'pedagogy' },
    syllabusNodes: ['child-development', 'learning-theories', 'inclusive-education', 'assessment'],
    isFeatured: false,
    contentInput: {
      title: 'CTET Premium Notes: Child Development and Pedagogy',
      exam: 'CTET Paper 1 and Paper 2',
      subject: 'Pedagogy',
      whyItMatters: 'Pedagogy is concept plus classroom judgement; rote theory without application is weak.',
      examTip: 'Answer choose karte waqt child-centered, inclusive, activity-based option usually stronger hota hai.',
      syllabusMap: [
        ['Development', 'Growth, maturation, development principles', 'Concept MCQs'],
        ['Learning Theories', 'Piaget, Vygotsky, constructivism, motivation', 'Application questions'],
        ['Inclusive Education', 'Diversity, CWSN, assessment, classroom support', 'Teacher response MCQs'],
      ],
      highYield: [
        ['Constructivism', 'Learner builds knowledge actively', 'Prefer activity/discovery options'],
        ['Assessment', 'Formative feedback supports learning', 'Avoid punishment-based choices'],
        ['Inclusion', 'Adapt teaching to learner needs', 'Use equity lens'],
      ],
      pyqDecoder: [
        ['Classroom scenario', 'Teacher decision', 'Pick child-centered response'],
        ['Theory match', 'Concept clarity', 'Make theorist table'],
        ['Assessment item', 'Purpose of feedback', 'Focus on improvement'],
      ],
      memoryHook: '**C-A-I-F**: Child-centered, Activity, Inclusion, Feedback.',
      commonMistakes: [
        'Strict discipline wale option ko automatically correct mat samjho.',
        'Assessment ko sirf marks dena mat samjho; learning improvement key hai.',
      ],
      revisionDrill: [
        'Revise theorist table.',
        'Solve 50 pedagogy MCQs.',
        'Mark classroom scenario traps.',
        'Revise inclusive education terms.',
        'Practice assessment questions.',
        'Review wrong options carefully.',
        'Take one pedagogy sectional test.',
      ],
      oneLiners: [
        'CTET pedagogy favors child-centered teaching.',
        'Constructivism is active knowledge building.',
        'Formative assessment supports improvement.',
        'Inclusive classrooms adapt to diversity.',
      ],
    },
  }),
  resource(workspaces.bpsc, {
    title: 'BPSC Premium Notes: Bihar Special Starter',
    slug: 'bpsc-bihar-special-premium-starter',
    summary: 'Bihar special starter pack with history, geography, economy, polity, current linkage, and PYQ decoder.',
    type: 'notes',
    subject: 'Bihar Special',
    topic: 'State GK',
    difficulty: 'intermediate',
    tags: ['bpsc', 'bihar-special', 'state-gk', 'state-pcs'],
    facets: { stage: 'prelims', paper: 'general-studies' },
    syllabusNodes: ['bihar-history', 'bihar-geography', 'bihar-economy', 'bihar-polity', 'current-affairs'],
    isFeatured: false,
    contentInput: {
      title: 'BPSC Premium Notes: Bihar Special Starter',
      exam: 'BPSC Prelims and Mains',
      subject: 'Bihar Special',
      whyItMatters: 'State-specific knowledge separates BPSC preparation from generic UPSC-style GS.',
      examTip: 'Bihar special ko static + current + map + scheme format me padho.',
      syllabusMap: [
        ['History', 'Ancient centers, freedom movement, personalities', 'Static MCQs and mains examples'],
        ['Geography', 'Rivers, soil, climate, agriculture, disasters', 'Map-based recall'],
        ['Economy/Polity', 'State schemes, development issues, governance', 'Current linkage'],
      ],
      highYield: [
        ['Maps', 'Districts, rivers, borders, resource areas', 'Blank-map practice'],
        ['History', 'Magadha, Buddhism/Jainism, modern movement', 'Timeline table'],
        ['Schemes', 'Objective, target group, implementing department', 'Update from official sources before exam'],
      ],
      pyqDecoder: [
        ['State fact', 'Bihar-specific memory', 'Make Bihar-only notes'],
        ['Map clue', 'Geography accuracy', 'Practice maps'],
        ['Development issue', 'Mains analysis', 'Use cause-impact-solution'],
      ],
      memoryHook: '**H-G-E-C**: History, Geography, Economy, Current linkage.',
      commonMistakes: [
        'Generic GS notes ko Bihar special ka substitute mat banao.',
        'Scheme details current ho sakti hain; latest official source se verify karo.',
      ],
      revisionDrill: [
        'Revise Bihar map and rivers.',
        'Make history timeline.',
        'Read economy and agriculture basics.',
        'Revise current affairs state file.',
        'Solve 100 Bihar special MCQs.',
        'Write one mains answer using Bihar example.',
        'Update scheme facts from official notes.',
      ],
      oneLiners: [
        'State PCS needs state-specific examples.',
        'Map practice improves geography recall.',
        'Bihar history links ancient and modern themes.',
        'Current schemes must be verified close to exam.',
      ],
    },
  }),
  resource(workspaces.upsc, {
    title: 'UPSC Ancient History Premium Notes: Vedic Age',
    slug: 'upsc-ancient-history-vedic-age-premium-notes',
    summary: 'Early and Later Vedic Age premium pack with society, polity, economy, religion, terms, PYQ decoder, and memory hooks.',
    type: 'notes',
    subject: 'History',
    topic: 'Vedic Age',
    difficulty: 'intermediate',
    tags: ['upsc', 'history', 'ancient-india', 'vedic-age', 'premium-notes'],
    facets: { stage: 'foundation', paper: 'gs1' },
    syllabusNodes: ['ancient-india', 'vedic-age', 'society-culture'],
    isFeatured: true,
    contentInput: {
      title: 'UPSC Ancient History Premium Notes: Vedic Age',
      exam: 'UPSC CSE Prelims and GS1 Mains',
      subject: 'Ancient History',
      whyItMatters: 'Vedic Age is tested through chronology, social change, women status, religion, polity, and terms like Sabha, Samiti, and Ratnins.',
      examTip: 'Early vs Later Vedic comparison table banao; UPSC mostly transformation test karta hai, isolated facts nahi.',
      syllabusMap: [
        ['Chronology', 'Early Vedic and Later Vedic phases', 'Timeline and source-based MCQs'],
        ['Society', 'Tribe, family, varna, women, education, property', 'Mains social change angle'],
        ['Polity/Religion', 'Sabha, Samiti, Rajan, yajna, Upanishadic thought', 'Terms and conceptual comparison'],
      ],
      examFacts: [
        ['Sources', 'Rigveda is key for Early Vedic; later texts include Samaveda, Yajurveda, Atharvaveda, Brahmanas, Aranyakas, Upanishads', 'Source -> phase'],
        ['Women', 'Early phase shows relatively better status; later phase shows growing restrictions', 'Change, not absolute claim'],
        ['Economy', 'Pastoral base in early phase; agriculture and iron use become more important later', 'Pastoral -> agrarian'],
      ],
      highYield: [
        ['Early Vedic Polity', 'Rajan was tribal chief; Sabha and Samiti had deliberative roles', 'Make term flashcards'],
        ['Later Vedic Society', 'Varna divisions became sharper and ritualism expanded', 'Use social-change answer frame'],
        ['Religious Evolution', 'From nature worship and yajna to philosophical enquiry in Upanishads', 'Connect ritual to philosophy'],
      ],
      pyqDecoder: [
        ['Early vs Later comparison', 'Ability to identify social and economic transformation', 'Revise in two-column table'],
        ['Vedic terms', 'Exact meaning and institution', 'Use one-line definitions'],
        ['Women status prompt', 'Balanced historical analysis', 'Avoid golden-age exaggeration'],
      ],
      practiceQuestions: [
        ['Compare Early Vedic and Later Vedic society.', 'Use economy, polity, religion, women, varna headings.', 'Show transition from tribal-pastoral to agrarian-ritual order.'],
        ['Why are Sabha and Samiti important?', 'Explain deliberative role in early polity.', 'Avoid calling them modern democratic institutions.'],
        ['Trace religious evolution in the Vedic period.', 'Nature worship -> yajna -> Upanishadic speculation.', 'Use concise chronology.'],
      ],
      memoryHook: '**P-A-S-R**: Pastoral economy, Assemblies, Simple ritual, Rigvedic source for Early Vedic.',
      commonMistakes: [
        'Early Vedic aur Later Vedic ko same society treat mat karo.',
        'Sabha/Samiti ko modern Parliament jaisa directly mat likho.',
        'Women status ko one-line golden age ya dark age me reduce mat karo.',
      ],
      revisionDrill: [
        'Make Early vs Later Vedic table.',
        'Revise four Vedas and content.',
        'Write five terms: Sabha, Samiti, Ratnin, Gramini, Jana.',
        'Practice one women-status answer.',
        'Revise religion evolution flow.',
        'Solve 25 ancient history MCQs.',
        'Make one-page Vedic sheet.',
      ],
      oneLiners: [
        'Vedic Age questions are mostly comparison-based.',
        'Rigveda is central to Early Vedic reconstruction.',
        'Later Vedic period shows sharper social stratification.',
        'Upanishads mark a shift toward philosophical enquiry.',
      ],
    },
  }),
  resource(workspaces.upsc, {
    title: 'UPSC Modern History Premium Notes: Gandhi and Mass Movements',
    slug: 'upsc-modern-history-gandhi-mass-movements-premium-notes',
    summary: 'Premium notes on Gandhi, Champaran, Kheda, Non-Cooperation, Civil Disobedience, Quit India, PYQ themes, and answer frameworks.',
    type: 'notes',
    subject: 'History',
    topic: 'Gandhi and Mass Movements',
    difficulty: 'intermediate',
    tags: ['upsc', 'modern-history', 'gandhi', 'national-movement', 'premium-notes'],
    facets: { stage: 'mains', paper: 'gs1' },
    syllabusNodes: ['modern-india', 'national-movement', 'mass-movements'],
    isFeatured: true,
    contentInput: {
      title: 'UPSC Modern History Premium Notes: Gandhi and Mass Movements',
      exam: 'UPSC CSE Prelims and GS1 Mains',
      subject: 'Modern History',
      whyItMatters: 'Gandhian movements are repeatedly tested through chronology, causes, methods, social base, withdrawal, and impact.',
      examTip: 'Har movement ko Cause -> Programme -> Social Base -> Withdrawal/Outcome -> Impact format me padho.',
      syllabusMap: [
        ['Early Satyagraha', 'Champaran 1917, Ahmedabad 1918, Kheda 1918', 'Chronology and method'],
        ['Mass Movements', 'Non-Cooperation, Civil Disobedience, Quit India', 'Comparison and impact'],
        ['Ideology', 'Satyagraha, ahimsa, swaraj, constructive work', 'Mains analytical answers'],
      ],
      examFacts: [
        ['Champaran', '1917, indigo peasants, first major satyagraha in India', 'First experiment'],
        ['Dandi March', '1930, salt law challenge, symbolic mass mobilization', 'Salt -> sovereignty'],
        ['Quit India', 'August 1942, Do or Die, leadership arrests, underground activity', 'Final mass upsurge'],
      ],
      highYield: [
        ['Non-Cooperation', 'Boycott, swadeshi, national schools, resignation from titles', 'Link with Khilafat and Jallianwala Bagh'],
        ['Civil Disobedience', 'Salt satyagraha, no-tax campaigns, Gandhi-Irwin Pact', 'Use legality vs legitimacy angle'],
        ['Quit India', 'Leaderless local action and British repression', 'Show urgency of freedom demand'],
      ],
      pyqDecoder: [
        ['Compare movements', 'Change in method and participation', 'Use table answer'],
        ['Withdrawal critique', 'Judgement on Chauri Chaura and strategy', 'Balanced answer'],
        ['Gandhi role', 'Mass politicization and moral politics', 'Avoid one-sided praise'],
      ],
      practiceQuestions: [
        ['Compare Non-Cooperation and Civil Disobedience movements.', 'Use cause, method, social base, outcome.', 'Civil Disobedience directly violated laws.'],
        ['Why was Salt chosen as a symbol?', 'Mass connect, regressive tax, simple illegality, national appeal.', 'Do not call it only economic issue.'],
        ['Assess Quit India as a mass movement.', 'Mention leadership arrests, local action, repression, impact.', 'Balance spontaneity and limitations.'],
      ],
      memoryHook: '**C-K-N-C-Q**: Champaran, Kheda, Non-Cooperation, Civil Disobedience, Quit India.',
      commonMistakes: [
        'Movements ki dates ya sequence mix mat karo.',
        'Gandhi ko only saintly figure ke roop me mat likho; political strategy bhi explain karo.',
        'Withdrawal ko simple failure mat banao; strategic reasoning add karo.',
      ],
      revisionDrill: [
        'Make movement comparison table.',
        'Revise 1917-1942 timeline.',
        'Write one answer on salt satyagraha.',
        'Revise social base of each movement.',
        'Solve 30 modern history MCQs.',
        'Make Gandhi keywords flashcards.',
        'Practice one critical answer.',
      ],
      oneLiners: [
        'Gandhi transformed nationalism into mass politics.',
        'Salt made colonial authority visible in everyday life.',
        'Quit India showed irreversible demand for freedom.',
        'Constructive work connected politics with society.',
      ],
    },
  }),
  resource(workspaces.upsc, {
    title: 'UPSC Polity Premium Notes: Parliament and Legislative Process',
    slug: 'upsc-polity-parliament-legislative-process-premium-notes',
    summary: 'Premium Parliament pack with Lok Sabha/Rajya Sabha comparison, bills, committees, privileges, PYQ decoder, and traps.',
    type: 'notes',
    subject: 'Polity',
    topic: 'Parliament',
    difficulty: 'intermediate',
    tags: ['upsc', 'polity', 'parliament', 'legislative-process', 'premium-notes'],
    facets: { stage: 'prelims-mains', paper: 'gs2' },
    syllabusNodes: ['constitution', 'parliament', 'governance'],
    isFeatured: true,
    contentInput: {
      title: 'UPSC Polity Premium Notes: Parliament and Legislative Process',
      exam: 'UPSC CSE Prelims and GS2 Mains',
      subject: 'Indian Polity',
      whyItMatters: 'Parliament links Constitution, governance, accountability, budget, committees, federalism, and daily current affairs.',
      examTip: 'Money Bill, Financial Bill, ordinary bill, and constitutional amendment ko separate flowcharts me revise karo.',
      syllabusMap: [
        ['Structure', 'Lok Sabha, Rajya Sabha, Speaker, Chairman', 'Institutional comparison'],
        ['Process', 'Bills, budget, sessions, quorum, voting', 'Prelims procedural accuracy'],
        ['Accountability', 'Question Hour, committees, motions, privileges', 'GS2 mains analysis'],
      ],
      examFacts: [
        ['Quorum', 'One-tenth of total membership of the House', 'Fraction fact'],
        ['Rajya Sabha', 'Permanent House; one-third members retire every two years', 'Continuity'],
        ['Money Bill', 'Speaker certification is central; Rajya Sabha can recommend but not reject', 'LS primacy'],
      ],
      highYield: [
        ['Question Hour', 'Executive accountability through questions', 'Compare with Zero Hour'],
        ['Committees', 'Detailed scrutiny away from floor politics', 'Use PAC/Estimates examples'],
        ['Anti-Defection', 'Tenth Schedule checks political defections', 'Link with Speaker role'],
      ],
      pyqDecoder: [
        ['Bill process trap', 'Exact constitutional procedure', 'Make flowcharts'],
        ['Parliamentary decline', 'Quality of debate and committee scrutiny', 'Use reform points'],
        ['Speaker role', 'Neutrality, money bill, disqualification', 'Balance powers and concerns'],
      ],
      practiceQuestions: [
        ['Differentiate Money Bill and Financial Bill.', 'Use origin, Rajya Sabha power, Speaker certification.', 'Avoid treating all finance-related bills as Money Bills.'],
        ['Why are committees important?', 'Scrutiny, expertise, non-partisan review, executive accountability.', 'Give PAC/Estimates examples.'],
        ['Discuss Parliament as an accountability institution.', 'Question Hour, motions, budget, committees.', 'Mention recent concerns carefully.'],
      ],
      memoryHook: '**L-B-C-M**: Legislature, Budget, Committees, Motions.',
      commonMistakes: [
        'Zero Hour ko Constitution me directly mentioned procedure mat bolna.',
        'Rajya Sabha ko completely powerless mat samjho.',
        'Money Bill aur Financial Bill ko mix mat karo.',
      ],
      revisionDrill: [
        'Make bill-process flowchart.',
        'Revise LS vs RS table.',
        'Write committee functions.',
        'Revise motions and devices.',
        'Solve 30 polity MCQs.',
        'Write one GS2 answer on committees.',
        'Update current parliamentary examples.',
      ],
      oneLiners: [
        'Parliament combines law-making, finance control, and accountability.',
        'Committees are Parliament in working mode.',
        'Money Bill procedure gives Lok Sabha primacy.',
        'Rajya Sabha provides federal continuity.',
      ],
    },
  }),
  resource(workspaces.upsc, {
    title: 'UPSC Environment Premium Notes: Biodiversity and Conservation',
    slug: 'upsc-environment-biodiversity-conservation-premium-notes',
    summary: 'Premium biodiversity pack with hotspots, protected areas, threats, laws, conventions, PYQ decoder, and revision traps.',
    type: 'notes',
    subject: 'Environment',
    topic: 'Biodiversity and Conservation',
    difficulty: 'intermediate',
    tags: ['upsc', 'environment', 'biodiversity', 'conservation', 'premium-notes'],
    facets: { stage: 'prelims-mains', paper: 'gs3' },
    syllabusNodes: ['environment', 'biodiversity', 'conservation'],
    isFeatured: true,
    contentInput: {
      title: 'UPSC Environment Premium Notes: Biodiversity and Conservation',
      exam: 'UPSC CSE Prelims and GS3 Mains',
      subject: 'Environment',
      whyItMatters: 'Biodiversity questions test maps, species, protected area categories, threats, conventions, and conservation logic.',
      examTip: 'Species ko habitat + state + protection status ke saath revise karo; isolated names jaldi bhoolte hain.',
      syllabusMap: [
        ['Concepts', 'Genetic, species, ecosystem diversity', 'Definition and examples'],
        ['India Map', 'Hotspots, biosphere reserves, national parks, Ramsar sites', 'Map-based MCQs'],
        ['Governance', 'Wildlife Act, Biodiversity Act, CITES, Ramsar, CBD', 'Law-convention matching'],
      ],
      examFacts: [
        ['India Share', 'India has about 2.4 percent of world land and high species diversity', 'Land vs diversity contrast'],
        ['Hotspots', 'Himalaya, Western Ghats-Sri Lanka, Indo-Burma, Sundaland parts relate to India', 'Map memory'],
        ['Conservation', 'In-situ protects species in habitat; ex-situ protects outside habitat', 'Method distinction'],
      ],
      highYield: [
        ['Threats', 'Habitat loss, invasive species, overuse, pollution, climate change', 'Use HIPOC mnemonic'],
        ['Protected Areas', 'National Parks, Sanctuaries, Conservation Reserves, Community Reserves', 'Compare restriction levels'],
        ['Conventions', 'CITES trade, Ramsar wetlands, CBD biodiversity, CMS migratory species', 'Make convention table'],
      ],
      pyqDecoder: [
        ['Species-location pair', 'Map and habitat memory', 'Revise with atlas'],
        ['Conservation method', 'In-situ vs ex-situ clarity', 'Use examples'],
        ['Law/convention', 'Objective and institution', 'Make one-page legal table'],
      ],
      practiceQuestions: [
        ['Differentiate in-situ and ex-situ conservation.', 'Define and give examples.', 'Mention complementarity.'],
        ['Why is biodiversity under threat in India?', 'Use habitat loss, invasives, climate, pollution, overuse.', 'Add governance angle.'],
        ['Explain biodiversity hotspots.', 'Criteria, Indian regions, conservation value.', 'Map is essential.'],
      ],
      memoryHook: '**HIPOC**: Habitat loss, Invasives, Pollution, Overuse, Climate change.',
      commonMistakes: [
        'National Park aur Wildlife Sanctuary restriction levels mix mat karo.',
        'Hotspot ko species-rich area only mat samjho; endemism and threat bhi key hain.',
        'Convention ke objective ko wrong body ke saath match mat karo.',
      ],
      revisionDrill: [
        'Revise India biodiversity hotspot map.',
        'Make protected area comparison table.',
        'Revise 20 species-location pairs.',
        'Read laws and conventions table.',
        'Solve 40 environment MCQs.',
        'Write one answer on threats.',
        'Update latest official numbers before exam.',
      ],
      oneLiners: [
        'Biodiversity is ecological insurance.',
        'In-situ conservation protects habitat and species together.',
        'Hotspots combine richness, endemism, and threat.',
        'Conservation needs law, community, science, and finance.',
      ],
    },
  }),
  resource(workspaces.upsc, {
    title: 'UPSC Science Tech Premium Notes: Space Technology India',
    slug: 'upsc-science-tech-space-technology-india-premium-notes',
    summary: 'Premium ISRO and space technology pack with missions, launch vehicles, applications, policy, PYQ decoder, and answer value-adds.',
    type: 'notes',
    subject: 'Science and Technology',
    topic: 'Space Technology',
    difficulty: 'intermediate',
    tags: ['upsc', 'science-tech', 'space', 'isro', 'premium-notes'],
    facets: { stage: 'mains', paper: 'gs3' },
    syllabusNodes: ['science-and-technology', 'space-technology', 'isro'],
    isFeatured: true,
    contentInput: {
      title: 'UPSC Science Tech Premium Notes: Space Technology India',
      exam: 'UPSC CSE Prelims and GS3 Mains',
      subject: 'Science and Technology',
      whyItMatters: 'Space technology connects missions, launch vehicles, applications, disaster management, security, agriculture, and private sector policy.',
      examTip: 'Mission ko objective + payload/use + national application ke saath revise karo.',
      syllabusMap: [
        ['Missions', 'Chandrayaan, Mangalyaan, Aditya-L1, Gaganyaan, NISAR', 'Mission-objective matching'],
        ['Launch Vehicles', 'PSLV, GSLV, LVM3, SSLV', 'Payload/use comparison'],
        ['Applications', 'Navigation, communication, weather, agriculture, disaster, defence', 'GS3 answer examples'],
      ],
      examFacts: [
        ['PSLV', 'Known as workhorse launch vehicle for many earth observation and interplanetary missions', 'Workhorse'],
        ['NavIC', 'India regional navigation system for positioning and timing services', 'Navigation'],
        ['Space Policy', 'Recent policy direction opens larger private sector role', 'Private participation'],
      ],
      highYield: [
        ['Earth Observation', 'Supports crop monitoring, disaster mapping, urban planning', 'Use application examples'],
        ['Navigation', 'NavIC helps transport, fishermen, timing, security', 'Link to strategic autonomy'],
        ['Commercial Space', 'NSIL, IN-SPACe, startups, launch services', 'Use economy + innovation angle'],
      ],
      pyqDecoder: [
        ['Mission matching', 'Objective and payload awareness', 'Make mission table'],
        ['Development application', 'Space for governance and inclusion', 'Use sector-wise answer'],
        ['Policy question', 'Private sector and regulation', 'Balance opportunity and risk'],
      ],
      practiceQuestions: [
        ['How can space technology support development?', 'Agriculture, disaster, weather, communication, navigation.', 'Give Indian examples.'],
        ['Differentiate PSLV, GSLV, LVM3, SSLV.', 'Use payload/use case table.', 'Avoid exact payload overclaim if unsure.'],
        ['Discuss private sector role in Indian space.', 'Innovation, capacity, commercialization, regulation.', 'Mention safety and strategic concerns.'],
      ],
      memoryHook: '**M-L-A-P**: Missions, Launchers, Applications, Policy.',
      commonMistakes: [
        'Mission facts ko outdated current timeline ke saath mat likho; latest official status verify karo.',
        'Space answer ko only rockets tak limit mat karo; applications are scoring.',
        'Private sector ko regulation-free solution mat present karo.',
      ],
      revisionDrill: [
        'Make ISRO mission timeline.',
        'Revise launch vehicle table.',
        'Create applications mind map.',
        'Read space policy notes.',
        'Solve 25 science-tech MCQs.',
        'Write one GS3 application answer.',
        'Update latest ISRO mission status.',
      ],
      oneLiners: [
        'Space technology is a force multiplier for governance.',
        'NavIC strengthens strategic autonomy.',
        'Earth observation converts satellite data into public value.',
        'Private space needs innovation plus safety regulation.',
      ],
    },
  }),
  resource(workspaces.upsc, {
    title: 'UPSC Current Affairs Premium Pack: Monthly GS Decoder',
    slug: 'upsc-current-affairs-monthly-gs-decoder-premium-pack',
    summary: 'Monthly current affairs premium template with GS buckets, reports, schemes, PYQ links, MCQ practice, and revision drill.',
    type: 'notes',
    subject: 'Current Affairs',
    topic: 'Monthly GS Decoder',
    difficulty: 'intermediate',
    tags: ['upsc', 'current-affairs', 'monthly-revision', 'premium-notes'],
    facets: { stage: 'prelims-mains', paper: 'gs' },
    syllabusNodes: ['current-affairs', 'polity', 'economy', 'environment', 'science-tech'],
    isFeatured: true,
    contentInput: {
      title: 'UPSC Current Affairs Premium Pack: Monthly GS Decoder',
      exam: 'UPSC CSE and State PSC Current Affairs',
      subject: 'Current Affairs',
      whyItMatters: 'Current affairs becomes scoring only when events are mapped to syllabus, PYQ themes, reports, schemes, and answer examples.',
      examTip: 'News ko headline ke roop me mat padho; syllabus bucket + static link + exam use identify karo.',
      syllabusMap: [
        ['Polity/Governance', 'Bills, judgments, institutions, schemes', 'GS2 + prelims terms'],
        ['Economy/Environment', 'RBI, budget, reports, climate, biodiversity', 'Data and concept link'],
        ['IR/Sci-Tech', 'Summits, agreements, missions, emerging tech', 'Mains examples and MCQs'],
      ],
      examFacts: [
        ['Reports', 'Report name, released by, India rank/status, key finding', 'Table memory'],
        ['Schemes', 'Ministry, objective, beneficiaries, funding, progress', 'Scheme card'],
        ['Judgments/Laws', 'Issue, article/act, holding/provision, impact', 'GS2 linkage'],
      ],
      highYield: [
        ['Static Link', 'Every current event must connect to one static topic', 'Write static anchor'],
        ['Data Use', 'Use only official or credible latest data', 'Avoid random numbers'],
        ['Revision', 'Monthly -> quarterly -> pre-exam consolidation', 'Use spaced revision'],
      ],
      pyqDecoder: [
        ['Statement MCQ', 'Fact + concept + exception', 'Make short notes'],
        ['Mains issue', 'Cause-impact-way forward', 'Use current example'],
        ['Report/index', 'Institution and significance', 'Table format'],
      ],
      practiceQuestions: [
        ['Create a scheme note in 8 lines.', 'Ministry, launch, objective, beneficiaries, funding, implementation, progress, challenge.', 'Verify latest official details.'],
        ['Convert one news item into GS2 answer point.', 'Issue, constitutional link, governance impact, way forward.', 'Avoid editorial copying.'],
        ['Make 10 MCQs from one month.', 'Use reports, laws, terms, locations, schemes.', 'Add explanation for each.'],
      ],
      memoryHook: '**S-P-E-C**: Syllabus link, PYQ signal, Exam use, Current data.',
      commonMistakes: [
        'Current affairs ko newspaper summary bana dena biggest mistake hai.',
        'Unverified data ya old scheme status answer me mat likho.',
        'Static subject link ke bina monthly notes revise nahi hote.',
      ],
      revisionDrill: [
        'Bucket all news into GS1-GS4 and prelims.',
        'Make reports and indices table.',
        'Make schemes table.',
        'Create 10 MCQs.',
        'Write two mains answer points.',
        'Revise old month in 30 minutes.',
        'Update facts from official sources.',
      ],
      oneLiners: [
        'Current affairs is useful only after syllabus mapping.',
        'Reports need source, rank/status, and implication.',
        'Schemes need ministry, target group, and implementation logic.',
        'Every news item should become either MCQ fact or mains example.',
      ],
    },
  }),
  resource(workspaces.upsc, {
    title: 'UPSC Ancient History Premium Notes: Mauryan Empire',
    slug: 'upsc-ancient-history-mauryan-empire-premium-notes',
    summary: 'Mauryan Empire premium pack with rulers, Arthashastra, Ashoka Dhamma, edicts, administration, art, decline, and PYQ decoder.',
    type: 'notes',
    subject: 'History',
    topic: 'Mauryan Empire',
    difficulty: 'intermediate',
    tags: ['upsc', 'history', 'ancient-india', 'mauryan-empire', 'ashoka', 'premium-notes'],
    facets: { stage: 'foundation', paper: 'gs1' },
    syllabusNodes: ['ancient-india', 'mauryan-empire', 'ashoka', 'art-and-culture'],
    isFeatured: true,
    contentInput: {
      title: 'UPSC Ancient History Premium Notes: Mauryan Empire',
      exam: 'UPSC CSE Prelims and GS1 Mains',
      subject: 'Ancient History',
      whyItMatters: 'Mauryan questions repeatedly test polity, Arthashastra, Ashoka edicts, Dhamma, administration, art, and decline.',
      examTip: 'Mauryan topic ko ruler -> source -> administration -> Dhamma -> edicts -> art -> decline sequence me revise karo.',
      syllabusMap: [
        ['Sources', 'Arthashastra, Indica, Ashokan inscriptions, Buddhist texts', 'Source-based MCQs'],
        ['Administration', 'Central, provincial, district, village, revenue, espionage', 'Mains governance comparison'],
        ['Ashoka', 'Dhamma, edicts, welfare, religious policy, foreign relations', 'Prelims facts and GS1 analysis'],
      ],
      examFacts: [
        ['Chandragupta Maurya', 'Founded Mauryan power after Nanda decline and Greek contacts', 'Rise of empire'],
        ['Arthashastra', 'Kautilya text on statecraft, economy, security, taxation, and administration', 'Governance source'],
        ['Ashokan Edicts', 'Major rock, pillar, minor edicts, and cave inscriptions are key evidence', 'Inscription table'],
      ],
      highYield: [
        ['Dhamma', 'Moral-ethical policy focused on tolerance, welfare, restraint, and social harmony', 'Avoid calling it a new religion'],
        ['Administration', 'Highly organized state with officials, revenue system, roads, spies, and provinces', 'Make officer-function table'],
        ['Art', 'Pillars, polish, capitals, stupas, caves, and imperial symbolism', 'Use Sarnath/Lauriya examples'],
      ],
      pyqDecoder: [
        ['Edict-location-content', 'Exact association memory', 'Make three-column edict table'],
        ['Dhamma interpretation', 'Religion vs ethical governance', 'Write balanced explanation'],
        ['Decline causes', 'Multi-causal historical reasoning', 'Avoid one-cause answer'],
      ],
      practiceQuestions: [
        ['Explain Ashoka Dhamma.', 'Define it as ethical-social policy and add welfare/tolerance examples.', 'Do not present it as conversion campaign only.'],
        ['Assess Mauryan administration.', 'Use central-provincial-local table and Arthashastra evidence.', 'Mention limits of evidence.'],
        ['Why did Mauryan Empire decline?', 'Use succession, finances, administration, regional forces, and external pressure.', 'Avoid single-cause explanation.'],
      ],
      memoryHook: '**C-A-D-E-A-D**: Chandragupta, Arthashastra, Dhamma, Edicts, Art, Decline.',
      commonMistakes: [
        'Ashoka Dhamma ko Buddhism ke equal mat likho; overlap tha, but policy broader thi.',
        'Edicts ke type aur location ko mix karna common prelims trap hai.',
        'Mauryan decline ko sirf Ashoka ki ahimsa se explain karna weak answer hai.',
      ],
      revisionDrill: [
        'Make ruler timeline from Chandragupta to later Mauryas.',
        'Create Arthashastra key themes table.',
        'Revise Ashoka edicts and locations.',
        'Write Dhamma in 120 words.',
        'Revise Mauryan art examples.',
        'Solve 30 ancient history MCQs.',
        'Write one mains answer on decline.',
      ],
      oneLiners: [
        'Mauryan Empire shows early imperial state formation in India.',
        'Arthashastra is high-yield for statecraft and economy.',
        'Ashoka Dhamma was ethical governance, not a narrow sectarian doctrine.',
        'Mauryan decline needs multi-causal explanation.',
      ],
    },
  }),
  resource(workspaces.upsc, {
    title: 'UPSC Modern History Premium Notes: British Economic Policies',
    slug: 'upsc-modern-history-british-economic-policies-premium-notes',
    summary: 'Premium notes on drain of wealth, deindustrialization, land revenue systems, railways, famines, economic critics, and PYQ frameworks.',
    type: 'notes',
    subject: 'History',
    topic: 'British Economic Policies',
    difficulty: 'advanced',
    tags: ['upsc', 'modern-history', 'economy', 'colonialism', 'premium-notes'],
    facets: { stage: 'mains', paper: 'gs1' },
    syllabusNodes: ['modern-india', 'colonial-economy', 'economic-impact-of-british-rule'],
    isFeatured: true,
    contentInput: {
      title: 'UPSC Modern History Premium Notes: British Economic Policies',
      exam: 'UPSC CSE Prelims and GS1 Mains',
      subject: 'Modern History',
      whyItMatters: 'Colonial economy questions test cause-effect analysis, land revenue systems, drain theory, deindustrialization, and nationalist critique.',
      examTip: 'Economic impact answers me policy -> mechanism -> Indian impact -> nationalist response format use karo.',
      syllabusMap: [
        ['Drain of Wealth', 'Naoroji, home charges, trade surplus, remittances', 'Economic nationalist argument'],
        ['Land Revenue', 'Permanent Settlement, Ryotwari, Mahalwari', 'System-area-impact table'],
        ['Industry and Trade', 'Deindustrialization, railways, commercialization, famines', 'Cause-effect mains answers'],
      ],
      examFacts: [
        ['Permanent Settlement', 'Bengal and nearby areas; zamindar as revenue intermediary', 'Area-system pair'],
        ['Ryotwari', 'Madras and Bombay areas; settlement directly with cultivator', 'Direct cultivator cue'],
        ['Mahalwari', 'North-Western Provinces, Punjab and parts of central India; village/estate basis', 'Mahal or estate cue'],
      ],
      highYield: [
        ['Drain Theory', 'Wealth transferred without adequate economic return through salaries, pensions, profits, and home charges', 'Use Naoroji and R C Dutt'],
        ['Deindustrialization', 'Traditional crafts declined due to colonial trade policy, machine-made imports, and loss of patronage', 'Textile example is high-yield'],
        ['Famines', 'Market forces, revenue rigidity, poor relief, and export priorities worsened vulnerability', 'Use governance critique'],
      ],
      pyqDecoder: [
        ['Land revenue comparison', 'Area, intermediary, peasant impact', 'Make system table'],
        ['Economic critique', 'Nationalist economic thought', 'Use drain and deindustrialization'],
        ['Railway question', 'Dual impact: integration and exploitation', 'Balance pros and cons'],
      ],
      practiceQuestions: [
        ['Compare Permanent Settlement, Ryotwari and Mahalwari.', 'Use area, payer, state relation, peasant impact.', 'Do not mix Ryotwari with zamindari.'],
        ['Explain Drain of Wealth.', 'Define mechanism and mention nationalist critique.', 'Avoid vague exploitation language only.'],
        ['Discuss economic impact of British rule.', 'Use agriculture, industry, trade, famine, infrastructure, class impact.', 'End with nationalist awakening.'],
      ],
      memoryHook: '**D-L-I-F-R**: Drain, Land revenue, Industry decline, Famines, Railways.',
      commonMistakes: [
        'Railways ko only positive modernization mat likho; colonial purpose and extraction angle add karo.',
        'Land revenue systems ke areas mix mat karo.',
        'Drain theory ko emotional slogan nahi, economic mechanism ke roop me explain karo.',
      ],
      revisionDrill: [
        'Make land revenue comparison table.',
        'Revise drain theory with channels.',
        'Write deindustrialization in 150 words.',
        'Map railway pros and cons.',
        'Revise famine governance critique.',
        'Solve modern history MCQs on economy.',
        'Write one analytical GS1 answer.',
      ],
      oneLiners: [
        'Colonial economy created integration without inclusive development.',
        'Drain theory gave nationalism an economic language.',
        'Land revenue systems reshaped agrarian relations.',
        'Deindustrialization weakened traditional artisan livelihoods.',
      ],
    },
  }),
  resource(workspaces.upsc, {
    title: 'UPSC Polity Premium Notes: Constitution Making and Features',
    slug: 'upsc-polity-constitution-making-features-premium-notes',
    summary: 'Premium Constitution pack with Constituent Assembly, borrowed features, Preamble, salient features, committees, and PYQ decoder.',
    type: 'notes',
    subject: 'Polity',
    topic: 'Indian Constitution Making and Features',
    difficulty: 'intermediate',
    tags: ['upsc', 'polity', 'constitution', 'preamble', 'premium-notes'],
    facets: { stage: 'prelims-mains', paper: 'gs2' },
    syllabusNodes: ['constitution', 'constituent-assembly', 'preamble', 'salient-features'],
    isFeatured: true,
    contentInput: {
      title: 'UPSC Polity Premium Notes: Constitution Making and Features',
      exam: 'UPSC CSE Prelims and GS2 Mains',
      subject: 'Indian Polity',
      whyItMatters: 'This foundation topic supports Fundamental Rights, federalism, Parliament, judiciary, amendments, and governance answers.',
      examTip: 'Borrowed features table and Preamble keyword meanings revise karo; ye prelims aur mains dono me kaam aate hain.',
      syllabusMap: [
        ['Constituent Assembly', 'Formation, committees, leaders, timeline, debates', 'Fact and context'],
        ['Borrowed Features', 'UK, USA, Ireland, Canada, Australia, Germany, USSR and others', 'Pair matching MCQs'],
        ['Salient Features', 'Federalism, parliamentary system, rights, DPSP, secularism, judicial review', 'GS2 answer base'],
      ],
      examFacts: [
        ['Timeline', 'Constitution adopted on 26 November 1949 and came into force on 26 January 1950', 'Date pair'],
        ['Duration', 'Assembly worked for 2 years, 11 months and 18 days', 'Classic prelims fact'],
        ['Preamble Change', 'Socialist, Secular and Integrity added by 42nd Amendment 1976', 'Amendment cue'],
      ],
      highYield: [
        ['Borrowed Features', 'Parliamentary system from UK, FR/Judicial Review from USA, DPSP from Ireland', 'Make country-feature table'],
        ['Federal With Unitary Bias', 'Division of powers exists but centre is strong', 'Use emergency and residuary examples'],
        ['Basic Structure', 'Judicial doctrine protects core constitutional identity', 'Link with Kesavananda Bharati theme'],
      ],
      pyqDecoder: [
        ['Source-feature matching', 'Borrowed features accuracy', 'Daily table recall'],
        ['Federal vs unitary', 'Analytical constitutional nature', 'Use balanced table'],
        ['Preamble interpretation', 'Keyword meaning and constitutional values', 'Define each term precisely'],
      ],
      practiceQuestions: [
        ['Explain borrowed features of the Constitution.', 'Use country-feature table and Indian adaptation.', 'Do not say Constitution is copied.'],
        ['Is Indian Constitution federal?', 'Mention federal features and unitary bias.', 'End with cooperative federalism.'],
        ['Discuss importance of Preamble.', 'Values, objectives, interpretation, basic structure link.', 'Avoid only listing words.'],
      ],
      memoryHook: '**U-S-I-C-A-G**: UK, USA, Ireland, Canada, Australia, Germany for borrowed features.',
      commonMistakes: [
        'Constitution ko copy-paste document mat likho; it is borrowed but adapted.',
        'Preamble ko enforceable fundamental right mat treat karo.',
        'Federalism answer me only Union List ya State List facts mat likho; spirit and practice add karo.',
      ],
      revisionDrill: [
        'Revise CA timeline and dates.',
        'Make borrowed features country table.',
        'Memorize Preamble keywords.',
        'Write federal vs unitary table.',
        'Solve 30 polity MCQs.',
        'Write one GS2 answer on Constitution nature.',
        'Revise amendment and basic structure link.',
      ],
      oneLiners: [
        'The Constitution is borrowed, adapted and transformed for Indian conditions.',
        'Preamble is the value compass of the Constitution.',
        'Indian federalism has a strong centre.',
        'Basic structure protects constitutional identity.',
      ],
    },
  }),
  resource(workspaces.upsc, {
    title: 'UPSC Environment Premium Notes: Climate Change Complete Guide',
    slug: 'upsc-environment-climate-change-complete-guide-premium-notes',
    summary: 'Premium climate change guide with GHGs, IPCC signals, impacts, agreements, India action, climate finance, and PYQ decoder.',
    type: 'notes',
    subject: 'Environment',
    topic: 'Climate Change',
    difficulty: 'advanced',
    tags: ['upsc', 'environment', 'climate-change', 'paris-agreement', 'premium-notes'],
    facets: { stage: 'prelims-mains', paper: 'gs3' },
    syllabusNodes: ['environment', 'climate-change', 'international-agreements', 'disaster-risk'],
    isFeatured: true,
    contentInput: {
      title: 'UPSC Environment Premium Notes: Climate Change Complete Guide',
      exam: 'UPSC CSE Prelims and GS3 Mains',
      subject: 'Environment',
      whyItMatters: 'Climate change connects science, economy, agriculture, disasters, energy transition, diplomacy, and ethics of development.',
      examTip: 'Climate answers me science + impact + India action + global negotiation + way forward ka balance rakho.',
      syllabusMap: [
        ['Science', 'Greenhouse effect, GHGs, warming, feedback, mitigation, adaptation', 'Conceptual MCQs'],
        ['Global Governance', 'UNFCCC, Kyoto, Paris Agreement, COP outcomes, climate finance', 'Agreement-year matching'],
        ['India', 'NDCs, renewable energy, adaptation, disasters, climate justice', 'GS3 and essay examples'],
      ],
      examFacts: [
        ['UNFCCC', 'Adopted at Rio Earth Summit 1992 as climate framework', '1992 framework cue'],
        ['Paris Agreement', '2015 agreement based on NDCs and temperature goals', 'NDC cue'],
        ['Climate Finance', 'Finance and technology transfer are central developing-country concerns', 'Equity cue'],
      ],
      highYield: [
        ['Mitigation', 'Reducing emissions through energy transition, efficiency, forests, technology', 'Emission reduction angle'],
        ['Adaptation', 'Preparing systems for heat, floods, droughts, sea level, health, agriculture risk', 'Resilience angle'],
        ['Climate Justice', 'Equity, CBDR-RC, historical responsibility, development space', 'Negotiation keyword'],
      ],
      pyqDecoder: [
        ['Agreement matching', 'Year, objective, mechanism', 'Make climate treaty timeline'],
        ['India position', 'Equity and responsibility', 'Use climate justice vocabulary'],
        ['Impact question', 'Sector-wise vulnerability', 'Use agriculture, coast, Himalaya, health'],
      ],
      practiceQuestions: [
        ['Differentiate mitigation and adaptation.', 'Define both and give India examples.', 'Avoid treating them as same.'],
        ['Discuss climate justice.', 'Historical responsibility, equity, finance, technology transfer.', 'Balance with domestic action.'],
        ['Assess India climate vulnerability.', 'Himalaya, coasts, agriculture, water, health, disasters.', 'Add resilience measures.'],
      ],
      memoryHook: '**G-I-A-F**: GHGs, Impacts, Agreements, Finance.',
      commonMistakes: [
        'Climate change ko only environment issue mat banao; economy, health, agriculture, disaster angle add karo.',
        'Agreement years aur objectives mix mat karo.',
        'Latest COP outcomes aur official targets verify kiye bina exact current claims mat likho.',
      ],
      revisionDrill: [
        'Revise GHG table and sources.',
        'Make climate agreement timeline.',
        'Write mitigation vs adaptation table.',
        'Revise India climate actions.',
        'Make vulnerability map notes.',
        'Solve 30 environment MCQs.',
        'Write one GS3 answer on climate justice.',
      ],
      oneLiners: [
        'Climate change is a risk multiplier.',
        'Mitigation reduces emissions; adaptation reduces vulnerability.',
        'Climate justice is central to global negotiations.',
        'India needs growth, resilience and clean transition together.',
      ],
    },
  }),
  resource(workspaces.upsc, {
    title: 'UPSC Science Tech Premium Notes: AI and Emerging Technology',
    slug: 'upsc-science-tech-ai-emerging-technology-premium-notes',
    summary: 'Premium AI and emerging tech pack covering governance uses, IndiaAI, semiconductors, 5G, quantum, cybersecurity, drones, and PYQ decoder.',
    type: 'notes',
    subject: 'Science and Technology',
    topic: 'Artificial Intelligence and Emerging Technology',
    difficulty: 'advanced',
    tags: ['upsc', 'science-tech', 'ai', 'semiconductors', 'cybersecurity', 'premium-notes'],
    facets: { stage: 'mains', paper: 'gs3' },
    syllabusNodes: ['science-and-technology', 'artificial-intelligence', 'cybersecurity', 'emerging-technology'],
    isFeatured: true,
    contentInput: {
      title: 'UPSC Science Tech Premium Notes: AI and Emerging Technology',
      exam: 'UPSC CSE GS3 Mains and Prelims',
      subject: 'Science and Technology',
      whyItMatters: 'Emerging tech questions test applications, governance, ethics, security, economy, and regulation in one integrated theme.',
      examTip: 'Emerging tech answer me use-case + benefit + risk + governance framework + India example zaroor add karo.',
      syllabusMap: [
        ['AI Governance', 'Public service delivery, agriculture, courts, education, health, responsible AI', 'Application and ethics'],
        ['Digital Infrastructure', 'Semiconductors, 5G, cloud, GPUs, digital public infrastructure', 'Economy and capability'],
        ['Security', 'Cybersecurity, data protection, drones, deepfakes, quantum risk', 'GS3 internal security linkage'],
      ],
      examFacts: [
        ['IndiaAI Direction', 'Compute capacity, datasets, innovation ecosystem and responsible AI are key themes', 'AI mission cue'],
        ['Semiconductors', 'Strategic technology for electronics, defence, telecom, automobiles and AI hardware', 'Strategic supply chain cue'],
        ['Cybersecurity', 'CERT-In is central incident response institution in India', 'Institution cue'],
      ],
      highYield: [
        ['AI Benefits', 'Targeted welfare, decision support, language tools, diagnostics, crop advisory, fraud detection', 'Sector-wise examples'],
        ['AI Risks', 'Bias, opacity, privacy, deepfakes, job disruption, security misuse', 'Ethics and governance angle'],
        ['Emerging Tech Stack', 'AI, quantum, 5G, semiconductors, drones, blockchain, cybersecurity interact together', 'Integrated GS3 answer'],
      ],
      pyqDecoder: [
        ['Technology application', 'Benefits across sectors', 'Use table with examples'],
        ['Ethics/regulation', 'Risk and safeguards', 'Mention transparency, accountability, privacy'],
        ['Strategic autonomy', 'Semiconductors, cyber, quantum, space, defence', 'Use supply-chain angle'],
      ],
      practiceQuestions: [
        ['Discuss AI in governance.', 'Use service delivery, health, agriculture, justice, education, risks.', 'Add responsible AI safeguards.'],
        ['Why are semiconductors strategic?', 'Electronics, defence, telecom, AI, supply chains.', 'Mention domestic ecosystem challenges.'],
        ['Explain cybersecurity challenge in emerging tech era.', 'Attack surface, data, deepfakes, critical infrastructure, capacity.', 'Use layered response.'],
      ],
      memoryHook: '**U-B-R-G**: Use-cases, Benefits, Risks, Governance.',
      commonMistakes: [
        'AI ko magic solution mat likho; bias, privacy, accountability risks add karo.',
        'Emerging tech answer me India example nahi doge to answer generic lagega.',
        'Cybersecurity ko sirf hacking tak limit mat karo; critical infrastructure and data governance add karo.',
      ],
      revisionDrill: [
        'Make AI use-case sector table.',
        'Revise AI risks and safeguards.',
        'Prepare semiconductor strategic points.',
        'Revise cyber institutions and laws at high level.',
        'Make 5G, quantum, drone one-liners.',
        'Solve science-tech current MCQs.',
        'Write one GS3 answer on responsible AI.',
      ],
      oneLiners: [
        'AI needs innovation with accountability.',
        'Semiconductors are the hardware base of digital sovereignty.',
        'Cybersecurity is governance, technology and behaviour combined.',
        'Emerging tech policy must balance growth, rights and security.',
      ],
    },
  }),
];
