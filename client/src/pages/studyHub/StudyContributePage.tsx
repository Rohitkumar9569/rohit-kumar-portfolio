import type { FormEvent } from 'react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowRightIcon,
  ChatBubbleBottomCenterTextIcon,
  DocumentPlusIcon,
  LinkIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import {
  createStudyResourceRequest,
  type StudyResource,
  type StudyResourceRequestPayload,
} from '../../studyHubApi';
import { getResourceVisual } from '../../components/study/StudyVisualCards';

const LOCAL_QUEUE_KEY = 'study-hub-request-queue';
const PLATFORM_WORKSPACE_SLUG = 'study-hub';

const resourceTypeOptions: Array<{ key: StudyResource['type']; label: string; hint: string }> = [
  { key: 'pyq', label: 'PYQ', hint: 'Paper' },
  { key: 'notes', label: 'Notes', hint: 'Study' },
  { key: 'material', label: 'Material', hint: 'Folder' },
  { key: 'book', label: 'Book', hint: 'Read' },
  { key: 'syllabus', label: 'Syllabus', hint: 'Roadmap' },
  { key: 'qa', label: 'Q&A', hint: 'Doubt' },
  { key: 'practice', label: 'Practice', hint: 'Test' },
  { key: 'update', label: 'Update', hint: 'News' },
];

const labelClassName = 'text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400';

const inputShellClassName =
  'study-input-surface mt-2 flex min-h-14 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-500/10 dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[0_18px_42px_rgba(0,0,0,0.34)]';

const inputClassName =
  'min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-950 outline-none placeholder:text-slate-400 dark:text-white sm:text-sm';

const queueRequestLocally = (payload: StudyResourceRequestPayload) => {
  if (typeof window === 'undefined') return;

  const stored = window.localStorage.getItem(LOCAL_QUEUE_KEY);
  const current = stored ? JSON.parse(stored) as Array<StudyResourceRequestPayload & { queuedAt: string }> : [];
  window.localStorage.setItem(
    LOCAL_QUEUE_KEY,
    JSON.stringify([{ ...payload, queuedAt: new Date().toISOString() }, ...current].slice(0, 20))
  );
};

const StudyContributePage = () => {
  const [searchParams] = useSearchParams();
  const [isSubmitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState(searchParams.get('title') || '');
  const [subject, setSubject] = useState(searchParams.get('subject') || '');
  const [sourceUrl, setSourceUrl] = useState(searchParams.get('source') || '');
  const [message, setMessage] = useState('');
  const [resourceType, setResourceType] = useState<StudyResource['type']>(
    (searchParams.get('type') as StudyResource['type']) || 'notes'
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedSourceUrl = sourceUrl.trim();
    if (trimmedSourceUrl) {
      try {
        const parsedUrl = new URL(trimmedSourceUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          toast.error('Enter a valid source link');
          return;
        }
      } catch {
        toast.error('Enter a valid source link');
        return;
      }
    }

    const payload: StudyResourceRequestPayload = {
      title: title.trim(),
      workspaceSlug: PLATFORM_WORKSPACE_SLUG,
      resourceType,
      subject: subject.trim(),
      sourceUrl: trimmedSourceUrl,
      message: message.trim(),
    };

    if (!payload.title) {
      toast.error('Enter a title');
      return;
    }

    setSubmitting(true);
    try {
      await createStudyResourceRequest(payload);
      toast.success('Request submitted');
      setTitle('');
      setSubject('');
      setSourceUrl('');
      setMessage('');
    } catch {
      queueRequestLocally(payload);
      toast.success('Saved locally for review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-none space-y-5 px-0 pb-24 lg:pb-0">
      <div className="grid w-full gap-5 lg:items-start">
        <form
          id="study-content-request-form"
          onSubmit={handleSubmit}
          className="w-full"
        >
          <div className="grid w-full gap-5 md:grid-cols-2">
            <label className="block">
              <span className={labelClassName}>Title</span>
              <span className={inputShellClassName}>
                <DocumentPlusIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="NCERT Class 10 History Book"
                  className={inputClassName}
                  maxLength={180}
                />
              </span>
            </label>

            <label className="block">
              <span className={labelClassName}>Location</span>
              <span className={inputShellClassName}>
                <MapPinIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="School Boards / CBSE / Class 10 / History"
                  className={inputClassName}
                  maxLength={120}
                />
              </span>
            </label>

            <label className="block">
              <span className={labelClassName}>Source link</span>
              <span className={inputShellClassName}>
                <LinkIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                <input
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://ncert.nic.in/textbook.php"
                  className={inputClassName}
                  maxLength={900}
                />
              </span>
            </label>

            <div className="md:col-span-2">
              <span className={labelClassName}>Type</span>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
                {resourceTypeOptions.map((option) => {
                  const visual = getResourceVisual(option.key);
                  const Icon = visual.icon;
                  const isSelected = resourceType === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setResourceType(option.key)}
                      aria-pressed={isSelected}
                      className={[
                        'group min-h-[5.4rem] rounded-[1.15rem] border px-3 py-3 text-left transition focus:outline-none focus:ring-4 focus:ring-cyan-500/15',
                        isSelected
                          ? 'border-slate-950 bg-slate-950 text-white shadow-[0_16px_34px_rgba(15,23,42,0.16)] dark:border-white dark:bg-white dark:text-slate-950'
                          : 'border-white/80 bg-white text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700',
                      ].join(' ')}
                    >
                      <span className={[
                        'mb-2 flex h-9 w-9 items-center justify-center rounded-xl transition group-hover:-translate-y-0.5',
                        isSelected
                          ? 'bg-white/15 text-white dark:bg-slate-950/10 dark:text-slate-950'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
                      ].join(' ')}>
                        {visual.iconUrl ? (
                          <img src={visual.iconUrl} alt="" loading="lazy" className="h-6 w-6 object-contain" />
                        ) : (
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        )}
                      </span>
                      <span className="block text-sm font-black">{option.label}</span>
                      <span className={['mt-1 block text-xs font-bold', isSelected ? 'text-white/70 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'].join(' ')}>
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block md:col-span-2">
              <span className={labelClassName}>Details</span>
              <span className="study-input-surface mt-2 flex min-h-40 w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-500/10 dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[0_18px_42px_rgba(0,0,0,0.34)]">
                <ChatBubbleBottomCenterTextIcon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Year, language, source, or exact missing folder."
                  className={[inputClassName, 'min-h-28 resize-y'].join(' ')}
                  maxLength={1000}
                />
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="study-primary-action study-submit-request-button hidden min-h-13 w-fit min-w-[14rem] max-w-full items-center justify-center gap-2 justify-self-center rounded-full px-8 text-sm font-black transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2 lg:inline-flex"
            >
              {isSubmitting ? 'Submitting...' : 'Submit request'}
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>

      <div className="study-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-[#eef3f8]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3 shadow-[0_-16px_36px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#050814]/95 dark:shadow-[0_-18px_44px_rgba(0,0,0,0.38)] lg:hidden">
        <button
          type="submit"
          form="study-content-request-form"
          disabled={isSubmitting}
          className="study-primary-action study-submit-request-button mx-auto inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full px-5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-md"
        >
          {isSubmitting ? 'Submitting...' : 'Submit request'}
          <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default StudyContributePage;
