import React, { useState } from 'react';
import ExamChoiceModal from '../components/ExamChoiceModal';
// Note: ExamChoiceModal will also need to be styled consistently

const StudyHubCTA = () => {
    const exams = ['GATE', 'UPSC', 'SSC', 'Railway'];

    const [isModalOpen, setIsModalOpen] = useState(false);

    // Reusable premium button style (FIXED to use Cyan and standard colors)
    const premiumButtonClasses = "inline-block font-bold text-lg px-8 py-3 rounded-xl " +
        "bg-cyan-600 text-white dark:bg-cyan-500 " +
        "shadow-lg shadow-cyan-400/50 dark:shadow-cyan-800/50 " +
        "transition-all duration-300 ease-in-out " +
        "hover:bg-cyan-700 dark:hover:bg-cyan-600 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-400/70 focus:outline-none focus:ring-4 focus:ring-cyan-500/50";

    return (
        <>
            {/* Section background consistent with other components (slate-50/background is assumed to be the main section background) */}
            <section id="study-hub" className="bg-slate-50 dark:bg-background py-20 px-6">
                <div className="container mx-auto max-w-4xl">
                    {/* --- FIX: CTA Box styling to match Skills/Certifications cards --- */}
                    <div className="relative 
                        bg-gray-300/70 dark:bg-slate-700/80 backdrop-blur-md 
                        border border-cyan-400/50 dark:border-cyan-700/50 
                        rounded-xl p-8 md:p-12 text-center overflow-hidden 
                        shadow-xl shadow-cyan-500/30 dark:shadow-cyan-800/50">
                        {/* Themed glowing background animation (FIXED color) */}
                        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-radial from-cyan-500/10 to-transparent animate-spin-slow"></div>

                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-white mb-4">
                                Explore the <span className="text-cyan-600 dark:text-cyan-400">Study Hub</span>
                            </h2>
                            {/* Text color consistent with other components */}
                            <p className="text-gray-700 dark:text-slate-300 max-w-xl mx-auto mb-8">
                                An interactive platform with previous year questions, smart search, and AI-powered chat to help you excel in your exams.
                            </p>

                            {/* Themed exam tags (FIXED color) */}
                            <div className="flex justify-center flex-wrap gap-3 mb-8">
                                {exams.map(exam => (
                                    <span key={exam} className="bg-cyan-100/50 dark:bg-slate-700/50 text-cyan-700 dark:text-cyan-400 text-sm font-semibold px-4 py-1 rounded-full">
                                        {exam}
                                    </span>
                                ))}
                            </div>

                            {/* Premium 3D button uses the updated classes */}
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