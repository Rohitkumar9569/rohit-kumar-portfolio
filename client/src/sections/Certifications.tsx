import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineExternalLink } from 'react-icons/hi';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

// Import your assets
import googleLogo from '../assets/google-logo.svg';
import microsoftLogo from '../assets/microsoft-logo.svg';
import ibmLogo from '../assets/ibm-logo.svg';
import deeplearningaiLogo from '../assets/deeplearning-ai-logo.svg';
import umichLogo from '../assets/umich-logo.svg';

const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
};

const allCertificates = [
  { title: 'Foundations of Coding Full-Stack', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/5T4R9FNCJJNX', category: 'Full-Stack' },
  { title: 'Full-Stack Integration', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/T7LJHFMK5XYR', category: 'Full-Stack' },
  { title: 'Full-Stack Developer Capstone', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/O4CWE9AXHX6F', category: 'Full-Stack' },
  { title: 'Deployment and DevOps', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/GNIQI03YEJ5Z', category: 'Full-Stack' },
  { title: 'Performance Optimization and Scalability', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/5O5U4C484A35', category: 'Full-Stack' },
  { title: 'Security and Authentication', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/CZ48BIA5FNNK', category: 'Full-Stack' },
  { title: 'Foundations of Cybersecurity', provider: 'Google', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/3166B1M1O3TZ', category: 'Cybersecurity' },
  { title: 'Play It Safe: Manage Security Risks', provider: 'Google', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/A7ORLL7AN3AL', category: 'Cybersecurity' },
  { title: 'Connect and Protect: Network Security', provider: 'Google', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/DK781HXZB39E', category: 'Cybersecurity' },
  { title: 'Tools of the Trade: Linux and SQL', provider: 'Google', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/CQP2Z5VPKOEA', category: 'Cybersecurity' },
  { title: 'Assets, Threats, and Vulnerabilities', provider: 'Google', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/UU79RYJMK7JK', category: 'Cybersecurity' },
  { title: 'Automate Cybersecurity Tasks with Python', provider: 'Google', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/MSY5P50Q9P6V', category: 'Cybersecurity' },
  { title: 'Strategies for Cloud Security Risk Management', provider: 'Google Cloud', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/QTKCG3Q0G1ZJ', category: 'Cybersecurity' },
  { title: 'Advanced Cybersecurity Concepts and Capstone Project', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/AOB6RVDCQOVC', category: 'Cybersecurity' },
  { title: 'Cybersecurity Management and Compliance', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/7XN7TNBVJCGZ', category: 'Cybersecurity' },
  { title: 'Microsoft SC-900 Exam Preparation', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/8S40QQUSJB2N', category: 'Cybersecurity' },
  { title: 'Introduction to Programming With C#', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/G82JL8RWPCY0', category: 'Core CS' },
  { title: 'Data Structures and Algorithms', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/MEHUN8DT7T5K', category: 'Core CS' },
  { title: 'Programming for Everybody (Getting Started with Python)', provider: 'University of Michigan', logo: umichLogo, link: 'https://www.coursera.org/account/accomplishments/verify/80QPGU8GJ6LE', category: 'Core CS' },
  { title: 'Introduction to Computers and Operating Systems and Security', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/RCZCTXCEX3QY', category: 'Core CS' },
  { title: 'Introduction to Artificial Intelligence (AI)', provider: 'IBM', logo: ibmLogo, link: 'https://www.coursera.org/account/accomplishments/verify/FXGTPL3X62KM', category: 'AI & ML' },
  { title: 'AI For Everyone', provider: 'DeepLearning.AI', logo: deeplearningaiLogo, link: 'https://www.coursera.org/account/accomplishments/verify/BQA0F7XNOZK1', category: 'AI & ML' },
  { title: 'Foundations of User Experience (UX) Design', provider: 'Google', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/S3LDFFRH6NKK', category: 'Other' },
  { title: 'Gmail', provider: 'Google Cloud', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/QJAVLIQAXT5R', category: 'Other' },
];

const Certifications = () => {
  const categories = ['All', 'Full-Stack', 'Cybersecurity', 'Core CS', 'AI & ML', 'Other'];
  const [activeFilter, setActiveFilter] = useState('All');
  const [isExpanded, setIsExpanded] = useState(false);
  const INITIAL_VISIBLE_COUNT = 6;

  useEffect(() => {
    setIsExpanded(false);
  }, [activeFilter]);

  const filteredCertificates = activeFilter === 'All'
    ? allCertificates
    : allCertificates.filter(cert => cert.category === activeFilter);

  const certificatesToShow = isExpanded
    ? filteredCertificates
    : filteredCertificates.slice(0, INITIAL_VISIBLE_COUNT);

  return (
    // Background matching Skills component
    <section id="certifications" className="bg-slate-50 dark:bg-background py-20 px-6">
      <div className="container mx-auto">
        <motion.h2
          // Heading color consistent with other sections
          className="text-4xl font-bold text-center mb-12 text-gray-800 dark:text-white"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Certifications & Continuous Learning
        </motion.h2>

        <div className="flex justify-center flex-wrap gap-3 mb-12">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveFilter(category)}
              // Filter button styling matching Skills buttons
              className={`py-2 px-5 rounded-full text-sm font-semibold transition-colors duration-300 ${activeFilter === category
                  ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-white shadow-md shadow-cyan-300/50'
                  : 'bg-gray-300/70 text-gray-700 hover:bg-gray-400/50 dark:bg-slate-700/80 dark:text-slate-300 dark:hover:bg-slate-600/70'
                }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {certificatesToShow.map((cert) => (
                <motion.div
                  key={cert.title}
                  variants={itemVariant}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                >
                  <a
                    href={cert.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    // --- FIX: Card styling to match Skills buttons ---
                    className="block 
                      bg-gray-300/70 hover:bg-gray-400/50 
                      dark:bg-slate-700/80 dark:hover:bg-slate-600/70 
                      p-6 rounded-lg 
                      shadow-lg shadow-cyan-500/30 dark:shadow-cyan-800/50 
                      hover:shadow-xl hover:shadow-cyan-500/40 dark:hover:shadow-cyan-800/70 
                      hover:-translate-y-1 transition-all duration-300 h-full"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <img src={cert.logo} alt={`${cert.provider} Logo`} className="h-8" loading="lazy" />
                      {/* Link icon color accent */}
                      <HiOutlineExternalLink className="h-6 w-6 text-cyan-500 dark:text-cyan-400" />
                    </div>
                    {/* Title color consistent */}
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{cert.title}</h3>
                    {/* Provider text color consistent */}
                    <p className="text-gray-700 dark:text-slate-300">Provided by {cert.provider}</p>
                  </a>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Gradient fade at the bottom */}
          {!isExpanded && filteredCertificates.length > INITIAL_VISIBLE_COUNT && (
            <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-slate-50 dark:from-background to-transparent pointer-events-none"></div>
          )}
        </div>

        {filteredCertificates.length > INITIAL_VISIBLE_COUNT && (
          <div className="text-center mt-12">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              // Show More/Less button styling consistent with accent color and dark mode
              className="inline-flex items-center mx-auto gap-3 border font-semibold py-3 px-8 rounded-full transition-colors duration-300 
                bg-gray-300/70 hover:bg-gray-400/50 dark:bg-slate-700/80 dark:hover:bg-slate-600/70 
                text-cyan-600 dark:text-cyan-400 border-gray-300 dark:border-slate-700 shadow-md shadow-cyan-300/30 dark:shadow-cyan-800/30"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
              {isExpanded
                ? <ChevronUpIcon className="h-5 w-5 ml-2" />
                : <ChevronDownIcon className="h-5 w-5 ml-2" />
              }
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default Certifications;