// File: client/src/components/ExamChoiceModal.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api'; // Assuming this is defined and exports an Axios-like instance
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';
import * as Dialog from '@radix-ui/react-dialog';

interface IExamLink {
  _id: string;
  shortName: string;
  slug: string;
}

interface IProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExamChoiceModal: React.FC<IProps> = ({ isOpen, onClose }) => {
  const [exams, setExams] = useState<IExamLink[]>([]);
  const [isLoading, setIsLoading] = useState(false); // To handle loading state

  useEffect(() => {
    // Only fetch if the modal is open AND the exam list is empty
    if (isOpen && exams.length === 0 && !isLoading) {
      const fetchExams = async () => {
        setIsLoading(true); // Start loading

        try {
          // --- LINKING TO REAL DATA ---
          // This API call assumes your backend is running and reachable at '/api/exams'
          const response = await API.get('/api/exams'); 
          
          const sortedExams = response.data.sort((a: IExamLink, b: IExamLink) => 
            a.shortName.localeCompare(b.shortName)
          );
          setExams(sortedExams);

        } catch (error) {
          console.error("Failed to fetch exams for modal:", error);
          // Optional: You could set an error state here to show a message in the modal
        } finally {
          setIsLoading(false); // End loading
        }
      };
      fetchExams();
    }
  // Added isLoading to dependency array to prevent double fetching
  }, [isOpen, exams.length, isLoading]); 

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                // Backdrop consistent with Skills modal
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <Dialog.Content asChild>
                <motion.div
                  initial={{ y: -30, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 30, opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  // Modal styling consistent with theme
                  className="relative 
                    bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 
                    border border-cyan-400/50 dark:border-cyan-700/50 
                    rounded-2xl p-8 w-full max-w-2xl 
                    shadow-2xl shadow-cyan-300/30 dark:shadow-cyan-500/10"
                >
                  <Dialog.Title 
                    // Title color consistent
                    className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8 tracking-tight"
                  >
                    Choose Your Exam
                  </Dialog.Title>

                  <Dialog.Close asChild>
                    <button 
                      // Close button color consistent
                      className="absolute top-4 right-4 text-gray-600 dark:text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors" 
                      aria-label="Close"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </Dialog.Close>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Display loading message or exam links */}
                    {isLoading ? (
                      <p className="col-span-full text-center text-cyan-500 dark:text-cyan-400">Loading exams...</p>
                    ) : exams.length > 0 ? (
                      exams.map(exam => (
                        <Link
                          key={exam._id}
                          to={`/study/${exam.slug}`}
                          onClick={onClose}
                          // Button styling consistent with theme
                          className="p-4 rounded-lg text-center font-semibold 
                              bg-gray-300/70 dark:bg-slate-700/80 
                              text-gray-700 dark:text-white
                              border border-transparent 
                              transition-all duration-300 
                              shadow-md shadow-cyan-800/20 dark:shadow-cyan-800/20 
                              hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-600 
                              hover:shadow-lg hover:shadow-cyan-400/50 dark:hover:shadow-cyan-700/50 
                              hover:-translate-y-1"
                        >
                          {exam.shortName}
                        </Link>
                      ))
                    ) : (
                      <p className="col-span-full text-center text-rose-500 dark:text-rose-400">Failed to load exams or no exams available.</p>
                    )}
                  </div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};

export default ExamChoiceModal;