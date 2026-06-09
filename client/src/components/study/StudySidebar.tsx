import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  ArrowRightOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import ThemeToggleButton from '../ThemeToggleButton';
import {
  getPrimaryStudyNavIndex,
  getStudyRouteOwnerPath,
  readStoredStudyTabRoute,
  type StudyRouteState,
} from './studyActiveRoute';
import { drawerItems, studyNavItems } from './studyNavigation';
import StudyHubLogo from './StudyHubLogo';

const RaisedNavIcon = ({
  icon: Icon,
  activeIcon: ActiveIcon,
  isActive,
}: {
  icon: typeof studyNavItems[number]['icon'];
  activeIcon?: typeof studyNavItems[number]['activeIcon'];
  isActive: boolean;
}) => {
  const RenderIcon = isActive && ActiveIcon ? ActiveIcon : Icon;

  return (
    <span
      className={[
        'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[1rem] transition duration-200',
        isActive
          ? 'study-nav-icon-active text-slate-950'
          : 'text-slate-500 group-hover:bg-slate-100 group-hover:text-slate-950 dark:text-slate-400 dark:group-hover:bg-slate-800 dark:group-hover:text-white',
      ].join(' ')}
    >
      {isActive && (
        <span className="pointer-events-none absolute inset-0 rounded-[1rem] bg-gradient-to-br from-white/48 via-transparent to-cyan-400/16 dark:from-white/38 dark:to-cyan-100/18" />
      )}
      <RenderIcon className="relative h-5 w-5" aria-hidden="true" />
    </span>
  );
};

interface StudySidebarProps {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

const StudySidebar = ({ isCollapsed, onToggleCollapsed }: StudySidebarProps) => {
  const { isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();
  const activePath = getStudyRouteOwnerPath(
    location.pathname,
    location.search,
    location.state as StudyRouteState,
  );

  return (
    <aside
      className={[
        'study-sidebar-surface fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white py-4 transition-[width,padding] duration-200 lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-950',
        isCollapsed ? 'w-20 px-2' : 'w-64 px-3',
      ].join(' ')}
    >
      <div className={['mb-5 flex items-center gap-2', isCollapsed ? 'justify-center' : 'justify-between px-2'].join(' ')}>
        <NavLink to="/app" className="study-logo-link flex items-center gap-3" aria-label="Study Hub home">
          <StudyHubLogo compact={isCollapsed} />
        </NavLink>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="study-control-surface hidden h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:-translate-y-0.5 hover:text-slate-950 lg:inline-flex dark:text-slate-300 dark:hover:text-white"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      <div className={['study-sidebar-chip mb-4 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900', isCollapsed ? 'px-2 py-2 text-center' : 'px-3 py-2'].join(' ')}>
        <p className="truncate text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-cyan-100">
          {isCollapsed ? 'SH' : 'Study Hub'}
        </p>
      </div>

      <nav className="space-y-1">
        {studyNavItems.map((item, index) => {
          const isActive = activePath === item.to;
          const targetPath = isActive ? item.to : readStoredStudyTabRoute(item.to, item.to);
          const currentIndex = getPrimaryStudyNavIndex(activePath);
          const targetIndex = getPrimaryStudyNavIndex(item.to);
          const tabDirection = currentIndex >= 0 && targetIndex >= 0 && targetIndex !== currentIndex
            ? targetIndex > currentIndex ? 1 : -1
            : 0;

          return (
            <Link
              key={item.to}
              to={targetPath}
              replace={isActive}
              state={{ tabDirection, tabOwnerPath: item.to }}
              aria-current={isActive ? 'page' : undefined}
              aria-keyshortcuts={`Alt+${index + 1}`}
              title={`${item.label} (Alt+${index + 1})`}
              className={[
                'group flex w-full items-center rounded-xl py-2 text-sm font-semibold transition duration-200',
                isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-2.5',
                isActive
                  ? 'study-nav-active -translate-y-0.5'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white',
              ].join(' ')}
            >
              <RaisedNavIcon icon={item.icon} activeIcon={item.activeIcon} isActive={isActive} />
              {!isCollapsed && <span className="study-nav-label">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 space-y-1 pt-4">
        {drawerItems.map((item) => {
          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                [
                  'group flex w-full items-center rounded-xl py-2 text-sm font-medium transition duration-200',
                  isCollapsed ? 'justify-center px-2' : 'justify-between px-2.5',
                  isActive
                    ? 'study-nav-active'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <span className={['flex items-center', isCollapsed ? 'justify-center' : 'gap-2.5'].join(' ')}>
                  <RaisedNavIcon icon={item.icon} activeIcon={item.activeIcon} isActive={isActive} />
                  {!isCollapsed && <span className="study-nav-label">{item.label}</span>}
                </span>
              )}
            </NavLink>
          );
        })}
        {isAdmin && (
          <Link
            to="/admin"
            className={[
              'flex items-center rounded-xl py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-400/10',
              isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-2.5',
            ].join(' ')}
            title="Admin Studio"
          >
            <WrenchScrewdriverIcon className="h-5 w-5" aria-hidden="true" />
            {!isCollapsed && 'Admin Studio'}
          </Link>
        )}
      </div>

      <div className="study-sidebar-chip mt-auto space-y-1.5 rounded-2xl border border-slate-200 p-2 dark:border-slate-800">
        <div className={['flex items-center text-sm text-slate-600 dark:text-slate-400', isCollapsed ? 'justify-center' : 'justify-between'].join(' ')}>
          {!isCollapsed && <span className="font-semibold">Theme</span>}
          <ThemeToggleButton />
        </div>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={logout}
            className={[
              'flex w-full items-center rounded-xl py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-400/10',
              isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-2.5',
            ].join(' ')}
            title="Logout"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
            {!isCollapsed && 'Logout'}
          </button>
        ) : (
          <Link
            to="/login"
            className={[
              'flex items-center rounded-xl py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-400/10',
              isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-2.5',
            ].join(' ')}
            title="Login"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
            {!isCollapsed && 'Login'}
          </Link>
        )}
      </div>
    </aside>
  );
};

export default StudySidebar;
