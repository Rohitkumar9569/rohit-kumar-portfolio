import React, { Suspense, useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import {
  createAppLenisOptions,
  setLenisInstance,
  getLenisInstance,
  isLenisSupported,        // ✅ lenisController.ts से import किया
} from './utils/lenisController';

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
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from './pages/public/seoHelpers';

// --- PAGE IMPORTS ---
import PortfolioPage from './pages/PortfolioPage';
const GlobalAIChatWidget   = React.lazy(() => import('./components/GlobalAIChatWidget'));
const ExamSpecificPage     = React.lazy(() => import('./pages/ExamSpecificPage'));
const AdminPage            = React.lazy(() => import('./pages/AdminPage'));
const AdminLoginPage       = React.lazy(() => import('./pages/AdminLoginPage'));
const PdfViewerPage        = React.lazy(() => import('./pages/PdfViewerPage'));
const LoginPage            = React.lazy(() => import('./pages/LoginPage'));
const StudyAppLayout       = React.lazy(() => import('./components/study/StudyAppLayout'));
const StudyHomePage        = React.lazy(() => import('./pages/studyHub/StudyHomePage'));
const StudyDiscoverPage    = React.lazy(() => import('./pages/studyHub/StudyDiscoverPage'));
const StudyPapersPage      = React.lazy(() => import('./pages/studyHub/StudyPapersPage'));
const StudySearchPage      = React.lazy(() => import('./pages/studyHub/StudySearchPage'));
const StudyLibraryPage     = React.lazy(() => import('./pages/studyHub/StudyLibraryPage'));
const StudyWorkspacePage   = React.lazy(() => import('./pages/studyHub/StudyWorkspacePage'));
const StudyPreferencesPage = React.lazy(() => import('./pages/studyHub/StudyPreferencesPage'));
const StudyContributePage  = React.lazy(() => import('./pages/studyHub/StudyContributePage'));
const StudyInstallCard     = React.lazy(() => import('./components/study/StudyInstallCard'));
const StudyResourceReaderPage = React.lazy(() => import('./pages/studyHub/StudyResourceReaderPage'));
const StudyPdfRoutePage    = React.lazy(() => import('./pages/studyHub/StudyPdfRoutePage'));
const StudyPortfolioPage   = React.lazy(() => import('./pages/studyHub/StudyPortfolioPage'));
const PublicExamPage       = React.lazy(() => import('./pages/public/PublicExamPage'));
const PublicPaperPage      = React.lazy(() => import('./pages/public/PublicPaperPage'));
const PublicResourcePage   = React.lazy(() => import('./pages/public/PublicResourcePage'));
const PublicSubjectPage    = React.lazy(() => import('./pages/public/PublicSubjectPage'));
const NotFoundPage         = React.lazy(() => import('./pages/NotFoundPage'));

// ─────────────────────────────────────────────
// SMOOTH SCROLL MANAGER
// ─────────────────────────────────────────────
const SmoothScrollManager = () => {
  const location = useLocation();

  useEffect(() => {
    // ✅ isLenisSupported अब lenisController से import है - duplicate नहीं
    if (!getLenisInstance() && isLenisSupported()) {

      // ✅ autoRaf: false - हम खुद RAF loop चलाएंगे (autoRaf:true के साथ conflict था)
      const lenis = new Lenis({
        ...createAppLenisOptions(),
        autoRaf: false,
      });

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

  // Route बदलने पर scroll reset
  useEffect(() => {
    const lenis = getLenisInstance();
    const isPdfRoute =
      location.pathname.startsWith('/app/pdf') ||
      location.pathname.startsWith('/pyq/view');

    if (isPdfRoute) return;

    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [location.pathname]);

  return null;
};

// ─────────────────────────────────────────────
// ROUTE SEO HEAD
// ─────────────────────────────────────────────
const RouteSeoHead = () => {
  const location = useLocation();
  const path = location.pathname;

  if (!path.startsWith('/app')) return null;

  const appSeo: Record<string, {
    title: string;
    description: string;
    indexable: boolean;
  }> = {
    '/app': {
      title: 'Study Hub App | Free PYQs, Notes, Books and Exam Search',
      description: SITE_DESCRIPTION,
      indexable: true,
    },
    '/app/catalog': {
      title: 'Study Hub Catalog | UPSC, GATE, CBSE, State PCS, JEE and NEET',
      description: 'Browse all exam categories on Study Hub.',
      indexable: true,
    },
    '/app/search': {
      title: 'Study Hub Search | Find PYQs, PDFs, Notes and Books',
      description: 'Search thousands of study resources on Study Hub.',
      indexable: true,
    },
    '/app/ask': {
      title: 'Ask Sarathi | Study Hub AI Study Assistant',
      description: 'Get instant answers with Sarathi, your AI study assistant.',
      indexable: true,
    },
  };

  const matched   = appSeo[path];
  const title     = matched?.title       || `${SITE_NAME} | Study Workspace`;
  const desc      = matched?.description || SITE_DESCRIPTION;
  const indexable = Boolean(matched?.indexable);
  const canonical = `${SITE_URL}${path}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description"  content={desc} />
      <meta name="robots"       content={indexable ? 'index,follow' : 'noindex,follow'} />
      <link rel="canonical"     href={canonical} />
    </Helmet>
  );
};

// ─────────────────────────────────────────────
// APP CONTENT
// ─────────────────────────────────────────────
const AppContent = () => {
  const location = useLocation();

  const [shouldLoadChatWidget, setShouldLoadChatWidget] = useState(false);
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  const showMainLayout =
    (location.pathname === '/' || location.pathname.startsWith('/study')) &&
    location.pathname !== '/login';

  // Chat widget को 6s बाद lazy load करो
  useEffect(() => {
    const id = window.setTimeout(() => setShouldLoadChatWidget(true), 6000);
    return () => window.clearTimeout(id);
  }, []);

  // Online / Offline listener
  useEffect(() => {
    const onOnline  = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const isPortfolio  = location.pathname === '/';
  const shellClass   = isPortfolio
    ? 'portfolio-root-shell min-h-screen'
    : 'premium-site-shell min-h-screen';

  // StudyInstallCard किन routes पर दिखाएं
  const showInstallCard =
    location.pathname === '/' ||
    (location.pathname.startsWith('/app') &&
      !location.pathname.startsWith('/app/pdf') &&
      !location.pathname.startsWith('/app/portfolio'));

  return (
    <div className={shellClass}>
      <AppLaunchScreen />
      <RouteSeoHead />
      <SmoothScrollManager />

      {/* Offline Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 text-black text-center text-sm py-1 font-medium">
          ⚠️ Offline mode active.
        </div>
      )}

      <CommandPalette open={false} setOpen={() => {}} />
      {showMainLayout && <Navbar />}

      <main>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Portfolio / Home */}
            <Route path="/" element={<PortfolioPage />} />

            {/* Study App */}
            <Route path="/app" element={<StudyAppLayout />}>
              <Route index                  element={<StudyHomePage />} />
              <Route path="catalog"         element={<StudyDiscoverPage />} />
              <Route path="explore"         element={<Navigate to="/app/catalog" replace />} />
              <Route path="papers"          element={<StudyPapersPage />} />
              <Route path="ask"             element={<StudySearchPage />} />
              <Route path="search"          element={<StudySearchPage />} />
              <Route path="library"         element={<StudyLibraryPage />} />
              <Route path="workspace/:slug" element={<StudyWorkspacePage />} />
              <Route path="resource/:slug"  element={<StudyResourceReaderPage />} />
              <Route path="paper/:slug"     element={<StudyResourceReaderPage />} />
              <Route path="pdf"             element={<StudyPdfRoutePage />} />
              <Route path="profile"         element={<StudyPreferencesPage />} />
              <Route path="preferences"     element={<StudyPreferencesPage />} />
              <Route path="setup"           element={<Navigate to="/app/profile" replace />} />
              <Route path="onboarding"      element={<StudyPreferencesPage />} />
              <Route path="contribute"      element={<StudyContributePage />} />
              <Route path="request"         element={<Navigate to="/app/contribute" replace />} />
              <Route path="portfolio"       element={<StudyPortfolioPage />} />
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

            {/* Public Pages */}
            <Route path="/exams/:slug"     element={<PublicExamPage />} />
            <Route path="/papers/:slug"    element={<PublicPaperPage />} />
            <Route path="/resources/:slug" element={<PublicResourcePage />} />
            <Route path="/subjects"        element={<PublicSubjectPage />} />
            <Route path="/subjects/:slug"  element={<PublicSubjectPage />} />
            <Route path="/study/:examName" element={<ExamSpecificPage />} />
            <Route path="/pyq/view/:id"    element={<PdfViewerPage />} />

            {/* Auth */}
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/admin/login"     element={<AdminLoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly loginPath="/admin/login">
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      {showMainLayout && <Footer />}

      {/* PWA Install Card */}
      {showInstallCard && (
        <Suspense fallback={null}>
          <StudyInstallCard />
        </Suspense>
      )}

      {/* Floating Chat Widget - सिर्फ Portfolio पर */}
      {isPortfolio && shouldLoadChatWidget && (
        <Suspense fallback={null}>
          <GlobalAIChatWidget />
        </Suspense>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// APP BOOT & MAIN
// ─────────────────────────────────────────────
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
                iconTheme: { primary: '#06b6d4', secondary: '#ffffff' },
              },
              error: {
                iconTheme: { primary: '#f43f5e', secondary: '#ffffff' },
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