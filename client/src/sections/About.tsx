import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTypewriter, Cursor } from 'react-simple-typewriter';
import toast from 'react-hot-toast';
import { HiOutlineArrowDownTray, HiCheckCircle } from 'react-icons/hi2'; // Import Check icon
import { FaGithub, FaLinkedin } from 'react-icons/fa';

// Import assets
import profilePhoto from '../assets/profile-photo.webp';
import googleLogo from '../assets/google-logo.svg';
import ibmLogo from '../assets/ibm-logo.svg';
import microsoftLogo from '../assets/microsoft-logo.svg';
import gkvLogo from '../assets/gkv-logo.webp';

// --- Interfaces and Data (No changes) ---
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
const timelineItems: TimelineItem[] = [
    {
      date: '2022 - 2026',
      title: 'B.Tech in Computer Science',
      institutions: [
        { name: 'Gurukul Kangri Vishwavidyalaya', logo: gkvLogo, description: 'An institution renowned for blending traditional Vedic education with modern scientific studies. My curriculum provides a strong foundation in computer science principles, from algorithms to software engineering, preparing me for the challenges of the tech industry.' },
      ],
    },
    {
      date: 'Certifications',
      title: 'Professional Development Courses',
      institutions: [
        { name: 'Google', logo: googleLogo, description: 'A global technology leader specializing in internet-related services. My certifications from Google cover crucial areas like Cybersecurity and UX Design, reflecting proficiency in industry-standard practices.' },
        { name: 'IBM', logo: ibmLogo, description: 'A pioneer in the tech industry, IBM is known for producing computer hardware, software, and providing hosting and consulting services. My training with IBM focuses on foundational concepts in Artificial Intelligence.' },
        { name: 'Microsoft', logo: microsoftLogo, description: 'A dominant force in software and cloud computing (Azure). My certifications from Microsoft validate my skills in Full-Stack Development and Cybersecurity fundamentals, aligning with current enterprise technology standards.' },
      ],
    },
    {
      date: 'Hands-On Experience',
      title: 'Software Developer - RoomRadar',
      institutions: [
        { name: 'Personal MERN Stack Project', logo: '', description: 'RoomRadar is a comprehensive web application built from the ground up using the MERN stack. As the Software developer, I was responsible for the entire project lifecycle, from designing the database schema and building RESTful APIs to creating a dynamic, responsive user interface with React.' },
      ],
    },
  ];

// --- Animation Variants (No changes) ---
const containerVariant = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.2 } } };
const itemVariant = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } };
const buttonContentVariant = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.3, ease: 'easeIn' } },
};

const About = () => {
  const [text] = useTypewriter({
    words: ['Full-Stack Developer', 'Software Engineer', 'Web Application Specialist'],
    loop: true, typeSpeed: 80, deleteSpeed: 50, delaySpeed: 2000,
  });

  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false); // State to track download

  // --- Professional Download Handler ---
  const handleDownload = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isDownloaded) {
      e.preventDefault(); // Prevent re-downloading if already downloaded
      return;
    }

    const toastId = toast.loading('Downloading Resume...');

    // We simulate a brief delay to allow the user to see the feedback.
    // The actual download starts instantly via the <a> tag.
    setTimeout(() => {
      toast.success('Download Complete!', { 
        id: toastId,
        style: { background: '#10B981', color: '#fff' }, // Green success toast
      });
      setIsDownloaded(true);
    }, 1500); // 1.5 second delay before showing success
  };

  // --- Reusable Button Styles (No changes) ---
  const timelineButtonClasses = `bg-gray-300/70 hover:bg-gray-400/50 dark:bg-slate-700/80 dark:hover:bg-slate-600/70 text-gray-800 dark:text-cyan-400 text-xs font-semibold py-1 px-3 rounded-full transition-colors`;
  const baseResumeButtonClasses = `inline-flex items-center justify-center gap-2 font-bold py-3 px-8 rounded-full text-lg shadow-lg transition-all duration-300 transform w-full sm:w-auto`;

  return (
    <>
      <section id="about" className="relative bg-slate-50 dark:bg-background min-h-screen flex items-center px-6 pt-28 pb-16 overflow-hidden">
        <motion.div
          className="container mx-auto z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          variants={containerVariant} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}
        >
          <motion.div variants={itemVariant} className="relative flex justify-center items-center lg:order-2">
            <div className="absolute w-72 h-72 sm:w-96 sm:h-96 bg-cyan-500/20 dark:bg-violet-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full overflow-hidden shadow-2xl shadow-cyan-500/50 dark:shadow-violet-500/50">
              <img src={profilePhoto} alt="Rohit Kumar" className="w-full h-full object-cover" fetchpriority="high" />
            </div>
          </motion.div>

          <motion.div variants={itemVariant} className="lg:order-1">
            <h1 className={`text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-center lg:text-left text-gray-800 dark:text-white`}>
              Hi, I'm <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">Rohit Kumar</span>
            </h1>
            <h2 className="text-2xl sm:text-3xl font-semibold my-4 h-10 text-center lg:text-left">
              <span className="whitespace-nowrap bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">{text}</span>
              <Cursor cursorColor="#06B6D4" />
            </h2>
            <p className={`text-lg mb-8 max-w-xl leading-relaxed mx-auto lg:mx-0 text-center lg:text-left text-gray-700 dark:text-slate-300`}>
              A passionate Computer Science student specializing in building beautiful, functional, and user-centric web applications.
            </p>

            <div className="relative border-l-2 border-gray-400/50 dark:border-slate-700/50 pl-8 mt-8">
              {timelineItems.map((item, index) => (
                <div key={index} className="mb-8 relative group">
                  <div className="absolute -left-[41px] top-1 w-4 h-4 bg-white dark:bg-slate-900 rounded-full border-4 border-cyan-500 dark:border-cyan-400 shadow-lg shadow-cyan-300/50 dark:shadow-cyan-800/50"></div>
                  <p className="text-sm mb-1 text-gray-600 dark:text-gray-400">{item.date}</p>
                  <h3 className={`text-lg font-bold mb-2 text-gray-800 dark:text-white`}>{item.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {item.institutions.map(org => (<button key={org.name} onClick={() => setSelectedOrg(org)} className={timelineButtonClasses}>{org.name}</button>))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 mt-8 justify-center lg:justify-start">
              <a
                href="/Rohit-Kumar-Resume.pdf"
                download="Rohit-Kumar-Resume.pdf"
                onClick={handleDownload}
                className={`${baseResumeButtonClasses} ${isDownloaded
                    ? 'bg-green-600 dark:bg-green-600 text-white cursor-not-allowed shadow-green-400/50 dark:shadow-green-800/50'
                    : 'bg-cyan-600 dark:bg-cyan-500 text-white shadow-cyan-400/50 dark:shadow-cyan-800/50 hover:scale-105 hover:bg-cyan-700 dark:hover:bg-cyan-600 hover:shadow-xl hover:shadow-cyan-400/70'
                  }`}
              >
                <AnimatePresence mode="wait">
                  {isDownloaded ? (
                    <motion.div key="downloaded" variants={buttonContentVariant} initial="hidden" animate="visible" exit="exit" className="flex items-center gap-2">
                      <HiCheckCircle className="h-6 w-6" /> Downloaded
                    </motion.div>
                  ) : (
                    <motion.div key="download" variants={buttonContentVariant} initial="hidden" animate="visible" exit="exit" className="flex items-center gap-2">
                      Download Resume <HiOutlineArrowDownTray className="h-5 w-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </a>
              <div className="flex items-center gap-6">
                <a href="https://github.com/Rohitkumar9569" aria-label="GitHub Profile" target="_blank" rel="noopener noreferrer" className="text-gray-800 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"><FaGithub size={32} /></a>
                <a href="https://www.linkedin.com/in/rohit-kumar-bba12b25b/" aria-label="LinkedIn Profile" target="_blank" rel="noopener noreferrer" className="text-gray-800 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"><FaLinkedin size={32} /></a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <AnimatePresence>
        {selectedOrg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} onClick={() => setSelectedOrg(null)} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
            <motion.div initial={{ scale: 0.8, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0, y: 30, transition: { duration: 0.2 } }} transition={{ type: "spring", stiffness: 250, damping: 25 }} onClick={(e) => e.stopPropagation()} className={`relative bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 border border-cyan-400/50 dark:border-cyan-700/50 rounded-2xl p-8 shadow-2xl shadow-cyan-300/30 dark:shadow-cyan-500/10 max-w-lg w-full transform-gpu text-gray-800 dark:text-white`}>
              <div className="flex flex-col items-center text-center">
                {selectedOrg.logo && (<div className="mb-4 bg-cyan-100/50 dark:bg-slate-700/50 p-3 rounded-full"><img src={selectedOrg.logo} alt={`${selectedOrg.name} Logo`} className="h-12 w-12" /></div>)}
                <h3 className="text-3xl font-extrabold tracking-tight text-inherit">{selectedOrg.name}</h3>
                <p className="text-gray-600 dark:text-slate-300 leading-relaxed mt-4 text-lg">{selectedOrg.description}</p>
                <button onClick={() => setSelectedOrg(null)} className="mt-8 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-400/50 dark:shadow-cyan-800/50">Got it!</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default About;