export type PremiumContentKind =
  | 'notes'
  | 'syllabus'
  | 'pyq-analysis'
  | 'study-plan'
  | 'mock-test'
  | 'answer-key'
  | 'current-affairs'
  | 'revision-pack';

export type PremiumPromptLanguage = 'hinglish' | 'english' | 'hindi';

export type PremiumExamFamily =
  | 'upsc'
  | 'state-psc'
  | 'ssc'
  | 'banking'
  | 'railway'
  | 'teaching'
  | 'engineering'
  | 'medical'
  | 'law'
  | 'management'
  | 'school'
  | 'other';

export type PremiumPromptTopic = {
  id: string;
  examFamily: PremiumExamFamily;
  exam: string;
  stage?: string;
  paper?: string;
  subject: string;
  topic: string;
  kind: PremiumContentKind;
  audience: string;
  level: 'foundation' | 'intermediate' | 'advanced';
  language: PremiumPromptLanguage;
  targetWords: [number, number];
  syllabusFocus: string[];
  mustCover: string[];
  tableIdeas: string[];
  pyqSignals: string[];
  practiceMix: string[];
  factsToVerify: string[];
  tags: string[];
};

export type PremiumPromptBuildOptions = {
  includeSystemPrompt?: boolean;
  language?: PremiumPromptLanguage;
  targetWords?: [number, number];
  currentAffairsWindow?: string;
  officialSourceHint?: string;
  extraInstructions?: string[];
};

export type PremiumPromptFilter = {
  examFamily?: PremiumExamFamily;
  exam?: string;
  subject?: string;
  kind?: PremiumContentKind;
};

export const PREMIUM_AI_CONTENT_SYSTEM_PROMPT = `
You are Sarathi Content Studio, Study Hub's premium Indian exam content architect.

Mission:
- Create original, student-ready study content for Indian exams.
- Make every output feel like a polished premium coaching handout: concise, table-first, exam-angle-first, and revision-ready.
- Serve Hindi/Hinglish learners without reducing academic precision.

Non-negotiable quality rules:
- Do not copy coaching notes, official papers, copyrighted books, or full PYQ wording.
- Do not invent exact PYQ text, statistics, current rules, cutoffs, dates, vacancies, or notifications.
- If a fact can change, mark it as "verify from latest official source" and give the official source type to check.
- Prefer stable facts, official terminology, exam patterns, common traps, and examiner intent.
- Use short quotes only when unavoidable; otherwise paraphrase.
- Keep examples original.

Output style:
- Use clean Markdown only.
- Use H2/H3 headings, tables, bullets, checklists, and short boxed tips.
- Use premium Hinglish by default: simple Hindi sentence flow, exam terms in English.
- Keep paragraphs short. Avoid filler, hype, and motivational padding.
- Bold only truly important terms, formulas, articles, keywords, and traps.

Required student-facing structure:
1. Premium Snapshot
2. Syllabus Map
3. Concept Core
4. Exam Fact Bank
5. High-Yield Tables
6. Timeline / Flowchart / Comparison, where relevant
7. PYQ Decoder, using themes and years only when reliable
8. Prelims / Objective Trap Scanner
9. Mains / Descriptive / Problem-Solving Framework, where relevant
10. Micro Practice Set with answer direction
11. Memory Hook
12. Common Mistakes
13. 7-Day Revision Drill
14. Last 24-Hour Revision Sheet
15. Source And Verification Notes
16. Premium Quality Checklist

Final quality bar:
- A serious aspirant should be able to revise the topic from the output alone.
- A teacher should be able to use it as a class handout.
- An admin should be able to publish it without cleaning vague AI language.
`.trim();

export const PREMIUM_OUTPUT_CONTRACT = [
  'Premium Snapshot',
  'Syllabus Map',
  'Concept Core',
  'Exam Fact Bank',
  'High-Yield Tables',
  'Timeline / Flowchart / Comparison',
  'PYQ Decoder',
  'Trap Scanner',
  'Practice Framework',
  'Micro Practice Set',
  'Memory Hook',
  'Common Mistakes',
  '7-Day Revision Drill',
  'Last 24-Hour Revision Sheet',
  'Source And Verification Notes',
  'Premium Quality Checklist',
] as const;

const defaultMustCover = [
  'definition and exam context',
  'syllabus mapping',
  'core concepts in plain language',
  'high-yield facts in tables',
  'PYQ themes and examiner intent',
  'traps and common mistakes',
  'practice questions with answer direction',
  'revision checklist',
];

const defaultTableIdeas = [
  'concept vs exam use',
  'fact bank',
  'comparison table',
  'PYQ signal table',
  'trap scanner table',
  'revision schedule',
];

const defaultPracticeMix = [
  '5 objective questions with answer direction',
  '3 short-answer prompts',
  '1 exam-style model framework',
  '1 flashcard drill',
];

const normalize = (value: string) => value.trim().toLowerCase();

const list = (items: string[]) => items.map((item) => `- ${item}`).join('\n');

const csv = (items: string[]) => items.join(', ');

const byId = (id: string) => PREMIUM_PROMPT_CATALOG.find((topic) => topic.id === id);

type UpscExpansionTopicSeed = {
  id: string;
  subject: string;
  topic: string;
  paper: string;
  stage?: string;
  level?: PremiumPromptTopic['level'];
  targetWords?: [number, number];
  syllabusFocus: string[];
  mustCover: string[];
  tableIdeas?: string[];
  pyqSignals: string[];
  practiceMix?: string[];
  factsToVerify?: string[];
  tags: string[];
};

const upscExpansionTopic = (seed: UpscExpansionTopicSeed): PremiumPromptTopic => ({
  id: seed.id,
  examFamily: 'upsc',
  exam: 'UPSC CSE',
  stage: seed.stage || 'Prelims + Mains',
  paper: seed.paper,
  subject: seed.subject,
  topic: seed.topic,
  kind: 'notes',
  audience: 'UPSC and State PSC aspirants',
  level: seed.level || 'advanced',
  language: 'hinglish',
  targetWords: seed.targetWords || [1400, 2000],
  syllabusFocus: seed.syllabusFocus,
  mustCover: seed.mustCover,
  tableIdeas: seed.tableIdeas || [
    'overview-to-exam-use table',
    'fact bank table',
    'comparison or timeline table',
    'PYQ signal table',
    'trap scanner table',
  ],
  pyqSignals: seed.pyqSignals,
  practiceMix: seed.practiceMix || [
    '10 prelims/objective statement drills',
    '3 mains answer frameworks',
    '1 one-page revision drill',
  ],
  factsToVerify: seed.factsToVerify || ['latest official/current facts if added'],
  tags: ['upsc', 'state-psc', ...seed.tags],
});

const UPSC_PREMIUM_EXPANSION_TOPICS: PremiumPromptTopic[] = [
  upscExpansionTopic({
    id: 'upsc-history-post-mauryan-period',
    subject: 'Ancient History',
    topic: 'Post-Mauryan Period',
    paper: 'GS1',
    syllabusFocus: ['post-Mauryan polities', 'trade', 'religion', 'art schools', 'Sangam age'],
    mustCover: [
      'Sungas, Kanvas, Satavahanas, Indo-Greeks and Kushanas comparison',
      'Kanishka, Mahayana Buddhism and Silk Route link',
      'Sangam literature, society, economy and trade',
      'Gandhara, Mathura and Amaravati art schools',
      'map cues, coinage, trade route and Buddhism spread traps',
    ],
    tableIdeas: ['dynasty-contribution table', 'art school comparison table', 'trade route table', 'Sangam evidence table'],
    pyqSignals: ['art school features', 'foreign dynasties contribution', 'Sangam evidence', 'Buddhist sects'],
    tags: ['history', 'ancient-india', 'post-mauryan'],
  }),
  upscExpansionTopic({
    id: 'upsc-history-gupta-empire-golden-age',
    subject: 'Ancient History',
    topic: 'Gupta Empire and Golden Age Debate',
    paper: 'GS1',
    syllabusFocus: ['Gupta polity', 'literature', 'science', 'art', 'society'],
    mustCover: [
      'Gupta rulers timeline and major achievements',
      'administration, economy, guilds and land grants',
      'Kalidasa, Aryabhata, Varahamihira and scientific achievements',
      'temple architecture, sculptures and cultural features',
      'critical analysis of Golden Age with social limitations',
    ],
    tableIdeas: ['ruler-achievement table', 'scientist-field-achievement table', 'golden age argument table'],
    pyqSignals: ['science and literature matching', 'temple architecture', 'social condition analysis', 'golden age critique'],
    tags: ['history', 'ancient-india', 'gupta'],
  }),
  upscExpansionTopic({
    id: 'upsc-history-bhakti-sufi-movements',
    subject: 'Medieval History',
    topic: 'Bhakti and Sufi Movements',
    paper: 'GS1',
    syllabusFocus: ['religious reform', 'society', 'culture', 'syncretism'],
    mustCover: [
      'causes and features of Bhakti movement',
      'major Bhakti saints by region, language and teaching',
      'Sufi silsilas, founders, centers and practices',
      'impact on caste, women, language and Hindu-Muslim interaction',
      'Bhakti vs Sufi comparison and limitations',
    ],
    tableIdeas: ['saint-region-teaching table', 'silsila-founder-feature table', 'Bhakti vs Sufi comparison'],
    pyqSignals: ['saint matching', 'regional language link', 'social impact', 'comparison questions'],
    tags: ['history', 'medieval-india', 'bhakti', 'sufi'],
  }),
  upscExpansionTopic({
    id: 'upsc-history-delhi-sultanate',
    subject: 'Medieval History',
    topic: 'Delhi Sultanate',
    paper: 'GS1',
    syllabusFocus: ['Sultanate dynasties', 'administration', 'economy', 'architecture'],
    mustCover: [
      'five dynasties timeline with rulers and events',
      'Iltutmish, Balban, Alauddin Khilji and Muhammad bin Tughlaq',
      'market reforms, iqta system and administrative offices',
      'architecture features and important monuments',
      'decline factors and regional kingdom rise',
    ],
    tableIdeas: ['dynasty timeline table', 'reform-impact table', 'office-function table', 'monument-feature table'],
    pyqSignals: ['dynasty chronology', 'market reforms', 'iqta administration', 'architecture features'],
    tags: ['history', 'medieval-india', 'delhi-sultanate'],
  }),
  upscExpansionTopic({
    id: 'upsc-history-mughal-administration-culture',
    subject: 'Medieval History',
    topic: 'Mughal Administration and Culture',
    paper: 'GS1',
    syllabusFocus: ['Mughal polity', 'revenue', 'mansabdari', 'culture', 'decline'],
    mustCover: [
      'Akbar reforms, mansabdari, zabti/dahsala and religious policy',
      'central, provincial, district and village administration',
      'painting schools, architecture features and major buildings',
      'economy, agriculture, trade and textiles',
      'Aurangzeb policies and decline debate',
    ],
    tableIdeas: ['administration level table', 'revenue system table', 'architecture building table', 'decline debate table'],
    pyqSignals: ['Akbar reforms', 'mansabdari terms', 'art and architecture', 'decline analysis'],
    tags: ['history', 'medieval-india', 'mughal'],
  }),
  upscExpansionTopic({
    id: 'upsc-history-maratha-empire',
    subject: 'Medieval History',
    topic: 'Maratha Empire',
    paper: 'GS1',
    syllabusFocus: ['Shivaji', 'Maratha polity', 'Peshwas', 'Anglo-Maratha wars'],
    mustCover: [
      'Shivaji military, navy, forts and guerrilla warfare',
      'Ashtapradhan, chauth, sardeshmukhi and administration',
      'Peshwa rise and confederacy structure',
      'three battles of Panipat and Anglo-Maratha wars',
      'why Marathas failed to unite India',
    ],
    tableIdeas: ['Ashtapradhan table', 'Panipat comparison table', 'Anglo-Maratha wars table', 'failure reason table'],
    pyqSignals: ['Shivaji administration', 'Panipat chronology', 'Maratha confederacy', 'decline reasons'],
    tags: ['history', 'medieval-india', 'maratha'],
  }),
  upscExpansionTopic({
    id: 'upsc-modern-history-indian-national-movement-1885-1905',
    subject: 'Modern History',
    topic: 'Indian National Movement Phase 1: 1885-1905',
    paper: 'GS1',
    syllabusFocus: ['moderates', 'early nationalism', 'economic critique', 'Congress foundation'],
    mustCover: [
      'formation of Indian National Congress and early leadership',
      'moderate methods, demands and achievements',
      'economic critique: drain theory, civil services, representation',
      'limitations of moderate politics',
      'transition toward extremist phase',
    ],
    tableIdeas: ['leader-contribution table', 'demand-method-impact table', 'moderate vs extremist bridge table'],
    pyqSignals: ['moderate achievements', 'economic nationalism', 'INC foundation', 'limitations analysis'],
    tags: ['modern-history', 'national-movement'],
  }),
  upscExpansionTopic({
    id: 'upsc-modern-history-gandhi-mass-movements',
    subject: 'Modern History',
    topic: 'Gandhi and Mass Movements',
    paper: 'GS1',
    syllabusFocus: ['Gandhian movements', 'mass politics', 'satyagraha', 'national movement'],
    mustCover: [
      'Champaran, Ahmedabad, Kheda and early experiments',
      'Non-Cooperation, Civil Disobedience and Quit India movements',
      'Gandhian techniques: satyagraha, ahimsa, constructive programme',
      'movement comparison by cause, method, spread and withdrawal',
      'role of women, peasants, workers and youth',
    ],
    tableIdeas: ['movement comparison table', 'Gandhian method table', 'social group participation table'],
    pyqSignals: ['movement chronology', 'withdrawal reasons', 'mass participation', 'Gandhian strategy'],
    tags: ['modern-history', 'gandhi', 'national-movement'],
  }),
  upscExpansionTopic({
    id: 'upsc-modern-history-revolutionary-nationalism',
    subject: 'Modern History',
    topic: 'Revolutionary Nationalism',
    paper: 'GS1',
    syllabusFocus: ['revolutionary groups', 'leaders', 'ideology', 'regional movements'],
    mustCover: [
      'Bengal, Maharashtra, Punjab and overseas revolutionary activity',
      'Anushilan, Jugantar, Ghadar, HSRA and key personalities',
      'Bhagat Singh, Chandrashekhar Azad and ideological shift',
      'revolutionary methods, publications and trials',
      'impact and limitations of revolutionary nationalism',
    ],
    tableIdeas: ['organization-region-leader table', 'event-impact table', 'ideology shift table'],
    pyqSignals: ['organization matching', 'leader-event linkage', 'ideological contribution', 'impact analysis'],
    tags: ['modern-history', 'revolutionary-nationalism'],
  }),
  upscExpansionTopic({
    id: 'upsc-modern-history-constitutional-development',
    subject: 'Modern History',
    topic: 'Constitutional Development in India',
    paper: 'GS1 + GS2',
    syllabusFocus: ['colonial acts', 'governance reforms', 'constitutional evolution'],
    mustCover: [
      'Regulating Act 1773 to Government of India Act 1935 timeline',
      'Pitt India Act, Charter Acts, Councils Acts, Morley-Minto, Montagu-Chelmsford',
      'dyarchy, provincial autonomy, federation and separate electorate',
      'features borrowed into Indian Constitution',
      'prelims chronology traps and mains evolution framework',
    ],
    tableIdeas: ['act-feature-impact table', 'chronology table', 'colonial feature-to-Constitution link table'],
    pyqSignals: ['act-feature matching', 'dyarchy and autonomy', 'separate electorate', 'constitutional continuity'],
    tags: ['modern-history', 'constitutional-development', 'polity'],
  }),
  upscExpansionTopic({
    id: 'upsc-polity-constitution-making-features',
    subject: 'Indian Polity',
    topic: 'Constitution Making and Features',
    paper: 'GS2',
    syllabusFocus: ['Constituent Assembly', 'constitutional features', 'sources', 'preamble'],
    mustCover: [
      'Constituent Assembly formation, committees and key members',
      'timeline from 1946 to 1950',
      'major sources of Indian Constitution',
      'salient features and basic structure linkage',
      'Preamble values and amendment history',
    ],
    tableIdeas: ['committee-chairperson table', 'source-feature table', 'feature-significance table'],
    pyqSignals: ['source matching', 'committee roles', 'Preamble terms', 'salient feature analysis'],
    tags: ['polity', 'constitution'],
  }),
  upscExpansionTopic({
    id: 'upsc-polity-president-prime-minister',
    subject: 'Indian Polity',
    topic: 'President and Prime Minister',
    paper: 'GS2',
    syllabusFocus: ['Union executive', 'President', 'Prime Minister', 'Council of Ministers'],
    mustCover: [
      'election, qualification, tenure and impeachment of President',
      'President powers: executive, legislative, financial, judicial, emergency',
      'Prime Minister appointment, powers and role in parliamentary system',
      'Council of Ministers, collective responsibility and cabinet committees',
      'President vs Governor and nominal vs real executive traps',
    ],
    tableIdeas: ['power-type table', 'President vs PM comparison', 'President vs Governor comparison', 'article table'],
    pyqSignals: ['article-power matching', 'discretion question', 'collective responsibility', 'emergency powers'],
    tags: ['polity', 'executive'],
  }),
  upscExpansionTopic({
    id: 'upsc-polity-federalism-centre-state-relations',
    subject: 'Indian Polity',
    topic: 'Federalism and Centre-State Relations',
    paper: 'GS2',
    syllabusFocus: ['federalism', 'legislative relations', 'administrative relations', 'financial relations'],
    mustCover: [
      'federal and unitary features of Indian Constitution',
      'Union, State and Concurrent List with Article 246 cue',
      'Finance Commission, GST Council, Inter-State Council and Zonal Councils',
      'Article 356, Governor, all-India services and dispute mechanisms',
      'cooperative vs competitive federalism with current examples caveated',
    ],
    tableIdeas: ['relation type table', 'institution-role table', 'cooperative vs competitive table'],
    pyqSignals: ['list distribution', 'fiscal federalism', 'Article 356 misuse', 'cooperative federalism'],
    tags: ['polity', 'federalism'],
  }),
  upscExpansionTopic({
    id: 'upsc-polity-panchayati-raj-urban-local-bodies',
    subject: 'Indian Polity',
    topic: 'Panchayati Raj and Urban Local Bodies',
    paper: 'GS2',
    syllabusFocus: ['local government', '73rd Amendment', '74th Amendment', 'decentralization'],
    mustCover: [
      '73rd and 74th Amendment features',
      'Gram Sabha, Panchayat levels, municipalities and ward committees',
      '11th and 12th Schedule themes',
      'State Finance Commission, State Election Commission and reservation',
      'challenges: funds, functions, functionaries and urban governance',
    ],
    tableIdeas: ['73rd vs 74th table', 'schedule subject table', 'institution-function table', 'challenge-reform table'],
    pyqSignals: ['schedule matching', 'Gram Sabha role', 'devolution challenges', 'urban local body reform'],
    tags: ['polity', 'local-government'],
  }),
  upscExpansionTopic({
    id: 'upsc-polity-constitutional-bodies',
    subject: 'Indian Polity',
    topic: 'Constitutional Bodies',
    paper: 'GS2',
    syllabusFocus: ['Election Commission', 'UPSC', 'CAG', 'Finance Commission', 'NCSC/NCST'],
    mustCover: [
      'constitutional article, composition, appointment and tenure basics',
      'ECI, UPSC, CAG, Finance Commission and special commissions',
      'independence safeguards and removal process',
      'functions and accountability value',
      'constitutional vs statutory body trap scanner',
    ],
    tableIdeas: ['body-article-function table', 'removal-safeguard table', 'constitutional vs statutory comparison'],
    pyqSignals: ['article matching', 'independence safeguards', 'CAG/ECI powers', 'body classification'],
    tags: ['polity', 'constitutional-bodies'],
  }),
  upscExpansionTopic({
    id: 'upsc-polity-judiciary-supreme-court-high-courts',
    subject: 'Indian Polity',
    topic: 'Judiciary: Supreme Court and High Courts',
    paper: 'GS2',
    syllabusFocus: ['judiciary', 'jurisdiction', 'judicial review', 'independence'],
    mustCover: [
      'Supreme Court and High Court composition, appointment and removal',
      'original, appellate, advisory and writ jurisdiction',
      'judicial review, PIL, basic structure and judicial activism',
      'tribunals, pendency and judicial reforms',
      'SC vs HC jurisdiction comparison',
    ],
    tableIdeas: ['jurisdiction table', 'SC vs HC table', 'case-principle table', 'reform challenge table'],
    pyqSignals: ['writ jurisdiction', 'basic structure', 'judicial review', 'appointment debate'],
    tags: ['polity', 'judiciary'],
  }),
  upscExpansionTopic({
    id: 'upsc-geography-physical-features-of-india',
    subject: 'Geography',
    topic: 'Physical Features of India',
    paper: 'GS1',
    syllabusFocus: ['Himalayas', 'Northern Plains', 'Peninsular Plateau', 'coasts', 'islands', 'desert'],
    mustCover: [
      'major physiographic divisions and formation',
      'Himalayan ranges and passes',
      'plateau, ghats, plains, coastal regions and islands',
      'resource, climate and disaster linkage',
      'map-based prelims cues',
    ],
    tableIdeas: ['physiographic division table', 'range-pass table', 'feature-significance table'],
    pyqSignals: ['map matching', 'range/location', 'resource linkage', 'formation process'],
    tags: ['geography', 'physical-geography', 'india'],
  }),
  upscExpansionTopic({
    id: 'upsc-geography-indian-monsoon',
    subject: 'Geography',
    topic: 'Indian Monsoon',
    paper: 'GS1',
    syllabusFocus: ['monsoon mechanism', 'rainfall distribution', 'ENSO/IOD', 'agriculture'],
    mustCover: [
      'thermal, dynamic and jet stream theories',
      'onset, advance, break and retreat of monsoon',
      'Western Ghats, Himalayas and rain shadow effects',
      'ENSO, IOD, MJO and climate variability',
      'monsoon impact on agriculture, floods, drought and economy',
    ],
    tableIdeas: ['factor-impact table', 'rainfall distribution table', 'ENSO/IOD comparison', 'agriculture impact table'],
    pyqSignals: ['mechanism explanation', 'rainfall pattern', 'ENSO/IOD linkage', 'map cues'],
    tags: ['geography', 'monsoon', 'climatology'],
  }),
  upscExpansionTopic({
    id: 'upsc-geography-rivers-of-india',
    subject: 'Geography',
    topic: 'Rivers of India',
    paper: 'GS1',
    syllabusFocus: ['drainage systems', 'Himalayan rivers', 'peninsular rivers', 'water resources'],
    mustCover: [
      'Indus, Ganga, Brahmaputra and Peninsular river systems',
      'tributaries, origin, flow direction and delta/estuary features',
      'river interlinking, dams and water disputes',
      'floods, erosion, sediment and groundwater linkage',
      'map-based river-tributary traps',
    ],
    tableIdeas: ['river-origin-tributary table', 'Himalayan vs Peninsular comparison', 'dam-river-state table'],
    pyqSignals: ['tributary matching', 'east/west flowing rivers', 'delta/estuary', 'water dispute geography'],
    tags: ['geography', 'rivers', 'map'],
  }),
  upscExpansionTopic({
    id: 'upsc-geography-agriculture-in-india',
    subject: 'Geography',
    topic: 'Agriculture in India',
    paper: 'GS1 + GS3',
    syllabusFocus: ['cropping pattern', 'irrigation', 'soils', 'agro-climatic zones', 'food security'],
    mustCover: [
      'cropping seasons, crop distribution and agro-climatic conditions',
      'Green Revolution, irrigation, MSP and procurement basics',
      'soil-crop-climate linkage',
      'challenges: fragmentation, water stress, climate risk and markets',
      'sustainable agriculture and food security framework',
    ],
    tableIdeas: ['crop-climate-soil table', 'season-crop table', 'challenge-solution table'],
    pyqSignals: ['crop distribution', 'climate-soil link', 'food security', 'sustainable agriculture'],
    factsToVerify: ['latest production, MSP and scheme data if used'],
    tags: ['geography', 'agriculture', 'economy'],
  }),
  upscExpansionTopic({
    id: 'upsc-geography-world-physical-geography',
    subject: 'Geography',
    topic: 'World Physical Geography',
    paper: 'GS1',
    syllabusFocus: ['mountains', 'plate tectonics', 'ocean currents', 'climate zones', 'landforms'],
    mustCover: [
      'plate boundaries, earthquakes, volcanoes and fold mountains',
      'major landforms and erosional/depositional processes',
      'ocean currents, temperature, salinity and climate impact',
      'major climatic regions and biomes',
      'map-based world location cues',
    ],
    tableIdeas: ['plate boundary table', 'current-warm/cold-impact table', 'landform-process table', 'climate-region table'],
    pyqSignals: ['tectonic process', 'ocean current impact', 'landform identification', 'world map matching'],
    tags: ['geography', 'world-geography', 'physical-geography'],
  }),
  upscExpansionTopic({
    id: 'upsc-economy-basic-concepts',
    subject: 'Indian Economy',
    topic: 'Indian Economy Basic Concepts',
    paper: 'GS3',
    syllabusFocus: ['GDP', 'growth', 'inflation', 'fiscal policy', 'monetary policy', 'external sector'],
    mustCover: [
      'GDP, GNP, NNP, real vs nominal and base year basics',
      'growth, development, poverty, inequality and employment',
      'fiscal deficit, revenue deficit and public debt',
      'monetary policy, repo, CRR, SLR and money supply',
      'BoP, exchange rate and external sector basics',
    ],
    tableIdeas: ['term-definition-use table', 'fiscal vs monetary table', 'indicator-source table'],
    pyqSignals: ['definition precision', 'indicator interpretation', 'policy tool matching', 'economy current linkage'],
    factsToVerify: ['latest macro data and base year details if used'],
    tags: ['economy', 'basic-concepts'],
  }),
  upscExpansionTopic({
    id: 'upsc-economy-inflation',
    subject: 'Indian Economy',
    topic: 'Inflation: Types, Causes and Control',
    paper: 'GS3',
    syllabusFocus: ['inflation', 'CPI/WPI', 'monetary policy', 'food inflation'],
    mustCover: [
      'CPI, WPI, core inflation and headline inflation',
      'demand-pull, cost-push, structural and imported inflation',
      'RBI monetary policy tools and government supply-side measures',
      'inflation impact on poor, savings, investment and growth',
      'Phillips curve and stagflation basics',
    ],
    tableIdeas: ['inflation type table', 'CPI vs WPI comparison', 'tool-impact table', 'effect-on-stakeholder table'],
    pyqSignals: ['CPI/WPI difference', 'RBI tools', 'food inflation causes', 'inflation-growth tradeoff'],
    factsToVerify: ['latest CPI/WPI and RBI target status if mentioned'],
    tags: ['economy', 'inflation'],
  }),
  upscExpansionTopic({
    id: 'upsc-economy-banking-system-india',
    subject: 'Indian Economy',
    topic: 'Banking System in India',
    paper: 'GS3',
    syllabusFocus: ['RBI', 'commercial banks', 'NPAs', 'financial inclusion', 'regulation'],
    mustCover: [
      'RBI functions and monetary policy role',
      'commercial banks, cooperative banks, payment banks and small finance banks',
      'NPAs, provisioning, IBC and bank recapitalization basics',
      'financial inclusion, digital payments and priority sector lending',
      'banking reforms and risks',
    ],
    tableIdeas: ['bank type table', 'RBI tool table', 'NPA-resolution table', 'financial inclusion table'],
    pyqSignals: ['RBI function matching', 'NPA causes', 'financial inclusion', 'digital banking risk'],
    factsToVerify: ['latest RBI rules, NPA data and policy changes if used'],
    tags: ['economy', 'banking'],
  }),
  upscExpansionTopic({
    id: 'upsc-economy-government-budget',
    subject: 'Indian Economy',
    topic: 'Government Budget',
    paper: 'GS3',
    syllabusFocus: ['budget', 'receipts', 'expenditure', 'deficits', 'FRBM'],
    mustCover: [
      'budget structure: revenue/capital receipts and expenditure',
      'fiscal deficit, revenue deficit, primary deficit and effective revenue deficit',
      'FRBM, fiscal consolidation and debt sustainability',
      'tax and non-tax revenue basics',
      'budget as growth, welfare and stabilization tool',
    ],
    tableIdeas: ['receipt-expenditure table', 'deficit formula table', 'FRBM concept table', 'budget impact table'],
    pyqSignals: ['deficit formula', 'fiscal consolidation', 'capital expenditure', 'budget terminology'],
    factsToVerify: ['latest Budget and Economic Survey numbers if used'],
    tags: ['economy', 'budget'],
  }),
  upscExpansionTopic({
    id: 'upsc-economy-agriculture-perspective',
    subject: 'Indian Economy',
    topic: 'Agriculture Economy',
    paper: 'GS3',
    syllabusFocus: ['agriculture economics', 'MSP', 'markets', 'subsidies', 'food security'],
    mustCover: [
      'agriculture role in GDP, employment and food security with verification caveat',
      'MSP, procurement, PDS and buffer stock basics',
      'subsidies: fertilizer, power, irrigation and credit',
      'market reforms, e-NAM, FPOs, storage and value chains',
      'climate-smart and sustainable agriculture',
    ],
    tableIdeas: ['policy-objective-challenge table', 'MSP/PDS/procurement flow table', 'reform-impact table'],
    pyqSignals: ['MSP debate', 'subsidy rationalization', 'market reform', 'food security'],
    factsToVerify: ['latest GDP share, MSP, foodgrain and budget data'],
    tags: ['economy', 'agriculture'],
  }),
  upscExpansionTopic({
    id: 'upsc-economy-economic-planning-india',
    subject: 'Indian Economy',
    topic: 'Economic Planning in India',
    paper: 'GS3',
    syllabusFocus: ['planning history', 'Five-Year Plans', 'NITI Aayog', 'reforms'],
    mustCover: [
      'planning era and Five-Year Plan themes',
      'Planning Commission vs NITI Aayog',
      'mixed economy, public sector and liberalization',
      'indicative planning, cooperative federalism and outcome monitoring',
      'planning failures and learnings',
    ],
    tableIdeas: ['plan-theme table', 'Planning Commission vs NITI table', 'era-feature table'],
    pyqSignals: ['plan chronology', 'institution comparison', 'planning relevance', 'reform transition'],
    tags: ['economy', 'planning'],
  }),
  upscExpansionTopic({
    id: 'upsc-environment-ecosystem-complete',
    subject: 'Environment',
    topic: 'Ecosystem',
    paper: 'GS3',
    syllabusFocus: ['ecosystem structure', 'food chain', 'energy flow', 'biogeochemical cycles'],
    mustCover: [
      'ecosystem components, productivity and trophic levels',
      'food chain, food web, ecological pyramid and energy flow',
      'carbon, nitrogen, phosphorus and water cycles',
      'ecological succession, niche and habitat',
      'prelims traps in species interactions and cycles',
    ],
    tableIdeas: ['term-definition-example table', 'cycle-process table', 'interaction table', 'trap table'],
    pyqSignals: ['cycle matching', 'energy flow', 'ecological pyramid', 'species interaction'],
    tags: ['environment', 'ecosystem'],
  }),
  upscExpansionTopic({
    id: 'upsc-environment-biodiversity-conservation',
    subject: 'Environment',
    topic: 'Biodiversity and Conservation',
    paper: 'GS3',
    syllabusFocus: ['biodiversity', 'protected areas', 'IUCN', 'conservation strategies'],
    mustCover: [
      'levels of biodiversity and India as mega-diverse country',
      'in-situ vs ex-situ conservation',
      'national parks, wildlife sanctuaries, biosphere reserves and conservation reserves',
      'IUCN categories, CITES, CBD and Ramsar basics',
      'threats, invasive species and community conservation',
    ],
    tableIdeas: ['protected area comparison', 'convention-objective table', 'species-threat table', 'conservation strategy table'],
    pyqSignals: ['protected area features', 'convention matching', 'IUCN terms', 'species-location traps'],
    factsToVerify: ['latest protected area, Ramsar and species status data if included'],
    tags: ['environment', 'biodiversity', 'conservation'],
  }),
  upscExpansionTopic({
    id: 'upsc-environment-climate-change-complete-guide',
    subject: 'Environment',
    topic: 'Climate Change Complete Guide',
    paper: 'GS3',
    syllabusFocus: ['climate science', 'UNFCCC', 'Paris Agreement', 'India climate policy'],
    mustCover: [
      'greenhouse effect, GHGs and global warming potential basics',
      'mitigation vs adaptation and loss and damage',
      'UNFCCC, Kyoto Protocol, Paris Agreement and COP process',
      'India NDC, climate justice and energy transition',
      'impact on agriculture, water, health, disasters and biodiversity',
    ],
    tableIdeas: ['GHG-source-impact table', 'agreement-feature table', 'mitigation vs adaptation table'],
    pyqSignals: ['agreement matching', 'climate justice', 'NDC and net zero', 'impact analysis'],
    factsToVerify: ['latest COP decisions, NDC status and climate data'],
    tags: ['environment', 'climate-change'],
  }),
  upscExpansionTopic({
    id: 'upsc-environment-laws-policies-india',
    subject: 'Environment',
    topic: 'Environmental Laws and Policies in India',
    paper: 'GS3 + GS2',
    syllabusFocus: ['environment law', 'constitutional provisions', 'institutions', 'jurisprudence'],
    mustCover: [
      'Article 48A, Article 51A(g), Article 21 environmental interpretation',
      'Environment Protection Act, Air Act, Water Act, Forest Conservation Act, Wildlife Protection Act',
      'NGT, CPCB, SPCB and EIA framework',
      'important doctrines: public trust, polluter pays, precautionary principle',
      'environmental governance challenges and reform framework',
    ],
    tableIdeas: ['law-year-objective table', 'institution-function table', 'doctrine-case signal table'],
    pyqSignals: ['constitutional provision', 'law-objective matching', 'EIA/NGT role', 'jurisprudence evolution'],
    factsToVerify: ['latest amendments, rules and judgments if mentioned'],
    tags: ['environment', 'laws', 'policies'],
  }),
  upscExpansionTopic({
    id: 'upsc-science-tech-space-technology-india',
    subject: 'Science and Technology',
    topic: 'Space Technology in India',
    paper: 'GS3',
    syllabusFocus: ['ISRO', 'space missions', 'applications', 'space economy', 'security'],
    mustCover: [
      'ISRO evolution and major mission types',
      'launch vehicles, satellites, navigation and remote sensing',
      'Chandrayaan, Mangalyaan, Aditya-L1, Gaganyaan and private sector cues',
      'applications in agriculture, disaster management, communication and security',
      'space policy, commercialization and space debris challenges',
    ],
    tableIdeas: ['mission-objective-outcome table', 'satellite-application table', 'challenge-way forward table'],
    pyqSignals: ['mission matching', 'application in development', 'space economy', 'strategic autonomy'],
    factsToVerify: ['latest mission status and policy details from ISRO/IN-SPACe'],
    tags: ['science-tech', 'space', 'isro'],
  }),
  upscExpansionTopic({
    id: 'upsc-science-tech-nuclear-technology-india',
    subject: 'Science and Technology',
    topic: 'Nuclear Technology in India',
    paper: 'GS3',
    syllabusFocus: ['nuclear energy', 'three-stage programme', 'safety', 'applications'],
    mustCover: [
      'basic nuclear fission/fusion concepts for exams',
      'India three-stage nuclear programme and thorium importance',
      'nuclear power plants, safety and waste management',
      'civil nuclear cooperation and strategic autonomy',
      'applications in medicine, agriculture and industry',
    ],
    tableIdeas: ['stage-fuel-output table', 'application table', 'risk-safeguard table'],
    pyqSignals: ['three-stage programme', 'thorium', 'nuclear safety', 'energy security'],
    factsToVerify: ['latest reactor capacity and project status if used'],
    tags: ['science-tech', 'nuclear-technology'],
  }),
  upscExpansionTopic({
    id: 'upsc-science-tech-defence-technology-made-in-india',
    subject: 'Science and Technology',
    topic: 'Defence Technology and Make in India',
    paper: 'GS3',
    syllabusFocus: ['defence technology', 'indigenization', 'DRDO', 'strategic capability'],
    mustCover: [
      'missiles, drones, cyber, electronic warfare and space defence basics',
      'DRDO, DPSUs, private sector and defence corridors',
      'Make in India, Atmanirbhar Bharat and procurement reforms',
      'dual-use technology and strategic autonomy',
      'challenges: import dependence, R&D, testing and production scale',
    ],
    tableIdeas: ['technology-application table', 'institution-role table', 'challenge-reform table'],
    pyqSignals: ['indigenization', 'strategic autonomy', 'dual-use technology', 'defence corridor'],
    factsToVerify: ['latest defence acquisitions, policy and export data if used'],
    tags: ['science-tech', 'defence', 'made-in-india'],
  }),
  upscExpansionTopic({
    id: 'upsc-science-tech-biotechnology-health-technology',
    subject: 'Science and Technology',
    topic: 'Biotechnology and Health Technology',
    paper: 'GS3',
    syllabusFocus: ['biotech', 'genomics', 'vaccines', 'health technology', 'ethics'],
    mustCover: [
      'DNA, gene editing, CRISPR, genomics and synthetic biology basics',
      'vaccines, diagnostics, biopharma and public health applications',
      'GM crops, biofortification and agriculture biotech',
      'ethical concerns: privacy, consent, biosafety and equity',
      'India biotech ecosystem and regulation caveats',
    ],
    tableIdeas: ['technology-use-risk table', 'application-sector table', 'ethics-safeguard table'],
    pyqSignals: ['CRISPR basics', 'vaccine technology', 'GM crops', 'bioethics'],
    factsToVerify: ['latest approvals, guidelines and mission details if mentioned'],
    tags: ['science-tech', 'biotechnology', 'health'],
  }),
  upscExpansionTopic({
    id: 'upsc-science-tech-ai-emerging-technology',
    subject: 'Science and Technology',
    topic: 'Artificial Intelligence and Emerging Technology',
    paper: 'GS3',
    syllabusFocus: ['AI', 'semiconductors', '5G', 'quantum', 'cybersecurity', 'drones', 'blockchain'],
    mustCover: [
      'AI concepts, public service use cases, risks and responsible AI',
      'semiconductors and digital sovereignty',
      '5G, quantum, cybersecurity, blockchain and drones',
      'development applications and governance challenges',
      'India initiatives with official verification notes',
    ],
    tableIdeas: ['technology-use-risk-governance table', 'India initiative table', 'ethics safeguard table'],
    pyqSignals: ['technology-development linkage', 'AI ethics', 'cybersecurity', 'strategic technology'],
    factsToVerify: ['latest IndiaAI, semiconductor, quantum and data protection updates'],
    tags: ['science-tech', 'ai', 'emerging-technology'],
  }),
];

export const PREMIUM_PROMPT_CATALOG: PremiumPromptTopic[] = [
  {
    id: 'upsc-history-indus-valley-civilization',
    examFamily: 'upsc',
    exam: 'UPSC CSE',
    stage: 'Prelims + Mains',
    paper: 'GS1',
    subject: 'Ancient History',
    topic: 'Indus Valley Civilization',
    kind: 'notes',
    audience: 'UPSC and State PSC aspirants',
    level: 'intermediate',
    language: 'hinglish',
    targetWords: [1400, 1900],
    syllabusFocus: ['Ancient Indian history', 'urban civilization', 'art and culture linkages'],
    mustCover: [
      'timeline from early Harappan to late Harappan phases',
      'major sites with location and special features',
      'town planning, drainage, seals, trade, religion, decline theories',
      'Harappa vs Mohenjo-daro vs Lothal comparison',
      'map cues and common prelims traps',
    ],
    tableIdeas: ['major sites table', 'feature vs evidence table', 'decline theory table', 'PYQ trap table'],
    pyqSignals: ['site-feature matching', 'religious symbols', 'urban planning', 'decline theory analysis'],
    practiceMix: ['10 prelims statement drills', '2 mains mini answers', '1 map-based recall drill'],
    factsToVerify: ['site locations and excavation details from standard references'],
    tags: ['upsc', 'state-psc', 'history', 'ancient-india'],
  },
  {
    id: 'upsc-history-vedic-age',
    examFamily: 'upsc',
    exam: 'UPSC CSE',
    stage: 'Prelims + Mains',
    paper: 'GS1',
    subject: 'Ancient History',
    topic: 'Early and Later Vedic Age',
    kind: 'notes',
    audience: 'UPSC and State PSC aspirants',
    level: 'intermediate',
    language: 'hinglish',
    targetWords: [1300, 1800],
    syllabusFocus: ['Vedic society', 'religion', 'polity', 'economy', 'social change'],
    mustCover: [
      'Early Vedic vs Later Vedic comparison',
      'four Vedas and associated content',
      'Sabha, Samiti, Ratnins, Gramini and key terms',
      'women status, varna change, agriculture, kingdoms',
      'Upanishadic thought and religious evolution',
    ],
    tableIdeas: ['early vs later Vedic table', 'Veda content table', 'terms table', 'PYQ theme table'],
    pyqSignals: ['women status', 'political institutions', 'social change', 'religious evolution'],
    practiceMix: ['8 prelims traps', '2 150-word answer frameworks', 'timeline drill'],
    factsToVerify: ['standard chronology and terms from accepted history texts'],
    tags: ['upsc', 'state-psc', 'history', 'vedic-age'],
  },
  {
    id: 'upsc-history-mauryan-empire',
    examFamily: 'upsc',
    exam: 'UPSC CSE',
    stage: 'Prelims + Mains',
    paper: 'GS1',
    subject: 'Ancient History',
    topic: 'Mauryan Empire',
    kind: 'notes',
    audience: 'UPSC and State PSC aspirants',
    level: 'advanced',
    language: 'hinglish',
    targetWords: [1500, 2000],
    syllabusFocus: ['Mauryan polity', 'Ashokan edicts', 'administration', 'art and architecture'],
    mustCover: [
      'Chandragupta Maurya, Kautilya and state formation',
      'Arthashastra governance themes',
      'Ashoka Dhamma, edicts and locations',
      'central, provincial, district and village administration',
      'pillars, stupas, caves and decline factors',
    ],
    tableIdeas: ['ruler-achievement table', 'edict type-location-content table', 'administration table', 'decline reason table'],
    pyqSignals: ['Ashokan inscriptions', 'Dhamma interpretation', 'centralized administration', 'art features'],
    practiceMix: ['10 prelims match drills', '3 mains answer frameworks', 'edict recall sheet'],
    factsToVerify: ['edict locations and inscription classifications'],
    tags: ['upsc', 'state-psc', 'history', 'mauryan-empire'],
  },
  {
    id: 'upsc-history-british-economic-policies',
    examFamily: 'upsc',
    exam: 'UPSC CSE',
    stage: 'Prelims + Mains',
    paper: 'GS1',
    subject: 'Modern History',
    topic: 'British Economic Policies and Their Impact',
    kind: 'notes',
    audience: 'UPSC and State PSC aspirants',
    level: 'advanced',
    language: 'hinglish',
    targetWords: [1500, 2100],
    syllabusFocus: ['colonial economy', 'land revenue', 'deindustrialization', 'drain theory'],
    mustCover: [
      'drain of wealth theory and economic critique',
      'deindustrialization and textile decline',
      'Permanent Settlement, Ryotwari and Mahalwari comparison',
      'railways: benefits and colonial limitations',
      'famines, commercialization and peasant impact',
    ],
    tableIdeas: ['land revenue comparison table', 'policy-impact table', 'thinker-argument table', 'mains framework table'],
    pyqSignals: ['economic critique', 'land revenue impact', 'railways debate', 'colonial exploitation'],
    practiceMix: ['6 prelims terms', '3 mains frameworks', '1 cause-effect flowchart'],
    factsToVerify: ['specific famine death tolls if included'],
    tags: ['upsc', 'state-psc', 'modern-history', 'economy'],
  },
  {
    id: 'upsc-polity-fundamental-rights',
    examFamily: 'upsc',
    exam: 'UPSC CSE',
    stage: 'Prelims + Mains',
    paper: 'GS2',
    subject: 'Indian Polity',
    topic: 'Fundamental Rights',
    kind: 'notes',
    audience: 'UPSC, State PSC and judiciary foundation learners',
    level: 'advanced',
    language: 'hinglish',
    targetWords: [1500, 2100],
    syllabusFocus: ['Constitution', 'rights', 'judicial review', 'landmark cases'],
    mustCover: [
      'Articles 12 to 35 overview',
      'six rights with article-wise table',
      'reasonable restrictions and writs',
      'landmark judgments as short signals',
      'FR vs DPSP and emergency-related traps',
    ],
    tableIdeas: ['article-right table', 'writ table', 'case-principle table', 'FR vs DPSP comparison'],
    pyqSignals: ['article matching', 'writ jurisdiction', 'rights restrictions', 'case principle application'],
    practiceMix: ['12 prelims statement drills', '2 mains frameworks', '1 case linkage exercise'],
    factsToVerify: ['latest constitutional amendments and judgments if current linkage is used'],
    tags: ['upsc', 'state-psc', 'polity', 'fundamental-rights'],
  },
  {
    id: 'upsc-polity-parliament-legislative-process',
    examFamily: 'upsc',
    exam: 'UPSC CSE',
    stage: 'Prelims + Mains',
    paper: 'GS2',
    subject: 'Indian Polity',
    topic: 'Parliament and Legislative Process',
    kind: 'notes',
    audience: 'UPSC and State PSC aspirants',
    level: 'advanced',
    language: 'hinglish',
    targetWords: [1400, 2000],
    syllabusFocus: ['Parliament', 'law-making', 'committees', 'executive accountability'],
    mustCover: [
      'Lok Sabha and Rajya Sabha powers',
      'ordinary bill, money bill, financial bill and constitutional amendment bill',
      'committee system and accountability tools',
      'speaker, joint sitting, quorum, privilege and anti-defection cues',
      'mains answer framework on parliamentary decline/reform',
    ],
    tableIdeas: ['bill comparison table', 'committee function table', 'accountability tool table', 'speaker powers table'],
    pyqSignals: ['money bill trap', 'committee role', 'federal balance', 'parliamentary control'],
    practiceMix: ['10 prelims traps', '2 mains answer frameworks', '1 flowchart drill'],
    factsToVerify: ['latest rules, amendments or court decisions if mentioned'],
    tags: ['upsc', 'state-psc', 'polity', 'parliament'],
  },
  {
    id: 'upsc-economy-inclusive-growth',
    examFamily: 'upsc',
    exam: 'UPSC CSE',
    stage: 'Mains + Prelims',
    paper: 'GS3',
    subject: 'Indian Economy',
    topic: 'Inclusive Growth',
    kind: 'notes',
    audience: 'UPSC and State PSC aspirants',
    level: 'advanced',
    language: 'hinglish',
    targetWords: [1400, 2000],
    syllabusFocus: ['growth', 'inclusion', 'financial inclusion', 'human capital', 'welfare delivery'],
    mustCover: [
      'meaning and dimensions of inclusive growth',
      'growth vs development vs inclusion',
      'financial inclusion, jobs, skills, agriculture, women, health and education',
      'scheme/report examples without overclaiming',
      'mains answer framework with way forward',
    ],
    tableIdeas: ['dimension-intervention-outcome table', 'scheme linkage table', 'challenge-solution table'],
    pyqSignals: ['inclusive growth definition', 'financial inclusion', 'inequality', 'jobless growth'],
    practiceMix: ['6 prelims terms', '3 mains frameworks', '1 value-add sheet'],
    factsToVerify: ['latest data from Economic Survey, RBI, NITI Aayog or ministry sources'],
    tags: ['upsc', 'state-psc', 'economy', 'inclusive-growth'],
  },
  {
    id: 'upsc-current-affairs-monthly-gs-decoder',
    examFamily: 'upsc',
    exam: 'UPSC CSE',
    stage: 'Prelims + Mains',
    paper: 'GS1-GS4',
    subject: 'Current Affairs',
    topic: 'Monthly GS Decoder',
    kind: 'current-affairs',
    audience: 'UPSC and State PSC aspirants',
    level: 'advanced',
    language: 'hinglish',
    targetWords: [1800, 2600],
    syllabusFocus: ['monthly current affairs', 'static linkage', 'PYQ linkage', 'revision'],
    mustCover: [
      'GS bucket-wise issue mapping',
      'why in news and static linkage',
      'facts to verify from official sources',
      'mains angles, prelims traps and ethical dimensions where relevant',
      'monthly revision sheet and MCQs',
    ],
    tableIdeas: ['issue-GS paper-static link table', 'scheme/report table', 'prelims trap table', 'mains angle table'],
    pyqSignals: ['static-current linkage', 'scheme objective', 'report indices', 'constitutional and economic angle'],
    practiceMix: ['15 prelims MCQ directions', '5 mains answer prompts', '1 monthly one-page sheet'],
    factsToVerify: ['all current facts, dates, reports, schemes and numbers from latest official sources'],
    tags: ['upsc', 'state-psc', 'current-affairs', 'monthly'],
  },
  ...UPSC_PREMIUM_EXPANSION_TOPICS,
  {
    id: 'state-psc-state-special-premium-pack',
    examFamily: 'state-psc',
    exam: 'State PSC',
    stage: 'Prelims + Mains',
    paper: 'State Special',
    subject: 'State GK',
    topic: 'State Special Premium Pack',
    kind: 'revision-pack',
    audience: 'State PSC aspirants',
    level: 'intermediate',
    language: 'hinglish',
    targetWords: [1500, 2200],
    syllabusFocus: ['state history', 'geography', 'economy', 'polity', 'schemes', 'culture'],
    mustCover: [
      'state map, rivers, districts, resources and economy',
      'history timeline and cultural symbols',
      'state schemes, institutions, reports and budget cues',
      'prelims fact bank and mains answer templates',
      'latest state data verification checklist',
    ],
    tableIdeas: ['state fact bank', 'district-speciality table', 'scheme-objective table', 'history timeline table'],
    pyqSignals: ['district matching', 'scheme objective', 'geography-resource link', 'state history chronology'],
    practiceMix: ['20 state GK recall prompts', '5 mains mini answers', '1 map drill'],
    factsToVerify: ['latest state budget, economic survey, official portal data and census-linked facts'],
    tags: ['state-psc', 'state-gk', 'revision-pack'],
  },
  {
    id: 'ssc-cgl-quant-arithmetic',
    examFamily: 'ssc',
    exam: 'SSC CGL',
    stage: 'Tier 1 + Tier 2',
    subject: 'Quantitative Aptitude',
    topic: 'Arithmetic Complete Scoring Pack',
    kind: 'notes',
    audience: 'SSC, Railway and Banking foundation learners',
    level: 'intermediate',
    language: 'hinglish',
    targetWords: [1200, 1700],
    syllabusFocus: ['percentage', 'ratio', 'profit-loss', 'time-work', 'speed-time-distance', 'DI'],
    mustCover: [
      'formula bank with when-to-use cues',
      'shortcut vs concept method',
      'topic-wise traps and calculation hacks',
      'previous trend themes without fake exact questions',
      'daily practice plan',
    ],
    tableIdeas: ['formula-use table', 'trap-fix table', 'topic-weightage direction table', 'speed math table'],
    pyqSignals: ['repeat arithmetic models', 'statement conversion', 'DI calculation', 'unit consistency'],
    practiceMix: ['20 objective drills', '5 mixed arithmetic sets', '1 error log template'],
    factsToVerify: ['latest SSC exam pattern and syllabus notification'],
    tags: ['ssc', 'cgl', 'quant', 'arithmetic'],
  },
  {
    id: 'banking-reasoning-puzzle-seating',
    examFamily: 'banking',
    exam: 'IBPS/SBI Banking Exams',
    stage: 'Prelims + Mains',
    subject: 'Reasoning Ability',
    topic: 'Puzzle and Seating Arrangement',
    kind: 'notes',
    audience: 'IBPS PO, SBI PO, Clerk and RBI foundation learners',
    level: 'intermediate',
    language: 'hinglish',
    targetWords: [1200, 1700],
    syllabusFocus: ['linear seating', 'circular seating', 'floor puzzle', 'box puzzle', 'selection puzzle'],
    mustCover: [
      'puzzle type identification',
      'diagram setup rules',
      'positive, negative and conditional clue handling',
      'time management and skip strategy',
      'mains-level difficulty upgrade',
    ],
    tableIdeas: ['puzzle type-signal table', 'clue handling table', 'mistake-fix table', 'practice ladder table'],
    pyqSignals: ['arrangement constraints', 'uncertain positions', 'combination clues', 'time-pressure traps'],
    practiceMix: ['8 mini puzzles', '3 mains puzzles', '1 error log drill'],
    factsToVerify: ['latest exam pattern and section timing from official notification'],
    tags: ['banking', 'reasoning', 'puzzle', 'seating'],
  },
  {
    id: 'railway-rrb-ntpc-general-awareness',
    examFamily: 'railway',
    exam: 'RRB NTPC',
    stage: 'CBT 1 + CBT 2',
    subject: 'General Awareness',
    topic: 'Static GK and Current Linkage',
    kind: 'revision-pack',
    audience: 'Railway and SSC aspirants',
    level: 'foundation',
    language: 'hinglish',
    targetWords: [1100, 1600],
    syllabusFocus: ['history', 'polity', 'geography', 'science', 'current affairs', 'railway awareness'],
    mustCover: [
      'static GK buckets',
      'science one-liners',
      'polity articles and institutions',
      'railway-specific awareness cues',
      'revision strategy for large factual syllabus',
    ],
    tableIdeas: ['bucket-topic table', 'one-liner fact bank', 'current-static link table', 'trap table'],
    pyqSignals: ['direct factual recall', 'matching', 'science basics', 'current-static linkage'],
    practiceMix: ['30 one-liner recall prompts', '20 MCQ directions', '1 weekly revision plan'],
    factsToVerify: ['latest current affairs and Railway recruitment notification details'],
    tags: ['railway', 'rrb-ntpc', 'general-awareness'],
  },
  {
    id: 'ctet-child-development-pedagogy',
    examFamily: 'teaching',
    exam: 'CTET',
    stage: 'Paper 1 + Paper 2',
    subject: 'Child Development and Pedagogy',
    topic: 'Learning Theories and Inclusive Education',
    kind: 'notes',
    audience: 'CTET, TET and teaching exam aspirants',
    level: 'intermediate',
    language: 'hinglish',
    targetWords: [1300, 1800],
    syllabusFocus: ['child development', 'learning theories', 'inclusive education', 'assessment'],
    mustCover: [
      'Piaget, Vygotsky, Kohlberg and constructivism',
      'child-centered pedagogy and inclusive classroom',
      'assessment for learning vs assessment of learning',
      'NEP and NCF linkage with verification note',
      'pedagogy MCQ traps',
    ],
    tableIdeas: ['theorist-concept-classroom use table', 'inclusive strategy table', 'assessment comparison table'],
    pyqSignals: ['theory application', 'classroom situation', 'inclusive education', 'assessment terminology'],
    practiceMix: ['15 pedagogy MCQ scenarios', '5 classroom case prompts', '1 theory flashcard drill'],
    factsToVerify: ['latest CTET syllabus and NCF/NEP references'],
    tags: ['ctet', 'tet', 'pedagogy', 'teaching'],
  },
  {
    id: 'jee-main-physics-mechanics',
    examFamily: 'engineering',
    exam: 'JEE Main',
    stage: 'Main',
    subject: 'Physics',
    topic: 'Mechanics High-Yield Formula and Concept Pack',
    kind: 'notes',
    audience: 'JEE Main aspirants',
    level: 'advanced',
    language: 'hinglish',
    targetWords: [1300, 1800],
    syllabusFocus: ['kinematics', 'NLM', 'work-energy', 'COM', 'rotation', 'gravitation'],
    mustCover: [
      'concept map and formula bank',
      'when each formula applies',
      'free body diagram checklist',
      'rotation vs translation comparison',
      'common sign, frame and unit traps',
    ],
    tableIdeas: ['formula-condition table', 'concept-trap table', 'problem type-method table', 'revision formula sheet'],
    pyqSignals: ['multi-concept mechanics', 'FBD application', 'energy conservation', 'rotation traps'],
    practiceMix: ['15 objective problem directions', '5 mixed concept drills', '1 formula recall sheet'],
    factsToVerify: ['latest JEE Main syllabus from NTA'],
    tags: ['jee-main', 'physics', 'mechanics'],
  },
  {
    id: 'neet-biology-human-physiology',
    examFamily: 'medical',
    exam: 'NEET UG',
    stage: 'UG Entrance',
    subject: 'Biology',
    topic: 'Human Physiology Premium NCERT Pack',
    kind: 'notes',
    audience: 'NEET UG aspirants',
    level: 'advanced',
    language: 'hinglish',
    targetWords: [1400, 1900],
    syllabusFocus: ['digestion', 'breathing', 'circulation', 'excretion', 'neural control', 'endocrine'],
    mustCover: [
      'NCERT line-based concept map',
      'organ-system comparison tables',
      'hormone, enzyme and disorder fact bank',
      'diagram labeling cues',
      'assertion-reason and statement traps',
    ],
    tableIdeas: ['system-function table', 'hormone-source-effect table', 'enzyme-substrate table', 'disorder-symptom table'],
    pyqSignals: ['NCERT wording', 'diagram-based recall', 'hormone matching', 'assertion-reason traps'],
    practiceMix: ['25 NCERT line recall prompts', '15 MCQ directions', '1 diagram drill'],
    factsToVerify: ['latest NEET syllabus from NTA/NMC sources'],
    tags: ['neet', 'biology', 'human-physiology'],
  },
  {
    id: 'gate-cse-data-structures',
    examFamily: 'engineering',
    exam: 'GATE CSE',
    stage: 'GATE',
    subject: 'Computer Science',
    topic: 'Data Structures',
    kind: 'notes',
    audience: 'GATE CSE aspirants',
    level: 'advanced',
    language: 'hinglish',
    targetWords: [1300, 1900],
    syllabusFocus: ['arrays', 'stacks', 'queues', 'linked lists', 'trees', 'graphs', 'hashing', 'complexity'],
    mustCover: [
      'operation complexity table',
      'tree and graph traversal logic',
      'stack/queue applications',
      'hashing collision handling',
      'GATE-style numerical and conceptual traps',
    ],
    tableIdeas: ['data structure-operation-complexity table', 'traversal table', 'problem type table', 'trap table'],
    pyqSignals: ['time complexity', 'tree traversal', 'graph algorithm base', 'stack/queue application'],
    practiceMix: ['15 concept MCQ directions', '8 numerical-style prompts', '1 complexity flashcard drill'],
    factsToVerify: ['latest GATE CSE syllabus and paper pattern'],
    tags: ['gate', 'cse', 'data-structures'],
  },
  {
    id: 'cuet-ug-general-test',
    examFamily: 'other',
    exam: 'CUET UG',
    stage: 'UG Entrance',
    subject: 'General Test',
    topic: 'General Test Strategy and Practice Pack',
    kind: 'study-plan',
    audience: 'CUET UG aspirants',
    level: 'foundation',
    language: 'hinglish',
    targetWords: [1100, 1600],
    syllabusFocus: ['general knowledge', 'current affairs', 'reasoning', 'quantitative aptitude'],
    mustCover: [
      'section-wise preparation roadmap',
      'reasoning and quant topic list',
      'current affairs revision method',
      'time management and attempt strategy',
      'daily practice tracker',
    ],
    tableIdeas: ['section-skill-source table', 'daily schedule table', 'trap table', 'mock analysis table'],
    pyqSignals: ['mixed aptitude', 'current-static linkage', 'basic quant', 'reasoning patterns'],
    practiceMix: ['20 mixed practice directions', '1 daily schedule', '1 mock review sheet'],
    factsToVerify: ['latest CUET information bulletin and subject mapping'],
    tags: ['cuet', 'general-test', 'study-plan'],
  },
  {
    id: 'clat-legal-reasoning',
    examFamily: 'law',
    exam: 'CLAT UG',
    stage: 'UG Entrance',
    subject: 'Legal Reasoning',
    topic: 'Principle-Fact Legal Reasoning',
    kind: 'notes',
    audience: 'CLAT and law entrance aspirants',
    level: 'intermediate',
    language: 'hinglish',
    targetWords: [1200, 1700],
    syllabusFocus: ['legal principle', 'fact application', 'constitution basics', 'torts', 'contracts', 'criminal law basics'],
    mustCover: [
      'principle-fact method',
      'how to avoid outside knowledge traps',
      'constitutional and legal vocabulary',
      'passage reading strategy',
      'practice framework with answer direction',
    ],
    tableIdeas: ['principle-signal table', 'trap-fix table', 'legal term table', 'passage strategy table'],
    pyqSignals: ['apply given principle', 'ignore personal opinion', 'close options', 'legal vocabulary'],
    practiceMix: ['8 principle-fact mini sets', '5 vocabulary drills', '1 passage annotation drill'],
    factsToVerify: ['latest CLAT consortium syllabus and pattern'],
    tags: ['clat', 'legal-reasoning', 'law'],
  },
  {
    id: 'cat-varc-dilr-qa-complete-plan',
    examFamily: 'management',
    exam: 'CAT',
    stage: 'MBA Entrance',
    subject: 'VARC, DILR and QA',
    topic: 'Complete Premium Preparation Plan',
    kind: 'study-plan',
    audience: 'CAT aspirants',
    level: 'advanced',
    language: 'hinglish',
    targetWords: [1300, 1900],
    syllabusFocus: ['VARC', 'DILR', 'QA', 'mock strategy', 'analysis'],
    mustCover: [
      'section-wise target skills',
      'topic prioritization for QA',
      'DILR set selection strategy',
      'VARC reading and option elimination',
      'mock analysis template',
    ],
    tableIdeas: ['section-skill-drill table', 'QA topic priority table', 'mock analysis table', 'error log table'],
    pyqSignals: ['set selection', 'accuracy vs attempts', 'option traps', 'arithmetic and algebra mix'],
    practiceMix: ['weekly mock plan', '20 drill directions', '1 error log framework'],
    factsToVerify: ['latest CAT pattern and official notification'],
    tags: ['cat', 'mba', 'varc', 'dilr', 'qa'],
  },
  {
    id: 'cbse-class-10-science-revision-pack',
    examFamily: 'school',
    exam: 'CBSE Class 10',
    stage: 'Board Exam',
    subject: 'Science',
    topic: 'Complete Revision Pack',
    kind: 'revision-pack',
    audience: 'CBSE Class 10 students',
    level: 'foundation',
    language: 'hinglish',
    targetWords: [1200, 1700],
    syllabusFocus: ['physics', 'chemistry', 'biology', 'diagrams', 'numericals', 'competency questions'],
    mustCover: [
      'chapter-wise high-yield map',
      'formula and reaction bank',
      'diagram labeling checklist',
      'case-based question strategy',
      'last 15-day revision plan',
    ],
    tableIdeas: ['chapter-output table', 'formula table', 'reaction table', 'diagram checklist table'],
    pyqSignals: ['NCERT concept application', 'diagram labeling', 'numericals', 'case-based questions'],
    practiceMix: ['20 short questions', '10 competency prompts', '1 sample paper analysis sheet'],
    factsToVerify: ['latest CBSE syllabus and sample paper'],
    tags: ['cbse', 'class-10', 'science', 'revision'],
  },
];

export const listPremiumPromptTopics = (filter: PremiumPromptFilter = {}) => {
  const exam = filter.exam ? normalize(filter.exam) : '';
  const subject = filter.subject ? normalize(filter.subject) : '';

  return PREMIUM_PROMPT_CATALOG.filter((topic) => {
    if (filter.examFamily && topic.examFamily !== filter.examFamily) return false;
    if (filter.kind && topic.kind !== filter.kind) return false;
    if (exam && !normalize(topic.exam).includes(exam)) return false;
    if (subject && !normalize(topic.subject).includes(subject)) return false;
    return true;
  });
};

export const getPremiumPromptTopic = (id: string) => {
  const topic = byId(id);
  if (!topic) {
    const sampleIds = PREMIUM_PROMPT_CATALOG.slice(0, 8).map((item) => item.id).join(', ');
    throw new Error(`Unknown premium prompt id "${id}". Try one of: ${sampleIds}`);
  }
  return topic;
};

export const buildPremiumExamContentPrompt = (
  topicOrId: PremiumPromptTopic | string,
  options: PremiumPromptBuildOptions = {}
) => {
  const topic = typeof topicOrId === 'string' ? getPremiumPromptTopic(topicOrId) : topicOrId;
  const language = options.language || topic.language;
  const targetWords = options.targetWords || topic.targetWords;
  const includeSystemPrompt = options.includeSystemPrompt ?? true;
  const currentAffairsWindow = options.currentAffairsWindow || 'latest stable developments only';
  const officialSourceHint = options.officialSourceHint || 'official notification, syllabus PDF, ministry/authority website, NCERT/standard text, or PYQ trend';
  const extraInstructions = options.extraInstructions?.length ? options.extraInstructions : [];

  const taskPrompt = `
Create premium ${topic.kind} content for Study Hub.

Content brief:
- Exam: ${topic.exam}
- Exam family: ${topic.examFamily}
- Stage: ${topic.stage || 'not specified'}
- Paper: ${topic.paper || 'not specified'}
- Subject: ${topic.subject}
- Topic: ${topic.topic}
- Audience: ${topic.audience}
- Level: ${topic.level}
- Language: ${language}
- Target length: ${targetWords[0]}-${targetWords[1]} words
- Current affairs window: ${currentAffairsWindow}
- Verification source hint: ${officialSourceHint}

Syllabus focus:
${list(topic.syllabusFocus)}

Must cover:
${list(topic.mustCover.length ? topic.mustCover : defaultMustCover)}

Recommended premium tables:
${list(topic.tableIdeas.length ? topic.tableIdeas : defaultTableIdeas)}

PYQ / exam signals:
${list(topic.pyqSignals)}

Practice mix:
${list(topic.practiceMix.length ? topic.practiceMix : defaultPracticeMix)}

Facts that must be verified or caveated:
${list(topic.factsToVerify)}

Required output contract:
${list([...PREMIUM_OUTPUT_CONTRACT])}

Extra instructions:
${extraInstructions.length ? list(extraInstructions) : '- None'}

Publishability checklist before final answer:
- No fake exact PYQ wording.
- No unverified current number presented as final.
- No copied coaching/book language.
- Tables are useful, not decorative.
- Student can revise from the output.
- Tone is premium Hinglish unless a different language is requested.

Now generate the final student-facing content only.
`.trim();

  return includeSystemPrompt
    ? `${PREMIUM_AI_CONTENT_SYSTEM_PROMPT}\n\n---\n\n${taskPrompt}`
    : taskPrompt;
};

export const buildPremiumBulkPromptPlan = (filter: PremiumPromptFilter = {}) => {
  const topics = listPremiumPromptTopics(filter);

  return [
    '# Premium AI Content Generation Plan',
    '',
    `Total prompts: ${topics.length}`,
    '',
    '| ID | Exam | Subject | Topic | Kind | Tags |',
    '| --- | --- | --- | --- | --- | --- |',
    ...topics.map((topic) => `| ${topic.id} | ${topic.exam} | ${topic.subject} | ${topic.topic} | ${topic.kind} | ${csv(topic.tags)} |`),
    '',
    'Use `npm run generate-premium-content -- --id=<id> --dry-run` to preview a prompt.',
    'Use `npm run generate-premium-content -- --id=<id> --apply` to generate content with configured AI keys.',
  ].join('\n');
};
