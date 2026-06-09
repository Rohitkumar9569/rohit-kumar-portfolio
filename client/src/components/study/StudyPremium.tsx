import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

export const premiumSurfaceClassName =
  'study-panel-surface rounded-3xl border border-slate-200/90 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.10)] ring-1 ring-slate-950/[0.035] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_22px_54px_rgba(0,0,0,0.42)] dark:ring-white/5';

export const premiumCardClassName =
  'study-card-surface rounded-3xl border border-slate-200/90 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.10)] ring-1 ring-slate-950/[0.035] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_58px_rgba(15,23,42,0.15)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_22px_54px_rgba(0,0,0,0.44)] dark:ring-white/5 dark:hover:border-slate-700';

export const premiumInputClassName =
  'study-input-surface w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-500/10 dark:border-slate-800 dark:bg-slate-950/60 dark:text-white dark:focus:border-cyan-400/50';

export const StudyCardSkeletonGrid = ({
  count = 8,
  className = '',
  tileClassName = '',
}: {
  count?: number;
  className?: string;
  tileClassName?: string;
}) => (
  <div
    role="status"
    aria-live="polite"
    className={[
      'grid grid-cols-2 gap-2 sm:gap-2.5 md:grid-cols-4 lg:grid-cols-5',
      className,
    ].join(' ')}
  >
    <span className="sr-only">Loading study cards</span>
    {Array.from({ length: count }).map((_, index) => (
      <article
        key={index}
        aria-hidden="true"
        className={[
          'study-card-surface study-skeleton-surface h-40 overflow-hidden rounded-[1.25rem] border border-slate-200/90 p-2.5 shadow-[0_14px_32px_rgba(15,23,42,0.095)] ring-1 ring-slate-950/[0.03] dark:border-slate-800 dark:ring-white/5 sm:h-[10.25rem] sm:p-3 lg:h-[10.5rem]',
          tileClassName,
        ].join(' ')}
      >
        <div className="mx-auto mt-2 h-[4.85rem] w-[5.25rem] rounded-2xl bg-slate-200/90 dark:bg-white/10 sm:h-[5.15rem] sm:w-[5.65rem]" />
        <div className="mx-auto mt-3 h-4 w-3/4 rounded-full bg-slate-200/90 dark:bg-white/10" />
        <div className="mx-auto mt-2 h-3 w-1/2 rounded-full bg-slate-200/80 dark:bg-white/10" />
      </article>
    ))}
  </div>
);

type StudyPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
};

export const StudyPageHeader = ({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className = '',
}: StudyPageHeaderProps) => (
  <section className={[premiumSurfaceClassName, 'p-5', className].join(' ')}>
    <div className={aside ? 'grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-stretch' : ''}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">
            {description}
          </p>
        )}
        {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
      </div>
      {aside}
    </div>
  </section>
);

export const StudySectionHeader = ({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex items-end justify-between gap-3 px-1">
    <div className="min-w-0">
      {eyebrow && (
        <p className="hidden text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300 sm:block">
          {eyebrow}
        </p>
      )}
      <h2 className="truncate text-xl font-black text-slate-950 dark:text-white">{title}</h2>
      {description && (
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{description}</p>
      )}
    </div>
    {action}
  </div>
);

export const StudyEmptyState = ({
  icon,
  eyebrow,
  title,
  description,
  actions,
}: {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <section className={[premiumSurfaceClassName, 'p-6 text-center'].join(' ')}>
    {icon && (
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300">
        {icon}
      </div>
    )}
    {eyebrow && (
      <p className="mt-5 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
        {eyebrow}
      </p>
    )}
    <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{title}</h2>
    {description && (
      <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">
        {description}
      </p>
    )}
    {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
  </section>
);

const actionBaseClassName =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-cyan-500/15';

const actionVariantClassName = {
  primary: 'study-primary-action bg-slate-950 text-white shadow-lg shadow-slate-950/10 hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200',
  secondary: 'study-control-surface border border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-100',
  danger: 'border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-red-400/10 dark:hover:text-red-300',
};

type StudyActionVariant = keyof typeof actionVariantClassName;

export const StudyActionLink = ({
  variant = 'primary',
  className = '',
  ...props
}: LinkProps & { variant?: StudyActionVariant }) => (
  <Link
    {...props}
    className={[actionBaseClassName, actionVariantClassName[variant], className].join(' ')}
  />
);

export const StudyActionButton = ({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: StudyActionVariant }) => (
  <button
    {...props}
    className={[
      actionBaseClassName,
      actionVariantClassName[variant],
      'disabled:cursor-not-allowed disabled:opacity-60',
      className,
    ].join(' ')}
  />
);
