import React, { Suspense, useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { initializePushNotifications } from './utils/mobileNotifications';
import { createAppLenisOptions, PORTFOLIO_NAV_OFFSET, setLenisInstance } from './utils/lenisController';

// --- CONTEXT IMPORTS ---
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// --- COMPONENT IMPORTS ---
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CommandPalette from './components/CommandPalette';
import ProtectedRoute from './components/ProtectedRoute';
import PageLoader from './components/PageLoader';
import AppLaunchScreen from './components/AppLaunchScreen';
import AppErrorBoundary from './components/AppErrorBoundary';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, STUDY_HUB_OG_IMAGE } from './pages/public/seoHelpers';

// --- PAGE IMPORTS ---
import PortfolioPage from './pages/PortfolioPage';
const GlobalAIChatWidget = React.lazy(() => import('./components/GlobalAIChatWidget'));
const ExamSpecificPage = React.lazy(() => import('./pages/ExamSpecificPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const AdminLoginPage = React.lazy(() => import('./pages/AdminLoginPage'));
const PdfViewerPage = React.lazy(() => import('./pages/PdfViewerPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const StudyAppLayout = React.lazy(() => import('./components/study/StudyAppLayout'));
const StudyHomePage = React.lazy(() => import('./pages/studyHub/StudyHomePage'));
const StudyDiscoverPage = React.lazy(() => import('./pages/studyHub/StudyDiscoverPage'));
const StudyPapersPage = React.lazy(() => import('./pages/studyHub/StudyPapersPage'));
const StudySearchPage = React.lazy(() => import('./pages/studyHub/StudySearchPage'));
const StudyLibraryPage = React.lazy(() => import('./pages/studyHub/StudyLibraryPage'));
const StudyWorkspacePage = React.lazy(() => import('./pages/studyHub/StudyWorkspacePage'));
const StudyPreferencesPage = React.lazy(() => import('./pages/studyHub/StudyPreferencesPage'));
const StudyContributePage = React.lazy(() => import('./pages/studyHub/StudyContributePage'));
const StudyInstallCard = React.lazy(() => import('./components/study/StudyInstallCard'));
const StudyResourceReaderPage = React.lazy(() => import('./pages/studyHub/StudyResourceReaderPage'));
const StudyPdfRoutePage = React.lazy(() => import('./pages/studyHub/StudyPdfRoutePage'));
const StudyPortfolioPage = React.lazy(() => import('./pages/studyHub/StudyPortfolioPage'));
const PublicExamPage = React.lazy(() => import('./pages/public/PublicExamPage'));
const PublicPaperPage = React.lazy(() => import('./pages/public/PublicPaperPage'));
const PublicResourcePage = React.lazy(() => import('./pages/public/PublicResourcePage'));
const PublicSubjectPage = React.lazy(() => import('./pages/public/PublicSubjectPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

const SmoothScrollManager = () => {
  const location = useLocation();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const isPdfScrollRoute =
      location.pathname.startsWith('/app/pdf') ||
      location.pathname.startsWith('/pyq/view');

    if (isPdfScrollRoute) return;

    const isPortfolioRoute = location.pathname === '/';

    const lenis = new Lenis(createAppLenisOptions({
      anchors: isPortfolioRoute
        ? {
            offset: PORTFOLIO_NAV_OFFSET,
          }
        : false,
    }));

    setLenisInstance(lenis);

    return () => {
      setLenisInstance(null);
      lenis.destroy();
    };
  }, [location.pathname]);

  return null;
};

const RouteSeoHead = () => {
  const location = useLocation();
  const path = location.pathname;

  if (!path.startsWith('/app')) return null;

  const appSeo: Record<string, { title: string; description: string; indexable: boolean }> = {
    '/app': {
      title: 'Study Hub App | Free PYQs, Notes, Books and Exam Search',
      description: SITE_DESCRIPTION,
      indexable: true,
    },
    '/app/catalog': {
      title: 'Study Hub Catalog | UPSC, GATE, CBSE, State PCS, JEE and NEET',
      description: 'Browse Study Hub exam shelves for UPSC, GATE, CBSE, JEE, NEET, SSC, State PCS, placement prep, PYQs, notes, books, and syllabus resources.',
      indexable: true,
    },
    '/app/search': {
      title: 'Study Hub Search | Find PYQs, PDFs, Notes and Books',
      description: 'Search Study Hub by exam, subject, class, PDF title, PYQ, book, syllabus, notes, and practice resources.',
      indexable: true,
    },
    '/app/ask': {
      title: 'Ask Sarathi | Study Hub AI Study Assistant',
      description: 'Ask Study Hub Sarathi for exam help, resource discovery, revision plans, and study guidance.',
      indexable: true,
    },
  };

  const matched = appSeo[path];
  const title = matched?.title || `${SITE_NAME} | Study Workspace`;
  const description = matched?.description || SITE_DESCRIPTION;
  const indexable = Boolean(matched?.indexable);
  const canonicalUrl = `${SITE_URL}${path}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta
        name="robots"
        content={indexable ? 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1' : 'noindex,follow'}
      />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={STUDY_HUB_OG_IMAGE} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={STUDY_HUB_OG_IMAGE} />
    </Helmet>
  );
};

const AppContent = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [shouldLoadChatWidget, setShouldLoadChatWidget] = useState(false);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

  const showMainLayout = (
    (location.pathname === '/' || location.pathname.startsWith('/study')) &&
    location.pathname !== '/login'
  );

  useEffect(() => {
    if (location.pathname !== '/') {
      setShouldLoadChatWidget(false);
      return undefined;
    }

    const timerId = window.setTimeout(() => setShouldLoadChatWidget(true), 6000);
    return () => window.clearTimeout(timerId);
  }, [location.pathname]);

  const isPortfolioSurface = location.pathname === '/';
  const shellClassName = isPortfolioSurface
    ? 'portfolio-root-shell min-h-screen'
    : 'premium-site-shell min-h-screen';

  useEffect(() => {
    const handleOnlineStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);
    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  useEffect(() => {
    void initializePushNotifications();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (!isPortfolioSurface) {
      root.classList.remove('portfolio-scroll-root');
      body.classList.remove('portfolio-scroll-root');
      return undefined;
    }

    root.classList.add('portfolio-scroll-root');
    body.classList.add('portfolio-scroll-root');

    return () => {
      root.classList.remove('portfolio-scroll-root');
      body.classList.remove('portfolio-scroll-root');
    };
  }, [isPortfolioSurface]);

  return (
    <div className={shellClassName}>
      <AppLaunchScreen />
      <RouteSeoHead />
      <SmoothScrollManager />
      {isOffline && (
        <div className="fixed left-1/2 top-4 z-[70] w-[min(92vw,24rem)] -translate-x-1/2 rounded-full border border-amber-400/40 bg-amber-500/90 px-4 py-2 text-center text-sm font-semibold text-amber-950 shadow-lg shadow-amber-500/20 backdrop-blur">
          Offline mode active — cached content will still be available.
        </div>
      )}
      <CommandPalette open={open} setOpen={setOpen} />
      {showMainLayout && <Navbar />}
      <main>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<PortfolioPage />} />
            <Route path="/app" element={<StudyAppLayout />}>
              <Route index element={<StudyHomePage />} />
              <Route path="catalog" element={<StudyDiscoverPage />} />
              <Route path="explore" element={<Navigate to="/app/catalog" replace />} />
              <Route path="papers" element={<StudyPapersPage />} />
              <Route path="ask" element={<StudySearchPage />} />
              <Route path="search" element={<StudySearchPage />} />
              <Route path="library" element={<StudyLibraryPage />} />
              <Route path="workspace/:slug" element={<StudyWorkspacePage />} />
              <Route path="resource/:slug" element={<StudyResourceReaderPage />} />
              <Route path="paper/:slug" element={<StudyResourceReaderPage />} />
              <Route path="pdf" element={<StudyPdfRoutePage />} />
              <Route path="profile" element={<StudyPreferencesPage />} />
              <Route path="preferences" element={<StudyPreferencesPage />} />
              <Route path="setup" element={<Navigate to="/app/profile" replace />} />
              <Route path="onboarding" element={<StudyPreferencesPage />} />
              <Route path="contribute" element={<StudyContributePage />} />
              <Route path="request" element={<Navigate to="/app/contribute" replace />} />
              <Route path="portfolio" element={<StudyPortfolioPage />} />
              <Route
                path="lab"
                element={<ProtectedRoute adminOnly loginPath="/admin/login"><Navigate to="/admin" replace /></ProtectedRoute>}
              />
              <Route path="admin" element={<Navigate to="/admin" replace />} />
            </Route>
            <Route path="/exams/:slug" element={<PublicExamPage />} />
            <Route path="/papers/:slug" element={<PublicPaperPage />} />
            <Route path="/resources/:slug" element={<PublicResourcePage />} />
            <Route path="/subjects" element={<PublicSubjectPage />} />
            <Route path="/subjects/:slug" element={<PublicSubjectPage />} />
            <Route path="/study/:examName" element={<ExamSpecificPage />} />
            <Route path="/pyq/view/:id" element={<PdfViewerPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin"
              element={<ProtectedRoute adminOnly loginPath="/admin/login"><AdminPage /></ProtectedRoute>}
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      {showMainLayout && <Footer />}

      {(location.pathname === '/' || location.pathname.startsWith('/app')) &&
        !location.pathname.startsWith('/app/pdf') &&
        !location.pathname.startsWith('/app/portfolio') && (
        <Suspense fallback={null}>
          <StudyInstallCard />
        </Suspense>
      )}

      {/*  Floating Chat Widget show  */}
      {location.pathname === '/' && shouldLoadChatWidget && (
        <Suspense fallback={null}>
          <GlobalAIChatWidget />
        </Suspense>
      )}
      
    </div>
  );
};

const AppBoot = () => <AppContent />;

function App() {

  return (
    <ThemeProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              className: 'premium-toast',
              duration: 2600,
              style: {
                maxWidth: 'min(26rem, calc(100vw - 2rem))',
              },
              success: {
                iconTheme: {
                  primary: '#06b6d4',
                  secondary: '#ffffff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#f43f5e',
                  secondary: '#ffffff',
                },
              },
            }}
          />
          <AppErrorBoundary>
            <AppBoot />
          </AppErrorBoundary>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
