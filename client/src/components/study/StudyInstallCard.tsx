import { useEffect, useState } from 'react';
import {
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  SignalSlashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { usePwaInstallPrompt } from '../../hooks/usePwaInstallPrompt';

const INSTALL_NOTICE_DELAY_MS = 6500;
const INSTALL_NOTICE_DISMISS_KEY = 'study-hub-install-notice-dismissed';

const StudyInstallCard = () => {
  const { canInstall, installApp, isAppleManualInstall, isInstalled, isPrompting, isSupported } = usePwaInstallPrompt();
  const [isOnline, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [isVisible, setVisible] = useState(false);
  const [isDismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(INSTALL_NOTICE_DISMISS_KEY) === 'true';
  });

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
      if (installed) dismissNotice();
      return;
    }

    if (!isAppleManualInstall) {
      dismissNotice();
    }
  };

  if (isInstalled || isDismissed || !isVisible || (!canInstall && !isAppleManualInstall && !isSupported)) return null;

  return (
    <aside className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] left-3 right-3 z-50 mx-auto max-w-[26rem] overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white/92 p-3 text-slate-950 shadow-[0_24px_70px_rgba(15,23,42,0.22)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#07101c]/94 dark:text-white dark:shadow-[0_24px_80px_rgba(0,0,0,0.46)] sm:left-auto sm:right-5 lg:bottom-5 lg:right-6">
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
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">
            Rohit Hub App
          </p>
          <h2 className="mt-0.5 text-base font-black leading-tight text-slate-950 dark:text-white">
            Install as an app
          </h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
            Fast launch, offline shell, saved library, and a mobile-app feel.
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={[
            'inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-black',
            isOnline
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300'
              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300',
          ].join(' ')}
        >
          {isOnline ? (
            <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <SignalSlashIcon className="h-4 w-4" aria-hidden="true" />
          )}
          {isOnline ? 'Online' : 'Offline'}
        </span>
        <button
          type="button"
          onClick={handleInstall}
          disabled={isPrompting}
          className="inline-flex min-h-10 flex-1 items-center justify-center rounded-2xl bg-slate-950 px-3 text-xs font-black text-white shadow-lg shadow-cyan-500/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
        >
          {isPrompting
            ? 'Opening...'
            : canInstall
              ? 'Install app'
              : isAppleManualInstall
                ? 'Add to Home'
                : 'Open app'}
        </button>
      </div>
    </aside>
  );
};

export default StudyInstallCard;
