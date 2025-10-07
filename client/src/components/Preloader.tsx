import { motion, useMotionValue, useTransform } from 'framer-motion';
import React, { useEffect } from 'react';
import axios from 'axios';

// --- Theme-Aware Animation Variants (Optimized for Cyan/Professional Look) ---
const svgVariants = {
  hidden: {
    opacity: 0,
    scale: 0.5,
    pathLength: 0,
    fill: "rgba(0, 0, 0, 0)"
  },
  visible: {
    opacity: 1,
    scale: 1,
    pathLength: 1,
    fill: "#06B6D4",
    transition: {
      pathLength: { duration: 1.5, ease: "easeInOut" },
      fill: { delay: 1.5, duration: 0.5, ease: "easeOut" },
    }
  }
};

const textVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { delay: 1.2, duration: 0.8, ease: "easeOut" }
  }
};

// Props to handle the minimum display time and completion logic
interface PreloaderProps {
    onLoadComplete: () => void;
}

const Preloader: React.FC<PreloaderProps> = ({ onLoadComplete }) => {
    const [isMinTimeMet, setIsMinTimeMet] = React.useState(false);
    const [isServerWoken, setIsServerWoken] = React.useState(!!sessionStorage.getItem('server_woken'));
    const [progress, setProgress] = React.useState(0); // New: Progress state

    // --- EFFECT 1: Minimum Display Time & Progress Simulation ---
    useEffect(() => {
        // Min time logic
        const minTimeTimeout = setTimeout(() => {
            setIsMinTimeMet(true);
        }, 2000); 

        // Progress simulation (0 to 95%)
        let currentProgress = 0;
        const progressInterval = setInterval(() => {
            currentProgress = Math.min(95, currentProgress + 3); // Cap at 95%
            setProgress(currentProgress);
            if (currentProgress >= 95) clearInterval(progressInterval);
        }, 100);

        return () => {
            clearTimeout(minTimeTimeout);
            clearInterval(progressInterval);
        };
    }, []);

    // --- EFFECT 2: Server Wake-up Call ---
    useEffect(() => {
        const wakeUpServer = async () => {
            if (isServerWoken) return;

            try {
                // Wait briefly before making the call for better UX timing
                await new Promise(resolve => setTimeout(resolve, 500)); 
                await axios.get(import.meta.env.VITE_API_URL);
                sessionStorage.setItem('server_woken', 'true');
                setIsServerWoken(true);
            } catch (error) {
                console.error('Server wake-up call failed:', error);
                setIsServerWoken(true); 
            }
        };

        wakeUpServer();
    }, [isServerWoken]);
    
    // --- EFFECT 3: Global Completion Check & Progress Finalization ---
    useEffect(() => {
        if (isMinTimeMet && isServerWoken) {
            // Finalize progress bar to 100% before calling complete
            setProgress(100); 
            const finalDelay = setTimeout(onLoadComplete, 300); // 300ms delay for 100% animation

            return () => clearTimeout(finalDelay);
        }
    }, [isMinTimeMet, isServerWoken, onLoadComplete]);


    // --- Parallax/Tilt Effects (Unchanged) ---
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [15, -15]);
    const rotateY = useTransform(x, [-100, 100], [-15, 15]);

    const handleMouseMove = (event: React.MouseEvent) => {
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        x.set(event.clientX - rect.left - rect.width / 2);
        y.set(event.clientY - rect.top - rect.height / 2);
    };
    
    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50 dark:bg-background"
      key="preloader"
      exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeOut' } }}
    >
      <motion.div
        style={{ rotateX, rotateY, perspective: 800 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="flex flex-col items-center justify-center"
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 100 100"
          className="w-28 h-28 md:w-36 md:h-36"
        >
          {/* Subtle 3D Shadow/Glow effect behind the SVG */}
          <motion.circle 
              cx="50" cy="50" r="30" 
              style={{ rotateX, rotateY }}
              className="fill-cyan-500/10 blur-xl opacity-70"
          />
          <motion.path
            d="M 20 80 V 20 H 45 A 20 20 0 0 1 45 60 H 30 L 50 80 M 65 20 V 80 M 65 50 L 85 20 M 65 50 L 85 80"
            variants={svgVariants}
            initial="hidden"
            animate="visible"
            stroke="#06B6D4" // Cyan stroke
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </motion.svg>
        
        <motion.div 
          className="text-center mt-4"
          variants={textVariants}
          initial="hidden"
          animate="visible"
        >
          <h1 className="text-3xl font-extrabold md:text-4xl text-gray-800 dark:text-white tracking-wider">ROHIT KUMAR</h1>
          <p className="text-xl md:text-2xl text-cyan-600 dark:text-cyan-400 font-semibold">FULL-STACK DEVELOPER</p>
        </motion.div>
      </motion.div>
      
      {/* PROFESSIONAL LOADING BAR */}
      <motion.div 
        className="w-48 mt-12 h-1 bg-gray-300 dark:bg-slate-700 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.5 }}
      >
        <motion.div
            className="h-full bg-cyan-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.2 }}
        />
      </motion.div>

      {/* Loading Status Indicator */}
      <motion.p 
        className="mt-3 text-sm text-gray-600 dark:text-slate-400 font-medium"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.5 }}
      >
        {isServerWoken && progress === 100 ? 'Launch Complete' : 'Optimizing Assets & Waking Server...'}
      </motion.p>
    </motion.div>
  );
};

export default Preloader;