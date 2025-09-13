// src/sections/Certifications.tsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import googleLogo from '../assets/google-logo.svg';
import microsoftLogo from '../assets/microsoft-logo.svg';
import ibmLogo from '../assets/ibm-logo.svg';
import deeplearningaiLogo from '../assets/deeplearning-ai-logo.svg';
import umichLogo from '../assets/umich-logo.svg'; // You will need to add this logo
import { HiOutlineExternalLink } from 'react-icons/hi';

const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const Certifications = () => {
  // A complete list of all 24 certificates, categorized
  const allCertificates = [
    // Full-Stack
    { title: 'Foundations of Coding Full-Stack', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/5T4R9FNCJJNX?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Full-Stack' },
    { title: 'Full-Stack Integration', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/T7LJHFMK5XYR?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Full-Stack' },
    { title: 'Full-Stack Developer Capstone', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/O4CWE9AXHX6F?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Full-Stack' },
    { title: 'Deployment and DevOps', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/GNIQI03YEJ5Z?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Full-Stack' },
    { title: 'Performance Optimization and Scalability', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/5O5U4C484A35?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Full-Stack' },
    { title: 'Security and Authentication', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/CZ48BIA5FNNK?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Full-Stack' },
    
    // Cybersecurity
    { title: 'Foundations of Cybersecurity', provider: 'Google', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/3166B1M1O3TZ?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Cybersecurity' },
    { title: 'Play It Safe: Manage Security Risks', provider: 'Google', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/A7ORLL7AN3AL?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Cybersecurity' },
    { title: 'Connect and Protect: Network Security', provider: 'Google', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/DK781HXZB39E?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Cybersecurity' },
    { title: 'Tools of the Trade: Linux and SQL', provider: 'Google', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/CQP2Z5VPKOEA?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Cybersecurity' },
    { title: 'Assets, Threats, and Vulnerabilities', provider: 'Google', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/UU79RYJMK7JK?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Cybersecurity' },
    { title: 'Automate Cybersecurity Tasks with Python', provider: 'Google', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/MSY5P50Q9P6V?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Cybersecurity' },
    { title: 'Strategies for Cloud Security Risk Management', provider: 'Google Cloud', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/QTKCG3Q0G1ZJ?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Cybersecurity' },
    { title: 'Advanced Cybersecurity Concepts and Capstone Project', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/AOB6RVDCQOVC?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Cybersecurity' },
    { title: 'Cybersecurity Management and Compliance', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/7XN7TNBVJCGZ?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Cybersecurity' },
    { title: 'Microsoft SC-900 Exam Preparation', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/8S40QQUSJB2N?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Cybersecurity' },

    // Core CS & Programming
    { title: 'Introduction to Programming With C#', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/G82JL8RWPCY0?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Core CS' },
    { title: 'Data Structures and Algorithms', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/MEHUN8DT7T5K?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Core CS' },
    { title: 'Programming for Everybody (Getting Started with Python)', provider: 'University of Michigan', logo: umichLogo, link: 'https://www.coursera.org/account/accomplishments/verify/80QPGU8GJ6LE?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Core CS' },
    { title: 'Introduction to Computers and Operating Systems and Security', provider: 'Microsoft', logo: microsoftLogo, link: 'https://www.coursera.org/account/accomplishments/verify/RCZCTXCEX3QY?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Core CS' },

    // AI & ML
    { title: 'Introduction to Artificial Intelligence (AI)', provider: 'IBM', logo: ibmLogo, link: 'https://www.coursera.org/account/accomplishments/verify/FXGTPL3X62KM?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'AI & ML' },
    { title: 'AI For Everyone', provider: 'DeepLearning.AI', logo: deeplearningaiLogo, link: 'https://www.coursera.org/account/accomplishments/verify/BQA0F7XNOZK1?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'AI & ML' },

    // Other
    { title: 'Foundations of User Experience (UX) Design', provider: 'Google', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/S3LDFFRH6NKK?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Other' },
    { title: 'Gmail', provider: 'Google Cloud', logo: googleLogo, link: 'https://www.coursera.org/account/accomplishments/verify/QJAVLIQAXT5R?utm_source%3Dandroid%26utm_medium%3Dcertificate%26utm_content%3Dcert_image%26utm_campaign%3Dsharing_cta%26utm_product%3Dcourse', category: 'Other' },
  ];

  // We add 'Core CS' and 'Other' to the categories list
  const categories = ['All', 'Full-Stack', 'Cybersecurity', 'Core CS', 'AI & ML', 'Other'];
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredCertificates = activeFilter === 'All'
    ? allCertificates
    : allCertificates.filter(cert => cert.category === activeFilter);

  return (
    <section id="certifications" className="py-20 px-6">
      <div className="container mx-auto">
        <motion.h2 
          className="text-4xl font-bold text-center mb-8"
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
              className={`py-2 px-5 rounded-full text-sm font-semibold transition-colors duration-300 ${
                activeFilter === category 
                ? 'bg-cyan-500 text-white' 
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={activeFilter}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {filteredCertificates.map((cert, index) => (
              <motion.div key={cert.title + index} custom={index} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariant}>
                <a href={cert.link} target="_blank" rel="noopener noreferrer" className="block bg-slate-800 p-6 rounded-lg shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-2 transition-all duration-300 h-full">
                  <div className="flex justify-between items-start mb-4">
                    <img src={cert.logo} alt={`${cert.provider} Logo`} className="h-8" />
                    <HiOutlineExternalLink className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{cert.title}</h3>
                  <p className="text-slate-400">Provided by {cert.provider} via Coursera</p>
                </a>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

export default Certifications;