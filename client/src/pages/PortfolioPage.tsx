import React, { Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import PageLoader from '../components/PageLoader';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './public/seoHelpers';

// Eagerly load critical components for instant rendering on page load.
import About from '../sections/About';

// Lazy-load sections that appear below the fold for better initial performance.
const Skills = React.lazy(() => import('../sections/Skills'));
const Certifications = React.lazy(() => import('../sections/Certifications'));
const Projects = React.lazy(() => import('../sections/Projects'));
const StudyHubCTA = React.lazy(() => import('../sections/StudyHubCTA'));
const Contact = React.lazy(() => import('../sections/Contact'));

const PortfolioPage = () => {
  return (
    <div className="min-h-screen w-full max-w-full min-w-0 overflow-x-clip [--background:210_40%_98%] [--border:214_32%_91%] [--card-foreground:222_47%_11%] [--card:0_0%_100%] [--foreground:222_47%_11%] [--primary-foreground:215_20%_65%] [--primary:0_0%_100%] dark:[--background:222_47%_11%] dark:[--border:217_33%_27%] dark:[--card-foreground:210_40%_96%] dark:[--card:223_39%_18%] dark:[--foreground:210_40%_96%] dark:[--primary-foreground:215_20%_65%] dark:[--primary:223_39%_18%]">
      <Helmet>
        {/* --- Primary SEO Meta Tags --- */}
        <title>Rohit Kumar Study Hub | UPSC, GATE, CBSE, PYQs, Notes & Portfolio</title>
        <meta name="description" content={SITE_DESCRIPTION} />
        <meta name="keywords" content="Rohit Kumar, Study Hub, UPSC PYQ, GATE CSE, GATE DA, CBSE notes, JEE resources, NEET resources, SSC CGL, State PCS, BPSC, UPPSC, RPSC, previous year papers, free study material" />
        <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
        <link rel="canonical" href={`${SITE_URL}/`} />

        {/* --- Open Graph / Facebook Meta Tags --- */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${SITE_URL}/`} />
        <meta property="og:title" content="Rohit Kumar Study Hub | UPSC, GATE, CBSE, PYQs & Notes" />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:image" content="https://res.cloudinary.com/dlcvljnnu/image/upload/v1759951140/profile-photo_dznr2x.webp" />
        <meta property="og:image:alt" content="Rohit Kumar Study Hub and portfolio" />
        <meta property="og:site_name" content={SITE_NAME} />

        {/* --- Twitter Card Meta Tags --- */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={`${SITE_URL}/`} />
        <meta name="twitter:title" content="Rohit Kumar Study Hub | UPSC, GATE, CBSE, PYQs & Notes" />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content="https://res.cloudinary.com/dlcvljnnu/image/upload/v1759951140/profile-photo_dznr2x.webp" />
      </Helmet>

      <div className="w-full max-w-full min-w-0 overflow-x-clip">
        <About />
        <Suspense fallback={<section id="skills" className="min-h-[60vh]" aria-label="Loading skills" />}>
          <Skills />
        </Suspense>

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
      </div>
    </div>
  );
};

export default PortfolioPage;
