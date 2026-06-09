// src/components/SectionAnimator.tsx

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface SectionAnimatorProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
}

const SectionAnimator: React.FC<SectionAnimatorProps> = ({ children, id, className }) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id={id}
      className={className}
    >
      <motion.div
        className="w-full"
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12, margin: '0px 0px -8% 0px' }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </section>
  );
};

export default SectionAnimator;
