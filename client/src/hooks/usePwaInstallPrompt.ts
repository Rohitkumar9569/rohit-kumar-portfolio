import { useCallback, useEffect, useState } from 'react';
import {
  getDeferredInstallPrompt,
  subscribeInstallPrompt,
  type BeforeInstallPromptEvent,
} from '../utils/pwaInstallStore';

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

const isDesktopChromeOrEdge = () => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /chrome|chromium|edg\//.test(ua) && !/mobile/.test(ua);
};

export const usePwaInstallPrompt = () => {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setInstalled] = useState(isRunningStandalone);
  const [isPrompting, setPrompting] = useState(false);
  const [isAppleManualInstall, setAppleManualInstall] = useState(isAppleMobileBrowser);
  const [isDesktopInstallHintVisible, setDesktopInstallHintVisible] = useState(isDesktopChromeOrEdge);

  useEffect(() => {
    const syncPromptState = () => {
      setPromptEvent(getDeferredInstallPrompt());
    };

    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setAppleManualInstall(false);
      setDesktopInstallHintVisible(false);
    };

    syncPromptState();
    const unsubscribe = subscribeInstallPrompt(syncPromptState);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      unsubscribe();
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
    isDesktopInstallHintVisible,
    showInstallHint: isAppleManualInstall || isDesktopInstallHintVisible,
  };
};
