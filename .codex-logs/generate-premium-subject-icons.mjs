import fs from 'node:fs';
import path from 'node:path';

const subjectsDir = path.resolve('client/src/assets/media/icons/subjects');

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

const kindFor = (key) => {
  if (/(pyq|paper|papers|question|sample|answer-key|marking)/.test(key)) return 'paper';
  if (/(book|textbook|ncert|chapter|notes|revision|syllabus|literature|english|hindi|sanskrit)/.test(key)) return 'book';
  if (/(upsc|bpsc|uppsc|rpsc|tnpsc|wbpsc|civil|judiciary|law|constitution|polity|governance)/.test(key)) return 'institution';
  if (/(bank|sbi|rbi|commerce|account|economics|economy|business|tax|audit|cost)/.test(key)) return 'finance';
  if (/(gate|jee|engineering|mechanical|electrical|electronics|civil-engineering|computer|coding|programming|dsa|algorithm|database|network|cyber|technology|technical|isro|aerospace)/.test(key)) return 'engineering';
  if (/(neet|medical|biology|botany|zoology|anatomy|physiology|surgery|pharmacy|dental|nursing|veterinary|biotech|biochemistry)/.test(key)) return 'medical';
  if (/(science|physics|chemistry|lab|practical|research|csir|data-science|ai|artificial-intelligence|statistics|math|aptitude|reasoning)/.test(key)) return 'science';
  if (/(school|board|cbse|icse|class|primary|middle|senior|education|teacher|ctet|tet)/.test(key)) return 'book';
  if (/(railway|rrb|alp|metro|transport)/.test(key)) return 'rail';
  if (/(nda|cds|afcat|defence|police|capf|security|shield|ssb)/.test(key)) return 'shield';
  if (/(university|college|cuet|ugc|net|ignou|iit|iim|nlu|campus)/.test(key)) return 'campus';
  if (/(language|ielts|toefl|gre|pte|abroad|international|german|french|jlpt|topik|hsk)/.test(key)) return 'globe';
  if (/(placement|career|project|portfolio|resume|hr|interview|company|entrepreneurship)/.test(key)) return 'briefcase';
  if (/(art|design|architecture|music|dance|fashion|film|journalism|media|creative)/.test(key)) return 'creative';
  if (/(geography|map|environment|ecology|forest|agriculture|history|culture|society|sociology|psychology)/.test(key)) return 'map';
  if (/(download|material|folder|resource|worksheet|assignment|case-study)/.test(key)) return 'folder';
  return 'paper';
};

const paletteFor = (kind) => {
  const palettes = {
    paper: ['#818cf8', '#22d3ee', '#14b8a6'],
    book: ['#38bdf8', '#22c55e', '#0ea5e9'],
    institution: ['#60a5fa', '#8b5cf6', '#14b8a6'],
    finance: ['#34d399', '#06b6d4', '#f59e0b'],
    engineering: ['#38bdf8', '#6366f1', '#f97316'],
    medical: ['#34d399', '#22d3ee', '#f43f5e'],
    science: ['#22d3ee', '#8b5cf6', '#f59e0b'],
    rail: ['#f59e0b', '#22d3ee', '#64748b'],
    shield: ['#60a5fa', '#8b5cf6', '#22c55e'],
    campus: ['#38bdf8', '#6366f1', '#22c55e'],
    globe: ['#f472b6', '#38bdf8', '#a78bfa'],
    briefcase: ['#f59e0b', '#fb7185', '#22d3ee'],
    creative: ['#f472b6', '#8b5cf6', '#f59e0b'],
    map: ['#22c55e', '#38bdf8', '#f59e0b'],
    folder: ['#facc15', '#f97316', '#38bdf8'],
  };
  return palettes[kind] || palettes.paper;
};

const defs = (id, c1, c2, c3) => `
  <defs>
    <linearGradient id="${id}-main" x1="19" y1="14" x2="109" y2="112" gradientUnits="userSpaceOnUse">
      <stop stop-color="${c1}"/>
      <stop offset=".55" stop-color="${c2}"/>
      <stop offset="1" stop-color="${c3}"/>
    </linearGradient>
    <linearGradient id="${id}-warm" x1="24" y1="23" x2="102" y2="105" gradientUnits="userSpaceOnUse">
      <stop stop-color="#fff7ed"/>
      <stop offset=".55" stop-color="#facc15"/>
      <stop offset="1" stop-color="#f97316"/>
    </linearGradient>
    <filter id="${id}-shadow" x="-28" y="-24" width="184" height="184" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="12" stdDeviation="9" flood-color="#020617" flood-opacity=".26"/>
    </filter>
  </defs>`;

const base = (id) => `
  <ellipse cx="64" cy="105" rx="38" ry="8" fill="#020617" opacity=".16"/>
  <path d="M31 108c16 8 50 8 66 0" fill="none" stroke="url(#${id}-main)" stroke-width="5.5" stroke-linecap="round" opacity=".78"/>`;

const symbol = (kind, id) => {
  switch (kind) {
    case 'book':
      return `<g filter="url(#${id}-shadow)"><path d="M30 30c0-6 5-11 11-11h26c8 0 14 6 14 14v67c0 3-2 5-5 5H41c-6 0-11-5-11-11V30z" fill="url(#${id}-main)"/><path d="M80 32c0-7 6-13 13-13h10c6 0 11 5 11 11v69c0 4-4 6-7 4l-14-7-13 7V32z" fill="#f8fafc" opacity=".94"/><path d="M44 48h28M44 60h24M44 72h19" stroke="#f8fafc" stroke-width="6" stroke-linecap="round"/></g>`;
    case 'institution':
      return `<g filter="url(#${id}-shadow)"><path d="M64 17l48 25H16l48-25z" fill="url(#${id}-main)"/><path d="M28 51h14v39H28zM57 51h14v39H57zM86 51h14v39H86z" fill="#f8fafc" opacity=".94"/><path d="M23 95h90M18 107h100" stroke="url(#${id}-main)" stroke-width="9" stroke-linecap="round"/></g>`;
    case 'finance':
      return `<g filter="url(#${id}-shadow)"><circle cx="64" cy="62" r="41" fill="url(#${id}-main)"/><path d="M64 34v58M47 48c3-9 31-10 35 1 4 12-18 11-29 15-13 5-9 21 1 24 11 4 29 1 33-10" fill="none" stroke="#f8fafc" stroke-width="8" stroke-linecap="round"/></g>`;
    case 'engineering':
      return `<g filter="url(#${id}-shadow)"><circle cx="64" cy="64" r="18" fill="#f8fafc"/><path d="M64 18v18M64 92v18M18 64h18M92 64h18M33 33l13 13M82 82l13 13M95 33L82 46M46 82L33 95" stroke="url(#${id}-main)" stroke-width="10" stroke-linecap="round"/><circle cx="64" cy="64" r="35" fill="none" stroke="url(#${id}-warm)" stroke-width="10" stroke-dasharray="17 10"/></g>`;
    case 'medical':
      return `<g filter="url(#${id}-shadow)"><rect x="26" y="24" width="76" height="76" rx="22" fill="url(#${id}-main)"/><path d="M57 40h18v18h18v18H75v18H57V76H39V58h18V40z" fill="#f8fafc"/></g>`;
    case 'science':
      return `<g filter="url(#${id}-shadow)"><path d="M53 19h22M60 19v31L32 96c-5 8 1 18 10 18h42c9 0 15-10 10-18L68 50V19" fill="none" stroke="url(#${id}-main)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M42 93h45L76 73H54L42 93z" fill="url(#${id}-main)" opacity=".86"/><circle cx="55" cy="83" r="4.5" fill="#f8fafc"/><circle cx="74" cy="87" r="3.5" fill="#f8fafc"/></g>`;
    case 'rail':
      return `<g filter="url(#${id}-shadow)"><rect x="29" y="19" width="70" height="78" rx="18" fill="url(#${id}-main)"/><path d="M43 36h42M43 51h42" stroke="#f8fafc" stroke-width="7" stroke-linecap="round"/><rect x="42" y="64" width="19" height="16" rx="4" fill="#e0f2fe"/><rect x="68" y="64" width="19" height="16" rx="4" fill="#e0f2fe"/><path d="M49 103l-13 14M80 103l13 14" stroke="#f8fafc" stroke-width="6" stroke-linecap="round"/></g>`;
    case 'shield':
      return `<g filter="url(#${id}-shadow)"><path d="M64 16l39 14v29c0 27-16 45-39 57-23-12-39-30-39-57V30l39-14z" fill="url(#${id}-main)"/><path d="M64 29v72c16-10 27-23 27-41V39L64 29z" fill="#dbeafe" opacity=".66"/><path d="M44 63l14 14 29-33" fill="none" stroke="#f8fafc" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    case 'campus':
      return `<g filter="url(#${id}-shadow)"><path d="M64 18l48 23-48 23-48-23 48-23z" fill="url(#${id}-main)"/><path d="M31 59h16v37H31zM56 59h16v37H56zM81 59h16v37H81z" fill="#f8fafc" opacity=".94"/><path d="M24 101h88" stroke="url(#${id}-main)" stroke-width="9" stroke-linecap="round"/></g>`;
    case 'globe':
      return `<g filter="url(#${id}-shadow)"><circle cx="64" cy="61" r="40" fill="url(#${id}-main)"/><path d="M25 61h78M64 21c13 14 19 27 19 40s-6 27-19 40M64 21C51 35 45 48 45 61s6 27 19 40" fill="none" stroke="#f8fafc" stroke-width="6" stroke-linecap="round" opacity=".9"/><path d="M39 36c16 8 34 8 50 0M39 87c16-8 34-8 50 0" fill="none" stroke="#f8fafc" stroke-width="5" stroke-linecap="round" opacity=".72"/></g>`;
    case 'briefcase':
      return `<g filter="url(#${id}-shadow)"><path d="M44 39v-8c0-6 5-10 11-10h20c6 0 11 4 11 10v8" fill="none" stroke="#f8fafc" stroke-width="8" stroke-linecap="round"/><rect x="22" y="39" width="86" height="63" rx="16" fill="url(#${id}-warm)"/><path d="M22 59h86" stroke="#fff7ed" stroke-width="8" opacity=".65"/><path d="M56 69h17v24l-9-5-8 5z" fill="#ef4444"/></g>`;
    case 'creative':
      return `<g filter="url(#${id}-shadow)"><path d="M29 88c9-32 37-59 67-66 5-1 10 4 9 9-7 30-34 58-66 67-7 2-13-3-10-10z" fill="url(#${id}-main)"/><path d="M47 81l20-20M61 94l33-33" stroke="#f8fafc" stroke-width="7" stroke-linecap="round"/><circle cx="93" cy="31" r="8" fill="#f8fafc"/></g>`;
    case 'map':
      return `<g filter="url(#${id}-shadow)"><path d="M23 32l29-12 28 12 25-10v74l-25 10-28-12-29 12V32z" fill="url(#${id}-main)"/><path d="M52 20v74M80 32v74" stroke="#f8fafc" stroke-width="6" opacity=".74"/><path d="M42 66c10-20 31-21 44-4" fill="none" stroke="#fef3c7" stroke-width="7" stroke-linecap="round"/></g>`;
    case 'folder':
      return `<g filter="url(#${id}-shadow)"><path d="M23 38c0-8 6-14 14-14h24l9 12h31c8 0 14 6 14 14v47c0 8-6 14-14 14H37c-8 0-14-6-14-14V38z" fill="url(#${id}-warm)"/><path d="M23 55h92" stroke="#fff7ed" stroke-width="8" opacity=".72"/><path d="M57 72h17v25l-9-5-8 5z" fill="#ef4444"/></g>`;
    case 'paper':
    default:
      return `<g filter="url(#${id}-shadow)"><rect x="33" y="19" width="63" height="82" rx="15" fill="url(#${id}-main)"/><path d="M49 43h31M49 56h28M49 69h21" stroke="#f8fafc" stroke-width="7" stroke-linecap="round"/><path d="m55 84 10 10 23-29" fill="none" stroke="#fef3c7" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
};

const svgFor = (fileName, index) => {
  const key = normalizeKey(fileName);
  const kind = kindFor(key);
  const [c1, c2, c3] = paletteFor(kind);
  const id = `subject-${index}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="${toTitle(key)} icon">
${defs(id, c1, c2, c3)}
${base(id)}
${symbol(kind, id)}
</svg>
`;
};

let updated = 0;
if (fs.existsSync(subjectsDir)) {
  const files = fs.readdirSync(subjectsDir).filter((file) => file.endsWith('.svg')).sort();
  files.forEach((fileName, index) => {
    fs.writeFileSync(path.join(subjectsDir, fileName), svgFor(fileName, index), 'utf8');
    updated += 1;
  });
}

console.log(`Generated ${updated} premium subject icons.`);
