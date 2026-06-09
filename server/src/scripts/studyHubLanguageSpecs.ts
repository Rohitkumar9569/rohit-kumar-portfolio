import type { StudyCardGoalType, StudyCardTone } from '../models/StudyCard';

export type StudyHubLanguageSpec = {
  category: string;
  family: string;
  exam: string;
  icon: string;
  goalType?: StudyCardGoalType;
  branches: string[];
  aliases?: string[];
  tone?: StudyCardTone;
};

export const detailedLanguageSpecs: StudyHubLanguageSpec[] = [
  {
    category: 'Foreign Language',
    family: 'English Tests',
    exam: 'IELTS',
    icon: 'ielts',
    tone: 'cyan',
    aliases: [
      'International English Language Testing System',
      'IELTS Academic',
      'IELTS General Training',
      'IELTS GT',
      'IELTS Listening',
      'IELTS Reading',
      'IELTS Writing',
      'IELTS Speaking',
      'Band 9 IELTS',
    ],
    branches: [
      'Overview / Academic and General Training',
      'Syllabus / Listening',
      'Syllabus / Reading Academic',
      'Syllabus / Reading General Training',
      'Syllabus / Writing Task 1 Academic',
      'Syllabus / Writing Task 1 General',
      'Syllabus / Writing Task 2 Essay',
      'Syllabus / Speaking Part 1 2 3',
      'Practice Tests / Listening Full Tests',
      'Practice Tests / Reading Academic',
      'Practice Tests / Reading General',
      'Writing Samples / Task 1 Academic Graphs',
      'Writing Samples / Task 1 GT Letters',
      'Writing Samples / Task 2 Band 9 Essays',
      'Speaking / Part 1 Common Topics',
      'Speaking / Part 2 Cue Cards',
      'Speaking / Part 3 Discussion Questions',
      'Vocabulary / Academic Word List',
      'Grammar / Common Errors',
      'Band Score Guide / Band 6 to 8',
      'Strategy / Reading Tips',
      'Strategy / Writing Tips',
      'Strategy / Speaking Tips',
      'Strategy / Listening Tips',
      'Mock Tests / Full Mock',
      'Updates / Test Dates',
    ],
  },
];
