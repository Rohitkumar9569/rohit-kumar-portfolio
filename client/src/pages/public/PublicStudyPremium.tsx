import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  BookOpenIcon,
  DocumentTextIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import Logo from '../../components/Logo';
import type { StudyResource } from '../../studyHubApi';
import { resourceTypeLabel, sourceLabel } from './publicPageHelpers';

export const publicPrimaryActionClassName =
  'site-primary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition hover:-translate-y-0.5';

export const publicSecondaryActionClassName =
  'site-secondary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition hover:-translate-y-0.5';

const publicSurfaceClassName =
  'rounded-[2rem] border border-slate-200/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_28px_90px_rgba(0,0,0,0.46)] dark:ring-white/5';

export const PublicStudyShell = ({ children }: { children: ReactNode }) => (
  <main className="public-study-premium min-h-screen text-slate-950 dark:text-white">
    <header className="public-study-header sticky top-0 z-40 border-b px-4 py-3 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center gap-3">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <Logo />
          <span className="hidden min-w-0 sm:block">
            <span className="block text-sm font-black leading-none">Study Hub</span>
            <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">
              Rohit Kumar
            </span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/app/catalog" className="hidden rounded-2xl px-3 py-2 text-sm font-black text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white sm:inline-flex">
            Catalog
          </Link>
          <Link to="/subjects" className="hidden rounded-2xl px-3 py-2 text-sm font-black text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white sm:inline-flex">
            Subjects
          </Link>
          <Link to="/app/ask" className="hidden rounded-2xl px-3 py-2 text-sm font-black text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white sm:inline-flex">
            Ask
          </Link>
          <Link to="/app" className={publicPrimaryActionClassName}>
            Open App
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </nav>
    </header>
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {children}
    </div>
  </main>
);

export const PublicHero = ({
  eyebrow,
  title,
  description,
  badges,
  actions,
  visualTitle,
  visualSubtitle,
  progress,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badges?: ReactNode;
  actions?: ReactNode;
  visualTitle?: string;
  visualSubtitle?: string;
  progress?: number;
}) => {
  const safeProgress = Math.min(100, Math.max(0, progress || 0));

  return (
    <section className={[publicSurfaceClassName, 'overflow-hidden p-5 sm:p-7'].join(' ')}>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-stretch">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-600 dark:text-slate-400">
            {description}
          </p>
          {badges && <div className="mt-5 flex flex-wrap gap-2">{badges}</div>}
          {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
        </div>

        <aside className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex h-full min-h-[17rem] flex-col">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                <SparklesIcon className="h-4 w-4 text-cyan-600 dark:text-cyan-300" aria-hidden="true" />
                Study Mode
              </span>
              <img
                src="/icon-512x512.png"
                alt=""
                className="h-12 w-12 rounded-2xl border border-white/80 bg-white object-cover shadow-lg shadow-slate-950/10 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>

            <div className="mt-auto">
              <div className="rounded-3xl border border-white/80 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
                  {visualSubtitle || 'Free exam resources'}
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                  {visualTitle || 'Study Hub'}
                </h2>
                {typeof progress === 'number' && (
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500 dark:text-slate-400">
                      <span>Readiness</span>
                      <span>{safeProgress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${safeProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

export const PublicBadge = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex min-h-9 items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
    {children}
  </span>
);

export const PublicMetaTile = ({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) => (
  <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm shadow-slate-950/5 ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900/80 dark:ring-white/5">
    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-2 text-sm font-black capitalize text-slate-950 dark:text-white">{value}</p>
  </div>
);

export const PublicSection = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) => (
  <section className={[publicSurfaceClassName, 'p-5'].join(' ')}>
    <div className="mb-4 flex items-center gap-2">
      {icon || <BookOpenIcon className="h-5 w-5 text-cyan-700 dark:text-cyan-300" aria-hidden="true" />}
      <h2 className="text-lg font-black text-slate-950 dark:text-white">{title}</h2>
    </div>
    {children}
  </section>
);

export const PublicResourceCard = ({ resource }: { resource: StudyResource }) => (
  <Link
    to={resource.type === 'pyq' ? `/papers/${resource.slug}` : `/resources/${resource.slug}`}
    className="group flex min-h-[188px] flex-col rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_16px_44px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/5 transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-[0_24px_70px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-950/60 dark:ring-white/5 dark:hover:border-cyan-400/50"
  >
    <div className="flex items-start justify-between gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300">
        <DocumentTextIcon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        {resourceTypeLabel(resource.type)}
      </span>
    </div>
    <h3 className="mt-4 line-clamp-2 text-base font-black leading-snug text-slate-950 dark:text-white">
      {resource.title}
    </h3>
    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">
      {resource.summary || resource.subject || sourceLabel(resource)}
    </p>
    <div className="mt-auto flex items-center justify-between border-t border-slate-200 pt-3 text-xs font-black uppercase tracking-wide text-cyan-700 dark:border-slate-800 dark:text-cyan-300">
      Open
      <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
    </div>
  </Link>
);
