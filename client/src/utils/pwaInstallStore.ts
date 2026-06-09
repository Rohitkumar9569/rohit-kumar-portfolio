interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type InstallListener = () => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<InstallListener>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

if (typeof window !== 'undefined') {
  const handleBeforeInstallPrompt = (event: Event) => {
    const promptEvent = event as BeforeInstallPromptEvent;
    event.preventDefault();
    deferredPrompt = promptEvent;
    notifyListeners();
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyListeners();
  });
}

export const getDeferredInstallPrompt = () => deferredPrompt;

export const subscribeInstallPrompt = (listener: InstallListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export type { BeforeInstallPromptEvent };
