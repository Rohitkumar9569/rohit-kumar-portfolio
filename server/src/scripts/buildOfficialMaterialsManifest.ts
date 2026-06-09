import axios from 'axios';
import * as cheerio from 'cheerio';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import https from 'https';
import path from 'path';
import { gateTestPapers, getGatePaperBranchName } from './studyHubEntranceSpecs';

const SCRIPT_DIR = path.resolve(__dirname);
const DEFAULT_CONFIG_PATH = path.join(SCRIPT_DIR, 'official-source-config.json');
const EXAMPLE_CONFIG_PATH = path.join(SCRIPT_DIR, 'official-source-config.example.json');
const DEFAULT_OUTPUT_PATH = path.join(SCRIPT_DIR, 'official-materials.generated.json');

type SourceType = 'official' | 'ncert';

type SourceConfig = {
  id: string;
  enabled?: boolean;
  parser?: 'generic' | 'upsc-pyq' | 'upsc-syllabus' | 'state-pyq';
  sourceName: string;
  sourceUrl: string;
  pageUrl: string;
  pageUrls?: string[];
  sourceType?: SourceType;
  targetBasePath: string[];
  targetSection?: string;
  resourceType?: string;
  year?: number;
  language?: 'english' | 'hindi' | 'hinglish' | 'mixed';
  includeAny?: string[];
  excludeAny?: string[];
  titlePrefix?: string;
  rightsNote?: string;
  mirrorAllowed?: boolean;
  fetchOptions?: {
    rejectUnauthorized?: boolean;
    timeoutMs?: number;
  };
  formField?: string;
  formOptionIncludeAny?: string[];
  formOptionExcludeAny?: string[];
  formOptionLimit?: number;
  formFetchMode?: 'axios' | 'curl';
};

type ManifestEntry = {
  title: string;
  url: string;
  targetPath: string[];
  sourceName: string;
  sourceUrl: string;
  sourceType: SourceType;
  resourceType: string;
  mirrorAllowed: boolean;
  rightsNote: string;
  language: 'english' | 'hindi' | 'hinglish' | 'mixed';
  year?: number;
  subject?: string;
  paper?: string;
  stage?: string;
  topic?: string;
};

const officialHostAllowList = [
  'apsc.nic.in',
  'aicte.gov.in',
  'amu.ac.in',
  'api.amu.ac.in',
  'annauniv.edu',
  'bpsc.bih.nic.in',
  'bhu.ac.in',
  'cac.annauniv.edu',
  'cbseacademic.nic.in',
  'cgpsc.gov.in',
  'du.ac.in',
  'ebooks.inflibnet.ac.in',
  'egyankosh.ac.in',
  'epgp.inflibnet.ac.in',
  'gate2024.iisc.ac.in',
  'gate2025.iitr.ac.in',
  'gate2026.iitg.ac.in',
  'gkv.ac.in',
  'goapsc.gov.in',
  'gpsc.gujarat.gov.in',
  'gtu.ac.in',
  'hppsc.hp.gov.in',
  'hpsc.gov.in',
  'ignou.ac.in',
  'ipu.ac.in',
  'jeemain.nta.nic.in',
  'jmi.ac.in',
  'jkpsc.nic.in',
  'jnu.ac.in',
  'jpsc.gov.in',
  'keralapsc.gov.in',
  'kgcd.gkv.ac.in',
  'kpsc.kar.nic.in',
  'kpsc.karnataka.gov.in',
  'mppsc.mp.gov.in',
  'mpsc.gov.in',
  'mpsc.mizoram.gov.in',
  'mpscmanipur.gov.in',
  'makautexam.net',
  'makautwb.ac.in',
  'mu.ac.in',
  'nptel.ac.in',
  'ncert.nic.in',
  'neet.nta.nic.in',
  'npsc.nagaland.gov.in',
  'nta.ac.in',
  'opsc.gov.in',
  'old.mu.ac.in',
  'old22.gtu.ac.in',
  'ppsc.gov.in',
  'psc.ap.gov.in',
  'psc.cg.gov.in',
  'psc.uk.gov.in',
  'psc.wb.gov.in',
  'rpsc.rajasthan.gov.in',
  'spsc.sikkim.gov.in',
  'ssc.gov.in',
  'swayam.gov.in',
  'tnpsc.gov.in',
  'tpsc.tripura.gov.in',
  'tspsc.gov.in',
  'uppsc.up.nic.in',
  'upsc.gov.in',
  'vtu.ac.in',
  'websitenew.tspsc.gov.in',
  'webservices.ignou.ac.in',
  'wbpsc.gov.in',
];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const getValue = (name: string, fallback: string) => {
    const arg = args.find((item) => item.startsWith(`${name}=`));
    return arg ? path.resolve(arg.split('=').slice(1).join('=')) : fallback;
  };

  return {
    configPath: getValue('--config', DEFAULT_CONFIG_PATH),
    outputPath: getValue('--output', DEFAULT_OUTPUT_PATH),
  };
};

const readConfig = async (configPath: string): Promise<SourceConfig[]> => {
  const resolvedPath = await fs.access(configPath)
    .then(() => configPath)
    .catch(() => EXAMPLE_CONFIG_PATH);
  const parsed = JSON.parse(await fs.readFile(resolvedPath, 'utf-8'));
  if (!Array.isArray(parsed)) throw new Error('Official source config must be a JSON array.');
  return parsed as SourceConfig[];
};

const isAllowedOfficialUrl = (value: string) => {
  try {
    const url = new URL(value);
    return officialHostAllowList.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
};

const absoluteUrl = (href: string, pageUrl: string) => {
  try {
    return new URL(href, pageUrl).toString();
  } catch {
    return '';
  }
};

const getAxiosOptions = (source: SourceConfig, extraHeaders: Record<string, string> = {}) => ({
  timeout: source.fetchOptions?.timeoutMs || 60000,
  headers: {
    'User-Agent': 'StudyHubOfficialManifestBuilder/1.0',
    ...extraHeaders,
  },
  ...(source.fetchOptions?.rejectUnauthorized === false
    ? { httpsAgent: new https.Agent({ rejectUnauthorized: false }) }
    : {}),
});

const curlBinary = process.platform === 'win32' ? 'curl.exe' : 'curl';

const fetchFormHtmlWithCurl = (url: string, body: string, source: SourceConfig) =>
  new Promise<string>((resolve, reject) => {
    const args = [
      '--location',
      '--silent',
      '--show-error',
      '--max-time',
      String(Math.ceil((source.fetchOptions?.timeoutMs || 60000) / 1000)),
      '--header',
      'Content-Type: application/x-www-form-urlencoded',
      '--header',
      `Referer: ${url}`,
      '--user-agent',
      'StudyHubOfficialManifestBuilder/1.0',
      '--data',
      body,
    ];

    if (source.fetchOptions?.rejectUnauthorized === false) args.unshift('--insecure');
    args.push(url);

    const child = spawn(curlBinary, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error(stderr.trim() || `curl exited with code ${code}`));
    });
  });

const fetchFormHtml = async (source: SourceConfig, pageUrl: string, form: URLSearchParams) => {
  const body = form.toString();
  if (source.formFetchMode === 'curl') {
    return fetchFormHtmlWithCurl(pageUrl, body, source);
  }

  try {
    const response = await axios.post(pageUrl, body, getAxiosOptions(source, {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: pageUrl,
    }));
    return String(response.data);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      return fetchFormHtmlWithCurl(pageUrl, body, source);
    }
    throw error;
  }
};

const cleanText = (value: string) => value
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim();

const removeSizeText = (value: string) => value
  .replace(/\s*\((?:\d+(?:\.\d+)?\s*)?(?:KB|MB|GB)\)\s*$/i, '')
  .replace(/\s+/g, ' ')
  .trim();

const titleCase = (value: string) => value
  .toLowerCase()
  .replace(/\b([a-z])/g, (match) => match.toUpperCase())
  .replace(/\b(?:And|Of|The|In|For)\b/g, (match) => match.toLowerCase())
  .replace(/\b(?:UPSC|CSE|IFoS|NDA|CDS|CAPF|AC|IES|ISS|CMS|CISF|LDCE|CBI|DSP|GS|CSAT|GAT|I|II|III|IV)\b/gi, (match) => match.toUpperCase())
  .replace(/\bIFOS\b/g, 'IFoS');

const normalizeRoman = (value: string) => {
  const normalized = value.trim().toUpperCase();
  const numericMap: Record<string, string> = {
    '1': 'I',
    '2': 'II',
    '3': 'III',
    '4': 'IV',
  };
  return numericMap[normalized] || normalized;
};

const inferYear = (value: string, fallback?: number) => {
  const matches = [...value.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map((match) => Number(match[1]));
  return matches.length ? Math.max(...matches) : fallback;
};

const humanizeToken = (value: string) => value
  .replace(/\.[a-z0-9]+$/i, '')
  .replace(/[_-]+/g, ' ')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/\bpolsci\b/gi, 'Political Science')
  .replace(/\bphyscal\b/gi, 'Physical')
  .replace(/\bmathsbasic\b/gi, 'Mathematics Basic')
  .replace(/\bmathsstandard\b/gi, 'Mathematics Standard')
  .replace(/\bappliedmaths\b/gi, 'Applied Mathematics')
  .replace(/\bcomputerscience\b/gi, 'Computer Science')
  .replace(/\binformaticspractices\b/gi, 'Informatics Practices')
  .replace(/\bphysicaleducation\b/gi, 'Physical Education')
  .replace(/\bpoliticalscience\b/gi, 'Political Science')
  .replace(/\bhomescience\b/gi, 'Home Science')
  .replace(/\bsocialscience\b/gi, 'Social Science')
  .replace(/\benglishl\b/gi, 'English Language And Literature')
  .replace(/\benglishcomm\b/gi, 'English Communicative')
  .replace(/\benglish l\b/gi, 'English Language And Literature')
  .replace(/\benglish comm\b/gi, 'English Communicative')
  .replace(/\bhindicoursea\b/gi, 'Hindi Course A')
  .replace(/\bhindicourseb\b/gi, 'Hindi Course B')
  .replace(/\bhindicore\b/gi, 'Hindi Core')
  .replace(/\bhindielective\b/gi, 'Hindi Elective')
  .replace(/\baccountancy\b/gi, 'Accountancy')
  .replace(/\bphysics\b/gi, 'Physics')
  .replace(/\bchemistry\b/gi, 'Chemistry')
  .replace(/\bbiology\b/gi, 'Biology')
  .replace(/\beconomics\b/gi, 'Economics')
  .replace(/\bhistory\b/gi, 'History')
  .replace(/\bgeography\b/gi, 'Geography')
  .replace(/\bsociology\b/gi, 'Sociology')
  .replace(/\bpsychology\b/gi, 'Psychology')
  .replace(/\bbiotechnology\b/gi, 'Biotechnology')
  .replace(/\bmaths\b/gi, 'Mathematics')
  .replace(/\bpol sci\b/gi, 'Political Science')
  .replace(/\btelgu\b/gi, 'Telugu')
  .replace(/\btelengana\b/gi, 'Telangana')
  .replace(/\btelugu ap\b/gi, 'Telugu Andhra Pradesh')
  .replace(/\btelugu tl\b/gi, 'Telugu Telangana')
  .replace(/\bengg\b/gi, 'Engineering')
  .replace(/\bsanskrit comm\b/gi, 'Sanskrit Communicative')
  .replace(/\bict\b/gi, 'ICT')
  .replace(/\bncc\b/gi, 'NCC')
  .replace(/\bktpi\b/gi, 'Knowledge Traditions And Practices Of India')
  .replace(/\bSQP\b/gi, 'Sample Paper')
  .replace(/\bMS\b/gi, 'Marking Scheme')
  .replace(/\bPQ\b/gi, 'Practice Questions')
  .replace(/\bQP\b/gi, 'Question Paper')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\w\S*/g, (word) => {
    if (/^(AE|AG|AR|BM|BT|CE|CH|CS|CSE|CY|DA|EC|ECE|EE|ES|EY|GE|GG|IN|MA|ME|MN|MT|NM|PE|PH|PI|ST|TF|XE|XH|XL|CBSE|NCERT|UPSC|GATE|JEE|NEET|SSC|GS|PDF|ICT|NCC)$/i.test(word)) return word.toUpperCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

const getFileName = (url: string) => {
  try {
    const parsed = new URL(url);
    for (const key of ['param1', 'file', 'filename', 'name', 'path']) {
      const value = parsed.searchParams.get(key);
      if (value && /\.pdf$/i.test(value.split('?')[0])) {
        return decodeURIComponent(value.split(/[\\/]/).pop() || value);
      }
    }
    return decodeURIComponent(parsed.pathname.split('/').pop() || '');
  } catch {
    return url.split('/').pop() || '';
  }
};

const inferKind = (label: string, url: string) => {
  const lower = `${label} ${url}`.toLowerCase();
  if (lower.includes('syllabus')) return { section: 'Syllabus', resourceType: 'syllabus', paper: 'Syllabus' };
  if (lower.includes('marking') || /(?:^|[-_/])ms(?:[-_.]|$)/i.test(url)) return { section: 'Marking Schemes', resourceType: 'answer_key', paper: 'Marking Scheme' };
  if (lower.includes('answer') || lower.includes('key')) return { section: 'Answer Keys', resourceType: 'answer_key', paper: 'Answer Key' };
  if (/(?:^|[-_/])pq(?:[-_.]|$)/i.test(url)) return { section: 'Practice Questions', resourceType: 'practice', paper: 'Practice Questions' };
  if (lower.includes('sample') || /(?:^|[-_/])sqp(?:[-_.]|$)/i.test(url)) return { section: 'Sample Papers', resourceType: 'sample_paper', paper: 'Sample Paper' };
  return { section: 'Previous Year Papers', resourceType: 'pyq', paper: 'Question Paper' };
};

const dedupeAdjacentWords = (value: string) => value
  .split(' ')
  .filter((word, index, words) => index === 0 || word.toLowerCase() !== words[index - 1].toLowerCase())
  .join(' ');

const getUpscExamMeta = (examName: string) => {
  const normalized = cleanText(examName);
  const mappings: Array<{ pattern: RegExp; targetExam: string; titlePrefix: string }> = [
    { pattern: /\bcivil services\b/i, targetExam: 'UPSC CSE', titlePrefix: 'UPSC CSE' },
    { pattern: /\bindian forest service\b|\bifos\b/i, targetExam: 'UPSC IFoS', titlePrefix: 'UPSC IFoS' },
    { pattern: /\bnational defence academy\b|\bnaval academy\b|\bnda\b/i, targetExam: 'NDA', titlePrefix: 'UPSC NDA' },
    { pattern: /\bcombined defence services\b|\bcds\b/i, targetExam: 'CDS', titlePrefix: 'UPSC CDS' },
    { pattern: /\bcentral armed police\b|\bcapf\b/i, targetExam: 'UPSC CAPF', titlePrefix: 'UPSC CAPF' },
    { pattern: /\bengineering services\b/i, targetExam: 'UPSC IES', titlePrefix: 'UPSC IES' },
    { pattern: /\bgeo-scientist\b|\bgeologist\b/i, targetExam: 'UPSC Geo-Scientist', titlePrefix: 'UPSC Geo-Scientist' },
    { pattern: /\bcombined medical services\b|\bcmse\b/i, targetExam: 'UPSC CMS', titlePrefix: 'UPSC CMS' },
    { pattern: /\beconomic service\b|\bstatistical service\b/i, targetExam: 'UPSC IES ISS', titlePrefix: 'UPSC IES ISS' },
    { pattern: /\bcisf\b/i, targetExam: 'CISF AC LDCE', titlePrefix: 'UPSC CISF AC LDCE' },
    { pattern: /\bsection officers?\b|\bstenographers?\b|\bso[-\s]?steno\b|\bldce\b/i, targetExam: 'UPSC SO Steno LDCE', titlePrefix: 'UPSC SO Steno LDCE' },
    { pattern: /\bcbi\b|\bdsp\b/i, targetExam: 'UPSC CBI DSP LDCE', titlePrefix: 'UPSC CBI DSP LDCE' },
  ];

  const match = mappings.find((item) => item.pattern.test(normalized));
  if (match) return match;

  return {
    targetExam: 'Other UPSC Exams',
    titlePrefix: 'UPSC',
  };
};

const inferUpscStage = (examName: string) => {
  const normalized = cleanText(examName);
  if (/\bpreliminary\b|\bprelim\b/i.test(normalized)) return 'Prelims';
  if (/\bmain\b|\bmains\b/i.test(normalized)) return 'Mains';
  if (/\bstage\s*-?\s*i\b/i.test(normalized)) return 'Stage I';
  if (/\bstage\s*-?\s*ii\b/i.test(normalized)) return 'Stage II';

  if (/\b(?:NDA|National Defence Academy|CDS|Combined Defence Services)\b/i.test(normalized)) {
    const hasFirst = /\(\s*i\s*\)/i.test(normalized);
    const hasSecond = /\(\s*ii\s*\)/i.test(normalized);
    if (hasFirst && hasSecond) return 'Sessions I and II';
    if (hasSecond) return 'Session II';
    if (hasFirst) return 'Session I';
  }

  return '';
};

const normalizeUpscCategory = (value: string) => {
  const normalized = removeSizeText(cleanText(value))
    .replace(/\bQuestion Paper\b/gi, '')
    .replace(/\bDownload\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized || normalized === '-' || /^name of examination$/i.test(normalized)) return '';
  return titleCase(normalized)
    .replace(/\bOptional Subjects\b/i, 'Optional')
    .replace(/\bGeneral\b/i, 'General');
};

const normalizeUpscPaperLabel = (value: string) => {
  const normalized = removeSizeText(cleanText(value))
    .replace(/\bGAT\b/gi, 'General Ability Test')
    .replace(/\bGENERAL ABILITY AND INTELLIGENCE\b/g, 'General Ability and Intelligence')
    .replace(/\bGENERAL STUDIES\b/g, 'General Studies')
    .replace(/\bGeneral Studies\s*-\s*(I{1,3}|IV|1|2|3|4)\b/gi, (_match, paper) => `General Studies Paper ${normalizeRoman(paper)}`)
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\bPaper\s*-\s*(I{1,3}|IV|1|2|3|4)\b/gi, (_match, paper) => `Paper ${normalizeRoman(paper)}`)
    .replace(/\bPaper\s+(I{1,3}|IV|1|2|3|4)\b/gi, (_match, paper) => `Paper ${normalizeRoman(paper)}`)
    .replace(/\s+/g, ' ')
    .trim();

  return titleCase(normalized)
    .replace(/\bGs\b/g, 'GS')
    .replace(/\bCsat\b/g, 'CSAT')
    .replace(/\bIfos\b/g, 'IFoS')
    .replace(/\bIes\b/g, 'IES')
    .replace(/\bIss\b/g, 'ISS');
};

const getUpscPaperLabel = ($: any, link: any) => {
  const linkNode = $(link)[0] as any;
  const chunks: string[] = [];
  let current = linkNode?.prev;

  while (current) {
    chunks.unshift(current.type === 'text' ? current.data || '' : $(current).text());
    current = current.prev;
  }

  const label = normalizeUpscPaperLabel(chunks.join(' '));
  if (label && label.length <= 140) return label;

  const fallback = normalizeUpscPaperLabel(humanizeToken(getFileName($(link).attr('href') || '')));
  if (fallback && fallback.length <= 140) return fallback;
  return 'Question Paper';
};

const inferUpscSubject = (paperLabel: string, category: string, examName: string, stage: string) => {
  const paper = normalizeUpscPaperLabel(paperLabel);
  const gsPaperMatch = paper.match(/^General Studies Paper\s+(I{1,3}|IV|1|2|3|4)$/i);
  if (gsPaperMatch) {
    const roman = normalizeRoman(gsPaperMatch[1]);
    if (/\bcivil services\b/i.test(examName) && stage === 'Prelims' && roman === 'II') {
      return 'GS Paper II (CSAT)';
    }
    return `GS Paper ${roman}`;
  }

  if (/^Essay$/i.test(paper)) return 'Essay';
  if (/^General Ability Test$/i.test(paper)) return 'General Ability Test';
  if (/^General Knowledge$/i.test(paper)) return 'General Knowledge';
  if (/^Elementary Mathematics$/i.test(paper)) return 'Elementary Mathematics';
  if (/^Mathematics$/i.test(paper)) return 'Mathematics';
  if (/^English$/i.test(paper)) return 'English';

  const withoutPaperNumber = paper
    .replace(/\s+Paper\s+(?:I{1,3}|IV|1|2|3|4)$/i, '')
    .replace(/\s*\((Compulsory)\)$/i, ' $1')
    .trim();

  if (withoutPaperNumber && withoutPaperNumber !== paper) return withoutPaperNumber;
  if (/compulsory/i.test(category) && paper) return paper.replace(/\s+Compulsory$/i, ' Compulsory');
  return paper || 'Question Paper';
};

const getUpscTargetPath = (
  source: SourceConfig,
  examName: string,
  stage: string,
  category: string,
  subject: string,
  section: 'Previous Year Papers' | 'Syllabus'
) => {
  const exam = getUpscExamMeta(examName);
  if (section === 'Syllabus') return [...source.targetBasePath, exam.targetExam, 'Syllabus'];

  const isCivilServices = exam.targetExam === 'UPSC CSE';
  const categoryLabel = normalizeUpscCategory(category);
  if (isCivilServices) {
    const csePath = [...source.targetBasePath, exam.targetExam, section];
    const stageLabel = stage === 'Prelims' || stage === 'Mains' ? stage : stage || 'Other Papers';
    csePath.push(stageLabel);

    const normalizedSubject = subject
      .replace(/^GS Paper II \(CSAT\)$/i, 'CSAT Paper II')
      .replace(/\s*\((Compulsory)\)$/i, ' $1')
      .replace(/\s+/g, ' ')
      .trim();
    const plainSubject = normalizedSubject
      .replace(/\s+Compulsory$/i, '')
      .replace(/^General Studies Paper\s+/i, 'GS Paper ')
      .trim();

    if (stageLabel === 'Prelims') {
      if (/csat|paper\s+ii/i.test(normalizedSubject)) return [...csePath, 'CSAT Paper II'];
      return [...csePath, 'GS Paper I'];
    }

    if (stageLabel === 'Mains') {
      if (/^essay$/i.test(plainSubject)) return [...csePath, 'Essay'];
      if (/^GS Paper (I|II|III|IV)$/i.test(plainSubject)) return [...csePath, plainSubject];

      const isCompulsoryLanguage = /compulsory|qualifying|language/i.test(`${categoryLabel} ${normalizedSubject}`);
      if (isCompulsoryLanguage) {
        const language = plainSubject.replace(/^Indian Language$/i, 'Indian Language').replace(/^Question Paper$/i, 'Language Paper');
        return [...csePath, 'Compulsory Language', language || 'Language Paper'];
      }

      const isOptional = /optional/i.test(categoryLabel) || !['Question Paper', 'General'].includes(plainSubject);
      if (isOptional) return [...csePath, 'Optional Subjects', plainSubject || 'Subject-wise'];
    }

    return [...csePath, plainSubject || 'Question Paper'];
  }

  const pathParts = [...source.targetBasePath, exam.targetExam, section];
  if (section === 'Previous Year Papers' && stage) pathParts.push(stage);

  const useCategory = Boolean(
    categoryLabel &&
    categoryLabel.toLowerCase() !== subject.toLowerCase() &&
    !['general', 'question paper'].includes(categoryLabel.toLowerCase())
  );

  if (section === 'Previous Year Papers' && useCategory && (exam.targetExam === 'UPSC CSE' || exam.targetExam === 'UPSC IFoS')) {
    pathParts.push(categoryLabel);
  }

  pathParts.push(subject);
  return pathParts;
};

const createUpscTitle = (examName: string, stage: string, paperLabel: string, year?: number) => {
  const exam = getUpscExamMeta(examName);
  const normalizedPaper = normalizeUpscPaperLabel(paperLabel);
  const gsPaperMatch = normalizedPaper.match(/^General Studies Paper\s+(I{1,3}|IV|1|2|3|4)$/i);
  const titlePaper = gsPaperMatch ? inferUpscSubject(normalizedPaper, '', examName, stage) : normalizedPaper;
  const title = [exam.titlePrefix, stage, titlePaper, year ? String(year) : '']
    .filter(Boolean)
    .join(' ');
  return dedupeAdjacentWords(title);
};

const shouldKeepLink = (source: SourceConfig, haystack: string) => {
  if (source.includeAny?.length && !matchesPatterns(haystack, source.includeAny)) return false;
  if (source.excludeAny?.length && matchesPatterns(haystack, source.excludeAny)) return false;
  return true;
};

const buildUpscPyqEntries = (source: SourceConfig, html: string, pageUrl: string): ManifestEntry[] => {
  const $ = cheerio.load(html);
  const entries: ManifestEntry[] = [];

  $('.view-content table').each((_tableIndex: number, table: any) => {
    const examName = cleanText($(table).find('caption').first().text());
    if (!examName) return;

    const year = inferYear(examName, source.year);
    const stage = inferUpscStage(examName);

    $(table).find('tbody tr').each((_rowIndex: number, row: any) => {
      const cells = $(row).find('td');
      const category = normalizeUpscCategory(cells.first().text());

      $(row).find('a[href]').each((_linkIndex: number, link: any) => {
        const href = absoluteUrl($(link).attr('href') || '', pageUrl);
        if (!href || !/\.pdf(?:[?#].*)?$/i.test(href)) return;

        const paperLabel = getUpscPaperLabel($, link);
        const subject = inferUpscSubject(paperLabel, category, examName, stage);
        const haystack = `${href} ${examName} ${category} ${paperLabel}`;
        if (!shouldKeepLink(source, haystack)) return;

        entries.push({
          title: createUpscTitle(examName, stage, paperLabel, year),
          url: href,
          targetPath: getUpscTargetPath(source, examName, stage, category, subject, 'Previous Year Papers'),
          sourceName: source.sourceName,
          sourceUrl: source.sourceUrl || pageUrl,
          sourceType: source.sourceType || 'official',
          resourceType: source.resourceType || 'pyq',
          mirrorAllowed: Boolean(source.mirrorAllowed),
          rightsNote: source.rightsNote || 'Official UPSC previous question paper. Keep official URL/source attribution unless mirror permission is confirmed.',
          language: source.language || 'english',
          year,
          stage,
          subject,
          paper: paperLabel,
          topic: category || undefined,
        });
      });
    });
  });

  return entries;
};

const buildUpscSyllabusEntries = (source: SourceConfig, html: string, pageUrl: string): ManifestEntry[] => {
  const $ = cheerio.load(html);
  const entries: ManifestEntry[] = [];

  $('.view-content table').each((_tableIndex: number, table: any) => {
    const caption = cleanText($(table).find('caption').first().text());
    const captionYear = inferYear(caption, source.year);

    $(table).find('tbody tr').each((_rowIndex: number, row: any) => {
      const cells = $(row).find('td');
      const examName = cleanText(cells.first().text()) || caption;
      const year = inferYear(examName, captionYear);
      const exam = getUpscExamMeta(examName);
      const subject = 'Syllabus';

      $(row).find('a[href]').each((_linkIndex: number, link: any) => {
        const href = absoluteUrl($(link).attr('href') || '', pageUrl);
        if (!href || !/\.pdf(?:[?#].*)?$/i.test(href)) return;

        const haystack = `${href} ${caption} ${examName} Syllabus Scheme`;
        if (!shouldKeepLink(source, haystack)) return;

        entries.push({
          title: dedupeAdjacentWords([exam.titlePrefix, 'Syllabus and Scheme', year ? String(year) : ''].filter(Boolean).join(' ')),
          url: href,
          targetPath: getUpscTargetPath(source, examName, '', '', subject, 'Syllabus'),
          sourceName: source.sourceName,
          sourceUrl: source.sourceUrl || pageUrl,
          sourceType: source.sourceType || 'official',
          resourceType: source.resourceType || 'syllabus',
          mirrorAllowed: Boolean(source.mirrorAllowed),
          rightsNote: source.rightsNote || 'Official UPSC syllabus/scheme PDF. Keep official URL/source attribution unless mirror permission is confirmed.',
          language: source.language || 'english',
          year,
          subject,
          paper: 'Syllabus and Scheme',
        });
      });
    });
  });

  return entries;
};

const getVariantMeta = (url: string) => {
  const fileName = getFileName(url);
  const variants: string[] = [];
  if (/(?:^|[-_])hi(?:\.|[-_]|$)/i.test(fileName)) variants.push('Hindi');
  if (/(?:^|[-_])vic(?:\.|[-_]|$)|vic(?=[-_.])/i.test(fileName)) variants.push('Visually Impaired');

  return {
    language: variants.includes('Hindi') ? 'hindi' as const : 'english' as const,
    titleSuffix: variants.length ? ` (${variants.join(', ')})` : '',
  };
};

const normalizeSubjectName = (value: string, url: string) => dedupeAdjacentWords(humanizeToken(value)
  .replace(/\bPractice Questions\b/gi, ' ')
  .replace(/\b(Hi|VIC|Visually Impaired)\b/gi, ' ')
  .replace(/\bCore Core\b/gi, 'Core')
  .replace(/\s+/g, ' ')
  .trim()) || 'General';

const inferSubject = (label: string, url: string) => {
  const fileName = humanizeToken(getFileName(url));
  const fromFile = fileName
    .replace(/\b(Sample Paper|Marking Scheme|Question Paper|Answer Key)\b/gi, ' ')
    .replace(/\b(SQP|MS|PQ|QP)\b/gi, ' ')
    .replace(/\b(Class|X|XII|10|12|2024|2025|2026)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (fromFile.length >= 3 && fromFile.length <= 60 && !/[<>"=]/.test(fromFile)) {
    return normalizeSubjectName(fromFile, url);
  }

  const raw = cleanText(label) || fileName;
  const compact = raw
    .replace(/\b(Sample Paper|Marking Scheme|Question Paper|Answer Key|PDF|Download|View)\b/gi, ' ')
    .replace(/\b(Class|X|XII|10|12|2024|2025|2026)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (compact.length >= 3 && compact.length <= 60 && !/[<>"=]/.test(compact)) return normalizeSubjectName(compact, url);
  return normalizeSubjectName(fromFile || 'General', url);
};

const normalizeGateKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const gatePaperAliasEntries = gateTestPapers
  .flatMap((paper) => {
    const aliases = [
      paper.code,
      paper.name,
      getGatePaperBranchName(paper),
      `GATE ${paper.code}`,
      `GATE ${paper.name}`,
      ...(paper.aliases || []),
      ...(paper.aliases || []).map((alias) => `GATE ${alias}`),
    ];
    return aliases.map((alias) => ({ key: normalizeGateKey(alias), paper }));
  })
  .filter((entry) => entry.key)
  .sort((a, b) => b.key.length - a.key.length);

const inferGatePaperBranch = (subject: string, context: string) => {
  const key = normalizeGateKey(`${subject} ${context}`);
  for (const entry of gatePaperAliasEntries) {
    if (entry.key.length <= 2) {
      if (entry.key === 'in') {
        if (key === 'in' || key.startsWith('in ') || /\binstrumentation\b/.test(key)) return getGatePaperBranchName(entry.paper);
        continue;
      }
      if (new RegExp(`(^|\\s)${escapeRegex(entry.key)}(\\s|$)`).test(key)) return getGatePaperBranchName(entry.paper);
      continue;
    }
    if (new RegExp(`(^|\\s)${escapeRegex(entry.key)}(\\s|$)`).test(key)) return getGatePaperBranchName(entry.paper);
  }
  return 'General Aptitude and Common Resources';
};

const isGateSource = (source: SourceConfig) =>
  source.id.toLowerCase().includes('gate') ||
  `${source.sourceName} ${source.titlePrefix || ''}`.toLowerCase().includes('gate');

const getGateTargetPath = (source: SourceConfig, subject: string, section: string, context: string) => {
  const branch = inferGatePaperBranch(subject, context);
  const yearFolder = source.year && ['Previous Year Papers', 'Answer Keys', 'Marking Schemes'].includes(section)
    ? [String(source.year)]
    : [];
  return [...source.targetBasePath, branch, section, ...yearFolder];
};

const matchesPatterns = (haystack: string, patterns: string[] = []) =>
  patterns.some((pattern) => {
    const parts = pattern
      .trim()
      .split(/[^a-z0-9]+/i)
      .filter(Boolean)
      .map(escapeRegex);
    if (!parts.length) return false;
    return new RegExp(`(^|[^a-z0-9])${parts.join('[^a-z0-9]+')}([^a-z0-9]|$)`, 'i').test(haystack);
  });

const isLikelyPdfEndpoint = (href: string, label = '', context = '') => {
  const text = `${label} ${context}`.toLowerCase();
  try {
    const url = new URL(href);
    const pathAndQuery = `${url.pathname}${url.search}`.toLowerCase();
    if (/\.pdf(?:$|[?#&])/i.test(pathAndQuery)) return true;
    if (/\/public\/uploads\/oldquestionpaper\//i.test(pathAndQuery)) return true;
    const downloadEndpoint = /\/(?:download|open_pdf|open_pdf_db|preview|getfile|viewfile|viewpdf|attachment)(?:[/?#.]|$)/i.test(pathAndQuery);
    return downloadEndpoint && /\b(download|view|pdf|paper|question|attachment)\b/i.test(text);
  } catch {
    return /\.pdf(?:$|[?#&])/i.test(href);
  }
};

const extractPdfLinks = (html: string, pageUrl: string) => {
  const links: Array<{ href: string; label: string; context: string }> = [];
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorPattern.exec(html))) {
    const href = absoluteUrl(match[1], pageUrl);
    const contextStart = Math.max(0, match.index - 220);
    const contextEnd = Math.min(html.length, anchorPattern.lastIndex + 120);
    const label = cleanText(match[2]);
    const context = cleanText(html.slice(contextStart, contextEnd));
    if (!href || !isLikelyPdfEndpoint(href, label, context)) continue;
    links.push({
      href,
      label,
      context,
    });
  }

  return links;
};

const inferStateStage = (value: string) => {
  const lower = value.toLowerCase();
  if (/\b(preliminary|prelims|preli|pre\.|screening|objective)\b/.test(lower)) return 'Prelims';
  if (/\b(mains|main written|main examination|descriptive|essay|optional)\b/.test(lower)) return 'Mains';
  return '';
};

const cleanStatePaperLabel = (value: string, fallback: string) => {
  const cleaned = removeSizeText(value)
    .replace(/\b(View|Download|Click Here|PDF|Attachment|File)\b/gi, ' ')
    .replace(/\b(Sl\.?\s*No\.?|S\.?\s*No\.?|Release Date|Description|Details|Link|Year|Uploaded On)\b/gi, ' ')
    .replace(/\s*\|\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length >= 8 && cleaned.length <= 220) return cleaned;
  return humanizeToken(fallback) || 'Question Paper';
};

const createStatePyqTitle = (source: SourceConfig, paperLabel: string, year?: number) => {
  const prefix = source.titlePrefix || source.sourceName;
  const normalizedPaper = paperLabel.replace(new RegExp(`^${prefix}\\s+`, 'i'), '').trim();
  const withPrefix = [prefix, normalizedPaper].filter(Boolean).join(' ');
  return dedupeAdjacentWords(year && !withPrefix.includes(String(year)) ? `${withPrefix} ${year}` : withPrefix);
};

const getStatePyqTargetPath = (source: SourceConfig, stage: string) => {
  const section = source.targetSection || 'Previous Year Papers';
  return [...source.targetBasePath, section, ...(stage ? [stage] : [])];
};

const getStateAnchorContext = ($: cheerio.Root, anchor: any) => {
  const row = $(anchor).closest('tr');
  if (!row.length) {
    const fallbackText = cleanText($(anchor).parent().text());
    return { context: fallbackText, rawContext: fallbackText };
  }

  const cells = row
    .find('td, th')
    .toArray()
    .map((cell: any) => cleanText($(cell).text()))
    .filter(Boolean);
  const rawContext = cleanText(row.text());
  const meaningfulCells = cells.filter((cell) => {
    if (/^(view|download|pdf|file|attachment|click here|\/)$/i.test(cell)) return false;
    if (!/[a-z]/i.test(cell)) return false;
    return true;
  });
  const preferredCell = meaningfulCells.find((cell) => /\bquestion\s+paper\b/i.test(cell) && cell.length <= 220)
    || meaningfulCells.find((cell) => /\b(?:paper|exam|previous|mains?|prelims?)\b/i.test(cell) && cell.length <= 220)
    || meaningfulCells.find((cell) => cell.length >= 8 && cell.length <= 220)
    || '';
  const combinedCells = meaningfulCells.join(' ');

  return {
    context: preferredCell || combinedCells || rawContext,
    rawContext: combinedCells ? `${combinedCells} ${rawContext}` : rawContext,
  };
};

const buildStatePyqEntries = (source: SourceConfig, html: string, pageUrl: string): ManifestEntry[] => {
  const $ = cheerio.load(html);
  const entries: ManifestEntry[] = [];

  $('a[href]').each((_index: number, anchor: any) => {
    const href = absoluteUrl($(anchor).attr('href') || '', pageUrl);
    const label = cleanText($(anchor).text());
    const { context, rawContext } = getStateAnchorContext($, anchor);
    if (!href || !isLikelyPdfEndpoint(href, label, rawContext || context)) return;

    const haystack = `${href} ${label} ${context} ${rawContext}`;
    if (!shouldKeepLink(source, haystack)) return;

    const fileName = getFileName(href);
    const labelYear = inferYear(label);
    const paperLabel = cleanStatePaperLabel(
      context && labelYear && !context.includes(String(labelYear)) ? `${context} ${labelYear}` : context || label,
      fileName
    );
    const stage = inferStateStage(paperLabel);
    const year = labelYear || inferYear(paperLabel) || inferYear(`${rawContext} ${href}`, source.year);

    entries.push({
      title: createStatePyqTitle(source, paperLabel, year),
      url: href,
      targetPath: getStatePyqTargetPath(source, stage),
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl || pageUrl,
      sourceType: source.sourceType || 'official',
      resourceType: source.resourceType || 'pyq',
      mirrorAllowed: Boolean(source.mirrorAllowed),
      rightsNote: source.rightsNote || `Official ${source.sourceName} previous question paper. Keep official URL unless mirror permission is confirmed.`,
      language: source.language || 'english',
      year,
      subject: paperLabel,
      paper: stage ? `${stage} Question Paper` : 'Question Paper',
      stage,
    });
  });

  return entries;
};

const getSelectOptions = (html: string, fieldName: string) => {
  const $ = cheerio.load(html);
  return $(`select[name="${fieldName}"] option`)
    .toArray()
    .map((option: any) => ({
      value: cleanText($(option).attr('value') || ''),
      label: cleanText($(option).text()),
    }))
    .filter((option) => option.value && option.label && !/select/i.test(option.label));
};

const optionMatches = (label: string, includeAny?: string[], excludeAny?: string[]) => {
  if (includeAny?.length && !matchesPatterns(label, includeAny)) return false;
  if (excludeAny?.length && matchesPatterns(label, excludeAny)) return false;
  return true;
};

const buildStateFormEntries = async (source: SourceConfig, html: string, pageUrl: string): Promise<ManifestEntry[]> => {
  if (!source.formField) return [];

  const examOptions = getSelectOptions(html, source.formField)
    .filter((option) => optionMatches(option.label, source.formOptionIncludeAny || source.includeAny, source.formOptionExcludeAny || source.excludeAny))
    .slice(0, source.formOptionLimit || 80);

  const entries: ManifestEntry[] = [];

  for (const examOption of examOptions) {
    const form = new URLSearchParams({ [source.formField]: examOption.value });
    const formHtml = await fetchFormHtml(source, pageUrl, form);
    const subjectOptions = getSelectOptions(formHtml, 'subject');
    for (const subjectOption of subjectOptions) {
      const paperLabel = cleanStatePaperLabel(`${examOption.label} ${subjectOption.label}`, subjectOption.value);
      const stage = inferStateStage(paperLabel);
      const year = inferYear(paperLabel) || source.year;
      const url = `${pageUrl}?${new URLSearchParams({
        [source.formField]: examOption.value,
        subject: subjectOption.value,
        submit: 'Click Here To Download',
      }).toString()}`;

      entries.push({
        title: createStatePyqTitle(source, paperLabel, year),
        url,
        targetPath: getStatePyqTargetPath(source, stage),
        sourceName: source.sourceName,
        sourceUrl: source.sourceUrl || pageUrl,
        sourceType: source.sourceType || 'official',
        resourceType: source.resourceType || 'pyq',
        mirrorAllowed: Boolean(source.mirrorAllowed),
        rightsNote: source.rightsNote || `Official ${source.sourceName} previous question paper. Keep official URL unless mirror permission is confirmed.`,
        language: source.language || 'english',
        year,
        subject: subjectOption.label,
        paper: stage ? `${stage} Question Paper` : 'Question Paper',
        stage,
      });
    }
  }

  return entries;
};

const buildEntry = (source: SourceConfig, link: { href: string; label: string; context: string }): ManifestEntry => {
  const kind = inferKind(link.label || link.context, link.href);
  const subject = inferSubject(link.context || link.label, link.href);
  const variant = getVariantMeta(link.href);
  const section = source.targetSection || kind.section;
  const resourceType = source.resourceType || kind.resourceType;
  const paper = resourceType === 'syllabus' || section.toLowerCase().includes('syllabus') ? 'Syllabus' : kind.paper;
  const titleParts = [source.titlePrefix, subject, paper, source.year ? String(source.year) : '']
    .filter(Boolean)
    .join(' ');

  return {
    title: `${titleParts || humanizeToken(getFileName(link.href))}${variant.titleSuffix}`,
    url: link.href,
    targetPath: isGateSource(source)
      ? getGateTargetPath(source, subject, section, `${link.label} ${link.context} ${link.href}`)
      : [...source.targetBasePath, section, subject],
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl || source.pageUrl,
    sourceType: source.sourceType || 'official',
    resourceType,
    mirrorAllowed: Boolean(source.mirrorAllowed),
    rightsNote: source.rightsNote || `Official ${source.sourceName} PDF. Keep official URL unless mirror permission is confirmed.`,
    language: variant.language || source.language || 'english',
    year: source.year,
    subject,
    paper,
  };
};

const run = async () => {
  const { configPath, outputPath } = parseArgs();
  const sources = (await readConfig(configPath)).filter((source) => source.enabled !== false);
  const entries: ManifestEntry[] = [];
  const seenUrls = new Set<string>();
  let failedSources = 0;

  for (const source of sources) {
    const pageUrls = source.pageUrls?.length ? source.pageUrls : [source.pageUrl];

    for (const pageUrl of pageUrls) {
      if (!isAllowedOfficialUrl(pageUrl)) {
        console.warn(`Skipping non-official or disallowed source: ${pageUrl}`);
        continue;
      }

      const pageSource = { ...source, pageUrl };
      try {
        console.log(`Fetching ${source.id}: ${pageUrl}`);
        const response = await axios.get(pageUrl, getAxiosOptions(source));
        const html = String(response.data);
        const parser = source.parser || 'generic';
        let builtEntries: ManifestEntry[] = [];
        if (parser === 'upsc-pyq') {
          builtEntries = buildUpscPyqEntries(pageSource, html, pageUrl);
        } else if (parser === 'upsc-syllabus') {
          builtEntries = buildUpscSyllabusEntries(pageSource, html, pageUrl);
        } else if (parser === 'state-pyq') {
          builtEntries = source.formField
            ? await buildStateFormEntries(pageSource, html, pageUrl)
            : buildStatePyqEntries(pageSource, html, pageUrl);
        } else {
          builtEntries = extractPdfLinks(html, pageUrl)
            .filter((link) => shouldKeepLink(source, `${link.href} ${link.label} ${link.context}`))
            .map((link) => buildEntry(pageSource, link));
        }

        builtEntries.forEach((entry) => {
          if (seenUrls.has(entry.url)) return;
          seenUrls.add(entry.url);
          entries.push(entry);
        });

        console.log(`  ${builtEntries.length} PDF entry candidate(s), ${entries.length} total kept.`);
      } catch (error) {
        failedSources += 1;
        console.warn(`  Skipping ${source.id}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  const seenTitlePaths = new Set<string>();
  const dedupedEntries = entries.filter((entry) => {
    const key = `${entry.targetPath.join('/').toLowerCase()}::${entry.title.toLowerCase()}`;
    if (seenTitlePaths.has(key)) return false;
    seenTitlePaths.add(key);
    return true;
  });

  dedupedEntries.sort((a, b) => a.targetPath.join('/').localeCompare(b.targetPath.join('/')) || a.title.localeCompare(b.title));
  await fs.writeFile(outputPath, `${JSON.stringify(dedupedEntries, null, 2)}\n`, 'utf-8');
  console.log(`Manifest written: ${outputPath}`);
  console.log(`Entries: ${dedupedEntries.length}`);
  if (failedSources) console.log(`Sources skipped because of fetch/parse errors: ${failedSources}`);
  if (dedupedEntries.length !== entries.length) console.log(`Skipped duplicate title/path entries: ${entries.length - dedupedEntries.length}`);
};

run().catch((error) => {
  console.error('Official manifest build failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
