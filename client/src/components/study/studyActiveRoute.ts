export const STUDY_PARENT_ACTIVE_STORAGE_KEY = 'studyhub-parent-nav-active';
export const STUDY_TAB_ROUTE_STORAGE_KEY = 'studyhub-tab-routes';
const STUDY_NAV_STORAGE_VERSION_KEY = 'studyhub-nav-storage-version';
const STUDY_NAV_STORAGE_VERSION = '2026-05-30-owner-route-scope-v4';

export type StudyPrimaryNavPath =
  | '/app'
  | '/app/catalog'
  | '/app/ask'
  | '/app/library';

export type StudyRouteState = {
  parentPath?: string;
  tabOwnerPath?: string;
  tabDirection?: number;
} | null | undefined;

const primaryPaths: StudyPrimaryNavPath[] = [
  '/app',
  '/app/catalog',
  '/app/ask',
  '/app/library',
];

const ensureNavStorageVersion = () => {
  if (typeof window === 'undefined') return;

  const currentVersion = window.sessionStorage.getItem(
    STUDY_NAV_STORAGE_VERSION_KEY,
  );
  if (currentVersion === STUDY_NAV_STORAGE_VERSION) return;

  window.sessionStorage.removeItem(STUDY_PARENT_ACTIVE_STORAGE_KEY);
  window.sessionStorage.removeItem(STUDY_TAB_ROUTE_STORAGE_KEY);
  window.sessionStorage.setItem(
    STUDY_NAV_STORAGE_VERSION_KEY,
    STUDY_NAV_STORAGE_VERSION,
  );
};

export const getPrimaryStudyNavPath = (pathname: string) => {
  if (pathname === '/app') return '/app';
  if (
    pathname.startsWith('/app/catalog') ||
    pathname.startsWith('/app/explore')
  )
    return '/app/catalog';
  if (
    pathname.startsWith('/app/ask') ||
    pathname.startsWith('/app/search')
  )
    return '/app/ask';
  if (pathname.startsWith('/app/library')) return '/app/library';

  // ✅ IMPORTANT FIX
  if (pathname.startsWith('/app/my-pdfs')) {
    return '/app/my-pdfs' as any;
  }

  return null;
};

export const getPrimaryStudyNavIndex = (path: string | null) => {
  if (path === '/app') return 0;
  if (path === '/app/catalog') return 1;
  if (path === '/app/ask') return 2;
  if (path === '/app/library') return 3;
  return -1;
};

export const readStoredPrimaryStudyNavPath = (fallback = '/app') => {
  if (typeof window === 'undefined') return fallback;
  ensureNavStorageVersion();

  const storedPath = window.sessionStorage.getItem(
    STUDY_PARENT_ACTIVE_STORAGE_KEY,
  );
  return primaryPaths.includes(storedPath as StudyPrimaryNavPath)
    ? (storedPath as StudyPrimaryNavPath)
    : fallback;
};

export const writeStoredPrimaryStudyNavPath = (path: string) => {
  if (typeof window === 'undefined') return;
  if (!primaryPaths.includes(path as StudyPrimaryNavPath)) return;
  ensureNavStorageVersion();
  window.sessionStorage.setItem(STUDY_PARENT_ACTIVE_STORAGE_KEY, path);
};

const readStoredTabRoutes = () => {
  if (typeof window === 'undefined') return {};
  ensureNavStorageVersion();

  try {
    const rawValue = window.sessionStorage.getItem(
      STUDY_TAB_ROUTE_STORAGE_KEY,
    );
    if (!rawValue) return {};
    const parsed = JSON.parse(
      rawValue,
    ) as Partial<Record<StudyPrimaryNavPath, string>>;
    return parsed || {};
  } catch {
    return {};
  }
};

const writeStoredTabRoutes = (
  routes: Partial<Record<StudyPrimaryNavPath, string>>,
) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(
    STUDY_TAB_ROUTE_STORAGE_KEY,
    JSON.stringify(routes),
  );
};

export const readStoredStudyTabRoute = (path: string, fallback = path) => {
  if (!primaryPaths.includes(path as StudyPrimaryNavPath)) return fallback;
  if (path === '/app') return fallback;
  if (path === '/app/library') return fallback;

  const storedRoute = readStoredTabRoutes()[path as StudyPrimaryNavPath];
  if (!storedRoute?.startsWith('/app')) return fallback;

  const storedPathname = storedRoute.split('?')[0];
  if (storedPathname === '/app/pdf') return fallback;

  const directOwnerPath = getPrimaryStudyNavPath(storedPathname);
  if (directOwnerPath && directOwnerPath !== path) return fallback;

  return storedRoute;
};

export const writeStoredStudyTabRoute = (
  path: string,
  route: string,
) => {
  if (!primaryPaths.includes(path as StudyPrimaryNavPath)) return;
  if (!route.startsWith('/app')) return;
  if (route.split('?')[0] === '/app/pdf') return;
  if (path === '/app' && route !== '/app') return;
  if (path === '/app/library' && route !== '/app/library') return;

  const routes = readStoredTabRoutes();
  routes[path as StudyPrimaryNavPath] = route;
  writeStoredTabRoutes(routes);
};

const getStateOwnerPath = (state: StudyRouteState) => {
  const ownerPath = state?.tabOwnerPath || state?.parentPath || '';
  return primaryPaths.includes(ownerPath as StudyPrimaryNavPath)
    ? (ownerPath as StudyPrimaryNavPath)
    : null;
};

export const getStudyRouteOwnerPath = (
  pathname: string,
  search = '',
  state?: StudyRouteState,
) => {
  const directPrimaryPath = getPrimaryStudyNavPath(pathname);

  // ✅ If My PDFs route — return it directly
  if (pathname.startsWith('/app/my-pdfs')) {
    return '/app/my-pdfs';
  }

  if (directPrimaryPath) return directPrimaryPath;

  const stateOwnerPath = getStateOwnerPath(state);
  if (stateOwnerPath) return stateOwnerPath;

  const searchParams = new URLSearchParams(search);

  if (pathname.startsWith('/app/pdf')) {
    const parentPath = searchParams.get('parent');
    const validParentPath = parentPath
      ? getPrimaryStudyNavPath(parentPath)
      : null;
    if (validParentPath) return validParentPath;

    const returnTo = searchParams.get('returnTo');
    const returnPathname = returnTo?.split('?')[0] || '';
    return (
      getPrimaryStudyNavPath(returnPathname) ||
      readStoredPrimaryStudyNavPath('/app')
    );
  }

  if (
    pathname.startsWith('/app/workspace') ||
    pathname.startsWith('/app/resource') ||
    pathname.startsWith('/app/paper')
  ) {
    const parentPath = searchParams.get('parent');
    const validParentPath = parentPath
      ? getPrimaryStudyNavPath(parentPath)
      : null;
    return (
      validParentPath || readStoredPrimaryStudyNavPath('/app')
    );
  }

  return null;
};