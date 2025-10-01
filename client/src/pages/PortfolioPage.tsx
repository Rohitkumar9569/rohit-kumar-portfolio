import React, { Suspense } from 'react';
import PageLoader from '../components/PageLoader';

// Eagerly load critical components for instant rendering on page load.
import About from '../sections/About';
import Skills from '../sections/Skills';

// Lazy-load sections that appear below the fold for better initial performance.
const Certifications = React.lazy(() => import('../sections/Certifications'));
const Projects = React.lazy(() => import('../sections/Projects'));
const StudyHubCTA = React.lazy(() => import('../sections/StudyHubCTA'));
const Contact = React.lazy(() => import('../sections/Contact'));

const PortfolioPage = () => {
  return (
    <>
      <About />
      <Skills />
      
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