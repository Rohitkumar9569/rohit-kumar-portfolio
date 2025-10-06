import React, { useState } from 'react';
import ExamChoiceModal from '../components/ExamChoiceModal'; 

const StudyHubCTA = () => {
  const exams = ['GATE', 'UPSC', 'SSC', 'Railway'];
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Reusable premium button style
  const premiumButtonClasses = "inline-block font-bold text-lg px-8 py-3 rounded-xl bg-[hsl(var(--accent))] text-background shadow-lg shadow-[hsl(var(--accent)/0.3)] transition-all duration-300 ease-in-out hover:brightness-110 hover:-translate-y-1 hover:shadow-xl hover:shadow-[hsl(var(--accent)/0.5)] focus:outline-none focus:ring-4 focus:ring-[hsl(var(--accent)/0.5)]";

  return (
    <>
      <section id="study-hub" className="bg-background py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          {/* UPDATED: Added premium shadow and blur to the box */}
          <div className="relative bg-card/70 dark:bg-card/80 backdrop-blur-md border border-foreground/10 rounded-xl p-8 md:p-12 text-center overflow-hidden 
                      shadow-xl shadow-black/20 dark:shadow-cyan-500/10"> 
            {/* Themed glowing background animation */}
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-radial from-[hsl(var(--accent))/0.1] to-transparent animate-spin-slow"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Explore the <span className="text-[hsl(var(--accent))]">Study Hub</span>
              </h2>
              <p className="text-foreground/80 max-w-xl mx-auto mb-8">
                An interactive platform with previous year questions, smart search, and AI-powered chat to help you excel in your exams.
              </p>
              
              {/* Themed exam tags */}
              <div className="flex justify-center flex-wrap gap-3 mb-8">
                {exams.map(exam => (
                  <span key={exam} className="bg-[hsl(var(--accent))/0.1] text-[hsl(var(--accent))] text-sm font-semibold px-4 py-1 rounded-full">
                    {exam}
                  </span>
                ))}
              </div>

              {/* Premium 3D button */}
              <button
                onClick={() => setIsModalOpen(true)}
                className={premiumButtonClasses}
              >
                Enter Study Hub
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* This modal will also need to be updated to use the theme classes */}
      <ExamChoiceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default StudyHubCTA;