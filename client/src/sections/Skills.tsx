// src/sections/Skills.tsx

import React, { useState } from 'react'; // <-- Import useState
import { motion } from 'framer-motion';
import PageLoader from '../components/PageLoader';
const ArchitectCanvas = React.lazy(() => import('../components/ArchitectCanvas'));
import CubeModal from '../components/CubeModal'; // <-- Import the new modal
import {
  FaReact, FaNodeJs, FaHtml5, FaCss3Alt, FaGitAlt, FaGithub, FaJsSquare, FaCode
} from 'react-icons/fa';
import {
  SiTypescript, SiMongodb, SiExpress, SiTailwindcss, SiVite, SiVercel, SiPostman, SiRedux, SiMongoose
} from 'react-icons/si';
import { HiCubeTransparent } from 'react-icons/hi2'; // <-- Icon for our new button

// Staggering animation variants
const containerVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const skillsData = [
  {
    category: 'Languages',
    items: [
      { name: 'TypeScript', icon: <SiTypescript size={32} /> },
      { name: 'JavaScript', icon: <FaJsSquare size={32} /> },
      { name: 'C#', icon: <FaCode size={32} /> },
      { name: 'HTML5', icon: <FaHtml5 size={32} /> },
      { name: 'CSS3', icon: <FaCss3Alt size={32} /> },
    ]
  },
  {
    category: 'Frontend',
    items: [
      { name: 'React', icon: <FaReact size={32} /> },
      { name: 'Redux', icon: <SiRedux size={32} /> },
      { name: 'Tailwind CSS', icon: <SiTailwindcss size={32} /> },
    ]
  },
  {
    category: 'Backend',
    items: [
      { name: 'Node.js', icon: <FaNodeJs size={32} /> },
      { name: 'Express.js', icon: <SiExpress size={32} /> },
    ]
  },
  {
    category: 'Database',
    items: [
      { name: 'MongoDB', icon: <SiMongodb size={32} /> },
      { name: 'Mongoose', icon: <SiMongoose size={32} /> },
    ]
  },
  {
    category: 'Tools & Platforms',
    items: [
      { name: 'Git', icon: <FaGitAlt size={32} /> },
      { name: 'GitHub', icon: <FaGithub size={32} /> },
      { name: 'Vite', icon: <SiVite size={32} /> },
      { name: 'Postman', icon: <SiPostman size={32} /> },
      { name: 'Vercel', icon: <SiVercel size={32} /> },
    ]
  },
];

const Skills = () => {
  const [isModalOpen, setIsModalOpen] = useState(false); // <-- Add state for the modal

  return (
    <>
      <section id="skills" className="py-20 px-6 overflow-hidden relative">
        <div className="container mx-auto">
          <motion.div
            variants={containerVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            <motion.h2 variants={itemVariant} className="text-4xl font-bold text-center mb-16">
              Skills & Technologies
            </motion.h2>

            <motion.div variants={itemVariant} className="lg:w-3/5 space-y-8">
              {skillsData.map((category) => (
                <div key={category.category}>
                  <h3 className="text-xl font-semibold text-cyan-400 mb-4">{category.category}</h3>
                  <div className="flex flex-wrap gap-4">
                    {category.items.map((skill) => (
                      <div key={skill.name} className="flex items-center gap-3 bg-slate-700/50 py-2 px-4 rounded-lg">
                        <div className="text-cyan-400">{skill.icon}</div>
                        <p className="font-semibold text-white">{skill.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>

            {/* --- NEW BUTTON FOR MOBILE --- */}
            <motion.div variants={itemVariant} className="mt-12 text-center lg:hidden">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-3 bg-slate-700 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
              >
                <HiCubeTransparent className="h-6 w-6" />
                View 3D Skill Cube
              </button>
            </motion.div>

          </motion.div>
        </div>

        {/* Floating cube for DESKTOP (unchanged) */}
        <motion.div
          className="absolute top-1/4 -translate-y-1/2 right-8 w-2/5 h-[500px] hidden lg:block"
          initial={{ opacity: 0, x: 100 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <ArchitectCanvas />
        </motion.div>
      </section>

      {/* The Modal component itself, which is hidden by default */}
      <CubeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default Skills;