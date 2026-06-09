import { useState } from 'react';
import { Link } from 'react-router-dom';
import ExamChoiceModal from '../components/ExamChoiceModal';

const StudyHubCTA = () => {
  const exams = [
    { label: 'App', to: '/app' },
    { label: 'GATE', to: '/study/gate' },
    { label: 'UPSC', to: '/study/upsc' },
  ];
  const [isModalOpen, setIsModalOpen] = useState(false);

  const premiumButtonClasses = 'inline-block font-bold text-lg px-8 py-3 rounded-xl ' +
    'bg-cyan-600 text-white dark:bg-cyan-500 ' +
    'shadow-lg shadow-cyan-400/50 dark:shadow-cyan-800/50 ' +
    'transition-all duration-300 ease-in-out ' +
    'hover:bg-cyan-700 dark:hover:bg-cyan-600 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-400/70 focus:outline-none focus:ring-4 focus:ring-cyan-500/50';

  return (
    <>
      <section id="study-hub" className="portfolio-section-surface py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="relative bg-gray-300/70 dark:bg-slate-700/80 backdrop-blur-md border border-cyan-400/50 dark:border-cyan-700/50 rounded-xl p-8 md:p-12 text-center overflow-hidden shadow-xl shadow-cyan-500/30 dark:shadow-cyan-800/50">
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-radial from-cyan-500/10 to-transparent animate-spin-slow"></div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-4">
                Explore the <span className="text-cyan-600 dark:text-cyan-400">Study Hub</span>
              </h2>
              <p className="text-gray-700 dark:text-slate-300 max-w-xl mx-auto mb-8">
                An interactive platform with previous year questions, smart search, and AI-powered chat to help you excel in your exams.
              </p>

              <div className="flex justify-center flex-wrap gap-3 mb-8">
                {exams.map((exam) => (
                  <Link
                    key={exam.label}
                    to={exam.to}
                    className="group rounded-full border border-cyan-300/40 bg-cyan-100/60 px-4 py-1.5 text-sm font-black text-cyan-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-500 hover:text-white hover:shadow-lg hover:shadow-cyan-400/25 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 dark:border-cyan-500/20 dark:bg-slate-700/55 dark:text-cyan-300 dark:hover:border-cyan-300/50 dark:hover:bg-cyan-500/20 dark:hover:text-white"
                  >
                    {exam.label}
                  </Link>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className={premiumButtonClasses}
              >
                Enter Study Hub
              </button>
            </div>
          </div>
        </div>
      </section>

      <ExamChoiceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default StudyHubCTA;
