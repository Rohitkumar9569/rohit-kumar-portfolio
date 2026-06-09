import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('client/src/assets/media/icons');
const groups = ['badges', 'categories', 'education', 'entrance', 'exams', 'language', 'tabs'];

const palettes = {
  badges: ['#facc15', '#22d3ee', '#8b5cf6'],
  categories: ['#22d3ee', '#6366f1', '#14b8a6'],
  education: ['#60a5fa', '#22c55e', '#0ea5e9'],
  entrance: ['#34d399', '#06b6d4', '#8b5cf6'],
  exams: ['#38bdf8', '#8b5cf6', '#22c55e'],
  language: ['#f472b6', '#38bdf8', '#a78bfa'],
  tabs: ['#f59e0b', '#22d3ee', '#64748b'],
};

const normalizeKey = (fileName) =>
  fileName
    .replace(/^ic_/, '')
    .replace(/\.svg$/, '')
    .replace(/_/g, '-')
    .toLowerCase();

const toTitle = (key) =>
  key
    .split('-')
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');

const codeFor = (key) => {
  const explicit = {
    answer: 'ANS',
    'answer-key': 'KEY',
    abroad: 'INT',
    architecture: 'ARC',
    ayush: 'AYU',
    bank: 'BNK',
    bel: 'BEL',
    bhel: 'BHL',
    'bio-research': 'BIO',
    ca: 'CA',
    'ca-final': 'CA',
    cbse: 'CBSE',
    cds: 'CDS',
    competitive: 'EXAM',
    entrance: 'EXAM',
    epfo: 'EPFO',
    fci: 'FCI',
    ftii: 'FILM',
    gate: 'GATE',
    gpat: 'GPAT',
    hsk: 'HSK',
    ib: 'IB',
    'ib-acio': 'IB',
    icse: 'ICSE',
    ielts: 'IELTS',
    iim: 'IIM',
    iit: 'IIT',
    'iit-jam': 'JAM',
    imd: 'IMD',
    ignou: 'IGNOU',
    isro: 'ISRO',
    itbp: 'ITBP',
    jlpt: 'JLPT',
    nlu: 'NLU',
    nda: 'NDA',
    neet: 'NEET',
    pte: 'PTE',
    rbi: 'RBI',
    'rrb-ntpc': 'RRB',
    sbi: 'SBI',
    sebi: 'SEBI',
    ssb: 'SSB',
    'ssc-cgl': 'CGL',
    'ssc-chsl': 'CHSL',
    'ssc-gd': 'GD',
    school: 'SCH',
    'senior-sec': 'SEC',
    'state-board': 'SCH',
    'state-exam': 'PCS',
    toefl: 'TOEFL',
    'toefl-gre': 'GRE',
    topik: 'TOPIK',
    university: 'UNI',
    'upsc-cse': 'UPSC',
  };
  if (explicit[key]) return explicit[key];
  const words = key.split('-').filter(Boolean);
  if (!words.length) return 'RK';
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words.map((word) => word[0]).join('').slice(0, 4).toUpperCase();
};

const kindFor = (group, key) => {
  if (group === 'badges') return 'badge';
  if (group === 'language') return 'language';
  if (group === 'tabs') {
    if (key.includes('mock')) return 'test';
    if (key.includes('answer')) return 'key';
    if (key.includes('strategy')) return 'target';
    if (key.includes('interview')) return 'mic';
    if (key.includes('syllabus')) return 'clipboard';
    if (key.includes('update')) return 'news';
    return 'dashboard';
  }
  if (['placement', 'iim', 'company', 'career'].some((token) => key.includes(token))) return 'briefcase';
  if (['school', 'cbse', 'icse', 'board', 'primary', 'middle', 'senior-sec'].some((token) => key.includes(token))) return 'book';
  if (['university', 'college', 'iit', 'ignou'].some((token) => key.includes(token))) return 'campus';
  if (['abroad', 'ielts', 'toefl', 'pte', 'german', 'french', 'jlpt', 'topik', 'hsk'].some((token) => key.includes(token))) return 'globe';
  if (['olympiad', 'cds', 'nda', 'ssb'].some((token) => key.includes(token))) return 'medal';
  if (['upsc', 'bank', 'sbi', 'rbi', 'sebi', 'nabard', 'epfo', 'judiciary'].some((token) => key.includes(token))) return 'institution';
  if (['railway', 'metro', 'rrb'].some((token) => key.includes(token))) return 'rail';
  if (['police', 'shield', 'itbp', 'coast-guard'].some((token) => key.includes(token))) return 'shield';
  if (['isro', 'bel', 'nuclear', 'research', 'bio-research'].some((token) => key.includes(token))) return 'science';
  if (['bhel', 'oil', 'power', 'gear', 'wrench'].some((token) => key.includes(token))) return 'engineering';
  if (['medical', 'neet', 'gpat', 'dental', 'ayush'].some((token) => key.includes(token))) return 'medical';
  if (['design', 'nift', 'architecture', 'ftii', 'journalism', 'hotel', 'merchant-navy'].some((token) => key.includes(token))) return 'creative';
  if (['forest', 'fci', 'postal', 'imd'].some((token) => key.includes(token))) return 'service';
  if (['gate', 'entrance'].some((token) => key.includes(token))) return 'exam';
  return 'exam';
};

const baseDefs = (id, c1, c2, c3) => `
  <defs>
    <linearGradient id="${id}-main" x1="20" y1="14" x2="108" y2="114" gradientUnits="userSpaceOnUse">
      <stop stop-color="${c1}"/>
      <stop offset=".52" stop-color="${c2}"/>
      <stop offset="1" stop-color="${c3}"/>
    </linearGradient>
    <linearGradient id="${id}-warm" x1="24" y1="26" x2="104" y2="104" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fef3c7"/>
      <stop offset=".58" stop-color="#f59e0b"/>
      <stop offset="1" stop-color="#f97316"/>
    </linearGradient>
    <filter id="${id}-shadow" x="-24" y="-20" width="176" height="176" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="9" stdDeviation="8" flood-color="#0f172a" flood-opacity=".24"/>
    </filter>
  </defs>`;

const baseShell = (id) => `
  <ellipse cx="64" cy="104" rx="34" ry="7" fill="#0f172a" opacity=".16"/>
  <path d="M35 109c9 5 49 5 58 0" fill="none" stroke="url(#${id}-main)" stroke-width="5.5" stroke-linecap="round" opacity=".78"/>`;

const miniBars = (id) => `
  <path d="M48 49h28M48 58h24M48 67h18" stroke="#e0f2fe" stroke-width="5" stroke-linecap="round"/>
  <path d="M76 74l8 8 18-25" fill="none" stroke="url(#${id}-main)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;

const symbol = (kind, id, code) => {
  switch (kind) {
    case 'book':
      return `
        <g filter="url(#${id}-shadow)">
          <path d="M31 34c0-5 4-9 9-9h22c7 0 12 4 12 10v59c0 2-2 4-4 4H40c-5 0-9-4-9-9V34z" fill="url(#${id}-main)"/>
          <path d="M74 35c0-6 5-10 11-10h8c5 0 9 4 9 9v60c0 3-3 5-6 3l-11-6-11 6V35z" fill="#f8fafc" opacity=".92"/>
          <path d="M43 46h23M43 57h20M43 68h16" stroke="#f8fafc" stroke-width="5" stroke-linecap="round" opacity=".9"/>
        </g>`;
    case 'briefcase':
      return `
        <g filter="url(#${id}-shadow)">
          <path d="M45 41v-7c0-5 4-9 9-9h20c5 0 9 4 9 9v7" fill="none" stroke="#f8fafc" stroke-width="7" stroke-linecap="round"/>
          <rect x="25" y="40" width="78" height="58" rx="14" fill="url(#${id}-warm)"/>
          <path d="M25 58h78" stroke="#fff7ed" stroke-width="7" opacity=".65"/>
          <path d="M56 68h16v22l-8-4-8 4z" fill="#ef4444"/>
        </g>`;
    case 'campus':
      return `
        <g filter="url(#${id}-shadow)">
          <path d="M64 22l43 21-43 21-43-21 43-21z" fill="url(#${id}-main)"/>
          <path d="M33 57h14v34H33zM57 57h14v34H57zM81 57h14v34H81z" fill="#f8fafc" opacity=".92"/>
          <path d="M26 94h82" stroke="url(#${id}-main)" stroke-width="8" stroke-linecap="round"/>
        </g>`;
    case 'globe':
      return `
        <g filter="url(#${id}-shadow)">
          <circle cx="64" cy="61" r="36" fill="url(#${id}-main)"/>
          <path d="M30 61h68M64 25c11 12 16 24 16 36S75 85 64 97M64 25C53 37 48 49 48 61s5 24 16 36" fill="none" stroke="#f8fafc" stroke-width="5" stroke-linecap="round" opacity=".9"/>
          <path d="M40 38c14 8 34 8 48 0M40 84c14-8 34-8 48 0" fill="none" stroke="#f8fafc" stroke-width="4" stroke-linecap="round" opacity=".75"/>
        </g>`;
    case 'medal':
      return `
        <g filter="url(#${id}-shadow)">
          <path d="M43 23h20l7 25H52L43 23zM85 23H65l-7 25h18l9-25z" fill="url(#${id}-main)"/>
          <circle cx="64" cy="70" r="29" fill="url(#${id}-warm)"/>
          <path d="M64 55l6 12 13 2-10 9 3 13-12-7-12 7 3-13-10-9 13-2 6-12z" fill="#f8fafc"/>
        </g>`;
    case 'institution':
      return `
        <g filter="url(#${id}-shadow)">
          <path d="M64 25l42 20H22l42-20z" fill="url(#${id}-main)"/>
          <path d="M33 51h12v37H33zM55 51h12v37H55zM77 51h12v37H77z" fill="#f8fafc" opacity=".92"/>
          <path d="M25 91h78M20 101h88" stroke="url(#${id}-main)" stroke-width="8" stroke-linecap="round"/>
        </g>`;
    case 'rail':
      return `
        <g filter="url(#${id}-shadow)">
          <rect x="32" y="23" width="64" height="72" rx="16" fill="url(#${id}-main)"/>
          <path d="M45 35h38M45 50h38" stroke="#f8fafc" stroke-width="6" stroke-linecap="round"/>
          <rect x="43" y="61" width="18" height="15" rx="4" fill="#e0f2fe"/>
          <rect x="67" y="61" width="18" height="15" rx="4" fill="#e0f2fe"/>
          <path d="M49 100l-12 13M79 100l12 13" stroke="#f8fafc" stroke-width="5" stroke-linecap="round"/>
        </g>`;
    case 'shield':
      return `
        <g filter="url(#${id}-shadow)">
          <path d="M64 22l34 12v25c0 23-14 38-34 49-20-11-34-26-34-49V34l34-12z" fill="url(#${id}-main)"/>
          <path d="M64 34v62c14-8 24-19 24-35V42L64 34z" fill="#e0f2fe" opacity=".72"/>
          <path d="M48 62l11 11 24-27" fill="none" stroke="#f8fafc" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
    case 'science':
      return `
        <g filter="url(#${id}-shadow)">
          <path d="M54 25h20M60 25v27L35 93c-4 7 1 16 9 16h40c8 0 13-9 9-16L68 52V25" fill="none" stroke="url(#${id}-main)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M43 90h42l-11-19H54L43 90z" fill="url(#${id}-main)" opacity=".82"/>
          <circle cx="54" cy="80" r="4" fill="#f8fafc"/><circle cx="72" cy="85" r="3" fill="#f8fafc"/>
        </g>`;
    case 'engineering':
      return `
        <g filter="url(#${id}-shadow)">
          <circle cx="64" cy="65" r="17" fill="#f8fafc"/>
          <path d="M64 25v16M64 89v16M24 65h16M88 65h16M36 37l11 11M81 81l11 11M92 37L81 48M47 81L36 92" stroke="url(#${id}-main)" stroke-width="9" stroke-linecap="round"/>
          <circle cx="64" cy="65" r="32" fill="none" stroke="url(#${id}-warm)" stroke-width="9" stroke-dasharray="16 10"/>
        </g>`;
    case 'medical':
      return `
        <g filter="url(#${id}-shadow)">
          <rect x="29" y="28" width="70" height="70" rx="20" fill="url(#${id}-main)"/>
          <path d="M58 43h16v16h16v16H74v16H58V75H42V59h16V43z" fill="#f8fafc"/>
        </g>`;
    case 'creative':
      return `
        <g filter="url(#${id}-shadow)">
          <path d="M31 84c8-27 32-50 58-56 4-1 8 3 7 7-6 26-29 50-56 58-6 2-12-3-9-9z" fill="url(#${id}-main)"/>
          <path d="M48 78l17-17M60 89l28-28" stroke="#f8fafc" stroke-width="6" stroke-linecap="round"/>
          <circle cx="86" cy="35" r="7" fill="#f8fafc"/>
        </g>`;
    case 'service':
      return `
        <g filter="url(#${id}-shadow)">
          <rect x="30" y="30" width="68" height="74" rx="16" fill="url(#${id}-main)"/>
          <path d="M45 44h38M45 57h30M45 70h36" stroke="#f8fafc" stroke-width="6" stroke-linecap="round" opacity=".9"/>
          <path d="M64 84l7 8 16-20" fill="none" stroke="#fef3c7" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
    case 'language':
      return `
        <g filter="url(#${id}-shadow)">
          <circle cx="64" cy="62" r="35" fill="url(#${id}-main)"/>
          <path d="M38 52h52M46 40c8 24 21 42 43 53M83 40C75 64 61 82 39 93" fill="none" stroke="#f8fafc" stroke-width="6" stroke-linecap="round" opacity=".88"/>
          <path d="M43 83h39" stroke="#f8fafc" stroke-width="6" stroke-linecap="round" opacity=".78"/>
        </g>`;
    case 'badge':
      return `
        <g filter="url(#${id}-shadow)">
          <path d="M64 20l13 17 21-2-2 21 17 13-19 10-7 20-19-9-19 9-7-20-19-10 17-13-2-21 21 2 13-17z" fill="url(#${id}-main)"/>
          <path d="M48 64l11 11 24-27" fill="none" stroke="#f8fafc" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
    case 'test':
      return `
        <g filter="url(#${id}-shadow)">
          <rect x="31" y="26" width="66" height="82" rx="15" fill="url(#${id}-main)"/>
          <path d="M49 48h30M49 62h30M49 76h22" stroke="#f8fafc" stroke-width="6" stroke-linecap="round"/>
          <path d="M39 48l5 5 9-12M39 76l5 5 9-12" fill="none" stroke="#fef3c7" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
    case 'key':
      return `
        <g filter="url(#${id}-shadow)">
          <circle cx="47" cy="58" r="21" fill="url(#${id}-main)"/>
          <circle cx="47" cy="58" r="8" fill="#f8fafc"/>
          <path d="M64 58h39M89 58v14M76 58v10" stroke="url(#${id}-warm)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
    case 'target':
      return `
        <g filter="url(#${id}-shadow)">
          <circle cx="64" cy="64" r="39" fill="url(#${id}-main)"/>
          <circle cx="64" cy="64" r="25" fill="#f8fafc" opacity=".9"/>
          <circle cx="64" cy="64" r="11" fill="url(#${id}-warm)"/>
          <path d="M76 52l20-20M87 32h9v9" stroke="#f8fafc" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`;
    case 'mic':
      return `
        <g filter="url(#${id}-shadow)">
          <rect x="49" y="22" width="30" height="54" rx="15" fill="url(#${id}-main)"/>
          <path d="M38 61c0 18 11 29 26 29s26-11 26-29M64 90v18M49 108h30" fill="none" stroke="#f8fafc" stroke-width="7" stroke-linecap="round"/>
        </g>`;
    case 'clipboard':
      return `
        <g filter="url(#${id}-shadow)">
          <rect x="31" y="31" width="66" height="76" rx="15" fill="url(#${id}-main)"/>
          <rect x="48" y="22" width="32" height="19" rx="8" fill="#f8fafc"/>
          ${miniBars(id)}
        </g>`;
    case 'news':
      return `
        <g filter="url(#${id}-shadow)">
          <rect x="29" y="29" width="74" height="74" rx="14" fill="url(#${id}-main)"/>
          <rect x="43" y="45" width="28" height="23" rx="5" fill="#f8fafc"/>
          <path d="M78 47h10M78 58h10M43 78h45M43 88h33" stroke="#f8fafc" stroke-width="6" stroke-linecap="round"/>
        </g>`;
    case 'dashboard':
      return `
        <g filter="url(#${id}-shadow)">
          <rect x="28" y="28" width="32" height="32" rx="10" fill="url(#${id}-main)"/>
          <rect x="68" y="28" width="32" height="32" rx="10" fill="url(#${id}-main)" opacity=".82"/>
          <rect x="28" y="68" width="32" height="32" rx="10" fill="url(#${id}-main)" opacity=".74"/>
          <rect x="68" y="68" width="32" height="32" rx="10" fill="url(#${id}-warm)"/>
        </g>`;
    case 'exam':
    default:
      return `
        <g filter="url(#${id}-shadow)">
          <rect x="35" y="24" width="58" height="72" rx="14" fill="url(#${id}-main)"/>
          ${miniBars(id)}
        </g>`;
  }
};

const svgFor = (group, fileName, index) => {
  const key = normalizeKey(fileName);
  const [c1, c2, c3] = palettes[group] || palettes.exams;
  const id = `${group}-${index}`;
  const code = codeFor(key);
  const title = toTitle(key);
  const kind = kindFor(group, key);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="${title} icon">
${baseDefs(id, c1, c2, c3)}
${baseShell(id)}
${symbol(kind, id, code)}
</svg>
`;
};

let updated = 0;

for (const group of groups) {
  const directory = path.join(root, group);
  if (!fs.existsSync(directory)) continue;
  const files = fs.readdirSync(directory).filter((file) => file.endsWith('.svg')).sort();
  files.forEach((fileName, index) => {
    fs.writeFileSync(path.join(directory, fileName), svgFor(group, fileName, index), 'utf8');
    updated += 1;
  });
}

console.log(`Generated ${updated} premium study icons.`);
