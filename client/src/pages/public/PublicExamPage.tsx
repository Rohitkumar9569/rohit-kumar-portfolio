import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { fallbackWorkspaces } from '../../data/studyFallback';
import { fetchStudyResources, fetchStudyWorkspace } from '../../studyHubApi';
import { titleFromSlug } from './publicPageHelpers';
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
import {
  SITE_NAME,
  STUDY_HUB_OG_IMAGE,
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  toAbsoluteUrl,
} from './seoHelpers';

const getFallbackWorkspace = (slug?: string) => {
  return fallbackWorkspaces.find((workspace) => workspace.slug === slug) || {
    ...fallbackWorkspaces[0],
    _id: `fallback-${slug || 'exam'}`,
    name: titleFromSlug(slug || 'exam'),
    shortName: titleFromSlug(slug || 'exam'),
    slug: slug || 'exam',
    description: 'This public workspace page is ready for SEO and Study Hub app entry.',
  };
};

const PublicExamPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const fallbackWorkspace = getFallbackWorkspace(slug);

  const { data: workspaceData = fallbackWorkspace } = useQuery({
    queryKey: ['public-workspace', slug],
    queryFn: () => fetchStudyWorkspace(slug!),
    enabled: Boolean(slug),
    placeholderData: fallbackWorkspace,
    retry: false,
    staleTime: 1000 * 60 * 10,
  });

  const workspace = workspaceData || fallbackWorkspace;
  const canonicalPath = `/exams/${workspace.slug || slug}`;
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const description =
    workspace.description ||
    `Explore ${workspace.shortName || workspace.name} papers, notes, syllabus, practice resources, and updates in Study Hub.`;

  const { data: resources = [] } = useQuery({
    queryKey: ['public-workspace-resources', workspace.slug],
    queryFn: () => fetchStudyResources({ workspace: workspace.slug, limit: 6 }),
    enabled: Boolean(workspace.slug),
    placeholderData: [],
    retry: false,
    staleTime: 1000 * 60 * 10,
  });

  const phases = workspace.template?.phases || [];
  const structuredData = [
    buildBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Exams', path: '/app/catalog' },
      { name: workspace.shortName || workspace.name, path: canonicalPath },
    ]),
    buildCollectionPageJsonLd(workspace, canonicalPath, description, resources),
  ];

  return (
    <>
      <Helmet>
        <title>{workspace.shortName || workspace.name} Resources, PYQs, Notes and Syllabus | Study Hub</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={`${workspace.shortName || workspace.name} Study Hub`} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={STUDY_HUB_OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${workspace.shortName || workspace.name} Study Hub`} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={STUDY_HUB_OG_IMAGE} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>
      <PublicStudyShell>
        <div className="space-y-6">
          <PublicHero
            eyebrow={`${workspace.type} workspace`}
            title={workspace.shortName || workspace.name}
            description={description}
            visualTitle={workspace.shortName || workspace.name}
            visualSubtitle="Workspace"
            progress={workspace.readiness || 0}
            badges={(
              <>
                <PublicBadge>{resources.length.toLocaleString('en-IN')} resources</PublicBadge>
                <PublicBadge>{phases.length ? `${phases.length} phases` : 'Curated path'}</PublicBadge>
                <PublicBadge>Free access</PublicBadge>
              </>
            )}
            actions={(
              <>
                <Link to={`/app/workspace/${workspace.slug}`} className={publicPrimaryActionClassName}>
                  Open in Study Hub
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link to="/app/preferences" className={publicSecondaryActionClassName}>
                  Set as preference
                </Link>
              </>
            )}
          />

          {phases.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {phases.map((phase) => (
                <Link
                  key={phase.key}
                  to={`/app/workspace/${workspace.slug}?phase=${phase.key}`}
                  className={publicSecondaryActionClassName}
                >
                  {phase.label}
                </Link>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <PublicMetaTile label="Readiness" value={`${workspace.readiness || 0}%`} />
            <PublicMetaTile label="Workspace" value={workspace.category || workspace.type} />
            <PublicMetaTile label="Access" value="Free resources" />
          </div>

          {resources.length > 0 && (
            <PublicSection
              title="Featured resources"
              icon={<BookOpenIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {resources.slice(0, 6).map((resource) => (
                  <PublicResourceCard key={resource._id} resource={resource} />
                ))}
              </div>
            </PublicSection>
          )}
        </div>
      </PublicStudyShell>
    </>
  );
};

export default PublicExamPage;
