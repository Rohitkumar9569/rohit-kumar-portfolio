import React, { Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
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

  // --- Structured Data for Advanced SEO (JSON-LD) ---
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        'name': 'Rohit Kumar',
        'url': 'https://rohitkumar-portfolio.vercel.app/', // IMPORTANT: Add your final domain here
        'sameAs': [
          'https://www.linkedin.com/in/rohit-kumar-bba12b25b/', // TODO: Add your LinkedIn URL
          'https://github.com/Rohitkumar9569', // TODO: Add your GitHub URL
        ],
        'jobTitle': 'Full-Stack Developer',
        'worksFor': {
          '@type': 'Organization',
          'name': 'Rohit Kumar Portfolio'
        },
        'image': 'https://res.cloudinary.com/dlcvljnnu/image/upload/v1759951140/profile-photo_dznr2x.webp', // TODO: Add a public URL to your profile photo
        'description': 'A passionate Full-Stack Developer specializing in the MERN stack and creating high-performance web applications. Creator of the Study Hub, a resource for competitive exam preparation.',
        'knowsAbout': ['React', 'Node.js', 'Express.js', 'MongoDB', 'TypeScript', 'JavaScript', 'Cybersecurity', 'Cloud Computing', 'React Three Fiber']
      },
      {
        '@type': 'WebSite',
        'name': 'Rohit Kumar | Portfolio & Study Hub',
        'url': 'https://rohitkumar-portfolio.vercel.app/', // IMPORTANT: Add your final domain here
        'author': {
          '@type': 'Person',
          'name': 'Rohit Kumar'
        },
        'description': 'Official portfolio of Rohit Kumar, showcasing full-stack development projects and the Study Hub for exam PYQs.',
        'potentialAction': {
          '@type': 'SearchAction',
          'target': 'https://rohitkumar-portfolio.vercel.app/study/{search_term_string}', // Lets Google show a search box
          'query-input': 'required name=search_term_string'
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        {/* --- Primary SEO Meta Tags --- */}
        <title>Rohit Kumar | Full-Stack Developer & Creator of Study Hub</title>
        <meta name="description" content="Explore the portfolio of Rohit Kumar, a skilled Full-Stack Developer. Discover projects, skills, and the Study Hub—a free resource with PYQs for exams like GATE and UPSC." />
        <link rel="canonical" href="https://rohitkumar-portfolio.vercel.app/" /> {/* IMPORTANT: Add your final domain here */}

        {/* --- Open Graph / Facebook Meta Tags --- */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://rohitkumar-portfolio.vercel.app/" /> {/* IMPORTANT: Add your final domain here */}
        <meta property="og:title" content="Rohit Kumar | Full-Stack Developer & Creator of Study Hub" />
        <meta property="og:description" content="Discover projects, skills, and the Study Hub—a free resource for exam preparation." />
        <meta property="og:image" content="https://res.cloudinary.com/dlcvljnnu/image/upload/v1759951140/profile-photo_dznr2x.webp" /> {/* TODO: Add a public URL to your profile photo */}
        <meta property="og:site_name" content="Rohit Kumar's Portfolio" />

        {/* --- Twitter Card Meta Tags --- */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://rohitkumar-portfolio.vercel.app/" /> {/* IMPORTANT: Add your final domain here */}
        <meta name="twitter:title" content="Rohit Kumar | Full-Stack Developer & Creator of Study Hub" />
        <meta name="twitter:description" content="Discover projects, skills, and the Study Hub—a free resource for exam preparation." />
        <meta name="twitter:image" content="https://res.cloudinary.com/dlcvljnnu/image/upload/v1759951140/profile-photo_dznr2x.webp" /> {/* TODO: Add a public URL to your profile photo */}

        {/* --- Schema.org Markup --- */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      {/* --- Your Page Content --- */}
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