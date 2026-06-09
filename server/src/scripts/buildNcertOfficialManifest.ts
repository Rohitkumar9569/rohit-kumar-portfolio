import axios from 'axios';
import { spawn } from 'node:child_process';
import fs from 'fs/promises';
import path from 'path';

const SCRIPT_DIR = path.resolve(__dirname);
const DEFAULT_OUTPUT_PATH = path.join(SCRIPT_DIR, 'ncert-official.generated.json');
const LOCAL_TEXTBOOK_PAGE_PATH = path.resolve(SCRIPT_DIR, '../../page.html');
const NCERT_PDF_BASE_URL = 'https://www.ncert.nic.in/textbook/pdf';
const NCERT_SOURCE_URL = 'https://www.ncert.nic.in/textbook.php';

type ManifestEntry = {
  title: string;
  url: string;
  targetPath: string[];
  sourceName: string;
  sourceUrl: string;
  sourceType: 'ncert';
  resourceType: string;
  mirrorAllowed: boolean;
  rightsNote: string;
  language: 'english';
  year: number;
  subject: string;
  paper: string;
  mimeType: string;
  sizeBytes?: number;
};

type NcertBookSeed = {
  classNumber: number;
  subject: string;
  title: string;
  code: string;
};

const fallbackBookSeeds: NcertBookSeed[] = [
  { classNumber: 9, subject: 'English', title: 'Beehive', code: 'iebe1' },
  { classNumber: 9, subject: 'English', title: 'Moments', code: 'iemo1' },
  { classNumber: 9, subject: 'Mathematics', title: 'Mathematics', code: 'iemh1' },
  { classNumber: 9, subject: 'Science', title: 'Science', code: 'iesc1' },
  { classNumber: 9, subject: 'Social Science', title: 'Contemporary India I', code: 'iess1' },
  { classNumber: 9, subject: 'Social Science', title: 'Economics', code: 'iess2' },
  { classNumber: 9, subject: 'Social Science', title: 'India And The Contemporary World I', code: 'iess3' },
  { classNumber: 9, subject: 'Social Science', title: 'Democratic Politics I', code: 'iess4' },

  { classNumber: 10, subject: 'English', title: 'First Flight', code: 'jeff1' },
  { classNumber: 10, subject: 'English', title: 'Footprints Without Feet', code: 'jefp1' },
  { classNumber: 10, subject: 'Mathematics', title: 'Mathematics', code: 'jemh1' },
  { classNumber: 10, subject: 'Science', title: 'Science', code: 'jesc1' },
  { classNumber: 10, subject: 'Social Science', title: 'Contemporary India II', code: 'jess1' },
  { classNumber: 10, subject: 'Social Science', title: 'Understanding Economic Development', code: 'jess2' },
  { classNumber: 10, subject: 'Social Science', title: 'India And The Contemporary World II', code: 'jess3' },
  { classNumber: 10, subject: 'Social Science', title: 'Democratic Politics II', code: 'jess4' },

  { classNumber: 11, subject: 'Physics', title: 'Physics Part I', code: 'keph1' },
  { classNumber: 11, subject: 'Physics', title: 'Physics Part II', code: 'keph2' },
  { classNumber: 11, subject: 'Chemistry', title: 'Chemistry Part I', code: 'kech1' },
  { classNumber: 11, subject: 'Chemistry', title: 'Chemistry Part II', code: 'kech2' },
  { classNumber: 11, subject: 'Mathematics', title: 'Mathematics', code: 'kemh1' },
  { classNumber: 11, subject: 'Biology', title: 'Biology', code: 'kebo1' },
  { classNumber: 11, subject: 'Business Studies', title: 'Business Studies', code: 'kebs1' },
  { classNumber: 11, subject: 'Accountancy', title: 'Financial Accounting Part I', code: 'keac1' },
  { classNumber: 11, subject: 'Accountancy', title: 'Financial Accounting Part II', code: 'keac2' },

  { classNumber: 12, subject: 'Physics', title: 'Physics Part I', code: 'leph1' },
  { classNumber: 12, subject: 'Physics', title: 'Physics Part II', code: 'leph2' },
  { classNumber: 12, subject: 'Chemistry', title: 'Chemistry Part I', code: 'lech1' },
  { classNumber: 12, subject: 'Chemistry', title: 'Chemistry Part II', code: 'lech2' },
  { classNumber: 12, subject: 'Mathematics', title: 'Mathematics Part I', code: 'lemh1' },
  { classNumber: 12, subject: 'Mathematics', title: 'Mathematics Part II', code: 'lemh2' },
  { classNumber: 12, subject: 'Biology', title: 'Biology', code: 'lebo1' },
  { classNumber: 12, subject: 'Business Studies', title: 'Business Studies Part I', code: 'lebs1' },
  { classNumber: 12, subject: 'Business Studies', title: 'Business Studies Part II', code: 'lebs2' },
  { classNumber: 12, subject: 'Accountancy', title: 'Accountancy Part I', code: 'leac1' },
  { classNumber: 12, subject: 'Accountancy', title: 'Accountancy Part II', code: 'leac2' },
];

const parseArgs = () => {
  const outputArg = process.argv.slice(2).find((arg) => arg.startsWith('--output='));
  return {
    outputPath: outputArg ? path.resolve(outputArg.split('=').slice(1).join('=')) : DEFAULT_OUTPUT_PATH,
  };
};

const sleep = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const cleanBookTitle = (value: string) => normalizeWhitespace(value)
  .replace(/\bFoot Prints\b/gi, 'Footprints')
  .replace(/\bWithout feet\b/gi, 'Without Feet')
  .replace(/\bSupp\. Reader\b/gi, 'Supplementary Reader')
  .replace(/\bPratical\b/gi, 'Practical')
  .replace(/\bKaliedoscope\b/gi, 'Kaleidoscope')
  .replace(/\bWonderous\b/gi, 'Wondrous')
  .replace(/\bPart-I\b/g, 'Part I')
  .replace(/\bPart-II\b/g, 'Part II')
  .replace(/\b- I\b/g, ' I')
  .replace(/\b- II\b/g, ' II')
  .replace(/\b([A-Za-z]+)-I\b/g, '$1 Part I')
  .replace(/\b([A-Za-z]+)-II\b/g, '$1 Part II')
  .replace(/\s{2,}/g, ' ')
  .trim();

const isEnglishBookCode = (code: string) => /^[a-z0-9]+$/i.test(code) && code.length >= 5 && code[1]?.toLowerCase() === 'e';

const extractBookSeedsFromTextbookPage = (html: string): NcertBookSeed[] => {
  const seeds: NcertBookSeed[] = [];
  const titlesByOption = new Map<string, string>();
  const seenCodes = new Set<string>();
  let classNumber = 0;
  let subject = '';
  let insideBlockComment = false;

  for (const rawLine of html.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.includes('/*')) insideBlockComment = true;
    if (insideBlockComment) {
      if (line.includes('*/')) insideBlockComment = false;
      continue;
    }
    if (!line || line.startsWith('//')) continue;

    const contextMatch = line.match(/\(\(document\.test\.tclass\.value==(\d+)\)\s*&&\s*\(document\.test\.tsubject\.options\[sind\]\.text=="([^"]+)"\)\)/);
    if (contextMatch) {
      classNumber = Number(contextMatch[1]);
      subject = normalizeWhitespace(contextMatch[2]);
      titlesByOption.clear();
      continue;
    }

    const titleMatch = line.match(/document\.test\.tbook\.options\[(\d+)\]\.text\s*=\s*"([^"]*)"/);
    if (titleMatch) {
      const title = normalizeWhitespace(titleMatch[2]);
      if (title && !title.toLowerCase().includes('select book')) {
        titlesByOption.set(titleMatch[1], title);
      }
      continue;
    }

    const valueMatch = line.match(/document\.test\.tbook\.options\[(\d+)\]\.value\s*=\s*"textbook\.php\?([a-z0-9]+)=/i);
    if (!valueMatch || !classNumber || !subject) continue;

    const code = valueMatch[2].toLowerCase();
    const title = titlesByOption.get(valueMatch[1]);
    if (!title || !isEnglishBookCode(code) || seenCodes.has(code)) continue;

    seenCodes.add(code);
    seeds.push({
      classNumber,
      subject,
      title: cleanBookTitle(title),
      code,
    });
  }

  return seeds.sort((a, b) => (
    a.classNumber - b.classNumber ||
    a.subject.localeCompare(b.subject) ||
    a.title.localeCompare(b.title)
  ));
};

const fetchOfficialBookSeeds = async () => {
  try {
    const response = await axios.get(NCERT_SOURCE_URL, {
      headers: {
        'User-Agent': 'StudyHubNcertManifestBuilder/1.0',
      },
      timeout: 45000,
      validateStatus: () => true,
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`NCERT textbook page returned ${response.status}`);
    }
    const seeds = extractBookSeedsFromTextbookPage(String(response.data || ''));
    if (!seeds.length) throw new Error('No English book codes found on NCERT textbook page');
    return seeds;
  } catch (error) {
    console.warn(`NCERT page fetch failed: ${error instanceof Error ? error.message : error}`);
    try {
      const localHtml = await fs.readFile(LOCAL_TEXTBOOK_PAGE_PATH, 'utf-8');
      const seeds = extractBookSeedsFromTextbookPage(localHtml);
      if (seeds.length) {
        console.warn(`Using local official NCERT page cache with ${seeds.length} English book code(s).`);
        return seeds;
      }
    } catch (localError) {
      console.warn(`Local NCERT page cache unavailable: ${localError instanceof Error ? localError.message : localError}`);
    }
    console.warn('Using curated NCERT fallback list.');
    return fallbackBookSeeds;
  }
};

type OfficialFileProbe = {
  available: boolean;
  sizeBytes?: number;
};

const curlBinary = process.platform === 'win32' ? 'curl.exe' : 'curl';

const probeWithCurl = (url: string, expectedContentType: string) =>
  new Promise<OfficialFileProbe>((resolve) => {
    const child = spawn(
      curlBinary,
      [
        '--location',
        '--silent',
        '--show-error',
        '--range',
        '0-0',
        '--head',
        '--max-time',
        '30',
        '--user-agent',
        'StudyHubNcertManifestBuilder/1.0',
        url,
      ],
      { windowsHide: true }
    );
    let stdout = '';

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.on('error', () => resolve({ available: false }));
    child.on('close', (code) => {
      if (code !== 0) {
        resolve({ available: false });
        return;
      }

      const blocks = stdout.split(/\r?\n\r?\n/).map((block) => block.trim()).filter(Boolean);
      const lines = (blocks[blocks.length - 1] || '').split(/\r?\n/);
      const status = Number(lines[0]?.match(/HTTP\/\S+\s+(\d{3})/)?.[1] || 0);
      const headers = new Map<string, string>();
      lines.slice(1).forEach((line) => {
        const separatorIndex = line.indexOf(':');
        if (separatorIndex <= 0) return;
        headers.set(line.slice(0, separatorIndex).trim().toLowerCase(), line.slice(separatorIndex + 1).trim());
      });

      const contentType = (headers.get('content-type') || '').toLowerCase();
      const contentRange = headers.get('content-range') || '';
      const rangeSize = Number(contentRange.match(/\/(\d+)$/)?.[1]);
      const contentLength = Number(headers.get('content-length'));
      resolve({
        available: [200, 206].includes(status) && contentType.includes(expectedContentType),
        sizeBytes: Number.isFinite(rangeSize) ? rangeSize : Number.isFinite(contentLength) ? contentLength : undefined,
      });
    });
  });

const probeOfficialFile = async (url: string, expectedContentType: string): Promise<OfficialFileProbe> => {
  try {
    const response = await axios.get(url, {
      headers: {
        Range: 'bytes=0-0',
        'User-Agent': 'StudyHubNcertManifestBuilder/1.0',
      },
      responseType: 'stream',
      timeout: 30000,
      validateStatus: () => true,
    });

    if (typeof response.data?.destroy === 'function') response.data.destroy();
    const contentType = String(response.headers['content-type'] || '').toLowerCase();
    const contentRange = String(response.headers['content-range'] || '');
    const rangeSize = Number(contentRange.match(/\/(\d+)$/)?.[1]);
    const contentLength = Number(response.headers['content-length']);
    return {
      available: [200, 206].includes(response.status) && contentType.includes(expectedContentType),
      sizeBytes: Number.isFinite(rangeSize) ? rangeSize : Number.isFinite(contentLength) ? contentLength : undefined,
    };
  } catch {
    return probeWithCurl(url, expectedContentType);
  }
};

const completeBookArchiveUrl = (bookCode: string) => `${NCERT_PDF_BASE_URL}/${bookCode}dd.zip`;

const buildBookEntry = (book: NcertBookSeed, sizeBytes?: number): ManifestEntry => ({
  title: `NCERT Class ${book.classNumber} ${cleanBookTitle(book.title)} Complete Book`,
  url: completeBookArchiveUrl(book.code),
    targetPath: ['School Boards', 'CBSE', 'NCERT Books', `Class ${book.classNumber}`, book.subject],
  sourceName: 'NCERT',
  sourceUrl: NCERT_SOURCE_URL,
  sourceType: 'ncert',
  resourceType: 'book',
  mirrorAllowed: false,
  rightsNote: 'Official NCERT complete-book ZIP package. Keep original source attribution; admin can mirror selected books to Cloudinary for private study access.',
  language: 'english',
  year: 2026,
  subject: book.subject,
  paper: book.title,
  mimeType: 'application/zip',
  sizeBytes,
});

const run = async () => {
  const { outputPath } = parseArgs();
  const allEntries: ManifestEntry[] = [];
  const bookSeeds = await fetchOfficialBookSeeds();
  console.log(`Discovered ${bookSeeds.length} English NCERT book code(s).`);

  for (const book of bookSeeds) {
    console.log(`Scanning NCERT Class ${book.classNumber} ${book.title} (${book.code})`);
    const probe = await probeOfficialFile(completeBookArchiveUrl(book.code), 'application/zip');
    await sleep(120);
    if (!probe.available) {
      console.log('  complete book ZIP not available, skipped.');
      continue;
    }
    allEntries.push(buildBookEntry(book, probe.sizeBytes));
    console.log('  1 complete book package kept.');
  }

  allEntries.sort((a, b) => a.targetPath.join('/').localeCompare(b.targetPath.join('/')) || a.title.localeCompare(b.title));
  await fs.writeFile(outputPath, `${JSON.stringify(allEntries, null, 2)}\n`, 'utf-8');

  console.log(`Manifest written: ${outputPath}`);
  console.log(`Entries: ${allEntries.length}`);
};

run().catch((error) => {
  console.error('NCERT manifest build failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
