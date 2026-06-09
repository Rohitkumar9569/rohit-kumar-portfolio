import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRightIcon,
  BookOpenIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { fallbackResources } from '../../data/studyFallback';
import { fetchStudyResources, type StudyResource } from '../../studyHubApi';
import { resourceTypeLabel } from '../../pages/public/publicPageHelpers';
import { premiumSurfaceClassName, StudyActionLink } from './StudyPremium';

interface SyllabusBridgePanelProps {
  resource: StudyResource;
}

const cleanNodeLabel = (value: string) => {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getReaderHref = (resource: StudyResource) => {
  return resource.type === 'pyq' ? `/app/paper/${resource.slug}` : `/app/resource/${resource.slug}`;
};

const SyllabusBridgePanel = ({ resource }: SyllabusBridgePanelProps) => {
  const bridgeNodes = useMemo(() => {
    const values = [
      ...(resource.syllabusNodes || []),
      ...(resource.topic ? [resource.topic] : []),
      ...(resource.subject ? [resource.subject] : []),
      ...(resource.tags || []).slice(0, 4),
    ];

    return Array.from(new Set(values.filter(Boolean))).slice(0, 8);
  }, [resource]);

  const primaryQuery = bridgeNodes[0] || resource.topic || resource.subject || resource.title;
  const workspaceSlug = resource.primaryWorkspaceId?.slug;

  const { data: mappedData = [] } = useQuery({
    queryKey: ['syllabus-bridge', resource.slug, workspaceSlug, primaryQuery],
    queryFn: () =>
      fetchStudyResources({
        q: primaryQuery,
        workspace: workspaceSlug,
        limit: 8,
      }),
    enabled: Boolean(primaryQuery),
    placeholderData: fallbackResources.filter((item) => {
      const sameWorkspace = item.primaryWorkspaceId?.slug === workspaceSlug;
      const sameSubject = item.subject && item.subject === resource.subject;
      const sameTopic = item.topic && item.topic === resource.topic;
      return item.slug !== resource.slug && (sameWorkspace || sameSubject || sameTopic);
    }),
    staleTime: 1000 * 60 * 5,
  });

  const mappedResources = (mappedData.length ? mappedData : fallbackResources)
    .filter((item) => item.slug !== resource.slug)
    .filter((item) => {
      if (!workspaceSlug) return true;
      return item.primaryWorkspaceId?.slug === workspaceSlug || item.subject === resource.subject;
    })
    .slice(0, 4);

  return (
    <section className={[premiumSurfaceClassName, 'p-4'].join(' ')}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-cyan-400/10 dark:text-cyan-300">
          <BookOpenIcon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-cyan-300">
            Syllabus bridge
          </p>
          <h2 className="mt-1 font-bold text-slate-950 dark:text-white">
            Topic to resource mapping
          </h2>
        </div>
      </div>

      {bridgeNodes.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {bridgeNodes.map((node) => (
            <Link
              key={node}
              to={`/app/ask?q=${encodeURIComponent(cleanNodeLabel(node))}${workspaceSlug ? `&workspace=${workspaceSlug}` : ''}`}
              className="rounded-2xl bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {cleanNodeLabel(node)}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {mappedResources.length > 0 ? (
          mappedResources.map((item) => (
            <Link
              key={item._id}
              to={getReaderHref(item)}
              className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              <DocumentTextIcon className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-cyan-300" aria-hidden="true" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-500">{resourceTypeLabel(item.type)}</span>
                <p className="mt-0.5 line-clamp-2 text-sm font-bold text-slate-950 dark:text-white">
                  {item.title}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 p-3 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No mapped resource yet
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Request this exact syllabus point and it will stay linked to this workspace.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StudyActionLink
          to={`/app/ask?q=${encodeURIComponent(primaryQuery)}${workspaceSlug ? `&workspace=${workspaceSlug}` : ''}`}
          variant="secondary"
          className="min-h-10 px-3"
        >
          <MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />
          Explore
        </StudyActionLink>
        <StudyActionLink
          to={`/app/contribute?title=${encodeURIComponent(`${cleanNodeLabel(primaryQuery)} resources`)}&workspace=${workspaceSlug || ''}&type=notes&subject=${encodeURIComponent(resource.subject || resource.topic || '')}`}
          className="min-h-10 px-3"
        >
          Request
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </StudyActionLink>
      </div>
    </section>
  );
};

export default SyllabusBridgePanel;
