// src/components/CubeModal.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ArchitectCanvas from './ArchitectCanvas';
import { XMarkIcon } from '@heroicons/react/24/solid';

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
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full h-full max-w-3xl max-h-[90vh] bg-slate-800/50 rounded-lg shadow-2xl border border-slate-700"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
          >
            <button
              onClick={onClose}
              className="absolute top-2 right-2 p-2 bg-slate-700/50 rounded-full text-white hover:bg-slate-700 z-10"
              aria-label="Close modal"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <ArchitectCanvas />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CubeModal;