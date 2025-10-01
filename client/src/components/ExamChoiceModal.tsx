// File: client/src/components/ExamChoiceModal.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';
import * as Dialog from '@radix-ui/react-dialog';

// Defines the shape of the exam data.
interface IExamLink {
  _id: string;
  shortName: string;
  slug: string;
}

// Defines the component's props.
interface IProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExamChoiceModal: React.FC<IProps> = ({ isOpen, onClose }) => {
  const [exams, setExams] = useState<IExamLink[]>([]);

  useEffect(() => {
    // Fetch exams only once when the modal is opened for the first time.
    if (isOpen && exams.length === 0) {
      const fetchExams = async () => {
        try {
          const response = await API.get('/api/exams');
          setExams(response.data);
        } catch (error) {
          console.error("Failed to fetch exams for modal:", error);
        }
      };
      fetchExams();
    }
  }, [isOpen, exams.length]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            {/* Modal Overlay: Dims the background content. */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/70"
              />
            </Dialog.Overlay>

            {/* Centering Container: This new div uses Flexbox to perfectly center the modal. */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <Dialog.Content asChild>
                <motion.div
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 30, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="relative bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-2xl"
                >
                  <Dialog.Title className="text-3xl font-bold text-center text-white mb-8">
                    Choose Your Exam
                  </Dialog.Title>

                  <Dialog.Close asChild>
                    <button className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors" aria-label="Close">
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </Dialog.Close>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {exams.length > 0 ? exams.map(exam => (
                      <Link
                        key={exam._id}
                        to={`/study/${exam.slug}`}
                        onClick={onClose}
                        className="bg-slate-700 p-4 rounded-lg text-center font-semibold text-white hover:bg-cyan-600 hover:scale-105 transition-all duration-300"
                      >
                        {exam.shortName}
                      </Link>
                    )) : (
                      <p className="col-span-full text-center text-slate-400">Loading exams...</p>
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