import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { studyNavItems } from './studyNavigation';
import {
  getPrimaryStudyNavIndex,
  getStudyRouteOwnerPath,
  readStoredStudyTabRoute,
  type StudyRouteState,
} from './studyActiveRoute';
import {
  STUDY_QUERY_STALE_TIME_MS,
  fetchStudyCards,
  studyCardQueryKey,
} from '../../studyHubApi';
import { triggerImpact, triggerSelection } from '../../utils/mobileHaptics';

const PLATFORM_WORKSPACE_SLUG = 'study-hub';

const preloadStudyTabModule = (path: string) => {
  if (path === '/app') void import('../../pages/studyHub/StudyHomePage');
  if (path === '/app/catalog') void import('../../pages/studyHub/StudyDiscoverPage');
  if (path === '/app/ask') void import('../../pages/studyHub/StudySearchPage');
  if (path === '/app/library') void import('../../pages/studyHub/StudyLibraryPage');
};

const MobileBottomNav = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const activePath = getStudyRouteOwnerPath(
    location.pathname,
    location.search,
    location.state as StudyRouteState,
  );

  const prefetchTab = (path: string) => {
    preloadStudyTabModule(path);
    if (path !== '/app' && path !== '/app/catalog') return;

    const rootCardsQueryKey = studyCardQueryKey(PLATFORM_WORKSPACE_SLUG, 'root');
    if (queryClient.getQueryData(rootCardsQueryKey)) return;

    void queryClient.prefetchQuery({
      queryKey: rootCardsQueryKey,
      queryFn: () => fetchStudyCards({ workspace: PLATFORM_WORKSPACE_SLUG, parent: 'root' }),
      staleTime: STUDY_QUERY_STALE_TIME_MS,
    });
  };

  return (
    <nav className="study-bottom-nav fixed inset-x-0 bottom-0 z-40 w-full max-w-full overflow-hidden border-t border-slate-200/80 bg-white/[0.97] px-1 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1.5 shadow-[0_-10px_34px_rgba(15,23,42,0.10)] backdrop-blur-2xl lg:hidden dark:border-white/10 dark:bg-slate-950/[0.97] dark:shadow-[0_-18px_45px_rgba(0,0,0,0.45)]">
      <div className="mx-auto grid h-[62px] w-full max-w-[24rem] grid-cols-4">
        {studyNavItems.map((item, index) => {
          const isActive = activePath === item.to;
          const Icon = isActive ? item.activeIcon || item.icon : item.icon;
          const currentIndex = getPrimaryStudyNavIndex(activePath);
          const targetIndex = getPrimaryStudyNavIndex(item.to);
          const targetPath = isActive ? item.to : readStoredStudyTabRoute(item.to, item.to);
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
              onFocus={() => prefetchTab(item.to)}
              onPointerEnter={() => prefetchTab(item.to)}
              onTouchStart={() => {
                void triggerSelection();
                prefetchTab(item.to);
              }}
              onClick={() => {
                void triggerImpact();
              }}
              className={[
                'relative flex h-[58px] min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-bold transition-colors duration-150',
                isActive
                  ? 'text-slate-950 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
              ].join(' ')}
            >
              <span
                className={[
                  'relative flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150',
                  isActive
                    ? 'text-cyan-700 dark:text-cyan-300'
                    : 'text-inherit',
                ].join(' ')}
              >
                <span
                  key={`${item.to}-${isActive ? 'active' : 'idle'}`}
                  className={[
                    'relative flex h-6 w-6 items-center justify-center transition-transform duration-150',
                    isActive ? 'scale-[1.16]' : '',
                  ].join(' ')}
                >
                  <Icon
                    className={[
                      'transition-colors duration-150',
                      isActive ? 'h-[25px] w-[25px]' : 'h-[22px] w-[22px]',
                    ].join(' ')}
                    aria-hidden="true"
                  />
                </span>
              </span>
              <span
                className={[
                  'leading-none transition-[color,transform,font-weight] duration-150',
                  isActive ? '-translate-y-0.5 text-[11px] font-black' : '',
                ].join(' ')}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
