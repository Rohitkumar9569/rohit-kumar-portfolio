import type { StudyCardFile } from '../studyHubApi';
import { isStudyBookPackageUrl, isStudyPdfUrl } from './studyPdfReader';

type StudyFileDisplayInput = Pick<
  StudyCardFile,
  'name' | 'subject' | 'paper' | 'mimeType' | 'url' | 'resourceType' | 'year' | 'stage' | 'sourceName' | 'sourceType'
>;

const normalize = (value = '') => value.trim().replace(/\s+/g, ' ');

const normalizeKey = (value = '') => normalize(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const isOfficialStudySource = (file: Pick<StudyCardFile, 'sourceName' | 'sourceType'>) => {
  const sourceKey = normalizeKey(`${file.sourceType || ''} ${file.sourceName || ''}`);
  return ['official', 'upsc', 'cbse', 'ncert'].some((keyword) => sourceKey.includes(keyword));
};

const getCompactSourceLabel = (sourceName = '') => {
  const sourceKey = normalizeKey(sourceName);
  if (sourceKey.includes('upsc')) return 'UPSC Official';
  if (sourceKey.includes('cbse')) return 'CBSE Official';
  if (sourceKey.includes('ncert')) return 'NCERT Official';
  return normalize(sourceName);
};

const dedupeLabels = (labels: string[]) => {
  const seen = new Set<string>();
  return labels.filter((label) => {
    const key = normalizeKey(label);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getStudyFilePartLabel = (file: Pick<StudyCardFile, 'name' | 'paper'>) => {
  const text = normalize(`${file.paper || ''} ${file.name || ''}`);
  const romanMatch = text.match(/\bPart\s*(I|II|III|IV|V)\b/i);
  if (romanMatch) return `Part ${romanMatch[1].toUpperCase()}`;

  const numberMatch = text.match(/\bPart\s*[-:]?\s*([1-5])\b/i);
  if (numberMatch) return `Part ${numberMatch[1]}`;

  return '';
};

export const getStudyFileDisplayTitle = (file: Pick<StudyCardFile, 'name' | 'subject' | 'paper'>, parentName = '') => {
  const parentClassMatch = parentName.match(/\bClass\s+(\d{1,2})\b/i);
  let title = normalize(file.name)
    .replace(/\s+Complete\s+Book$/i, '')
    .replace(/\s+PDF\s*document$/i, '')
    .trim();

  if (parentClassMatch) {
    title = title.replace(new RegExp(`^NCERT\\s+Class\\s+${parentClassMatch[1]}\\s+`, 'i'), '').trim();
  } else {
    title = title.replace(/^NCERT\s+Class\s+\d{1,2}\s+/i, '').trim();
  }

  return title || normalize(file.paper || file.subject || file.name);
};

export const getStudyFileSubtitle = (file: StudyFileDisplayInput) => {
  const subject = normalize(file.subject || '');
  const source = isOfficialStudySource(file) ? getCompactSourceLabel(file.sourceName || '') : '';
  const stage = normalize(file.stage || '');
  const year = typeof file.year === 'number' && Number.isFinite(file.year) ? String(file.year) : '';
  const part = getStudyFilePartLabel(file);
  const isBook = isStudyBookPackageUrl(file.url, file.mimeType) || normalizeKey(file.resourceType || '').includes('book');
  const typeLabel = isBook ? 'Complete book' : isStudyPdfUrl(file.url, file.mimeType) ? 'PDF document' : 'File';

  return dedupeLabels([source, subject, stage, year, part, typeLabel]).join(' / ') || typeLabel;
};

export const getStudyFileCompactMeta = (file: StudyFileDisplayInput, title = '') => {
  const titleKey = normalizeKey(title || file.name || '');
  const subject = normalize(file.subject || file.paper || '');
  const subjectKey = normalizeKey(subject);
  const year = typeof file.year === 'number' && Number.isFinite(file.year) ? String(file.year) : '';
  const yearAlreadyVisible = Boolean(year && titleKey.includes(year));
  const part = getStudyFilePartLabel(file);
  const partKey = normalizeKey(part);
  const partAlreadyVisible = Boolean(partKey && titleKey.includes(partKey));
  const isBook = isStudyBookPackageUrl(file.url, file.mimeType) || normalizeKey(file.resourceType || '').includes('book');
  const typeLabel = isBook ? 'Complete book' : isStudyPdfUrl(file.url, file.mimeType) ? 'PDF document' : 'File';
  const compactSubject = subject && subjectKey && !titleKey.includes(subjectKey) && subject.length <= 28 ? subject : '';

  return dedupeLabels([
    compactSubject,
    !yearAlreadyVisible ? year : '',
    !partAlreadyVisible ? part : '',
    typeLabel,
  ]).slice(0, 2).join(' / ') || typeLabel;
};

export const getStudyFileBadge = (file: StudyFileDisplayInput, title = '') => {
  const part = getStudyFilePartLabel(file);
  if (part) return part.toUpperCase();

  const paperKey = normalizeKey(`${file.resourceType || ''} ${file.paper || ''} ${file.name || ''}`);
  if (paperKey.includes('syllabus')) return 'SYLLABUS';

  if (typeof file.year === 'number' && Number.isFinite(file.year)) return String(file.year);

  const subject = normalize(file.subject || '');
  const titleKey = normalizeKey(title || file.name || '');
  if (subject && !titleKey.includes(normalizeKey(subject))) return subject;

  if (isStudyBookPackageUrl(file.url, file.mimeType) || normalizeKey(file.resourceType || '').includes('book')) return 'BOOK';
  if (isStudyPdfUrl(file.url, file.mimeType)) return 'PDF';
  return 'FILE';
};
