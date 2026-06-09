import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve(process.cwd(), 'client/src/assets/media/icons/subjects');

const rawSpecs = `
mathematics|MATH|science
maths|MATH|science
physics|PHY|science
chemistry|CHEM|science
biology|BIO|science
science|SCI|science
english|ENG|language
hindi|HIN|language
sanskrit|SAN|language
language|LANG|language
accountancy|ACC|commerce
accounts|ACC|commerce
business-studies|BST|commerce
commerce|COM|commerce
economics|ECO|commerce
economy|ECO|commerce
history|HIS|history
geography|GEO|geography
polity|POL|law
political-science|PSC|law
civics|CIV|law
psychology|PSY|humanities
sociology|SOC|humanities
home-science|HOME|wellness
computer-science|CS|technology
informatics-practices|IP|technology
biotechnology|BT|science
fine-art|ART|creative
art-culture|ART|creative
knowledge-traditions|KTP|humanities
environmental-studies|EVS|environment
evs|EVS|environment
social-science|SST|humanities
physical-education|PE|wellness
health|HLTH|wellness
music|MUS|creative
dance|DNC|creative
painting|PNT|creative
yoga|YOG|wellness
general|GEN|general
indian-history|IHIS|history
modern-history|MOD|history
ancient-history|ANC|history
medieval-history|MED|history
world-history|WHIS|history
indian-polity|IPOL|law
governance|GOV|law
constitution|CONST|law
indian-economy|IECO|commerce
environment|ENV|environment
ecology|ECO|environment
ethics|ETH|humanities
essay|ESS|language
current-affairs|CA|exam
international-relations|IR|humanities
security|SEC|exam
disaster-management|DM|environment
society|SOC|humanities
social-justice|SJ|law
science-technology|ST|technology
anthropology|ANT|humanities
philosophy|PHI|humanities
public-administration|PUB|law
optional|OPT|exam
gs-paper|GS|exam
civil-engineering|CE|engineering
mechanical-engineering|ME|engineering
electrical-engineering|EE|engineering
electronics|ECE|technology
electronics-communication|ECE|technology
computer-science-engineering|CSE|technology
chemical-engineering|CH|engineering
aerospace-engineering|AE|engineering
production-engineering|PE|engineering
instrumentation-engineering|IN|engineering
mining-engineering|MN|engineering
metallurgy|MT|engineering
architecture-planning|AR|engineering
textile-engineering|TF|engineering
petroleum-engineering|PE|engineering
biomedical-engineering|BM|medical
environmental-engineering|EN|environment
naval-architecture|NA|engineering
data-science|DS|technology
artificial-intelligence|AI|technology
machine-learning|ML|technology
cybersecurity|CY|technology
operating-systems|OS|technology
database|DB|technology
databases|DB|technology
networks|NET|technology
computer-networks|CN|technology
algorithms|ALG|technology
digital-logic|DL|technology
programming|CODE|technology
dsa|DSA|technology
finance|FIN|commerce
banking|BANK|commerce
marketing|MKT|commerce
human-resources|HR|commerce
operations|OPS|commerce
management|MGT|commerce
business-law|BL|law
taxation|TAX|commerce
audit|AUD|commerce
cost-accounting|COST|commerce
entrepreneurship|ENT|commerce
statistics|STAT|science
medical|MED|medical
anatomy|ANA|medical
physiology|PHYS|medical
botany|BOT|environment
zoology|ZOO|science
microbiology|MIC|science
pharmacology|PHAR|medical
pathology|PATH|medical
biochemistry|BC|science
medicine|MED|medical
surgery|SURG|medical
dental|DENT|medical
nursing|NUR|medical
pharmacy|PHAR|medical
agriculture|AGRI|environment
veterinary|VET|medical
law|LAW|law
jurisprudence|JUR|law
constitutional-law|CLAW|law
criminal-law|CRIM|law
civil-law|CIVL|law
education|EDU|exam
library-science|LIB|humanities
mass-media|MEDIA|creative
journalism|JOUR|creative
books|BOOK|resource
ncert-books|NCB|resource
ncert-solutions|NCS|resource
textbook|TEXT|resource
syllabus|SYL|resource
study-material|MAT|resource
notes|NOTE|resource
revision-notes|REV|resource
pyq|PYQ|resource
previous-year-papers|PYP|resource
question-paper|QP|resource
sample-papers|SMP|resource
mock-tests|MOCK|exam
practice-questions|PRAC|exam
question-bank|QB|resource
answer-key|ANS|resource
formula-sheet|FORM|science
mind-map|MAP|general
flashcards|CARD|resource
assignments|ASGN|resource
projects|PROJ|resource
practicals|LAB|science
lab-manual|LAB|science
video-lectures|VID|resource
live-classes|LIVE|resource
strategy|STR|exam
roadmap|ROAD|general
interview|INT|humanities
profile|PRO|humanities
portfolio|PORT|creative
resume|CV|resource
certificate|CERT|exam
bookmark|SAVE|resource
download|DL|resource
exam|EXAM|exam
class|CLS|exam
school-board|SCH|exam
state-board|STATE|exam
university|UNI|exam
placement|PLC|commerce
scholarship|SCH|exam
abroad|ABR|geography
cuet|CUET|exam
cbse|CBSE|resource
ncert|NCERT|resource
gate-cse|CSE|technology
gate-ece|ECE|technology
gate-ee|EE|engineering
gate-me|ME|engineering
gate-ce|CE|engineering
gate-da|DA|technology
`.trim().split('\n');

const palettes = {
  science: ['#38bdf8', '#a78bfa', '#082f49'],
  commerce: ['#34d399', '#fbbf24', '#064e3b'],
  humanities: ['#fb7185', '#c084fc', '#4c0519'],
  language: ['#22d3ee', '#f472b6', '#083344'],
  engineering: ['#60a5fa', '#f97316', '#1e293b'],
  medical: ['#2dd4bf', '#f43f5e', '#042f2e'],
  law: ['#f59e0b', '#38bdf8', '#451a03'],
  creative: ['#f472b6', '#facc15', '#4a044e'],
  technology: ['#22d3ee', '#818cf8', '#0f172a'],
  wellness: ['#4ade80', '#f9a8d4', '#052e16'],
  environment: ['#84cc16', '#22c55e', '#14532d'],
  geography: ['#2dd4bf', '#60a5fa', '#083344'],
  history: ['#fbbf24', '#fb7185', '#422006'],
  resource: ['#cbd5e1', '#38bdf8', '#1e293b'],
  exam: ['#818cf8', '#22d3ee', '#312e81'],
  general: ['#94a3b8', '#f8fafc', '#0f172a'],
};

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const glyphs = {
  science: (a, b) => `
    <ellipse cx="64" cy="62" rx="22" ry="8" fill="none" stroke="${a}" stroke-width="4" transform="rotate(-24 64 62)"/>
    <ellipse cx="64" cy="62" rx="22" ry="8" fill="none" stroke="${b}" stroke-width="4" transform="rotate(24 64 62)"/>
    <circle cx="64" cy="62" r="5" fill="${b}"/>`,
  commerce: (a, b) => `
    <path d="M48 72h7V59h-7v13Zm13 0h7V52h-7v20Zm13 0h7V46h-7v26Z" fill="${a}"/>
    <path d="M46 76h38" stroke="${b}" stroke-width="4" stroke-linecap="round"/>
    <path d="M50 49c10 6 20 3 30-9" fill="none" stroke="${b}" stroke-width="4" stroke-linecap="round"/>`,
  humanities: (a, b) => `
    <circle cx="64" cy="52" r="10" fill="${a}"/>
    <path d="M47 78c3-12 12-18 17-18s14 6 17 18" fill="none" stroke="${b}" stroke-width="5" stroke-linecap="round"/>
    <path d="M45 80h38" stroke="${a}" stroke-width="4" stroke-linecap="round"/>`,
  language: (a, b) => `
    <path d="M46 47h40v22H63L52 78v-9h-6V47Z" fill="${a}" opacity=".95"/>
    <path d="M53 56h28M53 63h18" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
    <circle cx="84" cy="76" r="7" fill="${b}"/>`,
  engineering: (a, b) => `
    <circle cx="64" cy="62" r="17" fill="none" stroke="${a}" stroke-width="7"/>
    <circle cx="64" cy="62" r="6" fill="${b}"/>
    <path d="M64 38v9M64 77v9M40 62h9M79 62h9M47 45l7 7M80 45l-7 7M47 79l7-7M80 79l-7-7" stroke="${b}" stroke-width="5" stroke-linecap="round"/>`,
  medical: (a, b) => `
    <rect x="49" y="45" width="30" height="32" rx="8" fill="${a}"/>
    <path d="M64 52v18M55 61h18" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
    <path d="M47 78c10 6 25 6 34 0" stroke="${b}" stroke-width="4" stroke-linecap="round"/>`,
  law: (a, b) => `
    <path d="M64 42v38M48 80h32M55 48h18" stroke="${a}" stroke-width="5" stroke-linecap="round"/>
    <path d="M48 52l-10 18h20L48 52Zm32 0-10 18h20L80 52Z" fill="${b}" opacity=".95"/>`,
  creative: (a, b) => `
    <path d="M49 75c13-4 26-17 33-31" stroke="${a}" stroke-width="7" stroke-linecap="round"/>
    <path d="M43 80c9 1 16-1 22-7-9-5-16-4-22 7Z" fill="${b}"/>
    <circle cx="81" cy="43" r="6" fill="#ffffff" opacity=".9"/>`,
  technology: (a, b) => `
    <path d="M53 50 42 62l11 12M75 50l11 12-11 12" fill="none" stroke="${a}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M68 45 59 79" stroke="${b}" stroke-width="5" stroke-linecap="round"/>`,
  wellness: (a, b) => `
    <path d="M44 65h12l6-16 9 30 7-14h10" fill="none" stroke="${a}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="64" cy="43" r="7" fill="${b}"/>`,
  environment: (a, b) => `
    <path d="M42 72c20-3 32-18 42-36 2 26-11 43-36 43-3 0-5-1-6-7Z" fill="${a}"/>
    <path d="M49 72c12-9 22-17 33-34" stroke="${b}" stroke-width="4" stroke-linecap="round"/>`,
  geography: (a, b) => `
    <path d="M64 81s19-17 19-33c0-10-8-18-19-18S45 38 45 48c0 16 19 33 19 33Z" fill="${a}"/>
    <circle cx="64" cy="48" r="8" fill="#ffffff"/>
    <path d="M48 82h32" stroke="${b}" stroke-width="5" stroke-linecap="round"/>`,
  history: (a, b) => `
    <path d="M44 78h40M48 72V55m14 17V55m14 17V55" stroke="${a}" stroke-width="5" stroke-linecap="round"/>
    <path d="M42 52h44L64 40 42 52Z" fill="${b}"/>
    <path d="M45 82h38" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity=".75"/>`,
  resource: (a, b) => `
    <path d="M47 44h29c5 0 9 4 9 9v28H55c-5 0-9-4-9-9V45c0-.6.4-1 1-1Z" fill="${a}"/>
    <path d="M55 52h24M55 60h18M55 68h22" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>
    <path d="M84 53v28" stroke="${b}" stroke-width="5" stroke-linecap="round"/>`,
  exam: (a, b) => `
    <rect x="48" y="42" width="32" height="39" rx="7" fill="${a}"/>
    <path d="M56 54h17M56 62h17M56 70h10" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
    <path d="m58 79 7 6 15-18" fill="none" stroke="${b}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  general: (a, b) => `
    <path d="M64 39 69 55l16 5-16 5-5 16-5-16-16-5 16-5 5-16Z" fill="${a}"/>
    <circle cx="86" cy="43" r="5" fill="${b}"/>
    <circle cx="44" cy="79" r="5" fill="${b}" opacity=".8"/>`,
};

const makeSvg = ({ key, label, family }, index) => {
  const [accent, accent2, dark] = palettes[family] || palettes.general;
  const textSize = label.length > 4 ? 13 : label.length > 3 ? 14 : 16;
  const glyph = (glyphs[family] || glyphs.general)(accent, accent2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="${escapeXml(key)} icon">
  <defs>
    <linearGradient id="stroke" x1="31" y1="27" x2="96" y2="91" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${accent}"/>
      <stop offset=".62" stop-color="${accent2}"/>
      <stop offset="1" stop-color="#f8fafc"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="12" stdDeviation="8" flood-color="${dark}" flood-opacity=".24"/>
    </filter>
  </defs>
  <style>
    .ink{fill:#0f172a}
    .hair{stroke:#334155}
    .label{fill:#0f172a}
    @media (prefers-color-scheme: dark){
      .ink{fill:#f8fafc}
      .hair{stroke:#e2e8f0}
      .label{fill:#f8fafc}
    }
  </style>
  <g filter="url(#shadow)" transform="translate(0 -2)">
    <path d="M35 91c18 7 41 7 58 0" fill="none" stroke="url(#stroke)" stroke-width="5" stroke-linecap="round" opacity=".54"/>
    <g transform="translate(0 2)">${glyph}
    </g>
  </g>
  <text x="64" y="106" text-anchor="middle" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="${textSize}" font-weight="900" letter-spacing=".5" class="label">${escapeXml(label)}</text>
  <path d="M50 112h28" stroke="url(#stroke)" stroke-width="3" stroke-linecap="round" opacity=".78"/>
</svg>
`;
};

const toSpec = (key, label, family) => ({ key, label, family });

const classSpecs = Array.from({ length: 12 }, (_, index) => {
  const classNumber = index + 1;
  return toSpec(`class-${classNumber}`, `C${classNumber}`, 'exam');
});

const boardSpecs = [
  ['school-boards', 'BOARD', 'exam'],
  ['cbse-class-10', 'C10', 'exam'],
  ['cbse-class-11', 'C11', 'exam'],
  ['cbse-class-12', 'C12', 'exam'],
  ['icse-board', 'ICSE', 'exam'],
  ['isc-board', 'ISC', 'exam'],
  ['up-board', 'UP', 'exam'],
  ['bihar-board', 'BSEB', 'exam'],
  ['mp-board', 'MP', 'exam'],
  ['rajasthan-board', 'RBSE', 'exam'],
  ['maharashtra-board', 'MSBSHSE', 'exam'],
  ['tn-board', 'TN', 'exam'],
  ['karnataka-board', 'KSEAB', 'exam'],
  ['kerala-board', 'KER', 'exam'],
  ['gujarat-board', 'GSEB', 'exam'],
  ['haryana-board', 'HBSE', 'exam'],
  ['punjab-board', 'PSEB', 'exam'],
  ['west-bengal-board', 'WB', 'exam'],
  ['telangana-board', 'TS', 'exam'],
  ['andhra-pradesh-board', 'AP', 'exam'],
].map(([key, label, family]) => toSpec(key, label, family));

const streamSpecs = [
  ['science-stream', 'SCI', 'science'],
  ['commerce-stream', 'COM', 'commerce'],
  ['humanities-stream', 'HUM', 'humanities'],
  ['arts-stream', 'ARTS', 'creative'],
  ['vocational-stream', 'VOC', 'technology'],
  ['applied-mathematics', 'AMATH', 'science'],
  ['english-core', 'ENG', 'language'],
  ['english-elective', 'ENG+', 'language'],
  ['hindi-core', 'HIN', 'language'],
  ['hindi-elective', 'HIN+', 'language'],
  ['sanskrit-core', 'SAN', 'language'],
  ['legal-studies', 'LAW', 'law'],
  ['information-technology', 'IT', 'technology'],
  ['artificial-intelligence-subject', 'AI', 'technology'],
  ['computer-applications', 'CA', 'technology'],
  ['health-physical-education', 'HPE', 'wellness'],
  ['art-education', 'ART', 'creative'],
  ['worksheets', 'WORK', 'resource'],
  ['activity-sheets', 'ACT', 'resource'],
].map(([key, label, family]) => toSpec(key, label, family));

const entranceExamSpecs = [
  ['jee-main', 'JEE', 'science'],
  ['jee-advanced', 'IIT', 'science'],
  ['neet-ug', 'NEET', 'medical'],
  ['cuet-ug', 'CUET', 'exam'],
  ['cuet-pg', 'CUET', 'exam'],
  ['clat', 'CLAT', 'law'],
  ['ailet', 'AILET', 'law'],
  ['cat', 'CAT', 'commerce'],
  ['xat', 'XAT', 'commerce'],
  ['gmat', 'GMAT', 'commerce'],
  ['gre', 'GRE', 'language'],
  ['sat', 'SAT', 'exam'],
  ['ielts', 'IELTS', 'language'],
  ['toefl', 'TOEFL', 'language'],
  ['gate', 'GATE', 'engineering'],
  ['iit-jam', 'JAM', 'science'],
  ['ugc-net', 'NET', 'exam'],
  ['csir-net', 'CSIR', 'science'],
  ['ctet', 'CTET', 'exam'],
  ['tet', 'TET', 'exam'],
  ['nift', 'NIFT', 'creative'],
  ['nid-dat', 'NID', 'creative'],
  ['uceed', 'UCEED', 'creative'],
  ['nata', 'NATA', 'engineering'],
  ['gpat', 'GPAT', 'medical'],
  ['fmge', 'FMGE', 'medical'],
  ['neet-pg', 'PG', 'medical'],
  ['aiims-norcet', 'NUR', 'medical'],
  ['nda', 'NDA', 'exam'],
  ['cds', 'CDS', 'exam'],
  ['afcat', 'AFCAT', 'exam'],
].map(([key, label, family]) => toSpec(key, label, family));

const governmentExamSpecs = [
  ['upsc-cse', 'UPSC', 'exam'],
  ['ssc-cgl', 'CGL', 'exam'],
  ['ssc-chsl', 'CHSL', 'exam'],
  ['ssc-gd', 'GD', 'exam'],
  ['bank-po', 'PO', 'commerce'],
  ['bank-clerk', 'CLK', 'commerce'],
  ['ibps-po', 'IBPS', 'commerce'],
  ['sbi-po', 'SBI', 'commerce'],
  ['rbi-grade-b', 'RBI', 'commerce'],
  ['rrb-ntpc', 'RRB', 'exam'],
  ['rrb-alp', 'ALP', 'engineering'],
  ['railway-group-d', 'RGD', 'exam'],
  ['state-civil-services', 'PCS', 'exam'],
  ['uppsc', 'UPPSC', 'exam'],
  ['bpsc', 'BPSC', 'exam'],
  ['mppsc', 'MPPSC', 'exam'],
  ['rpsc', 'RPSC', 'exam'],
  ['mpsc', 'MPSC', 'exam'],
  ['tnpsc', 'TNPSC', 'exam'],
  ['kpsc', 'KPSC', 'exam'],
  ['wbpsc', 'WBPSC', 'exam'],
  ['police-constable', 'POL', 'exam'],
  ['police-si', 'SI', 'exam'],
  ['judiciary-exam', 'JUD', 'law'],
].map(([key, label, family]) => toSpec(key, label, family));

const resourceAliasSpecs = [
  ['board-pattern', 'PAT', 'resource'],
  ['official-cbse', 'CBSE', 'resource'],
  ['ncert-exemplar', 'EX', 'resource'],
  ['formula-sheets', 'FORM', 'science'],
  ['revision', 'REV', 'resource'],
  ['sample-paper', 'SMP', 'resource'],
  ['important-questions', 'IMP', 'resource'],
  ['answer-keys', 'ANS', 'resource'],
  ['marking-scheme', 'MARK', 'resource'],
  ['model-paper', 'MODEL', 'resource'],
  ['test-series', 'TEST', 'exam'],
  ['chapter-wise-notes', 'CHAP', 'resource'],
  ['case-study', 'CASE', 'humanities'],
  ['competency-based-questions', 'COMP', 'exam'],
  ['map-work', 'MAP', 'geography'],
  ['diagram-practice', 'DIAG', 'science'],
].map(([key, label, family]) => toSpec(key, label, family));

const baseSpecs = rawSpecs.map((line) => {
  const [key, label, family] = line.split('|').map((part) => part.trim());
  return { key, label, family };
});

const specs = [
  ...baseSpecs,
  ...classSpecs,
  ...boardSpecs,
  ...streamSpecs,
  ...entranceExamSpecs,
  ...governmentExamSpecs,
  ...resourceAliasSpecs,
];

const uniqueSpecs = Array.from(new Map(specs.map((spec) => [spec.key, spec])).values());

await mkdir(outDir, { recursive: true });

await Promise.all(uniqueSpecs.map((spec, index) => {
  const fileName = `ic_${spec.key}.svg`;
  return writeFile(path.join(outDir, fileName), makeSvg(spec, index), 'utf8');
}));

console.log(`Generated ${uniqueSpecs.length} premium subject icons in ${outDir}`);
