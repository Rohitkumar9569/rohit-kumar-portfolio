// src/components/Logo.tsx

import React from 'react';

const Logo = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="w-12 h-12">
      <defs>
        <linearGradient id="gradPremium" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C5CFF" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#00E5A0" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>
      <circle cx="100" cy="100" r="90" fill="#0F1624" stroke="url(#gradPremium)" strokeWidth="4" />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontFamily="Poppins, sans-serif" fontSize="70" fontWeight="700" fill="url(#gradPremium)" filter="url(#shadow)">
        RK
      </text>
    </svg>
  );
};

export default Logo;