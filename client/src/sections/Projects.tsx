import React from 'react';
import SectionAnimator from '../components/SectionAnimator';
import { motion } from 'framer-motion';
import { FaGithub } from 'react-icons/fa';
import { HiOutlineExternalLink } from 'react-icons/hi';

// Import your project images
import roomRadarPreview from '../assets/roomradar-preview.webp';
import pending from '../assets/pending.webp';
import pending1 from '../assets/pending1.webp';

const projectsData = [
  {
    title: 'RoomRadar - Room Rental Platform',
    image: roomRadarPreview,
    description: 'A full-stack MERN application for finding and listing rental rooms. Features user authentication, chat, and detailed room management for landlords.',
    techStack: ['React', 'Node.js', 'MongoDB', 'Express', 'Tailwind CSS'],
    liveLink: '#',
    githubLink: 'https://github.com/your-username/roomradar',
  },
  {
    title: 'Project Two',
    image: pending,
    description: 'A brief and engaging description of your second project will go here. Highlight the key features and the problem it solves.',
    techStack: ['Next.js', 'TypeScript', 'PostgreSQL'],
    liveLink: '#',
    githubLink: '#',
  },
  {
    title: 'Project Three',
    image: pending1,
    description: 'Describe your third project. What technologies did you use? What makes this project special and worth showing off?',
    techStack: ['React', 'Firebase', 'Framer Motion'],
    liveLink: '#',
    githubLink: '#',
  },
];

const Projects = () => {
  return (
    <SectionAnimator id="projects" className="bg-background py-20 px-6">
      <div className="container mx-auto">
        <h2 className="text-4xl font-bold text-center mb-16 text-foreground">Built Structures</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {projectsData.map((project, index) => (
            <motion.div
              key={index}
              // --- Dynamic classes for both light and dark modes ---
              className="bg-primary dark:bg-slate-900 rounded-lg overflow-hidden shadow-lg group transform transition-all duration-300 hover:shadow-xl hover:shadow-[hsl(var(--accent))/0.2] dark:hover:shadow-cyan-500/20 hover:-translate-y-2"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.2 }}
            >
              <div className="overflow-hidden">
                <img src={project.image} alt={project.title} className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy"/>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.techStack.map((tech, i) => (
                    // --- Dynamic tech stack tags ---
                    <span key={i} className="bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] dark:bg-cyan-900/50 dark:text-cyan-300 text-xs font-semibold px-2.5 py-1 rounded-full">{tech}</span>
                  ))}
                </div>
                {/* --- Dynamic text colors --- */}
                <h3 className="text-2xl font-bold mb-3 text-foreground dark:text-white">{project.title}</h3>
                <p className="text-foreground/80 dark:text-slate-400 text-sm mb-6">{project.description}</p>
                <div className="flex items-center gap-4">
                  <a href={project.liveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-foreground dark:text-white font-semibold hover:text-[hsl(var(--accent))] dark:hover:text-cyan-400 transition-colors">
                    <HiOutlineExternalLink className="h-5 w-5" />
                    Live Demo
                  </a>
                  <a href={project.githubLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-foreground dark:text-white font-semibold hover:text-[hsl(var(--accent))] dark:hover:text-cyan-400 transition-colors">
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