import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { FiWifiOff } from 'react-icons/fi';

const PageLoader = () => {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex min-h-screen w-full items-center justify-center bg-slate-50 px-6 dark:bg-slate-950"
      role="status"
      aria-label="Loading Study Hub"
    >
      <div className="flex flex-col items-center text-center">
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200"
          >
            <FiWifiOff size={22} />
          </motion.div>
        )}

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400"
        >
          Rohit Kumar
        </motion.p>

        <motion.h2
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
        >
          Study<span className="text-blue-700 dark:text-blue-500">Hub</span>
        </motion.h2>

        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 80 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 h-px bg-slate-300 dark:bg-slate-700"
        />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4 text-[0.75rem] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600"
        >
          {isOnline ? 'Preparing your resources' : 'Offline mode • content will sync later'}
        </motion.p>
      </div>
    </motion.div>
  );
};

export default PageLoader;