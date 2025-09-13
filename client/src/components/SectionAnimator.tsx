// src/components/SectionAnimator.tsx

import React from 'react';
import { motion } from 'framer-motion';

interface SectionAnimatorProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
}

const SectionAnimator: React.FC<SectionAnimatorProps> = ({ children, id, className }) => {
  return (
    <motion.section
      id={id}
      className={className}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  );
};

export default SectionAnimator;