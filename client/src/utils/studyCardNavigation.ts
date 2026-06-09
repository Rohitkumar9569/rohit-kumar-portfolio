import type { StudyCard, StudyCardFile } from '../studyHubApi';

type StudyCardShortcutInput = Pick<StudyCard, 'childCount' | 'files' | 'goalType' | 'name'>;

const normalizeTitle = (value = '') => value.trim().replace(/\s+/g, ' ');

export const getSingleFileShortcut = (card: StudyCardShortcutInput): StudyCardFile | null => {
  const childCount = typeof card.childCount === 'number' ? card.childCount : 1;
  const files = card.files || [];

  return childCount === 0 && files.length === 1 ? files[0] : null;
};

export const getStudyCardDisplayTitle = (card: StudyCardShortcutInput) => {
  const singleFile = getSingleFileShortcut(card);

  if (card.goalType === 'subject') {
    return normalizeTitle(singleFile?.subject || card.name) || card.name;
  }

  return normalizeTitle(singleFile?.name || card.name) || card.name;
};
