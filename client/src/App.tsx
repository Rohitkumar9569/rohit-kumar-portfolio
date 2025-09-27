import React, { Suspense, useState, useEffect } from 'react'; // Import Suspense
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

// --- Page Components (Lazy Loaded) ---
// Lazily load pages to split code into smaller chunks. This improves initial load performance.
const PortfolioPage = React.lazy(() => import('./pages/PortfolioPage'));
const StudyZonePage = React.lazy(() => import('./pages/StudyZonePage'));
const ExamSpecificPage = React.lazy(() => import('./pages/ExamSpecificPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const PdfViewerPage = React.lazy(() => import('./pages/PdfViewerPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));


const AppContent = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const showMainLayout = (
    location.pathname === '/' ||
    location.pathname.startsWith('/study')
  ) && location.pathname !== '/login';

  return (
    <div className="bg-slate-900 text-white min-h-screen">
      <CommandPalette open={open} setOpen={setOpen} />
      {showMainLayout && <Navbar />}
      <main>
        {/* Suspense provides a fallback UI while lazy components are being loaded. */}
       <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<PortfolioPage />} />
            <Route path="/study" element={<StudyZonePage />} />
            <Route path="/study/:examName" element={<ExamSpecificPage />} />
            <Route path="/pyq/view/:id" element={<PdfViewerPage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </main>
      {showMainLayout && <Footer />}
    </div>
  );
};

function App() {
  const [loading, setLoading] = useState(true);
  const [profilePhotoLoaded, setProfilePhotoLoaded] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = profilePhoto;
    img.onload = () => setProfilePhotoLoaded(true);
    const fallbackTimer = setTimeout(() => setProfilePhotoLoaded(true), 5000);
    return () => clearTimeout(fallbackTimer);
  }, []);

  useEffect(() => {
    if (profilePhotoLoaded) {
      const timer = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [profilePhotoLoaded]);

  return (
    <Router>
      <AuthProvider>
        <AnimatePresence>
          {loading && <Preloader />}
        </AnimatePresence>
        
        {!loading && <AppContent />}
      </AuthProvider>
    </Router>
  );
}

export default App;