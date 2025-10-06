// File: client/src/components/ExamChoiceModal.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';
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

  useEffect(() => {
    if (isOpen && exams.length === 0) {
      const fetchExams = async () => {
        try {
          const response = await API.get('/api/exams');
          const sortedExams = response.data.sort((a: IExamLink, b: IExamLink) => 
            a.shortName.localeCompare(b.shortName)
          );
          setExams(sortedExams);
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
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <Dialog.Content asChild>
                <motion.div
                  initial={{ y: -30, opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 30, opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="relative bg-card border border-foreground/10 rounded-2xl p-8 w-full max-w-2xl shadow-2xl shadow-black/10 dark:shadow-lg dark:shadow-[hsl(var(--accent))/0.1]"
                >
                  <Dialog.Title className="text-3xl font-bold text-center text-card-foreground mb-8 tracking-tight">
                    Choose Your Exam
                  </Dialog.Title>

                  <Dialog.Close asChild>
                    <button className="absolute top-4 right-4 text-card-foreground/60 hover:text-card-foreground transition-colors" aria-label="Close">
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </Dialog.Close>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {exams.length > 0 ? exams.map(exam => (
                      <Link
                        key={exam._id}
                        to={`/study/${exam.slug}`}
                        onClick={onClose}
                        // --- UPDATED: Added hover background and text color change ---
                        className="border border-foreground/10 p-4 rounded-lg text-center font-semibold text-foreground transition-all duration-300 hover:bg-[hsl(var(--accent))] hover:border-[hsl(var(--accent))] hover:text-background hover:-translate-y-1"
                      >
                        {exam.shortName}
                      </Link>
                    )) : (
                      <p className="col-span-full text-center text-foreground/60">Loading exams...</p>
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