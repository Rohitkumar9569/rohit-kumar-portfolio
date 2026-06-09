import { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  SignalSlashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { STUDY_SW_UPDATE_READY_EVENT } from '../../utils/registerServiceWorker';

const StudyPwaStatus = () => {
  const [isOnline, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [wasOffline, setWasOffline] = useState(false);
  const [isDismissed, setDismissed] = useState(false);
  const [waitingRegistration, setWaitingRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => {
      setWasOffline(true);
      setOnline(false);
      setDismissed(false);
    };
    const handleUpdateReady = (event: Event) => {
      const customEvent = event as CustomEvent<ServiceWorkerRegistration>;
      setWaitingRegistration(customEvent.detail);
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(STUDY_SW_UPDATE_READY_EVENT, handleUpdateReady as EventListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(STUDY_SW_UPDATE_READY_EVENT, handleUpdateReady as EventListener);
    };
  }, []);

  if (isDismissed) return null;
  if (isOnline && !waitingRegistration && !wasOffline) return null;

  const runUpdate = () => {
    waitingRegistration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  };

  const action = waitingRegistration
    ? {
      label: 'Update',
      icon: ArrowPathIcon,
      onClick: runUpdate,
      disabled: false,
    }
    : null;
  const ActionIcon = action?.icon;

  const Icon = isOnline ? CheckCircleIcon : SignalSlashIcon;
  const title = waitingRegistration
    ? 'New app version ready'
    : 'Offline mode active';

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-[70] flex justify-center lg:bottom-6 lg:left-auto lg:right-6 lg:justify-end">
      <div className="pointer-events-auto flex w-full max-w-[24rem] items-center gap-2 rounded-3xl border border-white/70 bg-white/92 p-2.5 text-slate-950 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/90 dark:text-white dark:shadow-[0_20px_54px_rgba(0,0,0,0.5)]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-700 dark:bg-cyan-300/10 dark:text-cyan-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black">{title}</p>
          <p className="truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {waitingRegistration ? 'Refresh safely after update.' : 'Cached app shell is available.'}
          </p>
        </div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {ActionIcon && <ActionIcon className="h-4 w-4" aria-hidden="true" />}
            {action.label}
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Dismiss app status"
        >
          <XMarkIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default StudyPwaStatus;
