/**
 * Master Coaching & Source Registry for Study Hub
 * ------------------------------------------------
 * Every resource should carry a clear source label so students
 * know whether material is Official, Platform Premium, or from a known faculty/coaching brand.
 *
 * sourceType values (from Resource / StudyCard models):
 *   official | ncert | standard_book | faculty | creator | community | platform
 */

export type CoachingBrand = {
  id: string;
  label: string;
  shortLabel: string;
  exams: string[];
  tone: 'emerald' | 'violet' | 'amber' | 'blue' | 'rose' | 'cyan' | 'indigo' | 'slate';
  priority: number;
};

export const COACHING_BRANDS: CoachingBrand[] = [
  { id: 'vision-ias', label: 'Vision IAS', shortLabel: 'Vision', exams: ['upsc', 'state-psc'], tone: 'violet', priority: 1 },
  { id: 'vajiram', label: 'Vajiram & Ravi', shortLabel: 'Vajiram', exams: ['upsc', 'state-psc'], tone: 'indigo', priority: 2 },
  { id: 'forumias', label: 'ForumIAS', shortLabel: 'ForumIAS', exams: ['upsc'], tone: 'blue', priority: 3 },
  { id: 'nextias', label: 'NextIAS', shortLabel: 'NextIAS', exams: ['upsc'], tone: 'cyan', priority: 4 },
  { id: 'drishti', label: 'Drishti IAS', shortLabel: 'Drishti', exams: ['upsc', 'state-psc'], tone: 'emerald', priority: 5 },
  { id: 'insights', label: 'Insights IAS', shortLabel: 'Insights', exams: ['upsc'], tone: 'amber', priority: 6 },
  { id: 'made-easy', label: 'Made Easy', shortLabel: 'Made Easy', exams: ['gate', 'ese'], tone: 'rose', priority: 1 },
  { id: 'ace-academy', label: 'ACE Academy', shortLabel: 'ACE', exams: ['gate', 'ese'], tone: 'violet', priority: 2 },
  { id: 'gate-academy', label: 'GATE Academy', shortLabel: 'GATE Acad', exams: ['gate'], tone: 'blue', priority: 3 },
  { id: 'ies-master', label: 'IES Master', shortLabel: 'IES Master', exams: ['gate', 'ese'], tone: 'indigo', priority: 4 },
  { id: 'allen', label: 'Allen', shortLabel: 'Allen', exams: ['jee', 'neet'], tone: 'amber', priority: 1 },
  { id: 'resonance', label: 'Resonance', shortLabel: 'Resonance', exams: ['jee', 'neet'], tone: 'violet', priority: 2 },
  { id: 'aakash', label: 'Aakash', shortLabel: 'Aakash', exams: ['neet', 'jee'], tone: 'blue', priority: 3 },
  { id: 'pw', label: 'Physics Wallah', shortLabel: 'PW', exams: ['jee', 'neet', 'upsc'], tone: 'cyan', priority: 4 },
  { id: 'fiitjee', label: 'FIITJEE', shortLabel: 'FIITJEE', exams: ['jee'], tone: 'rose', priority: 5 },
  { id: 'motion', label: 'Motion', shortLabel: 'Motion', exams: ['jee', 'neet'], tone: 'emerald', priority: 6 },
  { id: 'adda247', label: 'Adda247', shortLabel: 'Adda247', exams: ['ssc', 'banking', 'railway'], tone: 'amber', priority: 1 },
  { id: 'testbook', label: 'Testbook', shortLabel: 'Testbook', exams: ['ssc', 'banking', 'railway', 'gate'], tone: 'violet', priority: 2 },
  { id: 'oliveboard', label: 'Oliveboard', shortLabel: 'Oliveboard', exams: ['banking', 'ssc'], tone: 'blue', priority: 3 },
  { id: 'gradeup', label: 'Gradeup / BYJU\'S Exam Prep', shortLabel: 'Gradeup', exams: ['ssc', 'banking', 'railway'], tone: 'cyan', priority: 4 },
  { id: 'mahendra', label: 'Mahendra Guru', shortLabel: 'Mahendra', exams: ['ssc', 'banking'], tone: 'emerald', priority: 5 },
  { id: 'study-hub', label: 'Study Hub Premium', shortLabel: 'Premium', exams: ['*'], tone: 'violet', priority: 0 },
  { id: 'official', label: 'Official', shortLabel: 'Official', exams: ['*'], tone: 'emerald', priority: 0 },
  { id: 'ncert', label: 'NCERT', shortLabel: 'NCERT', exams: ['*'], tone: 'blue', priority: 0 },
];

export const COACHING_BY_ID = Object.fromEntries(COACHING_BRANDS.map((b) => [b.id, b]));

export function resolveCoachingBrand(sourceName = '', sourceType = ''): CoachingBrand | null {
  const key = `${sourceType} ${sourceName}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!key) return null;
  if (key.includes('ncert')) return COACHING_BY_ID['ncert'];
  if (['official', 'upsc', 'cbse', 'ssc', 'rrb', 'ibps', 'sbi'].some((k) => key.includes(k)) && !key.includes('vision') && !key.includes('vajiram')) {
    return COACHING_BY_ID['official'];
  }
  for (const brand of COACHING_BRANDS) {
    if (brand.id === 'study-hub' || brand.id === 'official' || brand.id === 'ncert') continue;
    const tokens = brand.label.toLowerCase().split(/[\s&/]+/).filter(Boolean);
    if (tokens.some((t) => t.length > 2 && key.includes(t))) return brand;
    if (key.includes(brand.shortLabel.toLowerCase())) return brand;
  }
  if (sourceType === 'platform' || key.includes('premium') || key.includes('study hub')) {
    return COACHING_BY_ID['study-hub'];
  }
  return null;
}

export function getCoachingChipLabel(sourceName = '', sourceType = ''): string | null {
  const brand = resolveCoachingBrand(sourceName, sourceType);
  if (brand) return brand.shortLabel;
  const cleaned = sourceName.trim();
  return cleaned ? cleaned.slice(0, 24) : null;
}

export const UNIFIED_PREMIUM_FAMILIES = [
  { key: 'upsc', name: 'UPSC CSE', shortName: 'UPSC', icon: 'upsc_cse', tone: 'violet' as const, folders: ['Syllabus', 'Previous Year Papers', 'Notes', 'Current Affairs', 'Mock Tests', 'Answer Keys', 'Strategy', 'Optional'], coachingIds: ['vision-ias', 'vajiram', 'forumias', 'nextias', 'drishti', 'insights', 'study-hub'] },
  { key: 'state-psc', name: 'State PSC', shortName: 'State PSC', icon: 'state_exam', tone: 'indigo' as const, folders: ['Syllabus', 'Previous Year Papers', 'Notes', 'State Special', 'Current Affairs', 'Mock Tests'], coachingIds: ['vision-ias', 'drishti', 'study-hub'] },
  { key: 'ssc', name: 'SSC', shortName: 'SSC', icon: 'ssc_cgl', tone: 'amber' as const, folders: ['Syllabus', 'Previous Year Papers', 'Notes', 'Quantitative Aptitude', 'Reasoning', 'English', 'GK', 'Mock Tests'], coachingIds: ['adda247', 'testbook', 'gradeup', 'mahendra', 'study-hub'] },
  { key: 'railway', name: 'Railway (RRB)', shortName: 'Railway', icon: 'railway', tone: 'cyan' as const, folders: ['Syllabus', 'Previous Year Papers', 'Notes', 'Maths', 'Reasoning', 'GK', 'Technical', 'Mock Tests'], coachingIds: ['adda247', 'testbook', 'gradeup', 'study-hub'] },
  { key: 'banking', name: 'Banking', shortName: 'Banking', icon: 'bank', tone: 'emerald' as const, folders: ['Syllabus', 'Previous Year Papers', 'Notes', 'Quantitative Aptitude', 'Reasoning', 'English', 'GA', 'Mock Tests'], coachingIds: ['adda247', 'oliveboard', 'testbook', 'gradeup', 'study-hub'] },
  { key: 'gate', name: 'GATE', shortName: 'GATE', icon: 'gate', tone: 'rose' as const, folders: ['Syllabus', 'Previous Year Papers', 'Notes', 'Engineering Mathematics', 'General Aptitude', 'Mock Tests', 'Answer Keys'], coachingIds: ['made-easy', 'ace-academy', 'gate-academy', 'ies-master', 'study-hub'] },
  { key: 'jee', name: 'JEE', shortName: 'JEE', icon: 'competitive', tone: 'blue' as const, folders: ['Syllabus', 'Previous Year Papers', 'Notes', 'Physics', 'Chemistry', 'Mathematics', 'Mock Tests'], coachingIds: ['allen', 'resonance', 'fiitjee', 'pw', 'motion', 'study-hub'] },
  { key: 'neet', name: 'NEET', shortName: 'NEET', icon: 'medical', tone: 'emerald' as const, folders: ['Syllabus', 'Previous Year Papers', 'Notes', 'Physics', 'Chemistry', 'Biology', 'Mock Tests'], coachingIds: ['allen', 'aakash', 'pw', 'motion', 'study-hub'] },
  { key: 'defence', name: 'Defence', shortName: 'Defence', icon: 'shield', tone: 'slate' as const, folders: ['Syllabus', 'Previous Year Papers', 'Notes', 'SSB', 'Mock Tests'], coachingIds: ['study-hub'] },
  { key: 'cbse', name: 'CBSE / Boards', shortName: 'CBSE', icon: 'book', tone: 'blue' as const, folders: ['NCERT Books', 'Notes', 'Sample Papers', 'Previous Year Papers', 'Syllabus'], coachingIds: ['ncert', 'study-hub'] },
] as const;

export type UnifiedFamilyKey = (typeof UNIFIED_PREMIUM_FAMILIES)[number]['key'];
