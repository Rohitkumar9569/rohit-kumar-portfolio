import type { StudyResource, StudyWorkspace } from '../../studyHubApi';

export const SITE_URL = (
  (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) ||
  'https://rohitkumar-portfolio.vercel.app'
).replace(/\/$/, '');

export const SITE_NAME = 'Rohit Kumar Study Hub';
export const SITE_DESCRIPTION =
  'Rohit Kumar Study Hub is a free exam preparation workspace for UPSC, GATE, CBSE, JEE, NEET, SSC, State PCS, PYQs, notes, books, syllabus, subject hubs, and practice resources.';
export const STUDY_HUB_OG_IMAGE = `${SITE_URL}/icon-512x512.png`;
export const ROHIT_PROFILE_IMAGE = 'https://res.cloudinary.com/dlcvljnnu/image/upload/v1759951140/profile-photo_dznr2x.webp';

export const toAbsoluteUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const getSeoResourceTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    pyq: 'Previous year paper',
    notes: 'Notes',
    material: 'Study material',
    book: 'Book',
    syllabus: 'Syllabus',
    qa: 'Interview Q&A',
    practice: 'Practice questions',
    update: 'Exam update',
    assignment: 'Assignment',
  };
  return labels[type] || type;
};

export const buildBreadcrumbJsonLd = (items: Array<{ name: string; path: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: toAbsoluteUrl(item.path),
  })),
});

export const buildSiteJsonLd = () => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': `${SITE_URL}/#person`,
      name: 'Rohit Kumar',
      alternateName: ['Rohit Study Hub', 'RK Study Hub', 'Rohit Kumar Study Hub'],
      url: SITE_URL,
      image: ROHIT_PROFILE_IMAGE,
      jobTitle: 'Full-Stack Developer and Educator',
      description: 'Rohit Kumar is the creator of Rohit Kumar Study Hub, sharing free study resources and portfolios for UPSC, GATE, CBSE, JEE, NEET, SSC, State PCS, and placement prep.',
      alumniOf: {
        '@type': 'CollegeOrUniversity',
        name: 'Gurukul Kangri Vishwavidyalaya',
      },
      sameAs: [
        'https://github.com/Rohitkumar9569',
        'https://www.linkedin.com/in/rohit-kumar-bba12b25b/',
        'https://www.youtube.com/@RohitKumarStudyHub',
        'https://x.com/RohitKumar7348',
      ],
      knowsAbout: [
        'MERN Stack',
        'React',
        'Node.js',
        'MongoDB',
        'Data Science',
        'GATE preparation',
        'UPSC preparation',
        'CBSE resources',
        'History study material',
        'Mathematics study material',
        'Physics study material',
        'State PCS preparation',
        'Placement aptitude',
      ],
    },
    {
      '@type': 'EducationalOrganization',
      '@id': `${SITE_URL}/#study-hub`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: STUDY_HUB_OG_IMAGE,
      founder: { '@id': `${SITE_URL}/#person` },
      description: SITE_DESCRIPTION,
      sameAs: [
        'https://github.com/Rohitkumar9569/rohit-kumar-portfolio',
        'https://www.linkedin.com/in/rohit-kumar-bba12b25b/',
        'https://www.youtube.com/@RohitKumarStudyHub',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: [
        'Study Hub',
        'Rohit Study Hub',
        'RK Study Hub',
        'Sarathi Study Hub',
        'Rohit Kumar Portfolio',
        'Rohit Kumar Study Hub',
      ],
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      about: [
        'UPSC preparation',
        'GATE preparation',
        'CBSE resources',
        'History study material',
        'Mathematics study material',
        'Physics study material',
        'State PCS preparation',
        'Placement aptitude',
      ],
      publisher: { '@id': `${SITE_URL}/#study-hub` },
      inLanguage: 'en-IN',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/app/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ],
});

export const buildLearningResourceJsonLd = (
  resource: StudyResource,
  path: string,
  description: string
) => ({
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  '@id': `${toAbsoluteUrl(path)}#resource`,
  name: resource.title,
  description,
  url: toAbsoluteUrl(path),
  inLanguage: resource.language,
  learningResourceType: getSeoResourceTypeLabel(resource.type),
  educationalUse: resource.type === 'pyq' ? 'exam preparation' : 'self study',
  about: resource.subject || resource.topic || resource.tags?.join(', '),
  keywords: resource.tags?.join(', '),
  isAccessibleForFree: true,
  provider: {
    '@type': 'EducationalOrganization',
    '@id': `${SITE_URL}/#study-hub`,
    name: SITE_NAME,
    url: SITE_URL,
  },
  isPartOf: resource.primaryWorkspaceId
    ? {
      '@type': 'Course',
      name: resource.primaryWorkspaceId.shortName || resource.primaryWorkspaceId.name,
      url: toAbsoluteUrl(`/exams/${resource.primaryWorkspaceId.slug}`),
    }
    : undefined,
});

export const buildCollectionPageJsonLd = (
  workspace: StudyWorkspace,
  path: string,
  description: string,
  resources: StudyResource[] = []
) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${toAbsoluteUrl(path)}#collection`,
  name: `${workspace.shortName || workspace.name} resources`,
  description,
  url: toAbsoluteUrl(path),
  isPartOf: {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
  },
  about: workspace.category || workspace.type,
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: resources.slice(0, 10).map((resource, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: resource.title,
      url: toAbsoluteUrl(resource.type === 'pyq' ? `/papers/${resource.slug}` : `/resources/${resource.slug}`),
    })),
  },
});
