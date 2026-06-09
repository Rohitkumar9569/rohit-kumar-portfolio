import SectionAnimator from '../components/SectionAnimator';
import { motion } from 'framer-motion';
import { FaGithub } from 'react-icons/fa';
import { HiOutlineExternalLink } from 'react-icons/hi';

import roomRadarPreview from '../assets/media/photos/roomradar-preview.webp';
import mockpanel from '../assets/media/photos/mockpanel.webp';
import studyHubPreview from '../assets/media/photos/studyhub-preview.png';

const projectsData = [
  {
    title: 'Study Hub - Premium Learning Platform',
    image: studyHubPreview,
    description: 'A full-stack learning platform with curated resources, PYQs, PDF reading, AI assistance, saved library workflows, and admin tools.',
    techStack: ['React', 'TypeScript', 'Node.js', 'MongoDB', 'Tailwind CSS'],
    liveLink: 'https://rohitkumar-portfolio.vercel.app/app',
    githubLink: 'https://github.com/Rohitkumar9569/rohit-kumar-portfolio',
  },
  {
    title: 'RoomRadar - Room Rental Platform',
    image: roomRadarPreview,
    description: 'A full-stack MERN application for finding and listing rental rooms with authentication, chat, and detailed landlord room management.',
    techStack: ['React', 'Node.js', 'MongoDB', 'Express', 'Tailwind CSS'],
    liveLink: 'https://roomradarindia.vercel.app',
    githubLink: 'https://github.com/Rohitkumar9569/ROOMRADAR',
  },
  {
    title: 'MockPanel',
    image: mockpanel,
    description: 'Elite AI board interview simulation with real-time evaluation and feedback.',
    techStack: ['Next.js', 'TypeScript', 'PostgreSQL'],
    liveLink: 'https://mock-panel.vercel.app/',
    githubLink: 'https://github.com/226301182-dotcom/MockPanel',
    status: 'In Development Phase',
  },
];

const Projects = () => (
  <SectionAnimator id="projects" className="portfolio-section-surface py-20 px-6">
    <div className="container mx-auto">
      <h2 className="text-4xl font-bold text-center mb-16 text-gray-800 dark:text-white">Built Structures</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {projectsData.map((project, index) => (
          <motion.div
            key={project.title}
            className="flex h-full flex-col overflow-hidden rounded-lg bg-gray-300/70 shadow-xl shadow-cyan-500/30 transition-all duration-300 hover:-translate-y-2 hover:bg-gray-400/50 hover:shadow-2xl hover:shadow-cyan-500/40 dark:bg-slate-700/80 dark:shadow-cyan-800/50 dark:hover:bg-slate-600/70 dark:hover:shadow-cyan-800/70 group"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: index * 0.2 }}
          >
            <div className="relative overflow-hidden">
              {project.status && (
                <span className="absolute left-4 top-4 z-10 inline-flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-amber-300/70 bg-slate-950/90 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-amber-200 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl dark:border-amber-300/60 dark:bg-slate-950/90 dark:text-amber-200">
                  <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.95)]" aria-hidden="true" />
                  {project.status}
                </span>
              )}
              <img src={project.image} alt={project.title} className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
            </div>
            <div className="flex flex-1 flex-col p-6">
              <div className="mb-4 flex min-h-[4.5rem] flex-wrap content-start gap-2">
                {project.techStack.map((tech) => (
                  <span key={tech} className="bg-gray-300/70 dark:bg-slate-700/80 text-gray-700 dark:text-cyan-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {tech}
                  </span>
                ))}
              </div>
              <h3 className="mb-3 min-h-[4rem] text-2xl font-bold leading-tight text-gray-800 dark:text-white">{project.title}</h3>
              <p className="mb-6 min-h-[4.75rem] flex-grow text-sm leading-6 text-gray-700 dark:text-slate-300">{project.description}</p>
              <div className="mt-auto flex items-center gap-4">
                <a href={project.liveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-semibold hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors">
                  <HiOutlineExternalLink className="h-5 w-5" />
                  Live Demo
                </a>
                <a href={project.githubLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-semibold hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors">
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

export default Projects;
