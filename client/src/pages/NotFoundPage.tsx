import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRightIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';

const NotFoundPage = () => (
  <>
    <Helmet>
      <title>Page Not Found | Rohit Kumar Study Hub</title>
      <meta name="robots" content="noindex,follow" />
    </Helmet>
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-white">
    <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
      <div className="w-full rounded-3xl border border-slate-200/80 bg-white p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)] ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_28px_90px_rgba(0,0,0,0.48)] dark:ring-white/5 sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300">
          <MagnifyingGlassIcon className="h-8 w-8" aria-hidden="true" />
        </div>
        <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">
          Page not found
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          This path is not available
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">
          The page may have moved. Continue from the app home, catalog, or portfolio.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <Link
            to="/app"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            <HomeIcon className="h-4 w-4" aria-hidden="true" />
            Study Hub
          </Link>
          <Link
            to="/app/catalog"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-100"
          >
            <Squares2X2Icon className="h-4 w-4" aria-hidden="true" />
            Catalog
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-100"
          >
            Portfolio
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
    </main>
  </>
);

export default NotFoundPage;
