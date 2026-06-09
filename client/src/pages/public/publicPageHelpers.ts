import type { StudyResource } from '../../studyHubApi';
import { fallbackResources } from '../../data/studyFallback';

export const titleFromSlug = (slug = 'resource') =>
  slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const getFallbackResource = (slug?: string, type?: StudyResource['type']): StudyResource => {
  const exact = fallbackResources.find((resource) => resource.slug === slug);
  if (exact) return exact;

  const typed = fallbackResources.find((resource) => resource.type === type);
  if (typed) {
    return {
      ...typed,
      _id: `fallback-${slug || type || 'resource'}`,
      title: titleFromSlug(slug || type || 'resource'),
      slug: slug || typed.slug,
      summary: 'This resource bridge is ready. Related content will appear here when the database has a matching published item.',
      type: type || typed.type,
    };
  }

  return {
    ...fallbackResources[0],
    _id: `fallback-${slug || 'resource'}`,
    title: titleFromSlug(slug),
    slug: slug || 'resource',
    summary: 'This Study Hub bridge is ready for direct Google, social, and app traffic.',
  };
};

export const resourceTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    pyq: 'Paper',
    notes: 'Notes',
    material: 'Study Material',
    book: 'Book',
    syllabus: 'Syllabus',
    qa: 'Q&A',
    practice: 'Practice',
    update: 'Update',
    assignment: 'Assignment',
  };
  return labels[type] || type;
};

export const sourceLabel = (resource: StudyResource) => {
  if (resource.sourceName) return resource.sourceName;
  const labels: Record<string, string> = {
    official: 'Official',
    ncert: 'NCERT standard',
    platform: 'Study Hub',
    creator: 'Creator verified',
    community: 'Community',
  };
  return labels[resource.sourceType] || resource.sourceType;
};

export const getStudyHubBridgeUrl = (resource: StudyResource) => {
  const params = new URLSearchParams();
  if (resource.primaryWorkspaceId?.slug) params.set('workspace', resource.primaryWorkspaceId.slug);
  if (resource.facets?.stage) params.set('phase', resource.facets.stage);
  if (resource.type) params.set('type', resource.type);

  const basePath = resource.type === 'pyq' ? `/app/paper/${resource.slug}` : `/app/resource/${resource.slug}`;
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
};

export const getRelatedFallbackResources = (resource: StudyResource) => {
  return fallbackResources
    .filter((item) => item.slug !== resource.slug)
    .filter((item) =>
      item.primaryWorkspaceId?.slug === resource.primaryWorkspaceId?.slug ||
      item.type === resource.type ||
      item.subject === resource.subject
    )
    .slice(0, 3);
};
