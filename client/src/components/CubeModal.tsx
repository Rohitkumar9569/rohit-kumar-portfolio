import React, { Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';
import PageLoader from './PageLoader';

// Lazy-load the heavy 3D component
const ArchitectCanvas = lazy(() => import('./ArchitectCanvas'));

interface CubeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CubeModal: React.FC<CubeModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // Backdrop ko aur transparent banaya gaya (pehle light mein /10 aur dark mein /10 tha)
          className="fixed inset-0 bg-neutral-100/10 dark:bg-neutral-400/10 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            // Modal ke background ko transparent banaya gaya hai taaki 3D model achhe se dikhe)
            className="relative w-full h-full max-w-3xl max-h-[70vh] 
                       bg-zinc-400/10 border border-gray-400/60
                       dark:bg-slate-700/10 dark:border-slate-700/40
                       backdrop-blur-lg rounded-lg shadow-2xl flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-2 right-2 p-2 rounded-full z-10
                         text-black bg-gray-200/50 hover:bg-gray-300
                         dark:text-white dark:bg-slate-700/50 dark:hover:bg-slate-700"
              aria-label="Close modal"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            
            <Suspense fallback={<PageLoader />}>
              <ArchitectCanvas />
            </Suspense>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CubeModal;