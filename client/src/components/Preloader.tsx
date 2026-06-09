import { motion, animate } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api';

const preloaderVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const contentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut', staggerChildren: 0.08 },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

const logoVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut', delay: 0.1 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};

const nameWrapperVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delay: 0.15, staggerChildren: 0.06 },
  },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

const nameLetterVariants = {
  hidden: { y: '120%', opacity: 0 },
  visible: {
    y: '0%',
    opacity: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
};

const titleVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut', delay: 0.6 },
  },
};

const loadingBarContainerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.8, duration: 0.45, ease: 'easeOut' },
  },
  exit: { opacity: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};

const useLoadingMessages = (isComplete: boolean) => {
  const messages = [
    'Preparing Study Hub...',
    'Curating study resources...',
    'Aligning exam material...',
    'Almost ready...',
  ];
  const [message, setMessage] = useState(messages[0]);

  useEffect(() => {
    if (isComplete) {
      setMessage('Resources Ready');
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setMessage(messages[index]);
    }, 1500);

    return () => clearInterval(interval);
  }, [isComplete]);

  return message;
};

const AnimatedCounter = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(displayValue, value, {
      duration: 0.45,
      ease: 'easeOut',
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [value]);

  return <>{displayValue}</>;
};

interface PreloaderProps {
  onLoadComplete: () => void;
  imageToPreload: string;
}

const Preloader: React.FC<PreloaderProps> = ({ onLoadComplete, imageToPreload }) => {
  const [isMinTimeMet, setIsMinTimeMet] = useState(false);
  const serverWakeUrl = API_BASE_URL ? `${API_BASE_URL}/api/health` : '';
  const [isServerWoken, setIsServerWoken] = useState(!serverWakeUrl || !!sessionStorage.getItem('server_woken'));
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [progress, setProgress] = useState(0);

  const isLoadComplete = isMinTimeMet && isServerWoken && isImageLoaded;
  const loadingStatusMessage = useLoadingMessages(isLoadComplete);

  useEffect(() => {
    setTimeout(() => setIsMinTimeMet(true), 650);

    const progressInterval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          window.clearInterval(progressInterval);
          return 95;
        }
        return prev + 2;
      });
    }, 24);

    return () => window.clearInterval(progressInterval);
  }, []);

  useEffect(() => {
    if (isServerWoken || !serverWakeUrl) return;
    const wakeUpServer = async () => {
      try {
        await axios.get(serverWakeUrl);
        sessionStorage.setItem('server_woken', 'true');
      } catch (error) {
        console.error('Server wake-up call failed:', error);
      } finally {
        setIsServerWoken(true);
      }
    };
    wakeUpServer();
  }, [isServerWoken, serverWakeUrl]);

  useEffect(() => {
    const img = new Image();
    img.src = imageToPreload;
    img.onload = () => {
      setIsImageLoaded(true);
    };
    img.onerror = () => {
      console.error('Image preloading failed.');
      setIsImageLoaded(true);
    };
  }, [imageToPreload]);

  useEffect(() => {
    if (isLoadComplete) {
      setProgress(100);
      setTimeout(onLoadComplete, 250);
    }
  }, [isLoadComplete, onLoadComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 px-6 text-center dark:bg-slate-950 sm:px-8"
      key="preloader"
      initial="hidden"
      animate={isLoadComplete ? 'exit' : 'visible'}
      exit="exit"
      variants={preloaderVariants}
    >
      <motion.div
        className="flex flex-col items-center justify-center rounded-[2rem] border border-slate-200 bg-white/85 px-8 py-10 shadow-[0_24px_90px_rgba(15,23,42,0.12)] backdrop-blur md:px-12 md:py-14 dark:border-slate-800 dark:bg-slate-950/80"
        variants={contentVariants}
        initial="hidden"
        animate={isLoadComplete ? 'exit' : 'visible'}
      >
        <motion.div
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:h-24 md:w-24"
          variants={logoVariants}
        >
          <motion.img src="/favicon.svg" alt="Study Hub logo" className="h-full w-full object-contain" />
        </motion.div>

        <div className="max-w-xl">
          <motion.h1
            className="font-black uppercase tracking-[0.24em] text-slate-950 dark:text-white"
            variants={nameWrapperVariants}
            aria-label="STUDY HUB"
          >
            <span className="block text-4xl sm:text-5xl md:text-6xl">STUDY</span>
            <span className="mt-1 block text-4xl text-blue-700 sm:text-5xl md:text-6xl dark:text-cyan-300">HUB</span>
          </motion.h1>

          <div className="mt-3 overflow-hidden">
            <motion.p
              className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-600 dark:text-slate-400 sm:text-base"
              variants={titleVariants}
              aria-label="Preparation · Practice · Performance"
            >
              Preparation · Practice · Performance
            </motion.p>
          </div>
        </div>

        <motion.div className="mt-8 w-full max-w-sm" variants={loadingBarContainerVariants}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              {loadingStatusMessage}
            </p>
            <p className="text-sm font-semibold text-blue-700 dark:text-cyan-300">
              <AnimatedCounter value={progress} />%
            </p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Preloader;
