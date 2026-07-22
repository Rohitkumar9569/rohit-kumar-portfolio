import { motion, animate, useMotionValue, useTransform } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api';

const useLoadingMessages = (isComplete: boolean) => {
  const messages = [
    'Preparing Study Hub...',
    'Curating study resources...',
    'Aligning exam material...',
    'Almost ready...',
  ];
  const [message, setMessage] = useState(messages[0]);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (isComplete) {
      setMessage('Resources Ready');
      setKey((k) => k + 1);
      return;
    }

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setMessage(messages[index]);
      setKey((k) => k + 1);
    }, 1800);

    return () => clearInterval(interval);
  }, [isComplete]);

  return { message, key };
};

const AnimatedCounter = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const controls = animate(prevValue.current, value, {
      duration: 0.5,
      ease: 'easeOut',
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      },
    });
    prevValue.current = value;
    return () => controls.stop();
  }, [value]);

  return <>{displayValue}</>;
};

const FloatingOrb = ({
  className,
  delay = 0,
  duration = 4,
}: {
  className: string;
  delay?: number;
  duration?: number;
}) => (
  <motion.div
    className={className}
    animate={{
      y: [0, -18, 0],
      opacity: [0.4, 0.7, 0.4],
      scale: [1, 1.08, 1],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
);

const PulsingRing = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    className="absolute inset-0 rounded-3xl border border-blue-500/20 dark:border-cyan-400/20"
    initial={{ opacity: 0, scale: 0.85 }}
    animate={{ opacity: [0, 0.6, 0], scale: [0.85, 1.18, 1.35] }}
    transition={{
      duration: 2.8,
      delay,
      repeat: Infinity,
      ease: 'easeOut',
    }}
  />
);

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
  const [isExiting, setIsExiting] = useState(false);

  const isLoadComplete = isMinTimeMet && isServerWoken && isImageLoaded;
  const { message: loadingStatusMessage, key: messageKey } = useLoadingMessages(isLoadComplete);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-200, 200], [4, -4]);
  const rotateY = useTransform(mouseX, [-200, 200], [-4, 4]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  useEffect(() => {
    setTimeout(() => setIsMinTimeMet(true), 700);

    const progressInterval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) {
          window.clearInterval(progressInterval);
          return 92;
        }
        const increment = prev < 40 ? 3 : prev < 70 ? 2 : 1;
        return prev + increment;
      });
    }, 28);

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
    img.onload = () => setIsImageLoaded(true);
    img.onerror = () => setIsImageLoaded(true);
  }, [imageToPreload]);

  useEffect(() => {
    if (isLoadComplete) {
      setProgress(100);
      setTimeout(() => {
        setIsExiting(true);
        setTimeout(onLoadComplete, 600);
      }, 320);
    }
  }, [isLoadComplete, onLoadComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-50 px-6 text-center dark:bg-[#060914] sm:px-8"
      key="preloader"
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: isExiting ? 0.6 : 0.35, ease: 'easeInOut' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <FloatingOrb
          className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-transparent blur-3xl dark:from-blue-500/15 dark:via-cyan-500/8"
          delay={0}
          duration={5}
        />
        <FloatingOrb
          className="absolute -bottom-24 -right-24 h-[360px] w-[360px] rounded-full bg-gradient-to-tl from-cyan-400/10 via-blue-400/5 to-transparent blur-3xl dark:from-cyan-400/15 dark:via-blue-500/8"
          delay={1.2}
          duration={4.5}
        />
        <FloatingOrb
          className="absolute left-1/2 top-1/4 h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-400/8 to-transparent blur-3xl dark:from-indigo-400/12"
          delay={0.6}
          duration={6}
        />

        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:48px_48px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,transparent_40%,rgba(248,250,252,0.95)_100%)] dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,transparent_40%,rgba(6,9,20,0.95)_100%)]" />
      </div>

      <motion.div
        style={{ rotateX, rotateY, transformPerspective: 1200 }}
        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
        className="relative w-full max-w-sm"
      >
        <motion.div
          className="relative flex flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/80 px-8 py-10 shadow-[0_32px_80px_rgba(15,23,42,0.10),0_0_0_1px_rgba(255,255,255,0.8)_inset] backdrop-blur-2xl dark:border-white/[0.07] dark:bg-white/[0.04] dark:shadow-[0_32px_80px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)_inset] md:px-12 md:py-12"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{
            opacity: isExiting ? 0 : 1,
            y: isExiting ? -16 : 0,
            scale: isExiting ? 0.97 : 1,
          }}
          transition={{ duration: isExiting ? 0.5 : 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent dark:via-cyan-400/30" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-300/50 to-transparent dark:via-white/[0.06]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(59,130,246,0.06),transparent)] dark:bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(34,211,238,0.05),transparent)]" />
          </div>

          <motion.div
            className="relative mb-7"
            initial={{ opacity: 0, scale: 0.8, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
          >
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.10),0_0_0_1px_rgba(255,255,255,0.9)_inset] dark:border-white/10 dark:bg-gradient-to-b dark:from-white/8 dark:to-white/4 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.08)_inset] md:h-24 md:w-24 md:rounded-3xl">
              <PulsingRing delay={0} />
              <PulsingRing delay={1.4} />
              <motion.img
                src="/favicon.svg"
                alt="Study Hub logo"
                className="relative z-10 h-full w-full object-contain"
                animate={{ rotate: [0, 0, 0] }}
              />
            </div>
          </motion.div>

          <motion.div
            className="mb-1 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.22 }}
          >
            <div className="overflow-hidden">
              <motion.h1
                className="font-black uppercase tracking-[0.22em] text-slate-950 dark:text-white"
                initial={{ y: '100%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
              >
                <span className="block text-4xl sm:text-5xl">STUDY</span>
              </motion.h1>
            </div>
            <div className="overflow-hidden">
              <motion.span
                className="block text-4xl font-black uppercase tracking-[0.22em] text-blue-700 sm:text-5xl dark:text-cyan-300"
                initial={{ y: '100%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.28 }}
              >
                HUB
              </motion.span>
            </div>
          </motion.div>

          <motion.p
            className="mb-8 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            Preparation · Practice · Performance
          </motion.p>

          <motion.div
            className="w-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.62 }}
          >
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <motion.p
                key={messageKey}
                className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400 dark:text-slate-500"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {loadingStatusMessage}
              </motion.p>
              <p className="shrink-0 text-xs font-black tabular-nums text-blue-700 dark:text-cyan-300">
                <AnimatedCounter value={progress} />%
              </p>
            </div>

            <div className="relative h-1 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/[0.07]">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-500 dark:from-blue-500 dark:via-cyan-400 dark:to-cyan-300"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
              <motion.div
                className="absolute inset-y-0 w-20 rounded-full bg-gradient-to-r from-transparent via-white/60 to-transparent"
                animate={{ x: ['-80px', '420px'] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  repeatDelay: 0.6,
                }}
              />
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="h-1 w-1 rounded-full bg-blue-600/50 dark:bg-cyan-400/50"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: 1.1,
                    delay: i * 0.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Preloader;