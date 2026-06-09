import dotenv from 'dotenv';
dotenv.config();

import mongoose, { Types } from 'mongoose';
import StudyCard, { type StudyCardGoalType, type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';
import { detailedEntranceSpecs, gateTestPapers, getGatePaperBranchName, type GateTestPaper } from './studyHubEntranceSpecs';
import { detailedLanguageSpecs } from './studyHubLanguageSpecs';
import { detailedPlacementSpecs } from './studyHubPlacementSpecs';
import { detailedSchoolBoardSpecs } from './studyHubSchoolBoardSpecs';
import { detailedUniversitySpecs } from './studyHubUniversitySpecs';

const MONGO_URI = process.env.MONGO_URI;
const ROOT_WORKSPACE_SLUG = 'study-hub';
const shouldApply = process.argv.includes('--apply');
const placementOnly = process.argv.includes('--placement-only');
const schoolOnly = process.argv.includes('--school-only');
const gateOnly = process.argv.includes('--gate-only');
const upscOnly = process.argv.includes('--upsc-cse-only');
const universityOnly = process.argv.includes('--university-only');
const branchFirstAll = process.argv.includes('--branch-first-all');
const branchFirstLimitArg = process.argv.find((arg) => arg.startsWith('--branch-first-limit='));
const branchFirstLimit = branchFirstLimitArg ? Number(branchFirstLimitArg.split('=').slice(1).join('=')) : 0;
const branchFirstSlugArg = process.argv.find((arg) => arg.startsWith('--branch-first-slug='));
const branchFirstSlug = branchFirstSlugArg ? branchFirstSlugArg.split('=').slice(1).join('=').trim() : '';
const rootOnlyArg = process.argv.find((arg) => arg.startsWith('--root='));
const taxonomyOnly = process.argv.includes('--taxonomy-only');
const taxonomyBuildOnly = process.argv.includes('--taxonomy-build-only');
const auditOnly = process.argv.includes('--audit-only');
const cleanupOnly = process.argv.includes('--cleanup-only');
const fastCleanOnly = process.argv.includes('--fast-clean-only');
const schoolRepairOnly = process.argv.includes('--school-repair-only');
const deepCleanOnly = process.argv.includes('--deep-clean-only');
const repairCyclesOnly = process.argv.includes('--repair-cycles-only');
const pruneUniversityExtrasOnly = process.argv.includes('--prune-university-extras-only');
const MAX_PREMIUM_STUDENT_CLICKS = 5;

type CardDoc = any;

type KitDefinition = {
  rootPath: string[];
  goalType: StudyCardGoalType;
  iconKey: string;
  tone: StudyCardTone;
  branches: string[][];
};

type DetailedExamSpec = {
  category: string;
  family: string;
  exam: string;
  icon: string;
  branches: string[];
  aliases?: string[];
  tone?: StudyCardTone;
};

type RootMove = {
  aliases: string[];
  targetPath: string[];
  goalType?: StudyCardGoalType;
  iconKey?: string;
  tone?: StudyCardTone;
  searchEverywhere?: boolean;
};

type AuditItem = {
  id: string;
  path: string;
  reason: string;
  fileCount: number;
  childCount: number;
  status: string;
  visibility: string;
  depth: number;
  studentClicks: number;
};

const stats = {
  created: 0,
  moved: 0,
  merged: 0,
  renamed: 0,
  archived: 0,
  styled: 0,
};

const logStep = (message: string) => {
  console.log(`[organize-study-hub] ${message}`);
};

const isDuplicateKeyError = (error: unknown) =>
  Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: number }).code === 11000);

const isDocumentNotFoundError = (error: unknown) =>
  Boolean(error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'DocumentNotFoundError');

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

const normalizeNameKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const topLevelCategoryNames = [
  'Competitive Exams',
  'Entrance Exams',
  'School Boards',
  'State Exams',
  'University Exams',
  'Study Abroad',
  'Foreign Language',
  'Placement / Private',
];

const topLevelCategoryKeys = new Set(topLevelCategoryNames.map(normalizeNameKey));

const isPlacementRootName = (value = '') => {
  const key = normalizeNameKey(value);
  return key === 'placement private' || key === 'placement and private';
};

const companyLogoDomains = new Map<string, string>([
  ['tcs', 'tcs.com'],
  ['tata consultancy services', 'tcs.com'],
  ['infosys', 'infosys.com'],
  ['wipro', 'wipro.com'],
  ['cognizant', 'cognizant.com'],
  ['accenture', 'accenture.com'],
  ['capgemini', 'capgemini.com'],
  ['hcltech', 'hcltech.com'],
  ['hcl technologies', 'hcltech.com'],
  ['tech mahindra', 'techmahindra.com'],
  ['ibm', 'ibm.com'],
  ['deloitte', 'deloitte.com'],
  ['amazon', 'amazon.com'],
  ['microsoft', 'microsoft.com'],
  ['google', 'google.com'],
  ['adobe', 'adobe.com'],
  ['oracle', 'oracle.com'],
  ['zoho', 'zoho.com'],
  ['flipkart', 'flipkart.com'],
  ['meesho', 'meesho.com'],
  ['swiggy', 'swiggy.com'],
  ['zomato', 'zomato.com'],
  ['phonepe', 'phonepe.com'],
  ['razorpay', 'razorpay.com'],
  ['paytm', 'paytm.com'],
  ['goldman sachs', 'goldmansachs.com'],
  ['jp morgan', 'jpmorganchase.com'],
  ['jpmorgan', 'jpmorganchase.com'],
  ['jpmorgan chase', 'jpmorganchase.com'],
  ['morgan stanley', 'morganstanley.com'],
  ['deutsche bank', 'deutschebank.com'],
  ['barclays', 'barclays.com'],
  ['hsbc', 'hsbc.com'],
]);

const compactName = (value = '') => {
  const replacements: Array<[RegExp, string]> = [
    [/^\s*\d+\s*[.)-]\s*/g, ''],
    [/\bPYQs?\b/gi, 'Previous Year Papers'],
    [/\bPrevious Year Question Papers?\b/gi, 'Previous Year Papers'],
    [/\bPrevious Year Papers\s+(\d{4})\b/gi, '$1'],
    [/\bComp\.?\s*Language\b/gi, 'Language'],
    [/\bLanguage Paper\b/gi, 'Language'],
    [/\bGeneral Studies\b/gi, 'GS'],
    [/\bGS\s*PAPER\b/gi, 'GS Paper'],
    [/\bMock Test\b/gi, 'Mock Tests'],
    [/\bStudy Materials\b/gi, 'Study Material'],
    [/\bNotifications?\b/gi, 'Updates'],
    [/\bExam Updates? & Alerts?\b/gi, 'Updates'],
    [/\bCentral Govt Exams\b/gi, 'Competitive Exams'],
    [/\bCentral Government Exams\b/gi, 'Competitive Exams'],
    [/\bUPPSE\b/gi, 'UPPSC'],
    [/\bUPPCS\b/gi, 'UPPSC'],
    [/^upsc\s+pcs$/gi, 'UPPSC'],
    [/^Placement Private$/gi, 'Placement / Private'],
    [/^Placement Portal$/gi, 'Placement / Private'],
    [/^TCS National Qualifier Test$/gi, 'TCS'],
    [/^TCS NQT$/gi, 'TCS'],
    [/^Infosys Off-Campus$/gi, 'Infosys'],
    [/^Wipro Elite and NTH$/gi, 'Wipro'],
    [/^Wipro Elite NTH$/gi, 'Wipro'],
    [/^Service_Based$/gi, 'Service Based'],
    [/^Product_Based$/gi, 'Product Based'],
    [/^Common_Resources$/gi, 'Common Resources'],
    [/\bScience and Tech\b/gi, 'Science & Tech'],
    [/\bIndian Polity & Governance\b/gi, 'Polity'],
    [/\bInternational Relations\b/gi, 'IR'],
    [/\bInternal Security\b/gi, 'Security'],
    [/\bOptional Subjects\b/gi, 'Optional'],
    [/\bAnswer Key\b/gi, 'Answer Keys'],
    [/\bPractice Sets?\b/gi, 'Practice Questions'],
  ];

  return replacements
    .reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), value)
    .replace(/_/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const getCompanyLogoUrl = (name = '') => {
  const domain = companyLogoDomains.get(normalizeNameKey(compactName(name)));
  return domain ? `https://logo.clearbit.com/${domain}` : '';
};

const isPlaceholderName = (name = '') => /^new\s*folder\d*$/i.test(name.trim()) || /^untitled/i.test(name.trim());

const iconKeyAliases = new Map<string, string>([
  ['answer keys', 'answer-key'],
  ['answer key', 'answer-key'],
  ['board papers', 'board-paper'],
  ['business studies', 'business-studies'],
  ['central government exams', 'government'],
  ['central govt exams', 'government'],
  ['competitive exams', 'competitive'],
  ['current affairs', 'current-affairs'],
  ['entrance exams', 'entrance'],
  ['foreign language', 'language'],
  ['english tests', 'ielts'],
  ['ielts academic', 'ielts'],
  ['ielts general training', 'ielts'],
  ['ielts gt', 'ielts'],
  ['government jobs', 'government'],
  ['indian economy', 'economics'],
  ['indian polity', 'polity'],
  ['information technology', 'it'],
  ['mock tests', 'mock'],
  ['board pattern', 'syllabus'],
  ['formula sheets', 'formula'],
  ['important questions', 'question-paper'],
  ['model papers', 'sample-paper'],
  ['ncert exemplar', 'book-solution'],
  ['ncert solutions', 'book-solution'],
  ['olympiads', 'scholarship'],
  ['olympiad', 'scholarship'],
  ['olympiads and scholarships', 'scholarship'],
  ['placement and career', 'placement'],
  ['placement and private', 'placement'],
  ['placement private', 'placement'],
  ['previous year paper', 'pyq'],
  ['previous year papers', 'pyq'],
  ['sample papers', 'sample-paper'],
  ['sample paper', 'sample-paper'],
  ['school boards', 'school-board'],
  ['school exams', 'school-board'],
  ['state board', 'state-board'],
  ['state boards', 'state-board'],
  ['state exams', 'state-exam'],
  ['study abroad', 'abroad'],
  ['study material', 'material'],
  ['topper strategy', 'strategy'],
  ['toppers notes', 'notes'],
  ['university exams', 'university'],
]);

const addIconAliases = (names: string[], iconKey: string) => {
  names.forEach((name) => iconKeyAliases.set(normalizeNameKey(name), iconKey));
};

const iconAliasGroups: Array<[string[], string]> = [
  [['competitive-exams-icon'], 'competitive'],
  [['upsc-main', 'upsc-cse'], 'upsc'],
  [['upsc-nda', 'upsc-cds', 'upsc-capf'], 'defence'],
  [['upsc-ies', 'ies-ese', 'ssc-je', 'rrb-je', 'dmrc-je'], 'engineering'],
  [['upsc-ifos', 'icar-ars'], 'environment'],
  [['upsc-geo'], 'geography'],
  [['upsc-interview', 'ssb-interview', 'ssb-pi'], 'interview'],
  [['ssc-main', 'ssc-cgl', 'ssc-chsl', 'ssc-mts', 'ssc-selection'], 'ssc'],
  [['ssc-gd', 'ssc-cpo', 'rpf-si', 'rpf-constable'], 'defence'],
  [['ssc-steno'], 'notes'],
  [['ssc-jht'], 'hindi'],
  [[
    'banking-main',
    'sbi-po',
    'sbi-clerk',
    'ibps-po',
    'ibps-clerk',
    'ibps-rrb',
    'ibps-so',
    'rbi-grade-b',
    'rbi-assistant',
    'nabard',
    'sebi',
    'sidbi',
    'nhb',
    'pfrda',
    'exim-bank',
    'irdai',
    'gic',
    'ecgc',
    'lic-aao',
    'lic-ado',
    'lic-assistant',
    'niacl',
    'nicl',
    'new-india',
    'oriental',
    'united-india',
  ], 'banking'],
  [[
    'railway-main',
    'rrb-ntpc',
    'rrb-alp',
    'rpsf',
    'dmrc',
    'bmrcl',
    'cmrl',
    'hmrl',
    'kolkata-metro',
    'mumbai-metro',
    'pune-metro',
    'jaipur-metro',
    'lucknow-metro',
    'kochi-metro',
    'rites',
    'ircon',
  ], 'railway'],
  [['rrb-group-d', 'rrc-apprentice'], 'engineering'],
  [['railway-medical'], 'medical'],
  [[
    'defence-main',
    'agniveer-army',
    'agniveer-navy',
    'agniveer-af',
    'afcat',
    'indian-navy',
    'navy-inet',
    'indian-army',
    'army-tgc',
    'army-ncc',
    'coast-guard',
    'coast-guard-navik',
    'bsf',
    'crpf',
    'cisf',
    'itbp',
    'ssb-force',
    'assam-rifles',
  ], 'defence'],
  [['army-tes'], 'science'],
  [['army-jag'], 'law'],
  [['ib-acio'], 'qa'],
  [['ssb-oir'], 'aptitude'],
  [['ssb-ppdt', 'ssb-tat'], 'mindmap'],
  [['ssb-wat'], 'notes'],
  [['ssb-srt', 'ssb-gto'], 'practice'],
  [['judiciary-main', 'civil-judge', 'djs', 'up-pcsj', 'bihar-js', 'hjs', 'aibe', 'aor', 'bare-acts', 'case-laws'], 'law'],
  [[
    'science-main',
    'drdo-rac',
    'drdo-ceptam',
    'barc-oces',
    'barc-dgfs',
    'csir-scientist',
    'csir-net',
    'imd',
    'isro',
    'isro-scientist',
    'army-tes',
  ], 'science'],
  [['icar-jrf'], 'environment'],
  [['icmr'], 'medical'],
  [['iss'], 'maths'],
  [['cdac', 'nielit'], 'computer-science'],
  [[
    'engineering-main',
    'ongc',
    'iocl',
    'bpcl',
    'hpcl',
    'gail',
    'ntpc',
    'powergrid',
    'bhel',
    'bel',
    'hal',
    'sail',
    'nlc',
    'nhpc',
    'npcil',
    'eil',
    'wapcos',
    'coal-india',
    'aai',
  ], 'engineering'],
  [['school-main'], 'school-board'],
  [[
    'up-board',
    'bihar-board',
    'mp-board',
    'rajasthan-board',
    'maharashtra-board',
    'tn-board',
    'karnataka-puc',
    'ap-board',
    'ts-board',
    'wb-board',
    'gujarat-board',
    'haryana-board',
    'punjab-board',
    'kerala-board',
  ], 'state-board'],
  [[
    'state-exam',
    'state-exams',
    'state-civil-services',
    'state-specific-exams',
    'uppsc',
    'uppsc-pcs',
    'bpsc',
    'bpsc-pcs',
    'mppsc',
    'mppsc-state-service',
    'rpsc-ras',
    'mpsc',
    'mpsc-rajyaseva',
    'tnpsc',
    'tnpsc-group-1',
    'kpsc-kas',
    'appsc-tspsc',
    'wbpsc',
    'gpsc',
    'upsssc-pet',
    'upsssc-lekhpal',
    'rsmssb-patwari',
    'bssc-cgl',
  ], 'state-exam'],
  [['class-primary', 'class-middle', 'class-secondary', 'class-sr-sec'], 'class'],
  [['subject-math', 'olympiad-math', 'imo-intl', 'sof-imo', 'step-math'], 'maths'],
  [['subject-science', 'olympiad-physics', 'nsep', 'ipho', 'sof-nso', 'nsejs', 'isro'], 'science'],
  [['subject-physics'], 'physics'],
  [['subject-chemistry', 'olympiad-chem', 'nsec', 'icho'], 'chemistry'],
  [['subject-biology', 'olympiad-bio', 'nseb', 'ibo'], 'biology'],
  [['subject-sst', 'sof-igko', 'sof-isso'], 'geography'],
  [['subject-history'], 'history'],
  [['subject-geo'], 'geography'],
  [['subject-civics'], 'polity'],
  [['subject-english', 'sof-ieo'], 'english'],
  [['subject-hindi'], 'hindi'],
  [['subject-sanskrit'], 'sanskrit'],
  [['subject-comp-sci', 'olympiad-info', 'ioi', 'sof-nco'], 'computer-science'],
  [['subject-acc'], 'accountancy'],
  [['subject-bst'], 'business-studies'],
  [['subject-eco'], 'economics'],
  [['subject-evs'], 'environment'],
  [['olympiad-astro', 'nsea', 'iao'], 'science'],
  [[
    'olympiad-main',
    'nmms',
    'inspire',
    'inspire-dbt',
    'pm-yashasvi',
    'maulana-azad',
    'sc-fellowship',
    'st-fellowship',
    'obc-fellowship',
    'minority-scholar',
    'aicte-pragati',
    'aicte-saksham',
    'anthe',
    'tallentex',
    'fiitjee-big-bang',
    'reso-start',
  ], 'scholarship'],
  [['english-tests', 'ielts-academic', 'ielts-general-training', 'ielts-gt'], 'ielts'],
  [[
    'language-main',
    'pte',
    'duolingo-test',
    'goethe',
    'testdaf',
    'dsh',
    'telc-deutsch',
    'delf',
    'dalf',
    'tcf',
    'tef-canada',
    'jlpt-n5',
    'jlpt-n4',
    'jlpt-n3',
    'jlpt-n2',
    'jlpt-n1',
    'bjt',
    'topik-1',
    'topik-2',
    'hsk-1',
    'hsk-2',
    'hsk-3',
    'hsk-4',
    'hsk-5',
    'hsk-6',
    'dele',
    'siele',
    'torfl',
    'cils',
    'celpe-bras',
    'arabic-test',
  ], 'language'],
  [['oet', 'mcat-usa', 'ucat', 'bmat', 'gamsat', 'isat', 'usmle'], 'medical'],
  [['abroad-main', 'act', 'usa-guide', 'uk-guide', 'canada-guide', 'australia-guide', 'germany-guide', 'singapore-guide', 'japan-guide', 'new-zealand-guide', 'commonwealth'], 'abroad'],
  [['lsat-usa', 'lnat'], 'law'],
  [['fulbright', 'chevening', 'daad', 'gates-cambridge', 'rhodes', 'australia-awards'], 'scholarship'],
  [['sop-writing', 'lor-guide'], 'notes'],
  [['visa-guide'], 'visa'],
  [['university-select'], 'abroad'],
  [['teaching-main', 'ctet', 'stet', 'dsssb', 'kvs', 'nvs', 'super-tet', 'reet', 'htet', 'uptet'], 'tet'],
  [['police-main', 'police-constable', 'police-si', 'delhi-police', 'state-police'], 'defence'],
  [['medical-main', 'neet-pg', 'ini-cet', 'fmge', 'aiims-norcet', 'gpat', 'nursing'], 'medical'],
  [['law-entrance-main', 'ailet', 'lsat-india', 'slat', 'mh-cet-law'], 'law'],
  [['design-main', 'nid-dat', 'nift', 'uceed', 'ceed'], 'design'],
  [['architecture-main', 'nata', 'jee-b-arch', 'jee-b-planning'], 'architecture'],
  [['agriculture-main', 'icar-aieea', 'icar-aieea-ug', 'icar-aieea-pg', 'veterinary'], 'environment'],
  [['university-pg-main', 'cuet-pg', 'cuet-ug', 'jest', 'tifr-gs'], 'university'],
  [['iit-jam', 'iit_jam'], 'iit-jam'],
  [['du', 'delhi-university', 'bhu', 'gkv', 'gkdu', 'gurukula-kangri', 'gurukul-kangri'], 'university'],
  [['ignou'], 'ignou'],
  [['iit', 'iit-programs'], 'iit'],
  [['iim', 'iim-programs'], 'iim'],
  [['nlu', 'nlu-programs'], 'judiciary'],
  [['upsc_cse', 'upsc-cse'], 'upsc-cse'],
  [['nda', 'upsc-nda'], 'nda'],
  [['cds', 'upsc-cds'], 'cds'],
  [['shield', 'upsc-capf'], 'shield'],
  [['ssc-cgl'], 'ssc-cgl'],
  [['ssc-chsl'], 'ssc-chsl'],
  [['ssc-gd'], 'ssc-gd'],
  [['gear', 'upsc-ies', 'ies-ese', 'ssc-je', 'rrb-je', 'dmrc-je'], 'gear'],
  [['wrench', 'rrb-group-d', 'rrc-apprentice'], 'wrench'],
  [['oil'], 'oil'],
  [['bhel'], 'bhel'],
  [['forest', 'upsc-ifos', 'icar-ars'], 'forest'],
  [['police', 'ssc-cpo', 'rpf-si', 'rpf-constable'], 'police'],
  [['sbi', 'sbi-po', 'sbi-clerk'], 'sbi'],
  [['bank', 'ibps-po', 'ibps-clerk', 'ibps-rrb', 'ibps-so'], 'bank'],
  [['rbi', 'rbi-grade-b', 'rbi-assistant'], 'rbi'],
  [['nabard'], 'nabard'],
  [['sebi'], 'sebi'],
  [['epfo'], 'epfo'],
  [['rrb_ntpc', 'rrb-ntpc', 'rrb-alp'], 'rrb-ntpc'],
  [['metro', 'dmrc', 'bmrcl', 'cmrl', 'hmrl', 'kolkata-metro', 'mumbai-metro', 'pune-metro', 'jaipur-metro', 'lucknow-metro', 'kochi-metro'], 'metro'],
  [['coast_guard', 'coast-guard', 'coast-guard-navik'], 'coast-guard'],
  [['ib_acio', 'ib-acio'], 'ib-acio'],
  [['ssb', 'ssb-interview', 'ssb-pi'], 'ssb'],
  [['teacher', 'teaching-main', 'ctet', 'stet', 'dsssb', 'kvs', 'nvs', 'super-tet', 'reet', 'htet', 'uptet'], 'teacher'],
  [['judiciary', 'judiciary-main', 'civil-judge', 'djs', 'up-pcsj', 'bihar-js', 'hjs', 'aibe', 'aor', 'bare-acts', 'case-laws'], 'judiciary'],
  [['isro'], 'isro'],
  [['research', 'drdo-rac', 'drdo-ceptam'], 'research'],
  [['nuclear', 'barc-oces', 'barc-dgfs'], 'nuclear'],
  [['jee-main', 'jee-advanced', 'iit-jee', 'iit-entrance'], 'nuclear'],
  [['bitsat', 'state-engineering-entrances', 'mht-cet', 'wbjee', 'kcet', 'comedk-uget'], 'gear'],
  [['gate', 'gate-cse', 'gate-ece', 'gate-ee', 'gate-me', 'gate-ce', 'gate-da'], 'gate'],
  [['neet', 'neet-ug', 'fmge'], 'neet'],
  [['neet-pg', 'ini-cet', 'aiims-norcet', 'nursing-entrance'], 'medical'],
  [['gpat'], 'gpat'],
  [['aiapget', 'ayush'], 'ayush'],
  [['veterinary', 'veterinary-entrance', 'bio-research', 'bio_research'], 'bio-research'],
  [['cat', 'xat', 'snap', 'nmat', 'cmat', 'mat', 'iift', 'mah-mba-cet'], 'cat'],
  [['clat', 'ailet', 'lsat-india', 'slat', 'mh-cet-law'], 'judiciary'],
  [['nid-dat', 'uceed', 'ceed', 'design'], 'design'],
  [['nift'], 'nift'],
  [['nata', 'jee-b-arch', 'jee-b-planning', 'architecture'], 'architecture'],
  [['icar-aieea', 'state-agriculture-entrances'], 'nabard'],
  [['csir-net'], 'research'],
  [['ca-final', 'ca_final'], 'ca-final'],
  [['ca-foundation', 'ca-intermediate'], 'accountancy'],
  [['cs-executive-professional', 'company-secretary'], 'placement'],
  [['service-based-it', 'service based it', 'tcs', 'infosys', 'wipro', 'cognizant', 'accenture'], 'placement'],
  [['product-based', 'product based', 'amazon', 'microsoft', 'google', 'flipkart', 'meesho', 'swiggy', 'zomato', 'razorpay', 'phonepe'], 'placement'],
  [['common-preparation', 'dsa-placement-prep', 'dsa and placement prep'], 'coding'],
  [['postal'], 'postal'],
  [['fci'], 'fci'],
];

iconAliasGroups.forEach(([names, iconKey]) => addIconAliases(names, iconKey));

const iconMatchers: Array<[RegExp, string]> = [
  [/\b(upsc|ias|ips|ifs|civil services|cse|capf)\b/, 'upsc'],
  [/\b(nda|cds|afcat|agniveer|ssb|navy|army|air force|coast guard|defence|defense)\b/, 'defence'],
  [/\b(ssc|cgl|chsl|mts|cpo)\b/, 'ssc'],
  [/\b(bank|banking|ibps|sbi po|sbi clerk|rbi|nabard|sebi|lic)\b/, 'banking'],
  [/\b(railway|rrb|ntpc|group d|alp|rpf|metro)\b/, 'railway'],
  [/\b(gate)\b/, 'gate'],
  [/\b(jee|iit jee|engineering entrance)\b/, 'jee'],
  [/\b(neet|medical entrance|mbbs)\b/, 'neet'],
  [/\b(cat|xat|mat|cmat|management)\b/, 'cat'],
  [/\b(clat|law|nlu)\b/, 'clat'],
  [/\b(cuet)\b/, 'cuet'],
  [/\b(ugc net|net jrf|jrf)\b/, 'ugc-net'],
  [/\b(csir net|research)\b/, 'csir-net'],
  [/\b(ctet|tet|teacher)\b/, 'tet'],
  [/\b(police|constable|sub inspector|si exam)\b/, 'defence'],
  [/\b(nursing|pharmacy|gpat|norcet|fmge|ini cet|neet pg|paramedical)\b/, 'medical'],
  [/\b(nift|nid|uceed|ceed|design)\b/, 'design'],
  [/\b(nata|architecture|b arch|b planning)\b/, 'architecture'],
  [/\b(agriculture|veterinary|icar aieea)\b/, 'environment'],
  [/\b(gre)\b/, 'gre'],
  [/\b(gmat)\b/, 'gmat'],
  [/\b(ielts)\b/, 'ielts'],
  [/\b(toefl)\b/, 'toefl'],
  [/\b(sat)\b/, 'sat'],
  [/\b(study abroad|abroad|foreign university|visa|sop)\b/, 'abroad'],
  [/\b(olympiad|scholarship|ntse|kvpy|imo|nso|ieo|nsep|nsec|nseb)\b/, 'scholarship'],
  [/\b(company|placement|private|career|tcs|infosys|wipro|cognizant|accenture|capgemini|hcltech|tech mahindra|ibm|deloitte|amazon|microsoft|google|adobe|oracle|zoho|flipkart|phonepe|razorpay|paytm|goldman sachs|jp morgan|jpmorgan|morgan stanley|barclays|hsbc)\b/, 'placement'],
  [/\b(university|college|iit|nit|iim|aiims|du|bhu|ignou)\b/, 'university'],
  [/\b(cbse|ncert)\b/, 'cbse'],
  [/\b(icse|isc)\b/, 'icse'],
  [/\b(state civil|state service|state exam|public service commission|uppsc|bpsc|mppsc|rpsc|mpsc|tnpsc|kpsc|wbpsc|gpsc|upsssc|rsmssb|bssc)\b/, 'state-exam'],
  [/\b(state board|up board|bseb|mp board|rbse|msbshse|tnbse|kseeb|pseb|hbse)\b/, 'state-board'],
  [/\b(class|grade)\s*(1|2|3|4|5|6|7|8|9|10|11|12)\b/, 'class'],
  [/\b(previous year|pyq|question paper|board paper|paper)\b/, 'pyq'],
  [/\b(sample paper|model paper)\b/, 'sample-paper'],
  [/\b(answer key|marking scheme|solution key)\b/, 'answer-key'],
  [/\b(syllabus|curriculum)\b/, 'syllabus'],
  [/\b(mock|test series|quiz|practice test)\b/, 'mock'],
  [/\b(worksheet|assignment|project)\b/, 'worksheet'],
  [/\b(practical|lab manual)\b/, 'practical'],
  [/\b(formula|formula sheet)\b/, 'formula'],
  [/\b(book|textbook|ncert)\b/, 'book'],
  [/\b(solution|solutions)\b/, 'solution'],
  [/\b(notes|revision|summary)\b/, 'notes'],
  [/\b(current affairs|news|updates|notification|alert)\b/, 'current-affairs'],
  [/\b(strategy|study plan|planner|roadmap|topper)\b/, 'strategy'],
  [/\b(interview|hr|gd|group discussion)\b/, 'interview'],
  [/\b(resume|cv)\b/, 'resume'],
  [/\b(dsa|coding|programming|data structure|algorithm)\b/, 'coding'],
  [/\b(technical|dbms|operating system|os|computer network|cn|oops|cloud)\b/, 'technical'],
  [/\b(physics)\b/, 'physics'],
  [/\b(chemistry)\b/, 'chemistry'],
  [/\b(biology|botany|zoology)\b/, 'biology'],
  [/\b(math|maths|mathematics|quantitative)\b/, 'maths'],
  [/\b(reasoning|logical reasoning)\b/, 'reasoning'],
  [/\b(aptitude|csat)\b/, 'aptitude'],
  [/\b(history|ancient|medieval|modern india|world history)\b/, 'history'],
  [/\b(geography)\b/, 'geography'],
  [/\b(polity|political science|governance|constitution)\b/, 'polity'],
  [/\b(economics|economy)\b/, 'economics'],
  [/\b(accountancy|accounts)\b/, 'accountancy'],
  [/\b(business studies|commerce)\b/, 'commerce'],
  [/\b(environment|ecology)\b/, 'environment'],
  [/\b(art culture|art and culture|fine arts|design)\b/, 'art-culture'],
  [/\b(english)\b/, 'english'],
  [/\b(hindi)\b/, 'hindi'],
  [/\b(sanskrit)\b/, 'sanskrit'],
  [/\b(language|verbal)\b/, 'language'],
];

const iconToneMap: Record<string, StudyCardTone> = {
  abroad: 'cyan',
  accountancy: 'emerald',
  'answer-key': 'cyan',
  aptitude: 'violet',
  'art-culture': 'amber',
  banking: 'emerald',
  biology: 'emerald',
  book: 'emerald',
  'business-studies': 'rose',
  cbse: 'emerald',
  chemistry: 'amber',
  clat: 'amber',
  coding: 'cyan',
  commerce: 'emerald',
  competitive: 'blue',
  'computer-science': 'cyan',
  'current-affairs': 'amber',
  defence: 'indigo',
  economics: 'emerald',
  engineering: 'cyan',
  entrance: 'violet',
  environment: 'emerald',
  gate: 'cyan',
  geography: 'emerald',
  government: 'blue',
  history: 'amber',
  icse: 'cyan',
  jee: 'rose',
  language: 'rose',
  law: 'amber',
  maths: 'violet',
  medical: 'emerald',
  mock: 'indigo',
  neet: 'emerald',
  notes: 'blue',
  placement: 'rose',
  polity: 'blue',
  pyq: 'violet',
  formula: 'violet',
  railway: 'amber',
  reasoning: 'amber',
  scholarship: 'amber',
  school: 'emerald',
  'school-board': 'emerald',
  science: 'blue',
  ssc: 'violet',
  'state-exam': 'amber',
  strategy: 'amber',
  'state-board': 'emerald',
  practical: 'cyan',
  'question-paper': 'violet',
  solution: 'rose',
  'book-solution': 'rose',
  syllabus: 'amber',
  university: 'cyan',
  upsc: 'blue',
  'upsc-cse': 'blue',
  visa: 'cyan',
  worksheet: 'cyan',
  nda: 'indigo',
  cds: 'indigo',
  shield: 'indigo',
  gear: 'cyan',
  wrench: 'cyan',
  forest: 'emerald',
  'ssc-cgl': 'violet',
  'ssc-chsl': 'violet',
  'ssc-gd': 'indigo',
  police: 'indigo',
  sbi: 'emerald',
  bank: 'emerald',
  rbi: 'emerald',
  nabard: 'emerald',
  sebi: 'emerald',
  epfo: 'emerald',
  'rrb-ntpc': 'amber',
  metro: 'amber',
  'coast-guard': 'indigo',
  'ib-acio': 'indigo',
  ssb: 'rose',
  teacher: 'emerald',
  judiciary: 'amber',
  isro: 'blue',
  research: 'blue',
  nuclear: 'blue',
  oil: 'cyan',
  bhel: 'cyan',
  bel: 'cyan',
  power: 'cyan',
  postal: 'blue',
  gpat: 'emerald',
  ayush: 'emerald',
  'bio-research': 'emerald',
  nift: 'rose',
  architecture: 'cyan',
  'ca-final': 'emerald',
  fci: 'amber',
};

const getIconKey = (name: string, fallback = 'folder') => {
  const key = normalizeNameKey(name);
  const alias = iconKeyAliases.get(key);
  if (alias) return alias;
  const match = iconMatchers.find(([pattern]) => pattern.test(key));
  return match ? match[1] : fallback;
};

const getTone = (name: string, fallback: StudyCardTone = 'blue'): StudyCardTone => {
  const iconKey = getIconKey(name, '');
  return iconToneMap[iconKey] || fallback;
};

const getBranchOrder = (name: string) => {
  const key = normalizeNameKey(name);
  const classMatch = key.match(/^class\s+(\d{1,2})$/);
  if (classMatch) return 100 + Number(classMatch[1]);

  const exactOrder = new Map<string, number>([
    ['competitive exams', 10],
    ['entrance exams', 20],
    ['school boards', 30],
    ['state exams', 40],
    ['placement and private', 50],
    ['university exams', 55],
    ['study abroad', 60],
    ['foreign language', 65],
    ['college', 70],
    ['olympiads and scholarships', 45],
    ['government jobs', 10],
    ['companies', 10],
    ['service based', 10],
    ['product based', 20],
    ['finance', 30],
    ['analytics and consulting', 40],
    ['core technical companies', 50],
    ['common resources', 60],
    ['about', 5],
    ['upsc', 10],
    ['gate', 20],
    ['ssc', 30],
    ['banking', 40],
    ['railway', 50],
    ['defence', 60],
    ['jee', 10],
    ['neet', 20],
    ['cuet', 30],
    ['cat', 40],
    ['ncert', 10],
    ['cbse', 20],
    ['icse isc', 30],
    ['state boards', 40],
    ['roles', 10],
    ['eligibility', 20],
    ['selection process', 30],
    ['dsa sheets', 10],
    ['aptitude books', 20],
    ['cs fundamentals', 30],
    ['hr and soft skills', 40],
    ['interview tips', 50],
    ['overview', 5],
    ['board pattern', 8],
    ['syllabus', 10],
    ['ncert books', 20],
    ['textbooks', 20],
    ['board textbooks', 20],
    ['ncert solutions', 30],
    ['study material', 40],
    ['revision notes', 50],
    ['notes', 50],
    ['previous year papers', 60],
    ['sample papers', 70],
    ['practice questions', 80],
    ['important questions', 85],
    ['ncert exemplar', 90],
    ['formula sheets', 95],
    ['answer keys', 100],
    ['marking schemes', 105],
    ['updates', 110],
    ['strategy', 120],
    ['interview', 130],
  ]);
  const exact = exactOrder.get(key);
  if (exact) return exact;

  const order = [
    'syllabus',
    'previous year papers',
    'study material',
    'ncert books',
    'books',
    'mock tests',
    'practice',
    'answer keys',
    'updates',
    'strategy',
    'interview',
  ];
  const index = order.findIndex((item) => key === item || key.includes(item));
  if (index >= 0) return (index + 1) * 10;
  if (/^\d{4}$/.test(name)) return Math.max(10, 2200 - Number(name));
  return 500;
};

const parentQuery = (parentId: Types.ObjectId | null) => parentId ? parentId : null;

const siblingCache = new Map<string, CardDoc>();

const siblingCacheKey = (parentId: Types.ObjectId | null | undefined, slug: string) =>
  `${parentId ? String(parentId) : 'root'}::${slug}`;

const cacheSibling = (card: CardDoc) => {
  siblingCache.set(siblingCacheKey(card.parentId || null, card.slug), card);
};

const removeCachedSibling = (card: CardDoc) => {
  siblingCache.delete(siblingCacheKey(card.parentId || null, card.slug));
};

const primeSiblingCache = async (workspaceId: Types.ObjectId) => {
  siblingCache.clear();
  const cards = await StudyCard.find({ workspaceId }).select(
    'workspaceId parentId name slug iconKey tone goalType order visibility status iconUrl files'
  );
  cards.forEach(cacheSibling);
  logStep(`cached ${cards.length} study cards`);
};

const findSibling = async (workspaceId: Types.ObjectId, parentId: Types.ObjectId | null, names: string[]) => {
  const slugs = Array.from(new Set(names.map((name) => slugify(name)).filter(Boolean)));
  for (const slug of slugs) {
    const cached = siblingCache.get(siblingCacheKey(parentId, slug));
    if (cached) return cached;
  }
  const card = await StudyCard.findOne({
    workspaceId,
    parentId: parentQuery(parentId),
    slug: { $in: slugs },
  });
  if (card) cacheSibling(card);
  return card;
};

const truncateField = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string') return value;
  if (value.length <= maxLength) return value;
  return value.slice(0, Math.max(0, maxLength - 1)).trim();
};

const sanitizeFilePayload = (file: any) => {
  if (!file) return file;
  const payload = file.toObject ? file.toObject() : { ...file };
  return {
    ...payload,
    name: truncateField(payload.name, 180),
    url: truncateField(payload.url, 900),
    thumbnailUrl: truncateField(payload.thumbnailUrl, 900),
    mimeType: truncateField(payload.mimeType, 120),
    publicId: truncateField(payload.publicId, 220),
    resourceType: truncateField(payload.resourceType, 40),
    stage: truncateField(payload.stage, 80),
    paper: truncateField(payload.paper, 100),
    subject: truncateField(payload.subject, 120),
    topic: truncateField(payload.topic, 140),
    sourceName: truncateField(payload.sourceName, 120),
    notes: truncateField(payload.notes, 600),
  };
};

const sanitizeCardFiles = (card: CardDoc) => {
  if (!card.files?.length) return;
  card.files = card.files.map(sanitizeFilePayload);
};

const ensureCard = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  name: string,
  options: {
    aliases?: string[];
    goalType?: StudyCardGoalType;
    iconKey?: string;
    tone?: StudyCardTone;
    order?: number;
    status?: 'published' | 'draft';
    iconUrl?: string;
  } = {}
) => {
  const displayName = compactName(name);
  const card = await findSibling(workspaceId, parentId, [displayName, ...(options.aliases || [])]);
  const nextIconUrl = options.iconUrl || getCompanyLogoUrl(displayName);
  const nextPayload = {
    workspaceId,
    parentId,
    name: displayName,
    slug: slugify(displayName),
    iconKey: options.iconKey || getIconKey(displayName),
    tone: options.tone || getTone(displayName),
    goalType: options.goalType || 'resource_folder',
    order: options.order ?? getBranchOrder(displayName),
    visibility: 'public',
    ...(nextIconUrl ? { iconUrl: nextIconUrl } : {}),
  };

  if (!card) {
    try {
      const created = await StudyCard.create({
        ...nextPayload,
        status: options.status || 'draft',
        files: [],
      });
      cacheSibling(created);
      stats.created += 1;
      return created;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      const duplicate = await StudyCard.findOne({
        workspaceId,
        parentId: parentQuery(parentId),
        slug: nextPayload.slug,
      });
      if (!duplicate) throw error;
      removeCachedSibling(duplicate);
      duplicate.set({ ...nextPayload, status: options.status || 'published' });
      await duplicate.save();
      cacheSibling(duplicate);
      stats.styled += 1;
      return duplicate;
    }
  }

  const nextStatus = card.status === 'archived' ? (options.status || 'published') : (options.status || card.status);
  const changed =
    card.name !== nextPayload.name ||
    card.slug !== nextPayload.slug ||
    String(card.parentId || '') !== String(parentId || '') ||
    card.iconKey !== nextPayload.iconKey ||
    card.tone !== nextPayload.tone ||
    card.goalType !== nextPayload.goalType ||
    card.order !== nextPayload.order ||
    (Boolean(nextIconUrl) && card.iconUrl !== nextIconUrl) ||
    card.status !== nextStatus ||
    card.visibility !== 'public';

  if (changed) {
    removeCachedSibling(card);
    sanitizeCardFiles(card);
    card.set({ ...nextPayload, status: nextStatus });
    await card.save();
    cacheSibling(card);
    stats.styled += 1;
  }
  return card;
};

const getChildren = (workspaceId: Types.ObjectId, parentId: Types.ObjectId) =>
  StudyCard.find({ workspaceId, parentId, status: { $ne: 'archived' } }).sort({ order: 1, name: 1 });

const mergeFiles = (target: CardDoc, source: CardDoc) => {
  const existingKeys = new Set((target.files || []).map((file: any) => `${file.url || ''}|${normalizeNameKey(file.name || '')}`));
  let moved = 0;
  for (const file of source.files || []) {
    const payload = sanitizeFilePayload(file);
    const key = `${payload.url || ''}|${normalizeNameKey(payload.name || '')}`;
    if (existingKeys.has(key)) continue;
    target.files.push(payload);
    existingKeys.add(key);
    moved += 1;
  }
  source.files = [];
  return moved;
};

const archiveCard = async (card: CardDoc) => {
  removeCachedSibling(card);
  sanitizeCardFiles(card);
  card.status = 'archived';
  card.visibility = 'private';
  try {
    await card.save();
  } catch (error) {
    if (!isDocumentNotFoundError(error)) throw error;
    return;
  }
  cacheSibling(card);
  stats.archived += 1;
};

const moveOrMergeCard = async (
  workspaceId: Types.ObjectId,
  source: CardDoc,
  targetParentId: Types.ObjectId | null,
  targetName = source.name,
  options: Partial<Pick<KitDefinition, 'goalType' | 'iconKey' | 'tone'>> & { order?: number; iconUrl?: string } = {}
) => {
  if (targetParentId && String(targetParentId) === String(source._id)) return source;
  const nextName = compactName(targetName);
  const nextIconUrl = options.iconUrl || getCompanyLogoUrl(nextName);
  const duplicate = await findSibling(workspaceId, targetParentId, [nextName]);

  if (duplicate && String(duplicate._id) !== String(source._id)) {
    mergeFiles(duplicate, source);
    duplicate.status = duplicate.status === 'archived' ? 'published' : duplicate.status;
    duplicate.visibility = 'public';
    duplicate.iconKey = options.iconKey || getIconKey(nextName, duplicate.iconKey);
    if (nextIconUrl) duplicate.iconUrl = nextIconUrl;
    duplicate.tone = options.tone || getTone(nextName, duplicate.tone);
    duplicate.goalType = options.goalType || duplicate.goalType || 'resource_folder';
    sanitizeCardFiles(duplicate);
    removeCachedSibling(duplicate);
    await duplicate.save();
    cacheSibling(duplicate);

    const children = await getChildren(workspaceId, source._id as Types.ObjectId);
    for (const child of children) {
      if (String(child._id) === String(duplicate._id)) continue;
      await moveOrMergeCard(workspaceId, child, duplicate._id as Types.ObjectId, compactName(child.name));
    }

    await archiveCard(source);
    stats.merged += 1;
    return duplicate;
  }

  const nextSlug = slugify(nextName);
  const nextIcon = options.iconKey || getIconKey(nextName, source.iconKey);
  const nextTone = options.tone || getTone(nextName, source.tone);
  const nextGoalType = options.goalType || source.goalType || 'resource_folder';
  const nextOrder = options.order ?? getBranchOrder(nextName);
  const changed =
    source.name !== nextName ||
    source.slug !== nextSlug ||
    String(source.parentId || '') !== String(targetParentId || '') ||
    source.iconKey !== nextIcon ||
    (Boolean(nextIconUrl) && source.iconUrl !== nextIconUrl) ||
    source.tone !== nextTone ||
    source.goalType !== nextGoalType ||
    source.order !== nextOrder;

  if (changed) {
    const wasMoved = String(source.parentId || '') !== String(targetParentId || '');
    const previousParentId = source.parentId || null;
    const previousName = source.name;
    const previousSlug = source.slug;
    removeCachedSibling(source);
    sanitizeCardFiles(source);
    source.set({
      parentId: targetParentId,
      name: nextName,
      slug: nextSlug,
      iconKey: nextIcon,
      ...(nextIconUrl ? { iconUrl: nextIconUrl } : {}),
      tone: nextTone,
      goalType: nextGoalType,
      order: nextOrder,
      status: source.status === 'archived' ? 'published' : source.status,
      visibility: 'public',
    });
    try {
      await source.save();
      cacheSibling(source);
      stats[wasMoved ? 'moved' : 'renamed'] += 1;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      const duplicateAfterSave = await StudyCard.findOne({
        workspaceId,
        parentId: parentQuery(targetParentId),
        slug: nextSlug,
        _id: { $ne: source._id },
      });
      if (!duplicateAfterSave) throw error;

      mergeFiles(duplicateAfterSave, source);
      duplicateAfterSave.status = duplicateAfterSave.status === 'archived' ? 'published' : duplicateAfterSave.status;
      duplicateAfterSave.visibility = 'public';
      duplicateAfterSave.iconKey = nextIcon;
      if (nextIconUrl) duplicateAfterSave.iconUrl = nextIconUrl;
      duplicateAfterSave.tone = nextTone;
      duplicateAfterSave.goalType = nextGoalType;
      duplicateAfterSave.order = nextOrder;
      sanitizeCardFiles(duplicateAfterSave);
      removeCachedSibling(duplicateAfterSave);
      await duplicateAfterSave.save();
      cacheSibling(duplicateAfterSave);

      const children = await getChildren(workspaceId, source._id as Types.ObjectId);
      for (const child of children) {
        if (String(child._id) === String(duplicateAfterSave._id)) continue;
        await moveOrMergeCard(workspaceId, child, duplicateAfterSave._id as Types.ObjectId, compactName(child.name));
      }

      source.set({
        parentId: previousParentId,
        name: previousName,
        slug: previousSlug,
        status: 'archived',
        visibility: 'private',
      });
      sanitizeCardFiles(source);
      try {
        await source.save();
        cacheSibling(source);
        stats.archived += 1;
      } catch (error) {
        if (!isDocumentNotFoundError(error)) throw error;
      }
      stats.merged += 1;
      return duplicateAfterSave;
    }
  }
  return source;
};

const ensurePath = async (
  workspaceId: Types.ObjectId,
  parts: string[],
  rootGoalType: StudyCardGoalType,
  rootIconKey: string,
  rootTone: StudyCardTone
) => {
  let parentId: Types.ObjectId | null = null;
  let current: CardDoc | null = null;
  for (const [index, part] of parts.entries()) {
    const rootKey = normalizeNameKey(parts[0]);
    const partKey = normalizeNameKey(part);
    const isLeaf = index === parts.length - 1;
    let goalType: StudyCardGoalType = isLeaf
      ? rootGoalType
      : index === 0
        ? 'exam_category'
        : 'exam_family';
    if (rootKey === 'school boards' && index === 1) goalType = 'board';
    let iconKey = isLeaf ? rootIconKey : 'heading';
    let tone = isLeaf ? rootTone : 'indigo';
    if (rootKey === 'placement and private') {
      if (index === 0) {
        goalType = 'exam_category';
        iconKey = 'placement';
        tone = 'rose';
      } else if (['service based it', 'product based', 'common preparation'].includes(partKey)) {
        goalType = isLeaf ? rootGoalType : 'exam_family';
        iconKey = partKey === 'common preparation' ? 'coding' : 'placement';
        tone = partKey === 'product based' ? 'cyan' : partKey === 'common preparation' ? 'violet' : 'rose';
      } else if (['companies', 'service based', 'finance', 'analytics and consulting', 'core technical companies', 'common resources'].includes(partKey)) {
        goalType = isLeaf ? rootGoalType : 'exam_family';
        iconKey = 'placement';
        tone = partKey === 'finance' ? 'emerald' : 'rose';
      }
    }
    if (rootKey === 'state exams') {
      if (index === 0) {
        goalType = 'exam_category';
        iconKey = 'state-exam';
        tone = 'amber';
      } else if (!isLeaf) {
        goalType = 'exam_family';
        iconKey = 'state-exam';
        tone = 'amber';
      }
    }
    if (rootKey === 'school boards') {
      if (index === 0) {
        goalType = 'exam_category';
        iconKey = 'school-board';
        tone = 'emerald';
      } else if (partKey === 'ncert books' || partKey === 'ncert books and solutions') {
        goalType = isLeaf ? rootGoalType : 'resource_folder';
        iconKey = 'book';
        tone = 'amber';
      } else if (partKey === 'ncert' || partKey === 'cbse') {
        goalType = isLeaf ? rootGoalType : 'board';
        iconKey = 'cbse';
        tone = 'emerald';
      } else if (partKey === 'icse isc') {
        goalType = isLeaf ? rootGoalType : 'board';
        iconKey = 'icse';
        tone = 'cyan';
      } else if (partKey === 'state boards') {
        goalType = isLeaf ? rootGoalType : 'board';
        iconKey = 'state-board';
        tone = 'emerald';
      } else if (partKey === 'olympiads' || partKey === 'scholarships' || partKey === 'olympiads and scholarships') {
        goalType = isLeaf ? rootGoalType : 'exam_family';
        iconKey = 'scholarship';
        tone = 'amber';
      }
    }

    current = await ensureCard(workspaceId, parentId, part, {
      goalType,
      iconKey,
      tone,
      order: getBranchOrder(part),
      status: 'published',
    });
    parentId = current._id as Types.ObjectId;
  }
  if (!current) throw new Error(`Empty path: ${parts.join(' / ')}`);
  return current;
};

const ensureBranch = async (workspaceId: Types.ObjectId, parent: CardDoc, branch: string[]) => {
  let parentId = parent._id as Types.ObjectId;
  for (const [index, part] of branch.entries()) {
    const name = compactName(part);
    const card = await ensureCard(workspaceId, parentId, name, {
      goalType: 'resource_folder',
      iconKey: getIconKey(name),
      tone: getTone(name),
      order: getBranchOrder(name) + index,
      status: 'published',
    });
    parentId = card._id as Types.ObjectId;
  }
};

const commonExamBranches = [
  ['Syllabus'],
  ['Previous Year Papers'],
  ['Study Material'],
  ['Mock Tests'],
  ['Answer Keys'],
  ['Updates'],
];

const compactGovernmentBranches = [
  ['Syllabus'],
  ['Previous Year Papers', 'Prelims'],
  ['Previous Year Papers', 'Mains'],
  ['Study Material', 'GS'],
  ['Study Material', 'Aptitude'],
  ['Mock Tests'],
  ['Answer Keys'],
  ['Updates'],
  ['Interview'],
];

const upscBranches = [
  ['Syllabus'],
  ['Previous Year Papers', 'Prelims'],
  ['Previous Year Papers', 'Mains'],
  ['Previous Year Papers', 'Interview'],
  ['Study Material', 'History'],
  ['Study Material', 'Geography'],
  ['Study Material', 'Polity'],
  ['Study Material', 'Economy'],
  ['Study Material', 'Environment'],
  ['Study Material', 'Science & Tech'],
  ['Study Material', 'CSAT'],
  ['Study Material', 'Current Affairs'],
  ['Mock Tests', 'Prelims'],
  ['Mock Tests', 'Mains'],
  ['Answer Keys'],
  ['Updates'],
  ['Strategy'],
  ['Interview'],
];

const gateBranches = [
  ['Syllabus'],
  ['Previous Year Papers'],
  ['Study Material', 'Core Subjects'],
  ['Study Material', 'Engineering Maths'],
  ['Study Material', 'Aptitude'],
  ['Mock Tests'],
  ['Answer Keys'],
  ['Updates'],
];

const schoolBranches = [
  ['Syllabus'],
  ['Textbooks'],
  ['Notes'],
  ['Sample Papers'],
  ['Previous Year Papers'],
  ['Practice'],
];

const servicePlacementCompanies: string[] = [];
const productPlacementCompanies: string[] = [];
const financePlacementCompanies: string[] = [];
const upscExamNames = ['UPSC CSE', 'UPSC CAPF', 'NDA', 'CDS', 'UPSC IFoS', 'UPSC IES', 'UPSC Geo-Scientist'];
const sscExamNames = ['SSC CGL', 'SSC CHSL', 'SSC GD', 'SSC MTS', 'SSC CPO', 'SSC JE', 'SSC Stenographer', 'SSC JHT', 'SSC Selection Post'];
const bankingExamNames = [
  'IBPS PO',
  'IBPS Clerk',
  'IBPS RRB PO',
  'IBPS RRB Clerk',
  'IBPS SO',
  'SBI PO',
  'SBI Clerk',
  'RBI Grade B',
  'RBI Assistant',
  'NABARD',
  'SEBI Grade A',
  'SIDBI',
  'LIC AAO',
  'LIC ADO',
  'LIC Assistant',
  'IRDAI AM',
  'NIACL',
  'GIC AO',
  'ECGC PO',
];
const railwayExamNames = ['RRB NTPC', 'RRB Group D', 'RRB ALP', 'RRB JE', 'RPF SI', 'RPF Constable', 'RRC Apprentice', 'DMRC'];
const defenceExamNames = ['AFCAT', 'Agniveer Army', 'Agniveer Navy', 'Agniveer Air Force', 'Indian Navy', 'Indian Army', 'Coast Guard', 'BSF', 'CRPF', 'CISF', 'ITBP', 'SSB'];
const judiciaryExamNames = ['Civil Judge', 'Delhi Judicial Service', 'UP PCS-J', 'Bihar Judicial Service', 'AIBE', 'Bare Acts', 'Case Laws'];
const scienceResearchExamNames = ['ISRO', 'DRDO RAC', 'DRDO CEPTAM', 'BARC OCES', 'BARC DGFS', 'ICAR JRF', 'ICAR ARS', 'CSIR NET', 'ICMR JRF', 'IMD Scientist', 'Indian Statistical Service', 'CDAC', 'NIELIT'];
// PSU companies live inside the detailed Engineering Services & PSU kits.
// Keeping old company-level kits here creates deep duplicate paths after root migration.
const engineeringPsuExamNames: string[] = [];
const stateBoardNames = [
  'UP Board',
  'Bihar Board',
  'MP Board',
  'Rajasthan Board',
  'Maharashtra Board',
  'Tamil Nadu Board',
  'Karnataka Board',
  'AP Board',
  'Telangana Board',
  'West Bengal Board',
  'Gujarat Board',
  'Haryana Board',
  'Punjab Board',
  'Kerala Board',
];
const studyAbroadExamNames = ['GRE', 'GMAT', 'SAT', 'ACT', 'MCAT', 'LSAT', 'USMLE', 'UCAT', 'LNAT', 'GAMSAT'];
const teachingExamNames = ['CTET', 'STET', 'DSSSB', 'KVS', 'NVS', 'Super TET', 'REET', 'HTET', 'UPTET', 'UGC NET'];
const policeExamNames = ['Delhi Police Constable', 'State Police Constable', 'State Police SI', 'UP Police Constable', 'Bihar Police Constable'];
const medicalParamedicalExamNames = ['NEET PG', 'INI CET', 'FMGE', 'AIIMS NORCET', 'GPAT', 'Nursing Entrance'];
const lawEntranceExamNames = ['CLAT', 'AILET', 'LSAT India', 'SLAT', 'MH CET Law'];
const designArchitectureExamNames = ['NID DAT', 'NIFT', 'UCEED', 'CEED', 'NATA', 'JEE B.Arch', 'JEE B.Planning'];
const managementExamNames = ['XAT', 'MAT', 'CMAT', 'SNAP', 'NMAT', 'IIFT', 'MAH MBA CET'];
const universityPgExamNames = ['CUET PG', 'IIT JAM', 'JEST', 'TIFR GS'];
const agricultureVeterinaryExamNames = ['ICAR AIEEA UG', 'ICAR AIEEA PG', 'Veterinary Entrance'];

const premiumPlacementExecutiveBranches = [
  ['Start Here', 'Company Snapshot'],
  ['Start Here', 'Role Tracks'],
  ['Start Here', 'Round Wise Playbook'],
  ['Start Here', 'Daily Drill Sheet'],
  ['Previous Year Papers', 'Difficulty Wise Sets'],
  ['Previous Year Papers', 'Timed Practice Sets'],
  ['Study Material', 'Premium Handbook'],
  ['Study Material', 'Mini Projects'],
  ['Interview', 'Project Deep Dive'],
  ['Interview', 'Communication Scripts'],
  ['Resume', 'Portfolio Checklist'],
  ['Strategy', 'Interview Day Checklist'],
  ['Strategy', 'Offer HR Negotiation'],
];

const servicePlacementBranches = [
  ['Start Here', 'Premium Roadmap'],
  ['Start Here', 'Weekly Study Plan'],
  ['Start Here', 'Progress Tracker'],
  ...premiumPlacementExecutiveBranches,
  ['About', 'Roles'],
  ['About', 'Eligibility'],
  ['About', 'Selection Process'],
  ['Syllabus', 'Aptitude'],
  ['Syllabus', 'Coding'],
  ['Syllabus', 'Technical Interview'],
  ['Previous Year Papers', 'Aptitude Questions'],
  ['Previous Year Papers', 'Coding Questions'],
  ['Previous Year Papers', 'Interview Experiences'],
  ['Previous Year Papers', 'Topic Wise Practice'],
  ['Previous Year Papers', 'Solutions'],
  ['Previous Year Papers', 'Answer Keys'],
  ['Study Material', 'Quantitative Aptitude'],
  ['Study Material', 'Logical Reasoning'],
  ['Study Material', 'Verbal Ability'],
  ['Study Material', 'Programming Logic'],
  ['Study Material', 'CS Fundamentals'],
  ['Study Material', 'Formula Sheets'],
  ['Study Material', 'Revision Notes'],
  ['Study Material', 'Cheat Sheets'],
  ['Aptitude', 'Quant'],
  ['Aptitude', 'Reasoning'],
  ['Aptitude', 'Verbal'],
  ['Coding', 'Practice'],
  ['Coding', 'Solved Programs'],
  ['Technical', 'CS Fundamentals'],
  ['Interview', 'Technical Q&A'],
  ['Interview', 'HR Q&A'],
  ['Interview', 'Managerial Round'],
  ['Resume', 'ATS Format'],
  ['Resume', 'Project Bullet Bank'],
  ['Practice', 'Mock Tests'],
  ['Strategy', 'Mistake Tracker'],
];

const productPlacementBranches = [
  ['Start Here', 'Premium Roadmap'],
  ['Start Here', 'Weekly Study Plan'],
  ['Start Here', 'Progress Tracker'],
  ...premiumPlacementExecutiveBranches,
  ['About', 'Roles'],
  ['About', 'Eligibility'],
  ['About', 'Hiring Process'],
  ['Syllabus', 'DSA'],
  ['Syllabus', 'CS Fundamentals'],
  ['Syllabus', 'System Design'],
  ['Previous Year Papers', 'Online Assessment'],
  ['Previous Year Papers', 'Coding Interview'],
  ['Previous Year Papers', 'Interview Experiences'],
  ['Previous Year Papers', 'Topic Wise Practice'],
  ['Previous Year Papers', 'Solutions'],
  ['Previous Year Papers', 'Answer Keys'],
  ['Study Material', 'DSA Patterns'],
  ['Study Material', 'CS Fundamentals'],
  ['Study Material', 'OOP LLD'],
  ['Study Material', 'HLD System Design'],
  ['Study Material', 'Formula Sheets'],
  ['Study Material', 'Revision Notes'],
  ['Study Material', 'Cheat Sheets'],
  ['DSA', 'Practice'],
  ['DSA', 'Company Tagged Problems'],
  ['DSA', 'Solved Patterns'],
  ['Coding', 'Interview Problems'],
  ['Technical', 'CS Fundamentals'],
  ['System Design'],
  ['Interview', 'Technical Deep Dive'],
  ['Interview', 'Behavioral STAR'],
  ['Interview', 'Hiring Manager Round'],
  ['Resume', 'Product Resume'],
  ['Resume', 'Project Bullet Bank'],
  ['Practice', 'Mock Tests'],
  ['Strategy', 'Mistake Tracker'],
];

const financePlacementBranches = [
  ['Start Here', 'Premium Roadmap'],
  ['Start Here', 'Weekly Study Plan'],
  ['Start Here', 'Progress Tracker'],
  ...premiumPlacementExecutiveBranches,
  ['About', 'Roles'],
  ['About', 'Eligibility'],
  ['Syllabus', 'Aptitude'],
  ['Syllabus', 'Finance Basics'],
  ['Previous Year Papers', 'Aptitude Questions'],
  ['Previous Year Papers', 'Interview Experiences'],
  ['Previous Year Papers', 'Solutions'],
  ['Previous Year Papers', 'Answer Keys'],
  ['Study Material', 'Quantitative Aptitude'],
  ['Study Material', 'Reasoning'],
  ['Study Material', 'Finance Basics'],
  ['Study Material', 'Revision Notes'],
  ['Study Material', 'Cheat Sheets'],
  ['Aptitude', 'Quant'],
  ['Aptitude', 'Reasoning'],
  ['Technical', 'Finance Basics'],
  ['Interview', 'Technical Q&A'],
  ['Interview', 'HR Q&A'],
  ['Resume', 'ATS Format'],
  ['Practice', 'Mock Tests'],
  ['Strategy', 'Mistake Tracker'],
];

const stateBoardBranches = [
  ['Class 10', 'Textbooks'],
  ['Class 10', 'Sample Papers'],
  ['Class 10', 'Previous Year Papers'],
  ['Class 12', 'Textbooks'],
  ['Class 12', 'Sample Papers'],
  ['Class 12', 'Previous Year Papers'],
  ['Updates'],
];

const studyAbroadBranches = [
  ['Syllabus'],
  ['Practice'],
  ['Previous Year Papers'],
  ['Vocabulary'],
  ['Writing'],
  ['Speaking'],
  ['Study Guides'],
  ['Updates'],
];

const foreignLanguageBranches = [
  ['Grammar'],
  ['Vocabulary'],
  ['Reading'],
  ['Writing'],
  ['Speaking'],
  ['Practice'],
  ['Certificates'],
];

const olympiadBranches = [
  ['Syllabus'],
  ['Previous Year Papers'],
  ['Study Material'],
  ['Practice'],
  ['Mock Tests'],
  ['Answer Keys'],
  ['Updates'],
];

const teachingBranches = [
  ['Syllabus'],
  ['Previous Year Papers'],
  ['Study Material', 'Paper 1'],
  ['Study Material', 'Subject'],
  ['Study Material', 'Pedagogy'],
  ['Mock Tests'],
  ['Answer Keys'],
  ['Updates'],
];

const policeBranches = [
  ['Syllabus'],
  ['Previous Year Papers'],
  ['Study Material', 'GK'],
  ['Study Material', 'Maths'],
  ['Study Material', 'Reasoning'],
  ['Physical Test'],
  ['Mock Tests'],
  ['Answer Keys'],
  ['Updates'],
];

const medicalBranches = [
  ['Syllabus'],
  ['Previous Year Papers'],
  ['Study Material', 'Subject'],
  ['Mock Tests'],
  ['Answer Keys'],
  ['Counselling'],
  ['Updates'],
];

const lawEntranceBranches = [
  ['Syllabus'],
  ['Previous Year Papers'],
  ['Study Material', 'Legal Reasoning'],
  ['Study Material', 'GK'],
  ['Study Material', 'English'],
  ['Study Material', 'Logical Reasoning'],
  ['Mock Tests'],
  ['Updates'],
];

const designArchitectureBranches = [
  ['Syllabus'],
  ['Previous Year Papers'],
  ['Study Material', 'Aptitude'],
  ['Study Material', 'Drawing'],
  ['Portfolio'],
  ['Mock Tests'],
  ['Updates'],
];

const managementBranches = [
  ['Syllabus'],
  ['Previous Year Papers'],
  ['Study Material', 'VARC'],
  ['Study Material', 'DILR'],
  ['Study Material', 'Quant'],
  ['Mock Tests'],
  ['GDPI'],
  ['Updates'],
];

const universityPgBranches = [
  ['Syllabus'],
  ['Previous Year Papers'],
  ['Study Material'],
  ['Mock Tests'],
  ['Answer Keys'],
  ['Counselling'],
  ['Updates'],
];

const agricultureBranches = [
  ['Syllabus'],
  ['Previous Year Papers'],
  ['Study Material', 'Agriculture'],
  ['Study Material', 'Biology'],
  ['Study Material', 'Chemistry'],
  ['Mock Tests'],
  ['Updates'],
];

const universityExamBranches = [
  ['Central Universities'],
  ['State Universities'],
  ['IITs / NITs / IIITs'],
  ['IIMs'],
  ['Medical Universities'],
  ['Law Universities'],
  ['Agricultural Universities'],
  ['Open Universities'],
  ['Deemed Universities'],
  ['University Entrance Tests'],
];

const detailedCompetitiveSpecs: DetailedExamSpec[] = [
  {
    category: 'Competitive Exams',
    family: 'UPSC',
    exam: 'UPSC CSE',
    icon: 'upsc_cse',
    aliases: ['Civil Services Examination', 'IAS Exam', 'IPS Exam', 'IFS Exam', 'UPSC Mains', 'UPSC Prelims'],
    branches: [
      'Overview',
      'Official Sources / Syllabus',
      'Official Sources / Previous Year Papers',
      'Syllabus / Prelims / GS Paper I',
      'Syllabus / Prelims / CSAT Paper II',
      'Syllabus / Mains / Essay',
      'Syllabus / Mains / GS Paper I',
      'Syllabus / Mains / GS Paper II',
      'Syllabus / Mains / GS Paper III',
      'Syllabus / Mains / GS Paper IV Ethics',
      'Syllabus / Mains / Optional Subjects',
      'Syllabus / Interview / Personality Test',
      'Previous Year Papers / Prelims / GS Paper I',
      'Previous Year Papers / Prelims / CSAT Paper II',
      'Previous Year Papers / Mains / Essay',
      'Previous Year Papers / Mains / GS Paper I',
      'Previous Year Papers / Mains / GS Paper II',
      'Previous Year Papers / Mains / GS Paper III',
      'Previous Year Papers / Mains / GS Paper IV',
      'Previous Year Papers / Mains / Compulsory Language',
      'Previous Year Papers / Mains / Optional Subjects',
      'Previous Year Papers / Interview',
      'Study Material / Foundation / NCERT',
      'Study Material / Prelims / GS Paper I',
      'Study Material / Prelims / CSAT Paper II',
      'Study Material / Mains / Essay',
      'Study Material / Mains / GS Paper I',
      'Study Material / Mains / GS Paper II',
      'Study Material / Mains / GS Paper III',
      'Study Material / Mains / GS Paper IV Ethics',
      'Study Material / Mains / Optional Subjects',
      'Study Material / Current Affairs / Daily',
      'Study Material / Current Affairs / Monthly',
      'Study Material / Answer Writing',
      'Mock Tests / Prelims',
      'Mock Tests / Mains',
      'Mock Tests / CSAT',
      'Answer Keys',
      'Strategy / 12 Month Plan',
      'Strategy / 6 Month Plan',
      'Strategy / Topper Strategy',
      'Strategy / Booklist',
      'Updates / Notification',
      'Updates / Admit Card',
      'Updates / Result',
      'Updates / Cut-off',
      'Interview / DAF Guide',
      'Interview / Expected Questions',
      'Interview / Real Experiences',
    ],
  },
  {
    category: 'Competitive Exams',
    family: 'UPSC',
    exam: 'NDA',
    icon: 'nda',
    aliases: ['National Defence Academy', 'NDA NA Exam', 'UPSC NDA'],
    branches: [
      'Overview',
      'Syllabus / Mathematics',
      'Syllabus / GAT English',
      'Syllabus / GAT General Knowledge',
      'Previous Year Papers / Mathematics',
      'Previous Year Papers / GAT',
      'Study Material / Mathematics / Algebra',
      'Study Material / Mathematics / Trigonometry',
      'Study Material / Mathematics / Calculus',
      'Study Material / Mathematics / Matrices',
      'Study Material / Mathematics / Statistics',
      'Study Material / Mathematics / Vectors',
      'Study Material / GAT / English',
      'Study Material / GAT / Physics',
      'Study Material / GAT / Chemistry',
      'Study Material / GAT / Biology',
      'Study Material / GAT / History',
      'Study Material / GAT / Geography',
      'Study Material / GAT / Current Affairs',
      'Mock Tests / Full Mock',
      'Mock Tests / Mathematics Only',
      'Mock Tests / GAT Only',
      'Answer Keys',
      'Strategy',
      'Updates',
      'SSB Interview / Stage 1 Screening',
      'SSB Interview / Psychology Tests',
      'SSB Interview / GTO Tasks',
      'SSB Interview / Personal Interview',
      'SSB Interview / Conference',
    ],
  },
  {
    category: 'Competitive Exams',
    family: 'UPSC',
    exam: 'CDS',
    icon: 'cds',
    aliases: ['Combined Defence Services', 'CDS OTA', 'UPSC CDS'],
    branches: [
      'Overview',
      'Syllabus / English',
      'Syllabus / General Knowledge',
      'Syllabus / Mathematics',
      'Previous Year Papers / English',
      'Previous Year Papers / General Knowledge',
      'Previous Year Papers / Mathematics',
      'Study Material / English',
      'Study Material / General Knowledge',
      'Study Material / Mathematics',
      'Mock Tests',
      'Answer Keys',
      'Strategy',
      'Updates',
      'SSB Interview / Stage 1 Screening',
      'SSB Interview / Psychology Tests',
      'SSB Interview / GTO Tasks',
      'SSB Interview / Personal Interview',
    ],
  },
  {
    category: 'Competitive Exams',
    family: 'UPSC',
    exam: 'UPSC CAPF AC',
    icon: 'shield',
    aliases: ['Central Armed Police Forces', 'CAPF Assistant Commandant', 'UPSC CAPF'],
    branches: [
      'Overview',
      'Syllabus / Paper I General Ability',
      'Syllabus / Paper II CSAT Type',
      'Previous Year Papers / Paper I',
      'Previous Year Papers / Paper II',
      'Study Material / General Studies',
      'Study Material / CSAT',
      'Mock Tests',
      'Answer Keys',
      'Strategy',
      'Updates',
      'Physical & Medical Test Guide',
    ],
  },
  {
    category: 'Competitive Exams',
    family: 'UPSC',
    exam: 'IES ESE',
    icon: 'gear',
    aliases: ['Engineering Services Examination', 'Indian Engineering Services', 'UPSC IES', 'UPSC ESE', 'ESE Civil', 'ESE Mechanical', 'ESE Electrical', 'ESE Electronics'],
    branches: [
      'Overview',
      'Syllabus / Civil Engineering',
      'Syllabus / Mechanical Engineering',
      'Syllabus / Electrical Engineering',
      'Syllabus / Electronics & Telecom',
      'Previous Year Papers / Civil Engineering',
      'Previous Year Papers / Mechanical Engineering',
      'Previous Year Papers / Electrical Engineering',
      'Previous Year Papers / Electronics & Telecom',
      'Study Material / Civil Engineering',
      'Study Material / Mechanical Engineering',
      'Study Material / Electrical Engineering',
      'Study Material / Electronics & Telecom',
      'Study Material / General Studies & Engineering Aptitude',
      'Mock Tests',
      'Answer Keys',
      'Strategy',
      'Updates',
      'Interview Prep',
    ],
  },
  {
    category: 'Competitive Exams',
    family: 'UPSC',
    exam: 'IFoS',
    icon: 'forest',
    aliases: ['Indian Forest Service', 'UPSC IFoS', 'Forest Service Exam'],
    branches: ['Overview', 'Syllabus / General English', 'Syllabus / General Knowledge', 'Syllabus / Optional Paper I', 'Syllabus / Optional Paper II', 'Previous Year Papers', 'Study Material', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'SSC',
    exam: 'SSC CGL',
    icon: 'ssc_cgl',
    aliases: ['Combined Graduate Level', 'SSC CGL Tier 1', 'SSC CGL Tier 2', 'Staff Selection Commission CGL'],
    branches: [
      'Overview',
      'Syllabus / Tier I',
      'Syllabus / Tier II Mathematics',
      'Syllabus / Tier II English',
      'Syllabus / Tier II Statistics',
      'Previous Year Papers / Tier I',
      'Previous Year Papers / Tier II Mathematics',
      'Previous Year Papers / Tier II English',
      'Previous Year Papers / Tier II Statistics',
      'Study Material / Quantitative Aptitude / Speed Calculation',
      'Study Material / Quantitative Aptitude / Speed Calculation / Tables 2 to 50',
      'Study Material / Quantitative Aptitude / Speed Calculation / Squares Cubes Triplets',
      'Study Material / Quantitative Aptitude / Speed Calculation / Fractions and Shortcuts',
      'Study Material / Quantitative Aptitude / Speed Calculation / Daily Drill',
      'Study Material / Quantitative Aptitude / Formula Recall',
      'Study Material / Quantitative Aptitude / Number System',
      'Study Material / Quantitative Aptitude / Percentage',
      'Study Material / Quantitative Aptitude / Profit Loss',
      'Study Material / Quantitative Aptitude / Time Work',
      'Study Material / Quantitative Aptitude / Geometry',
      'Study Material / Quantitative Aptitude / Trigonometry',
      'Study Material / Quantitative Aptitude / Data Interpretation',
      'Study Material / Reasoning / Analogy',
      'Study Material / Reasoning / Series',
      'Study Material / Reasoning / Coding Decoding',
      'Study Material / Reasoning / Puzzles',
      'Study Material / Reasoning / Syllogism',
      'Study Material / Reasoning / Pattern Speed Practice',
      'Study Material / English / Reading Comprehension',
      'Study Material / English / Error Detection',
      'Study Material / English / Vocabulary',
      'Study Material / English / Grammar',
      'Study Material / English / Grammar Vocabulary Recall',
      'Study Material / General Awareness / History',
      'Study Material / General Awareness / Geography',
      'Study Material / General Awareness / Polity',
      'Study Material / General Awareness / Economy',
      'Study Material / General Awareness / Science',
      'Study Material / General Awareness / Current Affairs',
      'Study Material / General Awareness / Static GK',
      'Study Material / General Awareness / Map and Static GK',
      'Study Material / General Awareness / Static GK Timeline',
      'Mock Tests / Tier I Full Mock',
      'Mock Tests / Tier II Full Mock',
      'Mock Tests / Topic-wise Tests',
      'Answer Keys',
      'Strategy / Post-wise Guide',
      'Strategy / Topper Strategy',
      'Updates / Notification',
      'Updates / Admit Card',
      'Updates / Result',
      'Updates / Cut-off',
    ],
  },
  {
    category: 'Competitive Exams',
    family: 'SSC',
    exam: 'SSC CHSL',
    icon: 'ssc_chsl',
    aliases: ['Combined Higher Secondary Level', 'SSC CHSL 10+2', 'LDC DEO Exam', 'Postal Assistant Exam'],
    branches: ['Overview', 'Syllabus / Tier I', 'Syllabus / Tier II', 'Previous Year Papers / Tier I', 'Previous Year Papers / Tier II', 'Study Material / Quantitative Aptitude', 'Study Material / Reasoning', 'Study Material / English', 'Study Material / General Awareness', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'SSC',
    exam: 'SSC MTS',
    icon: 'ssc_gd',
    aliases: ['Multi Tasking Staff', 'SSC MTS Non Technical', 'Havaldar Exam'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / Numerical Aptitude', 'Study Material / Reasoning', 'Study Material / English', 'Study Material / General Awareness', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'SSC',
    exam: 'SSC GD Constable',
    icon: 'ssc_gd',
    aliases: ['SSC GD', 'General Duty Constable', 'CISF BSF CRPF Constable via SSC'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / Mathematics', 'Study Material / Reasoning', 'Study Material / Hindi English', 'Study Material / General Knowledge', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Physical Test Guide / Running Standards', 'Physical Test Guide / Height Weight', 'Physical Test Guide / Medical Standards'],
  },
  {
    category: 'Competitive Exams',
    family: 'SSC',
    exam: 'SSC CPO',
    icon: 'police',
    aliases: ['Central Police Organisation', 'SSC SI Delhi Police', 'SSC SI CAPF', 'SSC ASI CISF', 'Sub Inspector Exam'],
    branches: ['Overview', 'Syllabus / Paper I', 'Syllabus / Paper II English', 'Previous Year Papers / Paper I', 'Previous Year Papers / Paper II', 'Study Material / Quantitative Aptitude', 'Study Material / Reasoning', 'Study Material / English', 'Study Material / General Awareness', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Physical & Medical Test Guide'],
  },
  {
    category: 'Competitive Exams',
    family: 'SSC',
    exam: 'SSC JE',
    icon: 'gear',
    aliases: ['Junior Engineer SSC', 'SSC JE Civil', 'SSC JE Electrical', 'SSC JE Mechanical'],
    branches: ['Overview', 'Syllabus / Paper I General', 'Syllabus / Paper II Civil', 'Syllabus / Paper II Electrical', 'Syllabus / Paper II Mechanical', 'Previous Year Papers / Civil', 'Previous Year Papers / Electrical', 'Previous Year Papers / Mechanical', 'Study Material / Civil Engineering', 'Study Material / Electrical Engineering', 'Study Material / Mechanical Engineering', 'Study Material / General Intelligence', 'Study Material / General Awareness', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'SSC',
    exam: 'SSC Stenographer',
    icon: 'ssc_chsl',
    aliases: ['SSC Steno Grade C', 'SSC Steno Grade D', 'Stenographer Exam'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / General Intelligence', 'Study Material / General Awareness', 'Study Material / English', 'Study Material / Stenography Practice', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Skill Test Guide'],
  },
  {
    category: 'Competitive Exams',
    family: 'Banking',
    exam: 'SBI PO',
    icon: 'sbi',
    aliases: ['State Bank of India PO', 'SBI Probationary Officer', 'SBI PO Prelims', 'SBI PO Mains'],
    branches: ['Overview', 'Syllabus / Prelims', 'Syllabus / Mains', 'Previous Year Papers / Prelims', 'Previous Year Papers / Mains', 'Study Material / Quantitative Aptitude / Number Series', 'Study Material / Quantitative Aptitude / Data Interpretation', 'Study Material / Quantitative Aptitude / Quadratic Equations', 'Study Material / Quantitative Aptitude / Word Problems', 'Study Material / Reasoning / Puzzles', 'Study Material / Reasoning / Seating Arrangement', 'Study Material / Reasoning / Syllogism', 'Study Material / Reasoning / Coding Decoding', 'Study Material / English / Reading Comprehension', 'Study Material / English / Error Detection', 'Study Material / English / Para Jumbles', 'Study Material / English / Cloze Test', 'Study Material / Banking Awareness / RBI & Monetary Policy', 'Study Material / Banking Awareness / Banking Terms', 'Study Material / Banking Awareness / Financial Inclusion', 'Study Material / Banking Awareness / Important Acts', 'Study Material / Current Affairs / Monthly', 'Study Material / Computer Knowledge', 'Mock Tests / Prelims Full Mock', 'Mock Tests / Mains Full Mock', 'Mock Tests / Sectional Tests', 'Answer Keys', 'Strategy', 'Updates', 'GD & Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'Banking',
    exam: 'SBI Clerk',
    icon: 'sbi',
    aliases: ['State Bank of India Clerk', 'SBI Junior Associate', 'SBI Clerk Prelims', 'SBI Clerk Mains'],
    branches: ['Overview', 'Syllabus / Prelims', 'Syllabus / Mains', 'Previous Year Papers / Prelims', 'Previous Year Papers / Mains', 'Study Material / Quantitative Aptitude', 'Study Material / Reasoning', 'Study Material / English', 'Study Material / General Financial Awareness', 'Study Material / Computer Knowledge', 'Mock Tests / Prelims Mock', 'Mock Tests / Mains Mock', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Banking',
    exam: 'IBPS PO',
    icon: 'bank',
    aliases: ['Institute of Banking Personnel Selection PO', 'IBPS CRP PO', 'Bank PO Exam'],
    branches: ['Overview', 'Syllabus / Prelims', 'Syllabus / Mains', 'Previous Year Papers / Prelims', 'Previous Year Papers / Mains', 'Study Material / Quantitative Aptitude', 'Study Material / Reasoning', 'Study Material / English', 'Study Material / Data Analysis', 'Study Material / General Economy Banking Awareness', 'Study Material / Computer Knowledge', 'Mock Tests / Prelims Mock', 'Mock Tests / Mains Mock', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'Banking',
    exam: 'IBPS Clerk',
    icon: 'bank',
    aliases: ['IBPS CRP Clerk', 'Bank Clerk Exam', 'Institute of Banking Personnel Selection Clerk'],
    branches: ['Overview', 'Syllabus / Prelims', 'Syllabus / Mains', 'Previous Year Papers / Prelims', 'Previous Year Papers / Mains', 'Study Material / Quantitative Aptitude', 'Study Material / Reasoning', 'Study Material / English', 'Study Material / General Awareness', 'Study Material / Computer Knowledge', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Banking',
    exam: 'IBPS RRB PO',
    icon: 'bank',
    aliases: ['Regional Rural Bank PO', 'IBPS RRB Officer', 'Gramin Bank PO'],
    branches: ['Overview', 'Syllabus / Officer Scale I', 'Syllabus / Officer Scale II', 'Syllabus / Officer Scale III', 'Previous Year Papers / Scale I Prelims', 'Previous Year Papers / Scale I Mains', 'Study Material / Quantitative Aptitude', 'Study Material / Reasoning', 'Study Material / Hindi English', 'Study Material / General Awareness', 'Study Material / Computer Knowledge', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Banking',
    exam: 'IBPS RRB Clerk',
    icon: 'bank',
    aliases: ['Regional Rural Bank Clerk', 'IBPS RRB Office Assistant', 'Gramin Bank Clerk'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / Quantitative Aptitude', 'Study Material / Reasoning', 'Study Material / Hindi English', 'Study Material / General Awareness', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Banking',
    exam: 'IBPS SO',
    icon: 'bank',
    aliases: ['IBPS Specialist Officer', 'Bank IT Officer', 'Bank Agriculture Officer', 'Bank Law Officer'],
    branches: ['Overview', 'Syllabus / IT Officer', 'Syllabus / Agriculture Officer', 'Syllabus / Marketing Officer', 'Syllabus / HR Officer', 'Syllabus / Law Officer', 'Previous Year Papers / IT Officer', 'Previous Year Papers / Agriculture Officer', 'Previous Year Papers / Law Officer', 'Study Material / Professional Knowledge IT', 'Study Material / Professional Knowledge Agriculture', 'Study Material / Professional Knowledge Law', 'Study Material / Reasoning & English', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Banking',
    exam: 'RBI Grade B',
    icon: 'rbi',
    aliases: ['Reserve Bank of India Grade B', 'RBI Officer Grade B', 'RBI DR'],
    branches: ['Overview', 'Syllabus / Phase I', 'Syllabus / Phase II Economic Social Issues', 'Syllabus / Phase II Finance Management', 'Syllabus / Phase II English', 'Previous Year Papers / Phase I', 'Previous Year Papers / Phase II', 'Study Material / Economic & Social Issues', 'Study Material / Finance & Management', 'Study Material / Quantitative Aptitude', 'Study Material / Reasoning', 'Study Material / English', 'Study Material / General Awareness', 'Mock Tests / Phase I Mock', 'Mock Tests / Phase II Mock', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'Banking',
    exam: 'RBI Assistant',
    icon: 'rbi',
    aliases: ['Reserve Bank of India Assistant', 'RBI Assistant Prelims', 'RBI Assistant Mains'],
    branches: ['Overview', 'Syllabus / Prelims', 'Syllabus / Mains', 'Previous Year Papers / Prelims', 'Previous Year Papers / Mains', 'Study Material / Quantitative Aptitude', 'Study Material / Reasoning', 'Study Material / English', 'Study Material / General Awareness', 'Study Material / Computer Knowledge', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Banking',
    exam: 'NABARD Grade A',
    icon: 'nabard',
    aliases: ['National Bank for Agriculture and Rural Development', 'NABARD Assistant Manager', 'NABARD RDBS', 'NABARD Development Assistant'],
    branches: ['Overview', 'Syllabus / Phase I', 'Syllabus / Phase II Economic Social Issues', 'Previous Year Papers', 'Study Material / Economic & Social Issues', 'Study Material / Agriculture & Rural Development', 'Study Material / General Awareness', 'Study Material / English', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Banking',
    exam: 'SEBI Grade A',
    icon: 'sebi',
    aliases: ['Securities and Exchange Board of India', 'SEBI Officer Grade A', 'SEBI Assistant Manager'],
    branches: ['Overview', 'Syllabus / Paper I', 'Syllabus / Paper II', 'Previous Year Papers', 'Study Material / Securities Markets', 'Study Material / Finance & Management', 'Study Material / Law', 'Study Material / Quantitative Aptitude', 'Study Material / English', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'Banking',
    exam: 'LIC AAO',
    icon: 'shield',
    aliases: ['Life Insurance Corporation Assistant Administrative Officer', 'LIC AAO Generalist', 'LIC AAO IT', 'LIC AAO CA'],
    branches: ['Overview', 'Syllabus / Prelims', 'Syllabus / Mains', 'Previous Year Papers / Prelims', 'Previous Year Papers / Mains', 'Study Material / Quantitative Aptitude', 'Study Material / Reasoning', 'Study Material / English', 'Study Material / General Knowledge', 'Study Material / Insurance Awareness', 'Study Material / Computer Knowledge', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'Banking',
    exam: 'LIC ADO',
    icon: 'shield',
    aliases: ['LIC Apprentice Development Officer', 'Life Insurance Corporation ADO'],
    branches: ['Overview', 'Syllabus / Prelims', 'Syllabus / Mains', 'Previous Year Papers', 'Study Material / Quantitative Aptitude', 'Study Material / Reasoning', 'Study Material / English', 'Study Material / General Knowledge', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Banking',
    exam: 'EPFO APFC',
    icon: 'epfo',
    aliases: ['Employees Provident Fund Organisation', 'Assistant Provident Fund Commissioner', 'EPFO Enforcement Officer', 'EPFO Social Security Assistant', 'UPSC EPFO'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / General English', 'Study Material / General Studies', 'Study Material / Quantitative Aptitude', 'Study Material / Reasoning', 'Study Material / Labour Laws & Social Security', 'Study Material / Industrial Relations', 'Study Material / Accounting & Finance', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'Banking',
    exam: 'ESIC SSO',
    icon: 'medical',
    aliases: ['Employee State Insurance Corporation', 'ESIC Social Security Officer', 'ESIC UDC', 'ESIC MTS'],
    branches: ['Overview', 'Syllabus / Prelims', 'Syllabus / Mains', 'Previous Year Papers', 'Study Material / Quantitative Aptitude', 'Study Material / Reasoning', 'Study Material / English', 'Study Material / General Awareness', 'Study Material / Computer Knowledge', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Railway',
    exam: 'RRB NTPC',
    icon: 'rrb_ntpc',
    aliases: ['Railway Recruitment Board NTPC', 'Non Technical Popular Categories', 'RRB NTPC Graduate Level', 'RRB NTPC Undergraduate Level', 'Station Master Exam', 'Goods Guard Exam', 'Commercial Apprentice Exam'],
    branches: ['Overview', 'Syllabus / CBT-1', 'Syllabus / CBT-2', 'Previous Year Papers / CBT-1', 'Previous Year Papers / CBT-2', 'Study Material / Mathematics', 'Study Material / General Intelligence & Reasoning', 'Study Material / General Awareness / Static GK', 'Study Material / General Awareness / Current Affairs', 'Study Material / General Awareness / Railway GK', 'Mock Tests / CBT-1 Full Mock', 'Mock Tests / CBT-2 Full Mock', 'Mock Tests / Topic-wise Tests', 'Answer Keys', 'Strategy', 'Updates', 'Typing Skill Test Guide'],
  },
  {
    category: 'Competitive Exams',
    family: 'Railway',
    exam: 'RRB Group D',
    icon: 'wrench',
    aliases: ['RRC Group D', 'Railway Group D', 'Track Maintainer Exam', 'Helper Railway Exam', 'Level 1 Railway Exam'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / Mathematics', 'Study Material / General Intelligence & Reasoning', 'Study Material / General Science', 'Study Material / General Awareness & Current Affairs', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Physical Efficiency Test Guide', 'Medical Standard Guide'],
  },
  {
    category: 'Competitive Exams',
    family: 'Railway',
    exam: 'RRB JE',
    icon: 'gear',
    aliases: ['Railway Junior Engineer', 'RRB JE Civil', 'RRB JE Electrical', 'RRB JE Mechanical', 'RRB JE IT'],
    branches: ['Overview', 'Syllabus / CBT-1 Common', 'Syllabus / CBT-2 Civil', 'Syllabus / CBT-2 Electrical', 'Syllabus / CBT-2 Electronics', 'Syllabus / CBT-2 Mechanical', 'Syllabus / CBT-2 Computer Science', 'Previous Year Papers / CBT-1', 'Previous Year Papers / CBT-2 Branch-wise', 'Study Material / Civil Engineering', 'Study Material / Electrical Engineering', 'Study Material / Electronics Engineering', 'Study Material / Mechanical Engineering', 'Study Material / Computer Science', 'Study Material / CBT-1 Common Topics', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Railway',
    exam: 'RRB ALP',
    icon: 'rrb_ntpc',
    aliases: ['Assistant Loco Pilot', 'Railway Loco Pilot Exam', 'ALP Technician Exam'],
    branches: ['Overview', 'Syllabus / CBT-1', 'Syllabus / CBT-2 Part A', 'Syllabus / CBT-2 Part B Trade', 'Previous Year Papers / CBT-1', 'Previous Year Papers / CBT-2', 'Study Material / Mathematics', 'Study Material / Physics', 'Study Material / Basic Electricity', 'Study Material / Engineering Drawing', 'Study Material / General Science', 'Study Material / Current Affairs', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'CBAT Guide'],
  },
  {
    category: 'Competitive Exams',
    family: 'Railway',
    exam: 'RPF Constable SI',
    icon: 'police',
    aliases: ['Railway Protection Force', 'RPF Sub Inspector', 'RPF Constable', 'RPSF Constable'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers / SI', 'Previous Year Papers / Constable', 'Study Material / General Awareness', 'Study Material / Arithmetic', 'Study Material / General Intelligence & Reasoning', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Physical Standard Test Guide', 'Medical Test Guide'],
  },
  {
    category: 'Competitive Exams',
    family: 'Railway',
    exam: 'Metro Rail Exams',
    icon: 'metro',
    aliases: ['DMRC', 'Delhi Metro Rail Corporation', 'BMRCL', 'Bangalore Metro', 'CMRL Chennai Metro', 'Metro Rail Recruitment'],
    branches: ['Metro Systems / DMRC Delhi', 'Metro Systems / BMRCL Bangalore', 'Metro Systems / CMRL Chennai', 'Metro Systems / HMRL Hyderabad', 'Metro Systems / Kolkata Metro', 'Metro Systems / Mumbai Metro', 'Metro Systems / Lucknow Metro', 'Metro Systems / Kochi Metro', 'Syllabus / Junior Engineer', 'Syllabus / Customer Relations Assistant', 'Syllabus / Maintainer', 'Previous Year Papers / DMRC', 'Previous Year Papers / BMRCL', 'Study Material / Technical', 'Study Material / General Aptitude', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Defence',
    exam: 'Agniveer Army',
    icon: 'shield',
    aliases: ['Agnipath Army', 'Indian Army Agniveer', 'Agniveer GD', 'Agniveer Technical', 'Agniveer Clerk', 'Sena Agniveer'],
    branches: ['Overview', 'Syllabus / Agniveer GD', 'Syllabus / Agniveer Technical', 'Syllabus / Agniveer Clerk SKT', 'Syllabus / Agniveer Tradesman', 'Previous Year Papers / GD', 'Previous Year Papers / Technical', 'Previous Year Papers / Clerk', 'Study Material / General Knowledge', 'Study Material / General Science', 'Study Material / Mathematics', 'Study Material / Reasoning', 'Study Material / English', 'Study Material / Hindi', 'Study Material / Technical Subjects', 'Mock Tests / GD Mock', 'Mock Tests / Technical Mock', 'Mock Tests / Clerk Mock', 'Answer Keys', 'Strategy', 'Updates', 'Physical Test Guide / 1600m Run', 'Physical Test Guide / Beam Pullups', 'Physical Test Guide / 9 Feet Ditch', 'Physical Test Guide / Zig Zag Balance', 'Medical Standards Guide'],
  },
  {
    category: 'Competitive Exams',
    family: 'Defence',
    exam: 'Agniveer Navy',
    icon: 'coast_guard',
    aliases: ['Agnipath Navy', 'Indian Navy Agniveer', 'Navy SSR', 'Navy AA', 'Navy MR', 'Navik Recruitment'],
    branches: ['Overview', 'Syllabus / SSR Senior Secondary Recruit', 'Syllabus / AA Artificer Apprentice', 'Syllabus / MR Matric Recruit', 'Previous Year Papers / SSR', 'Previous Year Papers / AA', 'Previous Year Papers / MR', 'Study Material / Mathematics', 'Study Material / Physics', 'Study Material / Chemistry', 'Study Material / English', 'Study Material / General Knowledge', 'Study Material / Computer Science', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Physical Test Guide', 'Medical Standards Guide'],
  },
  {
    category: 'Competitive Exams',
    family: 'Defence',
    exam: 'Agniveer Air Force',
    icon: 'gear',
    aliases: ['Agnipath Air Force', 'IAF Agniveer', 'Airmen Group X', 'Airmen Group Y', 'Vayu Veer'],
    branches: ['Overview', 'Syllabus / Group X Technical', 'Syllabus / Group Y Non Technical', 'Syllabus / Group X Y Both', 'Previous Year Papers / Group X', 'Previous Year Papers / Group Y', 'Study Material / English', 'Study Material / Mathematics', 'Study Material / Physics', 'Study Material / Reasoning', 'Study Material / General Awareness', 'Mock Tests / Group X Mock', 'Mock Tests / Group Y Mock', 'Answer Keys', 'Strategy', 'Updates', 'Physical Test Guide', 'Medical Standards Guide'],
  },
  {
    category: 'Competitive Exams',
    family: 'Defence',
    exam: 'AFCAT',
    icon: 'gear',
    aliases: ['Air Force Common Admission Test', 'AFCAT Flying Branch', 'AFCAT Technical Branch', 'AFCAT Ground Duty Branch', 'Indian Air Force Officer'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / General Awareness', 'Study Material / Verbal Ability', 'Study Material / Numerical Ability', 'Study Material / Reasoning & Military Aptitude', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'AFSB Interview Guide'],
  },
  {
    category: 'Competitive Exams',
    family: 'Defence',
    exam: 'Coast Guard Navik',
    icon: 'coast_guard',
    aliases: ['Indian Coast Guard', 'Coast Guard GD', 'Coast Guard Yantrik', 'ICG Recruitment'],
    branches: ['Overview', 'Syllabus / Navik GD', 'Syllabus / Navik DB Domestic Branch', 'Syllabus / Yantrik', 'Previous Year Papers / Navik GD', 'Previous Year Papers / Yantrik', 'Study Material / Mathematics', 'Study Material / Physics', 'Study Material / Chemistry', 'Study Material / English', 'Study Material / General Knowledge', 'Study Material / Technical Subjects Yantrik', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Physical & Medical Test Guide'],
  },
  {
    category: 'Competitive Exams',
    family: 'Defence',
    exam: 'IB ACIO',
    icon: 'ib_acio',
    aliases: ['Intelligence Bureau ACIO', 'Assistant Central Intelligence Officer', 'IB Grade II Technical', 'Home Ministry Intelligence'],
    branches: ['Overview', 'Syllabus / Tier I', 'Syllabus / Tier II Descriptive', 'Previous Year Papers / Tier I', 'Previous Year Papers / Tier II', 'Study Material / General Awareness', 'Study Material / Quantitative Aptitude', 'Study Material / Logical Analytical Ability', 'Study Material / English', 'Study Material / Current Affairs', 'Mock Tests / Tier I Mock', 'Mock Tests / Tier II Mock', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'Defence',
    exam: 'SSB Interview',
    icon: 'ssb',
    aliases: ['Services Selection Board', 'Army SSB', 'Navy SSB', 'Air Force AFSB', 'Defence Interview', 'Officer Selection'],
    branches: ['Guide / What is SSB', 'Stage 1 / OIR Test Guide', 'Stage 1 / PPDT Strategy', 'Stage 2 / TAT Thematic Apperception Test', 'Stage 2 / WAT Word Association Test', 'Stage 2 / SRT Situation Reaction Test', 'Stage 2 / SDT Self Description Test', 'Stage 2 / GTO Group Discussion', 'Stage 2 / GTO Group Planning Exercise', 'Stage 2 / GTO Progressive Group Task', 'Stage 2 / GTO Half Group Task', 'Stage 2 / GTO Individual Obstacles', 'Stage 2 / GTO Command Task', 'Stage 2 / GTO Lecturette', 'Stage 2 / GTO Final Group Task', 'Stage 2 / Personal Interview Common Questions', 'Conference Guide', 'Real Experiences & Tips', 'Recommended Books'],
  },
  {
    category: 'Competitive Exams',
    family: 'Teaching',
    exam: 'CTET',
    icon: 'teacher',
    aliases: ['Central Teacher Eligibility Test', 'CTET Paper 1', 'CTET Paper 2', 'Primary Teacher Eligibility', 'Upper Primary Teacher Eligibility'],
    branches: ['Overview', 'Syllabus / Paper I Class 1-5', 'Syllabus / Paper II Class 6-8', 'Previous Year Papers / Paper I', 'Previous Year Papers / Paper II', 'Study Material / Child Development & Pedagogy', 'Study Material / Language I Hindi', 'Study Material / Language II English', 'Study Material / Mathematics Paper I', 'Study Material / Environmental Studies Paper I', 'Study Material / Mathematics & Science Paper II', 'Study Material / Social Studies Paper II', 'Study Material / Language Specific Papers', 'Mock Tests / Paper I Mock', 'Mock Tests / Paper II Mock', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Teaching',
    exam: 'UPTET',
    icon: 'teacher',
    aliases: ['Uttar Pradesh Teacher Eligibility Test', 'UP TET Paper 1', 'UP TET Paper 2', 'Uttar Pradesh TET'],
    branches: ['Overview', 'Syllabus / Paper I Primary', 'Syllabus / Paper II Upper Primary', 'Previous Year Papers / Paper I', 'Previous Year Papers / Paper II', 'Study Material / Child Development & Pedagogy', 'Study Material / Language Hindi', 'Study Material / Language English Sanskrit', 'Study Material / Mathematics', 'Study Material / Environmental Studies', 'Study Material / Science', 'Study Material / Social Science', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Teaching',
    exam: 'Super TET',
    icon: 'teacher',
    aliases: ['UP Super TET', 'Uttar Pradesh Assistant Teacher Exam', 'Sahayak Adhyapak Bharti', 'UP Shikshak Bharti'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / Child Psychology', 'Study Material / Hindi', 'Study Material / English', 'Study Material / Science', 'Study Material / Mathematics', 'Study Material / Environment & Social Study', 'Study Material / Teaching Methodology', 'Study Material / Logical Knowledge', 'Study Material / General Knowledge & Current Affairs', 'Study Material / Reasoning', 'Study Material / Information Technology', 'Study Material / Life Skills Management & Aptitude', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Teaching',
    exam: 'REET',
    icon: 'teacher',
    aliases: ['Rajasthan Eligibility Examination for Teachers', 'Rajasthan TET', 'REET Level 1', 'REET Level 2', 'RSMSSB REET'],
    branches: ['Overview', 'Syllabus / Level 1 Class 1-5', 'Syllabus / Level 2 Class 6-8', 'Previous Year Papers / Level 1', 'Previous Year Papers / Level 2', 'Study Material / Child Development & Pedagogy', 'Study Material / Language Hindi', 'Study Material / Language English Sanskrit Urdu', 'Study Material / Mathematics', 'Study Material / Environmental Studies', 'Study Material / Science', 'Study Material / Social Science', 'Mock Tests / Level 1 Mock', 'Mock Tests / Level 2 Mock', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Teaching',
    exam: 'HTET',
    icon: 'teacher',
    aliases: ['Haryana Teacher Eligibility Test', 'Haryana TET', 'HTET PRT', 'HTET TGT', 'HTET PGT'],
    branches: ['Overview', 'Syllabus / Level 1 PRT', 'Syllabus / Level 2 TGT', 'Syllabus / Level 3 PGT', 'Previous Year Papers / Level 1', 'Previous Year Papers / Level 2', 'Previous Year Papers / Level 3', 'Study Material / Child Development & Pedagogy', 'Study Material / Languages', 'Study Material / Subject-wise Content', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Teaching',
    exam: 'Bihar STET',
    icon: 'teacher',
    aliases: ['Bihar State Teacher Eligibility Test', 'Bihar TET', 'BSEB STET', 'Bihar Secondary Teacher'],
    branches: ['Overview', 'Syllabus / Paper I Secondary', 'Syllabus / Paper II Senior Secondary', 'Previous Year Papers', 'Study Material / Subject-wise', 'Study Material / Child Development', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Teaching',
    exam: 'KVS Teacher',
    icon: 'teacher',
    aliases: ['Kendriya Vidyalaya Sangathan', 'KVS PGT', 'KVS TGT', 'KVS PRT', 'Kendriya Vidyalaya Teacher'],
    branches: ['Overview', 'Syllabus / PGT Post Graduate Teacher', 'Syllabus / TGT Trained Graduate Teacher', 'Syllabus / PRT Primary Teacher', 'Previous Year Papers / PGT', 'Previous Year Papers / TGT', 'Previous Year Papers / PRT', 'Study Material / General Paper', 'Study Material / Subject-wise PGT', 'Study Material / Subject-wise TGT', 'Study Material / Child Pedagogy PRT', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'Teaching',
    exam: 'NVS Teacher',
    icon: 'teacher',
    aliases: ['Navodaya Vidyalaya Samiti', 'NVS PGT', 'NVS TGT', 'NVS PRT', 'Jawahar Navodaya Teacher'],
    branches: ['Overview', 'Syllabus / PGT', 'Syllabus / TGT', 'Syllabus / PRT', 'Previous Year Papers', 'Study Material / General Paper', 'Study Material / Subject-wise', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'Teaching',
    exam: 'DSSSB Teacher',
    icon: 'teacher',
    aliases: ['Delhi Subordinate Services Selection Board', 'DSSSB PGT', 'DSSSB TGT', 'DSSSB PRT', 'Delhi Teacher Exam'],
    branches: ['Overview', 'Syllabus / PGT', 'Syllabus / TGT', 'Syllabus / PRT', 'Previous Year Papers / PGT', 'Previous Year Papers / TGT', 'Previous Year Papers / PRT', 'Study Material / General Awareness', 'Study Material / Reasoning', 'Study Material / English', 'Study Material / Subject-wise', 'Study Material / Pedagogy', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Teaching',
    exam: 'UGC NET',
    icon: 'teacher',
    aliases: ['National Eligibility Test', 'NTA UGC NET', 'NET JRF', 'Assistant Professor Exam', 'Junior Research Fellowship'],
    branches: ['Overview', 'Syllabus / Paper I General Teaching Research Aptitude', 'Syllabus / Paper II Computer Science', 'Syllabus / Paper II Commerce', 'Syllabus / Paper II Management', 'Syllabus / Paper II Economics', 'Syllabus / Paper II English', 'Syllabus / Paper II Hindi', 'Syllabus / Paper II History', 'Syllabus / Paper II Political Science', 'Syllabus / Paper II Sociology', 'Syllabus / Paper II Geography', 'Syllabus / Paper II Psychology', 'Syllabus / Paper II Philosophy', 'Syllabus / Paper II Education', 'Syllabus / Paper II Law', 'Syllabus / Paper II Mathematics', 'Syllabus / Paper II Physics', 'Syllabus / Paper II Chemistry', 'Syllabus / Paper II Life Sciences', 'Syllabus / Paper II Public Administration', 'Previous Year Papers / Paper I', 'Previous Year Papers / Paper II Subject-wise', 'Study Material / Paper I Teaching Aptitude', 'Study Material / Paper I Research Aptitude', 'Study Material / Paper I Communication', 'Study Material / Paper I ICT', 'Study Material / Paper I Higher Education', 'Study Material / Paper I Logical Reasoning', 'Study Material / Paper II Subject-wise', 'Mock Tests / Paper I Mock', 'Mock Tests / Paper II Subject-wise Mock', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Police',
    exam: 'Delhi Police Constable',
    icon: 'police',
    aliases: ['Delhi Police Head Constable', 'Delhi Police Constable Recruitment', 'Delhi Police Driver', 'SSC Delhi Police'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / General Knowledge & Current Affairs', 'Study Material / Reasoning', 'Study Material / Numerical Ability', 'Study Material / Computer Fundamentals', 'Study Material / Hindi Language', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Physical Standard Test Guide', 'Medical Standards Guide'],
  },
  {
    category: 'Competitive Exams',
    family: 'Police',
    exam: 'Delhi Police SI',
    icon: 'police',
    aliases: ['Delhi Police Sub Inspector', 'SSC CPO Delhi Police SI', 'Delhi Police Officer'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / General Knowledge', 'Study Material / Reasoning', 'Study Material / Numerical Ability', 'Study Material / English', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Physical Test Guide', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'Police',
    exam: 'UP Police Constable',
    icon: 'police',
    aliases: ['Uttar Pradesh Police Constable', 'UP Police Sipahi', 'UPPRPB Constable', 'UP Police Bharti'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / General Hindi', 'Study Material / General Knowledge', 'Study Material / Numerical Ability', 'Study Material / Mental Ability & Reasoning', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Physical Standard Test Guide', 'Medical Standards Guide'],
  },
  {
    category: 'Competitive Exams',
    family: 'Police',
    exam: 'UP Police SI',
    icon: 'police',
    aliases: ['UP Police Sub Inspector', 'UP Police Daroga', 'UPPSI Exam', 'Uttar Pradesh Police SI'],
    branches: ['Overview', 'Syllabus / Written Exam', 'Previous Year Papers', 'Study Material / General Hindi', 'Study Material / Law & Constitution', 'Study Material / General Knowledge', 'Study Material / Numerical & Mental Ability', 'Study Material / Mental Aptitude', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Physical Test Guide', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'Police',
    exam: 'Bihar Police',
    icon: 'police',
    aliases: ['Bihar Police Constable', 'Bihar Police SI', 'Bihar Police Daroga', 'BPSSC Constable', 'BPSSC SI'],
    branches: ['Overview', 'Syllabus / Constable', 'Syllabus / SI Daroga', 'Previous Year Papers / Constable', 'Previous Year Papers / SI', 'Study Material / General Knowledge', 'Study Material / General Science', 'Study Material / Mathematics', 'Study Material / Hindi', 'Study Material / English', 'Study Material / Current Affairs', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Physical Test Guide'],
  },
  {
    category: 'Competitive Exams',
    family: 'Police',
    exam: 'Rajasthan Police',
    icon: 'police',
    aliases: ['Rajasthan Police Constable', 'Rajasthan Police SI', 'RPSC SI', 'Rajasthan Police Bharti'],
    branches: ['Overview', 'Syllabus / Constable', 'Syllabus / SI', 'Previous Year Papers', 'Study Material / Rajasthan GK', 'Study Material / General Knowledge', 'Study Material / Reasoning', 'Study Material / Mathematics', 'Study Material / Hindi', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Physical Test Guide'],
  },
  {
    category: 'Competitive Exams',
    family: 'Police',
    exam: 'MP Police',
    icon: 'police',
    aliases: ['Madhya Pradesh Police Constable', 'MP Police SI', 'MPPEB Police', 'MP Vyapam Police'],
    branches: ['Overview', 'Syllabus / Constable', 'Syllabus / SI', 'Previous Year Papers', 'Study Material / General Knowledge & Reasoning', 'Study Material / Mathematics', 'Study Material / Hindi', 'Study Material / Science', 'Study Material / Computer', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Physical Test Guide'],
  },
  {
    category: 'Competitive Exams',
    family: 'State Civil Services',
    exam: 'UPPSC PCS',
    icon: 'upsc_cse',
    aliases: ['Uttar Pradesh Public Service Commission', 'UP PCS', 'UPPSC', 'UPPCS', 'UPPSC ACF', 'UPPSC RFO', 'UP SDM Exam', 'UP DSP Exam'],
    branches: ['Overview', 'Syllabus / Prelims Paper I', 'Syllabus / Prelims Paper II CSAT', 'Syllabus / Mains Paper-wise', 'Previous Year Papers / Prelims', 'Previous Year Papers / Mains', 'Study Material / History', 'Study Material / Geography', 'Study Material / Polity', 'Study Material / Economy', 'Study Material / Science & Technology', 'Study Material / Environment', 'Study Material / UP Specific GK', 'Study Material / Current Affairs', 'Mock Tests / Prelims Mock', 'Mock Tests / Mains Mock', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'State Civil Services',
    exam: 'BPSC PCS',
    icon: 'upsc_cse',
    aliases: ['Bihar Public Service Commission', 'BPSC 70th', 'BPSC 69th', 'Bihar PCS', 'Bihar SDO Exam', 'Bihar DSP Exam'],
    branches: ['Overview', 'Syllabus / Prelims', 'Syllabus / Mains', 'Previous Year Papers / Prelims', 'Previous Year Papers / Mains', 'Study Material / General Studies', 'Study Material / Bihar Specific GK', 'Study Material / History', 'Study Material / Geography', 'Study Material / Polity', 'Study Material / Economy', 'Study Material / Current Affairs', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'State Civil Services',
    exam: 'MPPSC State Service',
    icon: 'upsc_cse',
    aliases: ['Madhya Pradesh Public Service Commission', 'MP PCS', 'MPPSC State Service Exam', 'MP SDM Exam'],
    branches: ['Overview', 'Syllabus / Prelims', 'Syllabus / Mains', 'Previous Year Papers', 'Study Material / General Studies', 'Study Material / MP Specific GK', 'Study Material / Current Affairs', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'State Civil Services',
    exam: 'RPSC RAS',
    icon: 'upsc_cse',
    aliases: ['Rajasthan Public Service Commission', 'Rajasthan Administrative Service', 'RAS RTS Exam', 'RPSC State Service'],
    branches: ['Overview', 'Syllabus / Prelims', 'Syllabus / Mains', 'Previous Year Papers', 'Study Material / General Studies', 'Study Material / Rajasthan Specific GK', 'Study Material / Current Affairs', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'State Civil Services',
    exam: 'MPSC Rajyaseva',
    icon: 'upsc_cse',
    aliases: ['Maharashtra Public Service Commission', 'Maharashtra Civil Services', 'MPSC State Service Exam', 'Maharashtra Rajyaseva'],
    branches: ['Overview', 'Syllabus / Prelims', 'Syllabus / Mains', 'Previous Year Papers', 'Study Material / General Studies', 'Study Material / Maharashtra GK', 'Study Material / Current Affairs', 'Study Material / Marathi', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'State Civil Services',
    exam: 'TNPSC Group 1',
    icon: 'upsc_cse',
    aliases: ['Tamil Nadu Public Service Commission', 'TNPSC Group 1', 'TNPSC Group 2', 'TNPSC Group 4', 'CCSE Tamil Nadu'],
    branches: ['Overview', 'Syllabus / Group 1 Prelims', 'Syllabus / Group 1 Mains', 'Syllabus / Group 2', 'Syllabus / Group 4', 'Previous Year Papers / Group 1', 'Previous Year Papers / Group 2', 'Previous Year Papers / Group 4', 'Study Material / General Studies', 'Study Material / Tamil Nadu History & Culture', 'Study Material / Current Affairs', 'Study Material / Tamil Language', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'State Civil Services',
    exam: 'KPSC KAS',
    icon: 'upsc_cse',
    aliases: ['Karnataka Public Service Commission', 'Karnataka Administrative Service', 'KAS Exam', 'KPSC Group A B'],
    branches: ['Overview', 'Syllabus / Prelims', 'Syllabus / Mains', 'Previous Year Papers', 'Study Material / General Studies', 'Study Material / Karnataka History & Culture', 'Study Material / Current Affairs', 'Study Material / Kannada', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'State Civil Services',
    exam: 'APPSC TSPSC',
    icon: 'upsc_cse',
    aliases: ['Andhra Pradesh Public Service Commission', 'Telangana State Public Service Commission', 'APPSC Group 1', 'TSPSC Group 1', 'AP Civil Services', 'Telangana Civil Services'],
    branches: ['Overview', 'Syllabus / APPSC Group 1', 'Syllabus / TSPSC Group 1', 'Syllabus / Group 2 Both States', 'Previous Year Papers / APPSC', 'Previous Year Papers / TSPSC', 'Study Material / General Studies', 'Study Material / AP Telangana History Culture', 'Study Material / Current Affairs', 'Study Material / Telugu', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'State Civil Services',
    exam: 'WBPSC',
    icon: 'upsc_cse',
    aliases: ['West Bengal Public Service Commission', 'WBCS Exam', 'West Bengal Civil Service', 'WBPSC Clerkship'],
    branches: ['Overview', 'Syllabus / WBCS Prelims', 'Syllabus / WBCS Mains', 'Previous Year Papers', 'Study Material / General Studies', 'Study Material / West Bengal GK', 'Study Material / Current Affairs', 'Study Material / Bengali', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'State Civil Services',
    exam: 'GPSC',
    icon: 'upsc_cse',
    aliases: ['Gujarat Public Service Commission', 'Gujarat Civil Services', 'GPSC Class 1', 'GPSC Class 2'],
    branches: ['Overview', 'Syllabus / Class 1 2 Prelims', 'Syllabus / Class 1 2 Mains', 'Previous Year Papers', 'Study Material / General Studies', 'Study Material / Gujarat History Culture', 'Study Material / Current Affairs', 'Study Material / Gujarati', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'State-Specific Exams',
    exam: 'UPSSSC PET',
    icon: 'ssc_cgl',
    aliases: ['Uttar Pradesh Subordinate Services Selection Commission', 'UP PET', 'UPSSSC Preliminary Eligibility Test', 'UP Group C Exam'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / Indian History', 'Study Material / Indian Geography', 'Study Material / Indian Economy', 'Study Material / Indian Constitution & Public Administration', 'Study Material / General Science', 'Study Material / Elementary Mathematics', 'Study Material / General Hindi', 'Study Material / General English', 'Study Material / Logic & Reasoning', 'Study Material / Current Affairs', 'Study Material / Graph Interpretation', 'Study Material / Table Reading', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'State-Specific Exams',
    exam: 'UPSSSC Lekhpal',
    icon: 'ssc_cgl',
    aliases: ['UP Lekhpal', 'Rajaswa Lekhpal', 'Revenue Lekhpal', 'UPSSSC Chakbandi Lekhpal'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / Hindi', 'Study Material / Mathematics', 'Study Material / General Knowledge', 'Study Material / Rural Development & Rural Society', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'State-Specific Exams',
    exam: 'DSSSB Various Posts',
    icon: 'ssc_cgl',
    aliases: ['Delhi Subordinate Services Selection Board', 'DSSSB LDC', 'DSSSB Patwari', 'DSSSB JE', 'Delhi Group C D Exam'],
    branches: ['Overview', 'Syllabus / TGT Teacher', 'Syllabus / LDC Lower Division Clerk', 'Syllabus / Patwari', 'Syllabus / Junior Engineer', 'Syllabus / Fire Operator', 'Previous Year Papers / TGT', 'Previous Year Papers / LDC', 'Previous Year Papers / Patwari', 'Study Material / General Awareness', 'Study Material / Reasoning', 'Study Material / English', 'Study Material / Hindi', 'Study Material / Mathematics', 'Study Material / Subject-wise Technical', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'State-Specific Exams',
    exam: 'RSMSSB Patwari',
    icon: 'ssc_cgl',
    aliases: ['Rajasthan Subordinate & Ministerial Services Selection Board', 'Rajasthan Patwari', 'Gram Sevak', 'RSMSSB LDC', 'Rajasthan Group D'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / Rajasthan GK', 'Study Material / Hindi', 'Study Material / Mathematics', 'Study Material / Reasoning', 'Study Material / Computer', 'Study Material / Revenue Laws', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'State-Specific Exams',
    exam: 'BSSC CGL',
    icon: 'ssc_cgl',
    aliases: ['Bihar Staff Selection Commission', 'BSSC Combined Graduate Level', 'Bihar Group C Exam', 'Bihar Graduate Level Exam'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / General Knowledge', 'Study Material / General Science', 'Study Material / Mathematics', 'Study Material / Hindi', 'Study Material / Reasoning', 'Study Material / Computer', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Judiciary',
    exam: 'UP PCS-J',
    icon: 'judiciary',
    aliases: ['Uttar Pradesh Provincial Civil Service Judicial', 'UP Civil Judge', 'UP Judicial Exam', 'UP Munsiff Magistrate'],
    branches: ['Overview', 'Syllabus / Prelims', 'Syllabus / Mains Law Papers', 'Previous Year Papers / Prelims', 'Previous Year Papers / Mains', 'Study Material / Constitution of India', 'Study Material / Code of Civil Procedure CPC', 'Study Material / Code of Criminal Procedure CrPC', 'Study Material / Indian Penal Code IPC', 'Study Material / Indian Evidence Act', 'Study Material / Transfer of Property Act', 'Study Material / Contract Act', 'Study Material / Limitation Act', 'Study Material / Hindu Law', 'Study Material / Muslim Law', 'Study Material / UP State Laws', 'Study Material / General Knowledge', 'Mock Tests / Prelims Mock', 'Mock Tests / Mains Mock', 'Answer Keys', 'Strategy', 'Updates', 'Viva Voce Preparation'],
  },
  {
    category: 'Competitive Exams',
    family: 'Judiciary',
    exam: 'Delhi Judicial Service',
    icon: 'judiciary',
    aliases: ['DJS', 'Delhi Civil Judge', 'Delhi Judicial Magistrate', 'DHCBA Judicial'],
    branches: ['Overview', 'Syllabus / Preliminary', 'Syllabus / Mains', 'Previous Year Papers', 'Study Material / Constitutional Law', 'Study Material / CPC', 'Study Material / CrPC', 'Study Material / IPC', 'Study Material / Evidence Act', 'Study Material / Transfer of Property', 'Study Material / Contract Act', 'Study Material / Delhi Specific Laws', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Interview & Viva Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'Judiciary',
    exam: 'AIBE',
    icon: 'judiciary',
    aliases: ['All India Bar Examination', 'Bar Council Exam', 'Advocate Enrollment Exam', 'BCI AIBE'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / Constitutional Law', 'Study Material / CPC', 'Study Material / CrPC', 'Study Material / IPC', 'Study Material / Evidence Act', 'Study Material / Family Law', 'Study Material / Contract Law', 'Study Material / Professional Ethics', 'Study Material / Alternative Dispute Resolution', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Science & Research',
    exam: 'ISRO Scientist',
    icon: 'isro',
    aliases: ['Indian Space Research Organisation', 'ISRO Scientist Engineer SC', 'ISRO Technical Assistant', 'ISRO VSSC', 'ISRO SAC', 'ISRO URSC'],
    branches: ['Overview', 'Syllabus / Electronics', 'Syllabus / Computer Science', 'Syllabus / Mechanical', 'Syllabus / Civil', 'Previous Year Papers', 'Study Material / Technical Subject-wise', 'Study Material / General Aptitude', 'Study Material / English', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'Science & Research',
    exam: 'DRDO',
    icon: 'research',
    aliases: ['Defence Research and Development Organisation', 'DRDO RAC', 'DRDO CEPTAM', 'DRDO RAC Scientist B', 'DRDO CEPTAM Tech A', 'DRDO Set C', 'DRDO JRF SRF'],
    branches: ['Overview', 'Syllabus / RAC Scientist', 'Syllabus / CEPTAM Technical', 'Syllabus / CEPTAM Admin', 'Previous Year Papers / RAC', 'Previous Year Papers / CEPTAM', 'Study Material / Electronics', 'Study Material / Computer Science', 'Study Material / Mechanical', 'Study Material / Physics', 'Study Material / General Aptitude', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'Science & Research',
    exam: 'BARC',
    icon: 'nuclear',
    aliases: ['Bhabha Atomic Research Centre', 'BARC OCES', 'BARC DGFS', 'DAE Scientific Officer', 'Nuclear Scientist Exam', 'HBNI PhD'],
    branches: ['Overview', 'Syllabus / OCES Engineering', 'Syllabus / DGFS Science', 'Syllabus / Stipendiary Trainee Cat I', 'Syllabus / Stipendiary Trainee Cat II', 'Previous Year Papers / OCES', 'Previous Year Papers / Trainee', 'Study Material / Engineering Subjects', 'Study Material / Basic Sciences', 'Study Material / General Aptitude', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'Engineering Services & PSU',
    exam: 'GATE Based PSU Recruitment',
    icon: 'oil',
    aliases: ['PSU Recruitment through GATE', 'Oil PSU Recruitment', 'Power PSU Recruitment', 'Government Engineering Jobs', 'GATE Score Based Jobs'],
    branches: ['ONGC', 'IOCL Indian Oil', 'BPCL', 'HPCL', 'GAIL', 'NTPC', 'PowerGrid', 'BHEL', 'BEL', 'HAL', 'SAIL', 'Coal India', 'NLC', 'NHPC', 'NPCIL', 'EIL', 'Cutoff / Branch-wise GATE Score Required', 'Selection Process / Group Discussion', 'Selection Process / Interview', 'Interview Prep / Technical Questions', 'Interview Prep / HR Questions', 'Strategy / Which PSU to Target'],
  },
  {
    category: 'Competitive Exams',
    family: 'Engineering Services & PSU',
    exam: 'Direct Recruitment PSU',
    icon: 'bhel',
    aliases: ['PSU Direct Recruitment', 'Management Trainee Exam', 'Executive Trainee Exam', 'NPCIL Recruitment', 'Coal India Recruitment', 'HAL Recruitment'],
    branches: ['Recruiters / NPCIL Executive Trainee', 'Recruiters / Coal India Management Trainee', 'Recruiters / HAL Management Trainee', 'Recruiters / AAI Junior Executive', 'Recruiters / IOCL Direct', 'Syllabus / Management Trainee', 'Syllabus / Executive Trainee', 'Previous Year Papers', 'Study Material / Technical Subjects', 'Study Material / Management', 'Study Material / General Aptitude', 'Mock Tests', 'Strategy', 'Updates', 'Interview Prep'],
  },
  {
    category: 'Competitive Exams',
    family: 'Postal Services',
    exam: 'India Post GDS',
    icon: 'postal',
    aliases: ['Gramin Dak Sevak', 'Branch Postmaster', 'Assistant Branch Postmaster', 'Dak Sevak', 'India Post GDS Recruitment'],
    branches: ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material / Mathematics', 'Study Material / English', 'Study Material / Hindi', 'Study Material / Reasoning', 'Study Material / Regional Language', 'Merit-Based Selection Guide', 'Preference Form Guide', 'Updates / Notification', 'Updates / Merit List', 'Updates / Result'],
  },
  {
    category: 'Competitive Exams',
    family: 'Postal Services',
    exam: 'India Post Postman MTS',
    icon: 'postal',
    aliases: ['Postman Exam', 'Mail Guard Exam', 'India Post MTS', 'Postal Assistant', 'Sorting Assistant', 'IPO Inspector of Posts'],
    branches: ['Overview', 'Syllabus / Postman Mail Guard', 'Syllabus / Multi Tasking Staff', 'Syllabus / Postal Assistant Sorting Assistant', 'Previous Year Papers', 'Study Material / Mathematics', 'Study Material / English', 'Study Material / Reasoning', 'Study Material / General Knowledge', 'Study Material / Computer Basics', 'Study Material / Cycling Test Postman', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'],
  },
  {
    category: 'Competitive Exams',
    family: 'Other Central Services',
    exam: 'FCI',
    icon: 'fci',
    aliases: ['Food Corporation of India', 'FCI Manager', 'FCI AGM', 'FCI Junior Engineer', 'FCI Assistant Grade 3', 'Depot Manager Exam'],
    branches: ['Overview', 'Syllabus / AGM Manager', 'Syllabus / Junior Engineer', 'Syllabus / Assistant Grade III General', 'Syllabus / Assistant Grade III Accounts', 'Syllabus / Assistant Grade III Technical', 'Previous Year Papers / Manager', 'Previous Year Papers / JE', 'Previous Year Papers / AG III', 'Study Material / General Awareness', 'Study Material / English', 'Study Material / Quantitative Aptitude', 'Study Material / Reasoning', 'Study Material / Technical Food Science', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates', 'Interview Prep'],
  },
];

const parseKitBranchLine = (line: string) =>
  line
    .split('/')
    .map((part) => compactName(part.trim()))
    .filter(Boolean);

const essentialStudyBranches = [
  ['Syllabus'],
  ['Previous Year Papers'],
  ['Study Material'],
];

const essentialStudyGoalTypes = new Set<StudyCardGoalType>(['exam', 'class']);

const hasBranchRoot = (branches: string[][], rootName: string) => {
  const rootKey = normalizeNameKey(rootName);
  return branches.some((branch) => normalizeNameKey(branch[0] || '') === rootKey);
};

const withEssentialStudyBranches = (branches: string[][]) => {
  const normalizedBranches = branches.filter((branch) => branch.length);
  const missingBranches = essentialStudyBranches.filter((branch) => !hasBranchRoot(normalizedBranches, branch[0]));
  return [...normalizedBranches, ...missingBranches];
};

const withEssentialStudyKit = (kit: KitDefinition): KitDefinition => {
  if (!essentialStudyGoalTypes.has(kit.goalType)) return kit;
  return {
    ...kit,
    branches: withEssentialStudyBranches(kit.branches),
  };
};

const stateExamFamilies = new Set(['State Civil Services', 'State-Specific Exams']);
const systemCompetitiveSpecs: DetailedExamSpec[] = detailedCompetitiveSpecs.map((spec) =>
  stateExamFamilies.has(spec.family) ? { ...spec, category: 'State Exams' } : spec
);
const detailedExamAliasKeys = new Set(
  [...systemCompetitiveSpecs, ...detailedEntranceSpecs, ...detailedSchoolBoardSpecs, ...detailedUniversitySpecs, ...detailedPlacementSpecs, ...detailedLanguageSpecs].flatMap((spec) =>
    [spec.exam, spec.icon, ...(spec.aliases || [])].map((name) => normalizeNameKey(compactName(name)))
  )
);
const isDetailedExamCovered = (name: string) => {
  const key = normalizeNameKey(compactName(name));
  return detailedExamAliasKeys.has(key);
};
const filterLegacyExamNames = (names: string[]) => names.filter((name) => !isDetailedExamCovered(name));

const getDetailedSpecPath = (spec: Pick<DetailedExamSpec, 'category' | 'family' | 'exam'>) => {
  const parts = [spec.category, spec.family, spec.exam]
    .map(compactName)
    .filter(Boolean);
  return parts.filter((part, index) => index === 0 || normalizeNameKey(part) !== normalizeNameKey(parts[index - 1]));
};

const detailedCompetitiveKits: KitDefinition[] = systemCompetitiveSpecs.map((spec) => {
  const fallbackIcon = getIconKey(spec.exam, 'exam');
  return {
    rootPath: getDetailedSpecPath(spec),
    goalType: 'exam',
    iconKey: getIconKey(spec.icon, fallbackIcon),
    tone: spec.tone || getTone(spec.icon, getTone(spec.exam, 'blue')),
    branches: spec.branches.map(parseKitBranchLine).filter((path) => path.length),
  };
});

const detailedCompetitiveRootMoves: RootMove[] = systemCompetitiveSpecs.map((spec) => {
  const fallbackIcon = getIconKey(spec.exam, 'exam');
  return {
    aliases: [spec.exam, ...(spec.aliases || [])],
    targetPath: getDetailedSpecPath(spec),
    goalType: 'exam',
    iconKey: getIconKey(spec.icon, fallbackIcon),
    tone: spec.tone || getTone(spec.icon, getTone(spec.exam, 'blue')),
    searchEverywhere: true,
  };
});

const detailedEntranceKits: KitDefinition[] = detailedEntranceSpecs.map((spec) => {
  const fallbackIcon = getIconKey(spec.exam, 'exam');
  return {
    rootPath: getDetailedSpecPath(spec),
    goalType: 'exam',
    iconKey: getIconKey(spec.icon, fallbackIcon),
    tone: spec.tone || getTone(spec.icon, getTone(spec.exam, 'violet')),
    branches: spec.branches.map(parseKitBranchLine).filter((path) => path.length),
  };
});

const detailedEntranceRootMoves: RootMove[] = detailedEntranceSpecs.map((spec) => {
  const fallbackIcon = getIconKey(spec.exam, 'exam');
  return {
    aliases: [spec.exam, ...(spec.aliases || [])],
    targetPath: getDetailedSpecPath(spec),
    goalType: 'exam',
    iconKey: getIconKey(spec.icon, fallbackIcon),
    tone: spec.tone || getTone(spec.icon, getTone(spec.exam, 'violet')),
    searchEverywhere: true,
  };
});

const detailedSchoolBoardKits: KitDefinition[] = detailedSchoolBoardSpecs.map((spec) => {
  const fallbackIcon = getIconKey(spec.exam, 'school-board');
  return {
    rootPath: [spec.category, spec.family, spec.exam].map(compactName),
    goalType: spec.goalType,
    iconKey: getIconKey(spec.icon, fallbackIcon),
    tone: spec.tone || getTone(spec.icon, getTone(spec.exam, 'emerald')),
    branches: spec.branches.map(parseKitBranchLine).filter((path) => path.length),
  };
});

const detailedSchoolBoardRootMoves: RootMove[] = detailedSchoolBoardSpecs.map((spec) => {
  const fallbackIcon = getIconKey(spec.exam, 'school-board');
  const classLikeSchoolRoot = /^(class|classes)\b/i.test(spec.exam);
  return {
    aliases: classLikeSchoolRoot ? [...(spec.aliases || [])] : [spec.exam, ...(spec.aliases || [])],
    targetPath: [spec.category, spec.family, spec.exam].map(compactName),
    goalType: spec.goalType,
    iconKey: getIconKey(spec.icon, fallbackIcon),
    tone: spec.tone || getTone(spec.icon, getTone(spec.exam, 'emerald')),
    searchEverywhere: true,
  };
});

const detailedUniversityKits: KitDefinition[] = detailedUniversitySpecs.map((spec) => {
  const fallbackIcon = getIconKey(spec.exam, 'university');
  return {
    rootPath: [spec.category, spec.family, spec.exam].map(compactName),
    goalType: spec.goalType || 'exam',
    iconKey: getIconKey(spec.icon, fallbackIcon),
    tone: spec.tone || getTone(spec.icon, getTone(spec.exam, 'cyan')),
    branches: spec.branches.map(parseKitBranchLine).filter((path) => path.length),
  };
});

const detailedUniversityRootMoves: RootMove[] = detailedUniversitySpecs.map((spec) => {
  const fallbackIcon = getIconKey(spec.exam, 'university');
  return {
    aliases: [spec.exam, ...(spec.aliases || [])],
    targetPath: [spec.category, spec.family, spec.exam].map(compactName),
    goalType: spec.goalType || 'exam',
    iconKey: getIconKey(spec.icon, fallbackIcon),
    tone: spec.tone || getTone(spec.icon, getTone(spec.exam, 'cyan')),
    searchEverywhere: true,
  };
});

const detailedPlacementKits: KitDefinition[] = detailedPlacementSpecs.map((spec) => {
  const fallbackIcon = getIconKey(spec.exam, 'placement');
  return {
    rootPath: [spec.category, spec.family, spec.exam].map(compactName),
    goalType: spec.goalType || 'exam',
    iconKey: getIconKey(spec.icon, fallbackIcon),
    tone: spec.tone || getTone(spec.icon, getTone(spec.exam, 'rose')),
    branches: spec.branches.map(parseKitBranchLine).filter((path) => path.length),
  };
});

const detailedPlacementRootMoves: RootMove[] = detailedPlacementSpecs.map((spec) => {
  const fallbackIcon = getIconKey(spec.exam, 'placement');
  return {
    aliases: [spec.exam, ...(spec.aliases || [])],
    targetPath: [spec.category, spec.family, spec.exam].map(compactName),
    goalType: spec.goalType || 'exam',
    iconKey: getIconKey(spec.icon, fallbackIcon),
    tone: spec.tone || getTone(spec.icon, getTone(spec.exam, 'rose')),
    searchEverywhere: true,
  };
});

const detailedLanguageKits: KitDefinition[] = detailedLanguageSpecs.map((spec) => {
  const fallbackIcon = getIconKey(spec.exam, 'language');
  return {
    rootPath: [spec.category, spec.family, spec.exam].map(compactName),
    goalType: spec.goalType || 'exam',
    iconKey: getIconKey(spec.icon, fallbackIcon),
    tone: spec.tone || getTone(spec.icon, getTone(spec.exam, 'cyan')),
    branches: spec.branches
      .map((branch) => branch.split('/').map(compactName).filter(Boolean).join(' - '))
      .map(parseKitBranchLine)
      .filter((path) => path.length),
  };
});

const detailedLanguageRootMoves: RootMove[] = detailedLanguageSpecs.map((spec) => {
  const fallbackIcon = getIconKey(spec.exam, 'language');
  return {
    aliases: [spec.exam, ...(spec.aliases || [])],
    targetPath: [spec.category, spec.family, spec.exam].map(compactName),
    goalType: spec.goalType || 'exam',
    iconKey: getIconKey(spec.icon, fallbackIcon),
    tone: spec.tone || getTone(spec.icon, getTone(spec.exam, 'cyan')),
    searchEverywhere: true,
  };
});

const legacyPlacementRootMoves: RootMove[] = [
  {
    aliases: ['Service Based', 'Service Based Companies', 'Service_Based'],
    targetPath: ['Placement / Private', 'Service Based IT'],
    goalType: 'exam_family',
    iconKey: 'placement',
    tone: 'rose',
    searchEverywhere: true,
  },
  {
    aliases: ['Product Based', 'Product Based Companies', 'Product_Based'],
    targetPath: ['Placement / Private', 'Product Based'],
    goalType: 'exam_family',
    iconKey: 'placement',
    tone: 'cyan',
    searchEverywhere: true,
  },
  {
    aliases: ['Common Resources', 'Common_Resources', 'Placement Common Resources'],
    targetPath: ['Placement / Private', 'Common Preparation', 'DSA & Placement Prep'],
    goalType: 'resource_folder',
    iconKey: 'coding',
    tone: 'violet',
    searchEverywhere: true,
  },
];

const psuOverviewRootMoves: RootMove[] = [
  'ONGC',
  'IOCL',
  'BPCL',
  'HPCL',
  'GAIL',
  'NTPC',
  'PowerGrid',
  'BHEL',
  'BEL',
  'HAL',
  'SAIL',
  'Coal India',
  'NLC',
  'NHPC',
  'NPCIL',
  'EIL',
  'AAI',
].map((company) => ({
  aliases: [company, `${company} Recruitment`, `${company} PSU`],
  targetPath: ['Competitive Exams', 'Engineering Services & PSU', 'Gate Based PSU Recruitment', company],
  goalType: 'resource_folder' as StudyCardGoalType,
  iconKey: getIconKey(company, 'engineering'),
  tone: getTone(company, 'cyan'),
  searchEverywhere: true,
}));

const rawKits: KitDefinition[] = [
  ...detailedCompetitiveKits,
  ...detailedEntranceKits,
  ...detailedSchoolBoardKits,
  ...detailedUniversityKits,
  ...detailedPlacementKits,
  ...detailedLanguageKits,
  ...filterLegacyExamNames(upscExamNames).map((exam): KitDefinition => ({
    rootPath: ['Competitive Exams', 'UPSC', exam],
    goalType: 'exam',
    iconKey: getIconKey(exam, 'exam'),
    tone: getTone(exam, 'blue'),
    branches: exam === 'UPSC CSE'
      ? upscBranches
      : exam === 'NDA'
        ? [['Syllabus'], ['Previous Year Papers'], ['Study Material', 'Maths'], ['Study Material', 'GAT'], ['Mock Tests'], ['SSB'], ['Updates']]
        : exam === 'CDS'
          ? [['Syllabus'], ['Previous Year Papers'], ['Study Material', 'English'], ['Study Material', 'GK'], ['Study Material', 'Maths'], ['Mock Tests'], ['SSB']]
          : commonExamBranches,
  })),
  ...filterLegacyExamNames(defenceExamNames).map((exam): KitDefinition => ({
    rootPath: ['Competitive Exams', 'Defence', exam],
    goalType: 'exam',
    iconKey: getIconKey(exam, 'exam'),
    tone: getTone(exam, 'blue'),
    branches: compactGovernmentBranches,
  })),
  ...filterLegacyExamNames(sscExamNames).map((exam): KitDefinition => ({
    rootPath: ['Competitive Exams', 'SSC', exam],
    goalType: 'exam',
    iconKey: getIconKey(exam, 'exam'),
    tone: getTone(exam, 'violet'),
    branches: [['Syllabus'], ['Previous Year Papers', 'Tier 1'], ['Previous Year Papers', 'Tier 2'], ['Study Material', 'Quant'], ['Study Material', 'Reasoning'], ['Study Material', 'English'], ['Study Material', 'GA'], ['Mock Tests'], ['Answer Keys'], ['Updates']],
  })),
  ...filterLegacyExamNames(bankingExamNames).map((exam): KitDefinition => ({
    rootPath: ['Competitive Exams', 'Banking', exam],
    goalType: 'exam',
    iconKey: getIconKey(exam, 'exam'),
    tone: getTone(exam, 'emerald'),
    branches: [['Syllabus'], ['Previous Year Papers', 'Prelims'], ['Previous Year Papers', 'Mains'], ['Study Material', 'Quant'], ['Study Material', 'Reasoning'], ['Study Material', 'English'], ['Study Material', 'Banking Awareness'], ['Mock Tests'], ['Answer Keys'], ['Updates'], ['Interview']],
  })),
  ...filterLegacyExamNames(railwayExamNames).map((exam): KitDefinition => ({
    rootPath: ['Competitive Exams', 'Railway', exam],
    goalType: 'exam',
    iconKey: getIconKey(exam, 'exam'),
    tone: getTone(exam, 'amber'),
    branches: [['Syllabus'], ['Previous Year Papers'], ['Study Material', 'Maths'], ['Study Material', 'Reasoning'], ['Study Material', 'GA'], ['Mock Tests'], ['Answer Keys'], ['Updates']],
  })),
  ...filterLegacyExamNames(judiciaryExamNames).map((exam): KitDefinition => ({
    rootPath: ['Competitive Exams', 'Judiciary', exam],
    goalType: 'exam',
    iconKey: getIconKey(exam, 'law'),
    tone: getTone(exam, 'amber'),
    branches: [['Syllabus'], ['Previous Year Papers'], ['Bare Acts'], ['Case Laws'], ['Study Material'], ['Mock Tests'], ['Updates']],
  })),
  ...filterLegacyExamNames(scienceResearchExamNames).map((exam): KitDefinition => ({
    rootPath: ['Competitive Exams', 'Science & Research', exam],
    goalType: 'exam',
    iconKey: getIconKey(exam, 'science'),
    tone: getTone(exam, 'blue'),
    branches: commonExamBranches,
  })),
  ...filterLegacyExamNames(engineeringPsuExamNames).map((exam): KitDefinition => ({
    rootPath: ['Competitive Exams', 'Engineering Services & PSU', exam],
    goalType: 'exam',
    iconKey: getIconKey(exam, 'engineering'),
    tone: getTone(exam, 'cyan'),
    branches: [['Syllabus'], ['Previous Year Papers'], ['Study Material', 'Technical'], ['Study Material', 'Aptitude'], ['Mock Tests'], ['Answer Keys'], ['Updates']],
  })),
  ...filterLegacyExamNames(teachingExamNames).map((exam): KitDefinition => ({
    rootPath: ['Competitive Exams', 'Teaching', exam],
    goalType: 'exam',
    iconKey: getIconKey(exam, 'tet'),
    tone: getTone(exam, 'emerald'),
    branches: teachingBranches,
  })),
  ...filterLegacyExamNames(policeExamNames).map((exam): KitDefinition => ({
    rootPath: ['Competitive Exams', 'Police', exam],
    goalType: 'exam',
    iconKey: getIconKey(exam, 'defence'),
    tone: getTone(exam, 'indigo'),
    branches: policeBranches,
  })),
  ...([] as KitDefinition[]),
  ...([] as string[]).map((exam): KitDefinition => ({
    rootPath: ['University Exams', 'PG Entrances', exam],
    goalType: 'exam',
    iconKey: getIconKey(exam, 'university'),
    tone: getTone(exam, 'cyan'),
    branches: universityPgBranches,
  })),
  ...([] as string[]).map((className): KitDefinition => ({
    rootPath: ['School Boards', 'CBSE', className],
    goalType: 'class',
    iconKey: 'book',
    tone: 'emerald',
    branches: schoolBranches,
  })),
  ...([] as string[]).map((className): KitDefinition => ({
    rootPath: ['School Boards', 'ICSE / ISC', className],
    goalType: 'class',
    iconKey: 'book',
    tone: 'emerald',
    branches: schoolBranches,
  })),
  ...([] as string[]).map((className): KitDefinition => ({
    rootPath: ['School Boards', 'State Boards', className],
    goalType: 'class',
    iconKey: 'book',
    tone: 'emerald',
    branches: schoolBranches,
  })),
  ...([] as string[]).map((board): KitDefinition => ({
    rootPath: ['School Boards', 'State Boards', board],
    goalType: 'board',
    iconKey: 'state-board',
    tone: 'emerald',
    branches: stateBoardBranches,
  })),
  ...([] as string[]).map((exam): KitDefinition => ({
    rootPath: ['School Boards', 'Olympiads & Scholarships', exam],
    goalType: 'exam',
    iconKey: 'scholarship',
    tone: 'amber',
    branches: olympiadBranches,
  })),
  ...studyAbroadExamNames.map((exam): KitDefinition => ({
    rootPath: ['Study Abroad', exam],
    goalType: 'exam',
    iconKey: getIconKey(exam, 'abroad'),
    tone: getTone(exam, 'cyan'),
    branches: studyAbroadBranches,
  })),
  ...['English Speaking', 'German', 'French', 'Spanish', 'Japanese', 'Korean'].map((language): KitDefinition => ({
    rootPath: ['Foreign Language', language],
    goalType: 'exam',
    iconKey: language === 'English Speaking' ? 'english' : 'language',
    tone: language === 'English Speaking' ? 'cyan' : 'rose',
    branches: foreignLanguageBranches,
  })),
  ...servicePlacementCompanies.map((company): KitDefinition => ({
    rootPath: ['Placement / Private', 'Companies', 'Service Based', company],
    goalType: 'exam',
    iconKey: 'placement',
    tone: 'rose',
    branches: servicePlacementBranches,
  })),
  ...productPlacementCompanies.map((company): KitDefinition => ({
    rootPath: ['Placement / Private', 'Companies', 'Product Based', company],
    goalType: 'exam',
    iconKey: 'placement',
    tone: 'cyan',
    branches: productPlacementBranches,
  })),
  ...financePlacementCompanies.map((company): KitDefinition => ({
    rootPath: ['Placement / Private', 'Companies', 'Finance', company],
    goalType: 'exam',
    iconKey: 'placement',
    tone: 'emerald',
    branches: financePlacementBranches,
  })),
  ...([] as KitDefinition[]),
  {
    rootPath: ['University Exams'],
    goalType: 'exam_category',
    iconKey: 'university',
    tone: 'indigo',
    branches: [],
  },
];

const kits: KitDefinition[] = rawKits.map(withEssentialStudyKit);

const rootMoves: RootMove[] = [
  ...detailedCompetitiveRootMoves,
  ...detailedEntranceRootMoves,
  ...detailedSchoolBoardRootMoves,
  ...detailedUniversityRootMoves,
  ...detailedPlacementRootMoves,
  ...detailedLanguageRootMoves,
  ...legacyPlacementRootMoves,
  ...psuOverviewRootMoves,
  { aliases: ['Government Jobs', 'Government Exams'], targetPath: ['Competitive Exams'], goalType: 'exam_category', iconKey: 'competitive', tone: 'blue' },
  { aliases: ['Central Govt Exams', 'Central Government Exams'], targetPath: ['Competitive Exams'], goalType: 'exam_category', iconKey: 'competitive', tone: 'blue' },
  { aliases: ['Banking Exams', 'Banking Exam', 'Banking'], targetPath: ['Competitive Exams', 'Banking'], goalType: 'exam_family', iconKey: 'banking', tone: 'emerald' },
  { aliases: ['Engineering PSU', 'Engineering Services PSU', 'Engineering Services and PSU'], targetPath: ['Competitive Exams', 'Engineering Services & PSU'], goalType: 'exam_family', iconKey: 'engineering', tone: 'cyan', searchEverywhere: true },
  { aliases: ['GATE', 'Graduate Aptitude Test in Engineering'], targetPath: ['Entrance Exams', 'GATE'], goalType: 'exam_family', iconKey: 'gate', tone: 'cyan', searchEverywhere: true },
  { aliases: ['JEE', 'IIT JEE'], targetPath: ['Entrance Exams', 'JEE'], goalType: 'exam_family', iconKey: 'nuclear', tone: 'cyan', searchEverywhere: true },
  { aliases: ['NEET'], targetPath: ['Entrance Exams', 'Medical & Paramedical'], goalType: 'exam_family', iconKey: 'medical', tone: 'emerald', searchEverywhere: true },
  { aliases: ['SSC CGL'], targetPath: ['Competitive Exams', 'SSC', 'SSC CGL'], goalType: 'exam', iconKey: 'ssc', tone: 'violet' },
  { aliases: ['UPSC CSE'], targetPath: ['Competitive Exams', 'UPSC', 'UPSC CSE'], goalType: 'exam', iconKey: 'upsc', tone: 'blue' },
  { aliases: ['UPSC PCS', 'upsc pcs', 'UPPSE', 'UPPSC', 'UPPCS', 'UP PCS'], targetPath: ['State Exams', 'UPPSC PCS'], goalType: 'exam', iconKey: 'state-exam', tone: 'amber', searchEverywhere: true },
  { aliases: ['BPSC', 'Bihar PCS'], targetPath: ['State Exams', 'State Civil Services', 'BPSC PCS'], goalType: 'exam', iconKey: 'state-exam', tone: 'amber', searchEverywhere: true },
  { aliases: ['MPPSC', 'MP PCS'], targetPath: ['State Exams', 'State Civil Services', 'MPPSC State Service'], goalType: 'exam', iconKey: 'state-exam', tone: 'amber', searchEverywhere: true },
  { aliases: ['RPSC', 'RPSC RAS', 'RAS'], targetPath: ['State Exams', 'State Civil Services', 'RPSC RAS'], goalType: 'exam', iconKey: 'state-exam', tone: 'amber', searchEverywhere: true },
  { aliases: ['MPSC', 'MPSC Rajyaseva'], targetPath: ['State Exams', 'State Civil Services', 'MPSC Rajyaseva'], goalType: 'exam', iconKey: 'state-exam', tone: 'amber', searchEverywhere: true },
  { aliases: ['TNPSC', 'TNPSC Group 1'], targetPath: ['State Exams', 'State Civil Services', 'TNPSC Group 1'], goalType: 'exam', iconKey: 'state-exam', tone: 'amber', searchEverywhere: true },
  { aliases: ['KPSC', 'KPSC KAS'], targetPath: ['State Exams', 'State Civil Services', 'KPSC KAS'], goalType: 'exam', iconKey: 'state-exam', tone: 'amber', searchEverywhere: true },
  { aliases: ['WBPSC', 'WBCS'], targetPath: ['State Exams', 'State Civil Services', 'WBPSC'], goalType: 'exam', iconKey: 'state-exam', tone: 'amber', searchEverywhere: true },
  { aliases: ['GPSC'], targetPath: ['State Exams', 'State Civil Services', 'GPSC'], goalType: 'exam', iconKey: 'state-exam', tone: 'amber', searchEverywhere: true },
  { aliases: ['CBSE'], targetPath: ['School Boards', 'CBSE'], goalType: 'board', iconKey: 'cbse', tone: 'emerald' },
  { aliases: ['ICSE', 'ISC', 'ICSE ISC', 'CISCE'], targetPath: ['School Boards', 'ICSE / ISC'], goalType: 'board', iconKey: 'icse', tone: 'cyan', searchEverywhere: true },
  { aliases: ['State Boards', 'State Board Exams'], targetPath: ['School Boards', 'State Boards'], goalType: 'board', iconKey: 'state-board', tone: 'emerald', searchEverywhere: true },
  { aliases: ['Olympiads & Scholarships', 'Olympiads and Scholarships'], targetPath: ['School Boards', 'Olympiads'], goalType: 'exam_family', iconKey: 'scholarship', tone: 'amber', searchEverywhere: true },
  { aliases: ['NSEP'], targetPath: ['School Boards', 'Olympiads', 'Science Olympiads', 'NSEP Physics'], goalType: 'resource_folder', iconKey: 'physics', tone: 'blue', searchEverywhere: true },
  { aliases: ['NSEC'], targetPath: ['School Boards', 'Olympiads', 'Science Olympiads', 'NSEC Chemistry'], goalType: 'resource_folder', iconKey: 'chemistry', tone: 'amber', searchEverywhere: true },
  { aliases: ['NSEB'], targetPath: ['School Boards', 'Olympiads', 'Science Olympiads', 'NSEB Biology'], goalType: 'resource_folder', iconKey: 'biology', tone: 'emerald', searchEverywhere: true },
  { aliases: ['NSEA'], targetPath: ['School Boards', 'Olympiads', 'Science Olympiads', 'NSEA Astronomy'], goalType: 'resource_folder', iconKey: 'science', tone: 'blue', searchEverywhere: true },
  { aliases: ['NSEJS'], targetPath: ['School Boards', 'Olympiads', 'Science Olympiads', 'NSEJS Junior Science'], goalType: 'resource_folder', iconKey: 'science', tone: 'blue', searchEverywhere: true },
  { aliases: ['IMO'], targetPath: ['School Boards', 'Olympiads', 'SOF Olympiads', 'IMO International Mathematics'], goalType: 'resource_folder', iconKey: 'maths', tone: 'violet', searchEverywhere: true },
  { aliases: ['NSO'], targetPath: ['School Boards', 'Olympiads', 'SOF Olympiads', 'NSO National Science'], goalType: 'resource_folder', iconKey: 'science', tone: 'blue', searchEverywhere: true },
  { aliases: ['IEO'], targetPath: ['School Boards', 'Olympiads', 'SOF Olympiads', 'IEO International English'], goalType: 'resource_folder', iconKey: 'english', tone: 'cyan', searchEverywhere: true },
  { aliases: ['NCO'], targetPath: ['School Boards', 'Olympiads', 'SOF Olympiads', 'NCO National Cyber'], goalType: 'resource_folder', iconKey: 'computer-science', tone: 'cyan', searchEverywhere: true },
  { aliases: ['NMMS'], targetPath: ['School Boards', 'Scholarships', 'NMMS Scholarship'], goalType: 'exam', iconKey: 'scholarship', tone: 'amber', searchEverywhere: true },
  { aliases: ['Placement Private', 'Placement Portal'], targetPath: ['Placement / Private'], goalType: 'exam_category', iconKey: 'placement', tone: 'rose' },
  { aliases: ['Placement and Career', 'Placement & Career'], targetPath: ['Placement / Private'], goalType: 'exam_category', iconKey: 'placement', tone: 'rose' },
  { aliases: ['University Exams', 'University Entrance Tests'], targetPath: ['University Exams'], goalType: 'exam_category', iconKey: 'university', tone: 'indigo' },
  { aliases: ['Study Abroad Exams', 'Foreign University Exams'], targetPath: ['Study Abroad'], goalType: 'exam_category', iconKey: 'abroad', tone: 'cyan' },
  { aliases: ['Language Exams', 'Foreign Languages'], targetPath: ['Foreign Language'], goalType: 'exam_category', iconKey: 'language', tone: 'rose' },
  { aliases: ['Teaching Exams', 'Teacher Exams', 'TET Exams'], targetPath: ['Competitive Exams', 'Teaching'], goalType: 'exam_family', iconKey: 'tet', tone: 'emerald' },
  { aliases: ['Police Exams', 'Police'], targetPath: ['Competitive Exams', 'Police'], goalType: 'exam_family', iconKey: 'defence', tone: 'indigo' },
  { aliases: ['Medical Exams', 'Paramedical Exams', 'Medical and Paramedical'], targetPath: ['Entrance Exams', 'Medical & Paramedical'], goalType: 'exam_family', iconKey: 'medical', tone: 'emerald' },
  { aliases: ['Law Entrance', 'Law Entrance Exams'], targetPath: ['Entrance Exams', 'Law'], goalType: 'exam_family', iconKey: 'law', tone: 'amber' },
  { aliases: ['Design Exams', 'Architecture Exams', 'Design and Architecture'], targetPath: ['Entrance Exams', 'Design & Architecture'], goalType: 'exam_family', iconKey: 'design', tone: 'rose' },
  { aliases: ['Management Exams', 'MBA Entrance'], targetPath: ['Entrance Exams', 'Management'], goalType: 'exam_family', iconKey: 'cat', tone: 'indigo' },
  { aliases: ['Agriculture Exams', 'Veterinary Exams', 'Agriculture and Veterinary'], targetPath: ['Entrance Exams', 'Agriculture & Veterinary'], goalType: 'exam_family', iconKey: 'environment', tone: 'emerald' },
  ...([] as RootMove[]),
];

const isGatePath = (parts: string[]) => parts.some((part) => normalizeNameKey(part) === 'gate');
const isGateKit = (kit: KitDefinition) => isGatePath(kit.rootPath);
const isGateRootMove = (move: RootMove) =>
  isGatePath(move.targetPath) || move.aliases.some((alias) => /\bgate\b/i.test(alias));
const isUpscCsePath = (parts: string[]) =>
  parts.map(normalizeNameKey).join(' / ') === 'competitive exams / upsc / upsc cse';
const isUpscCseKit = (kit: KitDefinition) => isUpscCsePath(kit.rootPath);
const isUpscCseRootMove = (move: RootMove) => isUpscCsePath(move.targetPath);
const isUniversityKit = (kit: KitDefinition) => normalizeNameKey(kit.rootPath[0]) === 'university exams';
const isUniversityRootMove = (move: RootMove) => normalizeNameKey(move.targetPath[0]) === 'university exams';

const ensureKit = async (workspaceId: Types.ObjectId, kit: KitDefinition) => {
  const root = await ensurePath(workspaceId, kit.rootPath, kit.goalType, kit.iconKey, kit.tone);
  for (const branch of kit.branches) {
    await ensureBranch(workspaceId, root, branch);
  }
};

const moveKnownRoots = async (workspaceId: Types.ObjectId, moves = rootMoves) => {
  for (const move of moves) {
    const targetRoot = await ensurePath(
      workspaceId,
      move.targetPath,
      move.goalType || (move.targetPath.length === 1 ? 'exam_category' : 'exam'),
      move.iconKey || 'exam',
      move.tone || 'indigo'
    );
    const candidateQuery: any = {
      workspaceId,
      status: { $ne: 'archived' },
      slug: {
        $in: Array.from(
          new Set(move.aliases.flatMap((name) => [slugify(name), slugify(compactName(name))]))
        ),
      },
      _id: { $ne: targetRoot._id },
    };
    if (!move.searchEverywhere) candidateQuery.parentId = null;

    const rootCandidates = await StudyCard.find(candidateQuery);

    for (const candidate of rootCandidates) {
      await moveOrMergeCard(
        workspaceId,
        candidate,
        targetRoot.parentId || null,
        targetRoot.name,
        {
          goalType: targetRoot.goalType,
          iconKey: targetRoot.iconKey,
          tone: targetRoot.tone,
          order: targetRoot.order,
        }
      );
    }
  }
};

const findPathBelow = async (workspaceId: Types.ObjectId, root: CardDoc, parts: string[]) => {
  let current: CardDoc | null = root;
  for (const part of parts) {
    current = await findSibling(workspaceId, current?._id as Types.ObjectId, [part]);
    if (!current) return null;
  }
  return current;
};

const movePathBelow = async (workspaceId: Types.ObjectId, root: CardDoc, sourceParts: string[], targetParts: string[]) => {
  const source = await findPathBelow(workspaceId, root, sourceParts);
  if (!source) return false;
  const targetParentParts = targetParts.slice(0, -1);
  const targetName = targetParts[targetParts.length - 1];
  const targetParent = targetParentParts.length
    ? await ensurePath(workspaceId, ['Competitive Exams', 'UPSC', 'UPSC CSE', ...targetParentParts], 'resource_folder', 'upsc', 'blue')
    : root;
  await moveOrMergeCard(workspaceId, source, targetParent._id as Types.ObjectId, targetName, {
    goalType: 'resource_folder',
    iconKey: getIconKey(targetName),
    tone: getTone(targetName, 'blue'),
    order: getBranchOrder(targetName),
  });
  return true;
};

const moveChildrenBelow = async (workspaceId: Types.ObjectId, root: CardDoc, sourceParts: string[], targetParts: string[]) => {
  const source = await findPathBelow(workspaceId, root, sourceParts);
  if (!source) return 0;
  const target = await ensurePath(workspaceId, ['Competitive Exams', 'UPSC', 'UPSC CSE', ...targetParts], 'resource_folder', 'upsc', 'blue');
  const children = await getChildren(workspaceId, source._id as Types.ObjectId);
  let moved = 0;
  for (const child of children) {
    await moveOrMergeCard(workspaceId, child, target._id as Types.ObjectId, compactName(child.name), {
      goalType: 'resource_folder',
      iconKey: getIconKey(child.name),
      tone: getTone(child.name, 'blue'),
      order: getBranchOrder(child.name),
    });
    moved += 1;
  }
  const remainingChildren = await StudyCard.countDocuments({ workspaceId, parentId: source._id, status: { $ne: 'archived' } });
  if (remainingChildren === 0 && !(source.files || []).length) await archiveCard(source);
  return moved;
};

const archiveEmptyPathBelow = async (workspaceId: Types.ObjectId, root: CardDoc, sourceParts: string[]) => {
  const source = await findPathBelow(workspaceId, root, sourceParts);
  if (!source || (source.files || []).length) return false;
  const childCount = await StudyCard.countDocuments({ workspaceId, parentId: source._id, status: { $ne: 'archived' } });
  if (childCount > 0) return false;
  await archiveCard(source);
  return true;
};

const organizeUpscCseHierarchy = async (workspaceId: Types.ObjectId) => {
  const root = await ensurePath(workspaceId, ['Competitive Exams', 'UPSC', 'UPSC CSE'], 'exam', 'upsc', 'blue');
  const legacyMoves: Array<[string[], string[]]> = [
    [['Answer Writing'], ['Study Material', 'Answer Writing']],
    [['CSAT'], ['Study Material', 'Prelims', 'CSAT Paper II']],
    [['Current Affairs'], ['Study Material', 'Current Affairs']],
    [['DAF Guide'], ['Interview', 'DAF Guide']],
    [['Economy'], ['Study Material', 'Mains', 'GS Paper III', 'Economy']],
    [['Environment & Ecology'], ['Study Material', 'Mains', 'GS Paper III', 'Environment']],
    [['Essay'], ['Study Material', 'Mains', 'Essay']],
    [['Essay Paper'], ['Study Material', 'Mains', 'Essay']],
    [['Essay Writing'], ['Study Material', 'Mains', 'Essay']],
    [['Ethics & Integrity'], ['Study Material', 'Mains', 'GS Paper IV Ethics', 'Ethics and Integrity']],
    [['Expected Questions'], ['Interview', 'Expected Questions']],
    [['Foundation'], ['Study Material', 'Foundation']],
    [['Geography'], ['Study Material', 'Mains', 'GS Paper I', 'Geography']],
    [['GS Paper I'], ['Study Material', 'Mains', 'GS Paper I']],
    [['GS Paper II'], ['Study Material', 'Mains', 'GS Paper II']],
    [['GS Paper III'], ['Study Material', 'Mains', 'GS Paper III']],
    [['GS Paper IV'], ['Study Material', 'Mains', 'GS Paper IV Ethics']],
    [['History'], ['Study Material', 'Mains', 'GS Paper I', 'History']],
    [['Language'], ['Previous Year Papers', 'Mains', 'Compulsory Language']],
    [['Mains GS-I'], ['Study Material', 'Mains', 'GS Paper I']],
    [['Mains GS-II'], ['Study Material', 'Mains', 'GS Paper II']],
    [['Mains GS-III'], ['Study Material', 'Mains', 'GS Paper III']],
    [['Mains GS-IV'], ['Study Material', 'Mains', 'GS Paper IV Ethics']],
    [['Mains GS-IV Ethics'], ['Study Material', 'Mains', 'GS Paper IV Ethics']],
    [['Optional'], ['Study Material', 'Mains', 'Optional Subjects']],
    [['Optional Papers'], ['Previous Year Papers', 'Mains', 'Optional Subjects']],
    [['Polity'], ['Study Material', 'Mains', 'GS Paper II', 'Polity and Governance']],
    [['Prelims CSAT'], ['Study Material', 'Prelims', 'CSAT Paper II']],
    [['Prelims GS-I'], ['Study Material', 'Prelims', 'GS Paper I']],
    [['Real Experiences'], ['Interview', 'Real Experiences']],
    [['Science & Technology'], ['Study Material', 'Mains', 'GS Paper III', 'Science and Tech']],
    [['CSAT Mock'], ['Mock Tests', 'CSAT']],
    [['Prelims Full Mock'], ['Mock Tests', 'Prelims']],
    [['Topic-wise Tests'], ['Mock Tests', 'Topic-wise']],
    [['Common Resources', 'Interview'], ['Interview']],
    [['Common Resources', 'Mock Tests'], ['Mock Tests']],
    [['Common Resources', 'Strategy'], ['Strategy']],
    [['Common Resources', 'Study Material'], ['Study Material']],
    [['Interview', 'Syllabus', 'Personality Test'], ['Syllabus', 'Interview', 'Personality Test']],
    [['Interview', 'Syllabus'], ['Syllabus', 'Interview']],
    [['Interview', 'Previous Year Papers'], ['Previous Year Papers', 'Interview']],
    [['Interview', 'DAF Guide', 'Interview', 'Interview'], ['Interview', 'DAF Guide']],
    [['Interview', 'DAF Guide', 'Interview'], ['Interview', 'DAF Guide']],
    [['Interview', 'Expected Questions', 'Interview', 'Interview'], ['Interview', 'Expected Questions']],
    [['Interview', 'Expected Questions', 'Interview'], ['Interview', 'Expected Questions']],
    [['Interview', 'Real Experiences', 'Interview', 'Interview'], ['Interview', 'Real Experiences']],
    [['Interview', 'Real Experiences', 'Interview'], ['Interview', 'Real Experiences']],
    [['Prelims', 'Syllabus'], ['Syllabus', 'Prelims']],
    [['Prelims', 'Study Material', 'GS Paper I', 'Previous Year Papers'], ['Previous Year Papers', 'Prelims', 'GS Paper I']],
    [['Prelims', 'Study Material', 'GS Paper I', 'Syllabus'], ['Syllabus', 'Prelims', 'GS Paper I']],
    [['Prelims', 'Study Material', 'GS Paper I'], ['Study Material', 'Prelims', 'GS Paper I']],
    [['Prelims', 'Study Material', 'CSAT Paper II', 'Previous Year Papers'], ['Previous Year Papers', 'Prelims', 'CSAT Paper II']],
    [['Prelims', 'Study Material', 'CSAT Paper II', 'Syllabus'], ['Syllabus', 'Prelims', 'CSAT Paper II']],
    [['Prelims', 'Study Material', 'CSAT Paper II'], ['Study Material', 'Prelims', 'CSAT Paper II']],
    [['Prelims', 'Study Material'], ['Study Material', 'Prelims']],
    [['Prelims', 'Mock Tests', 'GS Paper I'], ['Mock Tests', 'Prelims', 'GS Paper I']],
    [['Prelims', 'Mock Tests', 'CSAT'], ['Mock Tests', 'CSAT']],
    [['Prelims', 'Mock Tests'], ['Mock Tests', 'Prelims']],
    [['Prelims', 'Previous Year Papers'], ['Previous Year Papers', 'Prelims']],
    [['Mains', 'Syllabus'], ['Syllabus', 'Mains']],
    [['Mains', 'Study Material', 'Essay', 'Previous Year Papers'], ['Previous Year Papers', 'Mains', 'Essay']],
    [['Mains', 'Study Material', 'Essay', 'Study Material'], ['Study Material', 'Mains', 'Essay']],
    [['Mains', 'Study Material', 'Essay'], ['Study Material', 'Mains', 'Essay']],
    [['Mains', 'Study Material', 'GS Paper I', 'Syllabus'], ['Syllabus', 'Mains', 'GS Paper I']],
    [['Mains', 'Study Material', 'GS Paper I'], ['Study Material', 'Mains', 'GS Paper I']],
    [['Mains', 'Study Material', 'GS Paper II', 'Syllabus'], ['Syllabus', 'Mains', 'GS Paper II']],
    [['Mains', 'Study Material', 'GS Paper II'], ['Study Material', 'Mains', 'GS Paper II']],
    [['Mains', 'Study Material', 'GS Paper III', 'Syllabus'], ['Syllabus', 'Mains', 'GS Paper III']],
    [['Mains', 'Study Material', 'GS Paper III'], ['Study Material', 'Mains', 'GS Paper III']],
    [['Mains', 'Study Material', 'GS Paper IV Ethics', 'Syllabus'], ['Syllabus', 'Mains', 'GS Paper IV Ethics']],
    [['Mains', 'Study Material', 'GS Paper IV Ethics'], ['Study Material', 'Mains', 'GS Paper IV Ethics']],
    [['Mains', 'Study Material', 'Optional', 'Previous Year Papers'], ['Previous Year Papers', 'Mains', 'Optional Subjects']],
    [['Mains', 'Study Material', 'Optional', 'Syllabus'], ['Syllabus', 'Mains', 'Optional Subjects']],
    [['Mains', 'Study Material', 'Optional', 'Study Material'], ['Study Material', 'Mains', 'Optional Subjects']],
    [['Mains', 'Study Material', 'Optional'], ['Study Material', 'Mains', 'Optional Subjects']],
    [['Mains', 'Study Material'], ['Study Material', 'Mains']],
    [['Mains', 'Mock Tests', 'GS Paper I'], ['Mock Tests', 'Mains', 'GS Paper I']],
    [['Mains', 'Mock Tests', 'GS Paper II'], ['Mock Tests', 'Mains', 'GS Paper II']],
    [['Mains', 'Mock Tests', 'GS Paper III'], ['Mock Tests', 'Mains', 'GS Paper III']],
    [['Mains', 'Mock Tests', 'GS Paper IV'], ['Mock Tests', 'Mains', 'GS Paper IV']],
    [['Mains', 'Mock Tests', 'Essay'], ['Mock Tests', 'Mains', 'Essay']],
    [['Mains', 'Mock Tests', 'Optional'], ['Mock Tests', 'Mains', 'Optional Subjects']],
    [['Mains', 'Mock Tests', 'Compulsory Language'], ['Mock Tests', 'Mains', 'Compulsory Language']],
    [['Mains', 'Mock Tests'], ['Mock Tests', 'Mains']],
    [['Mains', 'Previous Year Papers', 'Compulsory Subjects'], ['Previous Year Papers', 'Mains', 'Compulsory Language']],
    [['Mains', 'Previous Year Papers', 'Compulsory Language'], ['Previous Year Papers', 'Mains', 'Compulsory Language']],
    [['Mains', 'Previous Year Papers', 'Indian Languages (Compulsory)'], ['Previous Year Papers', 'Mains', 'Compulsory Language']],
    [['Mains', 'Previous Year Papers', 'Literature Subjects'], ['Previous Year Papers', 'Mains', 'Optional Subjects']],
    [['Mains', 'Previous Year Papers', 'Optional Subjects'], ['Previous Year Papers', 'Mains', 'Optional Subjects']],
    [['Mains', 'Previous Year Papers', 'Optional Papers'], ['Previous Year Papers', 'Mains', 'Optional Subjects']],
    [['Mains', 'Previous Year Papers', 'English Compulsory'], ['Previous Year Papers', 'Mains', 'Compulsory Language', 'English']],
    [['Mains', 'Previous Year Papers', 'Essay Compulsory'], ['Previous Year Papers', 'Mains', 'Essay']],
    [['Mains', 'Previous Year Papers', 'GS'], ['Previous Year Papers', 'Mains']],
    [['Mains', 'Previous Year Papers'], ['Previous Year Papers', 'Mains']],
    [['Study Material', 'Mains', 'GS Paper I', 'History', 'Previous Year Papers'], ['Previous Year Papers', 'Mains', 'GS Paper I', 'History']],
    [['Study Material', 'Mains', 'GS Paper I', 'History', 'Syllabus'], ['Syllabus', 'Mains', 'GS Paper I', 'History']],
    [['Study Material', 'Mains', 'GS Paper I', 'Geography', 'Previous Year Papers'], ['Previous Year Papers', 'Mains', 'GS Paper I', 'Geography']],
    [['Study Material', 'Mains', 'GS Paper I', 'Geography', 'Syllabus'], ['Syllabus', 'Mains', 'GS Paper I', 'Geography']],
    [['Study Material', 'Mains', 'GS Paper II', 'Polity and Governance', 'Previous Year Papers'], ['Previous Year Papers', 'Mains', 'GS Paper II', 'Polity and Governance']],
    [['Study Material', 'Mains', 'GS Paper II', 'Polity and Governance', 'Syllabus'], ['Syllabus', 'Mains', 'GS Paper II', 'Polity and Governance']],
    [['Study Material', 'Mains', 'GS Paper III', 'Economy', 'Previous Year Papers'], ['Previous Year Papers', 'Mains', 'GS Paper III', 'Economy']],
    [['Study Material', 'Mains', 'GS Paper III', 'Economy', 'Syllabus'], ['Syllabus', 'Mains', 'GS Paper III', 'Economy']],
    [['Study Material', 'Mains', 'GS Paper III', 'Environment', 'Previous Year Papers'], ['Previous Year Papers', 'Mains', 'GS Paper III', 'Environment']],
    [['Study Material', 'Mains', 'GS Paper III', 'Environment', 'Syllabus'], ['Syllabus', 'Mains', 'GS Paper III', 'Environment']],
    [['Study Material', 'Mains', 'GS Paper III', 'Science and Tech', 'Previous Year Papers'], ['Previous Year Papers', 'Mains', 'GS Paper III', 'Science and Tech']],
    [['Study Material', 'Mains', 'GS Paper III', 'Science and Tech', 'Syllabus'], ['Syllabus', 'Mains', 'GS Paper III', 'Science and Tech']],
    [['Study Material', 'Mains', 'GS Paper IV Ethics', 'Ethics and Integrity', 'Previous Year Papers'], ['Previous Year Papers', 'Mains', 'GS Paper IV', 'Ethics and Integrity']],
    [['Study Material', 'Mains', 'GS Paper IV Ethics', 'Ethics and Integrity', 'Syllabus'], ['Syllabus', 'Mains', 'GS Paper IV Ethics', 'Ethics and Integrity']],
    [['Study Material', 'Mains', 'GS Paper I', 'Previous Year Papers'], ['Previous Year Papers', 'Mains', 'GS Paper I']],
    [['Study Material', 'Mains', 'GS Paper I', 'Syllabus'], ['Syllabus', 'Mains', 'GS Paper I']],
    [['Study Material', 'Mains', 'GS Paper II', 'Previous Year Papers'], ['Previous Year Papers', 'Mains', 'GS Paper II']],
    [['Study Material', 'Mains', 'GS Paper II', 'Syllabus'], ['Syllabus', 'Mains', 'GS Paper II']],
    [['Study Material', 'Mains', 'GS Paper III', 'Previous Year Papers'], ['Previous Year Papers', 'Mains', 'GS Paper III']],
    [['Study Material', 'Mains', 'GS Paper III', 'Syllabus'], ['Syllabus', 'Mains', 'GS Paper III']],
    [['Study Material', 'Mains', 'GS Paper IV Ethics', 'Previous Year Papers'], ['Previous Year Papers', 'Mains', 'GS Paper IV']],
    [['Study Material', 'Mains', 'GS Paper IV Ethics', 'Syllabus'], ['Syllabus', 'Mains', 'GS Paper IV Ethics']],
    [['Study Material', 'Prelims', 'GS Paper I', 'Previous Year Papers'], ['Previous Year Papers', 'Prelims', 'GS Paper I']],
    [['Study Material', 'Prelims', 'GS Paper I', 'Syllabus'], ['Syllabus', 'Prelims', 'GS Paper I']],
    [['Study Material', 'Prelims', 'CSAT Paper II', 'Previous Year Papers'], ['Previous Year Papers', 'Prelims', 'CSAT Paper II']],
    [['Study Material', 'Prelims', 'CSAT Paper II', 'Syllabus'], ['Syllabus', 'Prelims', 'CSAT Paper II']],
    [['Syllabus', 'Syllabus'], ['Syllabus']],
    [['Syllabus', 'Prelims GS-I'], ['Syllabus', 'Prelims', 'GS Paper I']],
    [['Syllabus', 'Prelims CSAT'], ['Syllabus', 'Prelims', 'CSAT Paper II']],
    [['Syllabus', 'Mains GS-I'], ['Syllabus', 'Mains', 'GS Paper I']],
    [['Syllabus', 'Mains GS-II'], ['Syllabus', 'Mains', 'GS Paper II']],
    [['Syllabus', 'Mains GS-III'], ['Syllabus', 'Mains', 'GS Paper III']],
    [['Syllabus', 'Mains GS-IV Ethics'], ['Syllabus', 'Mains', 'GS Paper IV Ethics']],
    [['Syllabus', 'Essay Paper'], ['Syllabus', 'Mains', 'Essay']],
    [['Syllabus', 'Optional Subjects'], ['Syllabus', 'Mains', 'Optional Subjects']],
    [['Previous Year Papers', 'Prelims GS-I'], ['Previous Year Papers', 'Prelims', 'GS Paper I']],
    [['Previous Year Papers', 'Prelims CSAT'], ['Previous Year Papers', 'Prelims', 'CSAT Paper II']],
    [['Previous Year Papers', 'Mains GS-I'], ['Previous Year Papers', 'Mains', 'GS Paper I']],
    [['Previous Year Papers', 'Mains GS-II'], ['Previous Year Papers', 'Mains', 'GS Paper II']],
    [['Previous Year Papers', 'Mains GS-III'], ['Previous Year Papers', 'Mains', 'GS Paper III']],
    [['Previous Year Papers', 'Mains GS-IV'], ['Previous Year Papers', 'Mains', 'GS Paper IV']],
    [['Previous Year Papers', 'Essay'], ['Previous Year Papers', 'Mains', 'Essay']],
    [['Previous Year Papers', 'Optional Papers'], ['Previous Year Papers', 'Mains', 'Optional Subjects']],
    [['Study Material', 'History'], ['Study Material', 'Mains', 'GS Paper I', 'History']],
    [['Study Material', 'Geography'], ['Study Material', 'Mains', 'GS Paper I', 'Geography']],
    [['Study Material', 'Polity'], ['Study Material', 'Mains', 'GS Paper II', 'Polity and Governance']],
    [['Study Material', 'Economy'], ['Study Material', 'Mains', 'GS Paper III', 'Economy']],
    [['Study Material', 'Environment & Ecology'], ['Study Material', 'Mains', 'GS Paper III', 'Environment']],
    [['Study Material', 'Science & Technology'], ['Study Material', 'Mains', 'GS Paper III', 'Science and Tech']],
    [['Study Material', 'Ethics & Integrity'], ['Study Material', 'Mains', 'GS Paper IV Ethics', 'Ethics and Integrity']],
    [['Study Material', 'Essay Writing'], ['Study Material', 'Mains', 'Essay']],
    [['Study Material', 'CSAT'], ['Study Material', 'Prelims', 'CSAT Paper II']],
    [['Mock Tests', 'Prelims Full Mock'], ['Mock Tests', 'Prelims']],
    [['Mock Tests', 'CSAT Mock'], ['Mock Tests', 'CSAT']],
    [['Mock Tests', 'Topic-wise Tests'], ['Mock Tests', 'Topic-wise']],
    [['Prelims', 'Previous Year Papers', 'GS Paper I'], ['Previous Year Papers', 'Prelims', 'GS Paper I']],
    [['Prelims', 'Previous Year Papers', 'General Studies Paper - I'], ['Previous Year Papers', 'Prelims', 'GS Paper I']],
    [['Prelims', 'Previous Year Papers', 'GS Paper II'], ['Previous Year Papers', 'Prelims', 'CSAT Paper II']],
    [['Prelims', 'Previous Year Papers', 'General Studies Paper - II'], ['Previous Year Papers', 'Prelims', 'CSAT Paper II']],
    [['Prelims', 'Previous Year Papers', 'CSAT'], ['Previous Year Papers', 'Prelims', 'CSAT Paper II']],
    [['Mains', 'Previous Year Papers', 'Essay'], ['Previous Year Papers', 'Mains', 'Essay']],
    [['Mains', 'Previous Year Papers', 'GS Paper I'], ['Previous Year Papers', 'Mains', 'GS Paper I']],
    [['Mains', 'Previous Year Papers', 'GS Paper II'], ['Previous Year Papers', 'Mains', 'GS Paper II']],
    [['Mains', 'Previous Year Papers', 'GS Paper III'], ['Previous Year Papers', 'Mains', 'GS Paper III']],
    [['Mains', 'Previous Year Papers', 'GS Paper IV'], ['Previous Year Papers', 'Mains', 'GS Paper IV']],
    [['Mains', 'Previous Year Papers', 'General Studies Paper - I'], ['Previous Year Papers', 'Mains', 'GS Paper I']],
    [['Mains', 'Previous Year Papers', 'General Studies Paper - II'], ['Previous Year Papers', 'Mains', 'GS Paper II']],
    [['Mains', 'Previous Year Papers', 'General Studies Paper - III'], ['Previous Year Papers', 'Mains', 'GS Paper III']],
    [['Mains', 'Previous Year Papers', 'General Studies Paper - IV'], ['Previous Year Papers', 'Mains', 'GS Paper IV']],
    [['Common Resources', 'Study Material', 'Updates', 'Daily'], ['Study Material', 'Current Affairs', 'Daily']],
    [['Common Resources', 'Study Material', 'Updates', 'Monthly'], ['Study Material', 'Current Affairs', 'Monthly']],
  ];

  let moved = 0;
  for (const [sourceParts, targetParts] of legacyMoves) {
    if (await movePathBelow(workspaceId, root, sourceParts, targetParts)) moved += 1;
  }
  moved += await moveChildrenBelow(workspaceId, root, ['Common Resources', 'Study Material', 'Updates'], ['Updates']);
  moved += await moveChildrenBelow(workspaceId, root, ['Mains', 'Previous Year Papers', 'Optional'], ['Previous Year Papers', 'Mains', 'Optional Subjects']);
  moved += await moveChildrenBelow(workspaceId, root, ['Mains', 'Previous Year Papers', 'Compulsory'], ['Previous Year Papers', 'Mains', 'Compulsory Language']);
  moved += await moveChildrenBelow(workspaceId, root, ['Mains', 'Previous Year Papers', 'Language'], ['Previous Year Papers', 'Mains', 'Compulsory Language']);
  moved += await moveChildrenBelow(workspaceId, root, ['Previous Year Papers', 'Mains', 'Optional'], ['Previous Year Papers', 'Mains', 'Optional Subjects']);
  moved += await moveChildrenBelow(workspaceId, root, ['Previous Year Papers', 'Mains', 'Compulsory'], ['Previous Year Papers', 'Mains', 'Compulsory Language']);
  moved += await moveChildrenBelow(workspaceId, root, ['Previous Year Papers', 'Mains', 'Language'], ['Previous Year Papers', 'Mains', 'Compulsory Language']);
  const redundantWrapperMoves: Array<[string[], string[]]> = [
    [['Previous Year Papers', 'Mains', 'Compulsory Language', 'Previous Year Papers'], ['Previous Year Papers', 'Mains', 'Compulsory Language']],
    [['Study Material', 'Mains', 'GS Paper I', 'History', 'Study Material'], ['Study Material', 'Mains', 'GS Paper I', 'History']],
    [['Study Material', 'Mains', 'GS Paper I', 'Geography', 'Study Material'], ['Study Material', 'Mains', 'GS Paper I', 'Geography']],
    [['Study Material', 'Mains', 'GS Paper II', 'Polity and Governance', 'Study Material'], ['Study Material', 'Mains', 'GS Paper II', 'Polity and Governance']],
    [['Study Material', 'Mains', 'GS Paper III', 'Economy', 'Study Material'], ['Study Material', 'Mains', 'GS Paper III', 'Economy']],
    [['Study Material', 'Mains', 'GS Paper III', 'Environment', 'Study Material'], ['Study Material', 'Mains', 'GS Paper III', 'Environment']],
    [['Study Material', 'Mains', 'GS Paper III', 'Science and Tech', 'Study Material'], ['Study Material', 'Mains', 'GS Paper III', 'Science and Tech']],
    [['Study Material', 'Mains', 'GS Paper IV Ethics', 'Ethics and Integrity', 'Study Material'], ['Study Material', 'Mains', 'GS Paper IV Ethics', 'Ethics and Integrity']],
    [['Study Material', 'Current Affairs', 'Study Material', 'Study Material'], ['Study Material', 'Current Affairs']],
    [['Study Material', 'Current Affairs', 'Study Material'], ['Study Material', 'Current Affairs']],
    [['Study Material', 'Answer Writing', 'Study Material'], ['Study Material', 'Answer Writing']],
    [['Study Material', 'Foundation', 'Study Material'], ['Study Material', 'Foundation']],
  ];
  for (const [sourceParts, targetParts] of redundantWrapperMoves) {
    moved += await moveChildrenBelow(workspaceId, root, sourceParts, targetParts);
  }
  const emptyLegacyWrappers = [
    ['Common Resources', 'Study Material', 'Updates'],
    ['Common Resources', 'Study Material'],
    ['Common Resources'],
    ['Prelims', 'Study Material', 'GS Paper I'],
    ['Prelims', 'Study Material', 'CSAT Paper II'],
    ['Prelims', 'Study Material'],
    ['Prelims', 'Mock Tests'],
    ['Prelims', 'Previous Year Papers'],
    ['Prelims'],
    ['Mains', 'Study Material', 'Essay'],
    ['Mains', 'Study Material', 'Optional'],
    ['Mains', 'Study Material'],
    ['Mains', 'Mock Tests'],
    ['Mains', 'Previous Year Papers'],
    ['Mains'],
    ['Interview', 'DAF Guide', 'Interview'],
    ['Interview', 'Expected Questions', 'Interview'],
    ['Interview', 'Real Experiences', 'Interview'],
  ];
  for (const sourceParts of emptyLegacyWrappers) {
    if (await archiveEmptyPathBelow(workspaceId, root, sourceParts)) moved += 1;
  }
  logStep(`UPSC CSE legacy paths moved/merged/archived: ${moved}`);
};

const getClassNumberFromName = (name = '') => {
  const match = name.match(/^Class\s+(\d{1,2})$/i) || name.match(/\bClass\s+(\d{1,2})\b/i);
  if (!match) return null;
  const classNumber = Number(match[1]);
  return classNumber >= 1 && classNumber <= 12 ? classNumber : null;
};

const inferClassNumberFromCard = (card: CardDoc) => {
  const directClass = getClassNumberFromName(card.name);
  if (directClass) return directClass;
  for (const file of card.files || []) {
    const combined = [file.name, file.paper, file.topic, file.subject].filter(Boolean).join(' ');
    const fileClass = getClassNumberFromName(combined);
    if (fileClass) return fileClass;
  }
  return null;
};

const isNcertLikeFile = (file: any) => {
  const sourceType = String(file.sourceType || '').toLowerCase();
  const sourceName = String(file.sourceName || '').toLowerCase();
  const resourceType = String(file.resourceType || '').toLowerCase();
  const url = String(file.url || '').toLowerCase();
  const combined = normalizeNameKey([file.name, file.paper, file.topic, file.subject, file.notes].filter(Boolean).join(' '));
  return (
    sourceType === 'ncert' ||
    sourceName.includes('ncert') ||
    url.includes('ncert.nic.in/textbook/pdf') ||
    (resourceType === 'book' && (combined.includes('ncert') || combined.includes('complete book'))) ||
    (combined.includes('ncert') && combined.includes('book'))
  );
};

const isLikelyLooseNcertBookCard = (card: CardDoc) => {
  const key = normalizeNameKey(card.name);
  if (['ncert books', 'books', 'book', 'textbooks', 'textbook'].includes(key)) return false;
  if ((card.files || []).some(isNcertLikeFile)) return true;
  return key.includes('ncert class') && key.includes('complete book');
};

const ensureClassNcertShelf = async (workspaceId: Types.ObjectId, cbseRoot: CardDoc, classNumber: number) => {
  const className = `Class ${classNumber}`;
  const classCard = await ensureCard(workspaceId, cbseRoot._id as Types.ObjectId, className, {
    goalType: 'class',
    iconKey: classNumber <= 5 ? 'class-primary' : classNumber <= 9 ? 'class-middle' : 'cbse',
    tone: 'emerald',
    order: getBranchOrder(className),
    status: 'published',
  });
  return ensureCard(workspaceId, classCard._id as Types.ObjectId, 'NCERT Books', {
    goalType: 'resource_folder',
    iconKey: 'book',
    tone: 'amber',
    order: getBranchOrder('NCERT Books'),
    status: 'published',
  });
};

const moveShelfChildren = async (
  workspaceId: Types.ObjectId,
  source: CardDoc,
  targetParentId: Types.ObjectId,
  fallbackName = source.name
) => {
  const children = await getChildren(workspaceId, source._id as Types.ObjectId);
  for (const child of children) {
    await moveOrMergeCard(workspaceId, child, targetParentId, compactName(child.name), {
      goalType: child.goalType || 'resource_folder',
      iconKey: getIconKey(child.name, 'book'),
      tone: getTone(child.name, 'amber'),
      order: getBranchOrder(child.name),
    });
  }

  if ((source.files || []).length) {
    await moveOrMergeCard(workspaceId, source, targetParentId, compactName(fallbackName), {
      goalType: 'subject',
      iconKey: getIconKey(fallbackName, 'book'),
      tone: getTone(fallbackName, 'amber'),
      order: getBranchOrder(fallbackName),
    });
    return;
  }

  const remainingChildren = await StudyCard.countDocuments({ workspaceId, parentId: source._id, status: { $ne: 'archived' } });
  if (remainingChildren === 0) await archiveCard(source);
};

const moveGlobalNcertBooksIntoClasses = async (workspaceId: Types.ObjectId, cbseRoot: CardDoc, wrapper: CardDoc | null) => {
  if (!wrapper) return;
  const children = await getChildren(workspaceId, wrapper._id as Types.ObjectId);
  for (const child of children) {
    const classNumber = inferClassNumberFromCard(child);
    if (!classNumber) continue;
    const classShelf = await ensureClassNcertShelf(workspaceId, cbseRoot, classNumber);
    if (/^Class\s+\d{1,2}$/i.test(child.name)) {
      await moveShelfChildren(workspaceId, child, classShelf._id as Types.ObjectId, 'All Subjects');
    } else {
      await moveOrMergeCard(workspaceId, child, classShelf._id as Types.ObjectId, compactName(child.name), {
        goalType: child.goalType || 'subject',
        iconKey: getIconKey(child.name, 'book'),
        tone: getTone(child.name, 'amber'),
        order: getBranchOrder(child.name),
      });
    }
  }

  const remainingChildren = await StudyCard.countDocuments({ workspaceId, parentId: wrapper._id, status: { $ne: 'archived' } });
  if (remainingChildren === 0 && !(wrapper.files || []).length) await archiveCard(wrapper);
};

const rootSchoolResourceNames = [
  'Board Pattern',
  'Blueprint',
  'Syllabus',
  'NCERT Solutions',
  'NCERT Books',
  'Textbooks',
  'Books',
  'Study Material',
  'Notes',
  'Revision Notes',
  'Previous Year Papers',
  'Sample Papers',
  'Model Papers',
  'Practice',
  'Practice Sets',
  'Practice Questions',
  'Important Questions',
  'Activity Sheets',
  'Worksheets',
  'Answer Keys',
  'Marking Schemes',
  'Updates',
  'Class 10 Guide',
  'Class 12 Guide',
];

const getSchoolResourceTargetName = (resourceName: string) => {
  const classFreeName = compactName(resourceName.replace(/^Class\s+\d{1,2}\s*/i, ''));
  const key = normalizeNameKey(classFreeName || resourceName);
  if (key === 'books' || key === 'book' || key === 'textbooks' || key === 'textbook') return 'Textbooks';
  if (key === 'notes') return 'Revision Notes';
  if (key === 'practice' || key === 'practice sets') return 'Practice Questions';
  return classFreeName || compactName(resourceName);
};

const ensureSchoolClassCard = async (workspaceId: Types.ObjectId, boardRoot: CardDoc, classNumber: number, iconKey = 'cbse') =>
  ensureCard(workspaceId, boardRoot._id as Types.ObjectId, `Class ${classNumber}`, {
    goalType: 'class',
    iconKey: classNumber <= 5 ? 'class-primary' : classNumber <= 9 ? 'class-middle' : iconKey,
    tone: 'emerald',
    order: getBranchOrder(`Class ${classNumber}`),
    status: 'published',
  });

const ensureResourceShelf = async (
  workspaceId: Types.ObjectId,
  parent: CardDoc,
  resourceName: string,
  fallbackIcon = 'folder',
  fallbackTone: StudyCardTone = 'emerald'
) =>
  ensureCard(workspaceId, parent._id as Types.ObjectId, resourceName, {
    goalType: 'resource_folder',
    iconKey: getIconKey(resourceName, fallbackIcon),
    tone: getTone(resourceName, fallbackTone),
    order: getBranchOrder(resourceName),
    status: 'published',
  });

const cleanSchoolFamilyRootResourceShelves = async (workspaceId: Types.ObjectId, familyRoot: CardDoc, boardIconKey = 'cbse') => {
  let commonRoot: CardDoc | null = null;
  const ensureCommonResourceShelf = async (resourceName: string) => {
    if (!commonRoot) {
      commonRoot = await ensureCard(workspaceId, familyRoot._id as Types.ObjectId, 'Common Resources', {
        goalType: 'resource_folder',
        iconKey: 'folder',
        tone: 'slate',
        order: getBranchOrder('Common Resources'),
        status: 'published',
      });
    }
    return ensureResourceShelf(workspaceId, commonRoot, resourceName, getIconKey(resourceName), getTone(resourceName, 'slate'));
  };

  for (const resourceName of rootSchoolResourceNames) {
    const wrapper = await findSibling(workspaceId, familyRoot._id as Types.ObjectId, [resourceName]);
    if (!wrapper) continue;

    const children = await getChildren(workspaceId, wrapper._id as Types.ObjectId);
    const wrapperClassNumber = inferClassNumberFromCard(wrapper);
    const targetResourceName = getSchoolResourceTargetName(resourceName);
    if (!children.length && !(wrapper.files || []).length) {
      await archiveCard(wrapper);
      continue;
    }

    if (wrapperClassNumber) {
      const classCard = await ensureSchoolClassCard(workspaceId, familyRoot, wrapperClassNumber, boardIconKey);
      const targetShelf = await ensureResourceShelf(
        workspaceId,
        classCard,
        targetResourceName,
        getIconKey(targetResourceName),
        getTone(targetResourceName, 'emerald')
      );
      await moveShelfChildren(workspaceId, wrapper, targetShelf._id as Types.ObjectId, targetResourceName);
      continue;
    }

    for (const child of children) {
      const classNumber = inferClassNumberFromCard(child);
      if (classNumber) {
        const classCard = await ensureSchoolClassCard(workspaceId, familyRoot, classNumber, boardIconKey);
        const targetShelf = await ensureResourceShelf(
          workspaceId,
          classCard,
          targetResourceName,
          getIconKey(targetResourceName),
          getTone(targetResourceName, 'emerald')
        );
        const fallbackName = compactName(child.name.replace(/^Class\s+\d{1,2}\s*/i, '')) || 'All Subjects';
        await moveShelfChildren(workspaceId, child, targetShelf._id as Types.ObjectId, fallbackName);
        continue;
      }

      const commonShelf = await ensureCommonResourceShelf(targetResourceName);
      await moveShelfChildren(workspaceId, child, commonShelf._id as Types.ObjectId, child.name);
    }

    if ((wrapper.files || []).length) {
      const commonShelf = await ensureCommonResourceShelf(targetResourceName);
      await moveOrMergeCard(workspaceId, wrapper, commonShelf._id as Types.ObjectId, targetResourceName, {
        goalType: 'resource_folder',
        iconKey: getIconKey(targetResourceName),
        tone: getTone(targetResourceName, 'slate'),
        order: getBranchOrder(targetResourceName),
      });
      continue;
    }

    const remainingChildren = await StudyCard.countDocuments({ workspaceId, parentId: wrapper._id, status: { $ne: 'archived' } });
    if (remainingChildren === 0) await archiveCard(wrapper);
  }
};

const archiveEmptySchoolRootResourceShelves = async (workspaceId: Types.ObjectId, familyRoot: CardDoc) => {
  const legacyRootNames = [...rootSchoolResourceNames, 'Practice', 'Notes', 'Books', 'Book', 'Textbooks', 'Textbook'];
  for (const resourceName of legacyRootNames) {
    const wrapper = await findSibling(workspaceId, familyRoot._id as Types.ObjectId, [resourceName]);
    if (!wrapper) continue;
    const childCount = await StudyCard.countDocuments({ workspaceId, parentId: wrapper._id, status: { $ne: 'archived' } });
    if (childCount === 0 && !(wrapper.files || []).length) await archiveCard(wrapper);
  }
};

const restoreMisplacedTopLevelCategories = async (workspaceId: Types.ObjectId) => {
  const misplacedRoots = await StudyCard.find({
    workspaceId,
    parentId: { $ne: null },
    status: { $ne: 'archived' },
    name: { $in: topLevelCategoryNames },
  }).sort({ name: 1 });

  for (const card of misplacedRoots) {
    await moveOrMergeCard(workspaceId, card, null, compactName(card.name), {
      goalType: 'exam_category',
      iconKey: getIconKey(card.name, 'folder'),
      tone: getTone(card.name, 'blue'),
      order: getBranchOrder(card.name),
    });
  }
};

const cleanCbseClassResourceShelves = async (workspaceId: Types.ObjectId, cbseRoot: CardDoc) => {
  for (let classNumber = 1; classNumber <= 12; classNumber += 1) {
    const classCard = await findSibling(workspaceId, cbseRoot._id as Types.ObjectId, [`Class ${classNumber}`]);
    if (!classCard) continue;

    const ncertShelf = await ensureClassNcertShelf(workspaceId, cbseRoot, classNumber);
    for (const legacyName of ['Books', 'Book', 'Textbooks', 'Textbook', 'NCERT Textbooks']) {
      const legacyShelf = await findSibling(workspaceId, classCard._id as Types.ObjectId, [legacyName]);
      if (!legacyShelf || String(legacyShelf._id) === String(ncertShelf._id)) continue;
      await moveShelfChildren(workspaceId, legacyShelf, ncertShelf._id as Types.ObjectId, legacyShelf.name);
    }

    const practiceShelf = await findSibling(workspaceId, classCard._id as Types.ObjectId, ['Practice']);
    if (practiceShelf) {
      await moveOrMergeCard(workspaceId, practiceShelf, classCard._id as Types.ObjectId, 'Practice Questions', {
        goalType: 'resource_folder',
        iconKey: 'question-paper',
        tone: 'violet',
        order: getBranchOrder('Practice Questions'),
      });
    }

    const notesShelf = await findSibling(workspaceId, classCard._id as Types.ObjectId, ['Notes']);
    if (notesShelf) {
      await moveOrMergeCard(workspaceId, notesShelf, classCard._id as Types.ObjectId, 'Revision Notes', {
        goalType: 'resource_folder',
        iconKey: 'notes',
        tone: 'cyan',
        order: getBranchOrder('Revision Notes'),
      });
    }

    const subjectCards = await getChildren(workspaceId, classCard._id as Types.ObjectId);
    for (const subjectCard of subjectCards) {
      if (String(subjectCard._id) === String(ncertShelf._id)) continue;
      if (['resource_folder', 'class'].includes(subjectCard.goalType || '')) {
        const subjectKey = normalizeNameKey(subjectCard.name);
        const resourceKeys = new Set(['syllabus', 'ncert solutions', 'study material', 'revision notes', 'previous year papers', 'sample papers', 'practice questions', 'important questions', 'ncert exemplar', 'formula sheets', 'answer keys', 'marking schemes', 'board pattern', 'common resources']);
        if (topLevelCategoryKeys.has(subjectKey)) continue;
        if (resourceKeys.has(subjectKey)) continue;
      }
      for (const legacyName of ['Books', 'Book', 'Textbooks', 'Textbook', 'NCERT Textbooks']) {
        const legacyShelf = await findSibling(workspaceId, subjectCard._id as Types.ObjectId, [legacyName]);
        if (!legacyShelf) continue;
        await moveShelfChildren(workspaceId, legacyShelf, ncertShelf._id as Types.ObjectId, compactName(subjectCard.name));
      }
    }

    const children = await getChildren(workspaceId, classCard._id as Types.ObjectId);
    for (const child of children) {
      if (String(child._id) === String(ncertShelf._id)) continue;
      if (!isLikelyLooseNcertBookCard(child)) continue;
      await moveOrMergeCard(workspaceId, child, ncertShelf._id as Types.ObjectId, compactName(child.name), {
        goalType: 'subject',
        iconKey: getIconKey(child.name, 'book'),
        tone: getTone(child.name, 'amber'),
        order: getBranchOrder(child.name),
      });
    }
  }
};

const cleanStateBoardClassResourceShelves = async (workspaceId: Types.ObjectId, stateBoardsRoot: CardDoc) => {
  const stateBoardCards = await getChildren(workspaceId, stateBoardsRoot._id as Types.ObjectId);
  for (const boardCard of stateBoardCards) {
    const boardKey = normalizeNameKey(boardCard.name);
    if (boardKey === 'common resources') continue;
    if (topLevelCategoryKeys.has(boardKey)) continue;

    await cleanSchoolFamilyRootResourceShelves(workspaceId, boardCard, boardCard.iconKey || 'state-board');

    for (let classNumber = 1; classNumber <= 12; classNumber += 1) {
      const classCard = await findSibling(workspaceId, boardCard._id as Types.ObjectId, [`Class ${classNumber}`]);
      if (!classCard) continue;

      const textbookShelf = await ensureCard(workspaceId, classCard._id as Types.ObjectId, 'Textbooks', {
        goalType: 'resource_folder',
        iconKey: 'book',
        tone: 'amber',
        order: getBranchOrder('Textbooks'),
        status: 'published',
      });

      for (const legacyName of ['Books', 'Book', 'Board Books', 'Board Textbooks']) {
        const legacyShelf = await findSibling(workspaceId, classCard._id as Types.ObjectId, [legacyName]);
        if (!legacyShelf || String(legacyShelf._id) === String(textbookShelf._id)) continue;
        await moveShelfChildren(workspaceId, legacyShelf, textbookShelf._id as Types.ObjectId, legacyShelf.name);
      }

      const subjectCards = await getChildren(workspaceId, classCard._id as Types.ObjectId);
      for (const subjectCard of subjectCards) {
        if (String(subjectCard._id) === String(textbookShelf._id)) continue;
        const subjectKey = normalizeNameKey(subjectCard.name);
        const resourceKeys = new Set(['syllabus', 'textbooks', 'study material', 'revision notes', 'previous year papers', 'sample papers', 'practice questions', 'answer keys', 'updates', 'blueprint', 'common resources']);
        if (topLevelCategoryKeys.has(subjectKey)) continue;
        if (resourceKeys.has(subjectKey)) continue;
        for (const legacyName of ['Books', 'Book', 'Board Books', 'Board Textbooks']) {
          const legacyShelf = await findSibling(workspaceId, subjectCard._id as Types.ObjectId, [legacyName]);
          if (!legacyShelf) continue;
          await moveShelfChildren(workspaceId, legacyShelf, textbookShelf._id as Types.ObjectId, compactName(subjectCard.name));
        }
      }

      const practiceShelf = await findSibling(workspaceId, classCard._id as Types.ObjectId, ['Practice']);
      if (practiceShelf) {
        await moveOrMergeCard(workspaceId, practiceShelf, classCard._id as Types.ObjectId, 'Practice Questions', {
          goalType: 'resource_folder',
          iconKey: 'question-paper',
          tone: 'violet',
          order: getBranchOrder('Practice Questions'),
        });
      }

      const notesShelf = await findSibling(workspaceId, classCard._id as Types.ObjectId, ['Notes']);
      if (notesShelf) {
        await moveOrMergeCard(workspaceId, notesShelf, classCard._id as Types.ObjectId, 'Revision Notes', {
          goalType: 'resource_folder',
          iconKey: 'notes',
          tone: 'cyan',
          order: getBranchOrder('Revision Notes'),
        });
      }
    }
  }
};

const getSchoolClassStreamName = (name: string) => {
  const targetName = compactName(name.replace(/^Class\s+\d{1,2}\s*/i, '')) || 'All Subjects';
  const key = normalizeNameKey(targetName);
  if (key === 'science') return 'Science Stream';
  if (key === 'commerce') return 'Commerce Stream';
  if (key === 'arts') return 'Arts Stream';
  return targetName;
};

const moveStateBoardClassStreamsIntoClasses = async (workspaceId: Types.ObjectId, stateBoardsRoot: CardDoc) => {
  const stateBoardCards = await getChildren(workspaceId, stateBoardsRoot._id as Types.ObjectId);
  for (const boardCard of stateBoardCards) {
    const boardKey = normalizeNameKey(boardCard.name);
    if (boardKey === 'common resources' || topLevelCategoryKeys.has(boardKey)) continue;

    const children = await getChildren(workspaceId, boardCard._id as Types.ObjectId);
    for (const child of children) {
      const classNumber = getClassNumberFromName(child.name);
      if (!classNumber || normalizeNameKey(child.name) === normalizeNameKey(`Class ${classNumber}`)) continue;

      const classCard = await ensureSchoolClassCard(workspaceId, boardCard, classNumber, boardCard.iconKey || 'state-board');
      const targetName = getSchoolClassStreamName(child.name);
      await moveOrMergeCard(workspaceId, child, classCard._id as Types.ObjectId, targetName, {
        goalType: 'resource_folder',
        iconKey: getIconKey(targetName, 'folder'),
        tone: getTone(targetName, 'emerald'),
        order: getBranchOrder(targetName),
      });
    }
  }
};

const normalizeStateBoardClassStreamAliases = async (workspaceId: Types.ObjectId, stateBoardsRoot: CardDoc) => {
  const streamTargets = new Map([
    ['science', 'Science Stream'],
    ['commerce', 'Commerce Stream'],
    ['arts', 'Arts Stream'],
  ]);
  const stateBoardCards = await getChildren(workspaceId, stateBoardsRoot._id as Types.ObjectId);

  for (const boardCard of stateBoardCards) {
    const boardKey = normalizeNameKey(boardCard.name);
    if (boardKey === 'common resources' || topLevelCategoryKeys.has(boardKey)) continue;

    for (const classNumber of [11, 12]) {
      const classCard = await findSibling(workspaceId, boardCard._id as Types.ObjectId, [`Class ${classNumber}`]);
      if (!classCard) continue;
      const classChildren = await getChildren(workspaceId, classCard._id as Types.ObjectId);
      for (const child of classChildren) {
        const targetName = streamTargets.get(normalizeNameKey(child.name));
        if (!targetName) continue;
        await moveOrMergeCard(workspaceId, child, classCard._id as Types.ObjectId, targetName, {
          goalType: 'resource_folder',
          iconKey: getIconKey(targetName, 'folder'),
          tone: getTone(targetName, 'emerald'),
          order: getBranchOrder(targetName),
        });
      }
    }
  }
};

const moveDirectSchoolRootsToPremiumParents = async (workspaceId: Types.ObjectId, schoolRoot: CardDoc, cbseRoot: CardDoc, stateBoardsRoot: CardDoc) => {
  for (let classNumber = 1; classNumber <= 12; classNumber += 1) {
    const className = `Class ${classNumber}`;
    const directClass = await findSibling(workspaceId, schoolRoot._id as Types.ObjectId, [className]);
    if (!directClass) continue;
    await moveOrMergeCard(workspaceId, directClass, cbseRoot._id as Types.ObjectId, className, {
      goalType: 'class',
      iconKey: classNumber <= 5 ? 'class-primary' : classNumber <= 9 ? 'class-middle' : 'cbse',
      tone: 'emerald',
      order: getBranchOrder(className),
    });
  }

  const stateBoardNames = detailedSchoolBoardSpecs
    .filter((spec) => normalizeNameKey(spec.family) === 'state boards')
    .map((spec) => compactName(spec.exam));
  for (const boardName of stateBoardNames) {
    const directBoard = await findSibling(workspaceId, schoolRoot._id as Types.ObjectId, [boardName]);
    if (!directBoard) continue;
    await moveOrMergeCard(workspaceId, directBoard, stateBoardsRoot._id as Types.ObjectId, boardName, {
      goalType: 'board',
      iconKey: 'state-board',
      tone: 'emerald',
      order: getBranchOrder(boardName),
    });
  }
};

const mergeDuplicateSiblingsForParents = async (workspaceId: Types.ObjectId, parentIds: Array<Types.ObjectId | null>) => {
  let merged = 0;

  for (const parentId of parentIds) {
    const siblings = await StudyCard.find({ workspaceId, parentId: parentQuery(parentId), status: { $ne: 'archived' } }).sort({ order: 1, name: 1 });
    const seen = new Map<string, CardDoc>();

    for (const sibling of siblings) {
      const key = slugify(compactName(sibling.name));
      const existing = seen.get(key);
      if (existing) {
        await moveOrMergeCard(workspaceId, sibling, parentId, existing.name, {
          goalType: existing.goalType || sibling.goalType || 'resource_folder',
          iconKey: existing.iconKey || getIconKey(existing.name, sibling.iconKey),
          tone: existing.tone || getTone(existing.name, sibling.tone),
          order: existing.order ?? getBranchOrder(existing.name),
        });
        merged += 1;
        continue;
      }

      seen.set(key, sibling);
    }
  }

  return merged;
};

const sortSpecificParents = async (workspaceId: Types.ObjectId, parentIds: Array<Types.ObjectId | null>) => {
  const bottomKeys = new Set(['common resources']);
  for (const parentId of parentIds) {
    const siblings = await StudyCard.find({ workspaceId, parentId: parentQuery(parentId), status: { $ne: 'archived' } }).sort({ order: 1, name: 1 });
    const siblingOrder = (name: string) => bottomKeys.has(normalizeNameKey(name)) ? 10000 : getBranchOrder(name);
    siblings.sort((a, b) => siblingOrder(a.name) - siblingOrder(b.name) || a.name.localeCompare(b.name));
    for (const [index, sibling] of siblings.entries()) {
      const nextOrder = (index + 1) * 10;
      if (sibling.order !== nextOrder) {
        sibling.order = nextOrder;
        sanitizeCardFiles(sibling);
        await sibling.save();
        stats.styled += 1;
      }
    }
  }
};

const getSchoolRepairParentIds = async (workspaceId: Types.ObjectId, schoolRoot: CardDoc, cbseRoot: CardDoc, stateBoardsRoot: CardDoc) => {
  const parentIds = new Map<string, Types.ObjectId | null>();
  const add = (id: Types.ObjectId | null) => parentIds.set(String(id || 'root'), id);
  add(null);
  add(schoolRoot._id as Types.ObjectId);
  add(cbseRoot._id as Types.ObjectId);
  add(stateBoardsRoot._id as Types.ObjectId);

  for (const classCard of await getChildren(workspaceId, cbseRoot._id as Types.ObjectId)) {
    if (getClassNumberFromName(classCard.name)) add(classCard._id as Types.ObjectId);
  }

  for (const boardCard of await getChildren(workspaceId, stateBoardsRoot._id as Types.ObjectId)) {
    if (normalizeNameKey(boardCard.name) === 'common resources' || topLevelCategoryKeys.has(normalizeNameKey(boardCard.name))) continue;
    add(boardCard._id as Types.ObjectId);
    for (const classCard of await getChildren(workspaceId, boardCard._id as Types.ObjectId)) {
      if (getClassNumberFromName(classCard.name)) add(classCard._id as Types.ObjectId);
    }
  }

  return Array.from(parentIds.values());
};

const moveMisplacedSchoolRoots = async (workspaceId: Types.ObjectId) => {
  const schoolRoot = await findSibling(workspaceId, null, ['School Boards']);
  if (!schoolRoot) return;

  await restoreMisplacedTopLevelCategories(workspaceId);

  const cbseRoot = await ensurePath(workspaceId, ['School Boards', 'CBSE'], 'board', 'cbse', 'emerald');
  const stateBoardsRoot = await ensurePath(workspaceId, ['School Boards', 'State Boards'], 'board', 'state-board', 'emerald');
  const ncertWrapperNames = ['NCERT', 'NCERT Books', 'NCERT Books and Solutions'];

  for (const parentId of [schoolRoot._id as Types.ObjectId, cbseRoot._id as Types.ObjectId]) {
    const wrapper = await findSibling(workspaceId, parentId, ncertWrapperNames);
    await moveGlobalNcertBooksIntoClasses(workspaceId, cbseRoot, wrapper);
  }

  for (let classNumber = 1; classNumber <= 12; classNumber += 1) {
    const className = `Class ${classNumber}`;
    const directClass = await findSibling(workspaceId, schoolRoot._id as Types.ObjectId, [className]);
    if (!directClass) continue;
    await moveOrMergeCard(workspaceId, directClass, cbseRoot._id as Types.ObjectId, className, {
      goalType: 'class',
      iconKey: classNumber <= 5 ? 'class-primary' : classNumber <= 9 ? 'class-middle' : 'cbse',
      tone: 'emerald',
      order: getBranchOrder(className),
    });
  }

  let commonStateRoot: CardDoc | null = null;
  for (let classNumber = 1; classNumber <= 12; classNumber += 1) {
    const className = `Class ${classNumber}`;
    const directStateClass = await findSibling(workspaceId, stateBoardsRoot._id as Types.ObjectId, [className]);
    if (!directStateClass) continue;
    const childCount = await StudyCard.countDocuments({ workspaceId, parentId: directStateClass._id, status: { $ne: 'archived' } });
    if ((directStateClass.files || []).length || childCount > 0) {
      if (!commonStateRoot) {
        commonStateRoot = await ensurePath(
          workspaceId,
          ['School Boards', 'State Boards', 'Common Resources'],
          'resource_folder',
          'folder',
          'slate'
        );
      }
      await moveOrMergeCard(workspaceId, directStateClass, commonStateRoot._id as Types.ObjectId, className, {
        goalType: 'class',
        iconKey: classNumber <= 5 ? 'class-primary' : classNumber <= 9 ? 'class-middle' : 'state-board',
        tone: 'amber',
        order: getBranchOrder(className),
      });
    } else {
      await archiveCard(directStateClass);
    }
  }

  for (const legacyGroupName of ['Classes 1-5', 'Classes 6-9']) {
    const legacyGroup = await findSibling(workspaceId, cbseRoot._id as Types.ObjectId, [legacyGroupName]);
    if (!legacyGroup) continue;
    const children = await getChildren(workspaceId, legacyGroup._id as Types.ObjectId);
    for (const child of children) {
      await moveOrMergeCard(workspaceId, child, cbseRoot._id as Types.ObjectId, compactName(child.name), {
        goalType: /^class\s+\d{1,2}$/i.test(child.name) ? 'class' : 'resource_folder',
        iconKey: getIconKey(child.name, 'class-middle'),
        tone: 'emerald',
        order: getBranchOrder(child.name),
      });
    }
    const remainingChildren = await StudyCard.countDocuments({ workspaceId, parentId: legacyGroup._id, status: { $ne: 'archived' } });
    if (remainingChildren === 0 && !(legacyGroup.files || []).length) await archiveCard(legacyGroup);
  }

  const otherStateBoards = await findSibling(workspaceId, stateBoardsRoot._id as Types.ObjectId, ['Other State Boards']);
  if (otherStateBoards) {
    const children = await getChildren(workspaceId, otherStateBoards._id as Types.ObjectId);
    for (const child of children) {
      await moveOrMergeCard(workspaceId, child, stateBoardsRoot._id as Types.ObjectId, compactName(child.name), {
        goalType: 'board',
        iconKey: 'state-board',
        tone: 'emerald',
        order: getBranchOrder(child.name),
      });
    }
    const remainingChildren = await StudyCard.countDocuments({ workspaceId, parentId: otherStateBoards._id, status: { $ne: 'archived' } });
    if (remainingChildren === 0 && !(otherStateBoards.files || []).length) await archiveCard(otherStateBoards);
  }

  const stateBoardNames = detailedSchoolBoardSpecs
    .filter((spec) => normalizeNameKey(spec.family) === 'state boards')
    .map((spec) => compactName(spec.exam));
  for (const boardName of stateBoardNames) {
    const directBoard = await findSibling(workspaceId, schoolRoot._id as Types.ObjectId, [boardName]);
    if (!directBoard) continue;
    await moveOrMergeCard(workspaceId, directBoard, stateBoardsRoot._id as Types.ObjectId, boardName, {
      goalType: 'board',
      iconKey: 'state-board',
      tone: 'emerald',
      order: getBranchOrder(boardName),
    });
  }

  const stateBoardSpecs = detailedSchoolBoardSpecs.filter((spec) => normalizeNameKey(spec.family) === 'state boards');
  for (const spec of stateBoardSpecs) {
    const targetBoard = await ensurePath(
      workspaceId,
      ['School Boards', 'State Boards', spec.exam],
      'board',
      spec.icon || 'state-board',
      spec.tone || 'emerald'
    );
    for (const alias of spec.aliases || []) {
      const aliasBoard = await findSibling(workspaceId, stateBoardsRoot._id as Types.ObjectId, [alias]);
      if (!aliasBoard || String(aliasBoard._id) === String(targetBoard._id)) continue;
      await moveOrMergeCard(workspaceId, aliasBoard, stateBoardsRoot._id as Types.ObjectId, targetBoard.name, {
        goalType: 'board',
        iconKey: targetBoard.iconKey,
        tone: targetBoard.tone,
        order: targetBoard.order,
      });
    }
  }

  await cleanSchoolFamilyRootResourceShelves(workspaceId, cbseRoot, 'cbse');
  await archiveEmptySchoolRootResourceShelves(workspaceId, stateBoardsRoot);
  await cleanCbseClassResourceShelves(workspaceId, cbseRoot);
  await cleanStateBoardClassResourceShelves(workspaceId, stateBoardsRoot);
  await restoreMisplacedTopLevelCategories(workspaceId);
};

const moveMisplacedPsuCompanies = async (workspaceId: Types.ObjectId) => {
  const gatePsuRoot = await ensurePath(
    workspaceId,
    ['Competitive Exams', 'Engineering Services & PSU', 'Gate Based PSU Recruitment'],
    'exam',
    'oil',
    'cyan'
  );
  const companiesWrapper = await findSibling(workspaceId, gatePsuRoot._id as Types.ObjectId, ['Companies']);
  if (!companiesWrapper) return;

  const children = await getChildren(workspaceId, companiesWrapper._id as Types.ObjectId);
  for (const child of children) {
    await moveOrMergeCard(workspaceId, child, gatePsuRoot._id as Types.ObjectId, compactName(child.name), {
      goalType: 'resource_folder',
      iconKey: getIconKey(child.name, 'engineering'),
      tone: getTone(child.name, 'cyan'),
      order: getBranchOrder(child.name),
    });
  }

  const remainingChildren = await StudyCard.countDocuments({ workspaceId, parentId: companiesWrapper._id, status: { $ne: 'archived' } });
  if (remainingChildren === 0 && !(companiesWrapper.files || []).length) await archiveCard(companiesWrapper);
};

const gateRootPath = ['Entrance Exams', 'GATE'];
const gateCommonBranchName = 'General Aptitude and Common Resources';
const gateBranchResourceFolders = ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material', 'Mock Tests', 'Answer Keys', 'Strategy', 'Updates'];
const gateLegacyResourceWrappers = [
  { resourceName: 'Overview', aliases: ['Overview', 'About GATE'] },
  { resourceName: 'Syllabus', aliases: ['Syllabus', 'Official Syllabus', 'Exam Pattern'] },
  { resourceName: 'Previous Year Papers', aliases: ['Previous Year Papers', 'Previous Year Paper', 'Previous Year Question Papers', 'Question Papers', 'PYQ', 'PYQs'] },
  { resourceName: 'Study Material', aliases: ['Study Material', 'Notes', 'Revision Material', 'Available Official Material'] },
  { resourceName: 'Mock Tests', aliases: ['Mock Tests', 'Mock Test', 'Practice Tests', 'Branch-wise Mocks'] },
  { resourceName: 'Answer Keys', aliases: ['Answer Keys', 'Answer Key', 'Marking Schemes', 'Solutions'] },
  { resourceName: 'Strategy', aliases: ['Strategy', 'Branch-wise Strategy', 'PSU Guide via GATE'] },
  { resourceName: 'Updates', aliases: ['Updates', 'Notifications', 'Notification'] },
];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getGatePaperAliases = (paper: GateTestPaper) => {
  const aliases = [
    getGatePaperBranchName(paper),
    `${paper.code} ${paper.name}`,
    paper.code,
    paper.name,
    `GATE ${paper.code}`,
    `GATE ${paper.name}`,
    ...((paper.aliases || []) as string[]),
    ...((paper.aliases || []) as string[]).map((alias) => `GATE ${alias}`),
  ];
  return Array.from(new Set(aliases.map(compactName).filter(Boolean)));
};

const gatePaperExactAliasMap = new Map<string, GateTestPaper>();
const gatePaperAliasEntries = gateTestPapers
  .flatMap((paper) =>
    getGatePaperAliases(paper).map((alias) => {
      const key = normalizeNameKey(alias);
      gatePaperExactAliasMap.set(key, paper);
      return { key, paper };
    })
  )
  .filter((entry) => entry.key)
  .sort((a, b) => b.key.length - a.key.length);

const inferGatePaperFromName = (name = '') => {
  const key = normalizeNameKey(compactName(name).replace(/\(([^)]+)\)/g, ' $1 '));
  if (!key) return null;
  const exact = gatePaperExactAliasMap.get(key);
  if (exact) return exact;

  for (const entry of gatePaperAliasEntries) {
    if (entry.key.length <= 2) {
      if (entry.key === 'in') {
        if (key === 'in' || key.startsWith('in ') || /\binstrumentation\b/.test(key)) return entry.paper;
        continue;
      }
      if (new RegExp(`(^|\\s)${escapeRegex(entry.key)}(\\s|$)`).test(key)) return entry.paper;
      continue;
    }
    if (new RegExp(`(^|\\s)${escapeRegex(entry.key)}(\\s|$)`).test(key)) return entry.paper;
  }
  return null;
};

const ensureGatePaperCard = async (workspaceId: Types.ObjectId, gateRoot: CardDoc, paper: GateTestPaper) =>
  ensureCard(workspaceId, gateRoot._id as Types.ObjectId, getGatePaperBranchName(paper), {
    aliases: getGatePaperAliases(paper),
    goalType: 'exam',
    iconKey: 'gate',
    tone: 'cyan',
    order: getBranchOrder(getGatePaperBranchName(paper)),
    status: 'published',
  });

const ensureGateResourceFolder = async (workspaceId: Types.ObjectId, paperCard: CardDoc, resourceName: string) =>
  ensureCard(workspaceId, paperCard._id as Types.ObjectId, resourceName, {
    goalType: 'resource_folder',
    iconKey: getIconKey(resourceName),
    tone: getTone(resourceName, 'cyan'),
    order: getBranchOrder(resourceName),
    status: 'published',
  });

const ensureGateCommonBranch = async (workspaceId: Types.ObjectId, gateRoot: CardDoc) =>
  ensureCard(workspaceId, gateRoot._id as Types.ObjectId, gateCommonBranchName, {
    goalType: 'resource_folder',
    iconKey: 'aptitude',
    tone: 'cyan',
    order: getBranchOrder(gateCommonBranchName),
    status: 'published',
  });

const moveGateCardToPaperResource = async (
  workspaceId: Types.ObjectId,
  gateRoot: CardDoc,
  source: CardDoc,
  paper: GateTestPaper,
  resourceName: string
) => {
  const paperCard = await ensureGatePaperCard(workspaceId, gateRoot, paper);
  await ensureGateResourceFolder(workspaceId, paperCard, resourceName);
  return moveOrMergeCard(workspaceId, source, paperCard._id as Types.ObjectId, resourceName, {
    goalType: 'resource_folder',
    iconKey: getIconKey(resourceName),
    tone: getTone(resourceName, 'cyan'),
    order: getBranchOrder(resourceName),
  });
};

const moveGateCardToCommonResource = async (
  workspaceId: Types.ObjectId,
  gateRoot: CardDoc,
  source: CardDoc,
  resourceName: string
) => {
  const commonCard = await ensureGateCommonBranch(workspaceId, gateRoot);
  return moveOrMergeCard(workspaceId, source, commonCard._id as Types.ObjectId, resourceName, {
    goalType: 'resource_folder',
    iconKey: getIconKey(resourceName),
    tone: getTone(resourceName, 'cyan'),
    order: getBranchOrder(resourceName),
  });
};

const archiveGateWrapperIfEmpty = async (workspaceId: Types.ObjectId, wrapper: CardDoc) => {
  const remainingChildren = await StudyCard.countDocuments({ workspaceId, parentId: wrapper._id, status: { $ne: 'archived' } });
  if (remainingChildren === 0 && !(wrapper.files || []).length) await archiveCard(wrapper);
};

const moveDirectGatePaperWrappers = async (workspaceId: Types.ObjectId, gateRoot: CardDoc) => {
  const resourceWrapperNames = new Set(gateLegacyResourceWrappers.flatMap((wrapper) => wrapper.aliases.map((alias) => normalizeNameKey(alias))));
  const children = await getChildren(workspaceId, gateRoot._id as Types.ObjectId);
  for (const child of children) {
    const childKey = normalizeNameKey(child.name);
    if (resourceWrapperNames.has(childKey) || childKey === normalizeNameKey(gateCommonBranchName)) continue;
    const paper = inferGatePaperFromName(child.name);
    if (!paper) continue;
    const targetName = getGatePaperBranchName(paper);
    if (normalizeNameKey(child.name) === normalizeNameKey(targetName)) {
      await ensureGatePaperCard(workspaceId, gateRoot, paper);
      continue;
    }
    await moveOrMergeCard(workspaceId, child, gateRoot._id as Types.ObjectId, targetName, {
      goalType: 'exam',
      iconKey: 'gate',
      tone: 'cyan',
      order: getBranchOrder(targetName),
    });
  }
};

const moveLegacyGateResourceWrapper = async (
  workspaceId: Types.ObjectId,
  gateRoot: CardDoc,
  resourceName: string,
  aliases: string[]
) => {
  const wrapper = await findSibling(workspaceId, gateRoot._id as Types.ObjectId, aliases);
  if (!wrapper) return;

  const children = await getChildren(workspaceId, wrapper._id as Types.ObjectId);
  for (const child of children) {
    const paper = inferGatePaperFromName(child.name);
    if (!paper) continue;
    await moveGateCardToPaperResource(workspaceId, gateRoot, child, paper, resourceName);
  }

  const remainingChildren = await StudyCard.countDocuments({ workspaceId, parentId: wrapper._id, status: { $ne: 'archived' } });
  if (remainingChildren > 0 || (wrapper.files || []).length) {
    await moveGateCardToCommonResource(workspaceId, gateRoot, wrapper, resourceName);
    return;
  }
  await archiveGateWrapperIfEmpty(workspaceId, wrapper);
};

const organizeGateBranchHierarchy = async (workspaceId: Types.ObjectId) => {
  const gateRoot = await ensurePath(workspaceId, gateRootPath, 'exam', 'gate', 'cyan');

  for (const paper of gateTestPapers) {
    const paperCard = await ensureGatePaperCard(workspaceId, gateRoot, paper);
    for (const resourceName of gateBranchResourceFolders) {
      await ensureGateResourceFolder(workspaceId, paperCard, resourceName);
    }
  }

  await moveDirectGatePaperWrappers(workspaceId, gateRoot);

  for (const wrapper of gateLegacyResourceWrappers) {
    await moveLegacyGateResourceWrapper(workspaceId, gateRoot, wrapper.resourceName, wrapper.aliases);
  }
};

const sortGateSiblings = async (workspaceId: Types.ObjectId) => {
  const gateRoot = await ensurePath(workspaceId, gateRootPath, 'exam', 'gate', 'cyan');
  const parentQueue: Types.ObjectId[] = [gateRoot._id as Types.ObjectId];

  while (parentQueue.length) {
    const parentId = parentQueue.shift() as Types.ObjectId;
    const siblings = await getChildren(workspaceId, parentId);
    const siblingOrder = (name: string) => normalizeNameKey(name) === normalizeNameKey(gateCommonBranchName) ? 10000 : getBranchOrder(name);
    siblings.sort((a, b) => siblingOrder(a.name) - siblingOrder(b.name) || a.name.localeCompare(b.name));
    for (const [index, sibling] of siblings.entries()) {
      parentQueue.push(sibling._id as Types.ObjectId);
      const nextOrder = (index + 1) * 10;
      if (sibling.order !== nextOrder) {
        sibling.order = nextOrder;
        sanitizeCardFiles(sibling);
        await sibling.save();
        stats.styled += 1;
      }
    }
  }
};

const branchFirstCommonFolderName = 'Common Resources';

type BranchFirstResourceWrapper = {
  resourceName: string;
  aliases: string[];
  structural?: boolean;
};

const branchFirstResourceWrappers: BranchFirstResourceWrapper[] = [
  { resourceName: 'Overview', aliases: ['Overview', 'About', 'Exam Info'] },
  { resourceName: 'Overview', aliases: ['State Exams', 'Programs', 'Levels', 'Exam Tracks', 'Courses', 'Roles'], structural: true },
  { resourceName: 'Syllabus', aliases: ['Syllabus', 'Official Syllabus', 'Exam Pattern'] },
  { resourceName: 'Previous Year Papers', aliases: ['Previous Year Papers', 'Previous Year Paper', 'Previous Year Question Papers', 'Question Papers', 'PYQ', 'PYQs'] },
  { resourceName: 'Study Material', aliases: ['Study Material', 'Notes', 'Revision Material', 'Available Official Material', 'ICAI Study Material', 'Bare Acts', 'Case Laws'] },
  { resourceName: 'Mock Tests', aliases: ['Mock Tests', 'Mock Test', 'Practice Tests', 'Section-wise Tests', 'Sectional Tests'] },
  { resourceName: 'Practice Questions', aliases: ['Practice', 'Practice Questions', 'Chapter-wise PYQs', 'Topic-wise PYQs', 'Drawing Practice', 'Drawing Practice Sheets', 'MTP RTP Papers'] },
  { resourceName: 'Sample Papers', aliases: ['Sample Papers', 'Sample Paper'] },
  { resourceName: 'Answer Keys', aliases: ['Answer Keys', 'Answer Key', 'Marking Schemes', 'Solutions'] },
  { resourceName: 'Updates', aliases: ['Updates', 'Notifications', 'Notification', 'Current Affairs'] },
  { resourceName: 'Strategy', aliases: ['Strategy', 'Booklist', 'Portfolio Guide', 'University Preference Guide', 'Studio Test Preparation', 'Situation Test Preparation'] },
  { resourceName: 'Interview', aliases: ['Interview', 'Interview Prep', 'GD & Interview Prep', 'WAT PI Preparation', 'SSB'] },
  { resourceName: 'Selection Process', aliases: ['Selection Process', 'Physical Test Guide', 'Physical & Medical Test Guide', 'Skill Test Guide'] },
  { resourceName: 'Counselling Guide', aliases: ['Counselling Guide'] },
  { resourceName: 'Books', aliases: ['Books', 'Book', 'Textbooks', 'Textbook', 'NCERT Books'] },
];

const branchFirstWrapperByKey = new Map<string, BranchFirstResourceWrapper>();
for (const wrapper of branchFirstResourceWrappers) {
  for (const alias of wrapper.aliases) {
    branchFirstWrapperByKey.set(normalizeNameKey(alias), wrapper);
  }
}

const romanTokenMap = new Map([
  ['i', '1'],
  ['ii', '2'],
  ['iii', '3'],
  ['iv', '4'],
  ['v', '5'],
]);

const normalizeBranchFirstTargetKey = (name = '') =>
  normalizeNameKey(compactName(name))
    .replace(/\b(tier|phase|paper|part|session|gs|cbt|group)\s+(i|ii|iii|iv|v)\b/g, (_match, prefix, roman) => `${prefix} ${romanTokenMap.get(roman) || roman}`)
    .replace(/\bprelims\b/g, 'prelims')
    .replace(/\bmains\b/g, 'mains')
    .trim();

const genericBranchFirstTargetKeys = new Set([
  'official syllabus',
  'exam pattern',
  'available official material',
  'notes',
  'revision material',
  'year wise',
  'topic wise previous year papers',
  'topic wise pyqs',
  'topic wise',
  'full mock',
  'full mock test',
  'subject wise',
  'chapter wise',
  'section wise',
  'sectional tests',
  'solutions',
  'answer key',
  'answer keys',
  'notification',
  'admit card',
  'result',
  'cut off',
  'cut off and college predictor',
  'rank vs branch guide',
  'booklist',
  'topper strategy',
  '12 month plan',
  '6 month plan',
  'all papers',
  'all subjects',
].map(normalizeBranchFirstTargetKey));

const isGenericBranchFirstTarget = (name = '') => {
  const key = normalizeBranchFirstTargetKey(name);
  if (!key) return true;
  if (genericBranchFirstTargetKeys.has(key)) return true;
  if (/^(19|20)\d{2}$/.test(key)) return true;
  if (/^(paper|slot|session)\s*\d+$/.test(key)) return false;
  return false;
};

const inferBranchFirstTargetGoalType = (name = ''): StudyCardGoalType => {
  const key = normalizeBranchFirstTargetKey(name);
  if (/^class\s+\d{1,2}$/.test(key)) return 'class';
  if (
    [
      'physics',
      'chemistry',
      'biology',
      'mathematics',
      'maths',
      'english',
      'reasoning',
      'quant',
      'quantitative aptitude',
      'general awareness',
      'computer science',
      'economics',
      'history',
      'geography',
      'polity',
      'accountancy',
      'business studies',
      'statistics',
      'aptitude',
    ].some((subject) => key === subject || key.includes(subject))
  ) {
    return 'subject';
  }
  return 'resource_folder';
};

const shouldPromoteBranchFirstTarget = (
  root: CardDoc,
  hit: { wrappers: Map<string, BranchFirstResourceWrapper>; sources: Array<{ wrapper: CardDoc; child: CardDoc; def: BranchFirstResourceWrapper }> }
) => {
  if (branchFirstAll) return true;
  if (Array.from(hit.wrappers.values()).some((wrapper) => wrapper.structural)) return true;
  if (hit.wrappers.size >= 2) return true;
  if (root.goalType === 'class') return true;
  return false;
};

const ensureBranchFirstCommonFolder = async (workspaceId: Types.ObjectId, root: CardDoc) =>
  ensureCard(workspaceId, root._id as Types.ObjectId, branchFirstCommonFolderName, {
    goalType: 'resource_folder',
    iconKey: 'folder',
    tone: 'slate',
    order: 10000,
    status: 'published',
  });

const sortStudyCardSubtreeSiblings = async (
  workspaceId: Types.ObjectId,
  rootId: Types.ObjectId,
  bottomNames: string[] = [branchFirstCommonFolderName]
) => {
  const bottomKeys = new Set(bottomNames.map(normalizeNameKey));
  const parentQueue: Types.ObjectId[] = [rootId];

  while (parentQueue.length) {
    const parentId = parentQueue.shift() as Types.ObjectId;
    const siblings = await getChildren(workspaceId, parentId);
    const siblingOrder = (name: string) => bottomKeys.has(normalizeNameKey(name)) ? 10000 : getBranchOrder(name);
    siblings.sort((a, b) => siblingOrder(a.name) - siblingOrder(b.name) || a.name.localeCompare(b.name));
    for (const [index, sibling] of siblings.entries()) {
      parentQueue.push(sibling._id as Types.ObjectId);
      const nextOrder = (index + 1) * 10;
      if (sibling.order !== nextOrder) {
        sibling.order = nextOrder;
        sanitizeCardFiles(sibling);
        await sibling.save();
        stats.styled += 1;
      }
    }
  }
};

const sortDirectStudyCardChildren = async (
  workspaceId: Types.ObjectId,
  rootId: Types.ObjectId,
  bottomNames: string[] = [branchFirstCommonFolderName]
) => {
  const bottomKeys = new Set(bottomNames.map(normalizeNameKey));
  const siblings = await getChildren(workspaceId, rootId);
  const siblingOrder = (name: string) => bottomKeys.has(normalizeNameKey(name)) ? 10000 : getBranchOrder(name);
  siblings.sort((a, b) => siblingOrder(a.name) - siblingOrder(b.name) || a.name.localeCompare(b.name));
  for (const [index, sibling] of siblings.entries()) {
    const nextOrder = (index + 1) * 10;
    if (sibling.order !== nextOrder) {
      sibling.order = nextOrder;
      sanitizeCardFiles(sibling);
      await sibling.save();
      stats.styled += 1;
    }
  }
};

const moveResourceFirstChildrenUnderTargets = async (workspaceId: Types.ObjectId, root: CardDoc) => {
  const directChildren = await getChildren(workspaceId, root._id as Types.ObjectId);
  const wrappers = directChildren
    .map((child) => ({ child, def: branchFirstWrapperByKey.get(normalizeNameKey(child.name)) }))
    .filter((entry): entry is { child: CardDoc; def: BranchFirstResourceWrapper } => Boolean(entry.def));

  if (!wrappers.length) return false;

  const hits = new Map<
    string,
    {
      targetName: string;
      wrappers: Map<string, BranchFirstResourceWrapper>;
      sources: Array<{ wrapper: CardDoc; child: CardDoc; def: BranchFirstResourceWrapper }>;
    }
  >();

  for (const { child: wrapper, def } of wrappers) {
    const children = await getChildren(workspaceId, wrapper._id as Types.ObjectId);
    for (const child of children) {
      if (isGenericBranchFirstTarget(child.name)) continue;
      const targetKey = normalizeBranchFirstTargetKey(child.name);
      if (!targetKey) continue;
      if (!hits.has(targetKey)) {
        hits.set(targetKey, {
          targetName: compactName(child.name),
          wrappers: new Map(),
          sources: [],
        });
      }
      const hit = hits.get(targetKey) as NonNullable<ReturnType<typeof hits.get>>;
      hit.wrappers.set(normalizeNameKey(def.resourceName), def);
      hit.sources.push({ wrapper, child, def });
    }
  }

  let changed = false;
  for (const hit of hits.values()) {
    if (!shouldPromoteBranchFirstTarget(root, hit)) continue;

    const targetCard = await ensureCard(workspaceId, root._id as Types.ObjectId, hit.targetName, {
      aliases: hit.sources.map((source) => source.child.name),
      goalType: inferBranchFirstTargetGoalType(hit.targetName),
      iconKey: getIconKey(hit.targetName, 'folder'),
      tone: getTone(hit.targetName, 'cyan'),
      order: getBranchOrder(hit.targetName),
      status: 'published',
    });

    for (const source of hit.sources) {
      await moveOrMergeCard(workspaceId, source.child, targetCard._id as Types.ObjectId, source.def.resourceName, {
        goalType: 'resource_folder',
        iconKey: getIconKey(source.def.resourceName, 'folder'),
        tone: getTone(source.def.resourceName, 'cyan'),
        order: getBranchOrder(source.def.resourceName),
      });
      changed = true;
    }
  }

  if (!changed) return false;

  const commonFolder = await ensureBranchFirstCommonFolder(workspaceId, root);
  for (const { child: wrapper, def } of wrappers) {
    const freshWrapper = await StudyCard.findOne({
      _id: wrapper._id,
      workspaceId,
      status: { $ne: 'archived' },
      parentId: root._id,
    });
    if (!freshWrapper) continue;

    const childCount = await StudyCard.countDocuments({ workspaceId, parentId: freshWrapper._id, status: { $ne: 'archived' } });
    if (childCount === 0 && !(freshWrapper.files || []).length) {
      await archiveCard(freshWrapper);
      continue;
    }

    await moveOrMergeCard(workspaceId, freshWrapper, commonFolder._id as Types.ObjectId, def.resourceName, {
      goalType: 'resource_folder',
      iconKey: getIconKey(def.resourceName, 'folder'),
      tone: getTone(def.resourceName, 'slate'),
      order: getBranchOrder(def.resourceName),
    });
  }

  if (branchFirstAll) {
    await sortDirectStudyCardChildren(workspaceId, root._id as Types.ObjectId);
  } else {
    await sortStudyCardSubtreeSiblings(workspaceId, root._id as Types.ObjectId);
  }
  return true;
};

const organizeAllBranchFirstHierarchies = async (workspaceId: Types.ObjectId) => {
  const roots = await StudyCard.find({
    workspaceId,
    status: { $ne: 'archived' },
    goalType: { $in: ['exam_family', 'exam', 'board', 'class'] },
    ...(branchFirstSlug ? { slug: branchFirstSlug } : {}),
  }).sort({ parentId: 1, order: 1, name: 1 });

  let organized = 0;
  for (const root of roots) {
    const didOrganize = await moveResourceFirstChildrenUnderTargets(workspaceId, root);
    if (didOrganize) organized += 1;
    if (branchFirstLimit > 0 && organized >= branchFirstLimit) break;
  }
  return organized;
};

const styleAllCardIcons = async (workspaceId: Types.ObjectId) => {
  const cards = await StudyCard.find({ workspaceId, status: { $ne: 'archived' } }).select('name iconKey tone iconUrl order');
  const operations: any[] = [];
  for (const card of cards) {
    const nextIconKey = getIconKey(card.name, card.iconKey || 'folder');
    const nextTone = getTone(card.name, card.tone || 'blue');
    const nextIconUrl = card.iconUrl || getCompanyLogoUrl(card.name);
    const nextOrder = getBranchOrder(card.name);
    const changed =
      card.iconKey !== nextIconKey ||
      card.tone !== nextTone ||
      card.order !== nextOrder ||
      (Boolean(nextIconUrl) && card.iconUrl !== nextIconUrl);
    if (!changed) continue;
    operations.push({
      updateOne: {
        filter: { _id: card._id },
        update: {
          $set: {
            iconKey: nextIconKey,
            tone: nextTone,
            order: nextOrder,
            ...(nextIconUrl ? { iconUrl: nextIconUrl } : {}),
          },
        },
      },
    });
    stats.styled += 1;
  }
  if (operations.length) await StudyCard.bulkWrite(operations, { ordered: false });
};

const normalizeAllCardNames = async (workspaceId: Types.ObjectId) => {
  const cards = await StudyCard.find({ workspaceId, status: { $ne: 'archived' } }).sort({ parentId: 1, order: 1, name: 1 });
  for (const card of cards) {
    const childCount = await StudyCard.countDocuments({ workspaceId, parentId: card._id, status: { $ne: 'archived' } });
    if (isPlaceholderName(card.name) && !(card.files || []).length && childCount === 0) {
      await archiveCard(card);
      continue;
    }

    const cleanName = compactName(card.name);
    if (!cleanName) continue;
    await moveOrMergeCard(workspaceId, card, card.parentId || null, cleanName, {
      goalType: card.goalType || (card.parentId ? 'resource_folder' : 'exam_category'),
      iconKey: getIconKey(cleanName, card.iconKey),
      tone: getTone(cleanName, card.tone),
      order: getBranchOrder(cleanName),
    });
  }
};

const shouldUnwrapCard = async (workspaceId: Types.ObjectId, card: CardDoc) => {
  if ((card.files || []).length) return false;
  const children = await getChildren(workspaceId, card._id as Types.ObjectId);
  if (!children.length) return false;

  const key = normalizeNameKey(card.name);
  const duplicateAncestorKeys = new Set([
    'previous year papers',
    'study material',
    'mock tests',
    'answer keys',
    'updates',
    'syllabus',
  ]);

  if (duplicateAncestorKeys.has(key)) {
    let parentId = card.parentId;
    while (parentId) {
      const parent = await StudyCard.findById(parentId).select('name parentId').lean();
      if (!parent) break;
      if (normalizeNameKey(parent.name) === key) return true;
      parentId = parent.parentId as any;
    }
  }

  const genericKeys = new Set([
    'banking exam',
    'content',
    'documents',
    'exam',
    'exams',
    'folder',
    'folders',
    'india exam library',
    'library',
    'exam library',
    'study hub library',
    'overview',
    'resources',
    'study hub',
  ]);
  if (genericKeys.has(key) || isPlaceholderName(card.name)) return true;

  if (card.parentId) {
    const parent = await StudyCard.findById(card.parentId).select('name').lean();
    if (parent && normalizeNameKey(parent.name) === key) return true;
  }
  return false;
};

const unwrapRedundantCards = async (workspaceId: Types.ObjectId) => {
  for (let pass = 0; pass < 3; pass += 1) {
    const cards = await StudyCard.find({ workspaceId, status: { $ne: 'archived' } }).sort({ parentId: 1, order: 1, name: 1 });
    for (const card of cards) {
      if (!(await shouldUnwrapCard(workspaceId, card))) continue;
      const children = await getChildren(workspaceId, card._id as Types.ObjectId);
      for (const child of children) {
        await moveOrMergeCard(workspaceId, child, card.parentId || null, compactName(child.name));
      }
      const remainingChildren = await StudyCard.countDocuments({ workspaceId, parentId: card._id, status: { $ne: 'archived' } });
      if (remainingChildren === 0 && !(card.files || []).length) await archiveCard(card);
    }
  }
};

const unwrapAuditGenericWrappers = async (workspaceId: Types.ObjectId, items: AuditItem[]) => {
  let unwrapped = 0;
  for (const item of items) {
    const card = await StudyCard.findOne({ _id: item.id, workspaceId, status: { $ne: 'archived' } });
    if (!card || (card.files || []).length) continue;
    const children = await getChildren(workspaceId, card._id as Types.ObjectId);
    if (!children.length) continue;

    for (const child of children) {
      await moveOrMergeCard(workspaceId, child, card.parentId || null, compactName(child.name), {
        goalType: child.goalType || 'resource_folder',
        iconKey: getIconKey(child.name, child.iconKey || 'folder'),
        tone: getTone(child.name, child.tone || 'blue'),
        order: getBranchOrder(child.name),
      });
    }

    const remainingChildren = await StudyCard.countDocuments({ workspaceId, parentId: card._id, status: { $ne: 'archived' } });
    if (remainingChildren === 0 && !(card.files || []).length) {
      await archiveCard(card);
      unwrapped += 1;
    }
  }
  return unwrapped;
};

const publishContentAncestors = async (workspaceId: Types.ObjectId) => {
  const cards = await StudyCard.find({ workspaceId, status: { $ne: 'archived' } }).select('_id parentId status visibility files');
  const cardById = new Map(cards.map((card: any) => [String(card._id), card]));
  const publishIds = new Set<string>();

  for (const card of cards) {
    if (!(card.files || []).length) continue;
    let current: any = card;
    while (current) {
      const id = String(current._id);
      if (publishIds.has(id)) break;
      publishIds.add(id);
      const parentId = current.parentId ? String(current.parentId) : '';
      current = parentId ? cardById.get(parentId) : null;
    }
  }

  for (const id of publishIds) {
    const card = cardById.get(id);
    if (!card) continue;
    if (card.status !== 'published' || card.visibility !== 'public') {
      card.status = 'published';
      card.visibility = 'public';
      await card.save();
      stats.styled += 1;
    }
  }
};

const publishTaxonomyBlueprints = async (workspaceId: Types.ObjectId, kits: KitDefinition[]) => {
  const rootNames = Array.from(new Set(kits.map((kit) => compactName(kit.rootPath[0])).filter(Boolean)));
  const rootSlugs = rootNames.flatMap((name) => [slugify(name), slugify(compactName(name))]);
  const roots = await StudyCard.find({
    workspaceId,
    parentId: null,
    status: { $ne: 'archived' },
    slug: { $in: Array.from(new Set(rootSlugs)) },
  }).select('_id');

  const queue = roots.map((root: any) => root._id as Types.ObjectId);
  let published = 0;

  while (queue.length) {
    const parentIds = queue.splice(0, 200);
    const children = await StudyCard.find({
      workspaceId,
      parentId: { $in: parentIds },
      status: { $ne: 'archived' },
    }).select('_id status visibility');

    for (const child of children as CardDoc[]) {
      queue.push(child._id as Types.ObjectId);
      if (child.status !== 'published' || child.visibility !== 'public') {
        child.status = 'published';
        child.visibility = 'public';
        await child.save();
        published += 1;
      }
    }
  }

  if (published) stats.styled += published;
};

const sortAllSiblings = async (workspaceId: Types.ObjectId) => {
  const cards = await StudyCard.find({ workspaceId, status: { $ne: 'archived' } });
  const parentKeys = Array.from(new Set(cards.map((card: any) => String(card.parentId || 'root'))));
  for (const parentKey of parentKeys) {
    const parentId = parentKey === 'root' ? null : new Types.ObjectId(parentKey);
    const siblings = await StudyCard.find({ workspaceId, parentId, status: { $ne: 'archived' } }).sort({ order: 1, name: 1 });
    siblings.sort((a, b) => getBranchOrder(a.name) - getBranchOrder(b.name) || a.name.localeCompare(b.name));
    for (const [index, sibling] of siblings.entries()) {
      const nextOrder = (index + 1) * 10;
      if (sibling.order !== nextOrder) {
        sibling.order = nextOrder;
        await sibling.save();
        stats.styled += 1;
      }
    }
  }
};

const getLibraryTotals = async (workspaceId: Types.ObjectId) => {
  const activeFolders = await StudyCard.countDocuments({ workspaceId, status: { $ne: 'archived' } });
  const pdfs = await StudyCard.aggregate([
    { $match: { workspaceId, status: { $ne: 'archived' } } },
    { $project: { fileCount: { $size: '$files' } } },
    { $group: { _id: null, total: { $sum: '$fileCount' } } },
  ]);

  return {
    activeFolders,
    totalPdfs: pdfs[0]?.total || 0,
  };
};

const getAuditSnapshot = async (workspaceId: Types.ObjectId) => {
  const cards = await StudyCard.find({ workspaceId, status: { $ne: 'archived' } })
    .select('_id parentId name status visibility files goalType order')
    .lean();
  const cardById = new Map<string, any>(cards.map((card: any) => [String(card._id), card]));
  const childrenByParent = new Map<string, any[]>();

  for (const card of cards as any[]) {
    const parentKey = String(card.parentId || 'root');
    const children = childrenByParent.get(parentKey) || [];
    children.push(card);
    childrenByParent.set(parentKey, children);
  }

  const pathMemo = new Map<string, string[]>();
  const cyclicCardIds = new Set<string>();
  const getPathParts = (card: any, visiting = new Set<string>()): string[] => {
    const id = String(card._id);
    const cached = pathMemo.get(id);
    if (cached) return cached;
    if (visiting.has(id)) {
      cyclicCardIds.add(id);
      return [`Cycle Detected`, card.name || id];
    }

    visiting.add(id);
    const parent = card.parentId ? cardById.get(String(card.parentId)) : null;
    const parts = parent ? [...getPathParts(parent, visiting), card.name] : [card.name];
    visiting.delete(id);
    pathMemo.set(id, parts);
    return parts;
  };

  const totalPdfs = (cards as any[]).reduce((sum, card) => sum + ((card.files || []).length || 0), 0);
  return { cards: cards as any[], cardById, childrenByParent, getPathParts, totalPdfs, cyclicCardIds };
};

const makeAuditItem = (
  card: any,
  reason: string,
  childCount: number,
  getPathParts: (card: any) => string[],
  studentClicks: number
): AuditItem => {
  const parts = getPathParts(card);
  return {
    id: String(card._id),
    path: parts.join(' / '),
    reason,
    fileCount: (card.files || []).length || 0,
    childCount,
    status: card.status || 'published',
    visibility: card.visibility || 'visible',
    depth: Math.max(0, parts.length - 1),
    studentClicks,
  };
};

const buildCleanupAudit = async (workspaceId: Types.ObjectId) => {
  const { cards, cardById, childrenByParent, getPathParts, totalPdfs, cyclicCardIds } = await getAuditSnapshot(workspaceId);
  const emptyPlaceholders: AuditItem[] = [];
  const genericWrappers: AuditItem[] = [];
  const deepPaths: AuditItem[] = [];
  const draftFolders: AuditItem[] = [];
  const emptyFolders: AuditItem[] = [];

  const duplicateAncestorKeys = new Set([
    'previous year papers',
    'study material',
    'mock tests',
    'answer keys',
    'updates',
    'syllabus',
  ]);
  const genericKeys = new Set([
    'content',
    'document',
    'documents',
    'exam',
    'exams',
    'folder',
    'folders',
    'india exam library',
    'library',
    'exam library',
    'study hub library',
    'overview',
    'resources',
    'study hub',
  ]);

  const hasAncestorWithKey = (card: any, key: string) => {
    let parentId = card.parentId ? String(card.parentId) : '';
    const seen = new Set<string>();
    while (parentId) {
      if (seen.has(parentId)) return false;
      seen.add(parentId);
      const parent = cardById.get(parentId);
      if (!parent) return false;
      if (normalizeNameKey(parent.name) === key) return true;
      parentId = parent.parentId ? String(parent.parentId) : '';
    }
    return false;
  };

  const parentHasSameKey = (card: any, key: string) => {
    const parent = card.parentId ? cardById.get(String(card.parentId)) : null;
    return Boolean(parent && normalizeNameKey(parent.name) === key);
  };
  const goalRootTypes = new Set(['exam', 'board', 'class']);
  const getStudentClicks = (card: any) => {
    let current = card;
    let clicks = 0;
    const seen = new Set<string>();
    while (current) {
      const currentId = String(current._id);
      if (seen.has(currentId)) return clicks;
      seen.add(currentId);
      if (goalRootTypes.has(current.goalType)) return clicks;
      const parent = current.parentId ? cardById.get(String(current.parentId)) : null;
      if (!parent) return clicks;
      current = parent;
      clicks += 1;
    }
    return clicks;
  };

  for (const card of cards) {
    const childCount = (childrenByParent.get(String(card._id)) || []).length;
    const fileCount = (card.files || []).length || 0;
    const key = normalizeNameKey(card.name);
    const parts = getPathParts(card);
    const depth = Math.max(0, parts.length - 1);
    const studentClicks = getStudentClicks(card);

    if (isPlaceholderName(card.name) && fileCount === 0 && childCount === 0) {
      emptyPlaceholders.push(makeAuditItem(card, 'empty placeholder', childCount, getPathParts, studentClicks));
      continue;
    }

    if (fileCount === 0 && childCount > 0) {
      const duplicateResource = duplicateAncestorKeys.has(key) && hasAncestorWithKey(card, key);
      if (genericKeys.has(key) || isPlaceholderName(card.name) || duplicateResource || parentHasSameKey(card, key)) {
        genericWrappers.push(makeAuditItem(card, 'empty wrapper', childCount, getPathParts, studentClicks));
      }
    }

    if (studentClicks > MAX_PREMIUM_STUDENT_CLICKS) deepPaths.push(makeAuditItem(card, 'deep path', childCount, getPathParts, studentClicks));
    if (card.status === 'draft') draftFolders.push(makeAuditItem(card, 'draft folder', childCount, getPathParts, studentClicks));
    if (fileCount === 0 && childCount === 0) emptyFolders.push(makeAuditItem(card, 'empty leaf', childCount, getPathParts, studentClicks));
  }

  const sortItems = (items: AuditItem[]) =>
    items.sort((a, b) => b.studentClicks - a.studentClicks || b.depth - a.depth || b.childCount - a.childCount || a.path.localeCompare(b.path));

  return {
    activeFolders: cards.length,
    totalPdfs,
    emptyPlaceholders: sortItems(emptyPlaceholders),
    genericWrappers: sortItems(genericWrappers),
    deepPaths: sortItems(deepPaths),
    draftFolders: sortItems(draftFolders),
    emptyFolders: sortItems(emptyFolders),
    cyclicFolders: Array.from(cyclicCardIds),
  };
};

const printCleanupAudit = async (workspaceId: Types.ObjectId) => {
  const audit = await buildCleanupAudit(workspaceId);
  const candidates = [...audit.emptyPlaceholders, ...audit.genericWrappers].slice(0, 12);
  const lines = [
    'Study Hub audit',
    `Active folders: ${audit.activeFolders}`,
    `PDFs: ${audit.totalPdfs}`,
    `Empty placeholders: ${audit.emptyPlaceholders.length}`,
    `Generic wrappers: ${audit.genericWrappers.length}`,
    `Deep paths (>${MAX_PREMIUM_STUDENT_CLICKS} student clicks): ${audit.deepPaths.length}`,
    `Draft folders: ${audit.draftFolders.length}`,
    `Empty leaf folders: ${audit.emptyFolders.length}`,
    `Parent cycles: ${audit.cyclicFolders.length}`,
  ];

  if (candidates.length) {
    lines.push('Top cleanup candidates:');
    candidates.forEach((item) => {
      lines.push(`- ${item.reason}: ${item.path} (${item.childCount} children, ${item.fileCount} PDFs)`);
    });
  }
  if (audit.deepPaths.length) {
    lines.push('Top deep path examples:');
    audit.deepPaths.slice(0, 10).forEach((item) => {
      lines.push(`- clicks ${item.studentClicks}, depth ${item.depth}: ${item.path} (${item.childCount} children, ${item.fileCount} PDFs)`);
    });
  }

  console.log(lines.join('\n'));
  return audit;
};

const archiveEmptyPlaceholders = async (workspaceId: Types.ObjectId) => {
  const cards = await StudyCard.find({ workspaceId, status: { $ne: 'archived' } }).sort({ parentId: 1, order: 1, name: 1 });
  const childCounts = new Map<string, number>();
  for (const card of cards as CardDoc[]) {
    const parentKey = String(card.parentId || 'root');
    childCounts.set(parentKey, (childCounts.get(parentKey) || 0) + 1);
  }

  for (const card of cards as CardDoc[]) {
    const childCount = childCounts.get(String(card._id)) || 0;
    if (isPlaceholderName(card.name) && !(card.files || []).length && childCount === 0) {
      await archiveCard(card);
    }
  }
};

const archiveDeepEmptyLeaves = async (workspaceId: Types.ObjectId, maxStudentClicks = MAX_PREMIUM_STUDENT_CLICKS) => {
  for (let pass = 0; pass < 6; pass += 1) {
    const audit = await buildCleanupAudit(workspaceId);
    const candidates = audit.deepPaths.filter(
      (item) => item.studentClicks > maxStudentClicks && item.fileCount === 0 && item.childCount === 0
    );
    if (!candidates.length) return;

    for (const item of candidates) {
      const card = await StudyCard.findOne({ _id: item.id, workspaceId, status: { $ne: 'archived' } });
      if (!card) continue;
      const childCount = await StudyCard.countDocuments({ workspaceId, parentId: card._id, status: { $ne: 'archived' } });
      if ((card.files || []).length || childCount > 0) continue;
      await archiveCard(card);
    }
  }
};

const archiveAuditDeepEmptyLeaves = async (workspaceId: Types.ObjectId, items: AuditItem[]) => {
  let archived = 0;
  const candidates = items.filter((item) => item.fileCount === 0 && item.childCount === 0);
  for (const item of candidates) {
    const card = await StudyCard.findOne({ _id: item.id, workspaceId, status: { $ne: 'archived' } });
    if (!card) continue;
    const childCount = await StudyCard.countDocuments({ workspaceId, parentId: card._id, status: { $ne: 'archived' } });
    if ((card.files || []).length || childCount > 0) continue;
    await archiveCard(card);
    archived += 1;
  }
  return archived;
};

const findParentCycleIds = async (workspaceId: Types.ObjectId) => {
  const cards = await StudyCard.find({ workspaceId, status: { $ne: 'archived' } }).select('_id parentId').lean();
  const cardById = new Map<string, any>(cards.map((card: any) => [String(card._id), card]));
  const cycleIds = new Set<string>();

  for (const card of cards as any[]) {
    const pathIds: string[] = [];
    const seen = new Set<string>();
    let current: any = card;
    while (current) {
      const currentId = String(current._id);
      if (seen.has(currentId)) {
        const cycleStartIndex = pathIds.indexOf(currentId);
        const members = cycleStartIndex >= 0 ? pathIds.slice(cycleStartIndex) : [currentId];
        members.forEach((id) => cycleIds.add(id));
        break;
      }
      seen.add(currentId);
      pathIds.push(currentId);
      const parentId = current.parentId ? String(current.parentId) : '';
      if (!parentId) break;
      current = cardById.get(parentId);
      if (!current) break;
    }
  }

  return Array.from(cycleIds);
};

const repairParentCycles = async (workspaceId: Types.ObjectId) => {
  const cycleIds = await findParentCycleIds(workspaceId);
  if (!cycleIds.length) return 0;
  const result = await StudyCard.updateMany(
    { workspaceId, _id: { $in: cycleIds.map((id) => new Types.ObjectId(id)) } },
    { $set: { parentId: null, visibility: 'public', status: 'published' } }
  );
  stats.moved += result.modifiedCount || 0;
  return cycleIds.length;
};

const pruneEmptyUniversityExtraLeaves = async (workspaceId: Types.ObjectId) => {
  const cards = await StudyCard.find({ workspaceId, status: { $ne: 'archived' } })
    .select('_id parentId name files')
    .lean();
  const cardById = new Map<string, any>(cards.map((card: any) => [String(card._id), card]));
  const childCounts = new Map<string, number>();

  for (const card of cards as any[]) {
    const parentKey = String(card.parentId || 'root');
    childCounts.set(parentKey, (childCounts.get(parentKey) || 0) + 1);
  }

  const extraLeafKeys = new Set(['notes', 'assignments', 'important questions', 'practical files', 'lab manuals']);
  const isUnderUniversityExams = (card: any) => {
    let current: any = card;
    const seen = new Set<string>();
    while (current) {
      const currentId = String(current._id);
      if (seen.has(currentId)) return false;
      seen.add(currentId);
      if (normalizeNameKey(current.name) === 'university exams') return true;
      const parentId = current.parentId ? String(current.parentId) : '';
      if (!parentId) return false;
      current = cardById.get(parentId);
    }
    return false;
  };

  const candidateIds = (cards as any[])
    .filter((card) => extraLeafKeys.has(normalizeNameKey(card.name)))
    .filter((card) => ((card.files || []).length || 0) === 0)
    .filter((card) => (childCounts.get(String(card._id)) || 0) === 0)
    .filter(isUnderUniversityExams)
    .map((card) => card._id);

  if (!candidateIds.length) return 0;
  const result = await StudyCard.updateMany(
    { workspaceId, _id: { $in: candidateIds } },
    { $set: { status: 'archived', visibility: 'private' } }
  );
  stats.archived += result.modifiedCount || 0;
  return candidateIds.length;
};

const run = async () => {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');
  if ((cleanupOnly || deepCleanOnly || repairCyclesOnly || pruneUniversityExtrasOnly) && !shouldApply) {
    console.log('Cleanup mode is write-enabled. Run with --apply --cleanup-only, --apply --deep-clean-only, --apply --repair-cycles-only, or --apply --prune-university-extras-only after reviewing --audit-only.');
    return;
  }
  if (!shouldApply && !auditOnly) {
    console.log('Dry mode only. Run with --apply to create kits and organize the Study Hub library.');
    return;
  }

  logStep('connecting to database');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const workspace = await Workspace.findOne({ slug: ROOT_WORKSPACE_SLUG }).select('_id').lean();
  if (!workspace) throw new Error('Study Hub workspace not found.');

  const workspaceId = workspace._id as Types.ObjectId;
  if (auditOnly) {
    await printCleanupAudit(workspaceId);
    return;
  }

  await primeSiblingCache(workspaceId);

  if (repairCyclesOnly) {
    logStep('repairing parent cycles');
    const repaired = await repairParentCycles(workspaceId);
    console.log(`Parent cycle repair complete. Repaired cards: ${repaired}.`);
    await printCleanupAudit(workspaceId);
    return;
  }

  if (pruneUniversityExtrasOnly) {
    logStep('pruning empty extra University Exams leaves');
    const pruned = await pruneEmptyUniversityExtraLeaves(workspaceId);
    console.log(`University Exams extra leaf prune complete. Archived empty leaves: ${pruned}.`);
    await printCleanupAudit(workspaceId);
    return;
  }

  if (branchFirstAll) {
    logStep('cleaning resource-first folders across exams');
    const organized = await organizeAllBranchFirstHierarchies(workspaceId);
    console.log(
      [
        `Branch-first cleanup complete for ${organized} exam/class folder(s).`,
        `Created ${stats.created}, moved ${stats.moved}, merged ${stats.merged}, renamed ${stats.renamed}, archived ${stats.archived}, styled ${stats.styled}.`,
      ].join('\n')
    );
    return;
  }

  if (deepCleanOnly) {
    logStep('audit before deep clean');
    await printCleanupAudit(workspaceId);
    logStep('archiving deep empty draft leaves');
    await archiveDeepEmptyLeaves(workspaceId);
    logStep('audit after deep clean');
    await printCleanupAudit(workspaceId);
    const totals = await getLibraryTotals(workspaceId);
    console.log(
      [
        'Study Hub deep clean complete.',
        `Active folders: ${totals.activeFolders}. PDFs: ${totals.totalPdfs}.`,
        `Created ${stats.created}, moved ${stats.moved}, merged ${stats.merged}, renamed ${stats.renamed}, archived ${stats.archived}, styled ${stats.styled}.`,
      ].join('\n')
    );
    return;
  }

  if (fastCleanOnly) {
    logStep('audit before fast cleanup');
    let audit = await printCleanupAudit(workspaceId);
    if (audit.genericWrappers.length) {
      logStep(`unwrapping ${audit.genericWrappers.length} audited redundant wrapper(s)`);
      await unwrapAuditGenericWrappers(workspaceId, audit.genericWrappers);
    } else {
      logStep('wrapper cleanup skipped; none found');
    }

    for (let pass = 0; pass < 6; pass += 1) {
      audit = await buildCleanupAudit(workspaceId);
      const archived = await archiveAuditDeepEmptyLeaves(workspaceId, audit.deepPaths);
      if (!archived) break;
      logStep(`archived ${archived} deep empty leaf folder(s) on pass ${pass + 1}`);
    }

    logStep('publishing content paths');
    await publishContentAncestors(workspaceId);
    logStep('audit after fast cleanup');
    await printCleanupAudit(workspaceId);
    const totals = await getLibraryTotals(workspaceId);
    console.log(
      [
        'Study Hub fast cleanup complete.',
        `Active folders: ${totals.activeFolders}. PDFs: ${totals.totalPdfs}.`,
        `Created ${stats.created}, moved ${stats.moved}, merged ${stats.merged}, renamed ${stats.renamed}, archived ${stats.archived}, styled ${stats.styled}.`,
      ].join('\n')
    );
    return;
  }

  if (schoolRepairOnly) {
    logStep('repairing school board hierarchy');
    await restoreMisplacedTopLevelCategories(workspaceId);
    const schoolRoot = await findSibling(workspaceId, null, ['School Boards']);
    if (!schoolRoot) throw new Error('School Boards root not found.');
    const cbseRoot = await ensurePath(workspaceId, ['School Boards', 'CBSE'], 'board', 'cbse', 'emerald');
    const stateBoardsRoot = await ensurePath(workspaceId, ['School Boards', 'State Boards'], 'board', 'state-board', 'emerald');
    await moveDirectSchoolRootsToPremiumParents(workspaceId, schoolRoot, cbseRoot, stateBoardsRoot);
    for (const parentId of [schoolRoot._id as Types.ObjectId, cbseRoot._id as Types.ObjectId]) {
      const wrapper = await findSibling(workspaceId, parentId, ['NCERT', 'NCERT Books', 'NCERT Books and Solutions']);
      await moveGlobalNcertBooksIntoClasses(workspaceId, cbseRoot, wrapper);
    }
    await cleanSchoolFamilyRootResourceShelves(workspaceId, cbseRoot, 'cbse');
    await archiveEmptySchoolRootResourceShelves(workspaceId, stateBoardsRoot);
    await cleanCbseClassResourceShelves(workspaceId, cbseRoot);
    await cleanStateBoardClassResourceShelves(workspaceId, stateBoardsRoot);
    await moveStateBoardClassStreamsIntoClasses(workspaceId, stateBoardsRoot);
    await normalizeStateBoardClassStreamAliases(workspaceId, stateBoardsRoot);
    const repairParents = await getSchoolRepairParentIds(workspaceId, schoolRoot, cbseRoot, stateBoardsRoot);
    const mergedDuplicates = await mergeDuplicateSiblingsForParents(workspaceId, repairParents);
    await restoreMisplacedTopLevelCategories(workspaceId);
    logStep(`merged ${mergedDuplicates} duplicate school sibling(s)`);
    logStep('publishing school content paths');
    await publishContentAncestors(workspaceId);
    logStep('sorting school cards');
    await sortSpecificParents(workspaceId, repairParents);
    logStep('school audit after repair');
    await printCleanupAudit(workspaceId);
    const totals = await getLibraryTotals(workspaceId);
    console.log(
      [
        'School Board hierarchy repaired.',
        `Active folders: ${totals.activeFolders}. PDFs: ${totals.totalPdfs}.`,
        `Created ${stats.created}, moved ${stats.moved}, merged ${stats.merged}, renamed ${stats.renamed}, archived ${stats.archived}, styled ${stats.styled}.`,
      ].join('\n')
    );
    return;
  }

  if (cleanupOnly) {
    logStep('audit before cleanup');
    const beforeAudit = await printCleanupAudit(workspaceId);
    if (beforeAudit.emptyPlaceholders.length) {
      logStep('archiving empty placeholders');
      await archiveEmptyPlaceholders(workspaceId);
    } else {
      logStep('empty placeholder cleanup skipped; none found');
    }
    if (beforeAudit.genericWrappers.length) {
      logStep('unwrapping redundant empty folders');
      await unwrapRedundantCards(workspaceId);
    } else {
      logStep('wrapper cleanup skipped; none found');
    }
    logStep('archiving deep empty draft leaves');
    await archiveDeepEmptyLeaves(workspaceId);
    logStep('publishing content paths');
    await publishContentAncestors(workspaceId);
    logStep('sorting folders');
    await sortAllSiblings(workspaceId);
    logStep('styling card icons');
    await styleAllCardIcons(workspaceId);
    logStep('audit after cleanup');
    await printCleanupAudit(workspaceId);

    const totals = await getLibraryTotals(workspaceId);
    console.log(
      [
        'Study Hub cleanup complete.',
        `Active folders: ${totals.activeFolders}. PDFs: ${totals.totalPdfs}.`,
        `Created ${stats.created}, moved ${stats.moved}, merged ${stats.merged}, renamed ${stats.renamed}, archived ${stats.archived}, styled ${stats.styled}.`,
      ].join('\n')
    );
    return;
  }

  const rootOnlyKey = rootOnlyArg ? normalizeNameKey(rootOnlyArg.slice('--root='.length)) : '';
  const isScopedMode = placementOnly || schoolOnly || gateOnly || upscOnly || universityOnly || taxonomyOnly || taxonomyBuildOnly || Boolean(rootOnlyKey);
  const selectedKits = rootOnlyKey
    ? kits.filter((kit) => normalizeNameKey(kit.rootPath[0]) === rootOnlyKey)
    : placementOnly
    ? kits.filter((kit) => isPlacementRootName(kit.rootPath[0]))
    : schoolOnly
      ? kits.filter((kit) => normalizeNameKey(kit.rootPath[0]) === 'school boards')
      : gateOnly
        ? kits.filter(isGateKit).map((kit) => ({ ...kit, branches: [] }))
        : upscOnly
          ? kits.filter(isUpscCseKit)
          : universityOnly
            ? kits.filter(isUniversityKit)
            : kits;
  const selectedMoves = rootOnlyKey
    ? rootMoves.filter((move) => normalizeNameKey(move.targetPath[0]) === rootOnlyKey)
    : placementOnly
    ? rootMoves.filter((move) => isPlacementRootName(move.targetPath[0]))
    : schoolOnly
      ? rootMoves.filter((move) => normalizeNameKey(move.targetPath[0]) === 'school boards')
      : gateOnly
        ? rootMoves.filter(isGateRootMove)
        : upscOnly
          ? rootMoves.filter(isUpscCseRootMove)
          : universityOnly
            ? rootMoves.filter(isUniversityRootMove)
            : rootMoves;

  logStep(`ensuring ${selectedKits.length} ${rootOnlyKey ? `${rootOnlyKey} ` : placementOnly ? 'placement ' : schoolOnly ? 'school ' : gateOnly ? 'GATE ' : upscOnly ? 'UPSC CSE ' : universityOnly ? 'university ' : ''}system kits`);
  const buildOnlyFailures: string[] = [];
  for (const [index, kit] of selectedKits.entries()) {
    try {
      await ensureKit(workspaceId, kit);
    } catch (error: any) {
      if (!taxonomyBuildOnly) throw error;
      buildOnlyFailures.push(`${kit.rootPath.join(' / ')}: ${error?.message || error}`);
    }
    if ((index + 1) % 12 === 0 || index === selectedKits.length - 1) {
      logStep(`kits ${index + 1}/${selectedKits.length}`);
    }
  }

  if (taxonomyBuildOnly) {
    logStep('publishing taxonomy blueprints');
    await publishTaxonomyBlueprints(workspaceId, selectedKits);
    const totals = await getLibraryTotals(workspaceId);
    const lines = [
      'Study Hub taxonomy build complete.',
      `Active folders: ${totals.activeFolders}. PDFs: ${totals.totalPdfs}.`,
      `Created ${stats.created}, moved ${stats.moved}, merged ${stats.merged}, renamed ${stats.renamed}, archived ${stats.archived}, styled ${stats.styled}.`,
    ];
    if (buildOnlyFailures.length) {
      lines.push(`Skipped ${buildOnlyFailures.length} kit(s) with conflicts:`);
      buildOnlyFailures.slice(0, 12).forEach((failure) => lines.push(`- ${failure}`));
    }
    console.log(lines.join('\n'));
    return;
  }

  logStep('moving known roots');
  await moveKnownRoots(workspaceId, selectedMoves);
  if (gateOnly) {
    logStep('cleaning GATE branch hierarchy');
    await organizeGateBranchHierarchy(workspaceId);
  } else if (upscOnly) {
    logStep('cleaning UPSC CSE hierarchy');
    await organizeUpscCseHierarchy(workspaceId);
  } else if (!isScopedMode) {
    logStep('cleaning PSU company hierarchy');
    await moveMisplacedPsuCompanies(workspaceId);
    logStep('cleaning GATE branch hierarchy');
    await organizeGateBranchHierarchy(workspaceId);
  }
  if (!isScopedMode) {
    logStep('cleaning school board hierarchy');
    await moveMisplacedSchoolRoots(workspaceId);
  }

  if (gateOnly) {
    logStep('sorting GATE folders');
    await sortGateSiblings(workspaceId);
  } else {
    logStep('publishing taxonomy blueprints');
    await publishTaxonomyBlueprints(workspaceId, selectedKits);

    if (upscOnly || universityOnly || taxonomyOnly || taxonomyBuildOnly || rootOnlyKey) {
      logStep('skipping global icon restyle in scoped mode');
    } else {
      logStep('styling card icons');
      await styleAllCardIcons(workspaceId);
    }
  }

  if (isScopedMode) {
    logStep(`${rootOnlyKey ? `${rootOnlyKey}-only` : placementOnly ? 'placement-only' : schoolOnly ? 'school-only' : gateOnly ? 'gate-only' : upscOnly ? 'upsc-cse-only' : universityOnly ? 'university-only' : taxonomyBuildOnly ? 'taxonomy-build-only' : 'taxonomy-only'} mode complete; skipped full-library normalization`);
    console.log(
      [
        rootOnlyKey
          ? `${rootOnlyKey} hierarchy organized.`
          : placementOnly
          ? 'Placement hierarchy organized.'
          : schoolOnly
            ? 'School Board hierarchy organized.'
            : gateOnly
              ? 'GATE hierarchy organized.'
              : upscOnly
                ? 'UPSC CSE hierarchy organized.'
                : universityOnly
                  ? 'University Exams hierarchy organized.'
                  : 'Study Hub taxonomy organized.',
        `Created ${stats.created}, moved ${stats.moved}, merged ${stats.merged}, renamed ${stats.renamed}, archived ${stats.archived}, styled ${stats.styled}.`,
      ].join('\n')
    );
    return;
  }

  logStep('normalizing names');
  await normalizeAllCardNames(workspaceId);
  logStep('unwrapping redundant folders');
  await unwrapRedundantCards(workspaceId);
  logStep('normalizing names after unwrap');
  await normalizeAllCardNames(workspaceId);
  logStep('archiving deep empty draft leaves');
  await archiveDeepEmptyLeaves(workspaceId);
  logStep('publishing content paths');
  await publishContentAncestors(workspaceId);
  logStep('sorting folders');
  await sortAllSiblings(workspaceId);

  const totals = await getLibraryTotals(workspaceId);

  console.log(
    [
      `Study Hub organized: ${totals.activeFolders} active folders, ${totals.totalPdfs} PDFs.`,
      `Created ${stats.created}, moved ${stats.moved}, merged ${stats.merged}, renamed ${stats.renamed}, archived ${stats.archived}, styled ${stats.styled}.`,
    ].join('\n')
  );
};

run()
  .catch((error) => {
    console.error('Study Hub organization failed:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
