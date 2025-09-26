import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { AuthProvider } from './context/AuthContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CommandPalette from './components/CommandPalette';
import Preloader from './components/Preloader';
import ProtectedRoute from './components/ProtectedRoute';

import PortfolioPage from './pages/PortfolioPage';
import StudyZonePage from './pages/StudyZonePage';
import ExamSpecificPage from './pages/ExamSpecificPage';
import AdminPage from './pages/AdminPage';
import PdfViewerPage from './pages/PdfViewerPage';
import LoginPage from './pages/LoginPage';

import profilePhoto from './assets/profile-photo.png';

const AppContent = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // KEY CHANGE IS HERE: Removed the '/admin' condition
  const showMainLayout = (
    location.pathname === '/' || 
    location.pathname.startsWith('/study')
  ) && location.pathname !== '/login';

  return (
    <div className="bg-slate-900 text-white min-h-screen">
      <CommandPalette open={open} setOpen={setOpen} />
      {showMainLayout && <Navbar />}
      <main>
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