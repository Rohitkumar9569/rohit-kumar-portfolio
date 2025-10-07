import React, { Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CubeModal from '../components/CubeModal';
const ArchitectCanvas = React.lazy(() => import('../components/ArchitectCanvas'));

import {
  FaReact, FaNodeJs, FaHtml5, FaCss3Alt, FaGitAlt, FaGithub, FaJsSquare, FaCode
} from 'react-icons/fa';
import {
  SiTypescript, SiMongodb, SiExpress, SiTailwindcss, SiVite, SiVercel, SiPostman, SiRedux, SiMongoose
} from 'react-icons/si';
import { HiCubeTransparent } from 'react-icons/hi2';

interface Skill {
  name: string;
  icon: React.ReactElement;
  description: string;
}

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
      { name: 'TypeScript', icon: <SiTypescript size={32} />, description: 'A superset of JavaScript that adds static types, improving code quality and maintainability in large-scale applications.' },
      { name: 'JavaScript', icon: <FaJsSquare size={32} />, description: 'The core language of the web, enabling dynamic and interactive user experiences on both the client and server side.' },
      { name: 'C#', icon: <FaCode size={32} />, description: 'A modern, object-oriented language from Microsoft, used to build robust web APIs, desktop apps, and games with the .NET framework.' },
      { name: 'HTML5', icon: <FaHtml5 size={32} />, description: 'The standard markup language for creating the structure and content of web pages with semantic meaning.' },
      { name: 'CSS3', icon: <FaCss3Alt size={32} />, description: 'The language for styling web pages, used to create visually engaging designs, responsive layouts, and animations.' },
    ]
  },
  {
    category: 'Frontend',
    items: [
      { name: 'React', icon: <FaReact size={32} />, description: 'A powerful JavaScript library for building complex user interfaces with a reusable, component-based architecture.' },
      { name: 'Redux', icon: <SiRedux size={32} />, description: 'A predictable state container for JavaScript apps, essential for managing complex application-wide state in a centralized way.' },
      { name: 'Tailwind CSS', icon: <SiTailwindcss size={32} />, description: 'A utility-first CSS framework that allows for rapid, custom UI development directly within the HTML markup.' },
    ]
  },
  {
    category: 'Backend',
    items: [
      { name: 'Node.js', icon: <FaNodeJs size={32} />, description: 'A JavaScript runtime that allows for building fast, scalable, and high-performance server-side applications.' },
      { name: 'Express.js', icon: <SiExpress size={32} />, description: 'A minimal and flexible Node.js web framework that simplifies the process of building robust APIs and web applications.' },
    ]
  },
  {
    category: 'Database',
    items: [
      { name: 'MongoDB', icon: <SiMongodb size={32} />, description: 'A popular NoSQL document database that offers flexibility and scalability for modern, data-intensive applications.' },
      { name: 'Mongoose', icon: <SiMongoose size={32} />, description: 'An Object Data Modeling (ODM) library for MongoDB and Node.js that provides schema validation and simplifies database interactions.' },
    ]
  },
  {
    category: 'Tools & Platforms',
    items: [
      { name: 'Git', icon: <FaGitAlt size={32} />, description: 'An essential distributed version control system for tracking code changes, managing project history, and collaborating with teams.' },
      { name: 'GitHub', icon: <FaGithub size={32} />, description: 'The leading web-based platform for Git repository hosting, facilitating code collaboration, review, and project management.' },
      { name: 'Vite', icon: <SiVite size={32} />, description: 'A next-generation frontend build tool that provides an extremely fast development experience and optimized production builds.' },
      { name: 'Postman', icon: <SiPostman size={32} />, description: 'A comprehensive platform for the API lifecycle, used for designing, testing, documenting, and monitoring APIs.' },
      { name: 'Vercel', icon: <SiVercel size={32} />, description: 'A cloud platform optimized for frontend developers, offering seamless deployment, scalability, and performance for modern web applications.' },
    ]
  },
];

const Skills = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  return (
    <>
      <section id="skills" className="bg-background py-20 px-6 overflow-hidden relative text-gray-800 dark:text-white">
        <div className="container mx-auto">
          <motion.div
            variants={containerVariant}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            <motion.h2 variants={itemVariant} className="text-4xl font-bold text-center mb-16 text-gray-800 dark:text-white">
              Skills & Technologies
            </motion.h2>

            <motion.div variants={itemVariant} className="lg:w-3/5 space-y-8">
              {skillsData.map((category) => (
                <div key={category.category}>
                  <h3 className="text-xl font-semibold text-cyan-600 dark:text-cyan-400 mb-4">{category.category}</h3>
                  <div className="flex flex-wrap gap-4">
                    {category.items.map((skill) => (
                      <button
                        key={skill.name}
                        onClick={() => setSelectedSkill(skill)}
className="flex items-center text-left gap-3  bg-gray-300/70 hover:bg-gray-400/50   dark:bg-slate-700/80 dark:hover:bg-slate-600/70     py-2 px-4 rounded-lg transition-transform hover:scale-105   shadow-lg shadow-cyan-800/50 dark:shadow-lg dark:shadow-cyan-800/50"                      >
                        <div className="text-cyan-500 dark:text-cyan-400">{skill.icon}</div>
                        <p className="font-semibold text-gray-700 dark:text-white">{skill.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div variants={itemVariant} className="mt-12 text-center lg:hidden">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-3 bg-gray-200 dark:bg-slate-700 hover:bg-cyan-500 text-gray-800 dark:text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
              >
                <HiCubeTransparent className="h-6 w-6" />
                View 3D Skill Cube
              </button>
            </motion.div>

          </motion.div>
        </div>

        <motion.div
          className="absolute top-1/4 -translate-y-1/2 right-8 w-2/5 h-[500px] hidden lg:block"
          initial={{ opacity: 0, x: 100 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <Suspense fallback={null}>
            <ArchitectCanvas />
          </Suspense>
        </motion.div>
      </section>

      <CubeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <AnimatePresence>
        {selectedSkill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            onClick={() => setSelectedSkill(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 30, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 250, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              // --- FIX: Correctly apply gradient only in dark mode ---
              className="relative bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 border border-cyan-400/50 dark:border-cyan-700/50 rounded-2xl p-8 shadow-xl dark:shadow-2xl shadow-cyan-300/30 dark:shadow-cyan-500/10 max-w-md w-full"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 bg-cyan-100/50 dark:bg-slate-700/50 p-4 rounded-full text-cyan-600 dark:text-cyan-400">
                  {React.cloneElement(selectedSkill.icon, { size: 48 })}
                </div>
                <h3 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">{selectedSkill.name}</h3>
                <p className="text-gray-600 dark:text-slate-300 leading-relaxed mt-4 text-lg">{selectedSkill.description}</p>
                <button
                  onClick={() => setSelectedSkill(null)}
                  className="mt-8 bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-md shadow-cyan-300/50 dark:shadow-lg dark:hover:shadow-cyan-500/30"
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

export default Skills;