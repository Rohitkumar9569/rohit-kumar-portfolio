export interface StudyPriorityItem {
  _id?: string;
  name?: string;
  slug?: string;
  order?: number;
  childCount?: number;
  files?: unknown[];
}

const normalizeStudyPriorityKey = (value = '') =>
  value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const premiumPriorityHints: Array<[RegExp, number]> = [
  [/\bupsc\b.*\bcse\b|\bcivil services\b|\bias\b/, 10],
  [/\bgate\b.*\bcse\b|\bgate\b.*\bcs\b/, 18],
  [/\bgate\b/, 20],
  [/\bcbse\b|\bncert\b/, 30],
  [/\buppcs\b|\buppsc\b|\bup pcs\b|\buttar pradesh\b.*\bpcs\b|\buttar pradesh public service commission\b/, 40],
  [/\bjee\b.*\bmain\b|\bjee\b/, 50],
  [/\bneet\b/, 60],
  [/\bssc\b.*\bcgl\b/, 70],
  [/\brailway\b|\brrb\b/, 80],
  [/\bbanking\b|\bibps\b|\bsbi\b|\brbi\b/, 90],
  [/\bnda\b/, 100],
  [/\bcds\b/, 110],
  [/\bdefence\b|\bcapf\b|\bafcat\b/, 120],
  [/\bjudiciary\b/, 130],
  [/\bpolice\b/, 140],
  [/\bplacement\b|\bprivate\b/, 150],
];

const rootPriorityHints: Array<[RegExp, number]> = [
  [/\bcompetitive exams?\b/, 200],
  [/\bentrance exams?\b/, 210],
  [/\bschool boards?\b/, 220],
  [/\bstate exams?\b/, 230],
  [/\bplacement\b|\bprivate\b/, 240],
  [/\buniversity exams?\b/, 250],
];

export const getStudyPremiumPriority = (item: StudyPriorityItem) => {
  const key = normalizeStudyPriorityKey(`${item.name || ''} ${item.slug || ''}`);
  const rootMatch = rootPriorityHints.find(([pattern]) => pattern.test(key));
  if (rootMatch) return rootMatch[1];

  const premiumMatch = premiumPriorityHints.find(([pattern]) => pattern.test(key));
  if (premiumMatch) return premiumMatch[1];

  return 1000;
};

export const compareStudyPremiumItems = <T extends StudyPriorityItem>(a: T, b: T) =>
  getStudyPremiumPriority(a) - getStudyPremiumPriority(b) ||
  (a.order || 0) - (b.order || 0) ||
  normalizeStudyPriorityKey(a.name || a.slug || '').localeCompare(
    normalizeStudyPriorityKey(b.name || b.slug || ''),
    undefined,
    { numeric: true, sensitivity: 'base' },
  );

export const sortStudyPremiumItems = <T extends StudyPriorityItem>(items: T[] = []) =>
  [...items].sort(compareStudyPremiumItems);

const getDuplicateGroupKey = (item: StudyPriorityItem) => {
  const nameKey = normalizeStudyPriorityKey(item.name || '');
  const slugKey = normalizeStudyPriorityKey(item.slug || '');

  if (
    nameKey === 'jee' ||
    slugKey === 'jee' ||
    nameKey === 'iit jee' ||
    nameKey === 'joint entrance examination' ||
    nameKey === 'jee main advanced' ||
    slugKey === 'jee main advanced'
  ) {
    return 'jee-main-advanced';
  }

  if (/^neet ug$/.test(nameKey) || /^neet ug$/.test(slugKey) || /^neet$/.test(nameKey) || /^neet$/.test(slugKey)) {
    return 'neet';
  }

  return '';
};

const getCanonicalPreference = (item: StudyPriorityItem) => {
  const key = normalizeStudyPriorityKey(`${item.name || ''} ${item.slug || ''}`);
  if (key.includes('jee main advanced')) return 0;
  if (key.includes('neet') && !key.includes('ug')) return 0;
  return 10;
};

const getContentWeight = (item: StudyPriorityItem) =>
  (item.childCount || 0) * 10 + (item.files?.length || 0);

const shouldReplaceDuplicate = <T extends StudyPriorityItem>(current: T, next: T) => {
  const currentPreference = getCanonicalPreference(current);
  const nextPreference = getCanonicalPreference(next);
  if (nextPreference !== currentPreference) return nextPreference < currentPreference;

  const currentContent = getContentWeight(current);
  const nextContent = getContentWeight(next);
  if (nextContent !== currentContent) return nextContent > currentContent;

  return compareStudyPremiumItems(next, current) < 0;
};

export const dedupeStudyPremiumItems = <T extends StudyPriorityItem>(items: T[] = []) => {
  const uniqueItems: T[] = [];
  const duplicateGroups = new Map<string, T>();

  for (const item of items) {
    const groupKey = getDuplicateGroupKey(item);
    if (!groupKey) {
      uniqueItems.push(item);
      continue;
    }

    const current = duplicateGroups.get(groupKey);
    if (!current || shouldReplaceDuplicate(current, item)) {
      duplicateGroups.set(groupKey, item);
    }
  }

  return sortStudyPremiumItems([...uniqueItems, ...duplicateGroups.values()]);
};
