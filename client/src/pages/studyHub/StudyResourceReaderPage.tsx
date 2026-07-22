import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  LinkIcon,
  ArrowTopRightOnSquareIcon,
  ShieldCheckIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import SaveResourceButton from '../../components/study/SaveResourceButton';
import PremiumMarkdown from '../../components/study/PremiumMarkdown';
import {
  premiumSurfaceClassName,
  StudyActionButton,
  StudyActionLink,
  StudyPageHeader,
} from '../../components/study/StudyPremium';
import SyllabusBridgePanel from '../../components/study/SyllabusBridgePanel';
import StudyPdfReaderFrame from '../../components/study/StudyPdfReaderFrame';
import { fallbackResources } from '../../data/studyFallback';
import { fetchStudyResource, fetchStudyResources, type StudyResource } from '../../studyHubApi';
import {
  getFallbackResource,
  getRelatedFallbackResources,
  resourceTypeLabel,
  sourceLabel,
} from '../public/publicPageHelpers';
import { saveLocalLibraryItem, toLocalLibraryItem } from '../../utils/studyLibrary';
import {
  cacheStudyResourceFile,
  getCachedStudyResourceObjectUrl,
  getResourceFileUrl,
  isStudyResourceFileCached,
} from '../../utils/studyOfflineCache';
import { addRecentStudyResource } from '../../utils/studyActivity';

const getReaderHref = (resource: StudyResource) => {
  return resource.type === 'pyq' ? `/app/paper/${resource.slug}` : `/app/resource/${resource.slug}`;
};

const isPdfUrl = (url?: string) => Boolean(url?.toLowerCase().split('?')[0].endsWith('.pdf'));

const metaItemsFor = (resource: StudyResource) => [
  ['Workspace', resource.primaryWorkspaceId?.shortName || resource.primaryWorkspaceId?.name || 'Study Hub'],
  ['Subject', resource.subject || resource.topic || 'General'],
  ['Stage', resource.facets?.stage || resource.facets?.paper || 'Core'],
  ['Year', resource.year || resource.updatedFor || 'Static'],
];

const StudyResourceReaderPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const routeLooksLikePaper = location.pathname.includes('/paper/');
  const fallbackResource = getFallbackResource(slug, routeLooksLikePaper ? 'pyq' : undefined);
  const [isOfflineSaved, setOfflineSaved] = useState(false);
  const [isCaching, setCaching] = useState(false);
  const [cachedObjectUrl, setCachedObjectUrl] = useState<string | null>(null);

  const { data: resourceData = fallbackResource } = useQuery({
    queryKey: ['study-reader-resource', slug],
    queryFn: () => fetchStudyResource(slug!),
    enabled: Boolean(slug),
    placeholderData: fallbackResource,
    retry: false,
    staleTime: 1000 * 60 * 10,
  });

  const resource = resourceData || fallbackResource;
  const fileUrl = getResourceFileUrl(resource);
  const previewUrl = cachedObjectUrl || fileUrl;
  const isPdf = isPdfUrl(fileUrl);
  const hasRichContent = Boolean(resource.content?.trim());

  const { data: relatedData = getRelatedFallbackResources(resource) } = useQuery({
    queryKey: ['study-reader-related', resource.slug, resource.primaryWorkspaceId?.slug, resource.type],
    queryFn: () =>
      fetchStudyResources({
        workspace: resource.primaryWorkspaceId?.slug,
        type: resource.type,
        limit: 5,
      }),
    enabled: Boolean(resource.primaryWorkspaceId?.slug),
    placeholderData: getRelatedFallbackResources(resource),
    retry: false,
    staleTime: 1000 * 60 * 10,
  });

  const related = (relatedData.length ? relatedData : fallbackResources)
    .filter((item) => item.slug !== resource.slug)
    .slice(0, 4);

  useEffect(() => {
    addRecentStudyResource(resource);
  }, [resource]);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;
    setCachedObjectUrl(null);

    isStudyResourceFileCached(resource)
      .then((cached) => {
        if (isMounted) setOfflineSaved(cached);
        if (!cached) return null;
        return getCachedStudyResourceObjectUrl(resource);
      })
      .then((url) => {
        if (!url) return;
        objectUrl = url;
        if (isMounted) setCachedObjectUrl(url);
      })
      .catch(() => {
        if (isMounted) setOfflineSaved(false);
      });

    return () => {
      isMounted = false;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [resource]);

  const handleOfflineSave = async () => {
    if (isCaching) return;
    setCaching(true);

    try {
      const cached = await cacheStudyResourceFile(resource);
      const item = toLocalLibraryItem(resource, 'downloaded');
      await saveLocalLibraryItem({
        ...item,
        offline: {
          available: true,
          cachedAt: cached.cachedAt,
          sizeBytes: cached.sizeBytes,
        },
      });
      setOfflineSaved(true);
      const url = await getCachedStudyResourceObjectUrl(resource);
      if (url) setCachedObjectUrl(url);
      toast.success('Resource cached for offline reading');
    } catch (error) {
      await saveLocalLibraryItem(toLocalLibraryItem(resource, 'saved'));
      toast.success('Saved to Library. File cache will work when a downloadable file is available.');
    } finally {
      setCaching(false);
    }
  };

  return (
    <div className="space-y-5">
      <StudyPageHeader
        eyebrow={resourceTypeLabel(resource.type)}
        title={resource.title}
        description={resource.summary || 'Focused reading surface with source metadata, offline controls, and related resources.'}
        actions={(
          <>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-100"
            >
              <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
              Back
            </button>
            <span className="inline-flex min-h-11 items-center rounded-2xl bg-emerald-50 px-4 text-sm font-black capitalize text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
              {resource.language}
            </span>
            <span className="inline-flex min-h-11 items-center rounded-2xl bg-amber-50 px-4 text-sm font-black text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
              {sourceLabel(resource)}
            </span>
          </>
        )}
        aside={(
          <div className="flex h-full shrink-0 flex-wrap content-start gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <SaveResourceButton
              resource={resource}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            />
            <StudyActionButton
              type="button"
              onClick={handleOfflineSave}
              disabled={isCaching}
            >
              {isOfflineSaved ? (
                <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
              )}
              {isCaching ? 'Saving...' : isOfflineSaved ? 'Offline ready' : 'Save offline'}
            </StudyActionButton>
          </div>
        )}
      />

      <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className={[premiumSurfaceClassName, 'min-h-[68vh] overflow-hidden'].join(' ')}>
          {previewUrl && isPdf ? (
            <div className="h-[78vh] overflow-hidden rounded-2xl">
              <StudyPdfReaderFrame
                title={resource.title}
                fileUrl={previewUrl}
                downloadUrl={fileUrl || undefined}
              />
            </div>
          ) : hasRichContent ? (
            <article className="mx-auto max-w-4xl px-5 py-6 sm:px-7">
              <div className="mb-5 flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-cyan-300">
                <BookOpenIcon className="h-5 w-5" aria-hidden="true" />
                Premium reading mode
              </div>
              <PremiumMarkdown content={resource.content || ''} />
            </article>
          ) : (
            <div className="flex min-h-[68vh] items-center justify-center px-5 py-8">
              <div className="max-w-xl text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-cyan-400/10 dark:text-cyan-300">
                  <DocumentTextIcon className="h-7 w-7" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-950 dark:text-white">
                  Reader is ready for this resource
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  File or rich content is not attached yet. You can save the metadata, request the missing file, or ask for related cards.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <StudyActionLink
                    to={`/app/contribute?title=${encodeURIComponent(resource.title)}&workspace=${resource.primaryWorkspaceId?.slug || ''}&type=${resource.type}&subject=${encodeURIComponent(resource.subject || resource.topic || '')}`}
                  >
                    Request file
                  </StudyActionLink>
                  <StudyActionLink
                    to={`/app/ask?q=${encodeURIComponent(resource.title)}`}
                    variant="secondary"
                  >
                    Ask related
                  </StudyActionLink>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <SyllabusBridgePanel resource={resource} />

          <section className={[premiumSurfaceClassName, 'p-4'].join(' ')}>
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
              <h2 className="font-bold text-slate-950 dark:text-white">Resource trust</h2>
            </div>
            <div className="grid gap-3">
              {metaItemsFor(resource).map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0 dark:border-slate-800"
                >
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
                  <span className="text-right text-sm font-bold capitalize text-slate-800 dark:text-slate-200">{value}</span>
                </div>
              ))}
            </div>
          </section>

          {resource.tags?.length ? (
            <section className={[premiumSurfaceClassName, 'p-4'].join(' ')}>
              <div className="mb-3 flex items-center gap-2">
                <TagIcon className="h-5 w-5 text-blue-700 dark:text-cyan-300" aria-hidden="true" />
                <h2 className="font-bold text-slate-950 dark:text-white">Tags</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {resource.tags.slice(0, 12).map((tag) => (
                  <Link
                    key={tag}
                    to={`/app/ask?q=${encodeURIComponent(tag)}`}
                    className="rounded-2xl bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {resource.externalLinks?.length ? (
            <section className={[premiumSurfaceClassName, 'p-4'].join(' ')}>
              <div className="mb-3 flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-blue-700 dark:text-cyan-300" aria-hidden="true" />
                <h2 className="font-bold text-slate-950 dark:text-white">Links</h2>
              </div>
              <div className="space-y-2">
                {resource.externalLinks.map((link) => (
                  <a
                    key={`${link.label}-${link.url}`}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {link.label}
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          {related.length > 0 && (
            <section className={[premiumSurfaceClassName, 'p-4'].join(' ')}>
              <h2 className="font-bold text-slate-950 dark:text-white">Related</h2>
              <div className="mt-3 space-y-2">
                {related.map((item) => (
                  <Link
                    key={item._id}
                    to={getReaderHref(item)}
                    className="block rounded-2xl border border-slate-100 p-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    <span className="text-xs font-bold text-blue-700 dark:text-cyan-300">
                      {resourceTypeLabel(item.type)}
                    </span>
                    <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{item.title}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </section>
    </div>
  );
};

export default StudyResourceReaderPage;