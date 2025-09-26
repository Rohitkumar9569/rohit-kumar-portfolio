// File: client/src/sections/StudyHubCTA.tsx
import React, { useState } from 'react';
import ExamChoiceModal from '../components/ExamChoiceModal'; 

const StudyHubCTA = () => {
  const exams = ['GATE', 'UPSC', 'SSC', 'Railway'];
  
  // 2. Add state to control the modal's visibility
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section id="study-hub" className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="relative bg-slate-800/50 border border-slate-700 rounded-xl p-8 md:p-12 text-center overflow-hidden">
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-radial from-cyan-500/10 to-transparent animate-spin-slow"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Explore the <span className="text-cyan-400">Study Hub</span>
              </h2>
              <p className="text-slate-300 max-w-xl mx-auto mb-8">
                An interactive platform with previous year questions, smart search, and AI-powered chat to help you excel in your exams.
              </p>
              
              <div className="flex justify-center flex-wrap gap-3 mb-8">
                {exams.map(exam => (
                  <span key={exam} className="bg-slate-700 text-slate-200 text-sm font-semibold px-4 py-1 rounded-full">
                    {exam}
                  </span>
                ))}
              </div>

              {/* 3. The <Link> is now a <button> that opens the modal */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-block bg-cyan-600 text-white font-bold text-lg px-8 py-3 rounded-md hover:bg-cyan-700 transition-transform hover:scale-105 duration-300 shadow-lg shadow-cyan-500/20"
              >
                Enter Study Hub
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Render the modal component */}
      <ExamChoiceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default StudyHubCTA;