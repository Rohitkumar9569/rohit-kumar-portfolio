import React from 'react';
import About from '../sections/About';
import Skills from '../sections/Skills';
import Certifications from '../sections/Certifications';
import Projects from '../sections/Projects';
import StudyHubCTA from '../sections/StudyHubCTA'; 
import Contact from '../sections/Contact';

const PortfolioPage = () => {
  return (
    <>
      <About />
      <Skills />
      <Certifications />
      <Projects />
      <StudyHubCTA /> 
      <Contact />
    </>
  );
};

export default PortfolioPage;