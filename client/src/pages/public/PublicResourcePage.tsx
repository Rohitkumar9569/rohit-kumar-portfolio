import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import SaveResourceButton from '../../components/study/SaveResourceButton';
import { fetchStudyResource, fetchStudyResources } from '../../studyHubApi';
import {
  getFallbackResource,
  getRelatedFallbackResources,
  getStudyHubBridgeUrl,
  resourceTypeLabel,
  sourceLabel,
} from './publicPageHelpers';
import {
  SITE_NAME,
  STUDY_HUB_OG_IMAGE,
  buildBreadcrumbJsonLd,
  buildLearningResourceJsonLd,
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

const PublicResourcePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const fallbackResource = getFallbackResource(slug);

  const { data: resourceData = fallbackResource } = useQuery({
    queryKey: ['public-resource', slug],
    queryFn: () => fetchStudyResource(slug!),
    enabled: Boolean(slug),
    placeholderData: fallbackResource,
    retry: false,
    staleTime: 1000 * 60 * 10,
  });

  const resource = resourceData || fallbackResource;
  const bridgeUrl = getStudyHubBridgeUrl(resource);
  const canonicalPath = `/resources/${resource.slug || slug}`;
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const description =
    resource.summary ||
    `Access ${resource.title} with source badges, language metadata, related papers, and Study Hub app access.`;

  const { data: relatedData = getRelatedFallbackResources(resource) } = useQuery({
    queryKey: ['public-resource-related', resource.slug, resource.primaryWorkspaceId?.slug, resource.type],
    queryFn: () =>
      fetchStudyResources({
        workspace: resource.primaryWorkspaceId?.slug,
        type: resource.type,
        limit: 4,
      }),
    enabled: Boolean(resource.primaryWorkspaceId?.slug),
    placeholderData: getRelatedFallbackResources(resource),
    retry: false,
    staleTime: 1000 * 60 * 10,
  });

  const related = relatedData.filter((item) => item.slug !== resource.slug).slice(0, 3);
  const workspaceName = resource.primaryWorkspaceId?.shortName || resource.primaryWorkspaceId?.name || 'Study Hub';
  const structuredData = [
    buildBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: workspaceName, path: `/exams/${resource.primaryWorkspaceId?.slug || 'study-hub'}` },
      { name: resource.title, path: canonicalPath },
    ]),
    buildLearningResourceJsonLd(resource, canonicalPath, description),
  ];

  return (
    <>
      <Helmet>
        <title>{resource.title} | {resourceTypeLabel(resource.type)} | Study Hub</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={resource.title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={STUDY_HUB_OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={resource.title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={STUDY_HUB_OG_IMAGE} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>
      <PublicStudyShell>
        <div className="space-y-6">
          <PublicHero
            eyebrow={resourceTypeLabel(resource.type)}
            title={resource.title}
            description={description}
            visualTitle={resourceTypeLabel(resource.type)}
            visualSubtitle={workspaceName}
            badges={(
              <>
                <PublicBadge>{resourceTypeLabel(resource.type)}</PublicBadge>
                <PublicBadge>{resource.language}</PublicBadge>
                <PublicBadge>{resource.updatedFor || resource.year || 'Static core'}</PublicBadge>
              </>
            )}
            actions={(
              <>
                <Link to={bridgeUrl} className={publicPrimaryActionClassName}>
                  Open in Study Hub
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
                <SaveResourceButton
                  resource={resource}
                  label="Save later"
                  className={publicSecondaryActionClassName}
                />
              </>
            )}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <PublicMetaTile label="Source" value={sourceLabel(resource)} />
            <PublicMetaTile label="Workspace" value={workspaceName} />
            <PublicMetaTile label="Subject" value={resource.subject || resource.topic || 'General'} />
          </div>

          {related.length > 0 && (
            <PublicSection
              title="Related resources"
              icon={<DocumentTextIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {related.map((item) => (
                  <PublicResourceCard key={item._id} resource={item} />
                ))}
              </div>
            </PublicSection>
          )}
        </div>
      </PublicStudyShell>
    </>
  );
};

export default PublicResourcePage;
