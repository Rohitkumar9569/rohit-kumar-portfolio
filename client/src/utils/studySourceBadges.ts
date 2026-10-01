/**
 * Client-side coaching / source badge helpers.
 * Keep in sync with server/src/scripts/premiumCoachingSources.ts
 */

export type SourceBadgeVariant = 'official' | 'coaching' | 'premium' | 'ncert' | 'neutral';

export type SourceBadge = {
  label: string;
  variant: SourceBadgeVariant;
};

const COACHING_MATCHERS: Array<{ match: string[]; label: string; variant: SourceBadgeVariant }> = [
  { match: ['vision ias', 'vision'], label: 'Vision IAS', variant: 'coaching' },
  { match: ['vajiram'], label: 'Vajiram', variant: 'coaching' },
  { match: ['forumias', 'forum ias'], label: 'ForumIAS', variant: 'coaching' },
  { match: ['nextias', 'next ias'], label: 'NextIAS', variant: 'coaching' },
  { match: ['drishti'], label: 'Drishti', variant: 'coaching' },
  { match: ['insights'], label: 'Insights', variant: 'coaching' },
  { match: ['made easy', 'madeeasy'], label: 'Made Easy', variant: 'coaching' },
  { match: ['ace academy', 'ace'], label: 'ACE', variant: 'coaching' },
  { match: ['gate academy'], label: 'GATE Acad', variant: 'coaching' },
  { match: ['ies master'], label: 'IES Master', variant: 'coaching' },
  { match: ['allen'], label: 'Allen', variant: 'coaching' },
  { match: ['resonance'], label: 'Resonance', variant: 'coaching' },
  { match: ['aakash'], label: 'Aakash', variant: 'coaching' },
  { match: ['physics wallah', 'pw '], label: 'PW', variant: 'coaching' },
  { match: ['fiitjee'], label: 'FIITJEE', variant: 'coaching' },
  { match: ['motion'], label: 'Motion', variant: 'coaching' },
  { match: ['adda247', 'adda 247'], label: 'Adda247', variant: 'coaching' },
  { match: ['testbook'], label: 'Testbook', variant: 'coaching' },
  { match: ['oliveboard'], label: 'Oliveboard', variant: 'coaching' },
  { match: ['gradeup'], label: 'Gradeup', variant: 'coaching' },
  { match: ['mahendra'], label: 'Mahendra', variant: 'coaching' },
  { match: ['ncert'], label: 'NCERT', variant: 'ncert' },
  { match: ['study hub', 'premium', 'platform'], label: 'Premium', variant: 'premium' },
];

const normalize = (value = '') => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function resolveSourceBadge(sourceName = '', sourceType = ''): SourceBadge | null {
  const haystack = normalize(`${sourceType} ${sourceName}`);
  if (!haystack) return null;

  if (haystack.includes('ncert')) return { label: 'NCERT', variant: 'ncert' };

  if (
    (haystack.includes('official') ||
      ['upsc', 'cbse', 'ssc', 'rrb', 'ibps', 'sbi', 'rbi'].some((k) => haystack.includes(k))) &&
    !COACHING_MATCHERS.some((m) => m.variant === 'coaching' && m.match.some((t) => haystack.includes(t)))
  ) {
    if (haystack.includes('upsc')) return { label: 'UPSC Official', variant: 'official' };
    if (haystack.includes('cbse')) return { label: 'CBSE Official', variant: 'official' };
    return { label: 'Official', variant: 'official' };
  }

  for (const entry of COACHING_MATCHERS) {
    if (entry.match.some((t) => haystack.includes(t))) {
      return { label: entry.label, variant: entry.variant };
    }
  }

  if (sourceType === 'faculty' && sourceName.trim()) {
    return { label: sourceName.trim().slice(0, 22), variant: 'coaching' };
  }

  if (sourceType === 'platform' || haystack.includes('premium')) {
    return { label: 'Premium', variant: 'premium' };
  }

  if (sourceName.trim()) {
    return { label: sourceName.trim().slice(0, 22), variant: 'neutral' };
  }

  return null;
}

/** Chip CSS classes – matches Study Hub design language */
export function getSourceBadgeClass(variant: SourceBadgeVariant, active = false): string {
  if (active) {
    return 'border-white/25 bg-white/15 text-white dark:border-slate-950/20 dark:bg-slate-950/10 dark:text-slate-950';
  }
  switch (variant) {
    case 'official':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200';
    case 'coaching':
      return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-300/20 dark:bg-violet-300/10 dark:text-violet-200';
    case 'premium':
      return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100';
    case 'ncert':
      return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-200';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300';
  }
}
