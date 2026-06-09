export type SubjectSeoHub = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  keywords: string[];
  examSlugs: string[];
  classTracks: string[];
  resourceTypes: string[];
  focusAreas: string[];
  queries: string[];
  faqs: Array<{
    question: string;
    answer: string;
  }>;
};

export const subjectSeoHubs: SubjectSeoHub[] = [
  {
    slug: 'history',
    title: 'History Study Material for UPSC, State PCS, CBSE and Competitive Exams',
    shortTitle: 'History',
    description:
      'Study History with NCERT foundations, modern history, ancient history, medieval history, world history, PYQs, notes, books, and revision resources for UPSC, State PCS, CBSE, CUET and school exams.',
    keywords: [
      'history study material',
      'UPSC history notes',
      'modern history NCERT',
      'class 11 history notes',
      'class 12 history notes',
      'history PYQ',
      'state pcs history',
    ],
    examSlugs: ['upsc-cse', 'uppsc', 'bpsc', 'rpsc-ras', 'mppsc', 'cbse-class-10', 'cbse-class-12', 'cuet-ug'],
    classTracks: ['Class 6 to 12 NCERT History', 'UPSC Prelims and Mains History', 'State PCS History', 'CUET History'],
    resourceTypes: ['NCERT books', 'PYQs', 'revision notes', 'syllabus', 'practice questions'],
    focusAreas: ['Ancient India', 'Medieval India', 'Modern India', 'World History', 'Art and Culture'],
    queries: ['history notes UPSC', 'class 11 history NCERT', 'modern history PYQ', 'BPSC history material'],
    faqs: [
      {
        question: 'Where can I study History for UPSC and State PCS?',
        answer:
          'Use the History hub to find NCERT foundations, Modern History, Ancient History, World History, PYQs, and revision notes linked with UPSC and State PCS exam paths.',
      },
      {
        question: 'Does this History page cover CBSE classes?',
        answer:
          'Yes. The page connects History resources for CBSE Class 10, Class 11, Class 12, and competitive exam foundations.',
      },
    ],
  },
  {
    slug: 'mathematics',
    title: 'Mathematics Study Material for CBSE, JEE, GATE, SSC, Banking and Placement',
    shortTitle: 'Mathematics',
    description:
      'Find Mathematics resources for NCERT classes, JEE Main, GATE Engineering Mathematics, SSC Quant, Banking Quant, aptitude tests, PYQs, formula notes and practice sets.',
    keywords: [
      'maths 11 NCERT',
      'mathematics study material',
      'engineering mathematics GATE',
      'SSC quant notes',
      'banking maths practice',
      'JEE mathematics PYQ',
      'class 10 maths sample paper',
    ],
    examSlugs: ['cbse-class-10', 'cbse-class-12', 'jee-main', 'gate-cse', 'ssc-cgl', 'banking-ibps-po', 'cat', 'tcs'],
    classTracks: ['Class 6 to 12 NCERT Mathematics', 'JEE Mathematics', 'GATE Engineering Mathematics', 'SSC and Banking Quant'],
    resourceTypes: ['NCERT books', 'formula sheets', 'PYQs', 'practice sets', 'sample papers'],
    focusAreas: ['Algebra', 'Geometry', 'Calculus', 'Probability', 'Quantitative Aptitude'],
    queries: ['maths 11 ncert', 'class 10 mathematics sample paper', 'gate engineering mathematics', 'ssc quant previous paper'],
    faqs: [
      {
        question: 'Can I use this page for Class 11 and Class 12 Mathematics?',
        answer:
          'Yes. It connects NCERT Mathematics, sample papers, and exam-oriented practice for Class 10, Class 11, Class 12, JEE and other exams.',
      },
      {
        question: 'Does the Mathematics hub include competitive exam quant?',
        answer:
          'Yes. SSC, Banking, CAT, placement aptitude and GATE Engineering Mathematics resources are grouped with relevant PYQs and practice material.',
      },
    ],
  },
  {
    slug: 'physics',
    title: 'Physics Study Material for JEE, NEET, CBSE, GATE and School Exams',
    shortTitle: 'Physics',
    description:
      'Prepare Physics with NCERT books, JEE and NEET PYQs, CBSE sample papers, formulas, chapter notes and practice resources for school and entrance exams.',
    keywords: [
      'physics study material',
      'JEE physics PYQ',
      'NEET physics notes',
      'class 11 physics NCERT',
      'class 12 physics sample paper',
      'physics formula sheet',
    ],
    examSlugs: ['jee-main', 'neet-ug', 'cbse-class-10', 'cbse-class-12', 'gate-cse', 'school-olympiads'],
    classTracks: ['Class 9 to 12 Physics', 'JEE Physics', 'NEET Physics', 'Olympiad Physics'],
    resourceTypes: ['NCERT books', 'formula notes', 'PYQs', 'sample papers', 'practice questions'],
    focusAreas: ['Mechanics', 'Electricity', 'Magnetism', 'Optics', 'Modern Physics'],
    queries: ['class 11 physics ncert', 'jee physics previous paper', 'neet physics formula', 'cbse physics sample paper'],
    faqs: [
      {
        question: 'Is Physics content useful for JEE and NEET?',
        answer:
          'Yes. The Physics hub connects NCERT foundations, formulas, previous papers and entrance-focused resources for JEE Main and NEET UG.',
      },
      {
        question: 'Can school students use this Physics hub?',
        answer:
          'Yes. CBSE and school exam Physics resources are linked with class-wise NCERT and sample paper paths.',
      },
    ],
  },
  {
    slug: 'chemistry',
    title: 'Chemistry Study Material for JEE, NEET, CBSE and Competitive Exams',
    shortTitle: 'Chemistry',
    description:
      'Study Chemistry through NCERT foundations, organic, inorganic and physical chemistry notes, PYQs, sample papers, formulas and practice resources.',
    keywords: ['chemistry notes', 'JEE chemistry PYQ', 'NEET chemistry NCERT', 'class 12 chemistry', 'organic chemistry notes'],
    examSlugs: ['jee-main', 'neet-ug', 'cbse-class-10', 'cbse-class-12', 'school-olympiads'],
    classTracks: ['Class 9 to 12 Chemistry', 'JEE Chemistry', 'NEET Chemistry'],
    resourceTypes: ['NCERT books', 'PYQs', 'formula notes', 'sample papers', 'practice questions'],
    focusAreas: ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Chemical Bonding', 'Reactions'],
    queries: ['class 12 chemistry ncert', 'jee organic chemistry', 'neet chemistry pyq'],
    faqs: [
      {
        question: 'What Chemistry resources are included?',
        answer:
          'The Chemistry hub groups NCERT books, JEE and NEET PYQs, formulas, sample papers, and chapter-wise revision resources.',
      },
    ],
  },
  {
    slug: 'biology',
    title: 'Biology Study Material for NEET, CBSE and School Exams',
    shortTitle: 'Biology',
    description:
      'Find Biology NCERT resources, NEET revision notes, diagrams, PYQs, sample papers and chapter practice for school and medical entrance preparation.',
    keywords: ['biology notes', 'NEET biology NCERT', 'class 12 biology', 'biology PYQ', 'CBSE biology sample paper'],
    examSlugs: ['neet-ug', 'cbse-class-10', 'cbse-class-12', 'school-olympiads'],
    classTracks: ['Class 9 to 12 Biology', 'NEET Biology', 'School Biology'],
    resourceTypes: ['NCERT books', 'revision notes', 'PYQs', 'sample papers', 'practice questions'],
    focusAreas: ['Human Physiology', 'Genetics', 'Ecology', 'Plant Physiology', 'Biotechnology'],
    queries: ['neet biology ncert', 'class 12 biology notes', 'biology previous year questions'],
    faqs: [
      {
        question: 'Is this Biology hub aligned with NEET?',
        answer:
          'Yes. It keeps NEET Biology and NCERT-linked school Biology resources discoverable from one public page.',
      },
    ],
  },
  {
    slug: 'geography',
    title: 'Geography Study Material for UPSC, State PCS, CBSE and CUET',
    shortTitle: 'Geography',
    description:
      'Prepare Geography with NCERT books, physical geography, Indian geography, maps, environment links, PYQs and revision resources for UPSC, State PCS and boards.',
    keywords: ['geography notes', 'UPSC geography NCERT', 'state pcs geography', 'class 11 geography', 'geography PYQ'],
    examSlugs: ['upsc-cse', 'uppsc', 'bpsc', 'rpsc-ras', 'mppsc', 'cbse-class-10', 'cbse-class-12', 'cuet-ug'],
    classTracks: ['Class 6 to 12 Geography', 'UPSC Geography', 'State PCS Geography', 'CUET Geography'],
    resourceTypes: ['NCERT books', 'maps', 'PYQs', 'revision notes', 'syllabus'],
    focusAreas: ['Physical Geography', 'Indian Geography', 'World Geography', 'Maps', 'Environment'],
    queries: ['upsc geography notes', 'class 11 geography ncert', 'state pcs geography pyq'],
    faqs: [
      {
        question: 'Does Geography include map-based preparation?',
        answer:
          'Yes. The hub is designed around NCERT, maps, physical geography, Indian geography and exam PYQs.',
      },
    ],
  },
  {
    slug: 'polity',
    title: 'Indian Polity Study Material for UPSC, State PCS and Competitive Exams',
    shortTitle: 'Polity',
    description:
      'Study Indian Polity with Constitution topics, governance, Parliament, judiciary, local government, PYQs, syllabus and revision notes for UPSC and State PCS.',
    keywords: ['indian polity notes', 'UPSC polity PYQ', 'state pcs polity', 'constitution notes', 'polity study material'],
    examSlugs: ['upsc-cse', 'uppsc', 'bpsc', 'rpsc-ras', 'mppsc', 'ssc-cgl'],
    classTracks: ['UPSC Polity', 'State PCS Polity', 'SSC General Awareness'],
    resourceTypes: ['notes', 'PYQs', 'syllabus', 'practice questions'],
    focusAreas: ['Constitution', 'Parliament', 'Judiciary', 'Governance', 'Federalism'],
    queries: ['upsc polity notes', 'indian constitution pyq', 'state pcs polity material'],
    faqs: [
      {
        question: 'Is Polity content useful for UPSC Mains?',
        answer:
          'Yes. The page connects Polity notes, syllabus, PYQs and revision resources useful for Prelims and Mains preparation.',
      },
    ],
  },
  {
    slug: 'economics',
    title: 'Economics Study Material for UPSC, State PCS, CBSE, CUET and Exams',
    shortTitle: 'Economics',
    description:
      'Access Economics and Indian Economy resources, NCERT foundations, macroeconomics, microeconomics, budget, survey, PYQs and revision notes.',
    keywords: ['economics notes', 'indian economy UPSC', 'class 12 economics', 'UPSC economy PYQ', 'CBSE economics'],
    examSlugs: ['upsc-cse', 'uppsc', 'bpsc', 'rpsc-ras', 'mppsc', 'cbse-class-12', 'cuet-ug'],
    classTracks: ['Class 11 Economics', 'Class 12 Economics', 'UPSC Economy', 'State PCS Economy'],
    resourceTypes: ['NCERT books', 'notes', 'PYQs', 'current updates', 'practice questions'],
    focusAreas: ['Indian Economy', 'Macroeconomics', 'Microeconomics', 'Budget', 'Economic Survey'],
    queries: ['upsc economy notes', 'class 12 economics ncert', 'indian economy pyq'],
    faqs: [
      {
        question: 'Does this Economics hub cover Indian Economy?',
        answer:
          'Yes. It connects Indian Economy, NCERT Economics, budget, survey and exam PYQ resources.',
      },
    ],
  },
  {
    slug: 'computer-science',
    title: 'Computer Science Study Material for GATE, CBSE, B.Tech and Placement',
    shortTitle: 'Computer Science',
    description:
      'Find Computer Science resources for GATE CSE, DBMS, operating systems, DSA, computer networks, programming, CBSE CS, B.Tech and placement preparation.',
    keywords: ['computer science notes', 'GATE CSE notes', 'DBMS notes', 'operating system notes', 'DSA placement'],
    examSlugs: ['gate-cse', 'btech-cse', 'cbse-class-12', 'tcs', 'infosys', 'wipro', 'amazon-off-campus', 'microsoft-hiring-track'],
    classTracks: ['GATE CSE', 'B.Tech CSE', 'CBSE Computer Science', 'Placement CS'],
    resourceTypes: ['notes', 'PYQs', 'practice questions', 'interview Q&A', 'syllabus'],
    focusAreas: ['DSA', 'DBMS', 'Operating Systems', 'Computer Networks', 'Programming'],
    queries: ['gate cse dbms notes', 'operating system pyq', 'dsa placement practice'],
    faqs: [
      {
        question: 'Can this page help with GATE CSE and placements?',
        answer:
          'Yes. It connects GATE CSE subjects with placement-oriented DSA, programming and interview resources.',
      },
    ],
  },
  {
    slug: 'reasoning',
    title: 'Reasoning Study Material for SSC, Banking, Railway, CAT and Placement',
    shortTitle: 'Reasoning',
    description:
      'Practice reasoning with SSC, Banking, Railway, CAT, placement aptitude, puzzles, seating arrangement, logical reasoning, PYQs and practice sets.',
    keywords: ['reasoning practice', 'SSC reasoning PYQ', 'banking reasoning', 'railway reasoning', 'placement reasoning'],
    examSlugs: ['ssc-cgl', 'ssc-chsl', 'railway-rrb-ntpc', 'banking-ibps-po', 'cat', 'tcs', 'infosys', 'wipro'],
    classTracks: ['SSC Reasoning', 'Banking Reasoning', 'Railway Reasoning', 'Placement Reasoning'],
    resourceTypes: ['practice questions', 'PYQs', 'notes', 'mock sets'],
    focusAreas: ['Puzzles', 'Seating Arrangement', 'Syllogism', 'Series', 'Logical Reasoning'],
    queries: ['ssc reasoning questions', 'banking reasoning practice', 'placement logical reasoning'],
    faqs: [
      {
        question: 'What exams use this Reasoning hub?',
        answer:
          'It is designed for SSC, Banking, Railway, CAT and placement aptitude reasoning practice.',
      },
    ],
  },
  {
    slug: 'aptitude',
    title: 'Aptitude Study Material for Placement, SSC, Banking, CAT and Competitive Exams',
    shortTitle: 'Aptitude',
    description:
      'Prepare aptitude with quant, reasoning, CSAT, placement tests, CAT QA, SSC and Banking practice sets, PYQs, formulas and interview-ready drills.',
    keywords: ['aptitude practice', 'placement aptitude', 'CSAT aptitude', 'CAT quant', 'SSC quant practice'],
    examSlugs: ['upsc-cse', 'ssc-cgl', 'banking-ibps-po', 'cat', 'tcs', 'infosys', 'wipro', 'accenture-drive-prep'],
    classTracks: ['Placement Aptitude', 'SSC Quant', 'Banking Quant', 'UPSC CSAT', 'CAT QA'],
    resourceTypes: ['practice questions', 'formula notes', 'PYQs', 'mock sets'],
    focusAreas: ['Number System', 'Arithmetic', 'Data Interpretation', 'Logical Aptitude', 'CSAT'],
    queries: ['placement aptitude questions', 'upsc csat aptitude', 'cat quant practice'],
    faqs: [
      {
        question: 'Does this Aptitude hub cover placement preparation?',
        answer:
          'Yes. TCS, Infosys, Wipro, Accenture and general placement aptitude resources are connected with competitive exam quant practice.',
      },
    ],
  },
  {
    slug: 'english',
    title: 'English Study Material for SSC, Banking, CDS, CBSE and Placement',
    shortTitle: 'English',
    description:
      'Study English grammar, comprehension, vocabulary, writing, SSC English, Banking English, CDS English, CBSE English and placement communication resources.',
    keywords: ['english grammar notes', 'SSC English PYQ', 'banking English', 'CDS English', 'CBSE English'],
    examSlugs: ['ssc-cgl', 'ssc-chsl', 'banking-ibps-po', 'upsc-cds', 'cbse-class-10', 'cbse-class-12', 'tcs'],
    classTracks: ['SSC English', 'Banking English', 'CDS English', 'CBSE English', 'Placement English'],
    resourceTypes: ['notes', 'PYQs', 'practice questions', 'books'],
    focusAreas: ['Grammar', 'Vocabulary', 'Comprehension', 'Writing', 'Communication'],
    queries: ['ssc english notes', 'banking english practice', 'cds english pyq'],
    faqs: [
      {
        question: 'Which exams are covered in the English hub?',
        answer:
          'The English hub links SSC, Banking, CDS, CBSE and placement English resources with notes and practice material.',
      },
    ],
  },
];

export const defaultSubjectSeoHub = subjectSeoHubs[0];

export const findSubjectSeoHub = (slug?: string) =>
  subjectSeoHubs.find((hub) => hub.slug === slug) || null;
