import type { StudyCard } from '../studyHubApi';
import { dedupeStudyPremiumItems } from './studyPremiumOrder';

/** Put unified premium catalog + major exams first on Study Home. */
export function sortStudyHomeRootCards(rootCards: StudyCard[]): StudyCard[] {
  const deduped = dedupeStudyPremiumItems(rootCards);

  const rank = (card: StudyCard) => {
    const key = `${card.slug || ''} ${card.name || ''}`.toLowerCase();
    if (key.includes('all-premium') || key.includes('all premium')) return 0;
    if (key.includes('upsc')) return 1;
    if (key.includes('ssc')) return 2;
    if (key.includes('railway') || key.includes('rrb')) return 3;
    if (key.includes('bank')) return 4;
    if (key.includes('gate')) return 5;
    if (key.includes('jee') || key.includes('neet')) return 6;
    if (key.includes('defence') || key.includes('cbse') || key.includes('board')) return 7;
    return 10;
  };

  return [...deduped].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

export const STUDY_HOME_SECTION_LIMIT = 10;
