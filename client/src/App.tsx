// src/App.tsx

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import About from './sections/About';
import Skills from './sections/Skills';
import Certifications from './sections/Certifications';
import Projects from './sections/Projects';
import Contact from './sections/Contact';
import CommandPalette from './components/CommandPalette';
import Preloader from './components/Preloader';

// IMPORTANT: Add the import for your profile photo here.
// Make sure the path is correct. For example:
import profilePhoto from './assets/profile-photo.png';

function App() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profilePhotoLoaded, setProfilePhotoLoaded] = useState(false); // NEW: State to track if the photo has loaded.

  // This useEffect will check the user's system preference and set the theme
  useEffect(() => {
    const isSystemDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (isSystemDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // NEW: This useEffect handles the photo preloading
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setProfilePhotoLoaded(true);
    };
    img.src = profilePhoto;

    // This is a fallback timer. If the image fails to load for any reason,
    // the preloader will still hide after 5 seconds to prevent a stuck screen.
    const timer = setTimeout(() => {
      setProfilePhotoLoaded(true);
    }, 5000); 

    return () => clearTimeout(timer);
  }, []);

  // NEW: This useEffect combines the preloader logic
  useEffect(() => {
    // The preloader now hides only when the photo has loaded AND the initial 2-second timer has passed.
    // This ensures a minimum show time for your animation.
    if (profilePhotoLoaded) {
      const timer = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [profilePhotoLoaded]);

  return (
    <>
      <AnimatePresence>
        {loading && <Preloader />}
      </AnimatePresence>

      {!loading && (
        <div className="bg-slate-900 text-white">
          <CommandPalette open={open} setOpen={setOpen} />
          <Navbar />
          <main>
            <About />
            <Skills />
            <Certifications />
            <Projects />
            <Contact />
          </main>
          <Footer />
        </div>
      )}
    </>
  );
}

export default App;