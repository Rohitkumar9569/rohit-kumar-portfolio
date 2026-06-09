import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs/promises';
import path from 'path';
import mongoose, { Types } from 'mongoose';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import StudyCard, { type StudyCardGoalType, type StudyCardTone } from '../models/StudyCard';
import Workspace from '../models/Workspace';

const ROOT_WORKSPACE_SLUG = 'study-hub';
const MONGO_URI = process.env.MONGO_URI;
const SCRIPT_DIR = path.resolve(__dirname);
const STATIC_URL_ROOT = '/static/state-psc-premium';
const STATIC_FILE_ROOT = path.resolve(SCRIPT_DIR, '../../public/state-psc-premium');
const STATE_PYQ_MANIFEST_PATH = path.join(SCRIPT_DIR, 'state-pyq-official.generated.json');
const MONGO_CONNECT_TIMEOUT_MS = 30000;
const shouldApply = process.argv.includes('--apply');
const verifyOnly = process.argv.includes('--verify');
const CONTENT_VERSION = 'state-psc-premium-v1';

type CardDoc = any;
type FileDoc = any;

type CardStyle = {
  iconKey: string;
  tone: StudyCardTone;
  goalType: StudyCardGoalType;
  order: number;
};

type StateExamSpec = {
  name: string;
  shortName: string;
  state: string;
  order: number;
  aliases?: string[];
  tone?: StudyCardTone;
};

type PremiumPack = {
  id: string;
  title: string;
  targetPath: string[];
  stage: string;
  subject: string;
  topic: string;
  resourceType: string;
  bullets: string[];
};

type OfficialPyqEntry = {
  title: string;
  url: string;
  targetPath?: string[] | string;
  sourceName?: string;
  sourceUrl?: string;
  sourceType?: string;
  resourceType?: string;
  language?: 'hinglish' | 'english' | 'hindi' | 'mixed';
  year?: number;
  stage?: string;
  paper?: string;
  subject?: string;
  topic?: string;
  sizeBytes?: number;
  mimeType?: string;
  rightsNote?: string;
  notes?: string;
};

const stats = {
  cardsCreated: 0,
  cardsRestored: 0,
  cardsUpdated: 0,
  cardsMerged: 0,
  filesMoved: 0,
  filesDeduped: 0,
  filesAttached: 0,
  filesExisting: 0,
  pdfsWritten: 0,
};

const stateExams: StateExamSpec[] = [
  { name: 'UPPSC PCS', shortName: 'UP PCS', state: 'Uttar Pradesh', order: 10, aliases: ['UP PCS', 'UPPSC', 'UPPCS', 'Uttar Pradesh PCS'], tone: 'amber' },
  { name: 'BPSC PCS', shortName: 'Bihar PCS', state: 'Bihar', order: 20, aliases: ['BPSC CCE', 'BPSC', 'Bihar PCS'], tone: 'emerald' },
  { name: 'RPSC RAS', shortName: 'Rajasthan PCS', state: 'Rajasthan', order: 30, aliases: ['RPSC', 'RAS', 'Rajasthan PCS'], tone: 'rose' },
  { name: 'MPPSC State Service', shortName: 'MP PCS', state: 'Madhya Pradesh', order: 40, aliases: ['MPPSC', 'MP PCS'], tone: 'blue' },
  { name: 'MPSC Rajyaseva', shortName: 'Maharashtra PCS', state: 'Maharashtra', order: 50, aliases: ['MPSC', 'Rajyaseva'], tone: 'cyan' },
  { name: 'JPSC', shortName: 'Jharkhand PCS', state: 'Jharkhand', order: 60, aliases: ['Jharkhand PSC'], tone: 'emerald' },
  { name: 'WBPSC WBCS', shortName: 'WBCS', state: 'West Bengal', order: 70, aliases: ['WBPSC', 'West Bengal Civil Service'], tone: 'indigo' },
  { name: 'TNPSC Group 1', shortName: 'TNPSC Group 1', state: 'Tamil Nadu', order: 80, aliases: ['TNPSC'], tone: 'rose' },
  { name: 'GPSC', shortName: 'Gujarat PCS', state: 'Gujarat', order: 90, aliases: ['Gujarat PSC'], tone: 'cyan' },
  { name: 'HPSC HCS', shortName: 'Haryana PCS', state: 'Haryana', order: 100, aliases: ['HPSC', 'HCS'], tone: 'amber' },
  { name: 'UKPSC PCS', shortName: 'Uttarakhand PCS', state: 'Uttarakhand', order: 110, aliases: ['UKPSC'], tone: 'blue' },
  { name: 'KPSC KAS', shortName: 'Karnataka KAS', state: 'Karnataka', order: 120, aliases: ['Karnataka PSC', 'KAS'], tone: 'violet' },
  { name: 'APPSC Group 1', shortName: 'APPSC Group 1', state: 'Andhra Pradesh', order: 130, aliases: ['APPSC'], tone: 'emerald' },
  { name: 'TSPSC Group 1', shortName: 'TSPSC Group 1', state: 'Telangana', order: 140, aliases: ['TSPSC', 'TGPSC'], tone: 'cyan' },
  { name: 'OPSC OAS', shortName: 'Odisha OAS', state: 'Odisha', order: 150, aliases: ['OPSC', 'Odisha Civil Services'], tone: 'indigo' },
  { name: 'APSC CCE', shortName: 'Assam CCE', state: 'Assam', order: 160, aliases: ['APSC'], tone: 'emerald' },
  { name: 'PPSC PCS', shortName: 'Punjab PCS', state: 'Punjab', order: 170, aliases: ['PPSC'], tone: 'amber' },
  { name: 'CGPSC State Service', shortName: 'Chhattisgarh PCS', state: 'Chhattisgarh', order: 180, aliases: ['CGPSC'], tone: 'rose' },
  { name: 'HPPSC HPAS', shortName: 'Himachal PCS', state: 'Himachal Pradesh', order: 190, aliases: ['HPPSC', 'HPAS'], tone: 'blue' },
  { name: 'JKPSC KAS', shortName: 'Jammu Kashmir KAS', state: 'Jammu and Kashmir', order: 200, aliases: ['JKPSC'], tone: 'violet' },
  { name: 'Kerala PSC KAS', shortName: 'Kerala KAS', state: 'Kerala', order: 210, aliases: ['Kerala PSC'], tone: 'emerald' },
  { name: 'Goa PSC', shortName: 'Goa PCS', state: 'Goa', order: 220, aliases: ['GPSC Goa'], tone: 'cyan' },
  { name: 'Manipur PSC', shortName: 'Manipur PCS', state: 'Manipur', order: 230, aliases: ['MPSC Manipur'], tone: 'indigo' },
  { name: 'Meghalaya PSC', shortName: 'Meghalaya PCS', state: 'Meghalaya', order: 240, aliases: ['MPSC Meghalaya'], tone: 'blue' },
  { name: 'Mizoram PSC', shortName: 'Mizoram PCS', state: 'Mizoram', order: 250, aliases: ['MPSC Mizoram'], tone: 'emerald' },
  { name: 'Nagaland PSC', shortName: 'Nagaland PCS', state: 'Nagaland', order: 260, aliases: ['NPSC'], tone: 'rose' },
  { name: 'Arunachal Pradesh PSC', shortName: 'Arunachal PCS', state: 'Arunachal Pradesh', order: 270, aliases: ['APPSC Arunachal'], tone: 'cyan' },
  { name: 'Sikkim PSC', shortName: 'Sikkim PCS', state: 'Sikkim', order: 280, aliases: ['SPSC'], tone: 'amber' },
  { name: 'Tripura PSC', shortName: 'Tripura PCS', state: 'Tripura', order: 290, aliases: ['TPSC'], tone: 'violet' },
  { name: 'Ladakh PSC', shortName: 'Ladakh PCS', state: 'Ladakh', order: 300, aliases: ['Ladakh Civil Services'], tone: 'slate' },
  { name: 'Puducherry Civil Services', shortName: 'Puducherry PCS', state: 'Puducherry', order: 310, aliases: ['Puducherry PSC'], tone: 'blue' },
];

const baseShelves = [
  { name: 'Syllabus', iconKey: 'syllabus', tone: 'amber' as StudyCardTone, order: 10 },
  { name: 'Prelims', iconKey: 'pyq', tone: 'violet' as StudyCardTone, order: 20 },
  { name: 'Mains', iconKey: 'writing', tone: 'indigo' as StudyCardTone, order: 30 },
  { name: 'Study Material', iconKey: 'material', tone: 'blue' as StudyCardTone, order: 40 },
  { name: 'Current Affairs', iconKey: 'news', tone: 'cyan' as StudyCardTone, order: 50 },
  { name: 'Strategy', iconKey: 'target', tone: 'amber' as StudyCardTone, order: 60 },
  { name: 'Interview', iconKey: 'interview', tone: 'cyan' as StudyCardTone, order: 70 },
];

const uppscDeepShelves = [
  ['Syllabus', 'Prelims'],
  ['Syllabus', 'Mains'],
  ['Syllabus', 'Interview'],
  ['Prelims', 'GS Paper I'],
  ['Prelims', 'CSAT Paper II'],
  ['Mains', 'Essay'],
  ['Mains', 'General Hindi'],
  ['Mains', 'GS Paper I'],
  ['Mains', 'GS Paper II'],
  ['Mains', 'GS Paper III'],
  ['Mains', 'GS Paper IV'],
  ['Mains', 'GS Paper V'],
  ['Mains', 'GS Paper VI'],
  ['Study Material', 'General Studies'],
  ['Study Material', 'UP Special GS'],
  ['Study Material', 'UP Special GS', 'History and Culture'],
  ['Study Material', 'UP Special GS', 'Geography and Environment'],
  ['Study Material', 'UP Special GS', 'Economy and Schemes'],
  ['Study Material', 'UP Special GS', 'Polity and Governance'],
  ['Study Material', 'Hindi and Essay'],
  ['Study Material', 'Answer Writing'],
  ['Current Affairs', 'UP Current Affairs'],
  ['Current Affairs', 'UP Current Affairs', 'Monthly Notes'],
  ['Current Affairs', 'UP Current Affairs', 'State Schemes'],
  ['Strategy', '90-Day Plan'],
  ['Strategy', 'Revision Tracker'],
];

const createStateDeepShelves = (spec: StateExamSpec) => [
  ['Syllabus', 'Prelims'],
  ['Syllabus', 'Mains'],
  ['Syllabus', 'Interview'],
  ['Prelims', 'GS Paper I'],
  ['Prelims', 'CSAT Paper II'],
  ['Mains', 'Essay'],
  ['Mains', 'General Language'],
  ['Mains', 'GS Paper I'],
  ['Mains', 'GS Paper II'],
  ['Mains', 'GS Paper III'],
  ['Mains', 'GS Paper IV'],
  ['Mains', 'State Special Paper'],
  ['Mains', 'Optional Subject'],
  ['Study Material', 'General Studies'],
  ['Study Material', 'State Special GS'],
  ['Study Material', 'Answer Writing'],
  ['Current Affairs', `${spec.state} Current Affairs`],
  ['Strategy', '90-Day Plan'],
  ['Strategy', 'Revision Tracker'],
];

const getDeepShelvesForStateExam = (spec: StateExamSpec) =>
  spec.name === 'UPPSC PCS' ? uppscDeepShelves : createStateDeepShelves(spec);

const uppscPremiumPacks: PremiumPack[] = [
  {
    id: 'uppsc-pcs-90-day-roadmap',
    title: 'UPPSC PCS 90-Day Premium Roadmap',
    targetPath: ['State Exams', 'UPPSC PCS', 'Strategy', '90-Day Plan'],
    stage: 'Prelims + Mains',
    subject: 'Planning',
    topic: '90-Day Study Plan',
    resourceType: 'strategy',
    bullets: [
      'Phase 1: NCERT + Uttar Pradesh special static topics + daily PYQ review.',
      'Phase 2: Prelims GS, CSAT, Hindi, and state current affairs consolidation.',
      'Phase 3: Mains answer writing for GS I-VI with UP examples and schemes.',
      'Weekly checkpoint: one full mock, one PYQ paper, and one essay outline.',
    ],
  },
  {
    id: 'uppsc-up-special-gs-premium',
    title: 'UPPSC PCS UP Special GS Premium Pack',
    targetPath: ['State Exams', 'UPPSC PCS', 'Study Material', 'UP Special GS'],
    stage: 'Prelims + Mains',
    subject: 'UP Special',
    topic: 'History, Geography, Economy, Polity',
    resourceType: 'notes',
    bullets: [
      'Prioritize Uttar Pradesh geography: rivers, regions, minerals, agriculture, irrigation, and urban centers.',
      'Map history topics to culture, freedom movement, personalities, and local movements.',
      'Use state schemes, budget themes, GI tags, ODOP, tourism, and district-level examples in Mains.',
      'Make one-page revision sheets for Uttar Pradesh current affairs every week.',
    ],
  },
  {
    id: 'uppsc-prelims-gs-csat-premium',
    title: 'UPPSC PCS Prelims GS + CSAT Premium Drill',
    targetPath: ['State Exams', 'UPPSC PCS', 'Study Material', 'General Studies'],
    stage: 'Prelims',
    subject: 'GS and CSAT',
    topic: 'High-Yield Prelims Practice',
    resourceType: 'practice',
    bullets: [
      'GS Paper I: static GS, Uttar Pradesh special, environment, science tech, and current affairs.',
      'GS Paper II/CSAT: comprehension, reasoning, decision making, basic numeracy, and data interpretation.',
      'Revise PYQs from 2024 and 2025 first because they reveal the newest pattern.',
      'Keep CSAT practice consistent; qualifying paper ko last week tak postpone mat karo.',
    ],
  },
  {
    id: 'uppsc-mains-gs-answer-writing',
    title: 'UPPSC PCS Mains GS I-VI Answer Writing System',
    targetPath: ['State Exams', 'UPPSC PCS', 'Study Material', 'Answer Writing'],
    stage: 'Mains',
    subject: 'GS I-VI',
    topic: 'Answer Writing',
    resourceType: 'notes',
    bullets: [
      'GS answers should open with a definition/data point, then analysis, then UP-specific example where relevant.',
      'GS V and VI need governance, ethics, security, disaster management, and state administration examples.',
      'Use diagrams, maps, committees, schemes, and district examples to make answers evaluator-friendly.',
      'Practice previous Mains papers from 2024 and 2025 as the first benchmark set.',
    ],
  },
  {
    id: 'uppsc-hindi-essay-premium',
    title: 'UPPSC PCS General Hindi and Essay Premium Pack',
    targetPath: ['State Exams', 'UPPSC PCS', 'Study Material', 'Hindi and Essay'],
    stage: 'Mains',
    subject: 'General Hindi and Essay',
    topic: 'Language and Essay',
    resourceType: 'practice',
    bullets: [
      'General Hindi: grammar, precis, translation, idioms, official vocabulary, and short composition.',
      'Essay: prepare themes around governance, education, women, agriculture, environment, technology, and Uttar Pradesh development.',
      'Build intros with facts and conclusions with constructive policy direction.',
      'Write two timed essays every week and review structure, examples, and language clarity.',
    ],
  },
  {
    id: 'uppsc-current-affairs-tracker',
    title: 'UPPSC PCS UP Current Affairs Monthly Tracker',
    targetPath: ['State Exams', 'UPPSC PCS', 'Current Affairs', 'UP Current Affairs'],
    stage: 'Prelims + Mains',
    subject: 'Current Affairs',
    topic: 'UP Monthly Tracker',
    resourceType: 'planner',
    bullets: [
      'Track Uttar Pradesh budget, schemes, cabinet decisions, indices, awards, sports, GI tags, environment, and infrastructure.',
      'Link national news with UP examples for Mains answer writing.',
      'Keep monthly short notes with source, data point, district relevance, and possible question angle.',
      'Revise last 12 months before Prelims and last 18 months before Mains.',
    ],
  },
];

const uppscPaperPacks: PremiumPack[] = [
  {
    id: 'uppsc-prelims-gs-paper-i-pyq-map',
    title: 'UPPSC PCS Prelims GS Paper I PYQ Map',
    targetPath: ['State Exams', 'UPPSC PCS', 'Prelims', 'GS Paper I'],
    stage: 'Prelims',
    subject: 'GS Paper I',
    topic: 'Official PYQ pattern, source priority, and revision order',
    resourceType: 'pyq',
    bullets: [
      'Start with the newest UPPSC GS Paper I papers, then revise older papers topic-wise.',
      'Map every question to static GS, Uttar Pradesh special, environment, science tech, or current affairs.',
      'Track repeated areas like polity, history, geography, economy, environment, and state-specific facts.',
      'Use this folder as the main Prelims paper-view shelf for official UPPSC GS Paper I PDFs.',
    ],
  },
  {
    id: 'uppsc-prelims-csat-paper-ii-pyq-map',
    title: 'UPPSC PCS Prelims CSAT Paper II PYQ Map',
    targetPath: ['State Exams', 'UPPSC PCS', 'Prelims', 'CSAT Paper II'],
    stage: 'Prelims',
    subject: 'CSAT Paper II',
    topic: 'Comprehension, reasoning, numeracy, and decision-making drill',
    resourceType: 'pyq',
    bullets: [
      'Keep CSAT as a weekly routine: comprehension, reasoning, data interpretation, and basic numeracy.',
      'Solve official Paper II sets in timed mode and mark weak areas after every attempt.',
      'Maintain a formula and reasoning-error sheet for the final month.',
      'Use this folder for UPPSC GS-II/CSAT official question papers and qualifying-paper practice.',
    ],
  },
  {
    id: 'uppsc-mains-essay-pyq-map',
    title: 'UPPSC PCS Mains Essay PYQ Map',
    targetPath: ['State Exams', 'UPPSC PCS', 'Mains', 'Essay'],
    stage: 'Mains',
    subject: 'Essay',
    topic: 'Essay themes, outlines, and UP examples',
    resourceType: 'pyq',
    bullets: [
      'Group essay PYQs by governance, society, education, agriculture, environment, technology, and ethics.',
      'Prepare two-page outlines with intro hooks, arguments, data, examples, and balanced conclusions.',
      'Use Uttar Pradesh schemes, districts, GI tags, ODOP, and development examples where relevant.',
      'Write one timed essay weekly and compare structure with official PYQ themes.',
    ],
  },
  {
    id: 'uppsc-mains-general-hindi-pyq-map',
    title: 'UPPSC PCS Mains General Hindi PYQ Map',
    targetPath: ['State Exams', 'UPPSC PCS', 'Mains', 'General Hindi'],
    stage: 'Mains',
    subject: 'General Hindi',
    topic: 'Language paper practice and scoring checklist',
    resourceType: 'pyq',
    bullets: [
      'Practice grammar, precis, translation, official vocabulary, idioms, and short composition regularly.',
      'Keep a Hindi-error notebook for spelling, sentence formation, and common grammar traps.',
      'Solve recent official papers first so the format feels familiar before Mains.',
      'Use this folder for General Hindi papers and quick language revision resources.',
    ],
  },
  {
    id: 'uppsc-mains-gs-paper-i-pyq-map',
    title: 'UPPSC PCS Mains GS Paper I PYQ Map',
    targetPath: ['State Exams', 'UPPSC PCS', 'Mains', 'GS Paper I'],
    stage: 'Mains',
    subject: 'GS Paper I',
    topic: 'History, culture, geography, and society answer themes',
    resourceType: 'pyq',
    bullets: [
      'Tag questions by Indian history, world history, art and culture, geography, and social issues.',
      'Use maps, timelines, and Uttar Pradesh examples to make answers crisp and evaluator-friendly.',
      'Convert repeated PYQ themes into reusable intro-body-conclusion frameworks.',
      'Pair each official paper with one answer-writing review session.',
    ],
  },
  {
    id: 'uppsc-mains-gs-paper-ii-pyq-map',
    title: 'UPPSC PCS Mains GS Paper II PYQ Map',
    targetPath: ['State Exams', 'UPPSC PCS', 'Mains', 'GS Paper II'],
    stage: 'Mains',
    subject: 'GS Paper II',
    topic: 'Polity, governance, social justice, and IR framework',
    resourceType: 'pyq',
    bullets: [
      'Organize PYQs around Constitution, Parliament, judiciary, governance, welfare, and international relations.',
      'Use committees, Supreme Court cases, constitutional articles, and UP governance examples.',
      'Keep schemes and policy examples ready for education, health, women, children, and vulnerable groups.',
      'Practice concise answers with headings, subheadings, and clear way-forward points.',
    ],
  },
  {
    id: 'uppsc-mains-gs-paper-iii-pyq-map',
    title: 'UPPSC PCS Mains GS Paper III PYQ Map',
    targetPath: ['State Exams', 'UPPSC PCS', 'Mains', 'GS Paper III'],
    stage: 'Mains',
    subject: 'GS Paper III',
    topic: 'Economy, science, environment, agriculture, and disaster management',
    resourceType: 'pyq',
    bullets: [
      'Tag PYQs by economy, agriculture, science and tech, environment, biodiversity, disaster, and security.',
      'Use diagrams, flowcharts, data points, and UP-specific agriculture or disaster examples.',
      'Connect current affairs with static concepts for more mature Mains answers.',
      'Prepare short case studies for climate, floods, health tech, startups, and rural development.',
    ],
  },
  {
    id: 'uppsc-mains-gs-paper-iv-pyq-map',
    title: 'UPPSC PCS Mains GS Paper IV PYQ Map',
    targetPath: ['State Exams', 'UPPSC PCS', 'Mains', 'GS Paper IV'],
    stage: 'Mains',
    subject: 'GS Paper IV',
    topic: 'Ethics, integrity, aptitude, and case-study practice',
    resourceType: 'pyq',
    bullets: [
      'Prepare definitions, thinkers, constitutional values, examples, and administrative ethics cases.',
      'For case studies, write stakeholders, conflict, options, decision, justification, and safeguards.',
      'Build a small bank of UP administration examples for integrity, service delivery, and accountability.',
      'Practice ethical reasoning in short, direct, and solution-oriented language.',
    ],
  },
  {
    id: 'uppsc-mains-gs-paper-v-pyq-map',
    title: 'UPPSC PCS Mains GS Paper V PYQ Map',
    targetPath: ['State Exams', 'UPPSC PCS', 'Mains', 'GS Paper V'],
    stage: 'Mains',
    subject: 'GS Paper V',
    topic: 'Uttar Pradesh special paper one',
    resourceType: 'pyq',
    bullets: [
      'Focus on Uttar Pradesh history, culture, geography, economy, polity, schemes, and social indicators.',
      'Maintain district, river, crop, industry, tourism, GI tag, and ODOP examples for answers.',
      'Create state-specific diagrams and maps for quick Mains value addition.',
      'Use this folder as the UP special paper-view shelf for official Mains PDFs.',
    ],
  },
  {
    id: 'uppsc-mains-gs-paper-vi-pyq-map',
    title: 'UPPSC PCS Mains GS Paper VI PYQ Map',
    targetPath: ['State Exams', 'UPPSC PCS', 'Mains', 'GS Paper VI'],
    stage: 'Mains',
    subject: 'GS Paper VI',
    topic: 'Uttar Pradesh special paper two',
    resourceType: 'pyq',
    bullets: [
      'Prioritize UP governance, administration, security, disaster management, technology, and development themes.',
      'Use policy examples from state schemes, local bodies, infrastructure, health, education, and agriculture.',
      'Prepare answer frameworks that combine data, UP examples, challenges, and practical reforms.',
      'Revise Paper V and VI together because they reward state-specific depth.',
    ],
  },
];

const stateAbbreviation = (value: string) => value
  .split(/\s+/)
  .map((part) => part[0])
  .join('')
  .toUpperCase()
  .replace(/[^A-Z]/g, '')
  .slice(0, 4);

const packSlug = (value = '') => value
  .toLowerCase()
  .trim()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 90)
  .replace(/-+$/g, '') || 'item';

const stateSpecificSubject = (spec: StateExamSpec) => `${spec.state} Special GS`;

const stateSpecialStudyShelf = (spec: StateExamSpec) =>
  spec.name === 'UPPSC PCS' ? 'UP Special GS' : 'State Special GS';

const getStateSpecialFocus = (spec: StateExamSpec) => {
  const state = spec.state;
  const focusByState: Record<string, string[]> = {
    Bihar: ['Bihar history and freedom movement', 'Bihar geography, rivers, agriculture, and disasters', 'Bihar polity, economy, schemes, and social indicators'],
    Rajasthan: ['Rajasthan history, art, culture, and personalities', 'desert ecology, water systems, minerals, and agriculture', 'Rajasthan economy, welfare schemes, and administrative geography'],
    'Madhya Pradesh': ['MP history, tribal communities, and culture', 'forests, rivers, agriculture, and protected areas', 'MP economy, schemes, districts, and governance'],
    Maharashtra: ['Maharashtra history and social reform movements', 'geography, agriculture, industry, urbanization, and environment', 'state economy, schemes, cooperatives, and local governance'],
    Jharkhand: ['Jharkhand tribal history and culture', 'minerals, forests, industry, rivers, and environment', 'state polity, welfare schemes, and socio-economic issues'],
    'West Bengal': ['Bengal renaissance, freedom movement, and culture', 'delta geography, rivers, agriculture, and disasters', 'state economy, governance, and welfare schemes'],
    'Tamil Nadu': ['Tamil history, culture, social justice, and Dravidian movement', 'geography, water, industry, and environment', 'state schemes, economy, and current affairs'],
    Gujarat: ['Gujarat history, culture, and freedom movement', 'coastal geography, industry, agriculture, and disasters', 'state economy, schemes, ports, and renewable energy'],
    Haryana: ['Haryana history, culture, agriculture, and sports', 'geography, irrigation, industry, and urbanization', 'state schemes, economy, and governance'],
    Uttarakhand: ['Uttarakhand geography, Himalaya, rivers, ecology, and disasters', 'history, culture, movements, and pilgrimage economy', 'state schemes, tourism, migration, and environment'],
    Karnataka: ['Karnataka history, culture, and administration', 'geography, irrigation, IT, agriculture, and forests', 'state economy, welfare schemes, and current affairs'],
    'Andhra Pradesh': ['Andhra history, bifurcation, culture, and polity', 'coastal geography, agriculture, irrigation, and disasters', 'state economy, schemes, and capital-region issues'],
    Telangana: ['Telangana movement, history, culture, and society', 'geography, irrigation projects, agriculture, and urbanization', 'state economy, schemes, and current affairs'],
    Odisha: ['Odisha history, culture, temples, tribes, and art', 'coastal geography, cyclones, minerals, forests, and agriculture', 'state schemes, economy, and disaster management'],
    Assam: ['Assam history, culture, tribes, and society', 'Brahmaputra valley, floods, ecology, agriculture, and biodiversity', 'state economy, governance, and North-East issues'],
    Punjab: ['Punjab history, culture, agriculture, and social issues', 'geography, irrigation, industry, and environment', 'state economy, schemes, and governance'],
    Chhattisgarh: ['Chhattisgarh tribal culture and history', 'minerals, forests, rivers, agriculture, and industry', 'state welfare schemes, economy, and security issues'],
    'Himachal Pradesh': ['Himachal geography, ecology, culture, and tourism', 'hydropower, horticulture, disasters, and environment', 'state economy, schemes, and governance'],
    'Jammu and Kashmir': ['Jammu Kashmir history, polity, culture, and geography', 'Himalayan ecology, tourism, horticulture, and security', 'state/UT governance, schemes, and current affairs'],
    Kerala: ['Kerala history, renaissance, society, and governance model', 'coastal geography, ecology, disasters, and health', 'state economy, migration, tourism, and schemes'],
    Goa: ['Goa history, culture, tourism, and coastal economy', 'environment, mining, urban planning, and biodiversity', 'state governance, schemes, and current affairs'],
    Manipur: ['Manipur history, culture, society, and tribes', 'geography, biodiversity, border issues, and economy', 'state governance, schemes, and current affairs'],
    Meghalaya: ['Meghalaya tribes, culture, society, and institutions', 'geography, minerals, forests, tourism, and ecology', 'state governance, schemes, and current affairs'],
    Mizoram: ['Mizoram history, culture, society, and institutions', 'geography, forests, agriculture, and border issues', 'state governance, schemes, and current affairs'],
    Nagaland: ['Nagaland tribes, culture, society, and institutions', 'geography, biodiversity, border issues, and economy', 'state governance, schemes, and current affairs'],
    'Arunachal Pradesh': ['Arunachal tribes, culture, history, and geography', 'border areas, rivers, biodiversity, and ecology', 'state governance, schemes, and current affairs'],
    Sikkim: ['Sikkim history, culture, geography, and biodiversity', 'Himalayan ecology, tourism, agriculture, and disasters', 'state governance, schemes, and current affairs'],
    Tripura: ['Tripura history, culture, tribes, and society', 'geography, economy, agriculture, and border issues', 'state governance, schemes, and current affairs'],
    Ladakh: ['Ladakh geography, culture, ecology, and border areas', 'tourism, climate, infrastructure, and biodiversity', 'UT governance, schemes, and current affairs'],
    Puducherry: ['Puducherry history, culture, and administrative geography', 'coastal issues, tourism, economy, and local governance', 'UT schemes, governance, and current affairs'],
  };
  return focusByState[state] || [
    `${state} history, culture, geography, and society`,
    `${state} economy, welfare schemes, ecology, and governance`,
    `${state} current affairs with district-level examples`,
  ];
};

const createRemainingStatePremiumPacks = () => stateExams
  .filter((spec) => spec.name !== 'UPPSC PCS')
  .flatMap((spec): PremiumPack[] => {
    const code = packSlug(spec.name);
    const focus = getStateSpecialFocus(spec);
    return [
      {
        id: `${code}-90-day-roadmap`,
        title: `${spec.name} 90-Day Premium Roadmap`,
        targetPath: ['State Exams', spec.name, 'Strategy', '90-Day Plan'],
        stage: 'Prelims + Mains',
        subject: 'Planning',
        topic: `${spec.shortName} Study Plan`,
        resourceType: 'strategy',
        bullets: [
          `Phase 1: NCERT + standard GS + ${spec.state} special static topics with PYQ tagging.`,
          `Phase 2: Prelims GS, aptitude/CSAT where applicable, and ${spec.state} current affairs consolidation.`,
          `Phase 3: Mains answer writing using ${spec.state} examples, schemes, maps, and district facts.`,
          `Weekly checkpoint: one mock, one PYQ session, one state-special revision sheet, and one essay/answer-writing drill.`,
        ],
      },
      {
        id: `${code}-state-special-gs`,
        title: `${spec.name} ${spec.state} Special GS Premium Pack`,
        targetPath: ['State Exams', spec.name, 'Study Material', 'State Special GS'],
        stage: 'Prelims + Mains',
        subject: stateSpecificSubject(spec),
        topic: `${spec.state} State GK`,
        resourceType: 'notes',
        bullets: [
          `Build a dedicated ${spec.state} notebook around ${focus[0]}.`,
          `Add map-based revision for ${focus[1]}.`,
          `Use local examples from ${focus[2]} in Mains answers and interview points.`,
          `Revise official state budget, economic survey, schemes, districts, GI tags, awards, and major reports every month.`,
        ],
      },
      {
        id: `${code}-current-affairs-tracker`,
        title: `${spec.name} ${spec.state} Current Affairs Tracker`,
        targetPath: ['State Exams', spec.name, 'Current Affairs', `${spec.state} Current Affairs`],
        stage: 'Prelims + Mains',
        subject: 'Current Affairs',
        topic: `${spec.state} Monthly Tracker`,
        resourceType: 'planner',
        bullets: [
          `Track ${spec.state} cabinet decisions, budget, schemes, appointments, awards, sports, environment, disasters, and infrastructure.`,
          `Convert each news item into source, fact, district relevance, exam angle, and possible Prelims/Mains question.`,
          `Connect national schemes with ${spec.state} implementation examples for sharper answers.`,
          `Revise 12 months before Prelims and 18 months before Mains/interview where the commission pattern needs it.`,
        ],
      },
    ];
  });

const createRemainingStatePaperPacks = () => stateExams
  .filter((spec) => spec.name !== 'UPPSC PCS')
  .flatMap((spec): PremiumPack[] => {
    const code = packSlug(spec.name);
    const stateSubject = stateSpecificSubject(spec);
    return [
      {
        id: `${code}-prelims-gs-paper-i-pyq-map`,
        title: `${spec.name} Prelims GS Paper I PYQ Map`,
        targetPath: ['State Exams', spec.name, 'Prelims', 'GS Paper I'],
        stage: 'Prelims',
        subject: 'GS Paper I',
        topic: 'Official PYQ pattern, topic mapping, and revision order',
        resourceType: 'pyq',
        bullets: [
          `Start with latest ${spec.shortName} GS papers, then tag questions by static GS, current affairs, and ${spec.state} special areas.`,
          'Create a repeat-topic sheet for polity, history, geography, economy, environment, science, and schemes.',
          `Keep ${spec.state} facts, district examples, maps, and schemes beside national topics for quick recall.`,
          'Use this shelf as the main Prelims paper-view space for official question papers.',
        ],
      },
      {
        id: `${code}-prelims-csat-paper-ii-pyq-map`,
        title: `${spec.name} Prelims CSAT Paper II PYQ Map`,
        targetPath: ['State Exams', spec.name, 'Prelims', 'CSAT Paper II'],
        stage: 'Prelims',
        subject: 'CSAT Paper II',
        topic: 'Reasoning, comprehension, numeracy, and qualifying-paper practice',
        resourceType: 'pyq',
        bullets: [
          'Practice comprehension, reasoning, basic numeracy, and data interpretation every week.',
          'Solve official CSAT or Paper II sets in timed mode and log mistakes after every attempt.',
          'Use this paper folder for qualifying-paper PDFs, shortcuts, and weak-area revision.',
          'Do not leave CSAT for the final week; steady practice keeps the cutoff risk low.',
        ],
      },
      {
        id: `${code}-mains-gs-answer-pyq-map`,
        title: `${spec.name} Mains GS Answer-Writing PYQ Map`,
        targetPath: ['State Exams', spec.name, 'Mains', 'GS Paper I'],
        stage: 'Mains',
        subject: 'GS Papers',
        topic: 'Mains PYQ themes, answer frameworks, and state examples',
        resourceType: 'pyq',
        bullets: [
          'Group PYQs into polity, economy, history, geography, society, ethics, environment, science, and governance.',
          `Add ${spec.state} examples wherever possible: schemes, districts, economy, culture, environment, and administration.`,
          'Write answers with definition/data, analysis, example, challenge, and practical way-forward.',
          'Use this folder as the starting point for Mains GS paper-view and answer-writing review.',
        ],
      },
      {
        id: `${code}-mains-essay-language-pyq-map`,
        title: `${spec.name} Mains Essay and Language PYQ Map`,
        targetPath: ['State Exams', spec.name, 'Mains', 'Essay'],
        stage: 'Mains',
        subject: 'Essay and Language',
        topic: 'Essay outlines, regional language practice, and scoring checklist',
        resourceType: 'pyq',
        bullets: [
          'Build essay outlines around governance, education, agriculture, women, environment, technology, and social change.',
          `Use ${spec.state} data, institutions, culture, geography, and welfare examples to make essays local and concrete.`,
          'Practice language sections with grammar, translation, precis, idioms, and short composition as per commission pattern.',
          `Pair this with the ${stateSubject} shelf for stronger state-specific Mains answers.`,
        ],
      },
    ];
  });

const remainingStatePremiumPacks = createRemainingStatePremiumPacks();
const remainingStatePaperPacks = createRemainingStatePaperPacks();
const allPremiumPacks = [...uppscPremiumPacks, ...uppscPaperPacks, ...remainingStatePremiumPacks, ...remainingStatePaperPacks];

const normalizeKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const slugify = (value = '', fallback = 'item') => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90)
    .replace(/-+$/g, '');
  return slug || fallback;
};

const fileIdentity = (file: FileDoc) => {
  const url = String(file?.url || '').trim().toLowerCase();
  if (url) return `url:${url}`;
  return [
    'meta',
    normalizeKey(file?.name || ''),
    file?.year || '',
    normalizeKey(file?.subject || ''),
    normalizeKey(file?.paper || ''),
  ].join('|');
};

const trimString = (value: unknown, max: number) => {
  if (typeof value !== 'string') return value;
  return value.trim().slice(0, max).trim();
};

const sanitizeFile = (file: FileDoc) => {
  const payload = typeof file?.toObject === 'function' ? file.toObject() : { ...(file || {}) };
  delete payload._id;
  payload.name = trimString(payload.name, 180);
  payload.url = trimString(payload.url, 900);
  payload.thumbnailUrl = trimString(payload.thumbnailUrl, 900);
  payload.publicId = trimString(payload.publicId, 220);
  payload.resourceType = trimString(payload.resourceType, 40);
  payload.stage = trimString(payload.stage, 80);
  payload.paper = trimString(payload.paper, 100);
  payload.subject = trimString(payload.subject, 120);
  payload.topic = trimString(payload.topic, 140);
  payload.sourceName = trimString(payload.sourceName, 120);
  payload.notes = trimString(payload.notes, 600);
  return payload;
};

const styleForName = (name: string, depth: number, order: number, tone?: StudyCardTone): CardStyle => {
  const key = normalizeKey(name);
  if (depth === 0) return { iconKey: 'state-exam', tone: 'amber', goalType: 'exam_category', order };
  if (
    key.includes('uppsc') ||
    key.includes('rpsc') ||
    key.includes('bpsc') ||
    key.includes('psc') ||
    key.includes('pcs') ||
    key.includes('kas') ||
    key.includes('wbc') ||
    key.includes('civil services') ||
    key.includes('state service') ||
    key.includes('group 1') ||
    key.includes('rajyaseva') ||
    key.includes('ras') ||
    key.includes('oas') ||
    key.includes('cce') ||
    key.includes('hcs') ||
    key.includes('hpas')
  ) {
    return { iconKey: 'state-exam', tone: tone || 'amber', goalType: 'exam', order };
  }
  if (key.includes('overview')) return { iconKey: 'verified', tone: 'cyan', goalType: 'resource_folder', order };
  if (key.includes('syllabus')) return { iconKey: 'syllabus', tone: 'amber', goalType: 'resource_folder', order };
  if (key.includes('prelims')) return { iconKey: 'pyq', tone: 'cyan', goalType: 'resource_folder', order };
  if (key.includes('mains')) return { iconKey: 'writing', tone: 'indigo', goalType: 'resource_folder', order };
  if (key.includes('csat')) return { iconKey: 'practice', tone: 'amber', goalType: 'subject', order };
  if (key.includes('gs paper') || key.includes('general studies')) return { iconKey: 'pyq', tone: 'violet', goalType: 'subject', order };
  if (key.includes('previous') || key.includes('paper') || key.includes('pyq')) return { iconKey: 'pyq', tone: 'violet', goalType: 'resource_folder', order };
  if (key.includes('current')) return { iconKey: 'news', tone: 'cyan', goalType: 'resource_folder', order };
  if (key.includes('strategy') || key.includes('plan')) return { iconKey: 'target', tone: 'amber', goalType: 'resource_folder', order };
  if (key.includes('state') || key.includes('special')) return { iconKey: 'state-exam', tone: 'emerald', goalType: 'resource_folder', order };
  if (key.includes('hindi') || key.includes('essay')) return { iconKey: 'language', tone: 'rose', goalType: 'subject', order };
  if (key.includes('answer')) return { iconKey: 'writing', tone: 'indigo', goalType: 'subject', order };
  if (key.includes('study') || key.includes('material') || key.includes('general studies')) return { iconKey: 'material', tone: 'blue', goalType: 'resource_folder', order };
  return { iconKey: depth >= 3 ? 'subject' : 'folder', tone: 'slate', goalType: depth >= 3 ? 'subject' : 'resource_folder', order };
};

const getRootWorkspace = async () => Workspace.findOneAndUpdate(
  { slug: ROOT_WORKSPACE_SLUG },
  {
    $set: {
      name: 'Study Hub',
      shortName: 'Study Hub',
      slug: ROOT_WORKSPACE_SLUG,
      type: 'personal',
      category: 'platform',
      visibility: 'public',
      status: 'active',
      readiness: 100,
      priority: 1000,
      description: 'Root card workspace for all exams, schools, boards, and official study materials.',
      template: { phases: [], facets: [], resourceTypes: [] },
    },
  },
  { new: true, upsert: true, runValidators: true },
);

const connectMongo = async () => {
  let timeout: NodeJS.Timeout | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error(`MongoDB connection timed out after ${MONGO_CONNECT_TIMEOUT_MS}ms.`)),
        MONGO_CONNECT_TIMEOUT_MS,
      );
    });
    const connectPromise = Promise.resolve().then(() => mongoose.connect(MONGO_URI as string, {
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 20000,
      socketTimeoutMS: 30000,
    }));
    await Promise.race([
      connectPromise,
      timeoutPromise,
    ]);
  } catch (error) {
    await mongoose.disconnect().catch(() => undefined);
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

const ensureCard = async (
  workspaceId: Types.ObjectId,
  parentId: Types.ObjectId | null,
  name: string,
  style: CardStyle,
  aliases: string[] = [],
) => {
  const slug = slugify(name);
  let card = await StudyCard.findOne({ workspaceId, parentId, slug });
  if (!card && aliases.length) {
    card = await StudyCard.findOne({
      workspaceId,
      parentId,
      slug: { $in: aliases.map((alias) => slugify(alias)) },
    });
  }

  if (!card) {
    stats.cardsCreated += 1;
    card = new StudyCard({
      workspaceId,
      parentId,
      name,
      slug,
      ...style,
      status: 'published',
      visibility: 'public',
      files: [],
    });
    if (shouldApply) await card.save();
    return card;
  }

  const updates: Partial<CardDoc> = {};
  if (card.status === 'archived') {
    updates.status = 'published';
    stats.cardsRestored += 1;
  }
  if (card.name !== name) updates.name = name;
  if (card.slug !== slug) updates.slug = slug;
  for (const [key, value] of Object.entries(style)) {
    if ((card as any)[key] !== value) (updates as any)[key] = value;
  }
  if (Object.keys(updates).length) {
    stats.cardsUpdated += 1;
    Object.assign(card, updates);
    if (shouldApply) await card.save();
  }
  return card;
};

const ensurePath = async (workspaceId: Types.ObjectId, parts: string[]) => {
  let parentId: Types.ObjectId | null = null;
  let card: CardDoc | null = null;
  for (const [index, part] of parts.entries()) {
    const stateExamSpec = index === 1 ? stateExams.find((spec) => spec.name === part) : undefined;
    card = await ensureCard(
      workspaceId,
      parentId,
      part,
      styleForName(part, index, stateExamSpec?.order ?? index * 10, stateExamSpec?.tone),
    );
    parentId = card._id as Types.ObjectId;
  }
  if (!card) throw new Error(`Could not ensure path ${parts.join(' / ')}`);
  return card;
};

const moveFiles = (from: CardDoc, to: CardDoc) => {
  const nextFiles = (to.files || []).map(sanitizeFile);
  const seen = new Set(nextFiles.map(fileIdentity));
  for (const file of from.files || []) {
    const key = fileIdentity(file);
    if (seen.has(key)) {
      stats.filesDeduped += 1;
      continue;
    }
    seen.add(key);
    nextFiles.push(sanitizeFile(file));
    stats.filesMoved += 1;
  }
  to.files = nextFiles;
};

const mergeCardInto = async (workspaceId: Types.ObjectId, source: CardDoc, target: CardDoc) => {
  if (!source || !target || String(source._id) === String(target._id)) return;
  const children = await StudyCard.find({ workspaceId, parentId: source._id, status: { $ne: 'archived' } });
  for (const child of children) {
    const childTarget = await ensureCard(
      workspaceId,
      target._id as Types.ObjectId,
      child.name,
      {
        iconKey: child.iconKey || 'folder',
        tone: child.tone || 'slate',
        goalType: child.goalType || 'resource_folder',
        order: child.order || 0,
      },
    );
    await mergeCardInto(workspaceId, child, childTarget);
  }
  moveFiles(source, target);
  source.files = [];
  source.status = 'archived';
  stats.cardsMerged += 1;
  if (shouldApply) {
    await target.save();
    await source.save();
  }
};

const findActiveChild = async (workspaceId: Types.ObjectId, parentId: Types.ObjectId, names: string[]) => StudyCard.findOne({
  workspaceId,
  parentId,
  status: { $ne: 'archived' },
  slug: { $in: names.map((name) => slugify(name)) },
});

const archiveBranch = async (workspaceId: Types.ObjectId, card: CardDoc) => {
  const children = await StudyCard.find({ workspaceId, parentId: card._id, status: { $ne: 'archived' } });
  for (const child of children) await archiveBranch(workspaceId, child);
  card.status = 'archived';
  stats.cardsMerged += 1;
  if (shouldApply) await card.save();
};

const normalizeStateExamTree = async (workspaceId: Types.ObjectId, stateRoot: CardDoc) => {
  const wrapperNames = ['State Civil Services', 'State-Specific Exams', 'State Specific Exams'];
  for (const wrapperName of wrapperNames) {
    const wrapper = await findActiveChild(workspaceId, stateRoot._id as Types.ObjectId, [wrapperName]);
    if (!wrapper) continue;
    const children = await StudyCard.find({ workspaceId, parentId: wrapper._id, status: { $ne: 'archived' } });
    for (const child of children) {
      const spec = stateExams.find((item) => {
        const keys = [item.name, item.shortName, ...(item.aliases || [])].map(normalizeKey);
        return keys.includes(normalizeKey(child.name));
      });
      const targetName = spec?.name || child.name;
      const target = await ensureCard(
        workspaceId,
        stateRoot._id as Types.ObjectId,
        targetName,
        styleForName(targetName, 1, spec?.order || child.order || 500, spec?.tone),
        spec ? [spec.shortName, ...(spec.aliases || [])] : [],
      );
      await mergeCardInto(workspaceId, child, target);
    }
    const remainingChildren = await StudyCard.countDocuments({ workspaceId, parentId: wrapper._id, status: { $ne: 'archived' } });
    if (remainingChildren === 0 && !(wrapper.files || []).length) {
      wrapper.status = 'archived';
      if (shouldApply) await wrapper.save();
      stats.cardsMerged += 1;
    }
  }

  const rootShelfNames = ['Overview', 'Syllabus', 'Previous Year Papers', 'Study Material', 'State GK', 'Current Affairs', 'Strategy'];
  for (const shelfName of rootShelfNames) {
    const rootShelf = await findActiveChild(workspaceId, stateRoot._id as Types.ObjectId, [shelfName]);
    if (!rootShelf) continue;
    await archiveBranch(workspaceId, rootShelf);
  }
};

const mergeLegacyStatePackFolders = async (
  workspaceId: Types.ObjectId,
  examCard: CardDoc,
  spec: StateExamSpec,
) => {
  const legacyCode = stateAbbreviation(spec.state);
  if (!legacyCode || legacyCode === spec.state) return;

  const stateGk = await findActiveChild(workspaceId, examCard._id as Types.ObjectId, ['State GK']);
  if (stateGk) {
    const canonicalSpecial = await ensurePath(workspaceId, ['State Exams', spec.name, 'Study Material', stateSpecialStudyShelf(spec)]);
    const legacySpecialNames = [
      `${legacyCode} Special GS`,
      `${spec.state} Special GS`,
      'State Special GS',
      'UP Special GS',
      'UP Specific GK',
      'UP Special GK',
    ];
    for (const legacyName of legacySpecialNames) {
      const legacySpecial = await findActiveChild(workspaceId, stateGk._id as Types.ObjectId, [legacyName]);
      if (!legacySpecial) continue;
      await mergeCardInto(workspaceId, legacySpecial, canonicalSpecial);
    }
    moveFiles(stateGk, canonicalSpecial);
    stateGk.files = [];
    const remainingStateGkChildren = await StudyCard.countDocuments({ workspaceId, parentId: stateGk._id, status: { $ne: 'archived' } });
    if (remainingStateGkChildren === 0) {
      stateGk.status = 'archived';
      stats.cardsMerged += 1;
    }
    if (shouldApply) {
      await canonicalSpecial.save();
      await stateGk.save();
    }
  }

  const currentAffairs = await findActiveChild(workspaceId, examCard._id as Types.ObjectId, ['Current Affairs']);
  if (currentAffairs) {
    const legacyCurrent = await findActiveChild(workspaceId, currentAffairs._id as Types.ObjectId, [`${legacyCode} Current Affairs`]);
    if (legacyCurrent) {
      const canonicalCurrent = await ensurePath(workspaceId, ['State Exams', spec.name, 'Current Affairs', `${spec.state} Current Affairs`]);
      await mergeCardInto(workspaceId, legacyCurrent, canonicalCurrent);
    }
  }
};

const sortFiles = (card: CardDoc) => {
  card.files = [...(card.files || [])].sort((a: FileDoc, b: FileDoc) => {
    const yearA = Number(a.year || 0);
    const yearB = Number(b.year || 0);
    if (yearA !== yearB) return yearB - yearA;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
};

const findActivePath = async (workspaceId: Types.ObjectId, parts: string[]) => {
  let parentId: Types.ObjectId | null = null;
  let card: CardDoc | null = null;
  for (const part of parts) {
    card = await StudyCard.findOne({ workspaceId, parentId, slug: slugify(part), status: { $ne: 'archived' } });
    if (!card) return null;
    parentId = card._id as Types.ObjectId;
  }
  return card;
};

const getEntryText = (entry: Partial<OfficialPyqEntry> | FileDoc) => normalizeKey([
  entry.stage,
  entry.paper,
  entry.subject,
  entry.topic,
  entry.title,
  entry.name,
].filter(Boolean).join(' '));

const getStateExamKeys = (spec: StateExamSpec) =>
  [spec.name, spec.shortName, ...(spec.aliases || [])].map(normalizeKey).filter(Boolean);

const textMatchesKey = (text: string, key: string) => {
  if (!key) return false;
  const keyParts = key.split(' ').filter(Boolean);
  if (keyParts.length > 1) return text.includes(key);
  return text.split(' ').includes(key);
};

const findStateExamForEntry = (entry: Partial<OfficialPyqEntry> | FileDoc) => {
  const route = Array.isArray((entry as OfficialPyqEntry).targetPath)
    ? ((entry as OfficialPyqEntry).targetPath as string[]).join(' ')
    : String((entry as OfficialPyqEntry).targetPath || '');
  const text = normalizeKey([
    route,
    entry.stage,
    entry.paper,
    entry.subject,
    entry.topic,
    entry.title,
    entry.name,
    (entry as OfficialPyqEntry).sourceName,
  ].filter(Boolean).join(' '));

  let best: { spec: StateExamSpec; score: number } | null = null;
  for (const spec of stateExams) {
    for (const key of getStateExamKeys(spec)) {
      if (!textMatchesKey(text, key)) continue;
      const score = key.length;
      if (!best || score > best.score) best = { spec, score };
    }
  }
  return best?.spec || null;
};

const getStatePscPaperBranch = (spec: StateExamSpec, entry: Partial<OfficialPyqEntry> | FileDoc) => {
  const text = getEntryText(entry);
  const isMains = text.includes('mains') || text.includes('main examination');
  const isPrelims = text.includes('prelims') || text.includes('pre ') || text.includes('preliminary');
  const languagePaper = spec.name === 'UPPSC PCS' ? 'General Hindi' : 'General Language';
  const otherPaper = spec.name === 'UPPSC PCS' ? 'Other UPPSC Papers' : 'Other State Papers';

  if (isMains) {
    if (text.includes('essay')) return ['Mains', 'Essay'];
    if (text.includes('hindi') || text.includes('language') || text.includes('regional')) return ['Mains', languagePaper];
    if (/\bgeneral studies\s*(vi|6)\b/.test(text) || /\bgs\s*(paper\s*)?(vi|6)\b/.test(text)) {
      return spec.name === 'UPPSC PCS' ? ['Mains', 'GS Paper VI'] : ['Mains', 'State Special Paper'];
    }
    if (/\bgeneral studies\s*(v|5)\b/.test(text) || /\bgs\s*(paper\s*)?(v|5)\b/.test(text)) {
      return spec.name === 'UPPSC PCS' ? ['Mains', 'GS Paper V'] : ['Mains', 'State Special Paper'];
    }
    if (/\bgeneral studies\s*(iv|4)\b/.test(text) || /\bgs\s*(paper\s*)?(iv|4)\b/.test(text)) return ['Mains', 'GS Paper IV'];
    if (/\bgeneral studies\s*(iii|3)\b/.test(text) || /\bgs\s*(paper\s*)?(iii|3)\b/.test(text)) return ['Mains', 'GS Paper III'];
    if (/\bgeneral studies\s*(ii|2)\b/.test(text) || /\bgs\s*(paper\s*)?(ii|2)\b/.test(text)) return ['Mains', 'GS Paper II'];
    if (/\bgeneral studies\s*(i|1)\b/.test(text) || /\bgs\s*(paper\s*)?(i|1)\b/.test(text)) return ['Mains', 'GS Paper I'];
    if (text.includes('optional') || text.includes('agriculture') || text.includes('engineering')) return ['Mains', 'Optional Subject'];
    if (text.includes('state') || text.includes(normalizeKey(spec.state))) return ['Mains', 'State Special Paper'];
    return [otherPaper];
  }

  if (text.includes('csat') || /\bgeneral studies\s*(ii|2)\b/.test(text) || /\bgs\s*(paper\s*)?(ii|2)\b/.test(text)) {
    return ['Prelims', 'CSAT Paper II'];
  }
  if (isPrelims || /\bgeneral studies\s*(i|1)\b/.test(text) || /\bgs\s*(paper\s*)?(i|1)\b/.test(text)) {
    return ['Prelims', 'GS Paper I'];
  }
  return [otherPaper];
};

const formatStatePyqTitle = (spec: StateExamSpec, entry: Partial<OfficialPyqEntry> | FileDoc, branch: string[]) => {
  const rawTitle = String(entry.title || entry.name || `${spec.name} Previous Year Paper`).trim();
  const year = Number(entry.year || 0);
  const suffix = year ? ` ${year}` : '';
  if (branch[0] === 'Prelims') return `${spec.name} Prelims ${branch[1]}${suffix}`;
  if (branch[0] === 'Mains') return `${spec.name} Mains ${branch[1]}${suffix}`;
  return rawTitle.replace(new RegExp(`^${spec.name}\\s*`, 'i'), `${spec.name} `).slice(0, 180);
};

const loadOfficialStatePyqs = async () => {
  try {
    const raw = await fs.readFile(STATE_PYQ_MANIFEST_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as OfficialPyqEntry[])
      .map((entry) => ({ entry, spec: findStateExamForEntry(entry) }))
      .filter((item): item is { entry: OfficialPyqEntry; spec: StateExamSpec } =>
        Boolean(item.spec && item.entry.title?.trim() && item.entry.url?.trim()));
  } catch (error) {
    console.warn(`State PSC official PYQ manifest not loaded: ${error instanceof Error ? error.message : error}`);
    return [];
  }
};

const attachOfficialStatePyq = async (workspaceId: Types.ObjectId, spec: StateExamSpec, entry: OfficialPyqEntry) => {
  const branch = getStatePscPaperBranch(spec, entry);
  const target = await ensurePath(workspaceId, ['State Exams', spec.name, ...branch]);
  const existing = new Set((target.files || []).map(fileIdentity));
  const file = sanitizeFile({
    name: formatStatePyqTitle(spec, entry, branch),
    url: entry.url,
    sizeBytes: entry.sizeBytes,
    mimeType: entry.mimeType || 'application/pdf',
    resourceType: entry.resourceType || 'pyq',
    status: 'published',
    visibility: 'public',
    year: entry.year,
    stage: branch[0] || entry.stage || 'PYQ',
    paper: branch[1] || entry.paper || 'Question Paper',
    subject: entry.subject || branch[1] || spec.name,
    topic: entry.topic || 'Official previous year question paper',
    language: entry.language || 'english',
    sourceType: 'official',
    sourceName: entry.sourceName || spec.shortName,
    notes: [entry.notes, entry.rightsNote, entry.sourceUrl ? `Official source: ${entry.sourceUrl}` : ''].filter(Boolean).join(' | '),
    uploadedAt: new Date(),
  });
  if (existing.has(fileIdentity(file))) {
    stats.filesExisting += 1;
    return;
  }
  target.files = [...(target.files || []), file];
  sortFiles(target);
  stats.filesAttached += 1;
  if (shouldApply) await target.save();
};

const organizeExistingStatePyqFiles = async (workspaceId: Types.ObjectId, spec: StateExamSpec) => {
  const sourcePaths = [
    ['State Exams', spec.name, 'Prelims'],
    ['State Exams', spec.name, 'Prelims', 'Previous Year Papers'],
    ['State Exams', spec.name, 'Mains'],
    ['State Exams', spec.name, 'Mains', 'Previous Year Papers'],
    ['State Exams', spec.name, 'Previous Year Papers'],
    ['State Exams', spec.name, 'Previous Year Papers', 'Prelims'],
    ['State Exams', spec.name, 'Previous Year Papers', 'Prelims', 'Previous Year Papers'],
    ['State Exams', spec.name, 'Previous Year Papers', 'Mains'],
    ['State Exams', spec.name, 'Previous Year Papers', 'Mains', 'Previous Year Papers'],
  ];

  for (const sourcePath of sourcePaths) {
    const source = await findActivePath(workspaceId, sourcePath);
    if (!source || !(source.files || []).length) continue;

    const remaining: FileDoc[] = [];
    for (const sourceFile of source.files || []) {
      const branch = getStatePscPaperBranch(spec, sourceFile);
      const targetPath = ['State Exams', spec.name, ...branch];
      if (targetPath.join('/') === sourcePath.join('/')) {
        remaining.push(sourceFile);
        continue;
      }

      const target = await ensurePath(workspaceId, targetPath);
      const existing = new Set((target.files || []).map(fileIdentity));
      const rawSourceFile = typeof sourceFile.toObject === 'function' ? sourceFile.toObject() : sourceFile;
      const movedFile = sanitizeFile({
        ...rawSourceFile,
        name: formatStatePyqTitle(spec, sourceFile, branch),
        stage: branch[0] || sourceFile.stage,
        paper: branch[1] || sourceFile.paper,
        resourceType: sourceFile.resourceType || 'pyq',
      });
      if (existing.has(fileIdentity(movedFile))) {
        stats.filesDeduped += 1;
      } else {
        target.files = [...(target.files || []), movedFile];
        sortFiles(target);
        stats.filesMoved += 1;
        if (shouldApply) await target.save();
      }
    }

    source.files = remaining;
    sortFiles(source);
    const shouldArchiveEmptyLegacyFolder = (
      sourcePath.length > 4 &&
      sourcePath[sourcePath.length - 1] === 'Previous Year Papers' &&
      remaining.length === 0
    );
    if (shouldArchiveEmptyLegacyFolder) {
      const activeChildren = await StudyCard.countDocuments({
        workspaceId,
        parentId: source._id,
        status: { $ne: 'archived' },
      });
      if (activeChildren === 0) {
        source.status = 'archived';
        stats.cardsMerged += 1;
      }
    }
    if (shouldApply) await source.save();
  }
};

const mergeLegacyStateStageFolders = async (workspaceId: Types.ObjectId, spec: StateExamSpec) => {
  const examCard = await findActivePath(workspaceId, ['State Exams', spec.name]);
  if (!examCard) return;

  const stageTargets: Record<string, string[]> = {
    Prelims: ['State Exams', spec.name, 'Previous Year Papers', 'Prelims'],
    Mains: ['State Exams', spec.name, 'Previous Year Papers', 'Mains'],
  };

  for (const [stageName, targetPath] of Object.entries(stageTargets)) {
    const legacyStage = await findActiveChild(workspaceId, examCard._id as Types.ObjectId, [stageName]);
    if (!legacyStage) continue;
    const canonicalStage = await ensurePath(workspaceId, targetPath);
    await mergeCardInto(workspaceId, legacyStage, canonicalStage);
  }

  const commonResources = await findActiveChild(workspaceId, examCard._id as Types.ObjectId, ['Common Resources']);
  if (commonResources) {
    const canonicalCommon = await ensurePath(workspaceId, ['State Exams', spec.name, 'Study Material', 'General Studies']);
    await mergeCardInto(workspaceId, commonResources, canonicalCommon);
  }
};

const writePremiumPdf = async (pack: PremiumPack) => {
  await fs.mkdir(STATIC_FILE_ROOT, { recursive: true });
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const cyan = rgb(0.04, 0.72, 0.84);
  const slate = rgb(0.08, 0.1, 0.18);
  const muted = rgb(0.34, 0.39, 0.48);
  const examTitle = pack.targetPath[1] || 'State PSC';

  page.drawText('STUDY HUB PREMIUM', { x: 48, y: 784, size: 10, font: bold, color: cyan });
  page.drawText(pack.title, { x: 48, y: 744, size: 22, font: bold, color: slate, maxWidth: 500 });
  page.drawText(`${examTitle} | ${pack.stage} | ${pack.subject}`, { x: 48, y: 708, size: 11, font: bold, color: muted });
  page.drawText(pack.topic, { x: 48, y: 678, size: 15, font: bold, color: slate });

  let y = 638;
  for (const bullet of pack.bullets) {
    const lines = bullet.match(/.{1,88}(?:\s|$)/g) || [bullet];
    page.drawText('-', { x: 54, y, size: 12, font: bold, color: cyan });
    for (const line of lines) {
      page.drawText(line.trim(), { x: 72, y, size: 11, font: regular, color: slate });
      y -= 18;
    }
    y -= 8;
  }

  page.drawText('Use this as a concise planning sheet. Pair it with official syllabus, PYQs, and current affairs notes.', {
    x: 48,
    y: 72,
    size: 9,
    font: regular,
    color: muted,
    maxWidth: 500,
  });

  const bytes = await pdfDoc.save();
  const fileName = `${pack.id}.pdf`;
  const filePath = path.join(STATIC_FILE_ROOT, fileName);
  if (shouldApply) {
    await fs.writeFile(filePath, bytes);
    stats.pdfsWritten += 1;
  }
  return {
    fileName,
    sizeBytes: bytes.length,
    url: `${STATIC_URL_ROOT}/${fileName}`,
  };
};

const attachPremiumPack = async (workspaceId: Types.ObjectId, pack: PremiumPack) => {
  const target = await ensurePath(workspaceId, pack.targetPath);
  const generated = await writePremiumPdf(pack);
  const existing = new Set((target.files || []).map(fileIdentity));
  const examTitle = pack.targetPath[1] || 'State PSC';
  const file = {
    name: pack.title,
    url: generated.url,
    sizeBytes: generated.sizeBytes,
    mimeType: 'application/pdf',
    resourceType: pack.resourceType,
    status: 'published',
    visibility: 'public',
    stage: pack.stage,
    subject: pack.subject,
    topic: pack.topic,
    language: 'hinglish',
    sourceType: 'platform',
    sourceName: 'Study Hub',
    notes: `${CONTENT_VERSION}: premium ${examTitle} preparation pack.`,
    uploadedAt: new Date(),
  };
  if (existing.has(fileIdentity(file))) {
    stats.filesExisting += 1;
    return;
  }
  target.files.push(file);
  sortFiles(target);
  stats.filesAttached += 1;
  if (shouldApply) await target.save();
};

const seedStateExams = async (workspaceId: Types.ObjectId) => {
  const stateRoot = await ensureCard(workspaceId, null, 'State Exams', styleForName('State Exams', 0, 40));
  await normalizeStateExamTree(workspaceId, stateRoot);

  for (const spec of stateExams) {
    const examCard = await ensureCard(
      workspaceId,
      stateRoot._id as Types.ObjectId,
      spec.name,
      styleForName(spec.name, 1, spec.order, spec.tone),
      [spec.shortName, ...(spec.aliases || [])],
    );
    for (const shelf of baseShelves) {
      await ensureCard(workspaceId, examCard._id as Types.ObjectId, shelf.name, {
        iconKey: shelf.iconKey,
        tone: shelf.tone,
        goalType: 'resource_folder',
        order: shelf.order,
      });
    }
    await mergeLegacyStatePackFolders(workspaceId, examCard, spec);

    for (const deepPath of getDeepShelvesForStateExam(spec)) {
      await ensurePath(workspaceId, ['State Exams', spec.name, ...deepPath]);
    }

    await mergeLegacyStateStageFolders(workspaceId, spec);
  }

  for (const spec of stateExams) {
    await organizeExistingStatePyqFiles(workspaceId, spec);
  }

  const officialStatePyqs = await loadOfficialStatePyqs();
  for (const { spec, entry } of officialStatePyqs) {
    await attachOfficialStatePyq(workspaceId, spec, entry);
  }

  for (const pack of allPremiumPacks) {
    await attachPremiumPack(workspaceId, pack);
  }
};

const summarizePath = async (workspaceId: Types.ObjectId, pathParts: string[]) => {
  let parentId: Types.ObjectId | null = null;
  let card: CardDoc | null = null;
  for (const part of pathParts) {
    card = await StudyCard.findOne({ workspaceId, parentId, slug: slugify(part), status: { $ne: 'archived' } });
    if (!card) return null;
    parentId = card._id as Types.ObjectId;
  }
  const cards = await StudyCard.find({ workspaceId, status: { $ne: 'archived' } }).select('_id parentId files').lean();
  const childrenByParent = new Map<string, any[]>();
  for (const item of cards) {
    const list = childrenByParent.get(String(item.parentId || 'root')) || [];
    list.push(item);
    childrenByParent.set(String(item.parentId || 'root'), list);
  }
  let folders = 0;
  let files = 0;
  const queue = [card as any];
  const seen = new Set<string>();
  while (queue.length) {
    const current = queue.shift();
    if (!current || seen.has(String(current._id))) continue;
    seen.add(String(current._id));
    folders += 1;
    files += (current.files || []).length;
    queue.push(...(childrenByParent.get(String(current._id)) || []));
  }
  return { folders, files };
};

const verifyStateExams = async (workspaceId: Types.ObjectId) => {
  const stateRoot = await StudyCard.findOne({ workspaceId, parentId: null, slug: 'state-exams', status: { $ne: 'archived' } });
  if (!stateRoot) {
    console.log('State Exams: missing');
    return;
  }

  const directExams = await StudyCard.find({
    workspaceId,
    parentId: stateRoot._id,
    status: { $ne: 'archived' },
    goalType: 'exam',
  }).sort({ order: 1, name: 1 }).select('name').lean();
  const summary = await summarizePath(workspaceId, ['State Exams']);
  const uppscSummary = await summarizePath(workspaceId, ['State Exams', 'UPPSC PCS']);
  const bpscSummary = await summarizePath(workspaceId, ['State Exams', 'BPSC PCS']);
  const rpscSummary = await summarizePath(workspaceId, ['State Exams', 'RPSC RAS']);
  const stateCivilServices = await StudyCard.findOne({
    workspaceId,
    parentId: stateRoot._id,
    slug: 'state-civil-services',
    status: { $ne: 'archived' },
  });

  console.log(`State Exams: ${summary?.folders || 0} folders, ${summary?.files || 0} files`);
  console.log(`Direct state PSC exam cards: ${directExams.length}/${stateExams.length}`);
  console.log(`Top cards: ${directExams.slice(0, 8).map((item) => item.name).join(', ')}`);
  console.log(`UPPSC PCS: ${uppscSummary?.folders || 0} folders, ${uppscSummary?.files || 0} files`);
  console.log(`BPSC PCS: ${bpscSummary?.folders || 0} folders, ${bpscSummary?.files || 0} files`);
  console.log(`RPSC RAS: ${rpscSummary?.folders || 0} folders, ${rpscSummary?.files || 0} files`);
  console.log(`State Civil Services wrapper active: ${stateCivilServices ? 'yes' : 'no'}`);
};

const run = async () => {
  console.log(`${verifyOnly ? 'Verifying' : shouldApply ? 'Applying' : 'Dry run'} State PSC premium library seed.`);
  console.log(`Prepared state PSC cards: ${stateExams.length}. Premium packs: ${allPremiumPacks.length} (${uppscPremiumPacks.length + uppscPaperPacks.length} UPPSC, ${remainingStatePremiumPacks.length + remainingStatePaperPacks.length} remaining PSC).`);
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined.');
  await connectMongo();

  const workspace = await getRootWorkspace();
  const workspaceId = workspace._id as Types.ObjectId;

  if (!verifyOnly) {
    if (!shouldApply) {
      console.log('[dry-run] Use --apply to create direct State Exams cards, merge wrappers, organize state PYQs, and attach premium PSC packs.');
    } else {
      await seedStateExams(workspaceId);
    }
  }

  await verifyStateExams(workspaceId);
  if (shouldApply) {
    console.log(
      [
        `Cards created: ${stats.cardsCreated}. Restored: ${stats.cardsRestored}. Updated: ${stats.cardsUpdated}. Merged/archived: ${stats.cardsMerged}.`,
        `Files moved: ${stats.filesMoved}. Duplicates skipped: ${stats.filesDeduped}. Premium files attached: ${stats.filesAttached}. Existing: ${stats.filesExisting}.`,
        `Premium PDFs written: ${stats.pdfsWritten}.`,
      ].join('\n'),
    );
  }
};

run()
  .catch((error) => {
    console.error('State PSC premium seed failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
