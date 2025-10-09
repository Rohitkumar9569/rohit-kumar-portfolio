import React, { Suspense, useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Lenis from 'lenis';

// --- CONTEXT IMPORTS ---
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// --- COMPONENT IMPORTS ---
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CommandPalette from './components/CommandPalette';
import Preloader from './components/Preloader';
import ProtectedRoute from './components/ProtectedRoute';
import PageLoader from './components/PageLoader';
import profilePhoto from './assets/profile-photo.jpeg';

// --- PAGE IMPORTS ---
import PortfolioPage from './pages/PortfolioPage';
const ExamSpecificPage = React.lazy(() => import('./pages/ExamSpecificPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const PdfViewerPage = React.lazy(() => import('./pages/PdfViewerPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));


const AppContent = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const showMainLayout = (
    (location.pathname === '/' || location.pathname.startsWith('/study')) &&
    location.pathname !== '/login'
  );

  return (
    <div className="min-h-screen">
      <CommandPalette open={open} setOpen={setOpen} />
      {showMainLayout && <Navbar />}
      <main>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<PortfolioPage />} />
            <Route path="/study/:examName" element={<ExamSpecificPage />} />
            <Route path="/pyq/view/:id" element={<PdfViewerPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={<ProtectedRoute><AdminPage /></ProtectedRoute>}
            />
          </Routes>
        </Suspense>
      </main>
      {showMainLayout && <Footer />}
    </div>
  );
};

function App() {
  const [contentLoaded, setContentLoaded] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);

  // --- Responsive Smooth Scrolling Setup ---
  useEffect(() => {
    const lenis = new Lenis({
      // The 'lerp' value determines how quickly the scroll 'catches up'.
      // A value around 0.1 is a sweet spot for responsiveness and smoothness.
      lerp: 0.2,
      // Standard sensitivity. You can increase this if you want the scroll
      // to be even faster.
      wheelMultiplier: 2,
      touchMultiplier: 2,
      prevent: (node) =>
        node.id === 'pdf-scroll-area' || node.id === 'ai-chat-scroll-area',
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Cleanup function
    return () => {
      lenis.destroy();
    };
  }, []);


  useEffect(() => {
    const img = new Image();
    img.src = profilePhoto;
    img.onload = () => {
      setContentLoaded(true);
    };
    const fallbackTimer = setTimeout(() => setContentLoaded(true), 5000);
    return () => clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    const animationTimer = setTimeout(() => {
      setAnimationFinished(true);
    }, 1800);

    return () => clearTimeout(animationTimer);
  }, []);

  const showApp = contentLoaded && animationFinished;

  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <Toaster position="top-center" />
          <AnimatePresence>
            {!showApp && <Preloader
              key="app-preloader"
              onLoadComplete={() => {
                setContentLoaded(true);
                setAnimationFinished(true);
              }}
            />}
          </AnimatePresence>

          {showApp && <AppContent />}
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;