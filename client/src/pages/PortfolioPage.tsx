import React, { Suspense } from 'react';
import About from '../sections/About';
import PageLoader from '../components/PageLoader';
const Skills = React.lazy(() => import('../sections/Skills'));
const Certifications = React.lazy(() => import('../sections/Certifications'));
const Projects = React.lazy(() => import('../sections/Projects'));
const StudyHubCTA = React.lazy(() => import('../sections/StudyHubCTA'));
const Contact = React.lazy(() => import('../sections/Contact'));

const PortfolioPage = () => {
  return (
    <>
      <About />
       <Suspense fallback={<PageLoader />}>
      <Skills />
      <Certifications />
      <Projects />
      <StudyHubCTA /> 
      <Contact />
      </Suspense>
    </>
  );
};

export default PortfolioPage;