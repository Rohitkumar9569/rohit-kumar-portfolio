import { Link, useLocation } from 'react-router-dom';

const labels: Record<string, string> = {
  '/app/profile': 'Profile',
  '/app/preferences': 'Profile',
  '/app/contribute': 'Upload or Request Content',
};

const StudyComingSoonPage = () => {
  const location = useLocation();
  const title = labels[location.pathname] || 'Study Hub';

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-bold uppercase tracking-wide text-blue-700 dark:text-cyan-300">
        Coming next
      </p>
      <h1 className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
        The shell route is ready so this feature can be implemented without changing the navigation structure later.
      </p>
      <Link
        to="/app"
        className="mt-5 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-slate-950"
      >
        Back to Home
      </Link>
    </section>
  );
};

export default StudyComingSoonPage;
