import React, { Suspense, useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { initializePushNotifications } from './utils/mobileNotifications';
import { createAppLenisOptions, PORTFOLIO_NAV_OFFSET, setLenisInstance, getLenisInstance } from './utils/lenisController';

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

// ✅ FIX: isLenisSupported function यहाँ define किया
const isLenisSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Mobile devices पर Lenis disable - touch devices पर native scroll बेहतर है
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  // Reduced motion prefer करने वाले users के लिए disable
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return !isTouchDevice && !prefersReducedMotion;
};

// --- OPTIMIZED SMOOTH SCROLL MANAGER ---
const SmoothScrollManager = () => {
  const location = useLocation();

  useEffect(() => {
    // ✅ अब isLenisSupported defined है - error नहीं आएगी
    if (!getLenisInstance() && isLenisSupported()) {
      const lenis = new Lenis(createAppLenisOptions());
      setLenisInstance(lenis);

      let rAF: number;
      function raf(time: number) {
        lenis.raf(time);
        rAF = requestAnimationFrame(raf);
      }
      rAF = requestAnimationFrame(raf);

      return () => {
        cancelAnimationFrame(rAF);
        lenis.destroy();
        setLenisInstance(null);
      };
    }
  }, []);

  useEffect(() => {
    const lenis = getLenisInstance();
    if (lenis) {
      const isPdfScrollRoute =
        location.pathname.startsWith('/app/pdf') ||
        location.pathname.startsWith('/pyq/view');
      if (!isPdfScrollRoute) {
        lenis.scrollTo(0, { immediate: true });
      }
    } else {
      // Mobile: native scroll reset
      const isPdfScrollRoute =
        location.pathname.startsWith('/app/pdf') ||
        location.pathname.startsWith('/pyq/view');
      if (!isPdfScrollRoute) {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    }
  }, [location.pathname]);

  return null;
};

// --- ROUTE SEO HEAD ---
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
      description: '...',
      indexable: true,
    },
    '/app/search': {
      title: 'Study Hub Search | Find PYQs, PDFs, Notes and Books',
      description: '...',
      indexable: true,
    },
    '/app/ask': {
      title: 'Ask Sarathi | Study Hub AI Study Assistant',
      description: '...',
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
      <meta name="robots" content={indexable ? 'index,follow' : 'noindex,follow'} />
      <link rel="canonical" href={canonicalUrl} />
    </Helmet>
  );
};

// --- APP CONTENT ---
const AppContent = () => {
  const location = useLocation();
  const [shouldLoadChatWidget, setShouldLoadChatWidget] = useState(false);
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  const showMainLayout =
    (location.pathname === '/' || location.pathname.startsWith('/study')) &&
    location.pathname !== '/login';

  useEffect(() => {
    const timerId = window.setTimeout(() => setShouldLoadChatWidget(true), 6000);
    return () => window.clearTimeout(timerId);
  }, []);

  // ✅ Online/Offline listener भी add किया
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isPortfolioSurface = location.pathname === '/';
  const shellClassName = isPortfolioSurface
    ? 'portfolio-root-shell min-h-screen'
    : 'premium-site-shell min-h-screen';

  return (
    <div className={shellClassName}>
      <AppLaunchScreen />
      <RouteSeoHead />
      <SmoothScrollManager />

      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 text-black text-center text-sm py-1 font-medium">
          Offline mode active.
        </div>
      )}

      <CommandPalette open={false} setOpen={() => {}} />
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
                element={
                  <ProtectedRoute adminOnly loginPath="/admin/login">
                    <Navigate to="/admin" replace />
                  </ProtectedRoute>
                }
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
              element={
                <ProtectedRoute adminOnly loginPath="/admin/login">
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      {showMainLayout && <Footer />}

      {location.pathname === '/' ||
      (location.pathname.startsWith('/app') &&
        !location.pathname.startsWith('/app/pdf') &&
        !location.pathname.startsWith('/app/portfolio')) ? (
        <Suspense fallback={null}>
          <StudyInstallCard />
        </Suspense>
      ) : null}

      {location.pathname === '/' && shouldLoadChatWidget && (
        <Suspense fallback={null}>
          <GlobalAIChatWidget />
        </Suspense>
      )}
    </div>
  );
};

// --- APP BOOT ---
const AppBoot = () => <AppContent />;

// --- MAIN APP ---
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