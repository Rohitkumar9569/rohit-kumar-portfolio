// src/sections/Projects.tsx

import React from 'react';
import SectionAnimator from '../components/SectionAnimator';
import { motion } from 'framer-motion';
import { FaGithub } from 'react-icons/fa';
import { HiOutlineExternalLink } from 'react-icons/hi';

// Import your project images
import roomRadarPreview from '../assets/roomradar-preview.jpeg';
import pending from '../assets/pending.png';
import pending1 from '../assets/pending1.png';
// import projectTwoPreview from '../assets/project-2.png'; // Example for next project
// import projectThreePreview from '../assets/project-3.png'; // Example for next project

// Data for your projects. To add more, just add a new object to this array.
const projectsData = [
  {
    title: 'RoomRadar - Room Rental Platform',
    image: roomRadarPreview,
    description: 'A full-stack MERN application for finding and listing rental rooms. Features user authentication, chat, and detailed room management for landlords.',
    techStack: ['React', 'Node.js', 'MongoDB', 'Express', 'Tailwind CSS'],
    liveLink: '#', // Replace with your live demo link
    githubLink: 'https://github.com/your-username/roomradar', // Replace with your GitHub link
  },
  {
    title: 'Project Two',
    image: pending, // Placeholder image
    description: 'A brief and engaging description of your second project will go here. Highlight the key features and the problem it solves.',
    techStack: ['Next.js', 'TypeScript', 'PostgreSQL'],
    liveLink: '#',
    githubLink: '#',
  },
  {
    title: 'Project Three',
    image: pending1, // Placeholder image
    description: 'Describe your third project. What technologies did you use? What makes this project special and worth showing off?',
    techStack: ['React', 'Firebase', 'Framer Motion'],
    liveLink: '#',
    githubLink: '#',
  },
];

const Projects = () => {
  return (
<SectionAnimator id="projects" className="py-20 px-6 ">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-center mb-16">Built Structures</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {projectsData.map((project, index) => (
            <motion.div
              key={index}
              className="bg-slate-900 rounded-lg overflow-hidden shadow-lg group transform transition-all duration-300 hover:shadow-cyan-500/20 hover:-translate-y-2"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.2 }}
            >
              <div className="overflow-hidden">
                <img src={project.image} alt={project.title} className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-110" />
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.techStack.map((tech, i) => (
                    <span key={i} className="bg-cyan-900/50 text-cyan-300 text-xs font-semibold px-2.5 py-1 rounded-full">{tech}</span>
                  ))}
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">{project.title}</h3>
                <p className="text-slate-400 text-sm mb-6">{project.description}</p>
                <div className="flex items-center gap-4">
                  <a href={project.liveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white font-semibold hover:text-cyan-400 transition-colors">
                    <HiOutlineExternalLink className="h-5 w-5" />
                    Live Demo
                  </a>
                  <a href={project.githubLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white font-semibold hover:text-cyan-400 transition-colors">
                    <FaGithub className="h-5 w-5" />
                    Source Code
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionAnimator>
  );
};

export default Projects;