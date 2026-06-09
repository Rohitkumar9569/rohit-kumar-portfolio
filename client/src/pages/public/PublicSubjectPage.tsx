import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BookOpenIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { fallbackResources, fallbackWorkspaces } from '../../data/studyFallback';
import {
  defaultSubjectSeoHub,
  findSubjectSeoHub,
  subjectSeoHubs,
  type SubjectSeoHub,
} from '../../data/subjectSeo';
import { resourceTypeLabel } from './publicPageHelpers';
import {
  SITE_NAME,
  STUDY_HUB_OG_IMAGE,
  buildBreadcrumbJsonLd,
  toAbsoluteUrl,
} from './seoHelpers';
import {
  PublicBadge,
  PublicHero,
  PublicMetaTile,
  PublicResourceCard,
  PublicSection,
  PublicStudyShell,
  publicPrimaryActionClassName,
  publicSecondaryActionClassName,
} from './PublicStudyPremium';

const normalize = (value = '') => value.toLowerCase();

const getWorkspaceBySlug = (slug: string) =>
  fallbackWorkspaces.find((workspace) => workspace.slug === slug);

const matchesSubject = (hub: SubjectSeoHub, value = '') => {
  const nextValue = normalize(value);
  if (!nextValue) return false;

  return [
    hub.shortTitle,
    hub.slug,
    ...hub.keywords,
    ...hub.focusAreas,
  ].some((keyword) => nextValue.includes(normalize(keyword).replace(/\s+study material$/, '')));
};

const getSubjectResources = (hub: SubjectSeoHub) => {
  const resources = fallbackResources.filter((resource) => (
    matchesSubject(hub, resource.title) ||
    matchesSubject(hub, resource.subject) ||
    matchesSubject(hub, resource.topic) ||
    resource.tags?.some((tag) => matchesSubject(hub, tag)) ||
    hub.examSlugs.includes(resource.primaryWorkspaceId?.slug || '')
  ));

  return resources.slice(0, 6);
};

const buildSubjectJsonLd = (hub: SubjectSeoHub, path: string) => {
  const resources = getSubjectResources(hub);

  return [
    buildBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Subjects', path: '/subjects' },
      { name: hub.shortTitle, path },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${toAbsoluteUrl(path)}#subject`,
      name: hub.title,
      description: hub.description,
      url: toAbsoluteUrl(path),
      isPartOf: {
        '@type': 'WebSite',
        '@id': `${toAbsoluteUrl('/')}#website`,
        name: SITE_NAME,
      },
      about: hub.shortTitle,
      keywords: hub.keywords.join(', '),
      educationalLevel: hub.classTracks.join(', '),
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: [
          ...hub.examSlugs.map((slug, index) => {
            const workspace = getWorkspaceBySlug(slug);
            return {
              '@type': 'ListItem',
              position: index + 1,
              name: workspace?.shortName || workspace?.name || slug,
              url: toAbsoluteUrl(`/exams/${slug}`),
            };
          }),
          ...resources.map((resource, index) => ({
            '@type': 'ListItem',
            position: hub.examSlugs.length + index + 1,
            name: resource.title,
            url: toAbsoluteUrl(resource.type === 'pyq' ? `/papers/${resource.slug}` : `/resources/${resource.slug}`),
          })),
        ],
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: hub.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
  ];
};

const SubjectDirectory = () => {
  const canonicalUrl = toAbsoluteUrl('/subjects');
  const description =
    'Browse Study Hub subject pages for History, Mathematics, Physics, Chemistry, Biology, Geography, Polity, Economics, Computer Science, Reasoning, Aptitude and English.';

  return (
    <>
      <Helmet>
        <title>Subjects | UPSC, CBSE, GATE, State PCS and Placement Study Material</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content="Subjects | Study Hub" />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={STUDY_HUB_OG_IMAGE} />
        <script type="application/ld+json">
          {JSON.stringify([
            buildBreadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Subjects', path: '/subjects' },
            ]),
            {
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: 'Study Hub Subjects',
              description,
              url: canonicalUrl,
              mainEntity: {
                '@type': 'ItemList',
                itemListElement: subjectSeoHubs.map((hub, index) => ({
                  '@type': 'ListItem',
                  position: index + 1,
                  name: hub.shortTitle,
                  url: toAbsoluteUrl(`/subjects/${hub.slug}`),
                })),
              },
            },
          ])}
        </script>
      </Helmet>
      <PublicStudyShell>
        <div className="space-y-6">
          <PublicHero
            eyebrow="Subject directory"
            title="Study material by subject"
            description={description}
            visualTitle="Subjects"
            visualSubtitle="UPSC, boards, entrance, placement"
            badges={(
              <>
                <PublicBadge>Free access</PublicBadge>
                <PublicBadge>{subjectSeoHubs.length} subjects</PublicBadge>
                <PublicBadge>PYQs + notes + books</PublicBadge>
              </>
            )}
            actions={(
              <Link to={`/subjects/${defaultSubjectSeoHub.slug}`} className={publicPrimaryActionClassName}>
                Start with History
                <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          />

          <PublicSection
            title="Popular subject hubs"
            icon={<BookOpenIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />}
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {subjectSeoHubs.map((hub) => (
                <Link
                  key={hub.slug}
                  to={`/subjects/${hub.slug}`}
                  className="group rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/5 transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-[0_24px_70px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-950/60 dark:ring-white/5"
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
                    Subject
                  </p>
                  <h2 className="mt-3 text-xl font-black text-slate-950 dark:text-white">{hub.shortTitle}</h2>
                  <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">
                    {hub.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-cyan-700 dark:text-cyan-300">
                    Open subject
                    <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </PublicSection>
        </div>
      </PublicStudyShell>
    </>
  );
};

const PublicSubjectPage = () => {
  const { slug } = useParams<{ slug?: string }>();

  if (!slug) return <SubjectDirectory />;

  const hub = findSubjectSeoHub(slug) || defaultSubjectSeoHub;
  const canonicalPath = `/subjects/${hub.slug}`;
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const appSearchUrl = `/app/search?q=${encodeURIComponent(hub.shortTitle.toLowerCase())}`;
  const resources = getSubjectResources(hub);
  const relatedExams = hub.examSlugs.map(getWorkspaceBySlug).filter(Boolean);
  const structuredData = buildSubjectJsonLd(hub, canonicalPath);

  return (
    <>
      <Helmet>
        <title>{hub.shortTitle} Study Material | UPSC, CBSE, GATE, State PCS and PYQs</title>
        <meta name="description" content={hub.description} />
        <meta name="keywords" content={hub.keywords.join(', ')} />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={hub.title} />
        <meta property="og:description" content={hub.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={STUDY_HUB_OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={hub.title} />
        <meta name="twitter:description" content={hub.description} />
        <meta name="twitter:image" content={STUDY_HUB_OG_IMAGE} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>
      <PublicStudyShell>
        <div className="space-y-6">
          <PublicHero
            eyebrow="Subject hub"
            title={hub.title}
            description={hub.description}
            visualTitle={hub.shortTitle}
            visualSubtitle="PYQs, notes, books, syllabus"
            progress={88}
            badges={(
              <>
                <PublicBadge>{hub.shortTitle}</PublicBadge>
                <PublicBadge>{relatedExams.length} exam paths</PublicBadge>
                <PublicBadge>Free access</PublicBadge>
              </>
            )}
            actions={(
              <>
                <Link to={appSearchUrl} className={publicPrimaryActionClassName}>
                  Search {hub.shortTitle}
                  <MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link to="/subjects" className={publicSecondaryActionClassName}>
                  All subjects
                </Link>
              </>
            )}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <PublicMetaTile label="Best for" value={hub.classTracks.slice(0, 2).join(', ')} />
            <PublicMetaTile label="Resources" value={hub.resourceTypes.slice(0, 3).join(', ')} />
            <PublicMetaTile label="Search examples" value={hub.queries.slice(0, 2).join(', ')} />
          </div>

          <PublicSection
            title={`${hub.shortTitle} exam paths`}
            icon={<AcademicCapIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {relatedExams.map((workspace) => workspace && (
                <Link
                  key={workspace.slug}
                  to={`/exams/${workspace.slug}`}
                  className="group rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm ring-1 ring-slate-950/5 transition hover:-translate-y-0.5 hover:border-cyan-300 dark:border-slate-800 dark:bg-slate-950/60 dark:ring-white/5"
                >
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {workspace.category || workspace.type}
                  </p>
                  <h2 className="mt-2 text-base font-black text-slate-950 dark:text-white">
                    {workspace.shortName || workspace.name}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    {workspace.description}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-black text-cyan-700 dark:text-cyan-300">
                    Open exam
                    <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </PublicSection>

          <PublicSection
            title={`${hub.shortTitle} focus areas`}
            icon={<BookOpenIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {hub.focusAreas.map((area) => (
                <Link
                  key={area}
                  to={`/app/search?q=${encodeURIComponent(area)}`}
                  className="rounded-3xl border border-slate-200/80 bg-white p-4 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:text-cyan-300"
                >
                  {area}
                </Link>
              ))}
            </div>
          </PublicSection>

          {resources.length > 0 && (
            <PublicSection
              title={`Featured ${hub.shortTitle} resources`}
              icon={<DocumentTextIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {resources.map((resource) => (
                  <PublicResourceCard key={resource._id} resource={resource} />
                ))}
              </div>
            </PublicSection>
          )}

          <PublicSection
            title="Resource types"
            icon={<DocumentTextIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />}
          >
            <div className="flex flex-wrap gap-2">
              {hub.resourceTypes.map((type) => (
                <PublicBadge key={type}>{resourceTypeLabel(type) === type ? type : resourceTypeLabel(type)}</PublicBadge>
              ))}
            </div>
          </PublicSection>
        </div>
      </PublicStudyShell>
    </>
  );
};

export default PublicSubjectPage;
