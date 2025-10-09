You want to add a unique, premium-style toast notification when the "Download Resume" button is clicked in the provided React component. This toast notification should confirm the download has started.
Here is the full, updated React component using react-hot-toast for professional, non-intrusive notifications.
1. Installation
First, you need to install the required package:
npm install react-hot-toast
# OR
yarn add react-hot-toast

2. Full React Component Code
I've made the following changes:
 * Imported toast and Toaster from react-hot-toast.
 * Created the handleDownload function to show the unique toast before starting the download.
 * Replaced the static <a> tag with a button that calls handleDownload.
 * Added the <Toaster /> component to render the notifications.
<!-- end list -->
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTypewriter, Cursor } from 'react-simple-typewriter';
import { HiOutlineArrowDownTray } from 'react-icons/hi2';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast'; 

// Import assets
import profilePhoto from '../assets/profile-photo.webp';
import googleLogo from '../assets/google-logo.svg';
import ibmLogo from '../assets/ibm-logo.svg';
import microsoftLogo from '../assets/microsoft-logo.svg';
import gkvLogo from '../assets/gkv-logo.webp';

// Define TypeScript interfaces for our data
interface Organization {
  name: string;
  logo: string;
  description: string;
}

interface TimelineItem {
  date: string;
  title: string;
  institutions: Organization[];
}

// Updated data structure
const timelineItems: TimelineItem[] = [
  {
    date: '2022 - 2026',
    title: 'B.Tech in Computer Science',
    institutions: [
      {
        name: 'Gurukul Kangri Vishwavidyalaya',
        logo: gkvLogo,
        description: 'An institution renowned for blending traditional Vedic education with modern scientific studies. My curriculum provides a strong foundation in computer science principles, from algorithms to software engineering, preparing me for the challenges of the tech industry.',
      },
    ],
  },
  {
    date: 'Certifications',
    title: 'Professional Development Courses',
    institutions: [
      {
        name: 'Google',
        logo: googleLogo,
        description: 'A global technology leader specializing in internet-related services. My certifications from Google cover crucial areas like Cybersecurity and UX Design, reflecting proficiency in industry-standard practices.',
      },
      {
        name: 'IBM',
        logo: ibmLogo,
        description: 'A pioneer in the tech industry, IBM is known for producing computer hardware, software, and providing hosting and consulting services. My training with IBM focuses on foundational concepts in Artificial Intelligence.',
      },
      {
        name: 'Microsoft',
        logo: microsoftLogo,
        description: 'A dominant force in software and cloud computing (Azure). My certifications from Microsoft validate my skills in Full-Stack Development and Cybersecurity fundamentals, aligning with current enterprise technology standards.',
      },
    ],
  },
  {
    date: 'Hands-On Experience',
    title: 'Software Developer - RoomRadar',
    institutions: [
      {
        name: 'Personal MERN Stack Project',
        logo: '', // No logo needed for this item
        description: 'RoomRadar is a comprehensive web application built from the ground up using the MERN stack. As the Software developer, I was responsible for the entire project lifecycle, from designing the database schema and building RESTful APIs to creating a dynamic, responsive user interface with React.',
      },
    ],
  },
];

// Animation variants
const containerVariant = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const About = () => {
  const [text] = useTypewriter({
    words: ['Full-Stack Developer', 'Software Engineer', 'Web Application Specialist'],
    loop: true, typeSpeed: 80, deleteSpeed: 50, delaySpeed: 2000,
  });

  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  // Function to handle download and show a premium toast
  const handleDownload = () => {
    // Show a unique, premium-style toast notification
    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className={`bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-2xl rounded-xl p-4 flex items-center gap-4 
                    ring-2 ring-cyan-500/50 dark:ring-cyan-400/50 backdrop-blur-sm transform-gpu`}
      >
        <HiOutlineArrowDownTray className="h-6 w-6 text-cyan-600 dark:text-cyan-400 animate-bounce" />
        <div>
          <p className="font-bold">Download Started! 🚀</p>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Rohit Kumar's Resume is downloading now.
          </p>
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </motion.div>
    ), { duration: 4000 }); // Show for 4 seconds

    // Programmatically create and click an anchor tag to trigger the actual download
    const link = document.createElement('a');
    link.href = '/Rohit-Kumar-Resume.pdf';
    link.download = 'Rohit-Kumar-Resume.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  // Reusable button styling for Timeline
  const timelineButtonClasses = `
    bg-gray-300/70 hover:bg-gray-400/50 
    dark:bg-slate-700/80 dark:hover:bg-slate-600/70 
    text-gray-800 dark:text-cyan-400 
    text-xs font-semibold py-1 px-3 rounded-full transition-colors
  `;

  // Reusable button styling for Resume download
  const resumeButtonClasses = `
    inline-flex items-center gap-2 font-bold py-3 px-8 rounded-full text-lg 
    bg-cyan-600 dark:bg-cyan-500 text-white 
    shadow-lg shadow-cyan-400/50 dark:shadow-cyan-800/50 
    transition-all duration-300 transform hover:scale-105 hover:bg-cyan-700 dark:hover:bg-cyan-600 
    hover:shadow-xl hover:shadow-cyan-400/70 cursor-pointer w-full sm:w-auto
  `;

  return (
    <>
      {/* Toaster component to render notifications */}
      <Toaster position="top-center" reverseOrder={false} /> 

      <section id="about" className="relative bg-slate-50 dark:bg-background min-h-screen flex items-center px-6 pt-28 pb-16 overflow-hidden">
        <motion.div
          className="container mx-auto z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          variants={containerVariant} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}
        >
          <motion.div variants={itemVariant} className="relative flex justify-center items-center lg:order-2">
            {/* Photo background glow (Cyan/Violet for theme) */}
            <div className="absolute w-72 h-72 sm:w-96 sm:h-96 bg-cyan-500/20 dark:bg-violet-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full overflow-hidden 
                shadow-2xl shadow-cyan-500/50 dark:shadow-violet-500/50 
                ">
              <img
                src={profilePhoto}
                alt="Rohit Kumar"
                className="w-full h-full object-cover"
                fetchpriority="high"
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariant} className="lg:order-1">
            {/* Heading color consistent */}
            <h1 className={`text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-center lg:text-left text-gray-800 dark:text-white`}>
              Hi, I'm <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">Rohit Kumar</span>
            </h1>
            {/* Typewriter text consistent */}
            <h2 className="text-2xl sm:text-3xl font-semibold my-4 h-10 text-center lg:text-left">
              <span className="whitespace-nowrap bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">{text}</span>
              <Cursor cursorColor="#06B6D4" />
            </h2>
            {/* Paragraph text consistent */}
            <p className={`text-lg mb-8 max-w-xl leading-relaxed mx-auto lg:mx-0 text-center lg:text-left text-gray-700 dark:text-slate-300`}>
              A passionate Computer Science student specializing in building beautiful, functional, and user-centric web applications.
            </p>

            {/* Timeline section */}
            <div className="relative border-l-2 border-gray-400/50 dark:border-slate-700/50 pl-8 mt-8">
              {timelineItems.map((item, index) => (
                <div key={index} className="mb-8 relative group">
                  {/* Accent Border Point */}
                  <div className="absolute -left-[41px] top-1 w-4 h-4 bg-white dark:bg-slate-900 rounded-full border-4 border-cyan-500 dark:border-cyan-400 shadow-lg shadow-cyan-300/50 dark:shadow-cyan-800/50"></div>
                  <p className="text-sm mb-1 text-gray-600 dark:text-gray-400">{item.date}</p>
                  <h3 className={`text-lg font-bold mb-2 text-gray-800 dark:text-white`}>{item.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {item.institutions.map(org => (
                      <button
                        key={org.name}
                        onClick={() => setSelectedOrg(org)}
                        className={timelineButtonClasses}
                      >
                        {org.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 mt-8 justify-center lg:justify-start">
              {/* Resume Button replaced with a functional button */}
              <button onClick={handleDownload} className={resumeButtonClasses}>
                Download Resume <HiOutlineArrowDownTray className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-6">
                {/* Social Icons with cyan hover */}
                <a
                  href="https://github.com/Rohitkumar9569"
                  aria-label="GitHub Profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-800 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                  <FaGithub size={32} />
                </a>
                {/* Social Icons with cyan hover */}
                <a
                  href="https://www.linkedin.com/in/rohit-kumar-bba12b25b/"
                  aria-label="LinkedIn Profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-800 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                  <FaLinkedin size={32} />
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Institution Detail Modal (No changes here) */}
      <AnimatePresence>
        {selectedOrg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            onClick={() => setSelectedOrg(null)}
            // Backdrop consistent
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 250, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              // Modal styling consistent
              className={`relative bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 
              border border-cyan-400/50 dark:border-cyan-700/50 rounded-2xl p-8 
              shadow-2xl shadow-cyan-300/30 dark:shadow-cyan-500/10 max-w-lg w-full transform-gpu
              text-gray-800 dark:text-white`}
            >
              <div className="flex flex-col items-center text-center">
                {selectedOrg.logo && (
                  <div className="mb-4 bg-cyan-100/50 dark:bg-slate-700/50 p-3 rounded-full">
                    <img src={selectedOrg.logo} alt={`${selectedOrg.name} Logo`} className="h-12 w-12" />
                  </div>
                )}
                <h3 className="text-3xl font-extrabold tracking-tight text-inherit">{selectedOrg.name}</h3>
                <p className="text-gray-600 dark:text-slate-300 leading-relaxed mt-4 text-lg">{selectedOrg.description}</p>
                <button
                  onClick={() => setSelectedOrg(null)}
                  className="mt-8 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-400/50 dark:shadow-cyan-800/50"
                >
                  Got it!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default About;

