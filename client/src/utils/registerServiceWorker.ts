export const STUDY_SW_UPDATE_READY_EVENT = 'studyhub:sw-update-ready';
const DEV_SW_REFRESH_KEY = 'studyhub:dev-sw-clean-refresh';

export const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  if (!import.meta.env.PROD) {
    window.addEventListener('load', () => {
      const hadController = Boolean(navigator.serviceWorker.controller);
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .then(async () => {
          if ('caches' in window) {
            const keys = await window.caches.keys();
            await Promise.all(keys.filter((key) => key.startsWith('study-hub-')).map((key) => window.caches.delete(key)));
          }

          if (hadController && window.sessionStorage.getItem(DEV_SW_REFRESH_KEY) !== 'done') {
            window.sessionStorage.setItem(DEV_SW_REFRESH_KEY, 'done');
            window.location.reload();
            return;
          }

          window.sessionStorage.removeItem(DEV_SW_REFRESH_KEY);
        })
        .catch(() => undefined);
    });
    return;
  }

  window.addEventListener('load', () => {
    let isRefreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (isRefreshing) return;
      isRefreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        const notifyUpdateReady = () => {
          window.dispatchEvent(new CustomEvent(STUDY_SW_UPDATE_READY_EVENT, { detail: registration }));
        };

        if (registration.waiting && navigator.serviceWorker.controller) {
          notifyUpdateReady();
        }

        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;

          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              notifyUpdateReady();
            }
          });
        });

        window.setTimeout(() => {
          void registration.update();
        }, 8000);
      })
      .catch((error) => {
        console.warn('Study Hub service worker registration failed:', error);
      });
  });
};
