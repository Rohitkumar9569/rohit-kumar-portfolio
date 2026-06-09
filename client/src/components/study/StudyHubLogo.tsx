import { useId } from 'react';

interface StudyHubLogoProps {
  compact?: boolean;
}

const StudyHubLogo = ({ compact = false }: StudyHubLogoProps) => {
  const rawId = useId().replace(/:/g, '');
  const baseGradientId = `studyHubBase-${rawId}`;
  const bevelGradientId = `studyHubBevel-${rawId}`;
  const floorGradientId = `studyHubFloor-${rawId}`;
  const leftPageGradientId = `studyHubLeftPage-${rawId}`;
  const rightPageGradientId = `studyHubRightPage-${rawId}`;
  const pageDepthGradientId = `studyHubPageDepth-${rawId}`;
  const capGradientId = `studyHubCap-${rawId}`;
  const goldGradientId = `studyHubGold-${rawId}`;
  const glossGradientId = `studyHubGloss-${rawId}`;
  const baseShadowId = `studyHubBaseShadow-${rawId}`;
  const pageShadowId = `studyHubPageShadow-${rawId}`;

  return (
    <svg
      viewBox="0 0 96 96"
      aria-label="Study Hub"
      role="img"
      className={['study-hub-mark shrink-0', compact ? 'h-10 w-10' : 'h-12 w-12'].join(' ')}
    >
      <defs>
        <radialGradient id={floorGradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#0f172a" stopOpacity="0.26" />
          <stop offset="1" stopColor="#0f172a" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={baseGradientId} x1="17" y1="12" x2="82" y2="84" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1d4ed8" />
          <stop offset="0.48" stopColor="#0f766e" />
          <stop offset="1" stopColor="#101827" />
        </linearGradient>

        <linearGradient id={bevelGradientId} x1="23" y1="15" x2="74" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.74" />
          <stop offset="0.36" stopColor="#99f6e4" stopOpacity="0.26" />
          <stop offset="1" stopColor="#020617" stopOpacity="0.3" />
        </linearGradient>

        <linearGradient id={glossGradientId} x1="27" y1="13" x2="71" y2="49" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.62" />
          <stop offset="0.58" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <linearGradient id={leftPageGradientId} x1="27" y1="30" x2="48" y2="68" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff7ed" />
          <stop offset="0.52" stopColor="#e0f2fe" />
          <stop offset="1" stopColor="#bfdbfe" />
        </linearGradient>

        <linearGradient id={rightPageGradientId} x1="50" y1="30" x2="70" y2="67" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.56" stopColor="#ccfbf1" />
          <stop offset="1" stopColor="#93c5fd" />
        </linearGradient>

        <linearGradient id={pageDepthGradientId} x1="27" y1="62" x2="68" y2="73" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2563eb" stopOpacity="0.36" />
          <stop offset="1" stopColor="#0f766e" stopOpacity="0.5" />
        </linearGradient>

        <linearGradient id={capGradientId} x1="36" y1="19" x2="61" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#111827" />
          <stop offset="0.48" stopColor="#334155" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>

        <linearGradient id={goldGradientId} x1="62" y1="25" x2="69" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.46" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>

        <filter id={baseShadowId} x="-28%" y="-22%" width="156%" height="156%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="11" stdDeviation="7" floodColor="#020617" floodOpacity="0.28" />
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#14b8a6" floodOpacity="0.28" />
        </filter>

        <filter id={pageShadowId} x="-18%" y="-18%" width="136%" height="142%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#020617" floodOpacity="0.22" />
        </filter>
      </defs>

      <ellipse cx="48" cy="82" rx="31" ry="8.5" fill={`url(#${floorGradientId})`} className="study-hub-mark-floor" />

      <g filter={`url(#${baseShadowId})`} transform="rotate(-4 48 48)">
        <rect className="study-hub-mark-base" x="12" y="11" width="72" height="73" rx="24" fill={`url(#${baseGradientId})`} />
        <rect className="study-hub-mark-bevel" x="15" y="14" width="66" height="67" rx="21" fill="none" stroke={`url(#${bevelGradientId})`} />
        <path
          className="study-hub-mark-top-gloss"
          d="M21 28c2.6-8.8 10.3-13 21.7-13h10.7c11.9 0 20 5.2 22.6 14.4-9.2 5.7-20.2 8.7-32.1 8.2-8.7-.4-16.4-3.2-22.9-9.6Z"
          fill={`url(#${glossGradientId})`}
        />
        <path
          className="study-hub-mark-bottom-depth"
          d="M18 68c11 7.4 20.8 10.6 31.2 10.2 11.3-.5 20.8-4.8 28.8-12.7v4.4C78 76.1 71.8 81 64.2 81H30.3C23.8 81 18 75.2 18 68.5V68Z"
          fill="#020617"
          opacity="0.2"
        />
      </g>

      <g filter={`url(#${pageShadowId})`}>
        <path
          className="study-hub-mark-page-edge"
          d="M26 61.8c6.2 1 13 3 20 6.2 1.3.6 2.7.6 4 0 7-3.2 13.8-5.2 20-6.2v4.8c-7.7.9-14.7 3-21.2 6.2a4.2 4.2 0 0 1-3.6 0C38.7 69.6 31.7 67.5 24 66.6v-4.8h2Z"
          fill={`url(#${pageDepthGradientId})`}
        />
        <path
          className="study-hub-mark-page"
          d="M26 35.2c0-3.5 2.9-6.1 6.3-5.5 6.1.9 10.9 3.2 14.7 7v31.6c-3.9-3.1-8.8-5.2-14.6-6.1-3.6-.6-6.4-3.4-6.4-6.9V35.2Z"
          fill={`url(#${leftPageGradientId})`}
        />
        <path
          className="study-hub-mark-page"
          d="M70 35.2c0-3.5-2.9-6.1-6.3-5.5-6.1.9-10.9 3.2-14.7 7v31.6c3.9-3.1 8.8-5.2 14.6-6.1 3.6-.6 6.4-3.4 6.4-6.9V35.2Z"
          fill={`url(#${rightPageGradientId})`}
        />
        <path className="study-hub-mark-spine" d="M48 36.6v31.2" />
        <path className="study-hub-mark-line" d="M33 40.8c3.2.4 5.9 1.4 8.4 3M33 48c3.2.5 5.9 1.5 8.4 3M33 55.2c3.2.5 5.9 1.5 8.4 3M55 43.8c2.5-1.6 5.2-2.6 8.4-3M55 51c2.5-1.5 5.2-2.5 8.4-3M55 58.2c2.5-1.5 5.2-2.5 8.4-3" />

        <path className="study-hub-mark-cap" d="M34.4 25.5 48 19.4l13.6 6.1L48 31.5 34.4 25.5Z" fill={`url(#${capGradientId})`} />
        <path className="study-hub-mark-cap" d="M39.8 29.2c3.8 2.7 12.6 2.7 16.4 0v4.6c-3.6 2.9-12.8 2.9-16.4 0v-4.6Z" fill={`url(#${capGradientId})`} />
        <path className="study-hub-mark-cap-tassel" d="M61.6 26.2v8.9" />
        <circle className="study-hub-mark-medal" cx="61.6" cy="37.1" r="2.8" fill={`url(#${goldGradientId})`} />
      </g>

      <path className="study-hub-mark-spark" d="M74.1 18.7 76 23l4.3 1.9-4.3 1.8-1.9 4.4-1.8-4.4-4.4-1.8 4.4-1.9 1.8-4.3Z" />
      <path className="study-hub-mark-spark small" d="M22.6 61.7 24 65l3.2 1.3-3.2 1.4-1.4 3.2-1.3-3.2-3.3-1.4 3.3-1.3 1.3-3.3Z" />
    </svg>
  );
};

export default StudyHubLogo;
