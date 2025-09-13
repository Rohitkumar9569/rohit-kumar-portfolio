import { motion, useMotionValue, useTransform } from 'framer-motion';
import React from 'react';

// Animation variants for the SVG logo
const svgVariants = {
  hidden: {
    opacity: 0,
    scale: 0.5,
    pathLength: 0,
    // Fill property removed
  },
  visible: {
    opacity: 1,
    scale: 1,
    pathLength: 1,
    // Fill property removed
    transition: {
      default: { duration: 1.5, ease: "easeInOut" },
    }
  }
};

const textVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 1, duration: 0.8 }
  }
};

const Preloader = () => {
  // For the interactive mouse-follow effect
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 blueprint-bg"
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
            d="M 20 80 V 20 H 45 A 20 20 0 0 1 45 60 H 30 L 50 80 M 70 20 V 80 M 70 50 L 90 20 M 70 50 L 90 80"
            variants={svgVariants}
            initial="hidden"
            animate="visible"
            stroke="#22d3ee"
            strokeWidth="5"
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="transparent" // Ensures the path has no fill color
          />
        </motion.svg>

        <motion.div
          className="text-center text-white mt-4"
          variants={textVariants}
          initial="hidden"
          animate="visible"
        >
          <h1 className="text-2xl font-bold md:text-3xl">Rohit Kumar</h1>
          <p className="text-lg text-slate-300 md:text-xl">Full-Stack Developer</p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Preloader;