import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { AuthProvider } from './context/AuthContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CommandPalette from './components/CommandPalette';
import Preloader from './components/Preloader';
import ProtectedRoute from './components/ProtectedRoute';
import PageLoader from './components/PageLoader';
import profilePhoto from './assets/profile-photo.jpeg';

import PortfolioPage from './pages/PortfolioPage';
const StudyZonePage = React.lazy(() => import('./pages/StudyZonePage'));
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
    <div className="bg-slate-900 text-white min-h-screen">
      <CommandPalette open={open} setOpen={setOpen} />
      {showMainLayout && <Navbar />}
      <main>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<PortfolioPage />} />
            <Route path="/study" element={<StudyZonePage />} />
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
  // State to track if essential assets (like the profile photo) have loaded.
  const [contentLoaded, setContentLoaded] = useState(false);
  // State to track if the intro animation has completed its minimum duration.
  const [animationFinished, setAnimationFinished] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  }, []);

  // Effect to handle the parallel loading of essential assets.
  useEffect(() => {
    // We preload the main profile photo here.
    const img = new Image();
    img.src = profilePhoto;
    // When the image is loaded, we update the state.
    img.onload = () => {
      setContentLoaded(true);
    };
    // A fallback timer in case the image fails to load.
    const fallbackTimer = setTimeout(() => setContentLoaded(true), 5000);
    return () => clearTimeout(fallbackTimer);
  }, []);

  // Effect to enforce a minimum duration for the preloader animation.
  useEffect(() => {
    const animationTimer = setTimeout(() => {
      setAnimationFinished(true);
    }, 1800); // Minimum animation time: 1.8 seconds

    return () => clearTimeout(animationTimer);
  }, []);

  // The app is ready to be shown only when both assets are loaded AND the animation has finished.
  const showApp = contentLoaded && animationFinished;

  return (
    <Router>
      <AuthProvider>
        <AnimatePresence>
          {!showApp && <Preloader />}
        </AnimatePresence>
        
        {showApp && <AppContent />}
      </AuthProvider>
    </Router>
  );
}

export default App;