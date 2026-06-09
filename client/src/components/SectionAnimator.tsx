// src/components/SectionAnimator.tsx

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface SectionAnimatorProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
}

const shouldUseLightweightAnimation = () => {
  if (typeof window === 'undefined') {
    return true;
  }

  const hasTouch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return hasTouch || prefersReducedMotion;
};

const SectionAnimator: React.FC<SectionAnimatorProps> = ({ children, id, className }) => {
  const prefersReducedMotion = useReducedMotion();
  const [useLightweightAnimation, setUseLightweightAnimation] = useState(() => shouldUseLightweightAnimation());

  useEffect(() => {
    const updatePreference = () => setUseLightweightAnimation(shouldUseLightweightAnimation());

    updatePreference();

    if (typeof window === 'undefined') {
      return undefined;
    }

    const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarsePointerMedia = window.matchMedia('(pointer: coarse)');

    reducedMotionMedia.addEventListener?.('change', updatePreference);
    coarsePointerMedia.addEventListener?.('change', updatePreference);

    return () => {
      reducedMotionMedia.removeEventListener?.('change', updatePreference);
      coarsePointerMedia.removeEventListener?.('change', updatePreference);
    };
  }, []);

  const shouldAnimate = !prefersReducedMotion && !useLightweightAnimation;

  return (
    <section
      id={id}
      className={className}
    >
      {shouldAnimate ? (
        <motion.div
          className="w-full"
          initial={{ opacity: 0.92, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.03, margin: '0px 0px 24% 0px' }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      ) : (
        <div className="w-full">{children}</div>
      )}
    </section>
  );
};

export default SectionAnimator;
