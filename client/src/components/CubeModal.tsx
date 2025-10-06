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
          className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full h-full max-w-3xl max-h-[90vh] bg-slate-800/50 rounded-lg shadow-2xl border border-slate-700 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-2 right-2 p-2 bg-slate-700/50 rounded-full text-white hover:bg-slate-700 z-10"
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