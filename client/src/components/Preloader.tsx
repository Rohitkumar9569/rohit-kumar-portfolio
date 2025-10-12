import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

// --- Animation Variants ---

const preloaderVariants = {
  exit: {
    opacity: 0,
    transition: { duration: 0.6, ease: 'easeOut' }
  }
};

const contentVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
      when: "afterChildren",
      duration: 0.3
    }
  }
};

const logoVariants = {
  hidden: { opacity: 0, scale: 0.3, },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 150, damping: 20, delay: 0.1 }
  },
  exit: {
    scale: 1.5,
    opacity: 0,
    transition: { duration: 0.5, ease: 'easeIn' }
  }
};

// ✨ NEW: Variants for the Name's Masked Reveal Animation
const nameWrapperVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delay: 0.2,
      staggerChildren: 0.05, // Controls the speed of the letter-by-letter reveal
    },
  },
  exit: {
    y: -20,
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  }
};

// ✨ NEW: Variants for each letter inside the mask
const nameLetterVariants = {
  hidden: { y: "120%" }, // Starts below the mask
  visible: {
    y: "0%", // Slides up into view
    transition: { type: "spring", stiffness: 300, damping: 25 }
  },
};

// ✨ NEW: Variants for the Title's Masked Reveal Animation
const titleVariants = {
  hidden: { opacity: 0, y: "100%" },
  visible: {
    opacity: 1,
    y: "0%",
    transition: { duration: 0.6, ease: 'easeOut', delay: 0.8 }
  },
  exit: {
    y: -20,
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  }
};

const loadingBarContainerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 1.2, duration: 0.5, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  }
};

// --- Custom Hook for Dynamic Loading Messages (Unchanged) ---
const useLoadingMessages = (isComplete: boolean) => {
    const messages = [
        'Initializing session...',
        'Waking up the server...',
        'Optimizing assets...',
        'Almost there...',
    ];
    const [message, setMessage] = useState(messages[0]);

    useEffect(() => {
        if (isComplete) {
            setMessage('Launch Complete');
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

// --- Animated Counter Component (Unchanged) ---
const AnimatedCounter = ({ value }: { value: number }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const controls = animate(displayValue, value, {
            duration: 0.5,
            ease: "easeOut",
            onUpdate: (latest) => {
                setDisplayValue(Math.round(latest));
            }
        });
        return () => controls.stop();
    }, [value]);

    return <>{displayValue}</>;
};

// --- Main Preloader Component ---
interface PreloaderProps {
    onLoadComplete: () => void;
    imageToPreload: string;
}

const Preloader: React.FC<PreloaderProps> = ({ onLoadComplete, imageToPreload }) => {
    const [isMinTimeMet, setIsMinTimeMet] = useState(false);
    const [isServerWoken, setIsServerWoken] = useState(!!sessionStorage.getItem('server_woken'));
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [progress, setProgress] = useState(0);

    const isLoadComplete = isMinTimeMet && isServerWoken && isImageLoaded;
    const loadingStatusMessage = useLoadingMessages(isLoadComplete);

    // Effect 1: Minimum Display Time & Progress Simulation (Unchanged)
    useEffect(() => {
        setTimeout(() => setIsMinTimeMet(true), 3000);

        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) {
                    clearInterval(progressInterval);
                    return 95;
                }
                return prev + 2;
            });
        }, 80);
        
        return () => clearInterval(progressInterval);
    }, []);

    // Effect 2: Server Wake-up Call (Unchanged)
    useEffect(() => {
        if (isServerWoken) return;
        const wakeUpServer = async () => {
            try {
                await axios.get(import.meta.env.VITE_API_URL);
                sessionStorage.setItem('server_woken', 'true');
            } catch (error) {
                console.error('Server wake-up call failed:', error);
            } finally {
                setIsServerWoken(true);
            }
        };
        wakeUpServer();
    }, [isServerWoken]);

  

    //  NAYA EFFECT For Image Preloading 
    useEffect(() => {
        const img = new Image();
        img.src = imageToPreload;    
        img.onload = () => {
            console.log("Profile photo successfully preloaded.");
            setIsImageLoaded(true);
        };
        img.onerror = () => {
            console.error("Image preloading failed.");
            setIsImageLoaded(true); 
        };
    }, [imageToPreload]); 


    // Effect 3: Global Completion Check (Unchanged)
    useEffect(() => {
        if (isLoadComplete) {
            setProgress(100);
            setTimeout(onLoadComplete, 1200);
        }
    }, [isLoadComplete, onLoadComplete]);

    // Parallax/Tilt Effects (Unchanged)
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-150, 150], [10, -10]);
    const rotateY = useTransform(x, [-150, 150], [-10, 10]);

    const handleMouseMove = (event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        x.set(event.clientX - rect.left - rect.width / 2);
        y.set(event.clientY - rect.top - rect.height / 2);
    };

    const handleMouseLeave = () => {
        animate(x, 0, { type: 'spring', stiffness: 150, damping: 20 });
        animate(y, 0, { type: 'spring', stiffness: 150, damping: 20 });
    };

    const nameText = "ROHIT KUMAR";
    const titleText = "FULL-STACK DEVELOPER";

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 dark:bg-slate-900"
            key="preloader"
            exit="exit"
            variants={preloaderVariants}
        >
            <motion.div
                style={{ rotateX, rotateY, perspective: 1000 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="flex flex-col items-center justify-center p-8"
                variants={contentVariants}
                initial="hidden"
                animate={isLoadComplete ? "exit" : "visible"}
            >
                {/* --- PROFESSIONAL LOGO WITH PULSATING GLOW (Unchanged) --- */}
                <motion.div 
                    className="relative w-28 h-28 md:w-36 md:h-36 flex items-center justify-center"
                    variants={logoVariants}
                >
                    <motion.div
                        className="absolute w-full h-full bg-cyan-500/25 rounded-full blur-2xl"
                        animate={{ 
                            scale: [1, 1.15, 1],
                            opacity: [0.7, 1, 0.7],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                    />
                    <motion.img
                        src="/favicon.svg"
                        alt="Logo"
                        className="relative w-full h-full"
                    />
                </motion.div>

                <div className="text-center mt-6">
                    {/* ✨ UPDATED: Name animation with masked reveal */}
                    <motion.h1
                        className="text-3xl font-extrabold md:text-4xl text-gray-800 dark:text-gray-100 tracking-wider"
                        variants={nameWrapperVariants}
                        aria-label={nameText}
                    >
                        {nameText.split("").map((char, index) => (
                            <span className="inline-block overflow-hidden" key={char + "-" + index}>
                                <motion.span className="inline-block" variants={nameLetterVariants}>
                                    {char === " " ? "\u00A0" : char}
                                </motion.span>
                            </span>
                        ))}
                    </motion.h1>

                    {/* ✨ UPDATED: Title animation with masked reveal */}
                    <div className="overflow-hidden mt-1">
                      <motion.p
                          className="text-lg md:text-xl text-cyan-600 dark:text-cyan-400 font-semibold tracking-wide"
                          variants={titleVariants}
                          aria-label={titleText}
                      >
                          {titleText}
                      </motion.p>
                    </div>
                </div>
            
                {/* --- Loading Bar and Status (Unchanged) --- */}
                <motion.div 
                    className="mt-12 w-64 flex flex-col items-center"
                    variants={loadingBarContainerVariants}
                >
                    <div className="w-full flex justify-between items-center mb-2">
                        <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">
                            {loadingStatusMessage}
                        </p>
                        <p className="text-sm font-mono text-cyan-600 dark:text-cyan-400">
                            <AnimatedCounter value={progress} />%
                        </p>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-cyan-500 rounded-full"
                            initial={{ width: '0%' }}
                            animate={{ width: `${progress}%` }}
                            transition={{ type: "spring", stiffness: 100, damping: 30 }}
                        />
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
};

export default Preloader;