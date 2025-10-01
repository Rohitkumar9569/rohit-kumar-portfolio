import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';
import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

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
    if (isOpen && exams.length === 0) { // Fetch only if open and not already fetched
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
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-70 z-50"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 border border-slate-700 rounded-xl p-8 w-[90vw] max-w-2xl z-50"
              >
                <VisuallyHidden asChild>
                  <Dialog.Title>Choose Your Exam</Dialog.Title>
                </VisuallyHidden>
                <VisuallyHidden asChild>
                  <Dialog.Description>Select an exam category to view its previous year questions.</Dialog.Description>
                </VisuallyHidden>

                <Dialog.Close asChild>
                  <button className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </Dialog.Close>

                <h2 className="text-3xl font-bold text-center text-white mb-8">Choose Your Exam</h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {exams.map(exam => (
                    <Link
                      key={exam._id}
                      to={`/study/${exam.slug}`}
                      onClick={onClose}
                      className="bg-slate-700 p-4 rounded-lg text-center font-semibold text-white hover:bg-cyan-600 hover:scale-105 transition-all duration-300"
                    >
                      {exam.shortName}
                    </Link>
                  ))}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};

export default ExamChoiceModal;