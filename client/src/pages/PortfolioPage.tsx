import React, { Suspense, lazy } from 'react';

// Import a generic loader, but specific skeletons are better
import PageLoader from '../components/PageLoader'; 

// --- KEY CHANGE ---
// Import the components visible at the top of the page normally.
import About from '../sections/About';
import Skills from '../sections/Skills';

// Lazy-load only the sections that are further down the page.
const Certifications = lazy(() => import('../sections/Certifications'));
const Projects = lazy(() => import('../sections/Projects'));
const StudyHubCTA = lazy(() => import('../sections/StudyHubCTA'));
const Contact = lazy(() => import('../sections/Contact'));

const PortfolioPage = () => {
  return (
    <>
      {/* These components will now load instantly. */}
      <About />
      <Skills />

      {/* Each lazy-loaded section now gets its own Suspense boundary. */}
      {/* This prevents a full-page loader. */}
      <Suspense fallback={<PageLoader />}>
        <Certifications />
      </Suspense>

      <Suspense fallback={<PageLoader />}>
        <Projects />
      </Suspense>

      <Suspense fallback={<PageLoader />}>
        <StudyHubCTA /> 
      </Suspense>

      <Suspense fallback={<PageLoader />}>
        <Contact />
      </Suspense>
    </>
  );
};

export default PortfolioPage;