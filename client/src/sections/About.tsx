import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTypewriter, Cursor } from 'react-simple-typewriter';
import toast from 'react-hot-toast';
import { HiOutlineArrowDownTray, HiCheckCircle } from 'react-icons/hi2';
import { FaGithub, FaLinkedin } from 'react-icons/fa';

import { brandLogos, photoAssets } from '../assets';

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

const getHoverId = (prefix: string, name: string) =>
  `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

const timelineItems: TimelineItem[] = [
  {
    date: '2022 - 2026',
    title: 'B.Tech in Computer Science',
    institutions: [
      {
        name: 'Gurukul Kangri Vishwavidyalaya',
        logo: brandLogos.gkv,
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
        logo: brandLogos.google,
        description: 'A global technology leader specializing in internet-related services. My certifications from Google cover crucial areas like Cybersecurity and UX Design, reflecting proficiency in industry-standard practices.',
      },
      {
        name: 'IBM',
        logo: brandLogos.ibm,
        description: 'A pioneer in the tech industry, IBM is known for producing computer hardware, software, and providing hosting and consulting services. My training with IBM focuses on foundational concepts in Artificial Intelligence.',
      },
      {
        name: 'Microsoft',
        logo: brandLogos.microsoft,
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
        logo: '',
        description: 'RoomRadar is a comprehensive web application built from the ground up using the MERN stack. As the Software developer, I was responsible for the entire project lifecycle, from designing the database schema and building RESTful APIs to creating a dynamic, responsive user interface with React.',
      },
    ],
  },
];

const containerVariant = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.2 } } };
const itemVariant = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } } };
const buttonContentVariant = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.3, ease: 'easeIn' } },
};

const About = () => {
  const [text] = useTypewriter({
    words: ['Software Engineer', 'Full-Stack Developer', 'GATE DA & CSE Qualified', 'AI & Data Science Enthusiast', 'Problem Solver'],
    loop: true,
    typeSpeed: 80,
    deleteSpeed: 50,
    delaySpeed: 2000,
  });

  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);

  const handleDownload = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isDownloaded) {
      event.preventDefault();
      return;
    }

    const toastId = toast.loading('Downloading Resume...');
    setTimeout(() => {
      toast.success('Download Complete!', {
        id: toastId,
        style: { background: '#10B981', color: '#fff' },
      });
      setIsDownloaded(true);
    }, 1500);
  };

  const timelineButtonClasses = 'bg-gray-300/70 hover:bg-gray-400/50 dark:bg-slate-700/80 dark:hover:bg-slate-600/70 text-gray-800 dark:text-cyan-400 text-xs font-semibold py-1 px-3 rounded-full transition-colors';
  const baseResumeButtonClasses = 'inline-flex items-center justify-center gap-2 font-bold py-3 px-8 rounded-full text-lg shadow-lg transition-all duration-300 transform w-full sm:w-auto';

  return (
    <>
      <section id="about" className="portfolio-section-surface relative min-h-screen flex items-center px-6 pt-28 pb-16 overflow-hidden">
        <motion.div
          className="container mx-auto z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          variants={containerVariant}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          <motion.div variants={itemVariant} className="relative flex justify-center items-center lg:order-2">
            <div className="absolute w-72 h-72 sm:w-96 sm:h-96 bg-cyan-500/20 dark:bg-violet-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full overflow-hidden shadow-2xl shadow-cyan-500/50 dark:shadow-violet-500/50">
              <img src={photoAssets.profilePhoto} alt="Rohit Kumar" className="w-full h-full object-cover" fetchpriority="high" />
            </div>
          </motion.div>

          <motion.div variants={itemVariant} className="lg:order-1">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight text-center lg:text-left text-gray-800 dark:text-white">
              Hi, I'm <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">Rohit Kumar</span>
            </h1>
            <h2 className="text-2xl sm:text-3xl font-semibold my-4 h-10 text-center lg:text-left">
              <span className="whitespace-nowrap bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">{text}</span>
              <Cursor cursorColor="#06B6D4" />
            </h2>
            <p className="mb-8 w-full text-center text-base leading-7 text-gray-700 dark:text-slate-300 sm:text-lg lg:mx-0 lg:text-left lg:text-[clamp(0.88rem,1.2vw,1.125rem)] lg:leading-8">
              <span className="block lg:whitespace-nowrap">
                A Computer Science Engineer skilled in web development and Data Science.
              </span>
              <span className="block lg:whitespace-nowrap">
                GATE qualified in CSE and DA (AIR 7275), building scalable, intelligent systems.
              </span>
            </p>
            <div className="relative border-l-2 border-gray-400/50 dark:border-slate-700/50 pl-8 mt-8">
              {timelineItems.map((item, index) => (
                <div key={index} className="mb-8 relative group">
                  <div className="absolute -left-[41px] top-1 w-4 h-4 bg-white dark:bg-slate-900 rounded-full border-4 border-cyan-500 dark:border-cyan-400 shadow-lg shadow-cyan-300/50 dark:shadow-cyan-800/50"></div>
                  <p className="text-sm mb-1 text-gray-600 dark:text-gray-400">{item.date}</p>
                  <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">{item.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {item.institutions.map((org) => (
                      <span key={org.name} className="group/org relative z-20 inline-flex hover:z-50 focus-within:z-50">
                        <button
                          type="button"
                          onClick={() => setSelectedOrg(org)}
                          aria-describedby={getHoverId('timeline-org', org.name)}
                          className={timelineButtonClasses}
                        >
                          {org.name}
                        </button>
                        <span
                          id={getHoverId('timeline-org', org.name)}
                          role="tooltip"
                          className="pointer-events-none absolute bottom-[calc(100%+0.65rem)] left-0 z-50 w-[min(22rem,calc(100vw-2rem))] translate-y-2 rounded-2xl border border-cyan-300/50 bg-white/95 p-4 text-left text-slate-800 opacity-0 shadow-2xl shadow-cyan-500/20 ring-1 ring-white/70 backdrop-blur-xl transition-all duration-200 group-hover/org:translate-y-0 group-hover/org:opacity-100 group-focus-within/org:translate-y-0 group-focus-within/org:opacity-100 dark:border-cyan-500/25 dark:bg-slate-900/95 dark:text-white dark:shadow-cyan-950/50 dark:ring-white/10 sm:left-1/2 sm:-translate-x-1/2 lg:left-0 lg:translate-x-0"
                        >
                          <span className="mb-3 flex items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cyan-100 text-sm font-black text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-200">
                              {org.logo ? (
                                <img src={org.logo} alt={`${org.name} logo`} className="h-7 w-7 object-contain" />
                              ) : (
                                getInitials(org.name)
                              )}
                            </span>
                            <span className="text-base font-black leading-tight">{org.name}</span>
                          </span>
                          <span className="block text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                            {org.description}
                          </span>
                        </span>
                      </span>
                    ))}
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
                  ? 'bg-green-700/80 dark:bg-green-700/80 text-white cursor-not-allowed shadow-slate-950/80 dark:shadow-green-200/40'
                  : 'bg-cyan-600 dark:bg-cyan-500 text-white shadow-slate-950/80 dark:shadow-white/40 hover:scale-105 hover:bg-cyan-700 dark:hover:bg-cyan-600 hover:shadow-xl hover:shadow-cyan-400/70'
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
                <a href="https://github.com/Rohitkumar9569" aria-label="GitHub Profile" target="_blank" rel="noopener noreferrer" className="text-gray-800 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                  <FaGithub size={32} />
                </a>
                <a href="https://www.linkedin.com/in/rohit-kumar-bba12b25b/" aria-label="LinkedIn Profile" target="_blank" rel="noopener noreferrer" className="text-gray-800 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                  <FaLinkedin size={32} />
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <AnimatePresence>
        {selectedOrg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }} onClick={() => setSelectedOrg(null)} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
            <motion.div initial={{ scale: 0.8, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0, y: 30, transition: { duration: 0.2 } }} transition={{ type: 'spring', stiffness: 250, damping: 25 }} onClick={(event) => event.stopPropagation()} className="relative bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 border border-cyan-400/50 dark:border-cyan-700/50 rounded-2xl p-8 shadow-2xl shadow-cyan-300/30 dark:shadow-cyan-500/10 max-w-lg w-full transform-gpu text-gray-800 dark:text-white">
              <div className="flex flex-col items-center text-center">
                {selectedOrg.logo && (
                  <div className="mb-4 bg-cyan-100/50 dark:bg-slate-700/50 p-3 rounded-full">
                    <img src={selectedOrg.logo} alt={`${selectedOrg.name} Logo`} className="h-12 w-12" />
                  </div>
                )}
                <h3 className="text-3xl font-extrabold tracking-tight text-inherit">{selectedOrg.name}</h3>
                <p className="text-gray-600 dark:text-slate-300 leading-relaxed mt-4 text-lg">{selectedOrg.description}</p>
                <button onClick={() => setSelectedOrg(null)} className="mt-8 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg shadow-cyan-400/50 dark:shadow-cyan-800/50">
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
