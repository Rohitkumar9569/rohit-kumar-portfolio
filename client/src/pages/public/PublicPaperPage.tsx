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

const PublicPaperPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const fallbackPaper = getFallbackResource(slug, 'pyq');

  const { data: paperData = fallbackPaper } = useQuery({
    queryKey: ['public-paper', slug],
    queryFn: () => fetchStudyResource(slug!),
    enabled: Boolean(slug),
    placeholderData: fallbackPaper,
    retry: false,
    staleTime: 1000 * 60 * 10,
  });

  const paper = paperData || fallbackPaper;
  const bridgeUrl = getStudyHubBridgeUrl(paper);
  const canonicalPath = `/papers/${paper.slug || slug}`;
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const description =
    paper.summary ||
    `Open ${paper.title} with direct Study Hub viewer access, metadata, download options, and related resources.`;

  const { data: relatedData = getRelatedFallbackResources(paper) } = useQuery({
    queryKey: ['public-paper-related', paper.slug, paper.primaryWorkspaceId?.slug],
    queryFn: () =>
      fetchStudyResources({
        workspace: paper.primaryWorkspaceId?.slug,
        type: 'pyq',
        limit: 4,
      }),
    enabled: Boolean(paper.primaryWorkspaceId?.slug),
    placeholderData: getRelatedFallbackResources(paper),
    retry: false,
    staleTime: 1000 * 60 * 10,
  });

  const related = relatedData.filter((item) => item.slug !== paper.slug).slice(0, 3);
  const workspaceName = paper.primaryWorkspaceId?.shortName || paper.primaryWorkspaceId?.name || 'Study Hub';
  const structuredData = [
    buildBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: workspaceName, path: `/exams/${paper.primaryWorkspaceId?.slug || 'study-hub'}` },
      { name: paper.title, path: canonicalPath },
    ]),
    buildLearningResourceJsonLd(paper, canonicalPath, description),
  ];

  return (
    <>
      <Helmet>
        <title>{paper.title} PDF, Analysis and Solutions | Study Hub</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={paper.title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={STUDY_HUB_OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={paper.title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={STUDY_HUB_OG_IMAGE} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>
      <PublicStudyShell>
        <div className="space-y-6">
          <PublicHero
            eyebrow="Previous year paper"
            title={paper.title}
            description={description}
            visualTitle={paper.year ? String(paper.year) : 'PYQ'}
            visualSubtitle={workspaceName}
            badges={(
              <>
                <PublicBadge>Paper</PublicBadge>
                <PublicBadge>{sourceLabel(paper)}</PublicBadge>
                <PublicBadge>{paper.year || paper.updatedFor || 'Previous paper'}</PublicBadge>
              </>
            )}
            actions={(
              <>
                <Link to={bridgeUrl} className={publicPrimaryActionClassName}>
                  Open in Study Hub
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
                <SaveResourceButton
                  resource={paper}
                  status="downloaded"
                  icon="download"
                  label="Save offline"
                  savedLabel="Offline saved"
                  className={publicSecondaryActionClassName}
                />
              </>
            )}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <PublicMetaTile label="Workspace" value={workspaceName} />
            <PublicMetaTile label="Stage" value={paper.facets?.stage || 'paper'} />
            <PublicMetaTile label="Subject" value={paper.subject || paper.facets?.paper || 'General'} />
          </div>

          {related.length > 0 && (
            <PublicSection
              title="More papers"
              icon={<DocumentTextIcon className="h-5 w-5 text-slate-700 dark:text-slate-300" aria-hidden="true" />}
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

export default PublicPaperPage;
