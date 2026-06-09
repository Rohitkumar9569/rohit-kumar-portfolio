import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const isRunningStandalone = () => {
  if (typeof window === 'undefined') return false;

  const standaloneDisplay = window.matchMedia('(display-mode: standalone)').matches;
  const navigatorStandalone = 'standalone' in window.navigator
    ? Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    : false;

  return standaloneDisplay || navigatorStandalone;
};

const isAppleMobileBrowser = () => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) || (platform === 'macintel' && window.navigator.maxTouchPoints > 1);
  return isIOS && !isRunningStandalone();
};

export const usePwaInstallPrompt = () => {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setInstalled] = useState(isRunningStandalone);
  const [isPrompting, setPrompting] = useState(false);
  const [isAppleManualInstall, setAppleManualInstall] = useState(isAppleMobileBrowser);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setAppleManualInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!promptEvent || isPrompting) return false;

    setPrompting(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      setPromptEvent(null);
      return choice.outcome === 'accepted';
    } finally {
      setPrompting(false);
    }
  }, [isPrompting, promptEvent]);

  return {
    canInstall: Boolean(promptEvent),
    installApp,
    isInstalled,
    isAppleManualInstall,
    isPrompting,
    isSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
  };
};
