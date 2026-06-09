import { useEffect, useState } from 'react';
import {
  DevicePhoneMobileIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../context/ThemeContext';
import { usePwaInstallPrompt } from '../../hooks/usePwaInstallPrompt';

const INSTALL_NOTICE_DELAY_MS = 4000;
const INSTALL_NOTICE_DISMISS_KEY = 'study-hub-install-notice-dismissed';

const StudyInstallCard = () => {
  const { theme } = useTheme();
  const { canInstall, installApp, isAppleManualInstall, isInstalled, isPrompting, isSupported } = usePwaInstallPrompt();
  const [isVisible, setVisible] = useState(false);
  const [isDismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(INSTALL_NOTICE_DISMISS_KEY) === 'true';
  });
  const isDark = theme === 'dark';

  useEffect(() => {
    if (isInstalled || isDismissed || (!canInstall && !isAppleManualInstall && !isSupported)) return undefined;

    const noticeTimer = window.setTimeout(() => setVisible(true), INSTALL_NOTICE_DELAY_MS);
    return () => window.clearTimeout(noticeTimer);
  }, [canInstall, isAppleManualInstall, isDismissed, isInstalled, isSupported]);

  const dismissNotice = () => {
    setVisible(false);
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(INSTALL_NOTICE_DISMISS_KEY, 'true');
    }
  };

  const handleInstall = async () => {
    if (canInstall) {
      const installed = await installApp();
      if (installed) {
        dismissNotice();
        return;
      }
    }

    if (typeof window !== 'undefined') {
      window.location.assign('/app');
    }
    dismissNotice();
  };

  if (isInstalled || isDismissed || !isVisible || (!canInstall && !isAppleManualInstall && !isSupported)) return null;

  return (
    <aside
      className={[
        'fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] left-3 right-3 z-50 mx-auto max-w-[25rem] overflow-hidden rounded-[1.35rem] border p-3 shadow-[0_24px_70px_rgba(15,23,42,0.16)] backdrop-blur-2xl sm:left-auto sm:right-5 lg:bottom-5 lg:right-6',
        isDark
          ? 'border-cyan-400/20 bg-[linear-gradient(135deg,rgba(7,16,28,0.98),rgba(15,23,42,0.96))] text-white shadow-cyan-950/40'
          : 'border-cyan-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.98))] text-slate-950 shadow-cyan-200/70',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={dismissNotice}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-900/5 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Dismiss app install notice"
      >
        <XMarkIcon className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex gap-3 pr-8">
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-cyan-200 shadow-lg shadow-cyan-500/20 dark:bg-white dark:text-slate-950">
          <DevicePhoneMobileIcon className="h-6 w-6" aria-hidden="true" />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-cyan-400 ring-4 ring-white dark:ring-[#07101c]" />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">
            Rohit Hub
          </p>
          <h2 className="mt-0.5 text-base font-black leading-tight">
            Install app
          </h2>
        </div>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={handleInstall}
          disabled={isPrompting}
          className="inline-flex min-h-10 w-full items-center justify-center rounded-2xl bg-slate-950 px-3 text-sm font-black text-white shadow-lg shadow-cyan-500/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
        >
          {isPrompting
            ? 'Preparing...'
            : canInstall
              ? 'Download app'
              : 'Open app'}
        </button>
      </div>
    </aside>
  );
};

export default StudyInstallCard;
