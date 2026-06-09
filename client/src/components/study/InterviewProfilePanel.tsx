import {
  AcademicCapIcon,
  MapPinIcon,
  SparklesIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import type { LocalInterviewProfile } from '../../utils/studyPreferences';
import { premiumInputClassName, premiumSurfaceClassName, StudyActionLink } from './StudyPremium';

interface InterviewProfilePanelProps {
  profile: LocalInterviewProfile;
  editable?: boolean;
  onChange?: (profile: LocalInterviewProfile) => void;
  workspaceSlug?: string;
  className?: string;
}

const splitHobbies = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);

const buildSearchHref = (workspaceSlug: string, query: string) => {
  const params = new URLSearchParams({
    workspace: workspaceSlug,
    type: 'qa',
    stage: 'interview',
    q: query,
  });
  return `/app/ask?${params.toString()}`;
};

const InterviewProfilePanel = ({
  profile,
  editable = false,
  onChange,
  workspaceSlug = 'upsc-cse',
  className = '',
}: InterviewProfilePanelProps) => {
  const completed = [
    profile.homeState,
    profile.graduationStream,
    profile.hobbies.length ? 'hobbies' : '',
  ].filter(Boolean).length;
  const readiness = Math.round((completed / 3) * 100);
  const hasProfile = readiness > 0;
  const hobbyText = profile.hobbies.join(', ');

  const updateProfile = (next: Partial<LocalInterviewProfile>) => {
    onChange?.({
      ...profile,
      ...next,
    });
  };

  const quickLinks = [
    profile.homeState
      ? { label: `${profile.homeState} DAF`, query: `${profile.homeState} DAF interview questions` }
      : null,
    profile.graduationStream
      ? { label: 'Graduation DAF', query: `${profile.graduationStream} UPSC interview questions` }
      : null,
    profile.hobbies[0]
      ? { label: 'Hobby DAF', query: `${profile.hobbies[0]} hobby interview questions` }
      : null,
  ].filter(Boolean) as Array<{ label: string; query: string }>;

  return (
    <section className={[premiumSurfaceClassName, 'p-4', className].join(' ')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <UserCircleIcon className="h-5 w-5 text-blue-700 dark:text-cyan-300" aria-hidden="true" />
            <p className="text-sm font-bold uppercase tracking-wide text-blue-700 dark:text-cyan-300">
              Interview DAF profile
            </p>
          </div>
          <h2 className="mt-2 text-lg font-bold text-slate-950 dark:text-white">
            Personalize interview Q&A without clutter
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            State, graduation stream, and hobbies help the Interview tab surface sharper DAF-based questions.
          </p>
        </div>
        <div className="w-full sm:w-44">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Ready</span>
            <span>{readiness}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-2 rounded-full bg-blue-600 dark:bg-cyan-300" style={{ width: `${readiness}%` }} />
          </div>
        </div>
      </div>

      {editable ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <label className="block">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              <MapPinIcon className="h-4 w-4" aria-hidden="true" />
              Home state
            </span>
            <input
              value={profile.homeState}
              onChange={(event) => updateProfile({ homeState: event.target.value })}
              placeholder="Bihar, UP, Rajasthan..."
              className={['mt-1', premiumInputClassName].join(' ')}
            />
          </label>
          <label className="block">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              <AcademicCapIcon className="h-4 w-4" aria-hidden="true" />
              Graduation
            </span>
            <input
              value={profile.graduationStream}
              onChange={(event) => updateProfile({ graduationStream: event.target.value })}
              placeholder="B.Tech CSE, BA History..."
              className={['mt-1', premiumInputClassName].join(' ')}
            />
          </label>
          <label className="block">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              <SparklesIcon className="h-4 w-4" aria-hidden="true" />
              Hobbies
            </span>
            <input
              value={hobbyText}
              onChange={(event) => updateProfile({ hobbies: splitHobbies(event.target.value) })}
              placeholder="Reading, painting, cricket"
              className={['mt-1', premiumInputClassName].join(' ')}
            />
          </label>
        </div>
      ) : (
        <div className="mt-4">
          {hasProfile ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">State</p>
                <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{profile.homeState || 'Not set'}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Graduation</p>
                <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{profile.graduationStream || 'Not set'}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Hobbies</p>
                <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{hobbyText || 'Not set'}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
              Add DAF details once in Profile, then Interview Q&A shortcuts become more personal.
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {quickLinks.map((item) => (
              <StudyActionLink
                key={item.label}
                to={buildSearchHref(workspaceSlug, item.query)}
                variant="secondary"
                className="min-h-10 px-3"
              >
                {item.label}
              </StudyActionLink>
            ))}
            <StudyActionLink
              to="/app/profile"
              className="min-h-10 px-3"
            >
              {hasProfile ? 'Edit DAF profile' : 'Add DAF profile'}
            </StudyActionLink>
          </div>
        </div>
      )}
    </section>
  );
};

export default InterviewProfilePanel;
