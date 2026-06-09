import type { StudyCard } from '../studyHubApi';

export type StudyGoalType = NonNullable<StudyCard['goalType']>;

export const studyGoalTypeOptions: Array<{
  key: StudyGoalType;
  label: string;
  description: string;
}> = [
  {
    key: 'exam_category',
    label: 'Category',
    description: 'Competitive Exams, Entrance Exams, School Boards, State Exams, University Exams.',
  },
  {
    key: 'exam_family',
    label: 'Exam family',
    description: 'UPSC, GATE, Railway, SSC, CBSE, State Boards.',
  },
  {
    key: 'exam',
    label: 'Goal / exam',
    description: 'UPSC CSE, GATE CSE, NEET, JEE Main, CBSE Class 12.',
  },
  {
    key: 'board',
    label: 'Board',
    description: 'CBSE, ICSE / ISC, or a state board.',
  },
  {
    key: 'class',
    label: 'Class',
    description: 'Class 1 to Class 12, semester, or level.',
  },
  {
    key: 'subject',
    label: 'Subject',
    description: 'Physics, History, Polity, Maths, Reasoning.',
  },
  {
    key: 'resource_folder',
    label: 'Resource folder',
    description: 'PYQ, Notes, Syllabus, Mock Tests, Current Affairs, PDFs.',
  },
];

const labelByGoalType = new Map(studyGoalTypeOptions.map((option) => [option.key, option.label]));

const normalizeText = (value = '') => value.trim().toLowerCase();

export const getStudyGoalTypeLabel = (goalType?: StudyCard['goalType']) =>
  labelByGoalType.get(goalType || 'resource_folder') || 'Resource folder';

export const getNextChildGoalType = (parent?: StudyCard | null): StudyGoalType => {
  const parentType = parent?.goalType || inferStudyGoalType(parent || null);

  if (!parent) return 'exam_category';
  if (parentType === 'exam_category') return 'exam_family';
  if (parentType === 'exam_family') return 'exam';
  if (parentType === 'board') return 'class';
  if (parentType === 'class') return 'subject';
  return 'resource_folder';
};

export const inferStudyGoalType = (card?: StudyCard | null, pathCards: StudyCard[] = []): StudyGoalType => {
  if (card?.goalType) return card.goalType;
  if (!card) return 'library_root';

  const name = normalizeText(card.name);
  const slug = normalizeText(card.slug);
  const iconKey = normalizeText(card.iconKey);
  const path = pathCards.length ? pathCards : [card];
  const depth = Math.max(0, path.length - 1);
  const haystack = `${name} ${slug} ${iconKey}`;

  if (!card.parentId && (iconKey === 'heading' || depth === 0)) return 'exam_category';
  if (/\b(class|grade)\s*(1|2|3|4|5|6|7|8|9|10|11|12)\b/.test(haystack)) return 'class';
  if (['cbse', 'icse', 'isc', 'ncert'].some((key) => haystack.includes(key)) && depth <= 2) return 'board';
  if (['physics', 'chemistry', 'biology', 'math', 'history', 'geography', 'polity', 'economy', 'reasoning', 'english'].some((key) => haystack.includes(key))) {
    return 'subject';
  }
  if (['pyq', 'paper', 'notes', 'syllabus', 'mock', 'test', 'material', 'current', 'affairs', 'interview', 'strategy'].some((key) => haystack.includes(key))) {
    return 'resource_folder';
  }
  if (depth === 1) return 'exam_family';
  if (depth === 2) return 'exam';
  return 'resource_folder';
};

export const getStudyGoalTypeDescription = (goalType?: StudyCard['goalType']) =>
  studyGoalTypeOptions.find((option) => option.key === goalType)?.description || 'Student-facing folder in the library.';
