// src/sections/About.tsx

import React from 'react';
import profilePhoto from '../assets/profile-photo.png';
import { HiOutlineArrowDownTray } from 'react-icons/hi2';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { useTypewriter, Cursor } from 'react-simple-typewriter';
import { motion } from 'framer-motion';

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

const timelineItems = [
  {
    date: '2022 - 2026',
    title: 'B.Tech in Computer Science',
    institution: 'Gurukul Kangri Vishwavidyalaya, Haridwar',
  },
  {
    date: 'Certifications',
    title: 'Professional Development Courses',
    institution: 'Google, IBM, Meta & Microsoft',
  },
  {
    date: 'Hands-On Experience',
    title: 'Lead Developer - RoomRadar',
    institution: 'Personal MERN Stack Project',
  },
];

const About = () => {
  const [text] = useTypewriter({
    words: [
      'Full-Stack Developer',
      'Software Engineer',
      'Web Application Specialist',
    ],
    loop: true,
    typeSpeed: 80,
    deleteSpeed: 50,
    delaySpeed: 2000,
  });

  return (
    // 1. ADDED PADDING TO FIX NAVBAR OVERLAP (pt-28)
    <section id="about" className="relative min-h-screen flex items-center px-6 pt-28 pb-16 overflow-hidden">
      <motion.div
        className="container mx-auto z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
        variants={containerVariant}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >

        {/* 2. PHOTO MOVED FIRST IN CODE, but will be second on desktop */}
        <motion.div variants={itemVariant} className="relative flex justify-center items-center lg:order-2">
          <div className="absolute w-72 h-72 sm:w-96 sm:h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full overflow-hidden shadow-2xl border-4 border-slate-800">
            <img src={profilePhoto} alt="Rohit Kumar" className="w-full h-full object-cover" />
          </div>
        </motion.div>

        {/* Text Column, will be first on desktop */}
        <motion.div variants={itemVariant} className="lg:order-1">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight text-center lg:text-left">
            Hi, I'm <span className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">Rohit Kumar</span>
          </h1>
          <h2 className="text-2xl sm:text-3xl font-semibold my-4 text-slate-300 h-10 text-center lg:text-left">
            {/* --- THIS IS THE LINE THAT WAS CHANGED --- */}
            <span className="whitespace-nowrap bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">{text}</span>
            <Cursor cursorColor="#06B6D4" />
          </h2>
          <p className="text-lg text-slate-400 mb-8 max-w-xl leading-relaxed mx-auto lg:mx-0 text-center lg:text-left">
            A passionate Computer Science graduate specializing in building beautiful, functional, and user-centric web applications.
          </p>

          <div className="relative border-l-2 border-slate-700 pl-8 mt-8">
            {timelineItems.map((item, index) => (
              <div key={index} className="mb-8 relative group">
                <div className="absolute -left-[41px] top-1 w-4 h-4 bg-slate-800 rounded-full border-4 border-cyan-500"></div>
                <p className="text-sm text-slate-400 mb-1">{item.date}</p>
                <h4 className="text-lg font-bold">{item.title}</h4>
                <p className="text-cyan-400 text-sm">{item.institution}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 mt-8 justify-center lg:justify-start">
            <a href="/Rohit-Kumar-Resume.pdf" download
              className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-8 rounded-full text-lg transition-all duration-300 transform hover:scale-105 cursor-pointer w-full sm:w-auto"
            >
              Download Resume <HiOutlineArrowDownTray className="h-5 w-5" />
            </a>
            <div className="flex items-center gap-6">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors"><FaGithub size={32} /></a>
              <a href="https://www.linkedin.com/in/rohit-kumar-bba12b25b/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors"><FaLinkedin size={32} /></a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default About;