import React, { Suspense, useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// --- CONTEXT IMPORTS ---
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext'; // <-- 1. Import our ThemeProvider

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

    // <-- 2. Removed hardcoded "bg-neutral-950 text-white" to allow theme to work
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

  // <-- 3. Removed the conflicting useEffect that was setting the theme based on OS preference
  // All theme logic is now handled by ThemeContext.

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
    // <-- 4. Wrapped the entire application in ThemeProvider
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <Toaster position="top-center" />
          <AnimatePresence>
            {/* FIX: Added required 'key' prop to satisfy AnimatePresence. 
                  NOTE: Passing setContentLoaded in onLoadComplete ensures app loads after preloader finishes its tasks. */}
            {!showApp && <Preloader
              key="app-preloader"
              onLoadComplete={() => {
                setContentLoaded(true); // Content is ready
                setAnimationFinished(true); // Animation is complete
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