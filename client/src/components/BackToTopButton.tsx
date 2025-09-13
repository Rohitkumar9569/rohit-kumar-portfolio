// src/components/BackToTopButton.tsx
import { useState, useEffect } from 'react';
import { HiArrowUp } from 'react-icons/hi';
import { AnimatePresence, motion } from 'framer-motion';
import { scroller } from 'react-scroll';

const BackToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    scroller.scrollTo('hero', {
      duration: 800,
      smooth: 'easeInOutQuart',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-3 bg-cyan-500 text-white rounded-full shadow-lg hover:bg-cyan-600 transition-colors"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          aria-label="Go to top"
        >
          <HiArrowUp className="h-6 w-6" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default BackToTopButton;