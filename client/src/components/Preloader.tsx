import { motion, useMotionValue, useTransform } from 'framer-motion';
import React, { useEffect } from 'react';
import axios from 'axios';

// Animation variants now use CSS variables to be theme-aware
const svgVariants = {
  hidden: {
    opacity: 0,
    scale: 0.5,
    pathLength: 0,
    fill: "hsla(var(--foreground), 0)" // Initially transparent foreground
  },
  visible: {
    opacity: 1,
    scale: 1,
    pathLength: 1,
    fill: "hsl(var(--foreground))", // Fill with the theme's main text color
    transition: {
      pathLength: { duration: 1.5, ease: "easeInOut" },
      fill: { delay: 1.5, duration: 0.5, ease: "easeOut" },
    }
  }
};

const textVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { delay: 1.2, duration: 0.8, ease: "easeOut" }
  }
};

const Preloader = () => {
  // Server wake-up call, now improved to run only once per session
  useEffect(() => {
    const wakeUpServer = async () => {
      try {
        await axios.get(import.meta.env.VITE_API_URL);
        console.log('Server wake-up call sent successfully.');
        sessionStorage.setItem('server_woken', 'true'); // Mark as woken for this session
      } catch (error) {
        console.error('Server wake-up call failed:', error);
      }
    };

    if (!sessionStorage.getItem('server_woken')) {
      wakeUpServer();
    }
  }, []);

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
      // Use theme-aware background color
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background blueprint-bg"
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
          <motion.path
            d="M 20 80 V 20 H 45 A 20 20 0 0 1 45 60 H 30 L 50 80 M 65 20 V 80 M 65 50 L 85 20 M 65 50 L 85 80"
            variants={svgVariants}
            initial="hidden"
            animate="visible"
            stroke="#22d3ee" // Cyan stroke looks good on both themes
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </motion.svg>
        
        <motion.div 
          // Removed hardcoded text-white
          className="text-center mt-4"
          variants={textVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Use theme-aware text colors */}
          <h1 className="text-2xl font-bold md:text-3xl text-foreground">Rohit Kumar</h1>
          <p className="text-lg text-primary-foreground md:text-xl">Full-Stack Developer</p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Preloader;