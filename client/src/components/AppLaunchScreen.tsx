import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const LAUNCH_DURATION_MS = 920;

const AppLaunchScreen = () => {
  const { theme } = useTheme();
  const [isVisible, setVisible] = useState(true);
  const [isExiting, setExiting] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setExiting(true), LAUNCH_DURATION_MS - 220);
    const hideTimer = window.setTimeout(() => setVisible(false), LAUNCH_DURATION_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={[
        'study-hub-launch-screen fixed inset-0 z-[120] flex items-center justify-center transition-opacity duration-300 ease-out',
        isExiting ? 'opacity-0' : 'opacity-100',
        isDark
          ? 'bg-[linear-gradient(180deg,#050814_0%,#0b1220_48%,#111827_100%)]'
          : 'bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_52%,#e2e8f0_100%)]',
      ].join(' ')}
      role="status"
      aria-live="polite"
      aria-label="Loading Study Hub"
    >
      <div
        className={[
          'pointer-events-none absolute inset-0',
          isDark
            ? 'bg-[radial-gradient(circle_at_50%_38%,rgba(34,211,238,0.12),transparent_58%)]'
            : 'bg-[radial-gradient(circle_at_50%_38%,rgba(14,116,144,0.10),transparent_58%)]',
        ].join(' ')}
      />

      <div className="study-hub-launch-content relative px-6 text-center">
        <p
          className={[
            'study-hub-launch-eyebrow text-[0.68rem] font-black uppercase tracking-[0.42em]',
            isDark ? 'text-cyan-300/70' : 'text-cyan-800/65',
          ].join(' ')}
        >
          Rohit Kumar
        </p>
        <h1
          className={[
            'study-hub-launch-title mt-3 text-[clamp(2.15rem,8vw,3.35rem)] font-black tracking-[-0.04em]',
            isDark ? 'text-white' : 'text-slate-950',
          ].join(' ')}
        >
          Study Hub
        </h1>
        <div
          className={[
            'study-hub-launch-line mx-auto mt-5 h-px w-[min(12rem,58vw)]',
            isDark ? 'bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent' : 'bg-gradient-to-r from-transparent via-cyan-700/55 to-transparent',
          ].join(' ')}
        />
      </div>
    </div>
  );
};

export default AppLaunchScreen;
