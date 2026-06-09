import React, { useId } from 'react';

interface LogoProps {
  isSmall?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ isSmall = false, className = '' }) => {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gradientId = isSmall ? `gradSmall-${rawId}` : `gradPremium-${rawId}`;
  const surfaceId = `surface-${rawId}`;
  const shadowId = `shadow-${rawId}`;
  const shineId = `shine-${rawId}`;
  const defaultClassName = isSmall
    ? 'h-6 w-6 drop-shadow-[0_8px_18px_rgba(15,23,42,0.22)] dark:drop-shadow-[0_8px_18px_rgba(34,211,238,0.28)]'
    : 'h-12 w-12 drop-shadow-[0_12px_28px_rgba(15,23,42,0.24)] dark:drop-shadow-[0_12px_28px_rgba(34,211,238,0.30)]';

  if (isSmall) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className={className || defaultClassName} aria-hidden="true">
        <defs>
          <radialGradient id={surfaceId} cx="34%" cy="26%" r="82%">
            <stop offset="0%" stopColor="var(--rk-logo-surface-one)" />
            <stop offset="62%" stopColor="var(--rk-logo-fill)" />
            <stop offset="100%" stopColor="var(--rk-logo-surface-two)" />
          </radialGradient>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--rk-logo-stop-one)" />
            <stop offset="48%" stopColor="var(--rk-logo-stop-two)" />
            <stop offset="100%" stopColor="var(--rk-logo-stop-three)" />
          </linearGradient>
          <linearGradient id={shineId} x1="35%" y1="0%" x2="68%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.72" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <filter id={shadowId} x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="var(--rk-logo-shadow)" floodOpacity="0.24" />
          </filter>
        </defs>
        <circle cx="100" cy="100" r="94" fill={`url(#${surfaceId})`} stroke={`url(#${gradientId})`} strokeWidth="6" filter={`url(#${shadowId})`} />
        <circle cx="100" cy="100" r="66" fill="var(--rk-logo-core-fill)" />
        <circle cx="100" cy="100" r="82" fill="none" stroke="var(--rk-logo-inner-ring)" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="76" fill="none" stroke={`url(#${gradientId})`} strokeWidth="2" opacity="0.24" />
        <path d="M45 72C58 39 97 23 133 35" fill="none" stroke={`url(#${shineId})`} strokeWidth="12" strokeLinecap="round" opacity="0.5" />
        <text x="50%" y="53%" dominantBaseline="middle" textAnchor="middle" fontFamily="Poppins, Inter, sans-serif" fontSize="82" fontWeight="800" fill={`url(#${gradientId})`} letterSpacing="-5">
          RK
        </text>
      </svg>
    );
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className={className || defaultClassName} role="img" aria-label="Rohit Kumar">
      <defs>
        <radialGradient id={surfaceId} cx="34%" cy="26%" r="82%">
          <stop offset="0%" stopColor="var(--rk-logo-surface-one)" />
          <stop offset="62%" stopColor="var(--rk-logo-fill)" />
          <stop offset="100%" stopColor="var(--rk-logo-surface-two)" />
        </radialGradient>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--rk-logo-stop-one)" />
          <stop offset="46%" stopColor="var(--rk-logo-stop-two)" />
          <stop offset="100%" stopColor="var(--rk-logo-stop-three)" />
        </linearGradient>
        <linearGradient id={shineId} x1="32%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.76" />
          <stop offset="55%" stopColor="white" stopOpacity="0.18" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="9" stdDeviation="10" floodColor="var(--rk-logo-shadow)" floodOpacity="0.30" />
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#020617" floodOpacity="0.18" />
        </filter>
      </defs>
      <circle cx="100" cy="100" r="92" fill={`url(#${surfaceId})`} stroke={`url(#${gradientId})`} strokeWidth="5" filter={`url(#${shadowId})`} />
      <circle cx="100" cy="100" r="68" fill="var(--rk-logo-core-fill)" />
      <circle cx="100" cy="100" r="82" fill="none" stroke="var(--rk-logo-inner-ring)" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="76" fill="none" stroke={`url(#${gradientId})`} strokeWidth="2" opacity="0.26" />
      <path d="M43 72C58 37 96 21 137 35" fill="none" stroke={`url(#${shineId})`} strokeWidth="13" strokeLinecap="round" opacity="0.58" />
      <text x="50%" y="53%" dominantBaseline="middle" textAnchor="middle" fontFamily="Poppins, Inter, sans-serif" fontSize="70" fontWeight="850" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} letterSpacing="-4">
        RK
      </text>
    </svg>
  );
};

export default Logo;
