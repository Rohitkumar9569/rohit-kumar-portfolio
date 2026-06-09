import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';
import * as Dialog from '@radix-ui/react-dialog';

interface IProps {
  isOpen: boolean;
  onClose: () => void;
}

const studyLinks = [
  { label: 'App', to: '/app', featured: true },
  { label: 'GATE', to: '/study/gate', featured: false },
  { label: 'UPSC', to: '/study/upsc', featured: false },
];

const ExamChoiceModal: React.FC<IProps> = ({ isOpen, onClose }) => {
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
                  className="relative 
                    bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 
                    border border-cyan-400/50 dark:border-cyan-700/50 
                    rounded-2xl p-6 sm:p-8 w-full max-w-2xl 
                    shadow-2xl shadow-cyan-300/30 dark:shadow-cyan-500/10"
                >
                  <Dialog.Title 
                    className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-7 tracking-tight"
                  >
                    Choose Your Exam
                  </Dialog.Title>

                  <Dialog.Close asChild>
                    <button 
                      className="absolute top-4 right-4 text-gray-600 dark:text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors" 
                      aria-label="Close"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </Dialog.Close>

                  <div className="mx-auto grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
                    {studyLinks.map((item) => (
                      <Link
                        key={item.label}
                        to={item.to}
                        onClick={onClose}
                        className={`rounded-xl border px-5 py-5 text-center text-lg font-black transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-cyan-400/20 ${
                          item.featured
                            ? 'border-cyan-300/50 bg-cyan-500 text-white shadow-lg shadow-cyan-400/25 dark:border-cyan-300/40 dark:bg-cyan-500/90'
                            : 'border-transparent bg-gray-300/70 text-gray-700 shadow-md shadow-cyan-800/20 hover:bg-cyan-500 hover:text-white hover:shadow-lg hover:shadow-cyan-400/50 dark:bg-slate-700/80 dark:text-white dark:shadow-cyan-800/20 dark:hover:bg-cyan-600 dark:hover:shadow-cyan-700/50'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
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
