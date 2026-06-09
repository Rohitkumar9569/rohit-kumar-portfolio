import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const PORTFOLIO_SECTION_IDS = [
  'about',
  'skills',
  'certifications',
  'projects',
  'study-hub',
  'contact',
] as const;

export const useActivePortfolioSection = () => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection('');
      return undefined;
    }

    const visibleSections = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleSections.delete(entry.target.id);
          }
        });

        let bestId = '';
        let bestRatio = 0;
        visibleSections.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });

        if (bestId) {
          setActiveSection(bestId);
        }
      },
      {
        root: null,
        rootMargin: '-18% 0px -58% 0px',
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
      },
    );

    PORTFOLIO_SECTION_IDS.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [location.pathname]);

  return activeSection;
};
