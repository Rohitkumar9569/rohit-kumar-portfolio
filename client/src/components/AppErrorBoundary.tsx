import React, { type ErrorInfo, type ReactNode } from 'react';
import {
  ArrowPathIcon,
  HomeIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  message: string;
  isImportError: boolean;
};

const chunkRecoverySessionKey = 'studyhub-import-recovery-attempted';

const isLikelyImportError = (error: Error) => {
  const message = `${error.name || ''} ${error.message || ''}`;
  return [
    'Failed to fetch dynamically imported module',
    'dynamically imported module',
    'Importing a module script failed',
    'ChunkLoadError',
    'Loading chunk',
  ].some((pattern) => message.includes(pattern));
};

const clearStudyHubRuntimeCaches = async () => {
  if (typeof window === 'undefined' || !('caches' in window)) return;

  const cacheKeys = await window.caches.keys();
  await Promise.all(
    cacheKeys
      .filter((key) => key.startsWith('study-hub-'))
      .map((key) => window.caches.delete(key))
  );
};

class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: '',
    isImportError: false,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Something went wrong.',
      isImportError: isLikelyImportError(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application error boundary caught an error:', error, info);

    if (
      isLikelyImportError(error) &&
      typeof window !== 'undefined' &&
      window.sessionStorage.getItem(chunkRecoverySessionKey) !== 'true'
    ) {
      window.sessionStorage.setItem(chunkRecoverySessionKey, 'true');
      void clearStudyHubRuntimeCaches().finally(() => window.location.reload());
    }
  }

  private retry = () => {
    if (this.state.isImportError) {
      window.sessionStorage.removeItem(chunkRecoverySessionKey);
      void clearStudyHubRuntimeCaches().finally(() => window.location.reload());
      return;
    }

    this.setState({ hasError: false, message: '', isImportError: false });
  };

  private goTo = (path: string) => {
    window.location.assign(path);
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-white">
        <section className="w-full max-w-xl rounded-3xl border border-slate-200/80 bg-white p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_28px_90px_rgba(0,0,0,0.52)] dark:ring-white/5 sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300">
            <ArrowPathIcon className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">
            Recovery mode
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Something needs a refresh</h1>
          <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">
            The app caught an unexpected issue and kept the page from crashing.
          </p>
          {this.state.message && (
            <p className="mx-auto mt-4 max-w-md truncate rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
              {this.state.message}
            </p>
          )}

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={this.retry}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
              Retry
            </button>
            <button
              type="button"
              onClick={() => this.goTo('/app')}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-100"
            >
              <Squares2X2Icon className="h-4 w-4" aria-hidden="true" />
              Study Hub
            </button>
            <button
              type="button"
              onClick={() => this.goTo('/')}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-100"
            >
              <HomeIcon className="h-4 w-4" aria-hidden="true" />
              Portfolio
            </button>
          </div>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
