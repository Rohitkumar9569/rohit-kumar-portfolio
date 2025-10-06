import React, { useState } from 'react';
import profilePhoto from '../assets/profile-photo.webp';
import { HiOutlineArrowDownTray } from 'react-icons/hi2';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { useTypewriter, Cursor } from 'react-simple-typewriter';
import { motion, AnimatePresence } from 'framer-motion';

// Import company logos
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

// Updated data structure with detailed descriptions
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

  // Custom Color Variables (Using the palette provided)
  const mainTextLight = 'text-[#0A192F]';
  const mainTextDark = 'dark:text-[#E6F1FF]';
  const accentColor = 'text-[#00F5D4]'; // Bright Cyan
  const accentHoverLight = 'hover:text-[#06B6D4]'; // Darker Cyan on Light Mode
  const accentHoverDark = 'dark:hover:text-[#00F5D4]'; // Bright Cyan on Dark Mode

  // Certification Button Colors 
  const certButtonBgLight = 'bg-[#E0F7FA]'; // Light Mode: Very light cyan/blue
  const certButtonHoverLight = 'hover:bg-[#B2EBF2]';

  // FIX: Dark Mode: No Border, Card BG (#112240) as button BG, Bright Text, Accent Hover
  const certButtonBgDark = 'dark:bg-[#112240]'; // Card Background
  const certButtonTextDark = 'dark:text-cyan-400'; // Bright Cyan text
  const certButtonHoverDarkBg = 'dark:hover:bg-[#00F5D4]'; // Hover on Accent Color
  const certButtonHoverDarkText = 'dark:hover:text-[#0A192F]'; // Hover Text to Navy Blue for contrast


  return (
    <>
      <section id="about" className="relative bg-background min-h-screen flex items-center px-6 pt-28 pb-16 overflow-hidden">
        <motion.div
          className="container mx-auto z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          variants={containerVariant} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}
        >
          <motion.div variants={itemVariant} className="relative flex justify-center items-center lg:order-2">
            <div className="absolute w-72 h-72 sm:w-96 sm:h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full overflow-hidden shadow-2xl border-4 border-primary">
              <img
                src={profilePhoto}
                alt="Rohit Kumar"
                className="w-full h-full object-cover"
                fetchpriority="high"
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariant} className="lg:order-1">
            <h1 className={`text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-center lg:text-left text-foreground ${mainTextLight} ${mainTextDark}`}>
              Hi, I'm <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">Rohit Kumar</span>
            </h1>
            <h2 className="text-2xl sm:text-3xl font-semibold my-4 text-primary-foreground h-10 text-center lg:text-left">
              <span className="whitespace-nowrap bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">{text}</span>
              <Cursor cursorColor="#06B6D4" />
            </h2>
            <p className={`text-lg mb-8 max-w-xl leading-relaxed mx-auto lg:mx-0 text-center lg:text-left text-primary-foreground text-gray-700 dark:text-slate-300`}>
              A passionate Computer Science student specializing in building beautiful, functional, and user-centric web applications.
            </p>

            <div className="relative border-l-2 border-primary pl-8 mt-8">
              {timelineItems.map((item, index) => (
                <div key={index} className="mb-8 relative group">
                  {/* Accent Border Point */}
                  <div className="absolute -left-[41px] top-1 w-4 h-4 bg-primary rounded-full border-4 border-cyan-500 dark:border-[#00F5D4]"></div>
                  <p className="text-sm mb-1 text-gray-600 dark:text-gray-400">{item.date}</p>
                  <h3 className={`text-lg font-bold mb-2 ${mainTextLight} ${mainTextDark}`}>{item.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {item.institutions.map(org => (
                      <button
                        key={org.name}
                        onClick={() => setSelectedOrg(org)}
                        // FINAL FIX: Removed dark:border and used dark:bg-[#112240] for a clean look
                        className={`
                            ${certButtonBgLight} ${certButtonHoverLight} ${mainTextLight}
                            ${certButtonBgDark} ${certButtonTextDark} ${certButtonHoverDarkBg} ${certButtonHoverDarkText} 
                            text-xs font-semibold py-1 px-3 rounded-full transition-colors`}
                      >
                        {org.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 mt-8 justify-center lg:justify-start">
              <a href="/Rohit-Kumar-Resume.pdf" download className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 cursor-pointer w-full sm:w-auto">
                Download Resume <HiOutlineArrowDownTray className="h-5 w-5" />
              </a>
              <div className="flex items-center gap-6">
                {/* Social Icons with high contrast */}
                <a
                  href="https://github.com/Rohitkumar9569"
                  aria-label="GitHub Profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-inherit ${mainTextLight} ${mainTextDark} ${accentHoverLight} ${accentHoverDark} transition-colors`}
                >
                  <FaGithub size={32} />
                </a>
                {/* Social Icons with high contrast */}
                <a
                  href="https://www.linkedin.com/in/rohit-kumar-bba12b25b/"
                  aria-label="LinkedIn Profile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-inherit ${mainTextLight} ${mainTextDark} ${accentHoverLight} ${accentHoverDark} transition-colors`}
                >
                  <FaLinkedin size={32} />
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <AnimatePresence>
        {selectedOrg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            onClick={() => setSelectedOrg(null)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 250, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className={`relative bg-white dark:bg-[#112240] 
                         border border-gray-200 dark:border-cyan-700/50 rounded-2xl p-8 
                         shadow-2xl shadow-cyan-500/10 max-w-lg w-full transform-gpu
                         ${mainTextLight} ${mainTextDark}`}
            >
              <div className="flex flex-col items-center text-center">
                {selectedOrg.logo && (
                  <div className="mb-4 bg-gray-200 dark:bg-slate-700 p-3 rounded-full">
                    <img src={selectedOrg.logo} alt={`${selectedOrg.name} Logo`} className="h-12 w-12" />
                  </div>
                )}
                <h3 className="text-3xl font-extrabold tracking-tight text-inherit">{selectedOrg.name}</h3>
                <p className="text-gray-600 dark:text-slate-300 leading-relaxed mt-4 text-lg">{selectedOrg.description}</p>
                <button
                  onClick={() => setSelectedOrg(null)}
                  className="mt-8 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-cyan-500/30"
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